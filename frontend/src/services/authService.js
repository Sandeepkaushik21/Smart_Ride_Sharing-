import api from './api';

export const authService = {
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data));
    }
    return response.data;
  },

  changePassword: async (currentPassword, newPassword) => {
    const response = await api.post('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    // Update user data after password change
    const user = authService.getCurrentUser();
    if (user) {
      user.isFirstLogin = false;
      localStorage.setItem('user', JSON.stringify(user));
    }
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },

  hasRole: (role) => {
    const user = authService.getCurrentUser();
    if (!user || !user.roles) return false;
    const roleName = role.startsWith('ROLE_') ? role : `ROLE_${role.toUpperCase()}`;
    return user.roles.includes(roleName);
  },

  forgotPassword: async (email) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (email, tempPassword, newPassword) => {
    const response = await api.post('/auth/reset-password', {
      email,
      tempPassword,
      newPassword,
    });
    return response.data;
  },

  googleLogin: async (idToken, role = null) => {
    const response = await api.post('/auth/google-login', { 
      idToken,
      role 
    });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data));
    }
    return response.data;
  },
};

