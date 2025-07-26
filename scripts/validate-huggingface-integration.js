/**
 * End-to-End Validation Script for Hugging Face Integration
 * 
 * This script validates the complete Hugging Face integration by:
 * 1. Testing API connectivity
 * 2. Validating model availability
 * 3. Testing quiz generation workflow
 * 4. Testing exam paper generation workflow
 * 5. Measuring cost and performance metrics
 * 
 * Usage: node scripts/validate-huggingface-integration.js
 */

const fetch = require('node-fetch');
require('dotenv').config();

class HuggingFaceValidator {
  constructor() {
    this.baseUrl = 'http://localhost:3001/api/llm';
    this.results = {
      connectivity: false,
      providers: [],
      models: [],
      quizGeneration: false,
      examGeneration: false,
      costMetrics: {},
      performanceMetrics: {},
      errors: []
    };
  }

  async validate() {
    console.log('🚀 Starting Hugging Face Integration Validation...\n');

    try {
      await this.testConnectivity();
      await this.testProviderAvailability();
      await this.testModelAvailability();
      await this.testQuizGeneration();
      await this.testExamGeneration();
      await this.measurePerformance();
      await this.generateReport();
    } catch (error) {
      console.error('❌ Validation failed:', error.message);
      this.results.errors.push(error.message);
    }

    return this.results;
  }

  async testConnectivity() {
    console.log('📡 Testing API Connectivity...');
    
    try {
      const response = await fetch(`${this.baseUrl}/providers`);
      
      if (response.ok) {
        console.log('✅ API connectivity successful');
        this.results.connectivity = true;
      } else {
        throw new Error(`API returned status ${response.status}`);
      }
    } catch (error) {
      console.log('❌ API connectivity failed:', error.message);
      this.results.errors.push(`Connectivity: ${error.message}`);
    }
  }

  async testProviderAvailability() {
    console.log('\n🔍 Testing Provider Availability...');
    
    try {
      const response = await fetch(`${this.baseUrl}/providers`);
      const data = await response.json();
      
      this.results.providers = data;
      
      const huggingFaceProvider = data.find(p => p.id === 'huggingface');
      
      if (huggingFaceProvider) {
        console.log('✅ Hugging Face provider found');
        console.log(`   Available: ${huggingFaceProvider.available}`);
        console.log(`   Models: ${huggingFaceProvider.models.length}`);
        
        if (huggingFaceProvider.available) {
          console.log('✅ Hugging Face provider is available');
        } else {
          console.log('⚠️  Hugging Face provider not available - check HF_TOKEN');
          this.results.errors.push('Hugging Face provider not available');
        }
      } else {
        console.log('❌ Hugging Face provider not found');
        this.results.errors.push('Hugging Face provider not found');
      }
    } catch (error) {
      console.log('❌ Provider availability test failed:', error.message);
      this.results.errors.push(`Provider availability: ${error.message}`);
    }
  }

  async testModelAvailability() {
    console.log('\n🤖 Testing Model Availability...');
    
    const expectedModels = [
      'meta-llama/Llama-3.1-8B-Instruct',
      'meta-llama/Llama-3.1-70B-Instruct',
      'mistralai/Mistral-7B-Instruct-v0.3',
      'Qwen/Qwen-2.5-7B-Instruct',
      'deepseek-ai/DeepSeek-R1-Distill-Llama-8B'
    ];

    const huggingFaceProvider = this.results.providers.find(p => p.id === 'huggingface');
    
    if (huggingFaceProvider && huggingFaceProvider.available) {
      const availableModels = huggingFaceProvider.models;
      this.results.models = availableModels;
      
      console.log(`✅ Found ${availableModels.length} available models:`);
      availableModels.forEach(model => {
        console.log(`   - ${model}`);
      });
      
      const missingModels = expectedModels.filter(model => !availableModels.includes(model));
      if (missingModels.length > 0) {
        console.log(`⚠️  Missing expected models: ${missingModels.join(', ')}`);
      }
    } else {
      console.log('❌ Cannot test models - Hugging Face provider not available');
    }
  }

