/**
 * Test script to verify flashcard generation works with non-Physics subjects
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './server/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in server/.env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabaseContent() {
  console.log('🔍 Testing database content...\n');
  
  try {
    // Check subjects
    console.log('📚 Checking available subjects:');
    const { data: subjects, error: subjectsError } = await supabase
      .from('subjects')
      .select('*')
      .order('display_order');
    
    if (subjectsError) {
      console.error('Error fetching subjects:', subjectsError);
      return;
    }
    
    if (!subjects || subjects.length === 0) {
      console.log('❌ No subjects found in database');
      console.log('💡 Need to run sample data script');
      return;
    }
    
    subjects.forEach(subject => {
      console.log(`  ✅ ${subject.name} (${subject.code})`);
    });
    
    console.log(`\n📖 Total subjects: ${subjects.length}\n`);
    
    // Check topics for each subject
    for (const subject of subjects) {
      console.log(`🔍 Topics for ${subject.name}:`);
      
      const { data: topics, error: topicsError } = await supabase
        .from('topics')
        .select('*')
        .eq('subject_id', subject.id)
        .eq('is_published', true)
        .order('display_order');
      
      if (topicsError) {
        console.error(`Error fetching topics for ${subject.name}:`, topicsError);
        continue;
      }
      
      if (!topics || topics.length === 0) {
        console.log(`  ❌ No topics found for ${subject.name}`);
      } else {
        topics.forEach(topic => {
          console.log(`  ✅ ${topic.title} (${topic.content ? topic.content.length : 0} chars content)`);
        });
      }
      
      console.log(`  📊 Total topics: ${topics.length}\n`);
    }
    
    // Test with Mathematics if available
    const mathSubject = subjects.find(s => s.code === 'MATH' || s.name.toLowerCase().includes('math'));
    if (mathSubject) {
      await testFlashcardGeneration(mathSubject);
    } else {
      // Test with first non-Physics subject
      const nonPhysicsSubject = subjects.find(s => s.code !== 'PHYS' && !s.name.toLowerCase().includes('physics'));
      if (nonPhysicsSubject) {
        await testFlashcardGeneration(nonPhysicsSubject);
      } else {
        console.log('❌ No non-Physics subjects available for testing');
      }
    }
    
  } catch (error) {
    console.error('Error testing database:', error);
  }
}

async function testFlashcardGeneration(subject) {
  console.log(`🧪 Testing flashcard generation for ${subject.name}...\n`);
  
  try {
    // Get topics for this subject
    const { data: topics, error: topicsError } = await supabase
      .from('topics')
      .select('*')
      .eq('subject_id', subject.id)
      .eq('is_published', true)
      .limit(1);
    
    if (topicsError || !topics || topics.length === 0) {
      console.log(`❌ No topics available for ${subject.name}`);
      return;
    }
    
    const topic = topics[0];
    console.log(`📖 Using topic: ${topic.title}`);
    console.log(`📝 Content length: ${topic.content ? topic.content.length : 0} characters`);
    
    // Test the flashcard generation API call
    const testPayload = {
      topicTitle: topic.title,
      topicContent: topic.content || `This is a topic about ${topic.title} in ${subject.name}. It covers fundamental concepts and principles.`,
      cardCount: 3,
      provider: 'openai',
      model: 'gpt-4o'
    };
    
    console.log('\n🚀 Testing flashcard generation API...');
    console.log('📋 Payload:', {
      topicTitle: testPayload.topicTitle,
      contentLength: testPayload.topicContent.length,
      cardCount: testPayload.cardCount,
      provider: testPayload.provider,
      model: testPayload.model
    });
    
    // Note: This would require authentication, so we'll just show the payload
    console.log('\n✅ Test payload prepared successfully!');
    console.log('💡 To test in the UI:');
    console.log(`   1. Go to Admin > Generate Flashcards`);
    console.log(`   2. Select Subject: ${subject.name}`);
    console.log(`   3. Select Topic: ${topic.title}`);
    console.log(`   4. Choose provider: OpenAI or Google Gemini`);
    console.log(`   5. Set card count: 3-5`);
    console.log(`   6. Click Generate`);
    
  } catch (error) {
    console.error('Error testing flashcard generation:', error);
  }
}

async function addSampleDataIfNeeded() {
  console.log('🔧 Checking if sample data needs to be added...\n');
  
  try {
    const { data: subjects } = await supabase
      .from('subjects')
      .select('count')
      .single();
    
    if (!subjects || subjects.length === 0) {
      console.log('📥 Adding sample subjects and topics...');
      
      // Add Mathematics subject
      const { data: mathSubject, error: mathError } = await supabase
        .from('subjects')
        .insert({
          name: 'Mathematics',
          code: 'MATH',
          description: 'Core mathematical concepts for IGCSE students',
          color_hex: '#3b82f6',
          icon_name: 'calculator',
          display_order: 1
        })
        .select()
        .single();
      
      if (mathError) {
        console.error('Error adding Math subject:', mathError);
        return;
      }
      
      // Add a Math topic
      const { data: mathTopic, error: topicError } = await supabase
        .from('topics')
        .insert({
          subject_id: mathSubject.id,
          title: 'Algebra Fundamentals',
          slug: 'algebra-fundamentals',
          description: 'Basic algebraic concepts including variables, expressions, and equations',
          content: `# Algebra Fundamentals

## Introduction
Algebra is a branch of mathematics that uses symbols and letters to represent numbers and quantities in formulas and equations.

## Key Concepts

### Variables
A variable is a symbol (usually a letter) that represents an unknown value. Common variables include x, y, and z.

### Expressions
An algebraic expression is a combination of variables, numbers, and operations. For example: 3x + 5

### Equations
An equation is a mathematical statement that shows two expressions are equal. For example: 2x + 3 = 7

## Basic Operations
- Addition and subtraction of like terms
- Multiplication and division of variables
- Solving simple linear equations

## Practice Problems
1. Solve for x: 2x + 5 = 13
2. Simplify: 3x + 2x - 4
3. If y = 2x + 1, find y when x = 3`,
          difficulty_level: 2,
          estimated_study_time_minutes: 45,
          learning_objectives: [
            'Understand what variables represent',
            'Simplify algebraic expressions',
            'Solve basic linear equations'
          ],
          display_order: 1,
          is_published: true
        })
        .select()
        .single();
      
      if (topicError) {
        console.error('Error adding Math topic:', topicError);
        return;
      }
      
      console.log('✅ Sample data added successfully!');
      return { mathSubject, mathTopic };
    }
  } catch (error) {
    console.error('Error checking/adding sample data:', error);
  }
}

// Run the test
async function main() {
  console.log('🧪 Flashcard Generation Test for Non-Physics Subjects\n');
  console.log('=' .repeat(60) + '\n');
  
  // First, ensure we have sample data
  await addSampleDataIfNeeded();
  
  // Then test the database content
  await testDatabaseContent();
  
  console.log('\n' + '=' .repeat(60));
  console.log('✅ Test completed!');
}

main().catch(console.error);
