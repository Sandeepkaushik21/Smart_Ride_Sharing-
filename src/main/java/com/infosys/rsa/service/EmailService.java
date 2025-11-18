package com.infosys.rsa.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    @Autowired
    private JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    public void sendTempCredentials(String toEmail, String tempPassword, String userType) {
        logger.info("Preparing to send temporary credentials email to: {}", toEmail);

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("Welcome to Smart Ride Sharing - Temporary Login Credentials");

            String body = String.format(
                    "Welcome to Smart Ride Sharing System!\n\n" +
                            "Your account has been created successfully.\n\n" +
                            "Please use the following credentials for your first login:\n" +
                            "Email: %s\n" +
                            "Temporary Password: %s\n\n" +
                            "After logging in, you will be prompted to create your own password.\n\n" +
                            "Account Type: %s\n\n" +
                            "Thank you for joining us!\n\n" +
                            "Best Regards,\n" +
                            "Smart Ride Sharing Team",
                    toEmail, tempPassword, userType // Masked password for security
            );

            message.setText(body);
            mailSender.send(message);
            logger.info("Temporary credentials email successfully sent to {}", toEmail);
        } catch (Exception e) {
            logger.error("Failed to send temporary credentials email to {}: {}", toEmail, e.getMessage());
        }
    }

    public void sendBookingConfirmation(String toEmail, String passengerName, String source, String destination, String date, String time) {
        logger.info("Sending booking confirmation email to passenger: {} ({})", passengerName, toEmail);

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("Ride Booking Accepted - Confirmation");

            String body = String.format(
                    "Dear %s,\n\n" +
                            "Great news! Your ride booking has been accepted!\n\n" +
                            "Booking Details:\n" +
                            "From: %s\n" +
                            "To: %s\n" +
                            "Date: %s\n" +
                            "Time: %s\n\n" +
                            "Your booking is confirmed. Enjoy your ride!\n\n" +
                            "Thank you for using Smart Ride Sharing!\n\n" +
                            "Best Regards,\n" +
                            "Smart Ride Sharing Team",
                    passengerName, source, destination, date, time
            );

            message.setText(body);
            mailSender.send(message);
            logger.info("Booking confirmation email sent successfully to {}", toEmail);
        } catch (Exception e) {
            logger.error("Error sending booking confirmation email to {}: {}", toEmail, e.getMessage());
        }
    }

    public void sendRideBookingNotification(String toEmail, String driverName, String passengerName, String source, String destination, String date, String time) {
        logger.info("Notifying driver {} ({}) about a new booking from passenger {}", driverName, toEmail, passengerName);

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("New Booking on Your Ride");

            String body = String.format(
                    "Dear %s,\n\n" +
                            "Great news! Your ride has been booked by a passenger!\n\n" +
                            "Booking Details:\n" +
                            "Passenger: %s\n" +
                            "From: %s\n" +
                            "To: %s\n" +
                            "Date: %s\n" +
                            "Time: %s\n\n" +
                            "Your ride booking has been accepted. Please be ready for the journey!\n\n" +
                            "Thank you for using Smart Ride Sharing!\n\n" +
                            "Best Regards,\n" +
                            "Smart Ride Sharing Team",
                    driverName, passengerName, source, destination, date, time
            );

            message.setText(body);
            mailSender.send(message);
            logger.info("Ride booking notification sent successfully to driver {}", toEmail);
        } catch (Exception e) {
            logger.error("Failed to send ride booking notification to {}: {}", toEmail, e.getMessage());
        }
    }

    public void sendRidePostedNotification(String toEmail, String driverName, String source, String destination) {
        logger.info("Sending ride posted confirmation to driver: {} ({})", driverName, toEmail);

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("Ride Posted Successfully");

            String body = String.format(
                    "Dear %s,\n\n" +
                            "Your ride has been posted successfully!\n\n" +
                            "Ride Details:\n" +
                            "From: %s\n" +
                            "To: %s\n\n" +
                            "Passengers will be able to book seats on your ride.\n\n" +
                            "Best Regards,\n" +
                            "Smart Ride Sharing Team",
                    driverName, source, destination
            );

            message.setText(body);
            mailSender.send(message);
            logger.info("Ride posted notification sent successfully to {}", toEmail);
        } catch (Exception e) {
            logger.error("Failed to send ride posted notification to {}: {}", toEmail, e.getMessage());
        }
    }

    public void sendDriverApprovalNotification(String toEmail, String driverName, boolean approved) {
        String status = approved ? "APPROVED" : "PENDING";
        logger.info("Sending driver approval notification (status: {}) to {}", status, toEmail);

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);

            if (approved) {
                message.setSubject("Driver Account Approved");
                message.setText(String.format(
                        "Dear %s,\n\n" +
                                "Congratulations! Your driver account has been approved.\n\n" +
                                "You can now post rides and start sharing your journey with passengers.\n\n" +
                                "Login to your account to get started!\n\n" +
                                "Best Regards,\n" +
                                "Smart Ride Sharing Team",
                        driverName
                ));
                logger.debug("Driver approval email content prepared for {}", driverName);
            } else {
                message.setSubject("Driver Account Status");
                message.setText(String.format(
                        "Dear %s,\n\n" +
                                "We regret to inform you that your driver account approval is pending.\n\n" +
                                "Please contact support for more information.\n\n" +
                                "Best Regards,\n" +
                                "Smart Ride Sharing Team",
                        driverName
                ));
                logger.debug("Driver pending approval email content prepared for {}", driverName);
            }

            mailSender.send(message);
            logger.info("Driver approval notification (status: {}) sent successfully to {}", status, toEmail);
        } catch (Exception e) {
            logger.error("Failed to send driver approval notification to {}: {}", toEmail, e.getMessage());
        }
    }

    public void sendDriverAcceptanceNotification(String toEmail, String passengerName, String driverName, 
                                                   String source, String destination, String date, String time, 
                                                   Double fareAmount) {
        logger.info("Sending driver acceptance notification to passenger: {} ({})", passengerName, toEmail);

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("Ride Booking Accepted - Please Complete Payment");

            String body = String.format(
                    "Dear %s,\n\n" +
                            "Great news! The driver has accepted your ride booking request.\n\n" +
                            "Booking Details:\n" +
                            "Driver: %s\n" +
                            "From: %s\n" +
                            "To: %s\n" +
                            "Date: %s\n" +
                            "Time: %s\n" +
                            "Fare Amount: ₹%.2f\n\n" +
                            "Please complete the payment to confirm your booking.\n\n" +
                            "Thank you for using Smart Ride Sharing!\n\n" +
                            "Best Regards,\n" +
                            "Smart Ride Sharing Team",
                    passengerName, driverName, source, destination, date, time, fareAmount != null ? fareAmount : 0.0
            );

            message.setText(body);
            mailSender.send(message);
            logger.info("Driver acceptance notification sent successfully to {}", toEmail);
        } catch (Exception e) {
            logger.error("Failed to send driver acceptance notification to {}: {}", toEmail, e.getMessage());
        }
    }

    public void sendRideCancellationNotification(String toEmail, String passengerName, String driverName,
                                                  String source, String destination, String date, String time,
                                                  String reason) {
        logger.info("Sending ride cancellation notification to passenger: {} ({})", passengerName, toEmail);

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("Ride Cancellation Notice");

            String body = String.format(
                    "Dear %s,\n\n" +
                            "We regret to inform you that your ride has been cancelled by the driver.\n\n" +
                            "Ride Details:\n" +
                            "Driver: %s\n" +
                            "From: %s\n" +
                            "To: %s\n" +
                            "Date: %s\n" +
                            "Time: %s\n" +
                            (reason != null && !reason.trim().isEmpty() ? "Reason: %s\n\n" : "\n") +
                            "If you have already made a payment, you will receive a full refund.\n\n" +
                            "We apologize for any inconvenience caused.\n\n" +
                            "Thank you for using Smart Ride Sharing!\n\n" +
                            "Best Regards,\n" +
                            "Smart Ride Sharing Team",
                    passengerName, driverName, source, destination, date, time,
                    reason != null && !reason.trim().isEmpty() ? reason : ""
            );

            message.setText(body);
            mailSender.send(message);
            logger.info("Ride cancellation notification sent successfully to {}", toEmail);
        } catch (Exception e) {
            logger.error("Failed to send ride cancellation notification to {}: {}", toEmail, e.getMessage());
        }
    }

    public void sendBookingCancellationNotification(String toEmail, String driverName, String passengerName,
                                                     String source, String destination, String date, String time) {
        logger.info("Sending booking cancellation notification to driver: {} ({})", driverName, toEmail);

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("Booking Cancellation Notice");

            String body = String.format(
                    "Dear %s,\n\n" +
                            "A passenger has cancelled their booking on your ride.\n\n" +
                            "Booking Details:\n" +
                            "Passenger: %s\n" +
                            "From: %s\n" +
                            "To: %s\n" +
                            "Date: %s\n" +
                            "Time: %s\n\n" +
                            "The seats have been restored to your ride availability.\n\n" +
                            "Thank you for using Smart Ride Sharing!\n\n" +
                            "Best Regards,\n" +
                            "Smart Ride Sharing Team",
                    driverName, passengerName, source, destination, date, time
            );

            message.setText(body);
            mailSender.send(message);
            logger.info("Booking cancellation notification sent successfully to driver {}", toEmail);
        } catch (Exception e) {
            logger.error("Failed to send booking cancellation notification to {}: {}", toEmail, e.getMessage());
        }
    }

    public void sendRideRescheduleNotification(String toEmail, String passengerName, String driverName,
                                                String source, String destination, String oldDate, String oldTime,
                                                String newDate, String newTime, String reason) {
        logger.info("Sending ride reschedule notification to passenger: {} ({})", passengerName, toEmail);

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("Ride Rescheduled - Important Update");

            String body = String.format(
                    "Dear %s,\n\n" +
                            "The driver has rescheduled your ride. Please note the updated details below.\n\n" +
                            "Ride Details:\n" +
                            "Driver: %s\n" +
                            "From: %s\n" +
                            "To: %s\n\n" +
                            "Previous Schedule:\n" +
                            "Date: %s\n" +
                            "Time: %s\n\n" +
                            "New Schedule:\n" +
                            "Date: %s\n" +
                            "Time: %s\n" +
                            (reason != null && !reason.trim().isEmpty() ? "\nReason: %s\n" : "\n") +
                            "Please make a note of the new schedule. If you are unable to make it, you can cancel your booking.\n\n" +
                            "Thank you for using Smart Ride Sharing!\n\n" +
                            "Best Regards,\n" +
                            "Smart Ride Sharing Team",
                    passengerName, driverName, source, destination,
                    oldDate, oldTime, newDate, newTime,
                    reason != null && !reason.trim().isEmpty() ? reason : ""
            );

            message.setText(body);
            mailSender.send(message);
            logger.info("Ride reschedule notification sent successfully to {}", toEmail);
        } catch (Exception e) {
            logger.error("Failed to send ride reschedule notification to {}: {}", toEmail, e.getMessage());
        }
    }

    public void sendRideReminderNotification(String toEmail, String passengerName, String driverName,
                                              String source, String destination, String date, String time,
                                              int hoursBefore) {
        logger.info("Sending ride reminder notification to passenger: {} ({}) - {} hours before", passengerName, toEmail, hoursBefore);

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject(String.format("Ride Reminder - %d Hour(s) Before Departure", hoursBefore));

            String body = String.format(
                    "Dear %s,\n\n" +
                            "This is a reminder about your upcoming ride.\n\n" +
                            "Ride Details:\n" +
                            "Driver: %s\n" +
                            "From: %s\n" +
                            "To: %s\n" +
                            "Date: %s\n" +
                            "Time: %s\n\n" +
                            "Your ride is scheduled in %d hour(s). Please be ready at the pickup location.\n\n" +
                            "Thank you for using Smart Ride Sharing!\n\n" +
                            "Best Regards,\n" +
                            "Smart Ride Sharing Team",
                    passengerName, driverName, source, destination, date, time, hoursBefore
            );

            message.setText(body);
            mailSender.send(message);
            logger.info("Ride reminder notification sent successfully to {}", toEmail);
        } catch (Exception e) {
            logger.error("Failed to send ride reminder notification to {}: {}", toEmail, e.getMessage());
        }
    }
}
