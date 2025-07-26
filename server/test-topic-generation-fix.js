/**
 * Test script for topic generation JSON parsing fix
 * Tests the specific error patterns that occur during topic generation
 */

console.log('🧪 Testing Topic Generation JSON Parsing Fix\n');

// Simulate the fixJsonString function from the hook
const fixJsonString = (jsonString) => {
  let fixed = jsonString.trim();
  
  // Fix 1: Quote unquoted property names
  fixed = fixed.replace(/(\s+)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, (match, whitespace, propName) => {
    if (!match.includes('"')) {
      return `${whitespace}"${propName}":`;
    }
    return match;
  });
  
  // Fix 2: Quote unquoted property names at line start
  fixed = fixed.replace(/^(\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/gm, (match, whitespace, propName) => {
    if (!match.includes('"')) {
      return `${whitespace}"${propName}":`;
    }
    return match;
  });
  
  // Fix 3: Quote unquoted property names after commas
  fixed = fixed.replace(/,(\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, (match, whitespace, propName) => {
    if (!match.includes('"')) {
      return `,${whitespace}"${propName}":`;
    }
    return match;
  });
  
  // Fix 4: Replace single quotes with double quotes for property names
  fixed = fixed.replace(/(\s*)'([^']*)'(\s*:)/g, '$1"$2"$3');
  
  // Fix 5: Replace single quotes with double quotes for property values
  fixed = fixed.replace(/(\s*:\s*)'([^']*)'(\s*[,}])/g, '$1"$2"$3');
  
  // Fix 6: Remove trailing commas before closing braces
  fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
  
  // Fix 7: Fix missing commas between properties
  fixed = fixed.replace(/"([^"]*)"(\s+)"([^"]*)"(\s*:)/g, '"$1", "$3"$4');
  
  // Fix 8: Handle unterminated strings at the end
  const quoteCount = (fixed.match(/"/g) || []).length;
  if (quoteCount % 2 !== 0) {
    if (!fixed.trim().endsWith('"')) {
      fixed = fixed.trim() + '"';
    }
  }
  
  return fixed;
};

// Test cases based on actual topic generation errors
const testCases = [
  {
    name: "Expected property name or '}' error (actual error case)",
    json: `[
  {
    "title": "Cell Biology",
    "description": "Study of cellular structure and function.",
    major_area: "Cell Biology",
    "topic_level": 1,
    syllabus_code: "1",
    "official_syllabus_ref": "B1",
    "difficulty_level": 2,
    estimated_study_time_minutes: 60
  },
  {
    "title": "Cell Structure",
    description: "Components of animal and plant cells.",
    "major_area": "Cell Biology",
    topic_level: 2,
    "syllabus_code": "1.1",
    official_syllabus_ref: "B1.1",
    "difficulty_level": 2,
    "estimated_study_time_minutes": 45
  }
]`
  },
  {
    name: "Mixed quoted and unquoted properties",
    json: `[
  {
    title: "Organic Chemistry",
    "description": "Study of carbon compounds",
    major_area: "Organic Chemistry",
    "topic_level": 1,
    syllabus_code: "2",
    "official_syllabus_ref": "C2",
    difficulty_level: 3,
    "estimated_study_time_minutes": 90
  }
]`
  },
  {
    name: "Single quotes instead of double quotes",
    json: `[
  {
    'title': 'Atomic Structure',
    'description': 'Understanding atoms and their components',
    'major_area': 'Atomic Structure',
    'topic_level': 1,
    'syllabus_code': '1',
    'difficulty_level': 2,
    'estimated_study_time_minutes': 60
  }
]`
  },
  {
    name: "Trailing commas and missing quotes",
    json: `[
  {
    "title": "Photosynthesis",
    description: "Process of converting light energy to chemical energy",
    major_area: "Plant Biology",
    "topic_level": 2,
    syllabus_code: "3.1",
    "difficulty_level": 3,
    estimated_study_time_minutes: 75,
  },
  {
    title: "Cellular Respiration",
    "description": "Process of breaking down glucose for energy",
    "major_area": "Plant Biology",
    topic_level: 2,
    "syllabus_code": "3.2",
    difficulty_level: 3,
    "estimated_study_time_minutes": 75,
  }
]`
  },
  {
    name: "Complex nested structure with multiple issues",
    json: `[
  {
    title: "Chemical Bonding",
    description: "Types of chemical bonds and their properties",
    major_area: "Chemical Bonding",
    topic_level: 1,
    syllabus_code: "4",
    official_syllabus_ref: "C4",
    difficulty_level: 4,
    estimated_study_time_minutes: 120
  },
  {
    "title": "Ionic Bonding",
    description: "Formation and properties of ionic compounds",
    "major_area": "Chemical Bonding",
    topic_level: 2,
    "syllabus_code": "4.1",
    official_syllabus_ref: "C4.1",
    "difficulty_level": 3,
    estimated_study_time_minutes: 60
  }
]`
  }
];

async function testTopicGenerationFixes() {
  let successCount = 0;
  let totalTests = testCases.length;
  
  console.log(`📋 Running ${totalTests} topic generation JSON fix tests...\n`);
  
  for (const [index, testCase] of testCases.entries()) {
    console.log(`Test ${index + 1}: ${testCase.name}`);
    console.log('=' + '='.repeat(testCase.name.length + 8));
    
    try {
      // First, try to parse the original JSON to confirm it fails
      let originalFailed = false;
      try {
        JSON.parse(testCase.json);
        console.log('⚠️  Original JSON is already valid (unexpected)');
      } catch (originalError) {
        originalFailed = true;
        console.log(`❌ Original JSON failed as expected: ${originalError.message}`);
      }
      
      // Apply the fix
      const fixedJson = fixJsonString(testCase.json);
      
      // Try to parse the fixed JSON
      const parsed = JSON.parse(fixedJson);
      
      console.log('✅ SUCCESS - JSON fixed and parsed');
      console.log(`   Topics found: ${parsed.length}`);
      console.log(`   First topic: ${parsed[0]?.title || 'N/A'}`);
      console.log(`   All required fields present: ${parsed.every(t => 
        t.title && t.description && t.major_area && 
        typeof t.topic_level === 'number' && 
        typeof t.difficulty_level === 'number'
      )}`);
      
      // Validate the structure matches expected topic format
      const isValidStructure = parsed.every(topic => 
        typeof topic.title === 'string' &&
        typeof topic.description === 'string' &&
        typeof topic.major_area === 'string' &&
        typeof topic.topic_level === 'number' &&
        typeof topic.difficulty_level === 'number' &&
        typeof topic.estimated_study_time_minutes === 'number'
      );
      
      if (isValidStructure) {
        console.log('   ✅ Structure validation passed');
        successCount++;
      } else {
        console.log('   ⚠️  Structure validation failed - some fields have wrong types');
      }
      
    } catch (error) {
      console.log(`❌ FAILED: ${error.message}`);
      console.log('   Fixed JSON preview:', fixedJson.substring(0, 200) + '...');
    }
    
    console.log('');
  }
  
  console.log('📊 SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Successful fixes: ${successCount}/${totalTests}`);
  console.log(`❌ Failed fixes: ${totalTests - successCount}/${totalTests}`);
  console.log(`📈 Success rate: ${((successCount / totalTests) * 100).toFixed(1)}%`);
  
  if (successCount === totalTests) {
    console.log('\n🎉 All topic generation JSON fixes working perfectly!');
    console.log('   The "Expected property name or \'}\'" error should now be resolved.');
  } else {
    console.log('\n⚠️  Some fixes failed - may need additional refinement.');
  }
}

// Test specific error position analysis
function testErrorPositionAnalysis() {
  console.log('\n🔍 Error Position Analysis\n');
  
  const problematicJson = `[
  {
    "title": "Cell Biology",
    "description": "Study of cellular structure and function.",
    major_area: "Cell Biology",
    "topic_level": 1
  }
]`;
  
  console.log('📝 Analyzing problematic JSON...');
  console.log('Original JSON:');
  console.log(problematicJson);
  
  try {
    JSON.parse(problematicJson);
    console.log('✅ Original JSON is valid (unexpected)');
  } catch (error) {
    console.log(`❌ Original error: ${error.message}`);
    
    // Find the error position
    const match = error.message.match(/position (\d+)/);
    if (match) {
      const position = parseInt(match[1]);
      console.log(`   Error at position: ${position}`);
      console.log(`   Character at position: "${problematicJson[position]}"`);
      console.log(`   Context: "${problematicJson.substring(Math.max(0, position - 10), position + 10)}"`);
    }
  }
  
  console.log('\n🔧 Applying fix...');
  const fixed = fixJsonString(problematicJson);
  console.log('Fixed JSON:');
  console.log(fixed);
  
  try {
    const parsed = JSON.parse(fixed);
    console.log('✅ Fixed JSON parsed successfully');
    console.log('Result:', JSON.stringify(parsed, null, 2));
  } catch (error) {
    console.log(`❌ Fixed JSON still fails: ${error.message}`);
  }
}

// Run all tests
async function runAllTests() {
  try {
    await testTopicGenerationFixes();
    testErrorPositionAnalysis();
    console.log('\n🏁 All topic generation JSON fix tests completed');
  } catch (error) {
    console.error('💥 Test suite error:', error);
  }
}

runAllTests();
