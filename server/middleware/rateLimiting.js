/**
 * Endpoint-Specific Rate Limiting Middleware
 *
 * Provides granular rate limiting for different types of API endpoints
 * to prevent abuse and control costs.
 */

const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for expensive LLM generation endpoints
 * These endpoints consume significant API tokens and incur costs
 *
 * Limits: 10 requests per 15 minutes per IP/user
 */
const llmGenerationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many content generation requests',
    message: 'You have exceeded the rate limit for content generation. Please try again in 15 minutes.',
    retryAfter: '15 minutes'
  },
  // Skip successful requests that return cached results
  skipSuccessfulRequests: false,
  // Key generator to identify users (by IP or user ID if authenticated)
  keyGenerator: (req) => {
    // If authenticated, use user ID for better tracking
    if (req.user && req.user.id) {
      return `user:${req.user.id}`;
    }
    // Otherwise use IP address
    return req.ip;
  }
});

/**
 * Rate limiter for curriculum generation
 * More restrictive as these are very expensive operations
 *
 * Limits: 3 requests per hour per user/IP
 */
const curriculumGenerationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many curriculum generation requests',
    message: 'Curriculum generation is resource-intensive. You can generate 3 curricula per hour. Please try again later.',
    retryAfter: '1 hour'
  },
  keyGenerator: (req) => {
    if (req.user && req.user.id) {
      return `curriculum:user:${req.user.id}`;
    }
    return `curriculum:ip:${req.ip}`;
  }
});

/**
 * Rate limiter for quiz/exam/flashcard generation
 * Moderate limits for admin content creation
 *
 * Limits: 20 requests per 15 minutes per user/IP
 */
const contentGenerationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many content generation requests',
    message: 'You have exceeded the rate limit for generating quizzes, exams, or flashcards. Please try again in 15 minutes.',
    retryAfter: '15 minutes'
  },
  keyGenerator: (req) => {
    if (req.user && req.user.id) {
      return `content:user:${req.user.id}`;
    }
    return `content:ip:${req.ip}`;
  }
});

/**
 * Rate limiter for embeddings generation
 * Used by students for semantic search, so more lenient
 *
 * Limits: 50 requests per 15 minutes per user/IP
 */
const embeddingsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many embedding generation requests',
    message: 'You have exceeded the rate limit for search queries. Please try again in 15 minutes.',
    retryAfter: '15 minutes'
  },
  keyGenerator: (req) => {
    if (req.user && req.user.id) {
      return `embed:user:${req.user.id}`;
    }
    return `embed:ip:${req.ip}`;
  }
});

/**
 * Rate limiter for batch embeddings
 * More restrictive as these can be large requests
 *
 * Limits: 10 requests per 15 minutes per user/IP
 */
const batchEmbeddingsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 batch requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many batch embedding requests',
    message: 'You have exceeded the rate limit for batch embeddings. Please try again in 15 minutes.',
    retryAfter: '15 minutes'
  },
  keyGenerator: (req) => {
    if (req.user && req.user.id) {
      return `batch:user:${req.user.id}`;
    }
    return `batch:ip:${req.ip}`;
  }
});

/**
 * Rate limiter for web scraping endpoints
 * Very restrictive as scraping is resource-intensive
 *
 * Limits: 5 requests per hour per user/IP
 */
const scrapingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 scraping jobs per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many scraping requests',
    message: 'Web scraping is resource-intensive. You can trigger 5 scraping jobs per hour. Please try again later.',
    retryAfter: '1 hour'
  },
  keyGenerator: (req) => {
    if (req.user && req.user.id) {
      return `scrape:user:${req.user.id}`;
    }
    return `scrape:ip:${req.ip}`;
  }
});

module.exports = {
  llmGenerationLimiter,
  curriculumGenerationLimiter,
  contentGenerationLimiter,
  embeddingsLimiter,
  batchEmbeddingsLimiter,
  scrapingLimiter
};
