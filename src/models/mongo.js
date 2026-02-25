const { MongoClient } = require('mongodb');

const url = process.env.MONGO_URI || 'mongodb://localhost:27017';

const dbName = 'recruitmentAI';

const client = new MongoClient(url);

async function connectMongo() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    return client.db(dbName);
  } catch (err) {
    console.error('MongoDB connection error:', err);
  }
}

module.exports = { client, connectMongo };