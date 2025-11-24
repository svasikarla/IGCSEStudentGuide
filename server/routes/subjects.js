const express = require('express');
const router = express.Router();
const { verifyToken, requireTeacher } = require('../middleware/auth');
const {
  validateSubjectHierarchyMiddleware,
  validateSingleSubjectMiddleware
} = require('../validators/subjectValidator');
const {
  createSubjectWithHierarchy,
  getSubjectHierarchy,
  createSubject,
  updateSubject,
  deleteSubject,
  getAllSubjects
} = require('../services/subjectService');

// Apply authentication to all subject routes
// Subject management requires teacher or admin privileges
router.use(verifyToken, requireTeacher);

/**
 * GET /api/subjects
 * Get all subjects with basic stats
 */
router.get('/', async (req, res) => {
  try {
    const result = await getAllSubjects();

    res.json(result);
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch subjects'
    });
  }
});

/**
 * POST /api/subjects
 * Create a single subject (without hierarchy)
 */
router.post('/', validateSingleSubjectMiddleware, async (req, res) => {
  try {
    const result = await createSubject(req.body);

    // Log warnings if any
    if (req.validationWarnings && req.validationWarnings.length > 0) {
      console.warn('Subject creation warnings:', req.validationWarnings);
    }

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating subject:', error);

    // Handle duplicate key errors
    if (error.message.includes('duplicate') || error.message.includes('unique')) {
      return res.status(409).json({
        success: false,
        error: 'A subject with this name or code already exists'
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create subject'
    });
  }
});

/**
 * POST /api/subjects/bulk
 * Create subject with complete hierarchy (chapters and topics)
 *
 * Request body format:
 * {
 *   "subject": {
 *     "name": "Chemistry",
 *     "code": "CHEM",
 *     "description": "...",
 *     "color_hex": "#FF6B6B",
 *     "icon_name": "flask"
 *   },
 *   "chapters": [
 *     {
 *       "title": "1. Particulate Nature of Matter",
 *       "syllabus_code": "1",
 *       "topics": [
 *         {
 *           "title": "1.1 States of Matter",
 *           "difficulty_level": 1,
 *           "estimated_study_time_minutes": 45
 *         }
 *       ]
 *     }
 *   ]
 * }
 */
router.post('/bulk', validateSubjectHierarchyMiddleware, async (req, res) => {
  try {
    console.log('Starting bulk subject import...');

    // Log warnings if any
    if (req.validationWarnings && req.validationWarnings.length > 0) {
      console.warn('Validation warnings:', req.validationWarnings);
    }

    const result = await createSubjectWithHierarchy(req.body);

    console.log('Bulk import successful:', result.stats);

    res.status(201).json({
      ...result,
      warnings: req.validationWarnings || []
    });
  } catch (error) {
    console.error('Error in bulk subject import:', error);

    // Handle duplicate key errors
    if (error.message.includes('duplicate') || error.message.includes('unique')) {
      return res.status(409).json({
        success: false,
        error: 'A subject with this name or code already exists',
        details: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to import subject hierarchy',
      details: error.stack
    });
  }
});

/**
 * GET /api/subjects/:id
 * Get single subject by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: subject, error } = await require('../services/subjectService').supabase
      .from('subjects')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !subject) {
      return res.status(404).json({
        success: false,
        error: 'Subject not found'
      });
    }

    res.json({
      success: true,
      subject
    });
  } catch (error) {
    console.error('Error fetching subject:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch subject'
    });
  }
});

/**
 * GET /api/subjects/:id/hierarchy
 * Get subject with complete hierarchy (chapters and topics)
 */
router.get('/:id/hierarchy', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await getSubjectHierarchy(id);

    res.json(result);
  } catch (error) {
    console.error('Error fetching subject hierarchy:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Subject not found'
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch subject hierarchy'
    });
  }
});

/**
 * PUT /api/subjects/:id
 * Update subject
 */
router.put('/:id', validateSingleSubjectMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await updateSubject(id, req.body);

    res.json(result);
  } catch (error) {
    console.error('Error updating subject:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Subject not found'
      });
    }

    if (error.message.includes('duplicate') || error.message.includes('unique')) {
      return res.status(409).json({
        success: false,
        error: 'A subject with this name or code already exists'
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update subject'
    });
  }
});

/**
 * DELETE /api/subjects/:id
 * Delete subject (cascade deletes chapters and topics)
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await deleteSubject(id);

    res.json(result);
  } catch (error) {
    console.error('Error deleting subject:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Subject not found'
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete subject'
    });
  }
});

/**
 * GET /api/subjects/:id/stats
 * Get detailed statistics for a subject
 */
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;

    const hierarchy = await getSubjectHierarchy(id);

    // Calculate additional stats
    const difficultyDistribution = {};
    let totalFlashcards = 0;
    let totalQuizzes = 0;

    // These would need additional queries in a real implementation
    // For now, just return the basic stats from hierarchy

    res.json({
      success: true,
      stats: {
        ...hierarchy.stats,
        subjectName: hierarchy.subject.name,
        subjectCode: hierarchy.subject.code
      }
    });
  } catch (error) {
    console.error('Error fetching subject stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch subject statistics'
    });
  }
});

module.exports = router;
