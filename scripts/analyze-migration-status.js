/**
 * Database Migration Status Analysis Script
 *
 * This script analyzes the current state of the major_area → chapter_id migration
 * to determine:
 * 1. Whether migration has been executed
 * 2. How many topics use major_area vs chapter_id
 * 3. Data quality and consistency issues
 * 4. What cleanup steps are needed
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function analyzeSchema() {
  console.log('\n=== SCHEMA ANALYSIS ===\n');

  // Check if topics table has major_area and topic_level columns
  const { data: topicsSample, error } = await supabase
    .from('topics')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching topics:', error);
    return null;
  }

  if (topicsSample && topicsSample.length > 0) {
    const columns = Object.keys(topicsSample[0]);
    console.log('Topics table columns:', columns.join(', '));
    console.log('\nKey columns present:');
    console.log('  - major_area:', columns.includes('major_area') ? '✓ YES' : '✗ NO');
    console.log('  - topic_level:', columns.includes('topic_level') ? '✓ YES' : '✗ NO');
    console.log('  - chapter_id:', columns.includes('chapter_id') ? '✓ YES' : '✗ NO');

    return {
      hasMajorArea: columns.includes('major_area'),
      hasTopicLevel: columns.includes('topic_level'),
      hasChapterId: columns.includes('chapter_id')
    };
  }

  return null;
}

async function analyzeTopicsDistribution(schemaInfo) {
  console.log('\n=== TOPICS DISTRIBUTION ANALYSIS ===\n');

  // Get all topics
  const { data: allTopics, error } = await supabase
    .from('topics')
    .select('id, subject_id, major_area, topic_level, chapter_id, title');

  if (error) {
    console.error('Error fetching topics:', error);
    return;
  }

  console.log(`Total topics in database: ${allTopics.length}`);

  if (schemaInfo.hasMajorArea) {
    const withMajorArea = allTopics.filter(t => t.major_area !== null && t.major_area !== '');
    const withoutMajorArea = allTopics.filter(t => !t.major_area || t.major_area === '');

    console.log(`\nMajor Area Usage:`);
    console.log(`  - Topics with major_area: ${withMajorArea.length} (${(withMajorArea.length/allTopics.length*100).toFixed(1)}%)`);
    console.log(`  - Topics without major_area: ${withoutMajorArea.length} (${(withoutMajorArea.length/allTopics.length*100).toFixed(1)}%)`);

    // Get unique major areas
    const uniqueMajorAreas = [...new Set(withMajorArea.map(t => t.major_area))];
    console.log(`  - Unique major_area values: ${uniqueMajorAreas.length}`);
    if (uniqueMajorAreas.length <= 20) {
      console.log(`    ${uniqueMajorAreas.join(', ')}`);
    }
  }

  if (schemaInfo.hasChapterId) {
    const withChapterId = allTopics.filter(t => t.chapter_id !== null);
    const withoutChapterId = allTopics.filter(t => t.chapter_id === null);

    console.log(`\nChapter ID Usage:`);
    console.log(`  - Topics with chapter_id: ${withChapterId.length} (${(withChapterId.length/allTopics.length*100).toFixed(1)}%)`);
    console.log(`  - Topics without chapter_id: ${withoutChapterId.length} (${(withoutChapterId.length/allTopics.length*100).toFixed(1)}%)`);
  }

  if (schemaInfo.hasMajorArea && schemaInfo.hasChapterId) {
    const bothSet = allTopics.filter(t => t.major_area && t.chapter_id);
    const onlyMajorArea = allTopics.filter(t => t.major_area && !t.chapter_id);
    const onlyChapterId = allTopics.filter(t => !t.major_area && t.chapter_id);
    const neither = allTopics.filter(t => !t.major_area && !t.chapter_id);

    console.log(`\nOverlap Analysis:`);
    console.log(`  - Both major_area AND chapter_id: ${bothSet.length} (${(bothSet.length/allTopics.length*100).toFixed(1)}%)`);
    console.log(`  - Only major_area (orphaned): ${onlyMajorArea.length} (${(onlyMajorArea.length/allTopics.length*100).toFixed(1)}%)`);
    console.log(`  - Only chapter_id (migrated): ${onlyChapterId.length} (${(onlyChapterId.length/allTopics.length*100).toFixed(1)}%)`);
    console.log(`  - Neither (unorganized): ${neither.length} (${(neither.length/allTopics.length*100).toFixed(1)}%)`);

    if (onlyMajorArea.length > 0) {
      console.log(`\n  ⚠️  WARNING: ${onlyMajorArea.length} topics have major_area but no chapter_id`);
      console.log(`      These topics need migration!`);
    }
  }

  return allTopics;
}

async function analyzeChapters() {
  console.log('\n=== CHAPTERS ANALYSIS ===\n');

  const { data: chapters, error } = await supabase
    .from('chapters')
    .select('id, subject_id, title, syllabus_code')
    .order('subject_id', { ascending: true })
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching chapters:', error);
    return;
  }

  console.log(`Total chapters: ${chapters.length}`);

  // Group by subject
  const { data: subjects } = await supabase
    .from('subjects')
    .select('id, name, code');

  if (subjects) {
    const subjectMap = {};
    subjects.forEach(s => {
      subjectMap[s.id] = s;
    });

    console.log('\nChapters by subject:');
    const chaptersBySubject = {};
    chapters.forEach(c => {
      const subjectId = c.subject_id;
      if (!chaptersBySubject[subjectId]) {
        chaptersBySubject[subjectId] = [];
      }
      chaptersBySubject[subjectId].push(c);
    });

    Object.keys(chaptersBySubject).forEach(subjectId => {
      const subject = subjectMap[subjectId];
      const subjectChapters = chaptersBySubject[subjectId];
      console.log(`  ${subject.name} (${subject.code}): ${subjectChapters.length} chapters`);
    });
  }

  return chapters;
}

async function analyzeTopicChapterAlignment(topics, chapters) {
  console.log('\n=== TOPIC-CHAPTER ALIGNMENT ANALYSIS ===\n');

  const topicsWithChapters = topics.filter(t => t.chapter_id);

  console.log('Verifying chapter_id references...');
  const chapterIds = new Set(chapters.map(c => c.id));
  const invalidRefs = topicsWithChapters.filter(t => !chapterIds.has(t.chapter_id));

  if (invalidRefs.length > 0) {
    console.log(`  ❌ ERROR: ${invalidRefs.length} topics reference non-existent chapters!`);
    console.log('  Sample invalid topics:', invalidRefs.slice(0, 5).map(t => ({
      id: t.id,
      title: t.title,
      chapter_id: t.chapter_id
    })));
  } else {
    console.log(`  ✓ All chapter_id references are valid`);
  }

  // Check for topics with major_area that could be mapped to chapters
  const topicsWithMajorArea = topics.filter(t => t.major_area && !t.chapter_id);
  if (topicsWithMajorArea.length > 0) {
    console.log(`\n⚠️  ${topicsWithMajorArea.length} topics with major_area but no chapter_id`);

    // Try to find matching chapters
    const majorAreaSet = new Set(topicsWithMajorArea.map(t => t.major_area));
    console.log(`   Unique major_area values: ${majorAreaSet.size}`);

    majorAreaSet.forEach(ma => {
      const matchingChapter = chapters.find(c => c.title === ma);
      const topicsCount = topicsWithMajorArea.filter(t => t.major_area === ma).length;
      if (matchingChapter) {
        console.log(`   - "${ma}": ${topicsCount} topics → ✓ Chapter exists (${matchingChapter.id})`);
      } else {
        console.log(`   - "${ma}": ${topicsCount} topics → ✗ No matching chapter`);
      }
    });
  }
}

async function generateMigrationPlan(schemaInfo, topics, chapters) {
  console.log('\n=== MIGRATION PLAN ===\n');

  if (!schemaInfo.hasMajorArea && schemaInfo.hasChapterId) {
    console.log('✓ Migration appears to be COMPLETE!');
    console.log('  - major_area column has been removed');
    console.log('  - chapter_id column exists and is in use');
    console.log('\nNo action needed.');
    return;
  }

  if (schemaInfo.hasMajorArea && schemaInfo.hasChapterId) {
    const topicsWithMajorArea = topics.filter(t => t.major_area && !t.chapter_id);
    const topicsWithBoth = topics.filter(t => t.major_area && t.chapter_id);

    if (topicsWithMajorArea.length === 0 && topicsWithBoth.length > 0) {
      console.log('⚠️  Migration is PARTIALLY complete:');
      console.log('  - All topics have been assigned to chapters');
      console.log('  - BUT major_area/topic_level columns still exist');
      console.log('\nRecommended actions:');
      console.log('1. Update all code to use chapter_id instead of major_area');
      console.log('2. Remove major_area and topic_level from TypeScript interfaces');
      console.log('3. Remove major_area and topic_level from API endpoints');
      console.log('4. Drop major_area and topic_level columns from database');
    } else if (topicsWithMajorArea.length > 0) {
      console.log('❌ Migration is INCOMPLETE:');
      console.log(`  - ${topicsWithMajorArea.length} topics still need chapter assignment`);
      console.log('\nRecommended actions:');
      console.log('1. Create chapters for unmapped major_area values');
      console.log('2. Run migration script to assign chapter_id to all topics');
      console.log('3. Validate all topics have valid chapter_id');
      console.log('4. Update code to use chapter_id');
      console.log('5. Drop major_area and topic_level columns');
    }
  }

  if (schemaInfo.hasMajorArea && !schemaInfo.hasChapterId) {
    console.log('❌ Migration has NOT been started:');
    console.log('  - chapter_id column does not exist');
    console.log('  - Still using legacy major_area model');
    console.log('\nRecommended actions:');
    console.log('1. Run migration: 001_create_chapters_table.sql');
    console.log('2. Run migration: 003_migrate_all_subjects_chapters.sql');
    console.log('3. Validate migration results');
    console.log('4. Update code to use chapter_id');
    console.log('5. Drop major_area and topic_level columns');
  }
}

async function analyzeCodeUsage() {
  console.log('\n=== CODE USAGE ANALYSIS ===\n');

  const fs = require('fs');
  const path = require('path');

  const filesToCheck = [
    'src/hooks/useLLMGeneration.ts',
    'src/hooks/useTopics.ts',
    'server/routes/llm.js',
    'src/components/admin/TopicGeneratorForm.tsx',
    'src/components/admin/EnhancedTopicGeneratorForm.tsx'
  ];

  console.log('Files still referencing major_area/topic_level:\n');

  filesToCheck.forEach(file => {
    const fullPath = path.join('/home/user/IGCSEStudentGuide', file);
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      const majorAreaMatches = (content.match(/major_area/g) || []).length;
      const topicLevelMatches = (content.match(/topic_level/g) || []).length;

      if (majorAreaMatches > 0 || topicLevelMatches > 0) {
        console.log(`  ${file}`);
        if (majorAreaMatches > 0) console.log(`    - major_area: ${majorAreaMatches} occurrences`);
        if (topicLevelMatches > 0) console.log(`    - topic_level: ${topicLevelMatches} occurrences`);
      }
    } catch (err) {
      // File doesn't exist or can't be read
    }
  });
}

async function main() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║  IGCSE Student Guide - Migration Status Analysis  ║');
  console.log('╚════════════════════════════════════════════════════╝');

  try {
    // 1. Analyze schema
    const schemaInfo = await analyzeSchema();
    if (!schemaInfo) {
      console.error('Failed to analyze schema');
      return;
    }

    // 2. Analyze topics distribution
    const topics = await analyzeTopicsDistribution(schemaInfo);

    // 3. Analyze chapters
    const chapters = await analyzeChapters();

    // 4. Analyze alignment
    if (topics && chapters && schemaInfo.hasChapterId) {
      await analyzeTopicChapterAlignment(topics, chapters);
    }

    // 5. Generate migration plan
    await generateMigrationPlan(schemaInfo, topics, chapters);

    // 6. Analyze code usage
    await analyzeCodeUsage();

    console.log('\n' + '═'.repeat(80));
    console.log('Analysis complete!');
    console.log('═'.repeat(80) + '\n');

  } catch (error) {
    console.error('Error during analysis:', error);
    process.exit(1);
  }
}

main();
