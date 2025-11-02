import api from './api';

export const bookingService = {
  createBooking: async (bookingData) => {
    try {
      const response = await api.post('/bookings/book', bookingData);
      return response.data;
    } catch (error) {
      // Normalize and annotate error for easier debugging in UI
      console.error('Create booking API error:', error.response || error);
      // Map 403 to a clearer client message
      if (error.response?.status === 403) {
        const err = new Error('Forbidden: you do not have permission to book rides. Ensure you are logged in as a passenger.');
        err.original = error;
        throw err;
      }
      // If server provided a message use it, otherwise include status/data for debugging
      const serverMessage = error.response?.data?.message || error.response?.data || error.message;
      const err = new Error(serverMessage);
      err.original = error;
      throw err;
    }
  },

  getMyBookings: async () => {
    const response = await api.get('/bookings/my-bookings');
    return response.data;
  },

  getDriverBookings: async () => {
    const response = await api.get('/bookings/driver-bookings');
    return response.data;
  },

  // getBookingById removed because it wasn't used in the frontend; add back if needed later.

  cancelBooking: async (id) => {
    const response = await api.patch(`/bookings/${id}/cancel`);
    return response.data;
  },
};
