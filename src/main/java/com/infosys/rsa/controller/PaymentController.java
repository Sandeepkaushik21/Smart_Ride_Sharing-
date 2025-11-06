package com.infosys.rsa.controller;

import com.infosys.rsa.dto.PaymentVerificationRequest;
import com.infosys.rsa.dto.RazorpayOrderRequest;
import com.infosys.rsa.model.Payment;
import com.infosys.rsa.security.UserDetailsServiceImpl.UserPrincipal;
import com.infosys.rsa.service.RazorpayPaymentService;
import jakarta.validation.Valid;
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

    @Autowired
    private RazorpayPaymentService paymentService;

    /**
     * Create Razorpay order for payment
     */
    @PostMapping("/create-order")
    @PreAuthorize("hasRole('PASSENGER')")
    public ResponseEntity<?> createOrder(@Valid @RequestBody RazorpayOrderRequest request,
                                         Authentication authentication) {
        try {
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            
            // Verify booking belongs to the authenticated user
            // This is handled in the service layer
            
            Map<String, Object> orderResponse = paymentService.createOrder(request);
            return ResponseEntity.ok(orderResponse);
        } catch (Exception e) {
            System.err.println("PaymentController - Create order error: " + e.getMessage());
            e.printStackTrace();
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
        try {
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            
            Payment payment = paymentService.verifyPayment(
                request.getRazorpayOrderId(),
                request.getRazorpayPaymentId(),
                request.getRazorpaySignature()
            );

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Payment verified successfully");
            response.put("payment", payment);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.err.println("PaymentController - Verify payment error: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body(new ErrorResponse("Payment verification failed: " + e.getMessage()));
        }
    }

    /**
     * Get payment history for passenger
     */
    @GetMapping("/passenger/history")
    @PreAuthorize("hasRole('PASSENGER')")
    public ResponseEntity<?> getPassengerPaymentHistory(Authentication authentication) {
        try {
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            List<Payment> payments = paymentService.getPaymentHistoryByPassenger(userPrincipal.getId());
            return ResponseEntity.ok(payments);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ErrorResponse("Failed to fetch payment history: " + e.getMessage()));
        }
    }

    /**
     * Get payment history for driver
     */
    @GetMapping("/driver/history")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<?> getDriverPaymentHistory(Authentication authentication) {
        try {
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            List<Payment> payments = paymentService.getPaymentHistoryByDriver(userPrincipal.getId());
            return ResponseEntity.ok(payments);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ErrorResponse("Failed to fetch payment history: " + e.getMessage()));
        }
    }

    /**
     * Get driver wallet balance and earnings
     */
    @GetMapping("/driver/wallet")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<?> getDriverWallet(Authentication authentication) {
        try {
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            Map<String, Object> wallet = paymentService.getDriverWallet(userPrincipal.getId());
            return ResponseEntity.ok(wallet);
        } catch (Exception e) {
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
        try {
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            Payment payment = paymentService.transferToDriver(bookingId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Payment transferred to driver wallet successfully");
            response.put("payment", payment);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ErrorResponse("Failed to transfer payment: " + e.getMessage()));
        }
    }

    private static class ErrorResponse {
        private String message;

        public ErrorResponse(String message) {
            this.message = message;
        }

        public String getMessage() {
            return message;
        }
    }
}

