const { DataTypes } = require('sequelize');
const sequelize = require('./index');

const Job = sequelize.define('Job', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  recruiterId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  requirements: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'jobs',
  timestamps: true,
});

module.exports = Job;