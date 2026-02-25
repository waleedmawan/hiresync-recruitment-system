const Queue = require('bull');
const Resume = require('../models/resumeModel');

const redisUrl = process.env.REDIS_URL;

const resumeQueue = new Queue('resume-processing', {
  redis: redisUrl
    ? {
        host: new URL(redisUrl).hostname,
        port: new URL(redisUrl).port,
        password: new URL(redisUrl).password || undefined,
      }
    : {
        host: '127.0.0.1',
        port: 6379,
      }
});

resumeQueue.process(async (job) => {
  const { id, filePath } = job.data;

  try {
    console.log(`Processing resume ID: ${id}`);

    await Resume.update(
      { status: 'processing' },
      { where: { id } }
    );

    await new Promise(resolve => setTimeout(resolve, 3000));

    await Resume.update(
      { status: 'processed' },
      { where: { id } }
    );

    console.log(`Resume processed successfully: ${id}`);

  } catch (error) {
    console.error('Resume processing failed:', error);

    await Resume.update(
      { status: 'failed' },
      { where: { id } }
    );

    throw error;
  }
});

resumeQueue.on('failed', (job, err) => {
  console.error(`Job failed for resume ID ${job.data.id}:`, err.message);
});

module.exports = resumeQueue;