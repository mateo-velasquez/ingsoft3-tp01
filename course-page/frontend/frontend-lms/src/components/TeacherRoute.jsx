import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

const TeacherRoute = ({ children }) => {
  const { isAuthenticated, isLoading, isTeacher } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isTeacher()) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default TeacherRoute;
