import { useEffect, useState } from 'react';
import { X, Loader, CheckCircle, AlertCircle } from 'lucide-react';

const RazorpayPaymentModal = ({ isOpen, onClose, orderData, onPaymentSuccess, onPaymentFailure }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen && orderData) {
            loadRazorpayScript();
        }
    }, [isOpen, orderData]);

    const loadRazorpayScript = () => {
        return new Promise((resolve) => {
            if (window.Razorpay) {
                resolve(true);
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve(true);
            script.onerror = () => {
                setError('Failed to load Razorpay. Please try again.');
                resolve(false);
            };
            document.body.appendChild(script);
        });
    };

    const handlePayment = async () => {
        if (!orderData || !orderData.orderId || !orderData.keyId) {
            setError('Invalid order data. Please try again.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Load Razorpay script if not loaded
            await loadRazorpayScript();

            if (!window.Razorpay) {
                throw new Error('Razorpay SDK failed to load');
            }

            // Always use backend-calculated rupee amount for display → convert to paise for checkout
            let amountInPaise = 0;
            if (orderData.amountInRupees !== undefined && orderData.amountInRupees !== null) {
                const ru = Number(orderData.amountInRupees);
                if (Number.isFinite(ru)) {
                    amountInPaise = Math.round(ru * 100);
                }
            }
            // Fallback to order amount (paise) only when amountInRupees is not present
            if ((!amountInPaise || amountInPaise <= 0) && orderData.amount !== undefined && orderData.amount !== null) {
                const n = Number(orderData.amount);
                if (Number.isFinite(n)) amountInPaise = Math.round(n);
            }
            if (!amountInPaise || amountInPaise <= 0) {
                throw new Error('Invalid payment amount');
            }

            const options = {
                key: orderData.keyId,
                amount: amountInPaise, // Amount in paise (must be integer)
                currency: orderData.currency || 'INR',
                name: 'Ride Sharing App',
                description: `Payment for Booking #${orderData.bookingId}`,
                order_id: orderData.orderId,
                // Allow all major methods inside Razorpay (user chooses there)
                method: {
                    upi: true,
                    card: true,
                    netbanking: true,
                    wallet: true
                },
                handler: async function (response) {
                    try {
                        console.log('Payment successful response:', response);
                        // Verify payment with backend
                        await onPaymentSuccess({
                            razorpayOrderId: response.razorpay_order_id,
                            razorpayPaymentId: response.razorpay_payment_id,
                            razorpaySignature: response.razorpay_signature,
                            bookingId: orderData.bookingId
                        });
                    } catch (error) {
                        console.error('Payment verification error:', error);
                        setError(error.message || 'Payment verification failed');
                        onPaymentFailure(error);
                    } finally {
                        setLoading(false);
                    }
                },
                prefill: {
                    // name: user.name,
                    // email: user.email,
                    // contact: user.phone
                },
                theme: {
                    color: '#6366f1'
                },
                modal: {
                    ondismiss: function() {
                        if (!loading) {
                            onClose();
                        }
                    }
                }
            };

            const razorpay = new window.Razorpay(options);
            
            razorpay.on('payment.failed', function (response) {
                console.error('Razorpay payment failed:', response);
                const errorMessage = response.error?.description || response.error?.reason || 'Payment failed. Please try again.';
                setError(errorMessage);
                setLoading(false);
                onPaymentFailure(new Error(errorMessage));
            });

            razorpay.on('payment.authorized', function (response) {
                console.log('Payment authorized:', response);
            });

            razorpay.open();
            
            console.log('Razorpay payment initiated:', {
                orderId: orderData.orderId,
                amount: amountInPaise,
                keyId: orderData.keyId
            });
        } catch (error) {
            console.error('Payment error:', error);
            setError(error.message || 'Failed to initiate payment. Please try again.');
            setLoading(false);
            onPaymentFailure(error);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4 rounded-t-xl flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">Payment</h2>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1 transition-all disabled:opacity-50"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="px-6 py-6">
                    {/* Amount Display */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <div className="text-sm text-gray-600 mb-1">Total Amount</div>
                        <div className="text-2xl font-bold text-green-600">
                            ₹{(orderData?.amountInRupees !== undefined ? Number(orderData.amountInRupees) : ((orderData?.amount || 0) / 100)).toFixed(2)}
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-400 p-3 mb-4 rounded">
                            <div className="flex items-center">
                                <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Payment Instructions */}
                    <div className="bg-blue-50 border-l-4 border-blue-400 p-3 mb-4 rounded">
                        <p className="text-sm text-blue-800 mb-2">
                            You will be redirected to Razorpay secure payment gateway to complete your payment.
                        </p>
                        <p className="text-xs text-blue-700">
                            💳 Pay using UPI, Cards, Net Banking, or Wallets in the next step.
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold transition-all disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handlePayment}
                            disabled={loading || !orderData}
                            className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 font-semibold shadow-lg transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                        >
                            {loading ? (
                                <>
                                    <Loader className="h-5 w-5 animate-spin" />
                                    <span>Processing...</span>
                                </>
                            ) : (
                                <>
                                    <span>Pay ₹{(orderData?.amountInRupees !== undefined ? Number(orderData.amountInRupees) : ((orderData?.amount || 0) / 100)).toFixed(2)}</span>
                                </>
                            )}
                        </button>
                    </div>

                    {/* Security Notice */}
                    <div className="mt-4 text-xs text-gray-500 text-center">
                        <p>🔒 Secure payment powered by Razorpay</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RazorpayPaymentModal;
