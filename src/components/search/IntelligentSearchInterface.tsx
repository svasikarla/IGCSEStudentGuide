import React, { useState, useRef, useEffect } from 'react';
import { useRAG } from '../../hooks/useRAG';
import { useSemanticSearch } from '../../hooks/useSemanticSearch';
import { useSubjects } from '../../hooks/useSubjects';
import { LLMProvider } from '../../services/llmService';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: Array<{
    title: string;
    content_type: string;
    similarity: number;
    url?: string;
  }>;
  confidence?: number;
}

/**
 * Intelligent Search Interface for Students
 * 
 * Provides an AI-powered Q&A interface that can answer questions
 * using contextual information from the curriculum.
 */
const IntelligentSearchInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [isTyping, setIsTyping] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Hooks
  const { subjects } = useSubjects();
  const { 
    askQuestion, 
    generateStudySuggestions, 
    loading, 
    error, 
    conversationId,
    setConversationContext 
  } = useRAG({
    autoGenerateConversationId: true,
    provider: LLMProvider.OPENAI,
    temperature: 0.7,
    maxTokens: 1000,
    includeSourceCitations: true
  });

  const { search, results: searchResults } = useSemanticSearch({
    autoSearch: false,
    cacheResults: true
  });

  // Sample questions for different subjects
  const sampleQuestions = {
    'Mathematics': [
      'How do I solve quadratic equations?',
      'What is the difference between mean, median, and mode?',
      'Explain the Pythagorean theorem with examples',
      'How do I calculate the area of a circle?'
    ],
    'Physics': [
      'What are Newton\'s three laws of motion?',
      'How does electricity work?',
      'Explain the difference between speed and velocity',
      'What is electromagnetic radiation?'
    ],
    'Chemistry': [
      'What is the periodic table and how is it organized?',
      'Explain the difference between ionic and covalent bonds',
      'How do chemical reactions work?',
      'What are acids and bases?'
    ],
    'Biology': [
      'How does photosynthesis work?',
      'What is DNA and how does it work?',
      'Explain the process of cell division',
      'How does the human digestive system work?'
    ]
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Update conversation context when subject changes
  useEffect(() => {
    if (selectedSubject) {
      setConversationContext({ subjectId: selectedSubject });
    }
  }, [selectedSubject, setConversationContext]);

  // Welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        type: 'assistant',
        content: `Hello! I'm your AI study assistant. I can help you understand IGCSE concepts, answer questions, and provide explanations based on your curriculum. 

Feel free to ask me anything about your subjects, and I'll provide detailed, contextual answers using the most relevant educational content.

What would you like to learn about today?`,
        timestamp: new Date()
      }]);
    }
  }, [messages.length]);

  /**
   * Handle sending a message
   */
  const handleSendMessage = async () => {
    if (!inputValue.trim() || loading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    setShowSuggestions(false);

    try {
      const response = await askQuestion(inputValue.trim(), {
        subjectId: selectedSubject || undefined,
        matchCount: 5,
        similarityThreshold: 0.6
      });

      if (response) {
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          type: 'assistant',
          content: response.answer,
          timestamp: new Date(),
          sources: response.sources,
          confidence: response.confidence
        };

        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error('No response received');
      }

    } catch (err) {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        type: 'assistant',
        content: 'I apologize, but I encountered an error while processing your question. Please try rephrasing your question or try again later.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  /**
   * Handle suggestion click
   */
  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    inputRef.current?.focus();
  };

  /**
   * Handle key press in input
   */
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  /**
   * Get current subject suggestions
   */
  const getCurrentSuggestions = () => {
    if (!selectedSubject) return [];
    
    const subjectName = subjects.find(s => s.id === selectedSubject)?.name;
    return subjectName ? sampleQuestions[subjectName as keyof typeof sampleQuestions] || [] : [];
  };

  return (
    <div className="flex flex-col h-full bg-neutral-50">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-neutral-900">
              AI Study Assistant
            </h1>
            <p className="text-sm text-neutral-600">
              Ask questions and get intelligent, contextual answers
            </p>
          </div>
          
          {/* Subject Filter */}
          <div className="flex items-center space-x-3">
            <label className="text-sm font-medium text-neutral-700">
              Subject:
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="px-3 py-1 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Subjects</option>
              {subjects.map(subject => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-3xl rounded-lg p-4 ${
                message.type === 'user'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white border border-neutral-200 text-neutral-900'
              }`}
            >
              <div className="whitespace-pre-wrap">{message.content}</div>
              
              {/* Sources and Confidence for Assistant Messages */}
              {message.type === 'assistant' && (message.sources || message.confidence) && (
                <div className="mt-3 pt-3 border-t border-neutral-200">
                  {message.confidence && (
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-xs text-neutral-500">Confidence:</span>
                      <div className="flex items-center space-x-1">
                        <div className="w-16 h-2 bg-neutral-200 rounded-full">
                          <div
                            className={`h-2 rounded-full ${
                              message.confidence >= 80 ? 'bg-green-500' :
                              message.confidence >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${message.confidence}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-neutral-600">{message.confidence}%</span>
                      </div>
                    </div>
                  )}
                  
                  {message.sources && message.sources.length > 0 && (
                    <div>
                      <span className="text-xs text-neutral-500 block mb-1">Sources:</span>
                      <div className="space-y-1">
                        {message.sources.slice(0, 3).map((source, index) => (
                          <div key={index} className="text-xs text-neutral-600">
                            <span className="font-medium">{source.title}</span>
                            <span className="text-neutral-400 ml-2">
                              ({source.content_type}, {Math.round(source.similarity * 100)}% match)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              <div className="text-xs text-neutral-400 mt-2">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {(loading || isTyping) && (
          <div className="flex justify-start">
            <div className="bg-white border border-neutral-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-sm text-neutral-500">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}

        {/* Suggestions */}
        {showSuggestions && messages.length <= 1 && (
          <div className="bg-white rounded-lg border border-neutral-200 p-4">
            <h3 className="text-sm font-medium text-neutral-900 mb-3">
              {selectedSubject ? 'Try asking about:' : 'Popular questions:'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {getCurrentSuggestions().slice(0, 4).map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="text-left p-3 text-sm text-neutral-700 hover:bg-neutral-50 rounded-lg border border-neutral-200 hover:border-primary-300 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-neutral-200 p-4">
        <div className="flex items-end space-x-3">
          <div className="flex-1">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask a question about your studies..."
              className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              disabled={loading}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || loading}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
            <span>Send</span>
          </button>
        </div>
        
        {error && (
          <div className="mt-2 text-sm text-red-600">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default IntelligentSearchInterface;
