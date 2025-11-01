# Fare Calculation Explanation

## How Fare is Calculated

The fare calculation system in this ride-sharing platform uses a simple and transparent formula:

### Base Components

1. **Base Fare**: ₹50.00 (fixed charge for every ride)
2. **Rate per Kilometer**: ₹5.00 per km

### Formula

**Total Fare = Base Fare + (Rate per Km × Distance in Km)**

### Example Calculation

If the distance between Chennai and Bangalore is 350 km:

- Base Fare: ₹50.00
- Distance Charge: ₹5.00 × 350 = ₹1,750.00
- **Total Fare: ₹50.00 + ₹1,750.00 = ₹1,800.00**

### Passenger Proportional Fare

When a passenger books a ride, the fare is calculated proportionally based on the distance they travel:

**Passenger Fare = (Total Fare × Passenger Distance) / Total Ride Distance**

### Example: Proportional Calculation

**Scenario:**
- Total ride distance: 400 km (Delhi to Mumbai)
- Total fare: ₹2,050 (₹50 base + ₹5 × 400)
- Passenger joins at Agra (200 km from start)
- Passenger distance: 200 km

**Calculation:**
- Proportion: 200 km / 400 km = 0.5 (50%)
- **Passenger Fare: ₹2,050 × 0.5 = ₹1,025.00**

### Multiple Seats Booking

When a passenger books multiple seats, the fare is multiplied by the number of seats:

**Total Booking Fare = Passenger Fare × Number of Seats**

### Example: Multiple Seats

- Passenger fare per seat: ₹500.00
- Number of seats: 3
- **Total Booking Fare: ₹500.00 × 3 = ₹1,500.00**

### Important Notes

1. **Minimum Distance**: The system ensures a minimum distance of 10 km is used for calculations.
2. **Distance Calculation**: Currently using a dummy calculation based on city names. In production, this would integrate with Google Maps Distance Matrix API for accurate distance calculations.
3. **Fare Display**: All fares are displayed in Indian Rupees (₹).
4. **Payment**: Currently, bookings are automatically accepted without actual payment processing (dummy payment mode).

### Future Enhancements

- Integration with real mapping APIs (Google Maps, LocationIQ)
- Dynamic fare based on time of day (peak hours)
- Surge pricing during high demand
- Discounts for frequent users
- Split fare options for groups

