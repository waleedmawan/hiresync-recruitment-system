const { Sequelize } = require('sequelize');
require('dotenv').config();

let sequelize;

if (process.env.DATABASE_URL) {
  // Railway provides DATABASE_URL automatically in production
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'mysql',
    logging: false,
    dialectOptions: {
      ssl: { rejectUnauthorized: false }
    }
  });
} else {
  sequelize = new Sequelize(
    process.env.MYSQL_DB,
    process.env.MYSQL_USER,
    process.env.MYSQL_PASSWORD,
    {
      host:    process.env.MYSQL_HOST,
      dialect: 'mysql',
      logging: console.log,
    }
  );
}

module.exports = sequelize;
