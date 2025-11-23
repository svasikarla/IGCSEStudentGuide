/**
 * Error Handling Utilities
 *
 * Provides safe error responses that don't leak sensitive information
 * in production environments.
 */

/**
 * Check if we're in development mode
 * @returns {boolean} True if in development
 */
function isDevelopment() {
  return process.env.NODE_ENV === 'development';
}

/**
 * Create a safe error response object
 * Includes stack traces only in development mode
 *
 * @param {Error} error - The error object
 * @param {string} userMessage - User-friendly error message
 * @param {number} statusCode - HTTP status code (default: 500)
 * @returns {Object} Safe error response object
 */
function createErrorResponse(error, userMessage = 'An error occurred', statusCode = 500) {
  const response = {
    error: userMessage,
    timestamp: new Date().toISOString()
  };

  // Only include detailed error information in development
  if (isDevelopment()) {
    response.details = {
      message: error.message,
      name: error.name,
      stack: error.stack
    };
  } else {
    // In production, only include the error message if it's safe
    // Don't include technical details or stack traces
    response.message = error.message;
  }

  return {
    statusCode,
    body: response
  };
}

/**
 * Log error safely
 * Logs full error in all environments but only to console/logs
 *
 * @param {string} context - Where the error occurred
 * @param {Error} error - The error object
 * @param {Object} metadata - Additional context data
 */
function logError(context, error, metadata = {}) {
  const timestamp = new Date().toISOString();

  // Always log to console for server logs
  console.error(`[${timestamp}] ERROR in ${context}:`, {
    message: error.message,
    name: error.name,
    stack: isDevelopment() ? error.stack : error.stack?.split('\n')?.[0],
    ...metadata
  });

  // In production, you might want to send this to an error tracking service
  // like Sentry, LogRocket, or Datadog
  if (!isDevelopment() && process.env.ERROR_TRACKING_ENABLED === 'true') {
    // Example: Sentry.captureException(error, { contexts: { metadata } });
  }
}

/**
 * Handle async route errors safely
 * Wraps async route handlers to catch errors and respond appropriately
 *
 * @param {Function} fn - Async route handler function
 * @returns {Function} Wrapped route handler
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      logError('AsyncHandler', error, {
        method: req.method,
        path: req.path,
        query: req.query
      });

      const { statusCode, body } = createErrorResponse(
        error,
        'An unexpected error occurred',
        500
      );

      res.status(statusCode).json(body);
    });
  };
}

/**
 * Sanitize error for client response
 * Removes sensitive information before sending to client
 *
 * @param {Error} error - The error object
 * @returns {Object} Sanitized error for client
 */
function sanitizeError(error) {
  // Only send safe error information to clients
  return {
    message: error.message,
    ...(isDevelopment() && { stack: error.stack })
  };
}

module.exports = {
  isDevelopment,
  createErrorResponse,
  logError,
  asyncHandler,
  sanitizeError
};
