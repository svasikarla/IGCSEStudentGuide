import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Navbar: React.FC = () => {
  const { user, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close profile menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileMenuRef]);

  return (
    <nav className="bg-primary-600 text-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <Link to="/" className="font-display text-xl font-bold">
            IGCSE Guide
          </Link>
          
          {/* Mobile menu button */}
          <button 
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
          
          {/* Desktop menu */}
          <div className="hidden md:flex items-center space-x-6">
            <Link to="/subjects" className="hover:text-primary-100">Subjects</Link>
            <Link to="/flashcards" className="hover:text-primary-100">Flashcards</Link>
            <Link to="/quizzes" className="hover:text-primary-100">Quizzes</Link>
            <Link to="/exam-papers" className="hover:text-primary-100">Exam Papers</Link>
            {user ? (
              <div className="relative" ref={profileMenuRef}>
                <button 
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center space-x-2 bg-primary-700 hover:bg-primary-800 px-4 py-2 rounded-md"
                >
                  <div className="w-8 h-8 rounded-full bg-primary-400 flex items-center justify-center">
                    {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="max-w-[120px] truncate">{user.email}</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isProfileMenuOpen ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                  </svg>
                </button>
                
                {isProfileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                    <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-200">
                      Signed in as<br />
                      <span className="font-medium">{user.email}</span>
                    </div>
                    <Link 
                      to="/dashboard" 
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsProfileMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <Link 
                      to="/admin" 
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsProfileMenuOpen(false)}
                    >
                      Content Admin
                    </Link>
                    <Link 
                      to="/profile" 
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsProfileMenuOpen(false)}
                    >
                      Profile Settings
                    </Link>
                    <button 
                      onClick={() => {
                        signOut();
                        setIsProfileMenuOpen(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link 
                to="/login" 
                className="bg-secondary-500 hover:bg-secondary-600 px-4 py-2 rounded-md"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
        
        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 space-y-3">
            <Link to="/subjects" className="block hover:text-primary-100">Subjects</Link>
            <Link to="/flashcards" className="block hover:text-primary-100">Flashcards</Link>
            <Link to="/quizzes" className="block hover:text-primary-100">Quizzes</Link>
            <Link to="/exam-papers" className="block hover:text-primary-100">Exam Papers</Link>
            {user ? (
              <>
                <div className="py-2 px-4 border-t border-primary-500 mb-2">
                  <p className="text-sm opacity-80">Signed in as:</p>
                  <p className="font-medium truncate">{user.email}</p>
                </div>
                <Link to="/dashboard" className="block hover:text-primary-100 py-2">Dashboard</Link>
                <Link to="/admin" className="block hover:text-primary-100 py-2">Content Admin</Link>
                <Link to="/profile" className="block hover:text-primary-100 py-2">Profile Settings</Link>
                <button 
                  onClick={signOut}
                  className="block w-full text-left bg-primary-700 hover:bg-primary-800 px-4 py-2 rounded-md mt-2"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link 
                to="/login" 
                className="block w-full text-center bg-secondary-500 hover:bg-secondary-600 px-4 py-2 rounded-md"
              >
                Sign In
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;