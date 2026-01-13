const express = require('express');
const dotenv = require('dotenv');
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => {
  res.send('Hello to our backend server!');
});

app.listen(PORT, function() {
  console.log(`Server is running on port ${PORT}`);
});