import React from 'react';
import AuthForm from '../components/auth/AuthForm';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const LoginPage: React.FC = () => {
  const { user, isLoading } = useAuth();
  
  // Redirect if already logged in
  if (user && !isLoading) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return (
    <div className="max-w-4xl mx-auto py-12">
      <h1 className="text-center mb-8">Welcome to IGCSE Student Guide</h1>
      <div className="bg-white rounded-lg shadow-lg p-6 md:p-8">
        <div className="md:flex">
          <div className="md:w-1/2 md:pr-8 mb-6 md:mb-0">
            <h2 className="text-xl font-semibold mb-4">Your Learning Journey Starts Here</h2>
            <p className="text-neutral-600 mb-4">
              Access comprehensive study materials, interactive flashcards, and quizzes designed specifically for IGCSE Grade 9-10 students.
            </p>
            <ul className="space-y-2 text-neutral-600">
              <li className="flex items-center">
                <svg className="w-5 h-5 text-secondary-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Structured subject content
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 text-secondary-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Interactive flashcards
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 text-secondary-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Practice quizzes
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 text-secondary-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Progress tracking
              </li>
            </ul>
          </div>
          <div className="md:w-1/2">
            <AuthForm />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;