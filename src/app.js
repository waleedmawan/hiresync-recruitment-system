const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const dotenv = require('dotenv');

dotenv.config();

const sequelize        = require('./models/index');
const rateLimiter      = require('./middlewares/rateLimiter');
const { connectMongo } = require('./models/mongo');
const logger           = require('./utils/logger');

const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use(rateLimiter(100, 15 * 60));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.use(expressLayouts);
app.set('layout', 'layout');

const resumeRoutes    = require('./routes/resumeRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const jobRoutes       = require('./routes/jobRoutes');
const candidateRoutes = require('./routes/candidateRoutes');
const authRoutes      = require('./routes/authRoutes');
const rankingRoutes   = require('./routes/rankingRoutes');
const aiResultsRoutes = require('./routes/aiResultsRoutes');
const pipelineRoutes  = require('./routes/pipelineRoutes');

app.use('/', resumeRoutes);
app.use('/', dashboardRoutes);
app.use('/', jobRoutes);
app.use('/', candidateRoutes);
app.use('/', rankingRoutes);
app.use('/', aiResultsRoutes);
app.use('/', pipelineRoutes);
app.use('/auth', authRoutes);

app.use((err, req, res, next) => {
  logger.error(`Unhandled error on ${req.method} ${req.url}: ${err.message}`, { stack: err.stack });
  res.status(500).json({ message: 'Something went wrong on the server' });
});

app.use((req, res) => {
  res.status(404).render('404', { title: 'Page Not Found' });
});

const PORT = process.env.PORT || 5000;

sequelize.authenticate()
  .then(() => logger.info('MySQL connected successfully'))
  .catch(err => logger.error('MySQL connection error', { stack: err.stack }));

sequelize.sync()
  .then(() => {
    logger.info('Database synced');
    connectMongo();
    app.listen(PORT, () => logger.info(`Server running on port ${PORT}`));
  })
  .catch(err => logger.error('DB sync error', { stack: err.stack }));