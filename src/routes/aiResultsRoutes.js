const express = require('express');
const { connectMongo } = require('../models/mongo');
const { getCache, setCache, deleteCache } = require('../utils/cache');

const router = express.Router();

router.get('/candidates/:id/ai-results', async (req, res) => {
  try {
    const resumeId = parseInt(req.params.id);
    const cacheKey  = `ai:resume:${resumeId}`;

    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json({ source: 'cache', data: cached });
    }

    const db         = await connectMongo();
    const collection = db.collection('resumesAI');

    const result = await collection.findOne({ resumeId });

    if (!result) {
      return res.status(404).json({ message: 'AI results not found for this candidate' });
    }

    const data = {
      resumeId:    result.resumeId,
      userId:      result.userId,
      skills:      result.skills,
      education:   result.education,
      experience:  result.experience,
      summary:     result.summary,
      processedAt: result.processedAt,
    };

    await setCache(cacheKey, data, 600);

    res.json({ source: 'mongodb', data });

  } catch (err) {
    console.error('AI results fetch error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/candidates/ai-results/all', async (req, res) => {
  try {
    const cacheKey = 'ai:resume:all';

    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json({ source: 'cache', total: cached.length, data: cached });
    }

    const db         = await connectMongo();
    const collection = db.collection('resumesAI');

    const results = await collection
      .find({}, { projection: { rawText: 0, embedding: 0 } })
      .sort({ processedAt: -1 })
      .toArray();

    await setCache(cacheKey, results, 300);

    res.json({ source: 'mongodb', total: results.length, data: results });

  } catch (err) {
    console.error('AI results fetch error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;