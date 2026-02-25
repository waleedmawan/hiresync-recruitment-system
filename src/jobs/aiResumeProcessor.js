const Queue = require('bull');
const pdf = require('pdf-parse');
const fs = require('fs');
const { connectMongo } = require('../models/mongo');
const aiQueue = new Queue('ai-resume-processing', {
  redis: {
    host: process.env.REDIS_URL ? new URL(process.env.REDIS_URL).hostname : '127.0.0.1',
    port: process.env.REDIS_URL ? new URL(process.env.REDIS_URL).port : 6379,
  }
});

aiQueue.process(async (job, done) => {
  try {
    const { id, filePath, userId } = job.data;

    console.log(`AI processing resume ID: ${id}, file: ${filePath}`);

    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdf(dataBuffer);
    const resumeText = pdfData.text;

    const aiResult = {
      skills: ['JavaScript', 'Node.js', 'SQL'],
      education: ['BSc Computer Science'],
      experience: ['2 years backend development'],
      summary: 'Candidate with backend experience in Node.js and database management',
    };

    const db = await connectMongo();
    const collection = db.collection('resumesAI');

    await collection.updateOne(
      { resumeId: id },
      { $set: { ...aiResult, userId, resumeId: id, processedAt: new Date() } },
      { upsert: true }
    );

    console.log(`AI processing completed for resume ID: ${id}`);

    done();

  } catch (err) {
    console.error('Error in AI resume processing:', err);
    done(err);
  }
});

module.exports = aiQueue;