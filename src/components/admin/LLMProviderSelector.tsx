import React, { useState, useEffect } from 'react';
import { LLMProvider } from '../../services/llmAdapter';

interface LLMProviderInfo {
  id: string;
  name: string;
  available: boolean;
  models: string[];
  setupUrl?: string;
  note?: string;
}

interface LLMProviderSelectorProps {
  selectedProvider: LLMProvider;
  selectedModel: string;
  onProviderChange: (provider: LLMProvider) => void;
  onModelChange: (model: string) => void;
  disabled?: boolean;
  className?: string;
}

const LLMProviderSelector: React.FC<LLMProviderSelectorProps> = ({
  selectedProvider,
  selectedModel,
  onProviderChange,
  onModelChange,
  disabled = false,
  className = ''
}) => {
  const [providers, setProviders] = useState<LLMProviderInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch available providers and models
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:3001/api/llm/providers');
        
        if (!response.ok) {
          throw new Error('Failed to fetch providers');
        }
        
        const providersData = await response.json();
        setProviders(providersData);
        setError(null);
      } catch (err) {
        console.error('Error fetching providers:', err);
        setError('Failed to load providers');
        // Fallback to default providers
        setProviders([
          {
            id: 'openai',
            name: 'OpenAI',
            available: true,
            models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo']
          },
          {
            id: 'google',
            name: 'Google Gemini',
            available: false,
            models: []
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchProviders();
  }, []);

  // Get available models for the selected provider
  const getAvailableModels = () => {
    const provider = providers.find(p => p.id === selectedProvider);
    return provider?.models || [];
  };

  // Handle provider change
  const handleProviderChange = (providerId: string) => {
    const provider = providerId as LLMProvider;
    onProviderChange(provider);
    
    // Auto-select the first available model for the new provider
    const providerInfo = providers.find(p => p.id === providerId);
    if (providerInfo && providerInfo.models.length > 0) {
      onModelChange(providerInfo.models[0]);
    }
  };

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-16 mb-2"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {error && (
        <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded p-2">
          {error} - Using fallback configuration
        </div>
      )}
      
      {/* Provider Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          LLM Provider:
        </label>
        <select
          value={selectedProvider}
          onChange={(e) => handleProviderChange(e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          {providers.map((provider) => (
            <option 
              key={provider.id} 
              value={provider.id}
              disabled={!provider.available}
            >
              {provider.name} {!provider.available ? '(Unavailable)' : ''}
            </option>
          ))}
        </select>
        {providers.find(p => p.id === selectedProvider && !p.available) && (
          <div className="mt-1 text-sm text-red-600">
            <p>This provider is not available. Please check your API configuration.</p>
            {providers.find(p => p.id === selectedProvider)?.note && (
              <p className="mt-1">{providers.find(p => p.id === selectedProvider)?.note}</p>
            )}
            {providers.find(p => p.id === selectedProvider)?.setupUrl && (
              <p className="mt-1">
                Get your API key: {' '}
                <a
                  href={providers.find(p => p.id === selectedProvider)?.setupUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  {providers.find(p => p.id === selectedProvider)?.setupUrl}
                </a>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Model Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Model:
        </label>
        <select
          value={selectedModel}
          onChange={(e) => onModelChange(e.target.value)}
          disabled={disabled || getAvailableModels().length === 0}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          {getAvailableModels().map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>
        {getAvailableModels().length === 0 && (
          <p className="mt-1 text-sm text-red-600">
            No models available for the selected provider.
          </p>
        )}
      </div>

      {/* Provider Info */}
      <div className="text-xs text-gray-500">
        {selectedProvider === LLMProvider.OPENAI && (
          <p>✅ OpenAI models are optimized for educational content generation.</p>
        )}
        {selectedProvider === LLMProvider.GOOGLE && providers.find(p => p.id === 'google')?.available && (
          <p>✅ Google Gemini models offer fast and efficient text generation.</p>
        )}
        {selectedProvider === LLMProvider.GOOGLE && !providers.find(p => p.id === 'google')?.available && (
          <p>⚠️ Google Gemini requires API key configuration. Will fallback to OpenAI if generation fails.</p>
        )}
      </div>
    </div>
  );
};

export default LLMProviderSelector;
