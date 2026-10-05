const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const authRoutes = require('./routes/auth.routes');
const reportRoutes = require('./routes/report.routes');
const globalErrorHandler = require('./middlewares/error.middleware');
const AppError = require('./utils/AppError');

const app = express();

app.use(helmet());
app.use(compression()); // Gzip/Brotli automatic payload compression
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);

// Handle unhandled routes
app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global Error Handler
app.use(globalErrorHandler);

module.exports = app;
