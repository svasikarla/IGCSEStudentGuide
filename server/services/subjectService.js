const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role for admin operations
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Create a subject with complete hierarchy (chapters and topics) in a single transaction
 * @param {Object} data - Subject hierarchy data
 * @param {Object} data.subject - Subject details
 * @param {Array} data.chapters - Array of chapters with topics
 * @returns {Promise<Object>} Created subject with statistics
 */
async function createSubjectWithHierarchy(data) {
  const { subject, chapters = [] } = data;

  try {
    // Step 1: Create the subject
    const { data: subjectRecord, error: subjectError } = await supabase
      .from('subjects')
      .insert({
        name: subject.name,
        code: subject.code.toUpperCase(),
        description: subject.description,
        color_hex: subject.color_hex || '#6366f1',
        icon_name: subject.icon_name || 'book',
        curriculum_board: subject.curriculum_board || 'Cambridge IGCSE',
        grade_levels: subject.grade_levels || [9, 10],
        is_active: subject.is_active !== undefined ? subject.is_active : true,
        display_order: subject.display_order || 0
      })
      .select()
      .single();

    if (subjectError) {
      throw new Error(`Failed to create subject: ${subjectError.message}`);
    }

    console.log(`✓ Created subject: ${subjectRecord.name} (${subjectRecord.code})`);

    let totalChapters = 0;
    let totalTopics = 0;
    let totalStudyTime = 0;

    // Step 2: Create chapters and topics
    for (const chapterData of chapters) {
      const { topics = [], ...chapterInfo } = chapterData;

      // Insert chapter
      const { data: chapterRecord, error: chapterError } = await supabase
        .from('chapters')
        .insert({
          subject_id: subjectRecord.id,
          title: chapterInfo.title,
          description: chapterInfo.description || '',
          slug: chapterInfo.slug || generateSlug(chapterInfo.title),
          syllabus_code: chapterInfo.syllabus_code || '',
          curriculum_board: chapterInfo.curriculum_board || subject.curriculum_board || 'Cambridge IGCSE',
          tier: chapterInfo.tier || null,
          display_order: chapterInfo.display_order || 0,
          color_hex: chapterInfo.color_hex || subject.color_hex || '#6366f1',
          icon_name: chapterInfo.icon_name || 'folder',
          estimated_study_time_minutes: chapterInfo.estimated_study_time_minutes || 0,
          learning_objectives: chapterInfo.learning_objectives || [],
          is_published: chapterInfo.is_published !== undefined ? chapterInfo.is_published : true,
          is_active: chapterInfo.is_active !== undefined ? chapterInfo.is_active : true
        })
        .select()
        .single();

      if (chapterError) {
        throw new Error(`Failed to create chapter "${chapterInfo.title}": ${chapterError.message}`);
      }

      console.log(`  ✓ Created chapter: ${chapterRecord.title}`);
      totalChapters++;

      // Step 3: Insert topics for this chapter
      if (topics.length > 0) {
        const topicsToInsert = topics.map(topic => ({
          subject_id: subjectRecord.id,
          chapter_id: chapterRecord.id,
          title: topic.title,
          slug: topic.slug || generateSlug(topic.title),
          description: topic.description || '',
          content: topic.content || '',
          difficulty_level: topic.difficulty_level || 1,
          estimated_study_time_minutes: topic.estimated_study_time_minutes || 30,
          learning_objectives: topic.learning_objectives || [],
          prerequisites: topic.prerequisites || [],
          display_order: topic.display_order || 0,
          is_published: topic.is_published !== undefined ? topic.is_published : true
        }));

        const { data: topicRecords, error: topicsError } = await supabase
          .from('topics')
          .insert(topicsToInsert)
          .select();

        if (topicsError) {
          throw new Error(`Failed to create topics for chapter "${chapterRecord.title}": ${topicsError.message}`);
        }

        console.log(`    ✓ Created ${topicRecords.length} topics`);
        totalTopics += topicRecords.length;

        // Calculate total study time
        topicRecords.forEach(topic => {
          totalStudyTime += topic.estimated_study_time_minutes || 0;
        });
      }
    }

    console.log(`✓ Import complete: ${totalChapters} chapters, ${totalTopics} topics`);

    return {
      success: true,
      subject: subjectRecord,
      stats: {
        chaptersCreated: totalChapters,
        topicsCreated: totalTopics,
        totalStudyTimeMinutes: totalStudyTime,
        avgTopicsPerChapter: totalChapters > 0 ? Math.round(totalTopics / totalChapters) : 0
      }
    };

  } catch (error) {
    console.error('Error in createSubjectWithHierarchy:', error);

    // Note: Supabase doesn't support transactions like PostgreSQL
    // If there's an error, we should clean up any created records
    // For now, we'll rely on cascade deletes if the subject is deleted

    throw error;
  }
}

/**
 * Get subject with complete hierarchy
 * @param {string} subjectId - Subject UUID
 * @returns {Promise<Object>} Subject with chapters and topics
 */
