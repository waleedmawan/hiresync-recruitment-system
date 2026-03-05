const express          = require('express');
const { Op }           = require('sequelize');
const Resume           = require('../models/resumeModel');
const Job              = require('../models/jobModel');
const JobApplication   = require('../models/applicationModel');
const { connectMongo } = require('../models/mongo');
const EmbeddingService = require('../services/embeddingService');

const router = express.Router();

router.get('/candidates', async (req, res) => {
  try {
    const userId = req.user.id;
    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const status = req.query.status || '';
    const offset = (page - 1) * limit;

    const where = { userId };
    if (search) {
      where[Op.or] = [
        { name:  { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
    }
    if (status) where.status = status;

    const { count, rows: resumes } = await Resume.findAndCountAll({
      where,
      order:  [['createdAt', 'DESC']],
      limit,
      offset,
    });

    res.render('candidates', {
      title: 'Candidates',
      resumes,
      pagination: {
        currentPage: page,
        totalPages:  Math.ceil(count / limit),
        totalCount:  count,
        limit, search, status,
      },
    });

  } catch (err) {
    console.error('Candidates error:', err);
    res.status(500).send('Server error');
  }
});

router.get('/candidates/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const id     = parseInt(req.params.id);

    const candidate = await Resume.findOne({ where: { id, userId } });
    if (!candidate) return res.status(404).send('Candidate not found');

    const db     = await connectMongo();
    const aiData = await db.collection('resumesAI').findOne(
      { resumeId: id },
      { projection: { rawText: 0 } }
    );

    const jobs = await Job.findAll({
      where: { recruiterId: userId },
      order: [['createdAt', 'DESC']],
    });

    let jobMatches = [];
    if (aiData && aiData.embedding && aiData.embedding.length > 0) {
      for (const job of jobs) {
        let jobEmbedding = job.embedding ? JSON.parse(job.embedding) : null;
        if (!jobEmbedding || jobEmbedding.length === 0) {
          jobEmbedding = await EmbeddingService.generateEmbedding(job.description || job.title);
          await job.update({ embedding: JSON.stringify(jobEmbedding) });
        }
        const score   = EmbeddingService.cosineSimilarity(aiData.embedding, jobEmbedding);
        const percent = Math.round(score * 100);
        const existing = await JobApplication.findOne({ where: { jobId: job.id, resumeId: id } });
        jobMatches.push({
          job, score: percent,
          label:   percent >= 75 ? 'Highly Recommended' : percent >= 50 ? 'Good Fit' : 'Weak Match',
          color:   percent >= 75 ? 'var(--success)' : percent >= 50 ? 'var(--warning)' : 'var(--muted)',
          applied: !!existing,
          stage:   existing ? existing.stage : null,
        });
      }
      jobMatches.sort((a, b) => b.score - a.score);
    }

    const applications = await JobApplication.findAll({ where: { resumeId: id } });

    res.render('candidateProfile', {
      title: candidate.name,
      candidate, aiData: aiData || null, jobMatches, applications,
    });

  } catch (err) {
    console.error('Profile error:', err.message);
    res.status(500).send('Server error');
  }
});

router.post('/candidates/:id/apply/:jobId', async (req, res) => {
  try {
    const userId   = req.user.id;
    const resumeId = parseInt(req.params.id);
    const jobId    = parseInt(req.params.jobId);

    const candidate = await Resume.findOne({ where: { id: resumeId, userId } });
    const job       = await Job.findOne({ where: { id: jobId, recruiterId: userId } });

    if (!candidate || !job)
      return res.status(404).json({ message: 'Candidate or job not found' });

    const existing = await JobApplication.findOne({ where: { jobId, resumeId } });
    if (existing) return res.redirect(`/candidates/${resumeId}?msg=already_applied`);

    const db     = await connectMongo();
    const aiData = await db.collection('resumesAI').findOne({ resumeId });

    let matchScore = 0;
    if (aiData && aiData.embedding && job.embedding) {
      const jobEmbedding = JSON.parse(job.embedding);
      matchScore = Math.round(EmbeddingService.cosineSimilarity(aiData.embedding, jobEmbedding) * 100);
    }

    await JobApplication.create({ jobId, resumeId, userId, matchScore, stage: 'applied' });
    res.redirect(`/candidates/${resumeId}?msg=applied`);

  } catch (err) {
    console.error('Apply error:', err.message);
    res.status(500).send('Server error');
  }
});

router.post('/candidates/:id/stage/:jobId', async (req, res) => {
  try {
    const resumeId = parseInt(req.params.id);
    const jobId    = parseInt(req.params.jobId);
    const { stage } = req.body;

    await JobApplication.update({ stage }, { where: { resumeId, jobId } });
    res.redirect(`/candidates/${resumeId}?msg=stage_updated`);

  } catch (err) {
    console.error('Stage update error:', err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;