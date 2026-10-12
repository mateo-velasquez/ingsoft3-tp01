import subscriptionService from './subscriptionService.js';

export const MIN_RATING = 1;
export const MAX_RATING = 5;
export const MIN_RATINGS_TO_SHOW = 3;

// A subscription with rating 0 means "not rated yet", so only 1 to 5 counts.
export const isValidRating = (rating) => {
  if (typeof rating !== 'number' || Number.isNaN(rating)) {
    return false;
  }
  return rating >= MIN_RATING && rating <= MAX_RATING;
};

export const calculateAverage = (ratings) => {
  const valid = ratings.filter(isValidRating);
  if (valid.length === 0) {
    return null;
  }
  const sum = valid.reduce((total, rating) => total + rating, 0);
  return Math.round((sum / valid.length) * 10) / 10;
};

export const countByStars = (ratings) => {
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  ratings.forEach((rating) => {
    if (isValidRating(rating)) {
      counts[Math.round(rating)] += 1;
    }
  });
  return counts;
};

export const getRatingLabel = (average) => {
  if (average === null) {
    return 'Sin valoraciones';
  }
  if (average >= 4.5) {
    return 'Excelente';
  }
  if (average >= 4) {
    return 'Muy bueno';
  }
  if (average >= 3) {
    return 'Bueno';
  }
  if (average >= 2) {
    return 'Regular';
  }
  return 'Malo';
};

export const hasEnoughRatings = (ratings, minimum = MIN_RATINGS_TO_SHOW) => {
  return ratings.filter(isValidRating).length >= minimum;
};

export const summarizeRatings = (ratings) => {
  const average = calculateAverage(ratings);
  return {
    average,
    total: ratings.filter(isValidRating).length,
    distribution: countByStars(ratings),
    label: getRatingLabel(average),
    visible: hasEnoughRatings(ratings),
  };
};

export const getCourseRatingSummary = async (courseId) => {
  const subscriptions = await subscriptionService.getSubscriptionsByCourseId(courseId);
  const ratings = (subscriptions || []).map((subscription) => subscription.individual_rating);
  return summarizeRatings(ratings);
};

export default {
  isValidRating,
  calculateAverage,
  countByStars,
  getRatingLabel,
  hasEnoughRatings,
  summarizeRatings,
  getCourseRatingSummary,
};
