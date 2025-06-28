import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * AdminRoute component
 * 
 * Protects routes that should only be accessible to admin users
 * Redirects to unauthorized page if the user is not an admin
 */
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading, isAdmin } = useAuth();
  
  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Redirect to unauthorized page if not an admin
  if (!isAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }
  
  // User is authenticated and is an admin, render the protected content
  return <>{children}</>;
};

export default AdminRoute;
