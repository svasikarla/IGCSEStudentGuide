import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  return (
    <footer className="bg-neutral-800 text-neutral-100 py-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">IGCSE Student Guide</h3>
            <p className="text-neutral-300">
              A comprehensive learning platform for IGCSE Grade 9-10 students.
            </p>
          </div>
          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li><Link to="/subjects" className="hover:text-white">Subjects</Link></li>
              <li><Link to="/flashcards" className="hover:text-white">Flashcards</Link></li>
              <li><Link to="/quizzes" className="hover:text-white">Quizzes</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-semibold mb-4">Contact</h4>
            <p className="text-neutral-300">
              Have questions or feedback? <br />
              <a href="mailto:support@igcseguide.com" className="text-secondary-400 hover:text-secondary-300">
                support@igcseguide.com
              </a>
            </p>
          </div>
        </div>
        <div className="border-t border-neutral-700 mt-8 pt-4 text-center text-neutral-400">
          <p>&copy; {new Date().getFullYear()} IGCSE Student Guide. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;