# Payment - Internal Design & Integration (Razorpay)

This document explains how payments are implemented in this project (frontend + backend), the data contracts, the sequence of calls, environment variables, testing tips, and common troubleshooting steps.

Target audience: frontend developers, backend developers, and maintainers.

---

## High-level overview

- The project uses Razorpay for payment processing.
- Frontend triggers order creation via the backend (`POST /payments/create-order`) which calls the Razorpay Orders API using server-side credentials.
- The backend returns the Razorpay order id and the public key id to the frontend.
- The frontend opens the Razorpay checkout modal (using the returned order id + key id). After payment completion Razorpay returns payment id and signature to the frontend.
- Frontend posts these details to the backend verification endpoint (`POST /payments/verify`). The backend verifies the signature using the Razorpay secret and records the payment status in the system.
- The system maintains separate endpoints for passenger/driver histories and a driver wallet. Transfers to drivers are either recorded internally or executed via Razorpay Payouts/Transfers depending on backend implementation.


## Files & components (frontend)

- `src/services/paymentService.js` - primary frontend service used by UI components. Exposes:
  - `createOrder(orderData)`
  - `verifyPayment(verificationData)`
  - `getPassengerPaymentHistory()`
  - `getDriverPaymentHistory()`
  - `getDriverWallet()`
  - `transferToDriver(bookingId)`

- `src/components/RazorpayPaymentModal.jsx` - UI component that opens the Razorpay checkout modal. It uses `paymentService.createOrder` then constructs `Razorpay` options and invokes the checkout. On success it calls `paymentService.verifyPayment`.


## Files & endpoints (backend)

Common backend endpoints used by the frontend (paths in this project):

- `POST /payments/create-order`
  - Input: { amount, bookingId }
  - Action: Creates a Razorpay order (server uses secret key + Razorpay SDK), persists a pending payment record linked to bookingId, returns order id and key id.
  - Output (example): { orderId: "order_XXXX", keyId: "rzp_test_XXXX", amount: 10000, currency: "INR" }

- `POST /payments/verify`
  - Input: { razorpayOrderId, razorpayPaymentId, razorpaySignature, bookingId }
  - Action: Verifies the signature using HMAC_SHA256 with the Razorpay secret. If valid, marks payment captured/complete for booking and stores payment metadata.
  - Output (example): { success: true, paymentId: "pay_XXXX", bookingId }

- `GET /payments/passenger/history`
  - Output: Array of payments for the authenticated passenger.

- `GET /payments/driver/history`
  - Output: Array of payouts/earnings for the authenticated driver.

- `GET /payments/driver/wallet`
  - Output: Driver wallet object such as { balance: 12345, totalEarnings: 23456, pendingPayouts: [...] }

- `POST /payments/driver/transfer/:bookingId`
  - Action: Triggers a transfer to a driver for a completed booking (may be internal wallet debit or actual Razorpay Payout/Transfer depending on server).


## Data shapes (examples)

Create order request (frontend -> server):

```json
{ "amount": 10000, "bookingId": 123 }
```

Create order response (server -> frontend):

```json
{ "orderId": "order_9A33XWu170gUtm", "keyId": "rzp_test_1DP5mmOlF5G5ag", "amount": 10000, "currency": "INR" }
```

Razorpay checkout success (Razorpay -> frontend):

```json
{
  "razorpay_payment_id": "pay_29QQoUBi66xm2f",
  "razorpay_order_id": "order_9A33XWu170gUtm",
  "razorpay_signature": "77ff..."
}
```

Verification request (frontend -> server):

```json
{
  "razorpayOrderId": "order_9A33XWu170gUtm",
  "razorpayPaymentId": "pay_29QQoUBi66xm2f",
  "razorpaySignature": "77ff...",
  "bookingId": 123
}
```

Verification response (server):

```json
{ "success": true, "paymentId": "pay_29QQoUBi66xm2f", "bookingId": 123 }
```


## Signature verification (server-side)

