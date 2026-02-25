const { DataTypes } = require('sequelize');
const sequelize = require('./index');

const Resume = sequelize.define('Resume', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false },
  fileName: { type: DataTypes.STRING, allowNull: false },
  filePath: { type: DataTypes.STRING, allowNull: false },
  status: { type: DataTypes.ENUM('pending', 'processed'), defaultValue: 'pending' },
}, {
  tableName: 'resumes',
  timestamps: true,
});

module.exports = Resume;