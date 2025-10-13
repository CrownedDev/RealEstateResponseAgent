const { validationResult } = require('express-validator');
const { AppError } = require('./errorHandler');

// Validate request
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errorMessages,
    });
  }

  next();
};

// Validate MongoDB ObjectId
const validateObjectId = (paramName) => {
  return (req, res, next) => {
    const id = req.params[paramName];

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return next(new AppError(`Invalid ${paramName}`, 400));
    }

    next();
  };
};

module.exports = {
  validate,
  validateObjectId,
};
