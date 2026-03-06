const { MongoClient } = require('mongodb');
const logger = require('../utils/logger');

const url    = process.env.MONGO_URI || 'mongodb://localhost:27017';
const dbName = 'hiresyncAI';

let db = null;

async function connectMongo() {
  if (db) return db;

  try {
    const client = new MongoClient(url);
    await client.connect();
    db = client.db(dbName);
    logger.info('MongoDB connected');
    return db;
  } catch (err) {
    logger.error(`MongoDB connection error: ${err.message}`, { stack: err.stack });
    throw err;
  }
}

module.exports = { connectMongo };