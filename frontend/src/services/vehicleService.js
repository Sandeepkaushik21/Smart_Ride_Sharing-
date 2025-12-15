import api from './api';

export const vehicleService = {
  getMyVehicles: async () => {
    const response = await api.get('/vehicles/my');
    return response.data;
  },

  createVehicle: async (data) => {
    const response = await api.post('/vehicles', data);
    return response.data;
  },

  updateVehicle: async (id, data) => {
    const response = await api.put(`/vehicles/${id}`, data);
    return response.data;
  },
};





