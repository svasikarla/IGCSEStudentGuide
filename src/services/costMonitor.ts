/**
 * Cost Monitoring Service for LLM Usage
 * 
 * Tracks and analyzes costs across different LLM providers to validate
 * the projected 99%+ cost savings from Hugging Face integration.
 */

import { LLMProvider } from './llmService';

export interface CostEntry {
  id: string;
  timestamp: number;
  provider: LLMProvider;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
  actualCost?: number;
  generationType: 'quiz' | 'exam' | 'content' | 'other';
  success: boolean;
}

export interface CostSummary {
  totalCost: number;
  totalGenerations: number;
  averageCostPerGeneration: number;
  costByProvider: Record<LLMProvider, number>;
  costByType: Record<string, number>;
  tokenUsage: {
    total: number;
    input: number;
    output: number;
  };
  projectedMonthlyCost: number;
  projectedAnnualCost: number;
}

export interface CostComparison {
  huggingFaceCost: number;
  traditionalCost: number;
  savings: number;
  savingsPercentage: number;
  projectedAnnualSavings: number;
}

export class CostMonitor {
  private entries: CostEntry[] = [];
  private readonly COST_PER_TOKEN: Record<LLMProvider, { input: number; output: number }> = {
    [LLMProvider.OPENAI]: { input: 0.00015, output: 0.0006 }, // GPT-4o-mini per 1K tokens
    [LLMProvider.GOOGLE]: { input: 0.000075, output: 0.0003 }, // Gemini 1.5 Flash per 1K tokens
    [LLMProvider.ANTHROPIC]: { input: 0.00025, output: 0.00125 }, // Claude 3 Haiku per 1K tokens
    [LLMProvider.HUGGINGFACE]: { input: 0.00000005, output: 0.00000005 }, // Llama 3.1 8B per 1K tokens
    [LLMProvider.AZURE]: { input: 0.00015, output: 0.0006 }, // Same as OpenAI
    [LLMProvider.CUSTOM]: { input: 0.0001, output: 0.0005 } // Estimated
  };

  /**
   * Record a new cost entry
   */
  recordUsage(
    provider: LLMProvider,
    model: string,
    inputTokens: number,
    outputTokens: number,
    generationType: CostEntry['generationType'],
    success: boolean = true
  ): string {
    const id = this.generateId();
    const totalTokens = inputTokens + outputTokens;
    const estimatedCost = this.calculateCost(provider, inputTokens, outputTokens);

    const entry: CostEntry = {
      id,
      timestamp: Date.now(),
      provider,
      model,
      inputTokens,
      outputTokens,
      totalTokens,
      estimatedCost,
      generationType,
      success
    };

    this.entries.push(entry);
    
    // Keep only last 10,000 entries to prevent memory issues
    if (this.entries.length > 10000) {
      this.entries = this.entries.slice(-10000);
    }

    return id;
  }

  /**
   * Calculate cost based on provider and token usage
   */
  private calculateCost(provider: LLMProvider, inputTokens: number, outputTokens: number): number {
    const rates = this.COST_PER_TOKEN[provider];
    if (!rates) {
      console.warn(`No cost rates defined for provider: ${provider}`);
      return 0;
    }

    // Convert to cost per 1K tokens
    const inputCost = (inputTokens / 1000) * rates.input;
    const outputCost = (outputTokens / 1000) * rates.output;
    
    return inputCost + outputCost;
  }

  /**
   * Get cost summary for a time period
   */
  getCostSummary(startTime?: number, endTime?: number): CostSummary {
    const filteredEntries = this.filterEntriesByTime(startTime, endTime);
    
    const totalCost = filteredEntries.reduce((sum, entry) => sum + entry.estimatedCost, 0);
    const totalGenerations = filteredEntries.length;
    const averageCostPerGeneration = totalGenerations > 0 ? totalCost / totalGenerations : 0;

    // Cost by provider
    const costByProvider = {} as Record<LLMProvider, number>;
    Object.values(LLMProvider).forEach(provider => {
      costByProvider[provider] = filteredEntries
        .filter(entry => entry.provider === provider)
        .reduce((sum, entry) => sum + entry.estimatedCost, 0);
    });

    // Cost by type
    const costByType: Record<string, number> = {};
    filteredEntries.forEach(entry => {
      costByType[entry.generationType] = (costByType[entry.generationType] || 0) + entry.estimatedCost;
    });

    // Token usage
    const tokenUsage = {
      total: filteredEntries.reduce((sum, entry) => sum + entry.totalTokens, 0),
      input: filteredEntries.reduce((sum, entry) => sum + entry.inputTokens, 0),
      output: filteredEntries.reduce((sum, entry) => sum + entry.outputTokens, 0)
    };

    // Projections (based on current usage patterns)
    const timeSpanDays = startTime && endTime ? (endTime - startTime) / (1000 * 60 * 60 * 24) : 30;
    const dailyAverage = totalCost / Math.max(timeSpanDays, 1);
    const projectedMonthlyCost = dailyAverage * 30;
    const projectedAnnualCost = dailyAverage * 365;

    return {
      totalCost,
      totalGenerations,
      averageCostPerGeneration,
      costByProvider,
      costByType,
      tokenUsage,
      projectedMonthlyCost,
      projectedAnnualCost
    };
  }

