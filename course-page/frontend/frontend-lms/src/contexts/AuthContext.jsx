import { createContext, useState, useEffect, useContext } from 'react';
import authService from '../services/authService.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isTeacherUser, setIsTeacherUser] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      // Clean up any invalid localStorage data first
      const userStr = localStorage.getItem('user');
      if (userStr === 'undefined' || userStr === 'null') {
        localStorage.removeItem('user');
        localStorage.removeItem('token'); // Also remove token if user data is invalid
      }
      
      const currentUser = authService.getCurrentUser();
      const authenticated = authService.isAuthenticated();
      
      setUser(currentUser);
      setIsAuthenticated(authenticated);
      
      // Check if user is teacher
      if (authenticated && currentUser) {
        const teacherStatus = await authService.isTeacher();
        setIsTeacherUser(teacherStatus);
      }
      
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const response = await authService.login(email, password);
    setUser(response.user);
    setIsAuthenticated(true);
    
    // Check teacher status after login
    const teacherStatus = await authService.isTeacher();
    setIsTeacherUser(teacherStatus);
    
    return response;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setIsAuthenticated(false);
    setIsTeacherUser(false);
  };

  const isAdmin = () => {
    return authService.isAdmin();
  };

  const isTeacher = () => {
    return isTeacherUser;
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    isAdmin,
    isTeacher,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
