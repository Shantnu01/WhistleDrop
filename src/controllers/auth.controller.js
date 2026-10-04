const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { env } = require('../config/env');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

class AuthController {
  
  static login = catchAsync(async (req, res, next) => {
    const { username, password } = req.body;

    const { rows } = await db.query('SELECT id, password FROM moderators WHERE username = $1', [username]);
    
    if (rows.length === 0) {
      return next(new AppError('Invalid credentials', 401));
    }

    const moderator = rows[0];
    const isPasswordValid = await bcrypt.compare(password, moderator.password);

    if (!isPasswordValid) {
      return next(new AppError('Invalid credentials', 401));
    }

    const token = jwt.sign({ id: moderator.id }, env.JWT_SECRET, {
      expiresIn: '1d',
    });

    res.status(200).json({ token });
  });

  static createModerator = catchAsync(async (req, res, next) => {
    const { username, password } = req.body;

    const { rows: existing } = await db.query('SELECT id FROM moderators WHERE username = $1', [username]);
    
    if (existing.length > 0) {
      return next(new AppError('Moderator already exists', 400));
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const { rows: inserted } = await db.query(
      'INSERT INTO moderators (username, password) VALUES ($1, $2) RETURNING id',
      [username, hashedPassword]
    );

    res.status(201).json({ message: 'Moderator created', moderatorId: inserted[0].id });
  });
}

module.exports = AuthController;
