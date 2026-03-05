const express          = require('express');
const JobController    = require('../controllers/jobController');
const Job              = require('../models/jobModel');
const { connectMongo } = require('../models/mongo');
const EmbeddingService = require('../services/embeddingService');
const Resume           = require('../models/resumeModel');
const logger           = require('../utils/logger');

const router = express.Router();

router.get('/jobs-ui', async (req, res) => {
  try {
    const jobs = await Job.findAll({
      where: { recruiterId: req.user.id },
      order: [['createdAt', 'DESC']],
    });
    res.render('jobs', { title: 'Jobs', jobs });
  } catch (err) {
    logger.error('Jobs UI Error: ' + err.message);
    res.status(500).send('Server error');
  }
});

router.post('/jobs-ui/create', async (req, res) => {
  try {
    const { title, description, requirements } = req.body;
    await Job.create({
      title,
      description,
      requirements,
      recruiterId: req.user.id,
    });
    res.redirect('/jobs-ui');
  } catch (err) {
    logger.error('Job Create Error: ' + err.message);
    res.status(500).send('Server error');
  }
});

router.get('/jobs-ui/delete/:id', async (req, res) => {
  try {
    const job = await Job.findOne({ where: { id: req.params.id, recruiterId: req.user.id } });
    if (job) await job.destroy();
    res.redirect('/jobs-ui');
  } catch (err) {
    logger.error('Job Delete Error: ' + err.message);
    res.status(500).send('Server error');
  }
});

router.get('/jobs-ui/:id/match', async (req, res) => {
  try {
    const userId = req.user.id;

    const job = await Job.findOne({ where: { id: req.params.id, recruiterId: userId } });
    if (!job) return res.status(404).send('Job not found');

    const jobText      = `${job.title} ${job.description} ${job.requirements || ''}`;
    const jobEmbedding = await EmbeddingService.generateEmbedding(jobText);

    const db         = await connectMongo();
    const candidates = await db.collection('resumesAI').find(
      { embedding: { $exists: true }, userId },
      { projection: { resumeId: 1, userId: 1, skills: 1, summary: 1, experience: 1, embedding: 1 } }
    ).toArray();

    if (candidates.length === 0) {
      return res.render('jobMatch', { title: `Matching — ${job.title}`, job, matches: [] });
    }

    const scored = candidates.map(c => {
      const score = EmbeddingService.cosineSimilarity(jobEmbedding, c.embedding);
      return { resumeId: c.resumeId, skills: c.skills || [], summary: c.summary || '', experience: c.experience || [], score, percentage: Math.round(score * 100) };
    }).sort((a, b) => b.score - a.score);

    const resumeIds = scored.map(s => s.resumeId);
    const resumes   = await Resume.findAll({ where: { id: resumeIds, userId } });
    const resumeMap = {};
    resumes.forEach(r => { resumeMap[r.id] = r; });

    const matches = scored.map((s, i) => ({
      rank:       i + 1,
      resumeId:   s.resumeId,
      name:       resumeMap[s.resumeId]?.name  || 'Unknown',
      email:      resumeMap[s.resumeId]?.email || '',
      skills:     s.skills,
      summary:    s.summary,
      experience: s.experience,
      percentage: s.percentage,
      score:      s.score,
      fit:        s.percentage >= 75 ? 'strong' : s.percentage >= 50 ? 'good' : 'low',
    }));

    res.render('jobMatch', { title: `Matching — ${job.title}`, job, matches });

  } catch (err) {
    logger.error('Job match error: ' + err.message);
    res.status(500).send('Server error');
  }
});

router.post('/api/jobs',       JobController.createJob);
router.get('/api/jobs',        JobController.getAllJobs);
router.get('/api/jobs/:id',    JobController.getJobById);
router.put('/api/jobs/:id',    JobController.updateJob);
router.delete('/api/jobs/:id', JobController.deleteJob);

module.exports = router;