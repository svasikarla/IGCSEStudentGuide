import React from 'react';
import { Link } from 'react-router-dom';

const HomePage: React.FC = () => {
  return (
    <div>
      <section className="py-12">
        <div className="text-center mb-12">
          <h1 className="mb-4">IGCSE Student Guide</h1>
          <p className="text-xl text-neutral-600 max-w-3xl mx-auto">
            A comprehensive learning platform designed specifically for IGCSE Grade 9-10 students.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-primary-600 mb-4">
              <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z"></path>
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Structured Content</h3>
            <p className="text-neutral-600 mb-4">
              Access well-organized subject materials aligned with the IGCSE curriculum.
            </p>
            <Link to="/subjects" className="text-primary-600 hover:text-primary-700 font-medium">
              Browse Subjects →
            </Link>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-primary-600 mb-4">
              <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"></path>
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Interactive Flashcards</h3>
            <p className="text-neutral-600 mb-4">
              Study with interactive flashcards using spaced repetition for better retention.
            </p>
            <Link to="/flashcards" className="text-primary-600 hover:text-primary-700 font-medium">
              Try Flashcards →
            </Link>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-primary-600 mb-4">
              <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"></path>
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Practice Quizzes</h3>
            <p className="text-neutral-600 mb-4">
              Test your knowledge with quizzes designed to reinforce learning and identify gaps.
            </p>
            <Link to="/quizzes" className="text-primary-600 hover:text-primary-700 font-medium">
              Take Quizzes →
            </Link>
          </div>
        </div>
      </section>
      
      <section className="py-12 bg-primary-50 -mx-4 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <h2>Ready to Start Learning?</h2>
            <p className="text-lg text-neutral-600 mt-2">
              Join thousands of IGCSE students improving their grades with our platform.
            </p>
          </div>
          <div className="text-center">
            <Link 
              to="/login" 
              className="inline-block bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-6 rounded-md transition duration-150 ease-in-out"
            >
              Sign In to Get Started
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;