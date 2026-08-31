import { apiRequest } from './api.js';

export const courseService = {
  // Get all courses
  getCourses: async () => {
    return await apiRequest('/courses');
  },

  // Get course by ID
  getCourseById: async (id) => {
    return await apiRequest(`/course/${id}`);
  },

  // Search courses
  searchCourses: async (query, categories = []) => {
    let url = `/course/search?q=${encodeURIComponent(query)}`;
    if (categories.length > 0) {
      url += `&categories=${categories.join(',')}`;
    }
    return await apiRequest(url);
  },

  // Create new course (admin only)
  createCourse: async (courseData) => {
    return await apiRequest('/course', {
      method: 'POST',
      body: JSON.stringify(courseData),
    });
  },

  // Update course (admin only)
  updateCourse: async (id, courseData) => {
    return await apiRequest(`/course/${id}`, {
      method: 'PUT',
      body: JSON.stringify(courseData),
    });
  },

  // Delete course (admin only)
  deleteCourse: async (id) => {
    return await apiRequest(`/course/${id}`, {
      method: 'DELETE',
    });
  },
};

export default courseService;
