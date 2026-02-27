const express = require('express');
const { Op } = require('sequelize');
const Resume = require('../models/resumeModel');
const { connectMongo } = require('../models/mongo');

const router = express.Router();

router.get('/candidates', async (req, res) => {
  try {
    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const status = req.query.status || '';
    const offset = (page - 1) * limit;

    const where = {};

    if (search) {
      where[Op.or] = [
        { name:  { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
    }

    if (status) {
      where.status = status;
    }

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
        currentPage:  page,
        totalPages:   Math.ceil(count / limit),
        totalCount:   count,
        limit,
        search,
        status,
      },
    });

  } catch (err) {
    console.error('Candidates Error:', err);
    res.status(500).send('Server error');
  }
});

router.get('/candidates/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const candidate = await Resume.findByPk(id);
    if (!candidate) return res.status(404).send('Candidate not found');

    const db     = await connectMongo();
    const aiData = await db.collection('resumesAI').findOne(
      { resumeId: id },
      { projection: { rawText: 0, embedding: 0 } }
    );

    res.render('candidateProfile', {
      title:     candidate.name,
      candidate,
      aiData:    aiData || null,
    });

  } catch (err) {
    console.error('Profile error:', err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
