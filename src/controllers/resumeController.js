const path = require('path');
const fs = require('fs');
const Resume = require('../models/resumeModel');
const resumeQueue = require('../jobs/resumeJob');
const aiQueue = require('../jobs/aiResumeProcessor');

class ResumeController {

  static async upload(req, res) {
    try {
      const file = req.file;
      if (!file) return res.status(400).send('No file uploaded');

      const { userId, name, email } = req.body;
      const fileName = file.originalname;
      const filePath = file.path;

      const resume = await Resume.create({ userId, name, email, fileName, filePath });

      resumeQueue.add({ id: resume.id, filePath: resume.filePath, userId: resume.userId });
      aiQueue.add({ id: resume.id, filePath: resume.filePath, userId: resume.userId });

      res.redirect('/dashboard');
    } catch (err) {
      console.error('Upload Error:', err);
      res.status(500).send('Server error');
    }
  }

  static async getAll(req, res) {
    try {
      const resumes = await Resume.findAll({ order: [['createdAt', 'DESC']] });
      res.json(resumes);
    } catch (err) {
      console.error('Get All Error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }

  static async download(req, res) {
    try {
      const resume = await Resume.findByPk(req.params.id);
      if (!resume) return res.status(404).send('Resume not found');

      res.download(path.resolve(resume.filePath), resume.fileName);
    } catch (err) {
      console.error('Download Error:', err);
      res.status(500).send('Server error');
    }
  }

  static async delete(req, res) {
    try {
      const resume = await Resume.findByPk(req.params.id);
      if (!resume) return res.status(404).send('Resume not found');

      if (fs.existsSync(resume.filePath)) fs.unlinkSync(resume.filePath);

      await resume.destroy();

      res.redirect('/dashboard');
    } catch (err) {
      console.error('Delete Error:', err);
      res.status(500).send('Server error');
    }
  }
}

module.exports = ResumeController;
