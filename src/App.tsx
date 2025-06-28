import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ReviewProvider } from './contexts/ReviewContext'; // Import ReviewProvider
import AppShell from './components/layout/AppShell';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import HomePage from './pages/HomePage';
import AuthCallback from './pages/AuthCallback';
import SubjectsPage from './pages/SubjectsPage';
import TopicsPage from './pages/TopicsPage';
import TopicContentPage from './pages/TopicContentPage';
import FlashcardsPage from './pages/FlashcardsPage';
import QuizzesPage from './pages/QuizzesPage';
import ExamPaperPage from './pages/ExamPaperPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import AdminRoute from './components/AdminRoute';
import ReviewPage from './pages/ReviewPage'; // Import ReviewPage

// Protected route wrapper component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <ReviewProvider>
          <Routes>
            <Route path="/" element={<AppShell><HomePage /></AppShell>} />
            <Route path="/login" element={<AppShell><LoginPage /></AppShell>} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            
            {/* Protected routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <AppShell><DashboardPage /></AppShell>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <AppShell><ProfilePage /></AppShell>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/subjects" 
              element={
                <AppShell><SubjectsPage /></AppShell>
              } 
            />
            <Route
              path="/subjects/:subjectId"
              element={
                <ProtectedRoute>
                  <AppShell><TopicsPage /></AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/subjects/:subjectId/topics/:topicId"
              element={
                <ProtectedRoute>
                  <AppShell><TopicContentPage /></AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/flashcards"
              element={
                <ProtectedRoute>
                  <AppShell><FlashcardsPage /></AppShell>
                </ProtectedRoute>
              }
            />
            <Route 
              path="/quizzes" 
              element={
                <ProtectedRoute>
                  <AppShell><QuizzesPage /></AppShell>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/exam-papers" 
              element={
                <ProtectedRoute>
                  <AppShell><ExamPaperPage /></AppShell>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin" 
              element={
                <AdminRoute>
                  <AppShell><AdminPage /></AppShell>
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/review" 
              element={
                <AdminRoute>
                  <AppShell><ReviewPage /></AppShell>
                </AdminRoute>
              } 
            />
            <Route 
              path="/unauthorized" 
              element={
                <AppShell><UnauthorizedPage /></AppShell>
              } 
            />
          </Routes>
        </ReviewProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
