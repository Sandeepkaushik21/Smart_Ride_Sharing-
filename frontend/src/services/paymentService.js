import api from './api';

export const paymentService = {
  /**
   * Create Razorpay order for payment
   * @param {Object} orderData - Order data
   * @param {number} orderData.amount - Amount to be paid
   * @param {number} orderData.bookingId - Booking ID
   * @returns {Promise<Object>} Order response with orderId and keyId
   */
  createOrder: async (orderData) => {
    try {
      const response = await api.post('/payments/create-order', orderData);
      return response.data;
    } catch (error) {
      console.error('Create order error:', error.response || error);
      const serverMessage = error.response?.data?.message || error.response?.data || error.message;
      const err = new Error(serverMessage);
      err.original = error;
      throw err;
    }
  },

  /**
   * Verify Razorpay payment
   * @param {Object} verificationData - Payment verification data
   * @param {string} verificationData.razorpayOrderId - Razorpay order ID
   * @param {string} verificationData.razorpayPaymentId - Razorpay payment ID
   * @param {string} verificationData.razorpaySignature - Razorpay signature
   * @param {number} verificationData.bookingId - Booking ID
   * @returns {Promise<Object>} Verification response
   */
  verifyPayment: async (verificationData) => {
    try {
      const response = await api.post('/payments/verify', verificationData);
      return response.data;
    } catch (error) {
      console.error('Payment verification error:', error.response || error);
      const serverMessage = error.response?.data?.message || error.response?.data || error.message;
      const err = new Error(serverMessage);
      err.original = error;
      throw err;
    }
  },

  /**
   * Get passenger payment history
   * @returns {Promise<Array>} Payment history
   */
  getPassengerPaymentHistory: async () => {
    try {
      const response = await api.get('/payments/passenger/history');
      return response.data;
    } catch (error) {
      console.error('Get payment history error:', error.response || error);
      throw error;
    }
  },

  /**
   * Get driver payment history
   * @returns {Promise<Array>} Payment history
   */
  getDriverPaymentHistory: async () => {
    try {
      const response = await api.get('/payments/driver/history');
      return response.data;
    } catch (error) {
      console.error('Get payment history error:', error.response || error);
      throw error;
    }
  },

  /**
   * Get driver wallet balance and earnings
   * @returns {Promise<Object>} Wallet data
   */
  getDriverWallet: async () => {
    try {
      const response = await api.get('/payments/driver/wallet');
      return response.data;
    } catch (error) {
      console.error('Get wallet error:', error.response || error);
      throw error;
    }
  },

  /**
   * Transfer payment to driver after ride completion
   * @param {number} bookingId - Booking ID
   * @returns {Promise<Object>} Transfer response
   */
  transferToDriver: async (bookingId) => {
    try {
      const response = await api.post(`/payments/driver/transfer/${bookingId}`);
      return response.data;
    } catch (error) {
      console.error('Transfer payment error:', error.response || error);
      throw error;
    }
  }
};

