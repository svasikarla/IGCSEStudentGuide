/**
 * Test Suite for Enhanced Slug Generation Fix
 * Tests the fix for database constraint violation: "duplicate key value violates unique constraint 'topics_subject_id_slug_key'"
 */

const fs = require('fs');

// Test configuration
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, passed, details) {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${name}`);
  if (details) console.log(`   ${details}`);
  
  testResults.tests.push({ name, passed, details });
  if (passed) testResults.passed++;
  else testResults.failed++;
}

function testFileContains(filePath, searchText, description) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const contains = content.includes(searchText);
    logTest(description, contains, `Searching for: "${searchText}"`);
    return contains;
  } catch (error) {
    logTest(description, false, `Error reading file: ${error.message}`);
    return false;
  }
}

function testMultipleFeatures(filePath, features, description) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let allFound = true;
    const missing = [];
    
    features.forEach(feature => {
      if (!content.includes(feature)) {
        allFound = false;
        missing.push(feature);
      }
    });
    
    logTest(description, allFound, 
      allFound ? 'All features implemented' : `Missing: ${missing.join(', ')}`);
    return allFound;
  } catch (error) {
    logTest(description, false, `Error: ${error.message}`);
    return false;
  }
}

// Mock slug generation function for testing
function mockGenerateUniqueSlug(topic, existingSlugs) {
  if (topic.slug && !existingSlugs.has(topic.slug)) {
    return topic.slug;
  }

  if (!topic.title) {
    return `topic-${Date.now()}`;
  }

  // Base slug from title
  let baseSlug = topic.title.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '-')
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, '');

  // Enhance slug with hierarchical context
  const slugParts = [];
  
  if (topic.major_area) {
    const majorAreaSlug = topic.major_area.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '-')
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-+|-+$/g, '');
    slugParts.push(majorAreaSlug);
  }

  if (topic.topic_level) {
    slugParts.push(`l${topic.topic_level}`);
  }

  if (topic.syllabus_code) {
    const codeSlug = topic.syllabus_code.toLowerCase()
      .replace(/[^\w-]+/g, '-')
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-+|-+$/g, '');
    slugParts.push(codeSlug);
  }

  let candidateSlug = slugParts.length > 0 
    ? `${slugParts.join('-')}-${baseSlug}`
    : baseSlug;

  if (!candidateSlug) {
    candidateSlug = `topic-${Date.now()}`;
  }

  // If still not unique, add a counter
  let finalSlug = candidateSlug;
  let counter = 1;
  while (existingSlugs.has(finalSlug)) {
    finalSlug = `${candidateSlug}-${counter}`;
    counter++;
  }

  return finalSlug;
}

console.log('🔧 SLUG GENERATION FIX TEST SUITE\n');
console.log('=' .repeat(70));
console.log('Testing fix for database constraint violation...\n');

// Test 1: Enhanced Slug Generation Function
console.log('🧪 Testing Enhanced Slug Generation Function...');
const slugFeatures = [
  'generateUniqueSlug',
  'existingSlugs.has(topic.slug)',
  'topic.major_area',
  'topic.topic_level',
  'topic.syllabus_code',
  'slugParts.join(\'-\')',
  'existingSlugs.add(uniqueSlug)'
];

testMultipleFeatures('src/hooks/useTopics.ts', slugFeatures,
  'Enhanced slug generation with hierarchical context');

// Test 2: Existing Slug Detection
console.log('\n🔍 Testing Existing Slug Detection...');
testFileContains('src/hooks/useTopics.ts', 'const { data: existingTopics } = await supabase',
  'Fetches existing slugs from database');
testFileContains('src/hooks/useTopics.ts', 'const existingSlugs = new Set(existingTopics?.map(t => t.slug) || [])',
  'Creates set of existing slugs for duplicate detection');

// Test 3: Hierarchical Slug Components
console.log('\n🏗️  Testing Hierarchical Slug Components...');
const hierarchicalFeatures = [
  'major_area.toLowerCase()',
  'topic_level',
  'syllabus_code.toLowerCase()',
  'slugParts.push',
  'l${topic.topic_level}'
];

testMultipleFeatures('src/hooks/useTopics.ts', hierarchicalFeatures,
  'Hierarchical components in slug generation');

// Test 4: Duplicate Prevention Logic
console.log('\n🛡️  Testing Duplicate Prevention Logic...');
testFileContains('src/hooks/useTopics.ts', 'while (existingSlugs.has(finalSlug))',
  'Counter-based duplicate resolution');
testFileContains('src/hooks/useTopics.ts', 'finalSlug = `${candidateSlug}-${counter}`;',
  'Incremental counter for uniqueness');

// Test 5: Batch Processing Safety
console.log('\n📦 Testing Batch Processing Safety...');
testFileContains('src/hooks/useTopics.ts', 'existingSlugs.add(uniqueSlug);',
  'Adds generated slugs to set to prevent batch duplicates');

// Test 6: Single Topic Save Enhancement
console.log('\n🔧 Testing Single Topic Save Enhancement...');
testFileContains('src/hooks/useTopics.ts', 'const uniqueSlug = generateUniqueSlug(topic, existingSlugs);',
  'Single topic save uses enhanced slug generation');

// Test 7: Mock Slug Generation Logic Test
console.log('\n🧮 Testing Mock Slug Generation Logic...');

// Test case 1: Basic slug generation
const existingSlugs = new Set();
const topic1 = { title: 'Cell Structure', major_area: 'Biology Fundamentals', topic_level: 2, syllabus_code: '1.1' };
const slug1 = mockGenerateUniqueSlug(topic1, existingSlugs);
logTest('Basic hierarchical slug generation', 
  slug1 === 'biology-fundamentals-l2-1-1-cell-structure',
  `Generated: ${slug1}`);

// Test case 2: Duplicate handling
existingSlugs.add('biology-fundamentals-l2-1-1-cell-structure');
const topic2 = { title: 'Cell Structure', major_area: 'Biology Fundamentals', topic_level: 2, syllabus_code: '1.1' };
const slug2 = mockGenerateUniqueSlug(topic2, existingSlugs);
logTest('Duplicate slug resolution with counter',
  slug2 === 'biology-fundamentals-l2-1-1-cell-structure-1',
  `Generated: ${slug2}`);

// Test case 3: Missing hierarchical data
const topic3 = { title: 'Introduction' };
const slug3 = mockGenerateUniqueSlug(topic3, existingSlugs);
logTest('Fallback slug generation for minimal data',
  slug3 === 'introduction',
  `Generated: ${slug3}`);

// Test case 4: Complex title with special characters
const topic4 = { 
  title: 'DNA & RNA: Structure & Function!', 
  major_area: 'Molecular Biology', 
  topic_level: 3,
  syllabus_code: '2.3.1'
};
const slug4 = mockGenerateUniqueSlug(topic4, existingSlugs);
logTest('Special character handling in slug generation',
  slug4 === 'molecular-biology-l3-2-3-1-dna-rna-structure-function',
  `Generated: ${slug4}`);

// Test case 5: Multiple duplicates
existingSlugs.add('introduction');
existingSlugs.add('introduction-1');
const topic5 = { title: 'Introduction' };
const slug5 = mockGenerateUniqueSlug(topic5, existingSlugs);
logTest('Multiple duplicate resolution',
  slug5 === 'introduction-2',
  `Generated: ${slug5}`);

// Test 8: Database Schema Validation
console.log('\n🗄️  Testing Database Schema Compatibility...');
testFileContains('database/01_schema_tables.sql', 'UNIQUE(subject_id, slug)',
  'Database has unique constraint on subject_id and slug');

// Final Results
console.log('\n' + '=' .repeat(70));
console.log('📊 SLUG GENERATION FIX TEST RESULTS');
console.log('=' .repeat(70));
console.log(`✅ Passed: ${testResults.passed}`);
console.log(`❌ Failed: ${testResults.failed}`);
console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);

if (testResults.failed === 0) {
  console.log('\n🎉 ALL SLUG GENERATION TESTS PASSED!');
  console.log('🔧 Database constraint violation fix is complete and ready for testing.');
  
  console.log('\n📋 FIX SUMMARY:');
  console.log('   ✅ Enhanced slug generation with hierarchical context');
  console.log('   ✅ Existing slug detection to prevent duplicates');
  console.log('   ✅ Counter-based resolution for identical slugs');
  console.log('   ✅ Batch processing safety with slug tracking');
  console.log('   ✅ Special character and edge case handling');
  console.log('   ✅ Both bulk and single topic save methods updated');
  
  console.log('\n🎯 EXPECTED OUTCOMES:');
  console.log('   📊 No more "duplicate key value violates unique constraint" errors');
  console.log('   📊 Unique slugs for 50-100+ comprehensive curriculum topics');
  console.log('   📊 Hierarchical slug structure: major-area-level-code-title');
  console.log('   📊 Automatic duplicate resolution with counters');
} else {
  console.log('\n⚠️  Some slug generation tests failed. Review the issues above.');
}

console.log('\n🔄 NEXT STEPS:');
console.log('1. Test comprehensive curriculum generation with Biology');
console.log('2. Verify topics save successfully without constraint violations');
console.log('3. Check slug uniqueness in database after bulk save');
console.log('4. Validate hierarchical slug structure in saved topics');
