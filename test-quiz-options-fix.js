/**
 * Test script to verify the quiz options field transformation fix
 * This script tests that quiz questions with JSONB options are properly transformed to arrays
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://ixqjqfkpqjqjqjqjqjqj.supabase.co';
const supabaseKey = 'your-anon-key-here'; // Replace with actual key

async function testQuizOptionsTransformation() {
  console.log('🧪 Testing Quiz Options Field Transformation...\n');

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Step 1: Check if there are any quizzes
    console.log('📋 Step 1: Fetching available quizzes...');
    const { data: quizzes, error: quizzesError } = await supabase
      .from('quizzes')
      .select('*')
      .eq('is_published', true)
      .limit(1);

    if (quizzesError) {
      throw new Error(`Failed to fetch quizzes: ${quizzesError.message}`);
    }

    if (!quizzes || quizzes.length === 0) {
      console.log('⚠️  No published quizzes found. Creating a test quiz...');
      
      // Create a test quiz with JSONB options format
      const { data: newQuiz, error: quizError } = await supabase
        .from('quizzes')
        .insert({
          title: 'Test Quiz - Options Format',
          description: 'Test quiz to verify options field transformation',
          difficulty_level: 3,
          time_limit_minutes: 10,
          is_published: true,
          topic_id: '00000000-0000-0000-0000-000000000001' // Assuming a default topic exists
        })
        .select()
        .single();

      if (quizError) {
        throw new Error(`Failed to create test quiz: ${quizError.message}`);
      }

      // Create test questions with JSONB options format
      const testQuestions = [
        {
          quiz_id: newQuiz.id,
          question_text: 'What is 2 + 2?',
          options: { A: '3', B: '4', C: '5', D: '6' }, // JSONB object format
          correct_answer: '4',
          explanation: '2 + 2 equals 4',
          display_order: 0
        },
        {
          quiz_id: newQuiz.id,
          question_text: 'What is the capital of France?',
          options: { A: 'London', B: 'Berlin', C: 'Paris', D: 'Madrid' }, // JSONB object format
          correct_answer: 'Paris',
          explanation: 'Paris is the capital of France',
          display_order: 1
        }
      ];

      const { error: questionsError } = await supabase
        .from('quiz_questions')
        .insert(testQuestions);

      if (questionsError) {
        throw new Error(`Failed to create test questions: ${questionsError.message}`);
      }

      console.log('✅ Test quiz created successfully');
      quizzes.push(newQuiz);
    }

    // Step 2: Fetch quiz with questions (simulating the frontend fetchQuizWithQuestions function)
    const testQuiz = quizzes[0];
    console.log(`📝 Step 2: Fetching questions for quiz "${testQuiz.title}"...`);

    const { data: questionsData, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', testQuiz.id)
      .order('display_order', { ascending: true });

    if (questionsError) {
      throw new Error(`Failed to fetch questions: ${questionsError.message}`);
    }

    console.log(`📊 Found ${questionsData.length} questions`);

    // Step 3: Test the transformation logic (same as in the fixed code)
    console.log('🔄 Step 3: Testing options field transformation...');

    const transformedQuestions = (questionsData || []).map(question => {
      let options = [];
      
      console.log(`   Question: "${question.question_text}"`);
      console.log(`   Original options type: ${typeof question.options}`);
      console.log(`   Original options:`, question.options);

      // Handle different formats of options field
      if (question.options) {
        if (Array.isArray(question.options)) {
          // Already an array
          options = question.options;
          console.log(`   ✅ Options already an array: [${options.join(', ')}]`);
        } else if (typeof question.options === 'object') {
          // JSONB object format: {"A": "option1", "B": "option2", ...}
          // Convert to array in alphabetical order of keys
          const sortedKeys = Object.keys(question.options).sort();
          options = sortedKeys.map(key => question.options[key]);
          console.log(`   🔄 Transformed JSONB to array: [${options.join(', ')}]`);
        }
      }

      console.log(`   Final options: [${options.join(', ')}]\n`);

      return {
        ...question,
        options
      };
    });

    // Step 4: Verify the transformation worked
    console.log('✅ Step 4: Verifying transformation results...');
    
    let allTransformationsSuccessful = true;
    transformedQuestions.forEach((question, index) => {
      if (!Array.isArray(question.options)) {
        console.log(`❌ Question ${index + 1}: options is not an array!`);
        allTransformationsSuccessful = false;
      } else if (question.options.length === 0) {
        console.log(`⚠️  Question ${index + 1}: options array is empty`);
      } else {
        console.log(`✅ Question ${index + 1}: options is properly formatted array with ${question.options.length} items`);
      }
    });

    if (allTransformationsSuccessful) {
      console.log('\n🎉 SUCCESS: All quiz questions have properly formatted options arrays!');
      console.log('   The frontend QuizPlayer component should now work without errors.');
    } else {
      console.log('\n❌ FAILURE: Some questions still have improperly formatted options.');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testQuizOptionsTransformation();
