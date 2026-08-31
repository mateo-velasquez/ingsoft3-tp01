import { apiRequest } from './api.js';

export const userService = {
  // Get all users (admin only)
  getUsers: async () => {
    return await apiRequest('/users');
  },

  // Get user by ID
  getUserById: async (id) => {
    return await apiRequest(`/user/${id}`);
  },

  // Create new user
  createUser: async (userData) => {
    return await apiRequest('/user', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },
};

export default userService;
