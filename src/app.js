const express        = require('express');
const path           = require('path');
const expressLayouts = require('express-ejs-layouts');
const cookieParser   = require('cookie-parser');
const dotenv         = require('dotenv');

dotenv.config();

const sequelize        = require('./models/index');
const rateLimiter      = require('./middlewares/rateLimiter');
const requireAuth      = require('./middlewares/authMiddleware');
const { connectMongo } = require('./models/mongo');
const logger           = require('./utils/logger');

const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public')));
app.use(rateLimiter(100, 15 * 60));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.use(expressLayouts);
app.set('layout', 'layout');

app.use((req, res, next) => {
  try { const token = req.cookies?.token; if (token) { res.locals.user = require("jsonwebtoken").verify(token, process.env.JWT_SECRET); } else { res.locals.user = null; } } catch(e) { res.locals.user = null; }
  next();
});

const authRoutes      = require('./routes/authRoutes');
const resumeRoutes    = require('./routes/resumeRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const jobRoutes       = require('./routes/jobRoutes');
const candidateRoutes = require('./routes/candidateRoutes');
const rankingRoutes   = require('./routes/rankingRoutes');
const aiResultsRoutes = require('./routes/aiResultsRoutes');
const pipelineRoutes  = require('./routes/pipelineRoutes');

app.use('/auth', authRoutes);

app.get('/', (req, res) => res.redirect('/dashboard'));

app.use('/', requireAuth, resumeRoutes);
app.use('/', requireAuth, dashboardRoutes);
app.use('/', requireAuth, jobRoutes);
app.use('/', requireAuth, candidateRoutes);
app.use('/', requireAuth, rankingRoutes);
app.use('/', requireAuth, aiResultsRoutes);
app.use('/', requireAuth, pipelineRoutes);

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

sequelize.sync({ alter: true })
  .then(() => {
    logger.info('Database synced');
    connectMongo();
    app.listen(PORT, () => logger.info(`Server running on port ${PORT}`));
  })
  .catch(err => logger.error('DB sync error', { stack: err.stack }));