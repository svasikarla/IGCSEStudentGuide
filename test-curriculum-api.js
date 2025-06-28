/**
 * Test script for the enhanced curriculum generation API
 */
const https = require('https');
const http = require('http');

function makeRequest(url, options) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestModule = urlObj.protocol === 'https:' ? https : http;

    const req = requestModule.request({
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          statusText: res.statusMessage,
          ok: res.statusCode >= 200 && res.statusCode < 300,
          json: () => Promise.resolve(JSON.parse(data)),
          text: () => Promise.resolve(data)
        });
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

async function testCurriculumGeneration() {
  try {
    console.log('🧪 Testing Enhanced Curriculum Generation API...\n');
    
    const testData = {
      subjectName: 'Biology',
      gradeLevel: '9-10',
      curriculumBoard: 'Cambridge IGCSE',
      tier: 'Core',
      model: 'gpt-4o-mini',
      temperature: 0.3,
      provider: 'openai'
    };
    
    console.log('📋 Test Parameters:');
    console.log(JSON.stringify(testData, null, 2));
    console.log('\n⏳ Sending request to curriculum generation endpoint...\n');
    
    const startTime = Date.now();
    
    const response = await makeRequest('http://localhost:3001/api/llm/generate-curriculum', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(testData)
    });
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`⏱️  Response received in ${duration}s`);
    console.log(`📊 Status: ${response.status} ${response.statusText}\n`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', errorText);
      return;
    }
    
    const data = await response.json();
    
    // Analyze the response
    console.log('✅ Curriculum Generation Successful!\n');
    console.log('📈 Generation Statistics:');
    console.log(`   Total Topics: ${data.topics?.length || 0}`);
    console.log(`   Major Areas: ${data.metadata?.majorAreas || 0}`);
    console.log(`   Curriculum Board: ${data.metadata?.curriculumBoard || 'N/A'}`);
    console.log(`   Tier: ${data.metadata?.tier || 'N/A'}`);
    console.log(`   Subject: ${data.metadata?.subjectName || 'N/A'}`);
    console.log(`   Grade Level: ${data.metadata?.gradeLevel || 'N/A'}\n`);
    
    if (data.topics && data.topics.length > 0) {
      // Analyze topic structure
      const majorAreas = data.topics.filter(t => t.topic_level === 1);
      const topics = data.topics.filter(t => t.topic_level === 2);
      const subtopics = data.topics.filter(t => t.topic_level === 3);
      
      console.log('🏗️  Hierarchical Structure:');
      console.log(`   Level 1 (Major Areas): ${majorAreas.length}`);
      console.log(`   Level 2 (Topics): ${topics.length}`);
      console.log(`   Level 3 (Subtopics): ${subtopics.length}\n`);
      
      // Show sample structure
      console.log('📋 Sample Curriculum Structure:');
      majorAreas.slice(0, 2).forEach((area, index) => {
        console.log(`\n${index + 1}. ${area.title} (${area.syllabus_code || 'N/A'})`);
        console.log(`   Description: ${area.description || 'N/A'}`);
        
        const relatedTopics = topics.filter(t => t.major_area === area.title).slice(0, 3);
        relatedTopics.forEach((topic, topicIndex) => {
          console.log(`   ${index + 1}.${topicIndex + 1} ${topic.title} (${topic.syllabus_code || 'N/A'})`);
          
          const relatedSubtopics = subtopics.filter(s => 
            s.major_area === area.title && 
            s.syllabus_code?.startsWith(topic.syllabus_code || '')
          ).slice(0, 2);
          
          relatedSubtopics.forEach((subtopic, subtopicIndex) => {
            console.log(`       ${index + 1}.${topicIndex + 1}.${subtopicIndex + 1} ${subtopic.title}`);
          });
        });
      });
      
      console.log('\n✅ Test completed successfully!');
      console.log(`📊 Coverage: ${data.topics.length} topics generated (Target: 50-100+ for full syllabus)`);
      
      if (data.topics.length >= 50) {
        console.log('🎯 EXCELLENT: Full syllabus coverage achieved!');
      } else if (data.topics.length >= 25) {
        console.log('⚠️  GOOD: Partial coverage, consider extending generation');
      } else {
        console.log('❌ LIMITED: Coverage below expectations');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testCurriculumGeneration();
