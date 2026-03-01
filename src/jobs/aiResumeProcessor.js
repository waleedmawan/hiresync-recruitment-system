const Queue = require('bull');
const { connectMongo } = require('../models/mongo');
const PdfService = require('../services/pdfService');
const AiService = require('../services/aiService');
const EmbeddingService = require('../services/embeddingService');
const { deleteCache } = require('../utils/cache');
const logger = require('../utils/logger');

const aiQueue = new Queue('ai-resume-processing', {
  redis: {
    host: process.env.REDIS_URL ? new URL(process.env.REDIS_URL).hostname : '127.0.0.1',
    port: process.env.REDIS_URL ? new URL(process.env.REDIS_URL).port : 6379,
  }
});

aiQueue.process(async (job, done) => {
  try {
    const { id, filePath, userId } = job.data;

    logger.info(`Processing resume ID: ${id}`);

    const resumeText = await PdfService.extractText(filePath);
    logger.info(`Extracted ${resumeText.length} characters from resume ID: ${id}`);

    const aiResult = await AiService.extractResumeData(resumeText);
    logger.info(`AI extraction complete for resume ID: ${id}`);

    const textForEmbedding = [...aiResult.skills, aiResult.summary].join(' ');
    const embedding = await EmbeddingService.generateEmbedding(textForEmbedding);
    logger.info(`Embedding generated (${embedding.length} dimensions) for resume ID: ${id}`);

    const db = await connectMongo();
    const collection = db.collection('resumesAI');

    await collection.updateOne(
      { resumeId: id },
      {
        $set: {
          resumeId,
          userId,
          rawText:     resumeText,
          skills:      aiResult.skills,
          education:   aiResult.education,
          experience:  aiResult.experience,
          summary:     aiResult.summary,
          embedding,
          processedAt: new Date(),
        }
      },
      { upsert: true }
    );

    await deleteCache(`ai:resume:${id}`);
    await deleteCache('ai:resume:all');

    logger.info(`Resume ID: ${id} fully processed and cache cleared`);
    done();

  } catch (err) {
    logger.error(`Processing failed for resume ID ${job.data.id}: ${err.message}`, { stack: err.stack });
    done(err);
  }
});

module.exports = aiQueue;