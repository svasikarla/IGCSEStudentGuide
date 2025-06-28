/**
 * Admin authorization middleware
 * Checks if the authenticated user has admin role in their JWT claims
 */

/**
 * Middleware to verify if the authenticated user has admin privileges
 * Must be used after the verifyToken middleware
 */
const requireAdmin = (req, res, next) => {
  try {
    // Check if user exists (should be added by verifyToken middleware)
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Check for admin role in app_metadata
    // Supabase stores custom claims in app_metadata
    const isAdmin = req.user.app_metadata?.role === 'admin';
    
    if (!isAdmin) {
      console.log('Admin access denied for user:', req.user.id);
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    // User is an admin, proceed to the next middleware/route handler
    next();
  } catch (error) {
    console.error('Admin authorization error:', error);
    return res.status(500).json({ error: 'Internal server error during authorization' });
  }
};

module.exports = { requireAdmin };
