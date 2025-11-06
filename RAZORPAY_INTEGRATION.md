# Razorpay Payment Integration - Setup Guide

## Overview
This application now integrates with Razorpay for real payment processing. Passengers pay online when booking rides, and drivers receive payments in their wallet after ride completion.

## Features Implemented

### 1. Payment Integration
- ✅ Razorpay payment gateway integration
- ✅ Passengers pay online when booking
- ✅ **UPI payment support** (Google Pay, PhonePe, Paytm, BHIM, etc.)
- ✅ Card payment support (Credit/Debit cards)
- ✅ Net Banking support
- ✅ Wallet payment support
- ✅ Payment verification and signature validation
- ✅ Transaction history stored in database
- ✅ Driver wallet system for earnings

### 2. Transaction History
- ✅ Payment history for passengers
- ✅ Payment history for drivers
- ✅ Driver wallet balance and earnings tracking
- ✅ Payment status tracking (PENDING, SUCCESS, FAILED)

### 3. Driver Wallet System
- ✅ Drivers receive payment after ride completion
- ✅ Wallet balance tracking
- ✅ Pending vs completed earnings
- ✅ Transfer payment to driver wallet

## Setup Instructions

### 1. Get Razorpay Keys

1. Sign up at https://razorpay.com
2. Go to Dashboard → Settings → API Keys
3. Copy your **Key ID** and **Key Secret**
4. For testing, use **Test Keys** from the dashboard

### 2. Configure Backend

Edit `src/main/resources/application.properties`:

```properties
# Razorpay Configuration
razorpay.key.id=your_razorpay_key_id_here
razorpay.key.secret=your_razorpay_key_secret_here
```

### 3. Database Setup

The `payments` table will be automatically created by Hibernate. The schema includes:
- Payment records with Razorpay order/payment IDs
- Payment status tracking
- Driver payment status (PENDING, PROCESSING, COMPLETED)
- Transaction history

### 4. Frontend Setup

The Razorpay checkout script is loaded automatically when the payment modal opens. No additional setup needed.

## Payment Flow

### Passenger Payment Flow:
1. Passenger searches for rides
2. Passenger selects ride and number of seats
3. Booking is created with PENDING status
4. Razorpay order is created
5. Payment modal opens with Razorpay checkout
6. Passenger can choose from multiple payment methods:
   - **UPI** (Google Pay, PhonePe, Paytm, BHIM, etc.)
   - Credit/Debit Cards
   - Net Banking
   - Wallets
7. Passenger completes payment using their preferred method
8. Payment is verified on backend
9. Booking status changes to CONFIRMED
10. Email notifications sent

### Driver Payment Flow:
1. Driver completes a ride
2. Booking status changes to COMPLETED
3. Admin/Driver can transfer payment to driver wallet
4. Driver wallet balance increases
5. Payment record updated with driver payment status

## API Endpoints

### Payment Endpoints:
- `POST /api/payments/create-order` - Create Razorpay order
- `POST /api/payments/verify` - Verify payment
- `GET /api/payments/passenger/history` - Get passenger payment history
- `GET /api/payments/driver/history` - Get driver payment history
- `GET /api/payments/driver/wallet` - Get driver wallet balance
- `POST /api/payments/driver/transfer/{bookingId}` - Transfer payment to driver

## Testing

### Test Cards (Razorpay Test Mode):
- Card Number: `4111 1111 1111 1111`
- CVV: Any 3 digits (e.g., `123`)
- Expiry: Any future date (e.g., `12/25`)
- Name: Any name

### Test UPI:
- **UPI ID**: Use any valid UPI ID format (e.g., `test@paytm`, `test@ybl`, `test@upi`)
- Payment will be automatically approved in test mode
- Supported UPI apps: Google Pay, PhonePe, Paytm, BHIM, and all other UPI apps
- **Note**: UPI payments are enabled by default in the payment modal

## Important Notes

1. **Test Mode**: Always use test keys during development
2. **Production**: Switch to live keys only when ready for production
3. **Security**: Never commit API keys to version control
4. **Webhook**: Consider setting up Razorpay webhooks for production use

## Transaction History

Both passengers and drivers can view their payment history:
- Payment amount and date
- Payment status
- Booking details
- Transaction IDs

## Driver Wallet

Drivers can:
- View wallet balance
- See pending earnings
- See total earnings
- Receive payments after ride completion

## Troubleshooting

### Payment Not Working:
1. Check Razorpay keys are correct
2. Verify keys are for correct environment (test/live)
3. Check network connectivity
4. Check browser console for errors

### Signature Verification Failed:
- Ensure backend has correct Razorpay secret key
- Check that payment IDs match

### Payment Not Appearing in History:
- Check database for payment records
- Verify payment status in Razorpay dashboard
- Check backend logs for errors

## Next Steps

1. Set up Razorpay account and get keys
2. Update `application.properties` with your keys
3. Test payment flow with test cards
4. Set up webhooks for production (optional)
5. Monitor transactions in Razorpay dashboard

