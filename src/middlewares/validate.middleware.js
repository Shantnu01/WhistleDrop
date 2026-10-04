const { ZodError } = require('zod');

const validate = (schema) => async (req, res, next) => {
  try {
    await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (error) {
    if (error instanceof ZodError || error.name === 'ZodError') {
      const issues = error.issues || error.errors || [];
      return res.status(400).json({
        message: 'Validation failed',
        errors: issues.map((e) => ({
          field: e.path ? e.path.join('.') : 'unknown',
          message: e.message,
        })),
      });
    }
    next(error);
  }
};

module.exports = { validate };