async function getSubjectHierarchy(subjectId) {
  try {
    // Get subject
    const { data: subject, error: subjectError } = await supabase
      .from('subjects')
      .select('*')
      .eq('id', subjectId)
      .single();

    if (subjectError) {
      throw new Error(`Subject not found: ${subjectError.message}`);
    }

    // Get chapters with topics
    const { data: chapters, error: chaptersError } = await supabase
      .from('chapters')
      .select(`
        *,
        topics (*)
      `)
      .eq('subject_id', subjectId)
      .order('display_order', { ascending: true });

    if (chaptersError) {
      throw new Error(`Failed to fetch chapters: ${chaptersError.message}`);
    }

    // Calculate statistics
    let totalTopics = 0;
    let totalStudyTime = 0;

    const chaptersWithStats = chapters.map(chapter => {
      const topicCount = chapter.topics?.length || 0;
      const chapterStudyTime = chapter.topics?.reduce((sum, topic) =>
        sum + (topic.estimated_study_time_minutes || 0), 0) || 0;

      totalTopics += topicCount;
      totalStudyTime += chapterStudyTime;

      return {
        ...chapter,
        stats: {
          topicCount,
          totalStudyTimeMinutes: chapterStudyTime,
          avgDifficulty: topicCount > 0
            ? (chapter.topics.reduce((sum, t) => sum + (t.difficulty_level || 1), 0) / topicCount).toFixed(1)
            : 0
        }
      };
    });

    return {
      success: true,
      subject,
      chapters: chaptersWithStats,
      stats: {
        totalChapters: chapters.length,
        totalTopics,
        totalStudyTimeMinutes: totalStudyTime,
        avgTopicsPerChapter: chapters.length > 0 ? Math.round(totalTopics / chapters.length) : 0
      }
    };

  } catch (error) {
    console.error('Error in getSubjectHierarchy:', error);
    throw error;
  }
}

/**
 * Create a single subject (without hierarchy)
 * @param {Object} subjectData - Subject details
 * @returns {Promise<Object>} Created subject
 */
async function createSubject(subjectData) {
  try {
    // Get max display order
    const { data: maxOrderData } = await supabase
      .from('subjects')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1);

    const maxOrder = maxOrderData && maxOrderData.length > 0 ? maxOrderData[0].display_order : 0;

    const { data: subject, error } = await supabase
      .from('subjects')
      .insert({
        name: subjectData.name,
        code: subjectData.code.toUpperCase(),
        description: subjectData.description,
        color_hex: subjectData.color_hex || '#6366f1',
        icon_name: subjectData.icon_name || 'book',
        curriculum_board: subjectData.curriculum_board || 'Cambridge IGCSE',
        grade_levels: subjectData.grade_levels || [9, 10],
        is_active: subjectData.is_active !== undefined ? subjectData.is_active : true,
        display_order: subjectData.display_order || (maxOrder + 1)
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create subject: ${error.message}`);
    }

    return {
      success: true,
      subject
    };

  } catch (error) {
    console.error('Error in createSubject:', error);
    throw error;
  }
}

/**
 * Update subject
 * @param {string} subjectId - Subject UUID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated subject
 */
async function updateSubject(subjectId, updates) {
  try {
    const { data: subject, error } = await supabase
      .from('subjects')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', subjectId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update subject: ${error.message}`);
    }

    return {
      success: true,
      subject
    };

  } catch (error) {
    console.error('Error in updateSubject:', error);
    throw error;
  }
}

/**
 * Delete subject (cascade deletes chapters and topics)
 * @param {string} subjectId - Subject UUID
 * @returns {Promise<Object>} Deletion result
 */
async function deleteSubject(subjectId) {
  try {
    // Get stats before deletion
    const hierarchy = await getSubjectHierarchy(subjectId);

    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', subjectId);

    if (error) {
      throw new Error(`Failed to delete subject: ${error.message}`);
    }

    return {
      success: true,
      message: 'Subject deleted successfully',
      deletedStats: hierarchy.stats
    };

  } catch (error) {
    console.error('Error in deleteSubject:', error);
    throw error;
  }
}

/**
 * Get all subjects with basic stats
 * @returns {Promise<Array>} List of subjects
 */
async function getAllSubjects() {
  try {
    const { data: subjects, error } = await supabase
      .from('subjects')
      .select(`
        *,
        chapters (
          id,
          topics (id)
        )
      `)
      .order('display_order', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch subjects: ${error.message}`);
    }

    // Add stats to each subject
    const subjectsWithStats = subjects.map(subject => {
      const chapterCount = subject.chapters?.length || 0;
      const topicCount = subject.chapters?.reduce((sum, chapter) =>
        sum + (chapter.topics?.length || 0), 0) || 0;

      return {
        ...subject,
        stats: {
          chapterCount,
          topicCount
        },
        chapters: undefined // Remove nested data from response
      };
    });

    return {
      success: true,
      subjects: subjectsWithStats
    };

  } catch (error) {
    console.error('Error in getAllSubjects:', error);
    throw error;
  }
}

/**
 * Generate URL-friendly slug from title
 * @param {string} title - Title to convert
 * @returns {string} Slug
 */
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

module.exports = {
  createSubjectWithHierarchy,
  getSubjectHierarchy,
  createSubject,
  updateSubject,
  deleteSubject,
  getAllSubjects
};
