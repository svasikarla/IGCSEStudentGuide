/**
 * Simple Title Uniqueness Logic Test
 * Tests the title deduplication logic without database operations
 */

console.log('🔧 TITLE UNIQUENESS LOGIC TEST\n');

// Mock data with duplicate titles
const mockTopics = [
  { title: 'Introduction', major_area: 'Cell Biology' },
  { title: 'Overview', major_area: 'Cell Biology' },
  { title: 'Introduction', major_area: 'Genetics' },
  { title: 'Overview', major_area: 'Genetics' },
  { title: 'Introduction', major_area: 'Ecology' },
  { title: 'Fundamentals', major_area: 'Ecology' },
  { title: 'Cell Structure', major_area: 'Cell Biology' },
  { title: 'DNA Structure', major_area: 'Genetics' }
];

// Title uniqueness function (copied from useTopics.ts)
function generateUniqueTitle(topic, existingTitles) {
  let baseTitle = topic.title || 'Untitled Topic';
  
  // If title is already unique, return it
  if (!existingTitles.has(baseTitle)) {
    return baseTitle;
  }

  // For generic titles, enhance with hierarchical context
  const genericTitles = ['introduction', 'overview', 'fundamentals', 'basics', 'principles', 'concepts'];
  const isGeneric = genericTitles.some(generic => 
    baseTitle.toLowerCase().includes(generic)
  );

  if (isGeneric && topic.major_area) {
    // Enhance generic titles with major area context
    const enhancedTitle = `${topic.major_area} ${baseTitle}`;
    if (!existingTitles.has(enhancedTitle)) {
      return enhancedTitle;
    }
    baseTitle = enhancedTitle;
  }

  // If still duplicate, add counter
  let finalTitle = baseTitle;
  let counter = 1;
  while (existingTitles.has(finalTitle)) {
    finalTitle = `${baseTitle} ${counter}`;
    counter++;
  }

  return finalTitle;
}

// Test the logic
console.log('Original topics with duplicates:');
mockTopics.forEach((topic, i) => {
  console.log(`${i + 1}. "${topic.title}" (${topic.major_area})`);
});

console.log('\nProcessing through title uniqueness logic...\n');

const existingTitles = new Set();
const processedTopics = [];

mockTopics.forEach((topic, i) => {
  const originalTitle = topic.title;
  const uniqueTitle = generateUniqueTitle(topic, existingTitles);
  existingTitles.add(uniqueTitle);
  
  processedTopics.push({ ...topic, title: uniqueTitle });
  
  const changed = originalTitle !== uniqueTitle;
  console.log(`${i + 1}. "${originalTitle}" → "${uniqueTitle}" ${changed ? '✅ ENHANCED' : '✓ UNIQUE'}`);
});

console.log('\nFinal results:');
console.log(`Original titles: ${mockTopics.length}`);
console.log(`Unique titles: ${new Set(processedTopics.map(t => t.title)).size}`);
console.log(`Enhanced titles: ${processedTopics.filter(t => t.title.includes('Cell Biology') || t.title.includes('Genetics') || t.title.includes('Ecology')).length}`);

// Verify no duplicates
const titleSet = new Set(processedTopics.map(t => t.title));
const success = titleSet.size === processedTopics.length;

console.log(`\n${success ? '🎉 SUCCESS' : '❌ FAILED'}: All titles are ${success ? 'unique' : 'NOT unique'}`);

if (success) {
  console.log('\n📋 TITLE UNIQUENESS LOGIC WORKING CORRECTLY:');
  console.log('   ✅ Generic titles enhanced with major area context');
  console.log('   ✅ Counter-based resolution for remaining duplicates');
  console.log('   ✅ All titles are unique within the subject');
  console.log('   ✅ Ready for database insertion without constraint violations');
} else {
  console.log('\n⚠️  Title uniqueness logic needs review');
}
