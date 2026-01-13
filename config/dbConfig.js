const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function connectDB() {
  try {
    await mongoose.connect(process.env.CONNECTION_STRING, {
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection failed:', error);
  }}

module.exports = connectDB;