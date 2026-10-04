const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis').default; // Notice the .default if using CommonJS with this package
const { redisClient } = require('../config/redis');

const reportSubmissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per window
  message: {
    message: 'Too many reports submitted from this IP, please try again after 15 minutes',
  },
  standardHeaders: true, 
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
  }),
});

module.exports = {
  reportSubmissionLimiter
};
