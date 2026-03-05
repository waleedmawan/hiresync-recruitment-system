const express = require('express');
const router  = express.Router();
const Resume  = require('../models/resumeModel');
const { getCache, setCache } = require('../utils/cache');

router.get('/dashboard', async (req, res) => {
  try {
    const userId   = req.user.id;
    const cacheKey = `dashboard:resumes:${userId}`;

    let resumes = await getCache(cacheKey);
    if (!resumes) {
      resumes = await Resume.findAll({
        where: { userId },
        order: [['createdAt', 'DESC']],
      });
      await setCache(cacheKey, resumes, 60);
    }

    res.render('dashboard', { title: 'Dashboard', resumes });
  } catch (err) {
    console.error('Dashboard Error:', err);
    res.status(500).send('Server error');
  }
});

module.exports = router;