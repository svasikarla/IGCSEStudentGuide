import React from 'react';
import IntelligentSearchInterface from '../components/search/IntelligentSearchInterface';

/**
 * Study Assistant Page
 * 
 * Provides an AI-powered study assistant interface for students
 * to ask questions and get intelligent, contextual answers.
 */
const StudyAssistantPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Page Header */}
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-neutral-900">
                  AI Study Assistant
                </h1>
                <p className="mt-1 text-sm text-neutral-600">
                  Get instant, intelligent answers to your study questions using AI-powered contextual search
                </p>
              </div>
              
              {/* Feature Badges */}
              <div className="hidden md:flex items-center space-x-3">
                <div className="flex items-center space-x-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>AI-Powered</span>
                </div>
                <div className="flex items-center space-x-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Contextual</span>
                </div>
                <div className="flex items-center space-x-2 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>IGCSE Aligned</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Chat Interface */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 h-[calc(100vh-200px)]">
              <IntelligentSearchInterface />
            </div>
          </div>

          {/* Sidebar with Tips and Features */}
          <div className="lg:col-span-1 space-y-6">
            {/* How it Works */}
            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
              <h3 className="text-lg font-semibold text-neutral-900 mb-4">
                How it Works
              </h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-sm font-medium">
                    1
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-neutral-900">Ask Your Question</h4>
                    <p className="text-xs text-neutral-600 mt-1">
                      Type any study-related question in natural language
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-sm font-medium">
                    2
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-neutral-900">AI Searches Content</h4>
                    <p className="text-xs text-neutral-600 mt-1">
                      Our AI finds the most relevant curriculum content
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-sm font-medium">
                    3
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-neutral-900">Get Smart Answer</h4>
                    <p className="text-xs text-neutral-600 mt-1">
                      Receive a detailed, contextual explanation with sources
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tips for Better Results */}
            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
              <h3 className="text-lg font-semibold text-neutral-900 mb-4">
                Tips for Better Results
              </h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm text-neutral-700">
                    Be specific about the topic or concept you're asking about
                  </p>
                </div>
                
                <div className="flex items-start space-x-2">
                  <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm text-neutral-700">
                    Select your subject for more targeted answers
                  </p>
                </div>
                
                <div className="flex items-start space-x-2">
                  <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm text-neutral-700">
                    Ask follow-up questions to dive deeper into topics
                  </p>
                </div>
                
                <div className="flex items-start space-x-2">
                  <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm text-neutral-700">
                    Use natural language - ask as you would ask a teacher
                  </p>
                </div>
              </div>
            </div>

            {/* Example Questions */}
            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
              <h3 className="text-lg font-semibold text-neutral-900 mb-4">
                Example Questions
              </h3>
              <div className="space-y-2">
                <div className="p-3 bg-neutral-50 rounded-lg">
                  <p className="text-sm text-neutral-700">
                    "How do I solve quadratic equations using the quadratic formula?"
                  </p>
                </div>
                
                <div className="p-3 bg-neutral-50 rounded-lg">
                  <p className="text-sm text-neutral-700">
                    "What's the difference between mitosis and meiosis?"
                  </p>
                </div>
                
                <div className="p-3 bg-neutral-50 rounded-lg">
                  <p className="text-sm text-neutral-700">
                    "Explain Newton's second law with examples"
                  </p>
                </div>
                
                <div className="p-3 bg-neutral-50 rounded-lg">
                  <p className="text-sm text-neutral-700">
                    "How do ionic bonds form in chemistry?"
                  </p>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
              <h3 className="text-lg font-semibold text-neutral-900 mb-4">
                Features
              </h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-neutral-900">Smart Answers</h4>
                    <p className="text-xs text-neutral-600">AI-powered contextual responses</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-neutral-900">Source Citations</h4>
                    <p className="text-xs text-neutral-600">See where answers come from</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-neutral-900">Conversation Memory</h4>
                    <p className="text-xs text-neutral-600">Remembers context of your chat</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-neutral-900">Instant Responses</h4>
                    <p className="text-xs text-neutral-600">Fast, real-time answers</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudyAssistantPage;
