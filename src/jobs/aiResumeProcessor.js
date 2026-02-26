const Queue = require('bull');
const { connectMongo } = require('../models/mongo');
const PdfService = require('../services/pdfService');
const AiService = require('../services/aiService');

const aiQueue = new Queue('ai-resume-processing', {
  redis: {
    host: process.env.REDIS_URL ? new URL(process.env.REDIS_URL).hostname : '127.0.0.1',
    port: process.env.REDIS_URL ? new URL(process.env.REDIS_URL).port : 6379,
  }
});

aiQueue.process(async (job, done) => {
  try {
    const { id, filePath, userId } = job.data;

    console.log(`Processing resume ID: ${id}`);

    const resumeText = await PdfService.extractText(filePath);
    console.log(`Extracted ${resumeText.length} characters from resume ID: ${id}`);

    const aiResult = await AiService.extractResumeData(resumeText);
    console.log(`AI extraction complete for resume ID: ${id}`);

    const db = await connectMongo();
    const collection = db.collection('resumesAI');

    await collection.updateOne(
      { resumeId: id },
      {
        $set: {
          resumeId:    id,
          userId,
          rawText:     resumeText,
          skills:      aiResult.skills,
          education:   aiResult.education,
          experience:  aiResult.experience,
          summary:     aiResult.summary,
          processedAt: new Date(),
        }
      },
      { upsert: true }
    );

    console.log(`Resume ID: ${id} fully processed and saved`);
    done();

  } catch (err) {
    console.error(`Resume processing failed for ID ${job.data.id}:`, err.message);
    done(err);
  }
});

module.exports = aiQueue;