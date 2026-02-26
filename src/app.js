const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const dotenv = require('dotenv');

dotenv.config();

const sequelize       = require('./models/index');
const rateLimiter     = require('./middlewares/rateLimiter');

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

app.use('/', resumeRoutes);
app.use('/', dashboardRoutes);
app.use('/', jobRoutes);
app.use('/', candidateRoutes);
app.use('/auth', authRoutes);

app.use((req, res) => {
  res.status(404).render('404', { title: 'Page Not Found' });
});

const PORT = process.env.PORT || 5000;
const { connectMongo } = require('./models/mongo');

sequelize.authenticate()
  .then(() => console.log('MySQL Connected Successfully'))
  .catch(err => console.error('MySQL connection error:', err));

sequelize.sync()
  .then(() => {
    console.log('Database synced');
    connectMongo();
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => console.error('DB sync error:', err));