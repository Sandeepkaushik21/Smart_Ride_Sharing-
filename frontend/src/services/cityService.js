import api from './api';

export const cityService = {
  getSuggestions: async (query) => {
    const response = await api.get('/public/cities/suggestions', {
      params: { query },
    });
    return response.data;
  },
};

