const { Router } = require('express');
const AuthController = require('../controllers/auth.controller');
const { validate } = require('../middlewares/validate.middleware');
const { loginSchema } = require('../schemas/auth.schema');

const router = Router();

// Login moderator
router.post('/login', validate(loginSchema), AuthController.login);

// Helper route to create first moderator
router.post('/create-moderator', validate(loginSchema), AuthController.createModerator);

module.exports = router;
