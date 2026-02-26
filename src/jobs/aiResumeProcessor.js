const Queue = require('bull');
const fs = require('fs');
const { connectMongo } = require('../models/mongo');
const PdfService = require('../services/pdfService');

const aiQueue = new Queue('ai-resume-processing', {
  redis: {
    host: process.env.REDIS_URL ? new URL(process.env.REDIS_URL).hostname : '127.0.0.1',
    port: process.env.REDIS_URL ? new URL(process.env.REDIS_URL).port : 6379,
  }
});

aiQueue.process(async (job, done) => {
  try {
    const { id, filePath, userId } = job.data;

    console.log(`Starting AI processing for resume ID: ${id}`);

    const resumeText = await PdfService.extractText(filePath);

    console.log(`Extracted ${resumeText.length} characters from resume ID: ${id}`);

    const aiResult = {
      skills: [],
      education: [],
      experience: [],
      summary: '',
      rawText: resumeText,
    };

    const db = await connectMongo();
    const collection = db.collection('resumesAI');

    await collection.updateOne(
      { resumeId: id },
      {
        $set: {
          ...aiResult,
          userId,
          resumeId: id,
          processedAt: new Date(),
        }
      },
      { upsert: true }
    );

    console.log(`AI processing complete for resume ID: ${id}`);

    done();

  } catch (err) {
    console.error('AI processing error:', err.message);
    done(err);
  }
});

module.exports = aiQueue;