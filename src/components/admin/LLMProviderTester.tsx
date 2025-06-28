import React, { useState } from 'react';
import { LLMProvider } from '../../services/llmAdapter';
import { compareProviders, educationalTestCases, LLMTestCase, LLMTestResult } from '../../utils/llmTesting';

interface ProviderScore {
  total: number;
  count: number;
  avg: number;
}

interface TestSummary {
  totalTests: number;
  totalProviders: number;
  providerScores: Record<string, ProviderScore>;
  bestProvider: string;
  bestScore: number;
  detailedResults: LLMTestResult[];
}

const LLMProviderTester: React.FC = () => {
  const [selectedProviders, setSelectedProviders] = useState<LLMProvider[]>([LLMProvider.OPENAI]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [testResults, setTestResults] = useState<TestSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleProviderToggle = (provider: LLMProvider) => {
    setSelectedProviders(prev => {
      if (prev.includes(provider)) {
        return prev.filter(p => p !== provider);
      } else {
        return [...prev, provider];
      }
    });
  };

  const runTests = async () => {
    if (selectedProviders.length === 0) {
      setError('Please select at least one provider to test');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const results = await compareProviders(selectedProviders, educationalTestCases);
      setTestResults(results as TestSummary);
    } catch (err) {
      setError(`Error running tests: ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error('Test error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4">
      <h1 className="text-2xl font-bold mb-6">LLM Provider Testing</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Select Providers to Test</h2>
        
        <div className="mb-6">
          <p className="font-medium mb-2">Available Providers</p>
          <div className="flex flex-wrap gap-4">
            {Object.values(LLMProvider).map((provider) => (
              <label key={provider} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedProviders.includes(provider)}
                  onChange={() => handleProviderToggle(provider)}
                  className="form-checkbox h-5 w-5 text-blue-600"
                />
                <span>{provider.charAt(0).toUpperCase() + provider.slice(1)}</span>
              </label>
            ))}
          </div>
        </div>
        
        <button
          onClick={runTests}
          disabled={isLoading || selectedProviders.length === 0}
          className={`px-4 py-2 rounded-md font-medium flex items-center ${isLoading || selectedProviders.length === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Running Tests...
            </>
          ) : 'Run Comparison Tests'}
        </button>
        
        {error && (
          <p className="text-red-600 mt-4">{error}</p>
        )}
      </div>
      
      {testResults && (
        <>
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Test Summary</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-blue-100 p-4 rounded-lg">
                <p className="text-sm font-medium mb-1">Best Provider</p>
                <p className="text-xl font-bold">
                  {testResults.bestProvider.toUpperCase()} (Score: {testResults.bestScore.toFixed(2)})
                </p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium mb-1">Test Stats</p>
                <p>
                  {testResults.totalTests} tests across {testResults.totalProviders} providers
                </p>
              </div>
            </div>
            
            <div className="overflow-x-auto mt-6">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Provider</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Average Score</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tests Run</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.entries(testResults.providerScores).map(([provider, score]) => (
                    <tr key={provider} className={provider === testResults.bestProvider ? 'bg-green-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {provider.toUpperCase()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                        {score.avg.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                        {score.count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Detailed Results</h2>
            
            {testResults.detailedResults.map((result, index) => (
              <div key={index} className="mb-6 p-4 border border-gray-200 rounded-lg">
                <h3 className="font-semibold mb-2">
                  Test: {result.testCase.name}
                </h3>
                <p className="text-sm text-gray-600 mb-2">
                  Provider: {result.provider.toUpperCase()} | 
                  Score: {result.score !== undefined ? result.score : 'N/A'} | 
                  Response Time: {(result.responseTime / 1000).toFixed(2)}s
                </p>
                
                {result.evaluationNotes && (
                  <p className="text-sm text-gray-600 mb-2">
                    Notes: {result.evaluationNotes}
                  </p>
                )}
                
                <p className="font-medium mt-3 mb-1">Prompt:</p>
                <div className="bg-gray-50 p-3 rounded mb-3 text-sm">
                  {result.testCase.prompt}
                </div>
                
                <p className="font-medium mb-1">Response:</p>
                <div className="bg-gray-50 p-3 rounded text-sm max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {result.output}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default LLMProviderTester;
