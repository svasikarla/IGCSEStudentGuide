import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

type AuthTab = 'login' | 'register' | 'reset';

const AuthForm: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AuthTab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const { signIn, signUp, resetPassword, isLoading } = useAuth();

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validatePassword = (password: string) => {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
    return re.test(password);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    
    if (!validateEmail(email)) {
      setMessage({ text: 'Please enter a valid email address', type: 'error' });
      return;
    }

    if (!password) {
      setMessage({ text: 'Please enter your password', type: 'error' });
      return;
    }
    
    const { error } = await signIn(email, password);
    
    if (error) {
      setMessage({ text: error.message, type: 'error' });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    
    if (!validateEmail(email)) {
      setMessage({ text: 'Please enter a valid email address', type: 'error' });
      return;
    }

    if (!validatePassword(password)) {
      setMessage({ 
        text: 'Password must be at least 8 characters with at least one uppercase letter, one lowercase letter, and one number', 
        type: 'error' 
      });
      return;
    }

    if (password !== confirmPassword) {
      setMessage({ text: 'Passwords do not match', type: 'error' });
      return;
    }
    
    const { error } = await signUp(email, password);
    
    if (error) {
      setMessage({ text: error.message, type: 'error' });
    } else {
      setMessage({ 
        text: 'Registration successful! Please check your email to confirm your account.', 
        type: 'success' 
      });
      setActiveTab('login');
      setPassword('');
      setConfirmPassword('');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    
    if (!validateEmail(email)) {
      setMessage({ text: 'Please enter a valid email address', type: 'error' });
      return;
    }
    
    const { error } = await resetPassword(email);
    
    if (error) {
      setMessage({ text: error.message, type: 'error' });
    } else {
      setMessage({ 
        text: 'Password reset email sent! Please check your inbox.', 
        type: 'success' 
      });
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
      {/* Tabs */}
      <div className="flex border-b border-neutral-200 mb-6">
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === 'login'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-neutral-500 hover:text-neutral-700'
          }`}
          onClick={() => setActiveTab('login')}
        >
          Sign In
        </button>
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === 'register'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-neutral-500 hover:text-neutral-700'
          }`}
          onClick={() => setActiveTab('register')}
        >
          Register
        </button>
      </div>
      
      {message && (
        <div className={`p-4 mb-6 rounded-md ${
          message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {message.text}
        </div>
      )}
      
      {activeTab === 'login' && (
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label htmlFor="login-email" className="block text-sm font-medium text-neutral-700 mb-2">
              Email Address
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="your.email@example.com"
              disabled={isLoading}
            />
          </div>
          
          <div className="mb-6">
            <label htmlFor="login-password" className="block text-sm font-medium text-neutral-700 mb-2">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="••••••••"
              disabled={isLoading}
            />
            <div className="flex justify-end mt-2">
              <button
                type="button"
                className="text-sm text-primary-600 hover:text-primary-800"
                onClick={() => setActiveTab('reset')}
              >
                Forgot password?
              </button>
            </div>
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out disabled:opacity-70"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      )}
      
      {activeTab === 'register' && (
        <form onSubmit={handleRegister}>
          <div className="mb-4">
            <label htmlFor="register-email" className="block text-sm font-medium text-neutral-700 mb-2">
              Email Address
            </label>
            <input
              id="register-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="your.email@example.com"
              disabled={isLoading}
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="register-password" className="block text-sm font-medium text-neutral-700 mb-2">
              Password
            </label>
            <input
              id="register-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="••••••••"
              disabled={isLoading}
            />
            <p className="text-xs text-neutral-500 mt-1">
              Must be at least 8 characters with 1 uppercase, 1 lowercase letter and 1 number.
            </p>
          </div>
          
          <div className="mb-6">
            <label htmlFor="confirm-password" className="block text-sm font-medium text-neutral-700 mb-2">
              Confirm Password
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="••••••••"
              disabled={isLoading}
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out disabled:opacity-70"
          >
            {isLoading ? 'Registering...' : 'Register'}
          </button>
        </form>
      )}
      
      {activeTab === 'reset' && (
        <form onSubmit={handleResetPassword}>
          <div className="mb-6">
            <label htmlFor="reset-email" className="block text-sm font-medium text-neutral-700 mb-2">
              Email Address
            </label>
            <input
              id="reset-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="your.email@example.com"
              disabled={isLoading}
            />
            <p className="text-xs text-neutral-500 mt-1">
              We'll send you an email with instructions to reset your password.
            </p>
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out disabled:opacity-70"
          >
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </button>
          
          <button
            type="button"
            className="w-full mt-4 text-primary-600 hover:text-primary-800 font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
            onClick={() => setActiveTab('login')}
          >
            Back to Sign In
          </button>
        </form>
      )}
    </div>
  );
};

export default AuthForm;
