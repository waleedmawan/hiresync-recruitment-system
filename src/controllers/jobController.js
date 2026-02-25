const Job = require('../models/jobModel');

class JobController {
  
  static async createJob(req, res) {
    try {
      const { title, description, recruiterId, requirements } = req.body;

      if (!title || !description || !recruiterId) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      const job = await Job.create({ title, description, recruiterId, requirements });

      res.status(201).json({
        message: 'Job created successfully',
        jobId: job.id
      });

    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  }

  static async getAllJobs(req, res) {
    try {
      const jobs = await Job.findAll();
      res.json(jobs);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  }

  static async getJobById(req, res) {
    try {
      const { id } = req.params;
      const job = await Job.findByPk(id);

      if (!job) {
        return res.status(404).json({ message: 'Job not found' });
      }

      res.json(job);

    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  }

  static async updateJob(req, res) {
    try {
      const { id } = req.params;
      const { title, description, requirements } = req.body;

      const job = await Job.findByPk(id);

      if (!job) {
        return res.status(404).json({ message: 'Job not found' });
      }

      await job.update({ title, description, requirements });

      res.json({ message: 'Job updated successfully' });

    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  }

  static async deleteJob(req, res) {
    try {
      const { id } = req.params;
      const job = await Job.findByPk(id);

      if (!job) {
        return res.status(404).json({ message: 'Job not found' });
      }

      await job.destroy();
      res.json({ message: 'Job deleted successfully' });

    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  }
}

module.exports = JobController;