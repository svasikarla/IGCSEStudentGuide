const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Alias React environment variables for backend use
if (!process.env.SUPABASE_URL && process.env.REACT_APP_SUPABASE_URL) {
  process.env.SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
}
if (!process.env.SUPABASE_ANON_KEY && process.env.REACT_APP_SUPABASE_ANON_KEY) {
  process.env.SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;
}
if (!process.env.SUPABASE_SERVICE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
}
if (!process.env.SUPABASE_SERVICE_KEY && process.env.SUPABASE_ANON_KEY) {
  console.warn('⚠️ SUPABASE_SERVICE_KEY not found, falling back to SUPABASE_ANON_KEY. Admin operations may fail.');
  process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_ANON_KEY;
}
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// Import routes
const contentGenerationRoutes = require('./routes/content-generation');
const embeddingsRoutes = require('./routes/embeddings');
const scrapingRoutes = require('./routes/scraping');
const subjectsRoutes = require('./routes/subjects');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Apply rate limiting to all requests
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use(limiter);

// Health check endpoint (public)
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'IGCSE Student Guide API Server',
    status: 'running',
    endpoints: {
      health: '/api/health',
      contentGeneration: '/api/content-generation',
      subjects: '/api/subjects'
    }
  });
});

// Use the unified content generation routes (replaces llm.js and simplified-generation.js)
app.use('/api/content-generation', contentGenerationRoutes);

// Use the embeddings routes (no admin protection needed for search)
app.use('/api/embeddings', embeddingsRoutes);

// Use the scraping routes with admin protection
app.use('/api/scraping', scrapingRoutes);

// Use the subjects routes with teacher protection
app.use('/api/subjects', subjectsRoutes);

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/api/health`);
  console.log(`Content generation: http://localhost:${port}/api/content-generation/quiz`);
  console.log(`Provider info: http://localhost:${port}/api/content-generation/providers`);
  console.log(`Embeddings endpoints: http://localhost:${port}/api/embeddings/generate`);
  console.log(`Subjects API: http://localhost:${port}/api/subjects`);
  console.log(`Bulk subject import: http://localhost:${port}/api/subjects/bulk`);
});
