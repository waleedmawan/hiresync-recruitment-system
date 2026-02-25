const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Resume = require('../models/resumeModel');
const resumeQueue = require('../jobs/resumeJob');
const aiQueue = require('../jobs/aiResumeProcessor');
const { deleteCache } = require('../utils/cache');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename:    (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') cb(null, true);
  else cb(new Error('Only PDF files are allowed'), false);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/resume/upload-page', (req, res) => {
  res.render('upload', { title: 'Upload Resume' });
});

router.post('/upload', upload.single('resume'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).send('No file uploaded');

    const { userId, name, email } = req.body;

    const resume = await Resume.create({
      userId,
      name,
      email,
      fileName: file.originalname,
      filePath: file.path,
    });

    resumeQueue.add({ id: resume.id, filePath: resume.filePath, userId: resume.userId });
    aiQueue.add({    id: resume.id, filePath: resume.filePath, userId: resume.userId });
  
    await deleteCache('dashboard:resumes');
    await deleteCache('candidates:all');

    res.redirect('/dashboard');

  } catch (err) {
    console.error('Upload Error:', err);
    res.status(500).send('Server error');
  }
});

router.get('/resume', async (req, res) => {
  try {
    const resumes = await Resume.findAll({ order: [['createdAt', 'DESC']] });
    res.json(resumes);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/resume/download/:id', async (req, res) => {
  try {
    const resume = await Resume.findByPk(req.params.id);
    if (!resume) return res.status(404).send('Resume not found');
    res.download(path.resolve(resume.filePath), resume.fileName);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

router.get('/resume/delete/:id', async (req, res) => {
  try {
    const resume = await Resume.findByPk(req.params.id);
    if (!resume) return res.status(404).send('Resume not found');

    if (fs.existsSync(resume.filePath)) fs.unlinkSync(resume.filePath);

    await resume.destroy();

    await deleteCache('dashboard:resumes');
    await deleteCache('candidates:all');

    res.redirect('/dashboard');

  } catch (err) {
    res.status(500).send('Server error');
  }
});

module.exports = router;