  /**
   * Compare Hugging Face costs vs traditional providers
   */
  getCostComparison(startTime?: number, endTime?: number): CostComparison {
    const summary = this.getCostSummary(startTime, endTime);
    
    const huggingFaceCost = summary.costByProvider[LLMProvider.HUGGINGFACE] || 0;
    const traditionalCost = 
      (summary.costByProvider[LLMProvider.OPENAI] || 0) +
      (summary.costByProvider[LLMProvider.GOOGLE] || 0) +
      (summary.costByProvider[LLMProvider.ANTHROPIC] || 0);

    const totalCost = huggingFaceCost + traditionalCost;
    
    // Calculate what the cost would have been if all generations used traditional providers
    const huggingFaceEntries = this.filterEntriesByTime(startTime, endTime)
      .filter(entry => entry.provider === LLMProvider.HUGGINGFACE);
    
    const hypotheticalTraditionalCost = huggingFaceEntries.reduce((sum, entry) => {
      // Calculate what this would have cost with OpenAI (baseline)
      return sum + this.calculateCost(LLMProvider.OPENAI, entry.inputTokens, entry.outputTokens);
    }, 0);

    const actualSavings = hypotheticalTraditionalCost - huggingFaceCost;
    const savingsPercentage = hypotheticalTraditionalCost > 0 
      ? (actualSavings / hypotheticalTraditionalCost) * 100 
      : 0;

    // Project annual savings
    const timeSpanDays = startTime && endTime ? (endTime - startTime) / (1000 * 60 * 60 * 24) : 30;
    const dailySavings = actualSavings / Math.max(timeSpanDays, 1);
    const projectedAnnualSavings = dailySavings * 365;

    return {
      huggingFaceCost,
      traditionalCost: hypotheticalTraditionalCost,
      savings: actualSavings,
      savingsPercentage,
      projectedAnnualSavings
    };
  }

  /**
   * Generate cost report
   */
  generateCostReport(days: number = 30): string {
    const endTime = Date.now();
    const startTime = endTime - (days * 24 * 60 * 60 * 1000);
    
    const summary = this.getCostSummary(startTime, endTime);
    const comparison = this.getCostComparison(startTime, endTime);

    return `
💰 Cost Monitoring Report (Last ${days} days)
=============================================

📊 Usage Summary:
- Total Generations: ${summary.totalGenerations}
- Total Cost: $${summary.totalCost.toFixed(6)}
- Average Cost/Generation: $${summary.averageCostPerGeneration.toFixed(6)}

🔄 Token Usage:
- Total Tokens: ${summary.tokenUsage.total.toLocaleString()}
- Input Tokens: ${summary.tokenUsage.input.toLocaleString()}
- Output Tokens: ${summary.tokenUsage.output.toLocaleString()}

🏷️ Cost by Provider:
${Object.entries(summary.costByProvider)
  .filter(([_, cost]) => cost > 0)
  .map(([provider, cost]) => `- ${provider}: $${cost.toFixed(6)}`)
  .join('\n')}

📝 Cost by Type:
${Object.entries(summary.costByType)
  .map(([type, cost]) => `- ${type}: $${cost.toFixed(6)}`)
  .join('\n')}

💡 Hugging Face Savings:
- HF Cost: $${comparison.huggingFaceCost.toFixed(6)}
- Traditional Cost (equivalent): $${comparison.traditionalCost.toFixed(6)}
- Actual Savings: $${comparison.savings.toFixed(6)}
- Savings Percentage: ${comparison.savingsPercentage.toFixed(1)}%

📈 Projections:
- Monthly Cost: $${summary.projectedMonthlyCost.toFixed(2)}
- Annual Cost: $${summary.projectedAnnualCost.toFixed(2)}
- Annual Savings: $${comparison.projectedAnnualSavings.toFixed(2)}

${comparison.savingsPercentage > 90 ? '🎉 Excellent! Achieving 90%+ cost savings target!' : 
  comparison.savingsPercentage > 50 ? '✅ Good cost savings achieved' : 
  '⚠️  Cost savings below expectations - review usage patterns'}
    `.trim();
  }

  /**
   * Get entries filtered by time range
   */
  private filterEntriesByTime(startTime?: number, endTime?: number): CostEntry[] {
    return this.entries.filter(entry => {
      if (startTime && entry.timestamp < startTime) return false;
      if (endTime && entry.timestamp > endTime) return false;
      return true;
    });
  }

  /**
   * Generate unique ID for entries
   */
  private generateId(): string {
    return `cost_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Export cost data for analysis
   */
  exportData(startTime?: number, endTime?: number): CostEntry[] {
    return this.filterEntriesByTime(startTime, endTime);
  }

  /**
   * Clear old entries (for maintenance)
   */
  clearOldEntries(olderThanDays: number = 90) {
    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    const initialCount = this.entries.length;
    this.entries = this.entries.filter(entry => entry.timestamp >= cutoffTime);
    const removedCount = initialCount - this.entries.length;
    
    console.log(`🧹 Cleared ${removedCount} cost entries older than ${olderThanDays} days`);
  }
}

// Singleton instance for global use
export const costMonitor = new CostMonitor();
