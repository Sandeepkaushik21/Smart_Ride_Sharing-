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

  getMyBookings: async (params = {}) => {
    // Support pagination params { page, size, ... }
    const response = await api.get('/bookings/my-bookings', { params });
    return response.data;
  },

  // Support server-side pagination for driver bookings.
  // Accepts an optional params object { page, size, sort, ... } and forwards it as query params.
  getDriverBookings: async (params = {}) => {
    // If the backend doesn't support pagination this will still work (server will ignore params)
    const response = await api.get('/bookings/driver-bookings', { params });
    return response.data;
  },

  // getBookingById removed because it wasn't used in the frontend; add back if needed later.

  cancelBooking: async (id) => {
    const response = await api.patch(`/bookings/${id}/cancel`);
    return response.data;
  },

  getPendingBookings: async (params = {}) => {
    // Support pagination params { page, size, ... }
    const response = await api.get('/bookings/pending-bookings', { params });
    return response.data;
  },

  acceptBooking: async (id) => {
    const response = await api.patch(`/bookings/${id}/accept`);
    return response.data;
  },

  declineBooking: async (id) => {
    const response = await api.patch(`/bookings/${id}/decline`);
    return response.data;
  },

  getRideHistory: async (params = {}) => {
    // Support pagination params { page, size, ... }
    const response = await api.get('/bookings/history', { params });
    return response.data;
  },

  acceptRescheduledRide: async (bookingId) => {
    const response = await api.patch(`/bookings/${bookingId}/accept-reschedule`);
    return response.data;
  },

  cancelRescheduledRide: async (bookingId) => {
    const response = await api.patch(`/bookings/${bookingId}/cancel-reschedule`);
    return response.data;
  },

  completeBooking: async (bookingId) => {
    const response = await api.patch(`/bookings/${bookingId}/complete`);
    return response.data;
  },
};
