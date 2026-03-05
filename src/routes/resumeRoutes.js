const express  = require('express');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const crypto   = require('crypto');
const { Op }   = require('sequelize');
const Resume   = require('../models/resumeModel');
const resumeQueue = require('../jobs/resumeJob');
const aiQueue     = require('../jobs/aiResumeProcessor');
const { deleteCache } = require('../utils/cache');
const logger   = require('../utils/logger');

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

function getFileHash(filePath) {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(buffer).digest('hex');
}

router.get('/resume/upload-page', (req, res) => {
  res.render('upload', { title: 'Upload Resume', error: null });
});

router.post('/upload', upload.single('resume'), async (req, res) => {
  try {
    const file   = req.file;
    if (!file) return res.status(400).send('No file uploaded');

    const userId = req.user.id;
    const { name, email } = req.body;

    const emailExists = await Resume.findOne({ where: { email, userId } });

    const fileHash   = getFileHash(file.path);
    const userResumes = await Resume.findAll({ where: { userId } });
    let hashMatch = null;
    for (const r of userResumes) {
      if (fs.existsSync(r.filePath)) {
        if (getFileHash(r.filePath) === fileHash) { hashMatch = r; break; }
      }
    }

    if (emailExists || hashMatch) {
      const duplicate = emailExists || hashMatch;
      const reason    = emailExists ? 'email' : 'file';
      return res.render('duplicateFound', {
        title: 'Duplicate Candidate Detected',
        duplicate, reason,
        newName: name, newEmail: email, newUserId: userId,
        tempFile: file.path, tempName: file.originalname,
      });
    }

    await processUpload(userId, name, email, file.originalname, file.path, res);

  } catch (err) {
    logger.error('Upload Error: ' + err.message);
    res.status(500).send('Server error');
  }
});

router.post('/upload/replace', async (req, res) => {
  try {
    const { existingId, newName, newEmail, tempFile, tempName } = req.body;
    const userId = req.user.id;

    const existing = await Resume.findOne({ where: { id: existingId, userId } });
    if (existing) {
      if (fs.existsSync(existing.filePath)) fs.unlinkSync(existing.filePath);
      await existing.destroy();
    }

    await processUpload(userId, newName, newEmail, tempName, tempFile, res);
  } catch (err) {
    logger.error('Replace Error: ' + err.message);
    res.status(500).send('Server error');
  }
});

router.post('/upload/cancel', async (req, res) => {
  try {
    const { tempFile } = req.body;
    if (tempFile && fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    res.redirect('/resume/upload-page');
  } catch (err) {
    res.redirect('/resume/upload-page');
  }
});

async function processUpload(userId, name, email, fileName, filePath, res) {
  const resume = await Resume.create({ userId, name, email, fileName, filePath });
  resumeQueue.add({ id: resume.id, filePath: resume.filePath, userId: resume.userId });
  aiQueue.add({    id: resume.id, filePath: resume.filePath, userId: resume.userId });
  await deleteCache(`dashboard:resumes:${userId}`);
  await deleteCache(`candidates:${userId}`);
  logger.info(`Resume uploaded: ${name} (${email}) by user ${userId}`);
  res.redirect('/dashboard');
}

router.get('/resume', async (req, res) => {
  try {
    const resumes = await Resume.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
    });
    res.json(resumes);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/resume/download/:id', async (req, res) => {
  try {
    const resume = await Resume.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!resume) return res.status(404).send('Resume not found');
    res.download(path.resolve(resume.filePath), resume.fileName);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

router.get('/resume/delete/:id', async (req, res) => {
  try {
    const resume = await Resume.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!resume) return res.status(404).send('Resume not found');

    if (fs.existsSync(resume.filePath)) fs.unlinkSync(resume.filePath);
    await resume.destroy();

    await deleteCache(`dashboard:resumes:${req.user.id}`);
    await deleteCache(`candidates:${req.user.id}`);

    res.redirect('/dashboard');
  } catch (err) {
    res.status(500).send('Server error');
  }
});

module.exports = router;