// imports
const express = require('express');
const dotenv = require('dotenv');
const { connect } = require('mongoose');
const connectDB = require('./config/dbConfig');
// global config
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;
// main routes
app.get('/', (req, res) => {
  res.send('Hello to our backend server!');
});
// run server
app.listen(PORT, function() {
    // connect to cloud database
    connectDB();
  console.log(`Server is running on port ${PORT}`);
});