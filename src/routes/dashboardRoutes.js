const express = require('express');
const Resume = require('../models/resumeModel');
const { getCache, setCache, deleteCache } = require('../utils/cache');

const router = express.Router();

router.get('/dashboard', async (req, res) => {
  try {
    const cached = await getCache('dashboard:resumes');

    if (cached) {
      return res.render('dashboard', { title: 'Dashboard', resumes: cached });
    }

    const resumes = await Resume.findAll({ order: [['createdAt', 'DESC']] });

    await setCache('dashboard:resumes', resumes, 30);

    res.render('dashboard', { title: 'Dashboard', resumes });

  } catch (err) {
    console.error('Dashboard Error:', err);
    res.status(500).send('Server error');
  }
});

router.get('/', (req, res) => res.redirect('/dashboard'));

module.exports = router;
