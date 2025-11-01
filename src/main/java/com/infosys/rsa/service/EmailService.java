package com.infosys.rsa.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {
    @Autowired
    private JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    public void sendTempCredentials(String toEmail, String tempPassword, String userType) {
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
            toEmail, tempPassword, userType
        );
        
        message.setText(body);
        mailSender.send(message);
    }

    public void sendBookingConfirmation(String toEmail, String passengerName, String source, String destination, String date, String time) {
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
    }

    public void sendRideBookingNotification(String toEmail, String driverName, String passengerName, String source, String destination, String date, String time) {
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
    }

    public void sendRidePostedNotification(String toEmail, String driverName, String source, String destination) {
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
    }

    public void sendDriverApprovalNotification(String toEmail, String driverName, boolean approved) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(toEmail);
        
        if (approved) {
            message.setSubject("Driver Account Approved");
            message.setText(
                String.format(
                    "Dear %s,\n\n" +
                    "Congratulations! Your driver account has been approved.\n\n" +
                    "You can now post rides and start sharing your journey with passengers.\n\n" +
                    "Login to your account to get started!\n\n" +
                    "Best Regards,\n" +
                    "Smart Ride Sharing Team",
                    driverName
                )
            );
        } else {
            message.setSubject("Driver Account Status");
            message.setText(
                String.format(
                    "Dear %s,\n\n" +
                    "We regret to inform you that your driver account approval is pending.\n\n" +
                    "Please contact support for more information.\n\n" +
                    "Best Regards,\n" +
                    "Smart Ride Sharing Team",
                    driverName
                )
            );
        }
        
        mailSender.send(message);
    }
}

