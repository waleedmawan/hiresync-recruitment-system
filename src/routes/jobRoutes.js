const express = require('express');
const JobController = require('../controllers/jobController');
const Job = require('../models/jobModel');

const router = express.Router();

router.get('/jobs-ui', async (req, res) => {
  try {
    const jobs = await Job.findAll({ order: [['createdAt', 'DESC']] });
    res.render('jobs', { title: 'Jobs', jobs });
  } catch (err) {
    console.error('Jobs UI Error:', err);
    res.status(500).send('Server error');
  }
});

router.post('/jobs-ui/create', async (req, res) => {
  try {
    const { title, description, recruiterId, requirements } = req.body;
    await Job.create({ title, description, recruiterId, requirements });
    res.redirect('/jobs-ui');
  } catch (err) {
    console.error('Job Create Error:', err);
    res.status(500).send('Server error');
  }
});

router.get('/jobs-ui/delete/:id', async (req, res) => {
  try {
    const job = await Job.findByPk(req.params.id);
    if (job) await job.destroy();
    res.redirect('/jobs-ui');
  } catch (err) {
    console.error('Job Delete Error:', err);
    res.status(500).send('Server error');
  }
});

router.post('/api/jobs', JobController.createJob);
router.get('/api/jobs', JobController.getAllJobs);
router.get('/api/jobs/:id', JobController.getJobById);
router.put('/api/jobs/:id', JobController.updateJob);
router.delete('/api/jobs/:id', JobController.deleteJob);

module.exports = router;
