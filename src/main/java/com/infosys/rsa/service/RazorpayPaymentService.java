package com.infosys.rsa.service;

import com.infosys.rsa.dto.RazorpayOrderRequest;
import com.infosys.rsa.model.Booking;
import com.infosys.rsa.model.Payment;
import com.infosys.rsa.model.Ride;
import com.infosys.rsa.model.User;
import com.infosys.rsa.repository.BookingRepository;
import com.infosys.rsa.repository.PaymentRepository;
import com.infosys.rsa.repository.RideRepository;
import com.infosys.rsa.repository.UserRepository;
import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class RazorpayPaymentService {

    private static final Logger logger = LoggerFactory.getLogger(RazorpayPaymentService.class);

    @Value("${razorpay.key.id}")
    private String razorpayKeyId;

    @Value("${razorpay.key.secret}")
    private String razorpayKeySecret;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private RideRepository rideRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmailService emailService;

    /**
     * Create Razorpay order for payment
     */
    public Map<String, Object> createOrder(RazorpayOrderRequest request) throws RazorpayException {
        try {
            // Validate Razorpay keys
            if (razorpayKeyId == null || razorpayKeyId.trim().isEmpty() || razorpayKeyId.equals("your_razorpay_key_id")) {
                throw new RuntimeException("Razorpay Key ID is not configured. Please set razorpay.key.id in application.properties");
            }
            if (razorpayKeySecret == null || razorpayKeySecret.trim().isEmpty() || razorpayKeySecret.equals("your_razorpay_key_secret")) {
                throw new RuntimeException("Razorpay Key Secret is not configured. Please set razorpay.key.secret in application.properties");
            }

            // Determine amount to use for order creation.
            // Prefer the fare stored on the Booking (saved during booking creation) so the
            // Razorpay order always matches what the passenger confirmed. If Booking isn't found
            // or fareAmount is null, fall back to the amount provided in the request.
            logger.info("Creating Razorpay order - Requested Amount: {} INR, BookingId: {}", request.getAmount(), request.getBookingId());

            RazorpayClient razorpay = new RazorpayClient(razorpayKeyId, razorpayKeySecret);

            // Look up booking and prefer its fareAmount
            Optional<Booking> bookingOptForAmount = bookingRepository.findById(request.getBookingId());
            if (bookingOptForAmount.isEmpty()) {
                throw new RuntimeException("Booking not found with ID: " + request.getBookingId());
            }
            
            Booking booking = bookingOptForAmount.get();
            
            // Validate booking status - only ACCEPTED bookings can proceed to payment
            if (booking.getStatus() != Booking.BookingStatus.ACCEPTED) {
                throw new RuntimeException("Payment can only be processed for accepted bookings. Current status: " + booking.getStatus());
            }
            
            double amountRupeesToUse = 0.0;
            if (booking.getFareAmount() != null) {
                amountRupeesToUse = booking.getFareAmount();
                logger.info("Using booking.fareAmount for Razorpay order: {} INR (BookingId: {})", amountRupeesToUse, request.getBookingId());
            } else if (request.getAmount() != null) {
                amountRupeesToUse = request.getAmount();
                logger.info("Booking fare missing; falling back to request.amount: {} INR", amountRupeesToUse);
            } else {
                throw new RuntimeException("Amount is required to create Razorpay order");
            }

            // Amount in paise (1 INR = 100 paise)
            int amountInPaise = (int) Math.round(amountRupeesToUse * 100);

            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", amountInPaise);
            orderRequest.put("currency", request.getCurrency());
            orderRequest.put("receipt", "receipt_" + request.getBookingId());
            orderRequest.put("notes", new JSONObject()
                    .put("bookingId", request.getBookingId().toString())
            );

            Order order = razorpay.orders.create(orderRequest);

            // Create payment record with PENDING status
            Payment payment = null;
            if (booking != null) {
                payment = new Payment();
                payment.setBooking(booking);
                payment.setPassenger(booking.getPassenger());
                payment.setDriver(booking.getRide().getDriver());
                // Persist the rupee amount used for this payment record (derived from booking or request)
                payment.setAmount(amountRupeesToUse);
                payment.setRazorpayOrderId(order.get("id"));
                payment.setStatus(Payment.PaymentStatus.PENDING);
                payment.setType(Payment.PaymentType.BOOKING);
                paymentRepository.save(payment);
            }

            Map<String, Object> response = new HashMap<>();
            response.put("orderId", order.get("id"));
            response.put("amount", order.get("amount"));
            response.put("currency", order.get("currency"));
            response.put("keyId", razorpayKeyId);
            // Also expose the rupee amount used to create this order so frontend can
            // display the exact booking total confirmed by the backend.
            response.put("amountInRupees", amountRupeesToUse);

            return response;
        } catch (RazorpayException e) {
            logger.error("Razorpay order creation error: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to create Razorpay order: " + e.getMessage() + ". Please check Razorpay keys configuration.", e);
        } catch (Exception e) {
            logger.error("Unexpected error creating order: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to create payment order: " + e.getMessage(), e);
        }
    }

    /**
     * Verify Razorpay payment signature
     */
    public boolean verifySignature(String orderId, String paymentId, String signature) {
        try {
            // Manual signature verification using HMAC SHA256
            String text = orderId + "|" + paymentId;
            javax.crypto.Mac mac = javax.crypto.Mac.getInstance("HmacSHA256");
            javax.crypto.spec.SecretKeySpec secretKeySpec = new javax.crypto.spec.SecretKeySpec(
                    razorpayKeySecret.getBytes("UTF-8"), "HmacSHA256");
            mac.init(secretKeySpec);
            byte[] hash = mac.doFinal(text.getBytes("UTF-8"));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            String generatedSignature = hexString.toString();
            boolean isValid = generatedSignature.equals(signature);
            
            // Log for debugging
            if (!isValid) {
                logger.warn("Signature verification failed - Expected: {}, Generated: {}, Text: {}", signature, generatedSignature, text);
            }
            
            return isValid;
        } catch (Exception e) {
            logger.error("Error in signature verification: {}", e.getMessage(), e);
            return false;
        }
    }

    /**
     * Verify and complete payment
     */
    @Transactional
    public Payment verifyPayment(String orderId, String paymentId, String signature) {
        // Log payment verification attempt
        logger.info("Verifying payment - OrderId: {}, PaymentId: {}", orderId, paymentId);
        
        // Verify signature
        if (!verifySignature(orderId, paymentId, signature)) {
            logger.error("Signature verification failed for order: {}", orderId);
            throw new RuntimeException("Invalid payment signature. Please contact support if payment was deducted.");
        }

        // Find payment record
        Optional<Payment> paymentOpt = paymentRepository.findByRazorpayOrderId(orderId);
        if (paymentOpt.isEmpty()) {
            throw new RuntimeException("Payment record not found for order: " + orderId);
        }

        Payment payment = paymentOpt.get();

        // Validate booking status before processing payment
        Booking booking = payment.getBooking();
        if (booking.getStatus() != Booking.BookingStatus.ACCEPTED) {
            throw new RuntimeException("Payment can only be processed for accepted bookings. Current status: " + booking.getStatus());
        }

        // Update payment status
        payment.setRazorpayPaymentId(paymentId);
        payment.setRazorpaySignature(signature);
        payment.setStatus(Payment.PaymentStatus.SUCCESS);

        // Update booking status to CONFIRMED
        // Note: Seats are already decremented when driver accepts the booking, so no need to decrement again here
        booking.setStatus(Booking.BookingStatus.CONFIRMED);
        bookingRepository.save(booking);
        
        Ride ride = booking.getRide();

        // Send confirmation emails
        try {
            emailService.sendBookingConfirmation(
                booking.getPassenger().getEmail(), 
                booking.getPassenger().getName(),
                ride.getSource(), 
                ride.getDestination(), 
                ride.getDate().toString(), 
                ride.getTime().toString()
            );
            
            emailService.sendRideBookingNotification(
                ride.getDriver().getEmail(), 
                ride.getDriver().getName(), 
                booking.getPassenger().getName(),
                ride.getSource(), 
                ride.getDestination(), 
                ride.getDate().toString(), 
                ride.getTime().toString()
            );
        } catch (Exception e) {
            // Log error but don't fail payment verification
            logger.error("Failed to send confirmation emails: {}", e.getMessage(), e);
        }

        // Save payment
        paymentRepository.save(payment);

        return payment;
    }

    /**
     * Transfer payment to driver wallet after ride completion
     */
    @Transactional
    public Payment transferToDriver(Long bookingId) {
        Optional<Booking> bookingOpt = bookingRepository.findById(bookingId);
        if (bookingOpt.isEmpty()) {
            throw new RuntimeException("Booking not found");
        }

        Booking booking = bookingOpt.get();
        if (booking.getStatus() != Booking.BookingStatus.COMPLETED) {
            throw new RuntimeException("Ride must be completed before transferring payment to driver");
        }

        // Find payment record
        Optional<Payment> paymentOpt = paymentRepository.findByBookingId(bookingId)
                .stream()
                .filter(p -> p.getType() == Payment.PaymentType.BOOKING)
                .findFirst();

        if (paymentOpt.isEmpty()) {
            throw new RuntimeException("Payment record not found for booking");
        }

        Payment payment = paymentOpt.get();

        if (payment.getDriverPaymentStatus() == Payment.DriverPaymentStatus.COMPLETED) {
            throw new RuntimeException("Payment already transferred to driver");
        }

        // Transfer to driver wallet
        User driver = booking.getRide().getDriver();
        double currentBalance = driver.getWalletBalance() != null ? driver.getWalletBalance() : 0.0;
        driver.setWalletBalance(currentBalance + payment.getAmount());
        userRepository.save(driver);

        // Update payment status
        payment.setDriverPaymentStatus(Payment.DriverPaymentStatus.COMPLETED);
        payment.setDriverPaymentDate(java.time.LocalDateTime.now());
        paymentRepository.save(payment);

        return payment;
    }

    /**
     * Get payment by booking ID
     */
    public Optional<Payment> getPaymentByBookingId(Long bookingId) {
        return paymentRepository.findByBookingId(bookingId)
                .stream()
                .filter(p -> p.getType() == Payment.PaymentType.BOOKING)
                .findFirst();
    }

    /**
     * Get payment history for passenger
     */
    public List<Payment> getPaymentHistoryByPassenger(Long passengerId) {
        return paymentRepository.findByPassengerIdOrderByCreatedAtDesc(passengerId);
    }

    /**
     * Get payment history for driver
     */
    public List<Payment> getPaymentHistoryByDriver(Long driverId) {
        return paymentRepository.findByDriverIdOrderByCreatedAtDesc(driverId);
    }

    /**
     * Get driver wallet balance and earnings
     */
    public Map<String, Object> getDriverWallet(Long driverId) {
        Map<String, Object> wallet = new HashMap<>();
        
        User driver = userRepository.findById(driverId)
                .orElseThrow(() -> new RuntimeException("Driver not found"));
        
        Double totalEarnings = paymentRepository.getTotalEarningsByDriverId(driverId);
        Double pendingEarnings = paymentRepository.getPendingEarningsByDriverId(driverId);
        
        wallet.put("walletBalance", driver.getWalletBalance() != null ? driver.getWalletBalance() : 0.0);
        wallet.put("totalEarnings", totalEarnings != null ? totalEarnings : 0.0);
        wallet.put("pendingEarnings", pendingEarnings != null ? pendingEarnings : 0.0);
        
        return wallet;
    }
}
