import api from './api';

export const userService = {
  getProfile: async () => {
    const response = await api.get('/user/profile');
    return response.data;
  },

  updateProfile: async (userData) => {
    const response = await api.put('/user/profile', userData);
    return response.data;
  },

  saveMasterVehicleDetails: async (masterDetails) => {
    const response = await api.post('/user/master-vehicle-details', masterDetails);
    return response.data;
  },

  getMasterVehicleDetails: async () => {
    const response = await api.get('/user/master-vehicle-details');
    return response.data;
  },
};

