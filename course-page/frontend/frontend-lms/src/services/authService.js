import { apiRequest } from './api.js';

export const authService = {
  // Login user
  login: async (email, password) => {
    const response = await apiRequest('/login', {
      method: 'POST',
      body: JSON.stringify({
        email,
        userpassword: password,
      }),
    });
    
    if (response.token) {
      localStorage.setItem('token', response.token);
      // Only store user data if it's not undefined
      if (response.user && response.user !== undefined) {
        localStorage.setItem('user', JSON.stringify(response.user));
      }
    }
    
    return response;
  },

  // Logout user
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Also clear any potential invalid data
    if (localStorage.getItem('user') === 'undefined') {
      localStorage.removeItem('user');
    }
  },

  // Get current user from localStorage
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    
    // Check if userStr is null, undefined, or the string "undefined"
    if (!userStr || userStr === 'undefined' || userStr === 'null') {
      return null;
    }
    
    try {
      return JSON.parse(userStr);
    } catch (error) {
      console.error('Error parsing user data from localStorage:', error);
      // Clean up invalid data
      localStorage.removeItem('user');
      return null;
    }
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    const token = localStorage.getItem('token');
    return !!token;
  },

  // Check if user is admin
  isAdmin: () => {
    const user = authService.getCurrentUser();
    return user && user.accesslevel === 'admin';
  },

  // Check if user is teacher
  isTeacher: async () => {
    const user = authService.getCurrentUser();
    if (!user || !user.id) {
      return false;
    }
    
    try {
      const response = await apiRequest(`/user/${user.id}/is-teacher`);
      return response.is_teacher || false;
    } catch (error) {
      console.error('Error checking teacher status:', error);
      return false;
    }
  },

  // Get auth token
  getToken: () => {
    return localStorage.getItem('token');
  },
};

export default authService;
