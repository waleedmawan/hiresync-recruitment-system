const { DataTypes } = require('sequelize');

function getModel() {
  const sequelize = require('./index');
  
  return sequelize.define('Application', {
    id: {
      type:          DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey:    true,
    },
    resumeId: {
      type:      DataTypes.INTEGER,
      allowNull: false,
    },
    jobId: {
      type:      DataTypes.INTEGER,
      allowNull: true,
    },
    candidateName: {
      type:      DataTypes.STRING,
      allowNull: false,
    },
    candidateEmail: {
      type:      DataTypes.STRING,
      allowNull: false,
    },
    stage: {
      type:         DataTypes.ENUM('applied', 'shortlisted', 'interview', 'offer', 'hired', 'rejected'),
      defaultValue: 'applied',
    },
    notes: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName:  'applications',
    timestamps: true,
  });
}

module.exports = getModel();