  async testQuizGeneration() {
    console.log('\n📝 Testing Quiz Generation...');
    
    try {
      const startTime = Date.now();
      
      const response = await fetch(`${this.baseUrl}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: 'Generate a simple IGCSE Mathematics quiz with 2 questions about basic algebra',
          provider: 'huggingface',
          model: 'meta-llama/Llama-3.1-8B-Instruct',
          options: {
            temperature: 0.7,
            maxTokens: 1500,
            format: 'json'
          }
        })
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Quiz generation successful');
        console.log(`   Response time: ${responseTime}ms`);
        console.log(`   Response length: ${JSON.stringify(data).length} characters`);
        
        this.results.quizGeneration = true;
        this.results.performanceMetrics.quizResponseTime = responseTime;
        
        // Validate response structure
        if (typeof data === 'object' && data !== null) {
          console.log('✅ Valid JSON response received');
        } else {
          console.log('⚠️  Response is not valid JSON');
        }
      } else {
        throw new Error(`Quiz generation failed with status ${response.status}`);
      }
    } catch (error) {
      console.log('❌ Quiz generation failed:', error.message);
      this.results.errors.push(`Quiz generation: ${error.message}`);
    }
  }

  async testExamGeneration() {
    console.log('\n📄 Testing Exam Paper Generation...');
    
    try {
      const startTime = Date.now();
      
      const response = await fetch(`${this.baseUrl}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: 'Generate an IGCSE Mathematics exam paper with 3 questions covering algebra and geometry',
          provider: 'huggingface',
          model: 'meta-llama/Llama-3.1-8B-Instruct',
          options: {
            temperature: 0.7,
            maxTokens: 2000,
            format: 'json'
          }
        })
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Exam generation successful');
        console.log(`   Response time: ${responseTime}ms`);
        console.log(`   Response length: ${JSON.stringify(data).length} characters`);
        
        this.results.examGeneration = true;
        this.results.performanceMetrics.examResponseTime = responseTime;
      } else {
        throw new Error(`Exam generation failed with status ${response.status}`);
      }
    } catch (error) {
      console.log('❌ Exam generation failed:', error.message);
      this.results.errors.push(`Exam generation: ${error.message}`);
    }
  }

  async measurePerformance() {
    console.log('\n⚡ Measuring Performance Metrics...');
    
    // Cost calculations (estimated)
    const estimatedCosts = {
      huggingface: 0.0002, // Per generation
      openai: 0.53,        // Per generation
      gemini: 0.26         // Per generation
    };

    this.results.costMetrics = {
      huggingfaceCost: estimatedCosts.huggingface,
      savingsVsOpenAI: ((estimatedCosts.openai - estimatedCosts.huggingface) / estimatedCosts.openai * 100).toFixed(2),
      savingsVsGemini: ((estimatedCosts.gemini - estimatedCosts.huggingface) / estimatedCosts.gemini * 100).toFixed(2),
      annualSavings1000Gen: ((estimatedCosts.openai - estimatedCosts.huggingface) * 1000 * 12).toFixed(2)
    };

    console.log('💰 Cost Analysis:');
    console.log(`   Hugging Face cost per generation: $${this.results.costMetrics.huggingfaceCost}`);
    console.log(`   Savings vs OpenAI: ${this.results.costMetrics.savingsVsOpenAI}%`);
    console.log(`   Savings vs Gemini: ${this.results.costMetrics.savingsVsGemini}%`);
    console.log(`   Annual savings (1000 gen/month): $${this.results.costMetrics.annualSavings1000Gen}`);

    // Performance metrics
    if (this.results.performanceMetrics.quizResponseTime) {
      console.log(`\n⏱️  Performance Metrics:`);
      console.log(`   Quiz generation time: ${this.results.performanceMetrics.quizResponseTime}ms`);
      
      if (this.results.performanceMetrics.examResponseTime) {
        console.log(`   Exam generation time: ${this.results.performanceMetrics.examResponseTime}ms`);
      }
    }
  }

  async generateReport() {
    console.log('\n📊 Validation Report');
    console.log('='.repeat(50));
    
    const totalTests = 5;
    const passedTests = [
      this.results.connectivity,
      this.results.providers.find(p => p.id === 'huggingface')?.available,
      this.results.models.length > 0,
      this.results.quizGeneration,
      this.results.examGeneration
    ].filter(Boolean).length;

    console.log(`Overall Status: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
      console.log('🎉 All tests passed! Hugging Face integration is ready for deployment.');
    } else {
      console.log('⚠️  Some tests failed. Review the errors above before deployment.');
    }

    if (this.results.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      this.results.errors.forEach(error => {
        console.log(`   - ${error}`);
      });
    }

    console.log('\n📈 Key Benefits:');
    console.log(`   - Cost savings: ${this.results.costMetrics.savingsVsOpenAI}% vs OpenAI`);
    console.log(`   - Available models: ${this.results.models.length}`);
    console.log(`   - Integration status: ${this.results.connectivity ? 'Ready' : 'Needs configuration'}`);
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new HuggingFaceValidator();
  validator.validate().then(results => {
    process.exit(results.errors.length === 0 ? 0 : 1);
  }).catch(error => {
    console.error('Validation script failed:', error);
    process.exit(1);
  });
}

module.exports = HuggingFaceValidator;
