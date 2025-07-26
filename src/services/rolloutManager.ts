/**
 * Gradual Rollout Manager for Hugging Face Integration
 * 
 * Manages the gradual rollout of Hugging Face LLM provider with:
 * - Percentage-based traffic routing
 * - Fallback mechanisms
 * - Monitoring and metrics collection
 * - A/B testing capabilities
 */

import { LLMProvider } from './llmService';

export interface RolloutConfig {
  huggingfacePercentage: number; // 0-100
  fallbackProvider: LLMProvider;
  enableMonitoring: boolean;
  enableFallback: boolean;
  maxRetries: number;
}

export interface RolloutMetrics {
  totalRequests: number;
  huggingfaceRequests: number;
  fallbackRequests: number;
  successRate: number;
  averageResponseTime: number;
  costSavings: number;
  errors: string[];
}

export class RolloutManager {
  private config: RolloutConfig;
  private metrics: RolloutMetrics;
  private startTime: number;

  constructor(config: Partial<RolloutConfig> = {}) {
    this.config = {
      huggingfacePercentage: 10, // Start with 10%
      fallbackProvider: LLMProvider.OPENAI,
      enableMonitoring: true,
      enableFallback: true,
      maxRetries: 2,
      ...config
    };

    this.metrics = {
      totalRequests: 0,
      huggingfaceRequests: 0,
      fallbackRequests: 0,
      successRate: 0,
      averageResponseTime: 0,
      costSavings: 0,
      errors: []
    };

    this.startTime = Date.now();
  }

  /**
   * Determine which provider to use based on rollout percentage
   */
  selectProvider(): LLMProvider {
    this.metrics.totalRequests++;

    // Generate random number 0-99
    const random = Math.floor(Math.random() * 100);
    
    if (random < this.config.huggingfacePercentage) {
      this.metrics.huggingfaceRequests++;
      return LLMProvider.HUGGINGFACE;
    } else {
      this.metrics.fallbackRequests++;
      return this.config.fallbackProvider;
    }
  }

  /**
   * Handle provider failure and implement fallback logic
   */
  async handleProviderFailure(
    originalProvider: LLMProvider,
    error: Error,
    retryCount: number = 0
  ): Promise<LLMProvider | null> {
    
    this.recordError(originalProvider, error);

    // If we're already using fallback, don't retry
    if (originalProvider === this.config.fallbackProvider) {
      return null;
    }

    // If fallback is disabled, don't retry
    if (!this.config.enableFallback) {
      return null;
    }

    // If we've exceeded max retries, don't retry
    if (retryCount >= this.config.maxRetries) {
      return null;
    }

    // Use fallback provider
    this.metrics.fallbackRequests++;
    return this.config.fallbackProvider;
  }

  /**
   * Record successful generation
   */
  recordSuccess(provider: LLMProvider, responseTime: number, estimatedCost: number) {
    if (this.config.enableMonitoring) {
      // Update average response time
      const totalTime = this.metrics.averageResponseTime * (this.metrics.totalRequests - 1);
      this.metrics.averageResponseTime = (totalTime + responseTime) / this.metrics.totalRequests;

      // Calculate cost savings (compared to OpenAI baseline of $0.53)
      const baselineCost = 0.53;
      const savings = baselineCost - estimatedCost;
      this.metrics.costSavings += Math.max(0, savings);

      // Update success rate
      const successfulRequests = this.metrics.totalRequests - this.metrics.errors.length;
      this.metrics.successRate = (successfulRequests / this.metrics.totalRequests) * 100;
    }
  }

  /**
   * Record error for monitoring
   */
  recordError(provider: LLMProvider, error: Error) {
    if (this.config.enableMonitoring) {
      const errorMessage = `${provider}: ${error.message}`;
      this.metrics.errors.push(errorMessage);
      
      // Update success rate
      const successfulRequests = this.metrics.totalRequests - this.metrics.errors.length;
      this.metrics.successRate = (successfulRequests / this.metrics.totalRequests) * 100;
    }
  }

