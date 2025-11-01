import api from './api';

export const rideService = {
  postRide: async (rideData) => {
    const response = await api.post('/rides/post', rideData);
    return response.data;
  },

  searchRides: async (params) => {
    const response = await api.get('/rides/search', { params });
    return response.data;
  },

  getMyRides: async () => {
    const response = await api.get('/rides/my-rides');
    return response.data;
  },

  getRideById: async (id) => {
    const response = await api.get(`/rides/${id}`);
    return response.data;
  },

  cancelRide: async (id) => {
    const response = await api.patch(`/rides/${id}/cancel`);
    return response.data;
  },
};

