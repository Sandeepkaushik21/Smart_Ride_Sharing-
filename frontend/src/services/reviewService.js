import api from './api';

export const reviewService = {
  submitReview: async (bookingId, rating, comment) => {
    const response = await api.post('/reviews/submit', {
      bookingId,
      rating,
      comment,
    });
    return response.data;
  },

  hasReviewed: async (bookingId) => {
    const response = await api.get(`/reviews/booking/${bookingId}/has-reviewed`);
    return response.data.hasReviewed;
  },

  getAverageRating: async (driverId) => {
    const response = await api.get(`/reviews/driver/${driverId}/average-rating`);
    return response.data.averageRating;
  },
};