  /**
   * Update rollout percentage (for gradual increase)
   */
  updateRolloutPercentage(newPercentage: number) {
    if (newPercentage >= 0 && newPercentage <= 100) {
      this.config.huggingfacePercentage = newPercentage;
      console.log(`🔄 Rollout percentage updated to ${newPercentage}%`);
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): RolloutMetrics & { config: RolloutConfig; uptime: number } {
    const uptime = Date.now() - this.startTime;
    
    return {
      ...this.metrics,
      config: { ...this.config },
      uptime
    };
  }

  /**
   * Check if rollout should be paused due to high error rate
   */
  shouldPauseRollout(): boolean {
    const errorRate = (this.metrics.errors.length / this.metrics.totalRequests) * 100;
    const huggingfaceErrorRate = this.metrics.errors.filter(e => e.startsWith('huggingface')).length / this.metrics.huggingfaceRequests * 100;
    
    // Pause if error rate is too high
    return errorRate > 20 || huggingfaceErrorRate > 30;
  }

  /**
   * Generate rollout report
   */
  generateReport(): string {
    const metrics = this.getMetrics();
    const uptimeHours = (metrics.uptime / (1000 * 60 * 60)).toFixed(2);
    
    return `
🚀 Hugging Face Rollout Report
================================

📊 Traffic Distribution:
- Total Requests: ${metrics.totalRequests}
- Hugging Face: ${metrics.huggingfaceRequests} (${((metrics.huggingfaceRequests / metrics.totalRequests) * 100).toFixed(1)}%)
- Fallback: ${metrics.fallbackRequests} (${((metrics.fallbackRequests / metrics.totalRequests) * 100).toFixed(1)}%)

📈 Performance Metrics:
- Success Rate: ${metrics.successRate.toFixed(1)}%
- Average Response Time: ${metrics.averageResponseTime.toFixed(0)}ms
- Total Cost Savings: $${metrics.costSavings.toFixed(4)}

⚙️ Configuration:
- Rollout Percentage: ${metrics.config.huggingfacePercentage}%
- Fallback Provider: ${metrics.config.fallbackProvider}
- Monitoring: ${metrics.config.enableMonitoring ? 'Enabled' : 'Disabled'}
- Uptime: ${uptimeHours} hours

${metrics.errors.length > 0 ? `
❌ Recent Errors (${metrics.errors.length}):
${metrics.errors.slice(-5).map(e => `- ${e}`).join('\n')}
` : '✅ No errors recorded'}

${this.shouldPauseRollout() ? '⚠️  HIGH ERROR RATE - CONSIDER PAUSING ROLLOUT' : '✅ Rollout performing well'}
    `.trim();
  }

  /**
   * Reset metrics (useful for testing or new rollout phases)
   */
  resetMetrics() {
    this.metrics = {
      totalRequests: 0,
      huggingfaceRequests: 0,
      fallbackRequests: 0,
      successRate: 0,
      averageResponseTime: 0,
      costSavings: 0,
      errors: []
    };
    this.startTime = Date.now();
  }
}

// Singleton instance for global use
export const rolloutManager = new RolloutManager();

// Predefined rollout phases
export const ROLLOUT_PHASES = {
  PILOT: { huggingfacePercentage: 10, description: 'Initial pilot with 10% traffic' },
  GRADUAL: { huggingfacePercentage: 25, description: 'Gradual increase to 25% traffic' },
  MODERATE: { huggingfacePercentage: 50, description: 'Moderate rollout with 50% traffic' },
  MAJORITY: { huggingfacePercentage: 75, description: 'Majority traffic on Hugging Face' },
  FULL: { huggingfacePercentage: 100, description: 'Full rollout - all traffic on Hugging Face' }
};

/**
 * Helper function to advance to next rollout phase
 */
export function advanceRolloutPhase() {
  const currentPercentage = rolloutManager.getMetrics().config.huggingfacePercentage;
  
  const phases = Object.values(ROLLOUT_PHASES);
  const currentPhaseIndex = phases.findIndex(phase => phase.huggingfacePercentage === currentPercentage);
  
  if (currentPhaseIndex >= 0 && currentPhaseIndex < phases.length - 1) {
    const nextPhase = phases[currentPhaseIndex + 1];
    rolloutManager.updateRolloutPercentage(nextPhase.huggingfacePercentage);
    console.log(`🚀 Advanced to next phase: ${nextPhase.description}`);
    return nextPhase;
  }
  
  return null;
}
