const express = require('express');
const app = express();
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');

const routes = require('./routes/index');

// Config Vars
const database = process.env.DATABASE;
const port = process.env.PORT || 3030;

// Use Middlewares
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());
app.use("/api", routes);

// Connect to DB
mongoose.connect(database, { useMongoClient: true });
mongoose.Promise = global.Promise;
const db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error'));
db.once('open', () => {
  console.log('Connected to the database');
});

// Catch 404 Error
app.use((req, res, next) => {
  const err = new Error('Not found');
  err.status = 404;
  next(err);
});

// Error Handler
app.use((err, req, res, next) => {
  if (!err.status) err.status = 500;
  res.status(err.status).json({ message: err.message });
});

// Listen to port
app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
