'use strict';
const mongoose = require('mongoose');
const env = require('./env');
const logger = require('./logger');

mongoose.set('strictQuery', true);

async function connectDB(uri = env.MONGO_URI) {
  await mongoose.connect(uri, { 
    serverSelectionTimeoutMS: 15000,  // Increased to 15 seconds
    retryWrites: false,
    w: 1,
    family: 4  // Force IPv4
  });
  logger.info({ db: mongoose.connection.name }, 'MongoDB connected');
  return mongoose.connection;
}

async function disconnectDB() {
  await mongoose.disconnect();
}

module.exports = { connectDB, disconnectDB };
