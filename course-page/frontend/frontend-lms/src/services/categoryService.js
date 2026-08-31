import { apiRequest } from './api.js';

export const categoryService = {
  // Get all categories
  getCategories: async () => {
    return await apiRequest('/categories');
  },

  // Get category by ID
  getCategoryById: async (id) => {
    return await apiRequest(`/category/${id}`);
  },

  // Create new category (admin only)
  createCategory: async (categoryData) => {
    return await apiRequest('/category', {
      method: 'POST',
      body: JSON.stringify(categoryData),
    });
  },
};

export default categoryService;
