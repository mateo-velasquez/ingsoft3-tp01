import { apiRequest } from './api.js';

export const subscriptionService = {
  // Get all subscriptions (admin only)
  getSubscriptions: async () => {
    return await apiRequest('/subscriptions');
  },

  // Get subscription by ID
  getSubscriptionById: async (id) => {
    return await apiRequest(`/subscription/${id}`);
  },

  // Get subscriptions by user ID
  getSubscriptionsByUserId: async (userId) => {
    return await apiRequest(`/user/subscriptions/${userId}`);
  },

  // Get subscriptions by course ID
  getSubscriptionsByCourseId: async (courseId) => {
    return await apiRequest(`/course/subscriptions/${courseId}`);
  },

  // Create new subscription (enroll in course)
  createSubscription: async (subscriptionData) => {
    return await apiRequest('/user/subscription', {
      method: 'POST',
      body: JSON.stringify(subscriptionData),
    });
  },

  // Update rating for subscription
  updateRating: async (subscriptionId, rating) => {
    return await apiRequest(`/course/subscription/rating/${subscriptionId}`, {
      method: 'PUT',
      body: JSON.stringify({ 
        id: subscriptionId,
        individual_rating: parseFloat(rating)
      }),
    });
  },

  // Update comment for subscription
  updateComment: async (subscriptionId, comment) => {
    return await apiRequest(`/course/subscription/comment/${subscriptionId}`, {
      method: 'PUT',
      body: JSON.stringify({ 
        id: subscriptionId,
        comment: comment 
      }),
    });
  },
};

export default subscriptionService;
