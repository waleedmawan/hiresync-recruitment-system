const express = require('express');
const { connectMongo } = require('../models/mongo');
const EmbeddingService = require('../services/embeddingService');

const router = express.Router();

router.get('/jobs/:jobId/candidates', async (req, res) => {
  try {
    const { jobId } = req.params;

    const { description } = req.query;

    if (!description) {
      return res.status(400).json({ message: 'Job description is required as query param' });
    }

    const jobEmbedding = await EmbeddingService.generateEmbedding(description);

    const db = await connectMongo();
    const collection = db.collection('resumesAI');

    const candidates = await collection
      .find({ embedding: { $exists: true, $ne: [] } })
      .toArray();

    if (candidates.length === 0) {
      return res.json({ message: 'No processed candidates found', candidates: [] });
    }

    const ranked = EmbeddingService.rankCandidates(jobEmbedding, candidates);

    const result = ranked.map((c, index) => ({
      rank:            index + 1,
      resumeId:        c.resumeId,
      userId:          c.userId,
      skills:          c.skills,
      summary:         c.summary,
      experience:      c.experience,
      education:       c.education,
      similarityScore: c.similarityScore,
    }));

    res.json({
      jobDescription: description,
      totalCandidates: result.length,
      candidates: result,
    });

  } catch (err) {
    console.error('Ranking error:', err.message);
    res.status(500).json({ message: 'Server error during ranking' });
  }
});

module.exports = router;