const { ERROR_CODES } = require('./errorCodes');
const logger = require('./logger');

class AppError extends Error {
  constructor(code, message, cause) {
    super(message);
    this.name = 'AppError';
    this.code = code || ERROR_CODES.APP_ERROR;
    this.cause = cause;
  }
}

function toAppError(error) {
  if (error instanceof AppError) {
    return error;
  }

  if (error && typeof error === 'object') {
    return new AppError(
      error.code || ERROR_CODES.INTERNAL_ERROR,
      error.message || '内部错误。',
      error
    );
  }

  return new AppError(ERROR_CODES.INTERNAL_ERROR, String(error || '内部错误。'));
}

function logError(scope, error) {
  const appError = toAppError(error);
  logger.logError(scope, appError);
  console.error(`[${scope}] ${appError.code}: ${appError.message}`, appError.cause || error);
}

module.exports = {
  AppError,
  toAppError,
  logError
};
