import api from './api';

export const adminService = {
  getDashboardStats: async () => {
    const response = await api.get('/admin/dashboard/stats');
    return response.data;
  },

  getPendingDrivers: async () => {
    const response = await api.get('/admin/drivers/pending');
    return response.data;
  },

  approveDriver: async (driverId) => {
    const response = await api.post(`/admin/drivers/${driverId}/approve`);
    return response.data;
  },

  rejectDriver: async (driverId) => {
    const response = await api.post(`/admin/drivers/${driverId}/reject`);
    return response.data;
  },

  getAllDrivers: async () => {
    const response = await api.get('/admin/drivers/all');
    return response.data;
  },

  getAllPassengers: async () => {
    const response = await api.get('/admin/passengers/all');
    return response.data;
  },
};

