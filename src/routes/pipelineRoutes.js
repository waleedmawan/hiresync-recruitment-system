const express     = require('express');
const Application = require('../models/applicationModel');
const Resume      = require('../models/resumeModel');
const logger      = require('../utils/logger');

const router = express.Router();

const STAGES = ['applied', 'shortlisted', 'interview', 'offer', 'hired', 'rejected'];

router.get('/pipeline', async (req, res) => {
  try {
    const applications = await Application.findAll({
      order: [['updatedAt', 'DESC']],
    });

    const pipeline = {};
    STAGES.forEach(stage => {
      pipeline[stage] = applications.filter(a => a.stage === stage);
    });

    res.render('pipeline', {
      title:    'Recruitment Pipeline',
      pipeline,
      stages:   STAGES,
    });

  } catch (err) {
    logger.error(`Pipeline error: ${err.message}`);
    res.status(500).send('Server error');
  }
});

router.post('/pipeline/add', async (req, res) => {
  try {
    const { resumeId, stage, notes } = req.body;

    const resume = await Resume.findByPk(resumeId);
    if (!resume) return res.status(404).json({ message: 'Resume not found' });

    const existing = await Application.findOne({ where: { resumeId } });

    if (existing) {
      existing.stage = stage || 'applied';
      if (notes) existing.notes = notes;
      await existing.save();
      logger.info(`Candidate ${resume.name} moved to stage: ${existing.stage}`);
    } else {
      await Application.create({
        resumeId,
        candidateName:  resume.name,
        candidateEmail: resume.email,
        stage:          stage || 'applied',
        notes:          notes || '',
      });
      logger.info(`Candidate ${resume.name} added to pipeline at stage: ${stage || 'applied'}`);
    }

    res.redirect(`/candidates/${resumeId}`);

  } catch (err) {
    logger.error(`Pipeline add error: ${err.message}`);
    res.status(500).send('Server error');
  }
});

router.post('/pipeline/move', async (req, res) => {
  try {
    const { resumeId, stage } = req.body;

    const application = await Application.findOne({ where: { resumeId } });
    if (!application) return res.status(404).json({ message: 'Not in pipeline' });

    const oldStage    = application.stage;
    application.stage = stage;
    await application.save();

    logger.info(`Candidate moved from ${oldStage} to ${stage}`);
    res.json({ success: true, stage });

  } catch (err) {
    logger.error(`Pipeline move error: ${err.message}`);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;