- To verify an authorized payment you need to recreate the signature on the server and compare it to the one Razorpay provided.
- Algorithm: HMAC_SHA256(razorpayOrderId + "|" + razorpayPaymentId, RAZORPAY_SECRET)
- Compare the hex digest against `razorpay_signature` value.

Pseudocode (Node.js):

```js
const crypto = require('crypto');
const generatedSignature = crypto
  .createHmac('sha256', process.env.RAZORPAY_SECRET)
  .update(orderId + '|' + paymentId)
  .digest('hex');

if (generatedSignature === receivedSignature) {
  // mark payment as success
} else {
  // invalid signature
}
```


## Environment variables (server)

- RAZORPAY_KEY_ID - public key / test key id used in frontend checkout
- RAZORPAY_KEY_SECRET - secret key used on server to create orders and verify signatures
- Optionally any webhook secret if server verifies webhooks


## Frontend flow (detailed)

1. User initiates payment from a booking screen.
2. Frontend calls `paymentService.createOrder({ amount, bookingId })`.
3. Backend creates a Razorpay order and returns orderId + keyId.
4. Frontend builds Razorpay options object (key: keyId, order_id: orderId, amount, currency, name, description, prefill, handler).
5. Open Razorpay checkout (new Razorpay(options)).
6. On the checkout handler success callback, frontend calls `paymentService.verifyPayment(...)` to send paymentId, orderId, signature to backend.
7. Backend verifies signature, updates payment record and booking status.
8. Frontend shows success/failure to user and refreshes booking/payment data.


## Driver transfers & wallet

- The backend exposes a driver wallet endpoint to view balance and earnings.
- When a ride completes, the server can either:
  - Update the driver's internal wallet balance (recommended for batch payouts);
  - Immediately trigger a Razorpay Payout/Transfer (requires KYC and Razorpay Payouts permissions and additional integration).
- `POST /payments/driver/transfer/:bookingId` is used by the frontend (or admin) to trigger a transfer flow for a specific booking.


## Testing locally / in test mode

- Use Razorpay test keys (set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to test values in server env).
- Use small amounts and `INR` currency. Remember Razorpay expects currency's smallest unit (paise) for order creation (e.g., Rs 100 => amount = 10000).
- Test both successful and failed payments. Razorpay test checkout supports simulated payment failures.
- Example curl to create an order (replace host/port accordingly):

```bash
curl -X POST http://localhost:8080/payments/create-order \
  -H "Content-Type: application/json" \
  -d '{"amount":10000,"bookingId":123}'
```


## Common errors & troubleshooting

- 401 Unauthorized: Ensure the frontend sends authenticated requests (token/cookie) and backend validates authentication.
- CORS errors: Confirm backend allows requests from frontend origin.
- Invalid signature: Verify the server is using the same order_id and payment_id values and the correct `RAZORPAY_KEY_SECRET`. Also ensure no whitespace or string encoding issues when computing HMAC.
- Amount mismatch: Razorpay amounts are in paise; a mismatch between frontend, order and payment amount will cause confusion.
- Webhooks: If you rely on webhooks for async verification, ensure server verifies webhook signature and is reachable from Razorpay (use ngrok for local testing).


## Security notes

- Never expose `RAZORPAY_KEY_SECRET` in frontend code.
- Only expose `RAZORPAY_KEY_ID` (public) to the frontend.
- Always verify the payment signature on the server before marking booking as paid.


## Suggestions / Next steps

- Add server-side idempotency checks when creating orders to avoid duplicate orders for the same booking.
- Persist order records with status (PENDING, SUCCESS, FAILED) and link to booking.
- Add unit tests for signature verification logic.
- Consider supporting Razorpay webhooks for async events (payment captured, refunds, payouts).


---

If you'd like, I can also:
- Add a small sequence diagram image or ascii flow.
- Add concrete server-side code examples (Java Spring Boot controller & verification snippet) to match your backend stack.

Just tell me which of the above you'd like next.

