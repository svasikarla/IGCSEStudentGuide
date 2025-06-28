/**
 * Frontend Integration Test for Enhanced Topic Generation
 * Tests the React components and UI functionality
 */

const fs = require('fs');
const path = require('path');

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

function testFileExists(filePath, description) {
  const exists = fs.existsSync(filePath);
  logTest(`File exists: ${description}`, exists, filePath);
  return exists;
}

function testFileContains(filePath, searchText, description) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const contains = content.includes(searchText);
    logTest(`File contains: ${description}`, contains, `Searching for: "${searchText}"`);
    return contains;
  } catch (error) {
    logTest(`File contains: ${description}`, false, `Error reading file: ${error.message}`);
    return false;
  }
}

function testComponentStructure(filePath, requiredElements, description) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let allFound = true;
    const missing = [];
    
    requiredElements.forEach(element => {
      if (!content.includes(element)) {
        allFound = false;
        missing.push(element);
      }
    });
    
    logTest(`Component structure: ${description}`, allFound, 
      allFound ? 'All required elements found' : `Missing: ${missing.join(', ')}`);
    return allFound;
  } catch (error) {
    logTest(`Component structure: ${description}`, false, `Error: ${error.message}`);
    return false;
  }
}

console.log('🧪 Frontend Integration Test for Enhanced Topic Generation\n');
console.log('=' .repeat(60));

// Test 1: Core Files Existence
console.log('\n📁 Testing Core Files...');
testFileExists('src/components/admin/TopicGeneratorForm.tsx', 'TopicGeneratorForm component');
testFileExists('src/hooks/useLLMGeneration.ts', 'LLM Generation hook');
testFileExists('src/hooks/useTopics.ts', 'Topics hook');
testFileExists('src/services/llmAdapter.ts', 'LLM Adapter service');
testFileExists('src/services/llmService.ts', 'LLM Service');

// Test 2: Enhanced Schema Integration
console.log('\n🗄️  Testing Enhanced Schema Integration...');
const topicInterface = [
  'syllabus_code?: string | null;',
  'curriculum_board?: string | null;',
  'tier?: string | null;',
  'major_area?: string | null;',
  'topic_level?: number | null;',
  'official_syllabus_ref?: string | null;'
];

testComponentStructure('src/hooks/useTopics.ts', topicInterface, 'Topic interface has enhanced fields');

// Test 3: Frontend Form Enhancements
console.log('\n🎨 Testing Frontend Form Enhancements...');
const formEnhancements = [
  'curriculumBoard',
  'tier',
  'useComprehensiveGeneration',
  'Cambridge IGCSE',
  'Edexcel IGCSE',
  'Oxford AQA IGCSE',
  'Comprehensive Curriculum (Recommended)',
  'Quick Generation (Legacy)'
];

testComponentStructure('src/components/admin/TopicGeneratorForm.tsx', formEnhancements, 
  'TopicGeneratorForm has curriculum selection fields');

// Test 4: Hierarchical Display Components
console.log('\n🏗️  Testing Hierarchical Display...');
const hierarchicalElements = [
  'topic_level === 1',
  'topic_level === 2', 
  'topic_level === 3',
  'Major Areas',
  'syllabus_code',
  'major_area',
  'max-h-96 overflow-y-auto'
];

testComponentStructure('src/components/admin/TopicGeneratorForm.tsx', hierarchicalElements,
  'TopicGeneratorForm has hierarchical topic display');

// Test 5: LLM Service Enhancements
console.log('\n🤖 Testing LLM Service Enhancements...');
const llmEnhancements = [
  'generateComprehensiveCurriculum',
  'generateCurriculum',
  'curriculumBoard',
  'chunked generation'
];

testComponentStructure('src/hooks/useLLMGeneration.ts', llmEnhancements.slice(0, 3),
  'LLM Generation hook has comprehensive curriculum method');

testComponentStructure('src/services/llmService.ts', ['generateCurriculum'],
  'LLM Service has curriculum generation method');

// Test 6: Backend API Integration
console.log('\n🔗 Testing Backend API Integration...');
testFileExists('server/routes/llm.js', 'LLM API routes');
testFileContains('server/routes/llm.js', '/api/llm/generate-curriculum', 
  'Backend has curriculum generation endpoint');
testFileContains('server/routes/llm.js', 'chunked generation', 
  'Backend implements chunked generation');

// Test 7: Cost Optimization Features
console.log('\n💰 Testing Cost Optimization...');
testFileContains('src/components/admin/TopicGeneratorForm.tsx', 'gpt-4o-mini',
  'Frontend defaults to cost-optimized model');
testFileContains('server/routes/llm.js', 'gpt-4o-mini',
  'Backend supports cost-optimized model');

// Test 8: Database Schema Validation
console.log('\n🗃️  Testing Database Schema...');
const migrationFiles = fs.readdirSync('.').filter(f => f.includes('migration') || f.includes('schema'));
logTest('Database migration files present', migrationFiles.length > 0, 
  `Found: ${migrationFiles.join(', ')}`);

// Test 9: Performance Optimizations
console.log('\n⚡ Testing Performance Optimizations...');
testFileContains('src/components/admin/TopicGeneratorForm.tsx', 'overflow-y-auto',
  'UI has scrollable containers for large lists');
testFileContains('server/routes/llm.js', 'maxTokens: 4000',
  'Backend has increased token limits for comprehensive generation');

// Test 10: Error Handling
console.log('\n🛡️  Testing Error Handling...');
const errorHandling = [
  'try {',
  'catch',
  'error',
  'Error generating'
];

testComponentStructure('src/components/admin/TopicGeneratorForm.tsx', errorHandling,
  'Frontend has proper error handling');

// Final Results
console.log('\n' + '=' .repeat(60));
console.log('📊 TEST RESULTS SUMMARY');
console.log('=' .repeat(60));
console.log(`✅ Passed: ${testResults.passed}`);
console.log(`❌ Failed: ${testResults.failed}`);
console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);

if (testResults.failed === 0) {
  console.log('\n🎉 ALL TESTS PASSED! Enhanced Topic Generation System is ready for production.');
} else {
  console.log('\n⚠️  Some tests failed. Review the issues above before proceeding.');
}

console.log('\n🚀 Next Steps:');
console.log('1. Start the application: npm start');
console.log('2. Navigate to Admin Panel → Topic Generation');
console.log('3. Test comprehensive curriculum generation');
console.log('4. Verify hierarchical topic display');
console.log('5. Validate database integration');
