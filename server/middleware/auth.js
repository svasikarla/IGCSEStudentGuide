/**
 * Authentication middleware for Supabase JWT verification
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Middleware to verify JWT token from authorization header
 * Adds the user object to the request if valid
 */
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      // Don't log this as it's expected for public endpoints
      return res.status(401).json({ error: 'No authorization header provided' });
    }

    // Extract the token from the Authorization header (Bearer token)
    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Invalid authorization format' });
    }

    // Use getUser with the token directly instead of setSession
    // This avoids the "Auth session missing" error while still validating the token
    const { data, error } = await supabase.auth.getUser(token);

    if (error) {
      // Only log unexpected errors, not auth failures
      if (error.status !== 401 && error.status !== 403) {
        console.error('Token verification error:', error);
      }
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    if (!data.user) {
      return res.status(401).json({ error: 'Invalid token - no user found' });
    }

    // Add the user object to the request for use in subsequent middleware
    req.user = data.user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ error: 'Internal server error during authentication' });
  }
};

module.exports = { verifyToken };
