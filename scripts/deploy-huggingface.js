/**
 * Deployment Script for Hugging Face Integration
 * 
 * Automates the deployment process with gradual rollout, monitoring,
 * and safety checks to ensure smooth integration.
 * 
 * Usage: node scripts/deploy-huggingface.js [phase]
 * Phases: pilot, gradual, moderate, majority, full
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class HuggingFaceDeployment {
  constructor() {
    this.phases = {
      pilot: { percentage: 10, description: 'Pilot phase - 10% traffic' },
      gradual: { percentage: 25, description: 'Gradual rollout - 25% traffic' },
      moderate: { percentage: 50, description: 'Moderate rollout - 50% traffic' },
      majority: { percentage: 75, description: 'Majority rollout - 75% traffic' },
      full: { percentage: 100, description: 'Full rollout - 100% traffic' }
    };
    
    this.currentPhase = 'pilot';
    this.deploymentLog = [];
  }

  async deploy(targetPhase = 'pilot') {
    console.log('🚀 Starting Hugging Face Integration Deployment...\n');
    
    try {
      await this.preDeploymentChecks();
      await this.updateEnvironmentConfig(targetPhase);
      await this.runTests();
      await this.deployToStaging();
      await this.validateStaging();
      await this.deployToProduction(targetPhase);
      await this.postDeploymentMonitoring();
      
      console.log('\n🎉 Deployment completed successfully!');
      this.generateDeploymentReport();
      
    } catch (error) {
      console.error('\n❌ Deployment failed:', error.message);
      await this.rollback();
      process.exit(1);
    }
  }

  async preDeploymentChecks() {
    console.log('🔍 Running pre-deployment checks...');
    
    // Check if HF_TOKEN is configured
    if (!process.env.HF_TOKEN) {
      throw new Error('HF_TOKEN environment variable is not configured');
    }
    
    // Check if required files exist
    const requiredFiles = [
      'server/services/huggingFaceService.js',
      'src/services/rolloutManager.ts',
      'src/services/costMonitor.ts'
    ];
    
    for (const file of requiredFiles) {
      if (!fs.existsSync(file)) {
        throw new Error(`Required file missing: ${file}`);
      }
    }
    
    // Check if tests exist
    const testFiles = [
      'src/tests/huggingFaceAdapter.test.ts',
      'src/tests/huggingFaceIntegration.test.ts'
    ];
    
    for (const file of testFiles) {
      if (!fs.existsSync(file)) {
        console.warn(`⚠️  Test file missing: ${file}`);
      }
    }
    
    console.log('✅ Pre-deployment checks passed');
    this.log('Pre-deployment checks completed successfully');
  }

  async updateEnvironmentConfig(phase) {
    console.log(`🔧 Updating environment configuration for ${phase} phase...`);
    
    const phaseConfig = this.phases[phase];
    if (!phaseConfig) {
      throw new Error(`Invalid phase: ${phase}`);
    }
    
    // Update .env file with rollout percentage
    const envPath = '.env';
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Update or add HF_ROLLOUT_PERCENTAGE
    const rolloutRegex = /^HF_ROLLOUT_PERCENTAGE=.*$/m;
    const rolloutLine = `HF_ROLLOUT_PERCENTAGE=${phaseConfig.percentage}`;
    
    if (rolloutRegex.test(envContent)) {
      envContent = envContent.replace(rolloutRegex, rolloutLine);
    } else {
      envContent += `\n${rolloutLine}\n`;
    }
    
    // Ensure monitoring is enabled
    const monitoringRegex = /^HF_ENABLE_MONITORING=.*$/m;
    const monitoringLine = 'HF_ENABLE_MONITORING=true';
    
    if (monitoringRegex.test(envContent)) {
      envContent = envContent.replace(monitoringRegex, monitoringLine);
    } else {
      envContent += `${monitoringLine}\n`;
    }
    
    fs.writeFileSync(envPath, envContent);
    
    console.log(`✅ Environment configured for ${phaseConfig.description}`);
    this.log(`Environment updated for ${phase} phase (${phaseConfig.percentage}%)`);
  }

  async runTests() {
    console.log('🧪 Running test suite...');
    
    try {
      // Run TypeScript compilation
      console.log('   Compiling TypeScript...');
      await execAsync('npm run build');
      
      // Run unit tests
      console.log('   Running unit tests...');
      await execAsync('npm test -- --testPathPattern=huggingFace');
      
      // Run validation script
      console.log('   Running integration validation...');
      await execAsync('node scripts/validate-huggingface-integration.js');
      
      console.log('✅ All tests passed');
      this.log('Test suite completed successfully');
      
    } catch (error) {
      throw new Error(`Tests failed: ${error.message}`);
    }
  }

  async deployToStaging() {
    console.log('🏗️  Deploying to staging environment...');
    
    try {
      // Start staging server
      console.log('   Starting staging server...');
      await execAsync('npm run start:staging', { timeout: 10000 });
      
      // Wait for server to be ready
      await this.waitForServer('http://localhost:3002');
      
      console.log('✅ Staging deployment successful');
      this.log('Staging deployment completed');
      
    } catch (error) {
      throw new Error(`Staging deployment failed: ${error.message}`);
    }
  }

  async validateStaging() {
    console.log('🔬 Validating staging environment...');
    
    try {
      // Test API endpoints
      const fetch = require('node-fetch');
      
      // Test providers endpoint
      const providersResponse = await fetch('http://localhost:3002/api/llm/providers');
      if (!providersResponse.ok) {
        throw new Error('Providers endpoint failed');
      }
      
      const providers = await providersResponse.json();
      const hfProvider = providers.find(p => p.id === 'huggingface');
      
      if (!hfProvider) {
        throw new Error('Hugging Face provider not found');
      }
      
      if (!hfProvider.available) {
        throw new Error('Hugging Face provider not available');
      }
      
      // Test generation endpoint
      const generateResponse = await fetch('http://localhost:3002/api/llm/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'Generate a simple test question',
          provider: 'huggingface',
          options: { maxTokens: 100 }
        })
      });
      
      if (!generateResponse.ok) {
        throw new Error('Generation endpoint failed');
      }
      
      console.log('✅ Staging validation successful');
      this.log('Staging validation completed');
      
    } catch (error) {
      throw new Error(`Staging validation failed: ${error.message}`);
    }
  }

  async deployToProduction(phase) {
    console.log('🚀 Deploying to production...');
    
    try {
      // Restart production server with new configuration
      console.log('   Restarting production server...');
      await execAsync('npm run restart:production');
      
      // Wait for server to be ready
      await this.waitForServer('http://localhost:3001');
      
      // Verify deployment
      await this.verifyProduction();
      
      console.log(`✅ Production deployment successful - ${this.phases[phase].description}`);
      this.log(`Production deployment completed for ${phase} phase`);
      
    } catch (error) {
      throw new Error(`Production deployment failed: ${error.message}`);
    }
  }

  async verifyProduction() {
    console.log('🔍 Verifying production deployment...');
    
    const fetch = require('node-fetch');
    
    // Test that Hugging Face provider is available
    const response = await fetch('http://localhost:3001/api/llm/providers');
    const providers = await response.json();
    const hfProvider = providers.find(p => p.id === 'huggingface');
    
    if (!hfProvider || !hfProvider.available) {
      throw new Error('Hugging Face provider not available in production');
    }
    
    console.log('✅ Production verification successful');
  }

  async postDeploymentMonitoring() {
    console.log('📊 Setting up post-deployment monitoring...');
    
    // Start monitoring script
    console.log('   Starting monitoring dashboard...');
    
    // Create monitoring script
    const monitoringScript = `
const { rolloutManager } = require('./src/services/rolloutManager');
const { costMonitor } = require('./src/services/costMonitor');

setInterval(() => {
  console.log('\\n' + rolloutManager.generateReport());
  console.log('\\n' + costMonitor.generateCostReport(1));
}, 300000); // Every 5 minutes

console.log('🔍 Monitoring started - reports every 5 minutes');
    `;
    
    fs.writeFileSync('scripts/monitor-deployment.js', monitoringScript);
    
    console.log('✅ Monitoring setup complete');
    console.log('   Run "node scripts/monitor-deployment.js" to start monitoring');
    
    this.log('Post-deployment monitoring configured');
  }

  async rollback() {
    console.log('🔄 Rolling back deployment...');
    
    try {
      // Reset rollout percentage to 0
      await this.updateEnvironmentConfig('pilot');
      
      // Restart server
      await execAsync('npm run restart:production');
      
      console.log('✅ Rollback completed');
      this.log('Deployment rolled back successfully');
      
    } catch (error) {
      console.error('❌ Rollback failed:', error.message);
    }
  }

  async waitForServer(url, timeout = 30000) {
    const fetch = require('node-fetch');
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          return;
        }
      } catch (error) {
        // Server not ready yet
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error(`Server at ${url} did not become ready within ${timeout}ms`);
  }

  log(message) {
    const timestamp = new Date().toISOString();
    this.deploymentLog.push(`${timestamp}: ${message}`);
  }

  generateDeploymentReport() {
    const report = `
🚀 Hugging Face Deployment Report
================================

Deployment completed at: ${new Date().toISOString()}
Target phase: ${this.currentPhase}
Rollout percentage: ${this.phases[this.currentPhase].percentage}%

📋 Deployment Log:
${this.deploymentLog.map(entry => `- ${entry}`).join('\n')}

🔍 Next Steps:
1. Monitor the deployment using: node scripts/monitor-deployment.js
2. Check error rates and performance metrics
3. Advance to next phase when ready: node scripts/deploy-huggingface.js gradual
4. Review cost savings in the admin dashboard

⚠️  Important:
- Monitor for 24-48 hours before advancing to next phase
- Check that error rates remain below 5%
- Verify cost savings are as expected
- Have rollback plan ready if issues arise

🎯 Success Criteria:
- Error rate < 5%
- Response time < 5 seconds
- Cost savings > 90%
- User satisfaction maintained
    `;
    
    console.log(report);
    
    // Save report to file
    fs.writeFileSync(`deployment-report-${Date.now()}.txt`, report);
  }
}

// Run deployment if called directly
if (require.main === module) {
  const phase = process.argv[2] || 'pilot';
  const deployment = new HuggingFaceDeployment();
  
  deployment.deploy(phase).catch(error => {
    console.error('Deployment failed:', error);
    process.exit(1);
  });
}

module.exports = HuggingFaceDeployment;
