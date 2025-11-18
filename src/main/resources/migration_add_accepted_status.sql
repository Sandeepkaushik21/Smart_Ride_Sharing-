-- Migration script to add ACCEPTED status to booking_status column
-- Run this script in your MySQL database

USE rsa_infosys;

-- Check if column is ENUM and alter it, or if it's VARCHAR, ensure it can handle the new value
-- First, let's check the current column type and alter accordingly

-- If the column is an ENUM, we need to modify it to include ACCEPTED
-- If the column is VARCHAR, we just need to ensure it's large enough

-- Option 1: If booking_status is an ENUM, modify it:
ALTER TABLE bookings 
MODIFY COLUMN booking_status ENUM('PENDING', 'ACCEPTED', 'CONFIRMED', 'CANCELLED', 'COMPLETED') 
NOT NULL DEFAULT 'PENDING';

-- Option 2: If you prefer VARCHAR (more flexible for future changes):
-- ALTER TABLE bookings 
-- MODIFY COLUMN booking_status VARCHAR(20) 
-- NOT NULL DEFAULT 'PENDING';

