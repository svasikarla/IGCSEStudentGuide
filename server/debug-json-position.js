/**
 * Debug script to understand the exact JSON parsing error
 */

const testJson = `{
  "title": "Test Quiz",
  description: "Performance test",
  difficulty_level: 3,
  "questions": [
    {
      question_text: "Test question",
      options: ["A", "B", "C", "D"],
      correct_answer_index: 0
    }
  ]
}`;

console.log('🔍 Debugging JSON Parsing Error\n');

console.log('📝 Original JSON:');
console.log(testJson);
console.log('\n📊 Character Analysis:');

// Show characters around position 28
const position = 28;
const start = Math.max(0, position - 10);
const end = Math.min(testJson.length, position + 10);

console.log(`Position ${position}: "${testJson[position]}"`);
console.log(`Context (${start}-${end}): "${testJson.substring(start, end)}"`);

// Show line and column
const lines = testJson.substring(0, position).split('\n');
const line = lines.length;
const column = lines[lines.length - 1].length + 1;
console.log(`Line ${line}, Column ${column}`);

// Show the problematic line
const allLines = testJson.split('\n');
console.log(`\nProblematic line: "${allLines[line - 1]}"`);

// Test different regex patterns
console.log('\n🧪 Testing Regex Patterns:');

const patterns = [
  {
    name: 'Current pattern',
    regex: /([\s,{])([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g,
    replacement: '$1"$2":'
  },
  {
    name: 'Simple pattern',
    regex: /(\s+)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g,
    replacement: '$1"$2":'
  },
  {
    name: 'Line start pattern',
    regex: /^(\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/gm,
    replacement: '$1"$2":'
  },
  {
    name: 'Global pattern',
    regex: /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g,
    replacement: '"$1":'
  }
];

patterns.forEach(pattern => {
  console.log(`\n${pattern.name}:`);
  const result = testJson.replace(pattern.regex, pattern.replacement);
  console.log('Result:', result.substring(0, 100) + '...');
  
  try {
    JSON.parse(result);
    console.log('✅ Valid JSON after fix');
  } catch (error) {
    console.log(`❌ Still invalid: ${error.message}`);
  }
});

// Test manual fix
console.log('\n🔧 Manual Fix Test:');
const manualFix = testJson
  .replace(/(\s+)description\s*:/, '$1"description":')
  .replace(/(\s+)difficulty_level\s*:/, '$1"difficulty_level":')
  .replace(/(\s+)question_text\s*:/, '$1"question_text":')
  .replace(/(\s+)options\s*:/, '$1"options":')
  .replace(/(\s+)correct_answer_index\s*:/, '$1"correct_answer_index":');

console.log('Manual fix result:');
console.log(manualFix);

try {
  JSON.parse(manualFix);
  console.log('✅ Manual fix successful');
} catch (error) {
  console.log(`❌ Manual fix failed: ${error.message}`);
}

// Test comprehensive pattern
console.log('\n🎯 Comprehensive Pattern Test:');
const comprehensivePattern = /(?<=[{\s,])([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=:)/g;
const comprehensiveFix = testJson.replace(comprehensivePattern, '"$1"');

console.log('Comprehensive fix result:');
console.log(comprehensiveFix);

try {
  JSON.parse(comprehensiveFix);
  console.log('✅ Comprehensive fix successful');
} catch (error) {
  console.log(`❌ Comprehensive fix failed: ${error.message}`);
}
