package com.infosys.rsa.controller;

import com.infosys.rsa.dto.PaymentVerificationRequest;
import com.infosys.rsa.dto.RazorpayOrderRequest;
import com.infosys.rsa.model.Payment;
import com.infosys.rsa.security.UserDetailsServiceImpl.UserPrincipal;
import com.infosys.rsa.service.RazorpayPaymentService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private static final Logger logger = LoggerFactory.getLogger(PaymentController.class);

    @Autowired
    private RazorpayPaymentService paymentService;

    /**
     * Create Razorpay order for payment
     */
    @PostMapping("/create-order")
    @PreAuthorize("hasRole('PASSENGER')")
    public ResponseEntity<?> createOrder(@Valid @RequestBody RazorpayOrderRequest request,
                                         Authentication authentication) {
        logger.info("Entering createOrder() for bookingId: {}", request.getBookingId());
        try {
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            logger.debug("Passenger ID: {} initiating Razorpay order creation", userPrincipal.getId());

            Map<String, Object> orderResponse = paymentService.createOrder(request);
            logger.info("Razorpay order created successfully for bookingId: {}", request.getBookingId());
            return ResponseEntity.ok(orderResponse);
        } catch (Exception e) {
            logger.error("Error creating Razorpay order for bookingId {}: {}", request.getBookingId(), e.getMessage(), e);
            return ResponseEntity.badRequest().body(new ErrorResponse("Failed to create payment order: " + e.getMessage()));
        }
    }

    /**
     * Verify Razorpay payment
     */
    @PostMapping("/verify")
    @PreAuthorize("hasRole('PASSENGER')")
    public ResponseEntity<?> verifyPayment(@Valid @RequestBody PaymentVerificationRequest request,
                                           Authentication authentication) {
        logger.info("Entering verifyPayment() for orderId: {}", request.getRazorpayOrderId());
        try {
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            logger.debug("Passenger ID: {} verifying paymentId: {}", userPrincipal.getId(), request.getRazorpayPaymentId());

            Payment payment = paymentService.verifyPayment(
                    request.getRazorpayOrderId(),
                    request.getRazorpayPaymentId(),
                    request.getRazorpaySignature()
            );

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Payment verified successfully");
            response.put("payment", payment);

            logger.info("Payment verification successful for orderId: {}", request.getRazorpayOrderId());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Payment verification failed for orderId {}: {}", request.getRazorpayOrderId(), e.getMessage(), e);
            return ResponseEntity.badRequest().body(new ErrorResponse("Payment verification failed: " + e.getMessage()));
        }
    }

    /**
     * Get payment history for passenger
     */
    @GetMapping("/passenger/history")
    @PreAuthorize("hasRole('PASSENGER')")
    public ResponseEntity<?> getPassengerPaymentHistory(Authentication authentication) {
        logger.info("Entering getPassengerPaymentHistory()");
        try {
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            logger.debug("Fetching payment history for passenger ID: {}", userPrincipal.getId());
            List<Payment> payments = paymentService.getPaymentHistoryByPassenger(userPrincipal.getId());
            logger.info("Fetched {} payment records for passenger ID: {}", payments.size(), userPrincipal.getId());
            return ResponseEntity.ok(payments);
        } catch (Exception e) {
            logger.error("Error fetching passenger payment history: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(new ErrorResponse("Failed to fetch payment history: " + e.getMessage()));
        }
    }

    /**
     * Get payment history for driver
     */
    @GetMapping("/driver/history")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<?> getDriverPaymentHistory(Authentication authentication) {
        logger.info("Entering getDriverPaymentHistory()");
        try {
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            logger.debug("Fetching payment history for driver ID: {}", userPrincipal.getId());
            List<Payment> payments = paymentService.getPaymentHistoryByDriver(userPrincipal.getId());
            logger.info("Fetched {} payment records for driver ID: {}", payments.size(), userPrincipal.getId());
            return ResponseEntity.ok(payments);
        } catch (Exception e) {
            logger.error("Error fetching driver payment history: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(new ErrorResponse("Failed to fetch payment history: " + e.getMessage()));
        }
    }

    /**
     * Get driver wallet balance and earnings
     */
    @GetMapping("/driver/wallet")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<?> getDriverWallet(Authentication authentication) {
        logger.info("Entering getDriverWallet()");
        try {
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            logger.debug("Fetching wallet for driver ID: {}", userPrincipal.getId());
            Map<String, Object> wallet = paymentService.getDriverWallet(userPrincipal.getId());
            logger.info("Wallet details fetched successfully for driver ID: {}", userPrincipal.getId());
            return ResponseEntity.ok(wallet);
        } catch (Exception e) {
            logger.error("Error fetching driver wallet: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(new ErrorResponse("Failed to fetch wallet: " + e.getMessage()));
        }
    }

    /**
     * Transfer payment to driver after ride completion
     */
    @PostMapping("/driver/transfer/{bookingId}")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<?> transferToDriver(@PathVariable Long bookingId,
                                              Authentication authentication) {
        logger.info("Entering transferToDriver() for bookingId: {}", bookingId);
        try {
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            logger.debug("Driver ID: {} initiating transfer for bookingId: {}", userPrincipal.getId(), bookingId);

            Payment payment = paymentService.transferToDriver(bookingId);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Payment transferred to driver wallet successfully");
            response.put("payment", payment);

            logger.info("Payment transfer successful for bookingId: {}", bookingId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error transferring payment for bookingId {}: {}", bookingId, e.getMessage(), e);
            return ResponseEntity.badRequest().body(new ErrorResponse("Failed to transfer payment: " + e.getMessage()));
        }
    }

    private static class ErrorResponse {
        private String message;

        public ErrorResponse(String message) {
            this.message = message;
        }

        @SuppressWarnings("unused") // Used by Jackson for JSON serialization
        public String getMessage() {
            return message;
        }
    }
}
