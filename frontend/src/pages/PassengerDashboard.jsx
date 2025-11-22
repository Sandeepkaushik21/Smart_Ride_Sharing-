import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, MapPin, Calendar, Clock, User, CheckCircle, Car, Navigation, Star, Ticket, Snowflake, ChevronLeft, ChevronRight, X, ZoomIn, History, Users, Loader, Printer } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BackButton from '../components/BackButton';
import CityAutocomplete from '../components/CityAutocomplete';
import RazorpayPaymentModal from '../components/RazorpayPaymentModal';
import { rideService } from '../services/rideService';
import { bookingService } from '../services/bookingService';
import { paymentService } from '../services/paymentService';
import { showConfirm, showSuccess, showError } from '../utils/swal';

const PassengerDashboard = () => {
    // Helper: format LocalDate (ISO string "yyyy-MM-dd" or Java time object) to human-friendly string
    const formatDate = (val) => {
        if (!val) return 'N/A';
        // If already a string like '2025-11-02'
        if (typeof val === 'string') {
            return val;
        }
        // If object with year/month/day (from Java LocalDate serialized as object)
        if (typeof val === 'object') {
            const year = val.year || val.value?.year;
            const month = val.month || val.monthValue || val.value?.month || val.value?.monthValue;
            const day = val.day || val.dayOfMonth || val.value?.day || val.value?.dayOfMonth;
            if (year && month && day) {
                const mm = String(month).padStart(2, '0');
                const dd = String(day).padStart(2, '0');
                return `${year}-${mm}-${dd}`;
            }
        }
        return 'N/A';
    };

    // Helper: format LocalTime (ISO string "HH:mm[:ss]" or Java time object) to human-friendly string
    const formatTime = (val) => {
        if (!val) return 'N/A';
        if (typeof val === 'string') {
            // Trim seconds if present: keep HH:mm
            return val.split(':').slice(0,2).join(':');
        }
        if (typeof val === 'object') {
            const hour = val.hour || val.value?.hour;
            const minute = val.minute || val.value?.minute;
            if (hour !== undefined && minute !== undefined) {
                const hh = String(hour).padStart(2, '0');
                const mm = String(minute).padStart(2, '0');
                return `${hh}:${mm}`;
            }
        }
        return 'N/A';
    };

    const [searchForm, setSearchForm] = useState({
        source: '',
        destination: '',
        date: '',
    });
    const [rides, setRides] = useState([]);
    const [bookings, setBookings] = useState([]);
    // Pagination for passenger bookings: show 1 booking per page
    const [bookingsPage, setBookingsPage] = useState(0);
    const [bookingsSize] = useState(1); // fixed at 1 per user request
    const [bookingsTotalPages, setBookingsTotalPages] = useState(0);
    // Ride history
    const [rideHistory, setRideHistory] = useState([]);
    const [historyPage, setHistoryPage] = useState(0);
    const [historySize, setHistorySize] = useState(3);
    const [historyTotalPages, setHistoryTotalPages] = useState(0);

    // =========================================================================
    // ✨ MISSING WIZARD STATE & LOGIC INJECTION START ✨
    // =========================================================================
    const [wizardStep, setWizardStep] = useState(1);
    const [fromCity, setFromCity] = useState('');
    const [toCity, setToCity] = useState('');
    
    const goNext = useCallback(async () => {
        // Step 1 -> 2: Fetch available rides to get driver pickup and drop locations
        if (wizardStep === 1) {
            setSearchForm(prev => ({ ...prev, source: '', destination: '' })); // Reset locations
            setWizardStep(2);
            setLoading(true);
            // Fetch rides to get driver pickup and drop locations
            // Try multiple dates to find available rides (today, tomorrow, next 7 days)
            try {
                const allRides = [];
                const datesToTry = [];
                const today = new Date();
                
                // Try today and next 7 days
                for (let i = 0; i < 8; i++) {
                    const date = new Date(today);
                    date.setDate(today.getDate() + i);
                    datesToTry.push(date.toISOString().split('T')[0]);
                }
                
                // Search for rides across multiple dates
                for (const dateStr of datesToTry) {
                    try {
                        const searchData = {
                            source: fromCity,
                            destination: toCity,
                            date: dateStr
                        };
                        console.log('[PassengerDashboard] Searching rides for:', searchData);
                        const data = await rideService.searchRides(searchData);
                        const list = Array.isArray(data) ? data : (data && Array.isArray(data.content) ? data.content : []);
                        console.log(`[PassengerDashboard] Found ${list.length} rides for date ${dateStr}`);
                        allRides.push(...list);
                    } catch (err) {
                        console.error(`Error searching rides for date ${dateStr}:`, err);
                    }
                }
                
                console.log(`[PassengerDashboard] Total rides found: ${allRides.length}`);
                
                // Extract and aggregate pickup locations from all rides
                const allPickupLocations = new Set();
                const allDropLocations = new Set();
                
                allRides.forEach((ride, index) => {
                    console.log(`[PassengerDashboard] Processing ride ${index + 1}:`, {
                        id: ride.id,
                        source: ride.source,
                        destination: ride.destination,
                        hasPickupJson: !!(ride.pickupLocationsJson || ride.pickupLocations),
                        hasDropJson: !!(ride.dropLocationsJson || ride.dropLocations),
                        pickupJson: ride.pickupLocationsJson || ride.pickupLocations,
                        dropJson: ride.dropLocationsJson || ride.dropLocations
                    });
                    
                    // Handle pickup locations - try both camelCase and snake_case field names
                    let pickupLocationsData = ride.pickupLocationsJson || ride.pickupLocations;
                    if (pickupLocationsData) {
                        try {
                            let locations;
                            // If it's already an array, use it directly
                            if (Array.isArray(pickupLocationsData)) {
                                locations = pickupLocationsData;
                            } else if (typeof pickupLocationsData === 'string') {
                                // Try to parse as JSON
                                locations = JSON.parse(pickupLocationsData);
                            } else {
                                locations = [];
                            }
                            
                            console.log(`[PassengerDashboard] Parsed pickup locations:`, locations);
                            if (Array.isArray(locations)) {
                                locations.forEach(loc => {
                                    if (loc && typeof loc === 'string' && loc.trim()) {
                                        allPickupLocations.add(loc.trim());
                                    }
                                });
                            }
                        } catch (e) {
                            console.error('Error parsing pickup locations:', e, 'Data:', pickupLocationsData);
                        }
                    }
                    
                    // Handle drop locations - try both camelCase and snake_case field names
                    let dropLocationsData = ride.dropLocationsJson || ride.dropLocations;
                    if (dropLocationsData) {
                        try {
                            let locations;
                            // If it's already an array, use it directly
                            if (Array.isArray(dropLocationsData)) {
                                locations = dropLocationsData;
                            } else if (typeof dropLocationsData === 'string') {
                                // Try to parse as JSON
                                locations = JSON.parse(dropLocationsData);
                            } else {
                                locations = [];
                            }
                            
                            console.log(`[PassengerDashboard] Parsed drop locations:`, locations);
                            if (Array.isArray(locations)) {
                                locations.forEach(loc => {
                                    if (loc && typeof loc === 'string' && loc.trim()) {
                                        allDropLocations.add(loc.trim());
                                    }
                                });
                            }
                        } catch (e) {
                            console.error('Error parsing drop locations:', e, 'Data:', dropLocationsData);
                        }
                    }
                });
                
                const pickupArray = Array.from(allPickupLocations);
                const dropArray = Array.from(allDropLocations);
                
                console.log(`[PassengerDashboard] Final aggregated locations:`, {
                    pickupLocations: pickupArray,
                    dropLocations: dropArray,
                    pickupCount: pickupArray.length,
                    dropCount: dropArray.length
                });
                
                setDriverPickupLocations(pickupArray);
                setDriverDropLocations(dropArray);
                setAvailableRides(allRides);
            } catch (error) {
                console.error('Error fetching rides for locations:', error);
                setDriverPickupLocations([]);
                setDriverDropLocations([]);
                // Continue anyway, user can still see the message
            } finally {
                setLoading(false);
            }
            // Step 2 -> 3: Pre-fill date and move to final step
        } else if (wizardStep === 2) {
            // Validate that both pickup and drop locations are selected
            if (!searchForm.source || !searchForm.destination) {
                await showError('Please select both pickup and drop locations');
                return;
            }
            // Pre-fill date with today's date if not set
            if (!searchForm.date) {
                const today = new Date().toISOString().split('T')[0];
                setSearchForm(prev => ({ ...prev, date: today }));
            }
            setWizardStep(3);
        }
    }, [wizardStep, fromCity, toCity, searchForm.source, searchForm.destination, searchForm.date]);

    const goPrev = useCallback(() => {
        setWizardStep(prev => Math.max(1, prev - 1));
    }, []);

    // Helper: check if a date has passed (is before today)
    const isDatePassed = useCallback((dateValue) => {
        if (!dateValue) return false;

        let dateStr = '';
        if (typeof dateValue === 'string') {
            dateStr = dateValue; // Already in format 'yyyy-MM-dd'
        } else if (typeof dateValue === 'object') {
            // Convert Java LocalDate object to string
            const year = dateValue.year || dateValue.value?.year;
            const month = dateValue.month || dateValue.monthValue || dateValue.value?.month || dateValue.value?.monthValue;
            const day = dateValue.day || dateValue.dayOfMonth || dateValue.value?.day || dateValue.value?.dayOfMonth;
            if (year && month && day) {
                const mm = String(month).padStart(2, '0');
                const dd = String(day).padStart(2, '0');
                dateStr = `${year}-${mm}-${dd}`;
            } else {
                return false;
            }
        } else {
            return false;
        }

        // Compare with today's date (only date, not time)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const bookingDate = new Date(dateStr);
        bookingDate.setHours(0, 0, 0, 0);

        return bookingDate < today;
    }, []);

    // Filter bookings to exclude cancelled and past dates
    const filteredBookings = useMemo(() => bookings.filter(booking => !(booking.status === 'CANCELLED' || (booking.ride?.date && isDatePassed(booking.ride.date)))), [bookings, isDatePassed]);

    // Handle client-side pagination if server-side is not available (bookingsTotalPages === 0)
    const displayedBookings = useMemo(() => {
        if (bookingsTotalPages > 0) {
            // Server-side pagination: use the 'bookings' array directly (it's already the current page)
            return bookings;
        }
        // Client-side pagination: slice the filtered list
        const start = bookingsPage * bookingsSize;
        const end = start + bookingsSize;
        return filteredBookings.slice(start, end);
    }, [filteredBookings, bookingsPage, bookingsSize, bookingsTotalPages, bookings]);

    // Client-side pagination for history
    const displayedHistory = useMemo(() => {
        if (historyTotalPages > 0) return rideHistory;
        const start = historyPage * historySize;
        return rideHistory.slice(start, start + historySize);
    }, [rideHistory, historyPage, historySize, historyTotalPages]);

    // =========================================================================
    // ✨ MISSING WIZARD STATE & LOGIC INJECTION END ✨
    // =========================================================================

    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('search');
    const [selectedSeats, setSelectedSeats] = useState({});
    const [showBookingModal, setShowBookingModal] = useState({});
    const [bookingLoading, setBookingLoading] = useState({});
    const [selectedPickupLocation, setSelectedPickupLocation] = useState({}); // per ride
    const [selectedDropLocation, setSelectedDropLocation] = useState({}); // per ride
    const [availableRides, setAvailableRides] = useState([]); // Rides for current search to get pickup locations
    // Pagination for Available Rides (results tab)
    const [resultsPage, setResultsPage] = useState(0); // zero-based
    const [resultsSize, setResultsSize] = useState(5);
    const [driverPickupLocations, setDriverPickupLocations] = useState([]); // Aggregated pickup locations from all drivers
    const [driverDropLocations, setDriverDropLocations] = useState([]); // Aggregated drop locations from all drivers
    const [photoViewer, setPhotoViewer] = useState({ open: false, photos: [], currentIndex: 0 });
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [pendingBooking, setPendingBooking] = useState(null);
    const [paymentOrderData, setPaymentOrderData] = useState(null);
    const [paymentProcessing, setPaymentProcessing] = useState(false);

    const openPhotoViewer = useCallback((photos, index = 0) => {
        setPhotoViewer({ open: true, photos: photos, currentIndex: index });
    }, []);

    const closePhotoViewer = useCallback(() => {
        setPhotoViewer({ open: false, photos: [], currentIndex: 0 });
    }, []);

    const nextPhoto = useCallback(() => {
        setPhotoViewer((prev) => {
            if (prev.currentIndex < prev.photos.length - 1) {
                return { ...prev, currentIndex: prev.currentIndex + 1 };
            }
            return prev;
        });
    }, []);

    const prevPhoto = useCallback(() => {
        setPhotoViewer((prev) => {
            if (prev.currentIndex > 0) {
                return { ...prev, currentIndex: prev.currentIndex - 1 };
            }
            return prev;
        });
    }, []);

    // Fetch passenger bookings; attempt server-side pagination, fallback to full list
    const fetchMyBookings = async (page = bookingsPage, size = bookingsSize) => {
        try {
            const resp = await bookingService.getMyBookings({ page, size });
            if (Array.isArray(resp)) {
                setBookings(resp);
                setBookingsTotalPages(0);
            } else {
                setBookings(Array.isArray(resp.content) ? resp.content : []);
                setBookingsTotalPages(Number.isFinite(resp.totalPages) ? resp.totalPages : 0);
            }
            setBookingsPage(page);
        } catch (error) {
            // Fallback to non-paginated endpoint
            try {
                const data = await bookingService.getMyBookings();
                setBookings(Array.isArray(data) ? data : []);
                setBookingsTotalPages(0);
                setBookingsPage(0);
            } catch (e) {
                console.error('Error fetching bookings:', error, e);
            }
        }
    };

    useEffect(() => {
        // Load first page on mount
        fetchMyBookings(0, bookingsSize);
        // Load ride history
        fetchHistoryPage(0, historySize);
    }, []);

    // Keyboard navigation for photo viewer
    useEffect(() => {
        if (photoViewer.open) {
            const handleKeyDown = (e) => {
                if (e.key === 'Escape') {
                    closePhotoViewer();
                } else if (e.key === 'ArrowLeft') {
                    prevPhoto();
                } else if (e.key === 'ArrowRight') {
                    nextPhoto();
                }
            };
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [photoViewer.open, closePhotoViewer, prevPhoto, nextPhoto]);

    // Helper to fetch a specific bookings page (server-side) or just set local page for client-side slicing
    const fetchBookingsPage = async (page = 0) => {
        if (bookingsTotalPages > 0) {
            await fetchMyBookings(page, bookingsSize);
        } else {
            // client-side: we already have full bookings array, just set page
            setBookingsPage(page);
        }
    };

    // Fetch history page
    const fetchHistoryPage = async (page = historyPage, size = historySize) => {
        try {
            const resp = await bookingService.getRideHistory({ page, size });
            if (Array.isArray(resp)) {
                setRideHistory(resp);
                setHistoryTotalPages(0);
            } else {
                setRideHistory(Array.isArray(resp.content) ? resp.content : []);
                setHistoryTotalPages(Number.isFinite(resp.totalPages) ? resp.totalPages : 0);
            }
            setHistoryPage(page);
            setHistorySize(size);
        } catch (err) {
            // Fallback: try non-paginated endpoint
            try {
                const all = await bookingService.getRideHistory();
                setRideHistory(Array.isArray(all) ? all : []);
                setHistoryTotalPages(0);
            } catch (e) {
                console.error('Error fetching history page:', err, e);
                setRideHistory([]);
            }
        }
    };

    const handleSearch = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        setLoading(true);
        try {
            // Search by cities (not specific locations)
            const searchData = {
                source: fromCity,
                destination: toCity,
                date: searchForm.date
            };
            const data = await rideService.searchRides(searchData);

            // Debug raw response to help diagnose missing driver info
            console.debug('[PassengerDashboard] raw search response:', data);

            // Support pageable responses: pick data.content if present
            const list = Array.isArray(data) ? data : (data && Array.isArray(data.content) ? data.content : []);

            // Normalize different possible backend shapes so frontend can always read driver.name
            const normalized = list.map((r) => {
                if (!r || typeof r !== 'object') return r;

                // If driver is already an object with name -> use it
                if (r.driver && typeof r.driver === 'object') return { ...r, driver: r.driver };

                // If driver comes as a nested 'driverInfo' or 'driverResponse'
                if (r.driverInfo && typeof r.driverInfo === 'object') return { ...r, driver: r.driverInfo };
                if (r.driverResponse && typeof r.driverResponse === 'object') return { ...r, driver: r.driverResponse };

                // If driver is just a string (driver name)
                if (typeof r.driver === 'string') return { ...r, driver: { id: null, name: r.driver, driverRating: null } };

                // Flat fields: driverName / driver_name / name under driver_* keys
                const nameFromFlat = r.driverName || r.driver_name || r.name || r.drivername;
                if (nameFromFlat) {
                    return {
                        ...r,
                        driver: {
                            id: r.driverId || r.driver_id || null,
                            name: nameFromFlat,
                            driverRating: r.driverRating ?? r.driver_rating ?? null,
                        }
                    };
                }

                // Finally, if the response came from our new RideResponse DTO, it should have driver with fields; but if it's missing, leave null
                return { ...r, driver: r.driver || null };
            });

            console.debug('[PassengerDashboard] normalized rides:', normalized);

            setRides(normalized);
            setAvailableRides(normalized);
            setResultsPage(0); // reset results pagination on every new search
            
            // Extract and aggregate pickup and drop locations from all rides
            const allPickupLocations = new Set();
            const allDropLocations = new Set();
            normalized.forEach(ride => {
                if (ride.pickupLocationsJson) {
                    try {
                        const locations = JSON.parse(ride.pickupLocationsJson);
                        locations.forEach(loc => {
                            if (loc && loc.trim()) {
                                allPickupLocations.add(loc.trim());
                            }
                        });
                    } catch (e) {
                        console.error('Error parsing pickup locations:', e);
                    }
                }
                if (ride.dropLocationsJson) {
                    try {
                        const locations = JSON.parse(ride.dropLocationsJson);
                        locations.forEach(loc => {
                            if (loc && loc.trim()) {
                                allDropLocations.add(loc.trim());
                            }
                        });
                    } catch (e) {
                        console.error('Error parsing drop locations:', e);
                    }
                }
            });
            setDriverPickupLocations(Array.from(allPickupLocations));
            setDriverDropLocations(Array.from(allDropLocations));
            
            setActiveTab('results');
        } catch (error) {
            console.error('[PassengerDashboard] search error:', error);
            await showError('Error searching rides');
        } finally {
            setLoading(false);
        }
    };

    const handleBook = async (rideId) => {
        const ride = rides.find(r => r.id === rideId);
        if (!ride) return;
        
        setShowBookingModal({ ...showBookingModal, [rideId]: true });
    };

    const handleConfirmBooking = async (rideId) => {
        const ride = rides.find(r => r.id === rideId);
        const numberOfSeats = selectedSeats[rideId] || 1;

        // Use locations from searchForm (selected in step 2 of wizard) with fallback to ride source/destination
        const pickupLocation = searchForm.source || ride.source || '';
        const dropoffLocation = searchForm.destination || ride.destination || '';

        // Validate that pickup and dropoff locations are available
        if (!pickupLocation || !dropoffLocation) {
            await showError('Pickup and dropoff locations are required. Please go back and select them in the search form.');
            return;
        }

        if (numberOfSeats > ride.availableSeats) {
            await showError(`Only ${ride.availableSeats} seat(s) available`);
            return;
        }

        // Note: Fare will be calculated on backend based on pickup/dropoff locations
        // We'll show an estimated message here
        const confirm = await showConfirm(
            `Create booking request for ${numberOfSeats} seat(s)?\n\n` +
            `From: ${pickupLocation}\n` +
            `To: ${dropoffLocation}\n\n` +
            `The driver will need to accept your booking before you can proceed to payment.`,
            'Yes, Create Booking',
            'Cancel'
        );

        if (!confirm.isConfirmed) return;

        setBookingLoading({ ...bookingLoading, [rideId]: true });
        setShowBookingModal({ ...showBookingModal, [rideId]: false });

        try {
            // Create booking with PENDING status (waiting for driver approval)
            const booking = await bookingService.createBooking({
                rideId,
                pickupLocation: pickupLocation,
                dropoffLocation: dropoffLocation,
                numberOfSeats: numberOfSeats,
            });

            await showSuccess('Booking request created! Waiting for driver approval. You will receive an email notification once the driver accepts your booking.');
            
            // Refresh bookings to show the new pending booking
            await fetchMyBookings();
            setActiveTab('bookings');
         } catch (error) {
             console.error('Error creating booking:', error);
             await showError(error.message || 'Error creating booking. Please try again.');
         } finally {
             setBookingLoading({ ...bookingLoading, [rideId]: false });
         }
    };

    const handleProceedToPayment = async (booking) => {
        if (booking.status !== 'ACCEPTED') {
            await showError('This booking is not yet accepted by the driver.');
            return;
        }

        setPaymentProcessing(true);
        try {
            const bookingFareAmountRaw = booking.fareAmount ?? 0;
            const bookingFareAmount = Number(bookingFareAmountRaw);
            const bookingFareAmountRu = Number.isFinite(bookingFareAmount) ? bookingFareAmount : 0;

            setPendingBooking({
                rideId: booking.ride?.id,
                ride: booking.ride,
                numberOfSeats: booking.numberOfSeats || 1,
                totalFare: bookingFareAmountRu,
                bookingId: booking.id,
                pickupLocation: booking.pickupLocation,
                dropoffLocation: booking.dropoffLocation,
            });

            // Create Razorpay order with the fare amount from booking (in rupees)
            console.log('Creating order for booking:', booking.id, 'Amount (rupees):', bookingFareAmountRu);
            const orderResponse = await paymentService.createOrder({
                amount: bookingFareAmountRu,
                bookingId: booking.id,
                currency: 'INR'
            });

            console.log('Order created successfully:', orderResponse);

            // Set order data for payment modal
            const amountPaiseFromOrder = Number(orderResponse.amount ?? NaN);
            const amountRupeesFromOrder = Number(orderResponse.amountInRupees ?? NaN);
            const fallbackPaise = Math.round(bookingFareAmountRu * 100);

            setPaymentOrderData({
                orderId: orderResponse.orderId,
                amount: Number.isFinite(amountPaiseFromOrder) ? amountPaiseFromOrder : fallbackPaise,
                amountInRupees: Number.isFinite(amountRupeesFromOrder) ? amountRupeesFromOrder : bookingFareAmountRu,
                currency: orderResponse.currency || 'INR',
                keyId: orderResponse.keyId,
                bookingId: booking.id
            });

            setShowPaymentModal(true);
        } catch (error) {
            console.error('Error creating payment order:', error);
            await showError(error.message || 'Error creating payment order. Please try again.');
        } finally {
            setPaymentProcessing(false);
        }
    };

    const handlePaymentSuccess = async (paymentData) => {
        if (!pendingBooking) return;

        setPaymentProcessing(true);
        setShowPaymentModal(false);

        try {
            // Verify payment with backend
            await paymentService.verifyPayment({
                bookingId: pendingBooking.bookingId,
                razorpayOrderId: paymentData.razorpayOrderId,
                razorpayPaymentId: paymentData.razorpayPaymentId,
                razorpaySignature: paymentData.razorpaySignature,
            });

            // Update UI optimistically for faster response
            setSelectedSeats({ ...selectedSeats, [pendingBooking.rideId]: 1 });

            // Optimistically update rides list (reduce available seats)
            setRides((prevRides) =>
                prevRides.map((r) =>
                    r.id === pendingBooking.rideId
                        ? { ...r, availableSeats: r.availableSeats - pendingBooking.numberOfSeats }
                        : r
                )
            );

            // Non-blocking success toast (don't await)
            showSuccess('Payment successful! Ride booked successfully!');

            // Switch to bookings tab immediately
            setActiveTab('bookings');

            // Refresh data in background (non-blocking)
            Promise.all([
                fetchMyBookings(),
                rideService.searchRides(searchForm).then((updatedRides) => {
                    setRides(updatedRides);
                }).catch((err) => {
                    console.error('Error refreshing rides:', err);
                })
            ]).catch((err) => {
                console.error('Error refreshing data:', err);
            });
        } catch (error) {
            console.error('Payment verification error:', error, error.original || error);
            await showError(error.message || 'Payment verification failed. Please contact support.');
            // Booking is still created but payment failed - user can retry
        } finally {
            setPaymentProcessing(false);
            setPendingBooking(null);
            setPaymentOrderData(null);
        }
    };

    const handlePaymentFailure = (error) => {
        setShowPaymentModal(false);
        setPendingBooking(null);
        setPaymentOrderData(null);
        showError(error?.message || 'Payment was cancelled or failed. Please try again.');
    };

    const handleCancelBooking = async (bookingId) => {
        const confirm = await showConfirm(
            'Are you sure you want to cancel this booking?',
            'Yes, Cancel Booking',
            'No'
        );

        if (!confirm.isConfirmed) return;

        setLoading(true);
        try {
            const resp = await bookingService.cancelBooking(bookingId);
            // If server returned consolidated response, update local state
            if (resp && resp.myBookings) {
                setBookings(Array.isArray(resp.myBookings) ? resp.myBookings : []);
            } else {
                // fallback: remove cancelled booking locally
                setBookings(prev => prev.map(b => b.id === bookingId ? ({...b, status: 'CANCELLED'}) : b));
            }

            // If server returned updated ride, update rides list to reflect available seats
            if (resp && resp.updatedRide && Array.isArray(rides)) {
                setRides(prev => prev.map(r => r.id === resp.updatedRide.id ? resp.updatedRide : r));
            }

            await showSuccess('Booking cancelled successfully!');
        } catch (error) {
            console.error('Cancel booking error (passenger):', error, error.original || error);
            await showError(error.message || 'Error cancelling booking');
        } finally {
            setLoading(false);
        }
    };



    // New helper functions to extract driver name and rating from various possible fields
    const getDriverName = (ride) => {
        if (!ride) return 'N/A';
        // Priority: Check ride.driver.name first (from RideResponse.DriverInfo)
        // Then check flat fields, then fallback to email
        const name = (
            ride?.driver?.name ||
            ride?.driverName ||
            ride?.driver_name ||
            ride?.drivername ||
            (typeof ride.driver === 'string' ? ride.driver : null) ||
            ride?.driver?.fullName ||
            ride?.driver?.email ||
            'N/A'
        );
        // If we got email as fallback, still show it (better than N/A)
        // But prefer showing the actual name from driver.name
        return name && name !== 'N/A' ? name : 'N/A';
    };

    const getDriverRating = (ride) => {
        const raw = ride?.driver?.driverRating ?? ride?.driverRating ?? ride?.driver_rating ?? null;
        const num = raw !== null && raw !== undefined ? Number(raw) : null;
        return Number.isNaN(num) ? null : num;
    };

    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            <Navbar />

            <main className="flex-grow max-w-7xl mx-auto w-full px-3 sm:px-5 lg:px-6 py-5">
                <BackButton />

                {/* Header Section */}
                <div className="mb-6 bg-gradient-to-r from-white via-purple-50/30 to-blue-50/30 rounded-xl shadow-2xl p-5 border-2 border-purple-200/50 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg">
                                <Ticket className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center space-x-2">
                                    <span>Passenger Dashboard</span>
                                </h1>
                                <p className="text-gray-600 mt-1 text-sm">Search and book rides easily</p>
                            </div>
                        </div>
                        <div className="p-3 bg-gradient-to-br from-purple-100 to-blue-100 rounded-xl shadow-md border border-purple-200/50">
                            <Navigation className="h-5 w-5 text-purple-600" />
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex space-x-3 mb-6 bg-white rounded-xl shadow-xl p-2 border border-gray-100">
                    <button
                        onClick={() => setActiveTab('search')}
                        className={`flex-1 px-5 py-3 font-bold rounded-lg transition-all text-base flex items-center justify-center space-x-2 ${
                            activeTab === 'search'
                                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-xl transform scale-105'
                                : 'text-gray-600 hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50'
                        }`}
                    >
                        <Search className="h-4 w-4" />
                        <span>Search Rides</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('bookings')}
                        className={`flex-1 px-5 py-3 font-bold rounded-lg transition-all text-base flex items-center justify-center space-x-2 ${
                            activeTab === 'bookings'
                                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-xl transform scale-105'
                                : 'text-gray-600 hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50'
                        }`}
                    >
                        <CheckCircle className="h-4 w-4" />
                        <span>My Bookings ({filteredBookings.length})</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex-1 px-5 py-3 font-bold rounded-lg transition-all text-base flex items-center justify-center space-x-2 ${
                            activeTab === 'history'
                                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-xl transform scale-105'
                                : 'text-gray-600 hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50'
                        }`}
                    >
                        <History className="h-4 w-4" />
                        <span>History ({rideHistory.length})</span>
                    </button>
                </div>

                {activeTab === 'search' && (
                    <div className="bg-white rounded-xl shadow-2xl p-6 mb-6 border border-gray-100">
                        <h2 className="text-2xl font-bold mb-6 flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                            <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
                                <Search className="h-5 w-5 text-white" />
                            </div>
                            <span>Search Rides</span>
                        </h2>

                        {/* Stepper */}
                        <div className="flex items-center justify-center space-x-4 mb-6">
                            {[1,2,3].map((step) => (
                                <div key={step} className="flex items-center">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${wizardStep >= step ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
                                        {step}
                                    </div>
                                    {step !== 3 && (
                                        <div className={`w-10 h-1 mx-2 ${wizardStep > step ? 'bg-purple-600' : 'bg-gray-200'}`}></div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Step 1: Pick From & To Cities (cities only) */}
                        {wizardStep === 1 && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">From City *</label>
                                        <CityAutocomplete
                                            value={fromCity}
                                            onChange={(v) => {
                                                setFromCity(v);
                                                setSearchForm({ ...searchForm, source: '' });
                                            }}
                                            placeholder="Type a city (e.g., Chennai)"
                                            mode="city"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">To City *</label>
                                        <CityAutocomplete
                                            value={toCity}
                                            onChange={(v) => {
                                                setToCity(v);
                                                setSearchForm({ ...searchForm, destination: '' });
                                            }}
                                            placeholder="Type a city (e.g., Bengaluru)"
                                            mode="city"
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <button
                                        disabled={!fromCity || !toCity || fromCity.trim().length < 2 || toCity.trim().length < 2}
                                        onClick={goNext}
                                        className="px-6 py-2 bg-purple-600 text-white rounded-lg disabled:opacity-50"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Select Pickup and Drop Locations from Driver's Choices */}
                        {wizardStep === 2 && (
                            <div className="space-y-6">
                                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg">
                                    <h3 className="text-sm font-semibold text-blue-800 mb-2">Select Your Pickup and Drop Locations</h3>
                                    <p className="text-xs text-blue-700">
                                        Select your pickup location in {fromCity} and drop location in {toCity} from the driver's available choices.
                                        {driverPickupLocations.length === 0 && driverDropLocations.length === 0 && (
                                            <span className="text-yellow-700 font-semibold"> No driver locations available. Please try different cities or check back later.</span>
                                        )}
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">From City</label>
                                        <div className="text-sm font-medium text-gray-900 px-4 py-3 bg-gray-50 rounded-lg border-2 border-gray-200">
                                            {fromCity}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">To City</label>
                                        <div className="text-sm font-medium text-gray-900 px-4 py-3 bg-gray-50 rounded-lg border-2 border-gray-200">
                                            {toCity}
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Pickup Location in {fromCity} *</label>
                                        {driverPickupLocations.length > 0 ? (
                                            <select
                                                value={searchForm.source}
                                                onChange={(e) => setSearchForm({ ...searchForm, source: e.target.value })}
                                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-800"
                                            >
                                                <option value="">Select pickup location</option>
                                                {driverPickupLocations.map((location, idx) => (
                                                    <option key={idx} value={location}>{location}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <div className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-gray-100 text-gray-500 text-sm">
                                                No pickup locations available from drivers
                                            </div>
                                        )}
                                        {driverPickupLocations.length > 0 && (
                                            <p className="text-xs text-purple-600 mt-2">
                                                ★ {driverPickupLocations.length} driver-selected pickup location{driverPickupLocations.length !== 1 ? 's' : ''} available
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Drop Location in {toCity} *</label>
                                        {driverDropLocations.length > 0 ? (
                                            <select
                                                value={searchForm.destination}
                                                onChange={(e) => setSearchForm({ ...searchForm, destination: e.target.value })}
                                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-800"
                                            >
                                                <option value="">Select drop location</option>
                                                {driverDropLocations.map((location, idx) => (
                                                    <option key={idx} value={location}>{location}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <div className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-gray-100 text-gray-500 text-sm">
                                                No drop locations available from drivers
                                            </div>
                                        )}
                                        {driverDropLocations.length > 0 && (
                                            <p className="text-xs text-purple-600 mt-2">
                                                ★ {driverDropLocations.length} driver-selected drop location{driverDropLocations.length !== 1 ? 's' : ''} available
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex justify-between">
                                    <button type="button" onClick={goPrev} className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors">Back</button>
                                    <button
                                        onClick={goNext}
                                        disabled={!searchForm.source || !searchForm.destination || driverPickupLocations.length === 0 || driverDropLocations.length === 0}
                                        className="px-6 py-2 bg-purple-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-700 transition-colors"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Review and Date Selection */}
                        {wizardStep === 3 && (
                            <form onSubmit={handleSearch} className="space-y-6">
                                {/* Review Selected Locations */}
                                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg">
                                    <h3 className="text-sm font-semibold text-blue-800 mb-3">Review Your Route</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-blue-700 mb-1">From City</label>
                                            <div className="text-sm font-medium text-gray-900">{fromCity}</div>
                                            <label className="block text-xs font-semibold text-blue-700 mb-1 mt-2">Pickup Location</label>
                                            <div className="text-sm text-gray-700">{searchForm.source || 'Not selected'}</div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-blue-700 mb-1">To City</label>
                                            <div className="text-sm font-medium text-gray-900">{toCity}</div>
                                            <label className="block text-xs font-semibold text-blue-700 mb-1 mt-2">Drop Location</label>
                                            <div className="text-sm text-gray-700">{searchForm.destination || 'Not selected'}</div>
                                        </div>
                                    </div>
                                    <p className="text-xs text-blue-600 mt-3">
                                        ℹ️ Fare will be calculated based on your selected pickup and drop locations.
                                    </p>
                                </div>

                                {/* Date Selection */}
                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Travel Date *</label>
                                        <input
                                            type="date"
                                            required
                                            value={searchForm.date}
                                            onChange={(e) => setSearchForm({ ...searchForm, date: e.target.value })}
                                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                            min={new Date().toISOString().split('T')[0]}
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-between">
                                    <button type="button" onClick={goPrev} className="px-6 py-2 bg-gray-200 rounded-lg">Back</button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 font-semibold shadow-lg transform hover:scale-105 transition-all flex items-center justify-center space-x-2"
                                    >
                                        {loading ? (
                                            <>
                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                                <span>Searching...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Search className="h-5 w-5" />
                                                <span>Search Rides</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                )}

                {activeTab === 'results' && (
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                        <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4">
                            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                                <Car className="h-5 w-5" />
                                <span>Available Rides</span>
                            </h2>
                        </div>
                        <div className="divide-y divide-gray-200">
                            {rides.length === 0 ? (
                                <div className="p-12 text-center">
                                    <MapPin className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-600 text-base font-medium">No rides found</p>
                                    <p className="text-gray-500 text-xs mt-2">Try adjusting your search criteria</p>
                                </div>
                            ) : (
                                (() => {
                                    const totalPages = Math.max(1, Math.ceil(rides.length / resultsSize));
                                    const start = resultsPage * resultsSize;
                                    const displayed = rides.slice(start, start + resultsSize);
                                    return (
                                        <>
                                            {displayed.map((ride) => (
                                    <div key={ride.id} className="p-6 hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 transition-all">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="flex items-center space-x-4 mb-3">
                                                    <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg p-2">
                                                        <MapPin className="h-6 w-6 text-white" />
                                                    </div>
                                                    <div>
                                                        <span className="font-bold text-lg text-gray-900">{ride.source}</span>
                                                        <span className="mx-3 text-gray-400">→</span>
                                                        <span className="font-bold text-lg text-gray-900">{ride.destination}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-6 text-sm text-gray-600 mb-3">
                                                    <div className="flex items-center space-x-2 bg-gray-100 px-3 py-1 rounded-lg">
                                                        <Calendar className="h-4 w-4" />
                                                        <span className="font-medium">{formatDate(ride.date)}</span>
                                                    </div>
                                                    <div className="flex items-center space-x-2 bg-gray-100 px-3 py-1 rounded-lg">
                                                        <Clock className="h-4 w-4" />
                                                        <span className="font-medium">{formatTime(ride.time)}</span>
                                                    </div>
                                                    <div className="flex items-center space-x-2 bg-gray-100 px-3 py-1 rounded-lg">
                                                        <User className="h-4 w-4" />
                                                        <span className="font-medium">{ride.availableSeats} seats available</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-4 mb-3">
                                                    <div className="flex items-center space-x-2 bg-gray-100 px-3 py-1 rounded-lg">
                                                        <Car className="h-4 w-4 text-gray-500" />
                                                        <span className="font-medium text-gray-700">Driver: {getDriverName(ride)}</span>
                                                    </div>
                                                    <div className="flex items-center space-x-2 bg-gray-100 px-3 py-1 rounded-lg">
                                                        <Star className="h-4 w-4 text-gray-500" />
                                                        <span className="font-medium text-gray-700">
                                                            {(() => {
                                                                const r = getDriverRating(ride);
                                                                return r !== null && !isNaN(r) ? r.toFixed(1) : 'N/A';
                                                            })()}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Vehicle Photos */}
                                                {ride.vehiclePhotosJson && (() => {
                                                    try {
                                                        const photos = JSON.parse(ride.vehiclePhotosJson);
                                                        return photos.length > 0 ? (
                                                            <div className="mb-3">
                                                                <div className="text-xs font-semibold text-gray-600 mb-2 flex items-center">
                                                                    <ZoomIn className="h-3 w-3 mr-1" />
                                                                    Vehicle Photos (Click to view):
                                                                </div>
                                                                <div className="flex space-x-2 overflow-x-auto">
                                                                    {photos.slice(0, 3).map((photo, idx) => (
                                                                        <div
                                                                            key={idx}
                                                                            onClick={() => openPhotoViewer(photos, idx)}
                                                                            className="relative cursor-pointer hover:opacity-80 transition-opacity group"
                                                                        >
                                                                            <img
                                                                                src={photo}
                                                                                alt={`Vehicle ${idx + 1}`}
                                                                                className="w-20 h-20 object-cover rounded-lg border-2 border-gray-300"
                                                                            />
                                                                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all flex items-center justify-center">
                                                                                <ZoomIn className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                    {photos.length > 3 && (
                                                                        <div
                                                                            onClick={() => openPhotoViewer(photos, 3)}
                                                                            className="w-20 h-20 bg-gray-200 hover:bg-gray-300 rounded-lg border-2 border-gray-300 flex items-center justify-center text-xs text-gray-600 cursor-pointer transition-colors"
                                                                        >
                                                                            +{photos.length - 3} more
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ) : null;
                                                    } catch (e) {
                                                        return null;
                                                    }
                                                })()}

                                                {/* Vehicle Condition Details */}
                                                {(ride.hasAC !== null || ride.vehicleType || ride.vehicleModel || ride.vehicleColor) && (
                                                    <div className="bg-gray-50 rounded-lg p-3 mb-3">
                                                        <div className="text-xs font-semibold text-gray-600 mb-2">Vehicle Details:</div>
                                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                                            {ride.vehicleType && (
                                                                <div>
                                                                    <span className="text-gray-600">Type:</span>
                                                                    <span className="font-medium ml-1">{ride.vehicleType}</span>
                                                                </div>
                                                            )}
                                                            {ride.hasAC !== null && (
                                                                <div className="flex items-center">
                                                                    <Snowflake className={`h-3 w-3 mr-1 ${ride.hasAC ? 'text-blue-500' : 'text-gray-400'}`} />
                                                                    <span className="text-gray-600">AC:</span>
                                                                    <span className="font-medium ml-1">{ride.hasAC ? 'Yes' : 'No'}</span>
                                                                </div>
                                                            )}
                                                            {ride.vehicleModel && (
                                                                <div>
                                                                    <span className="text-gray-600">Model:</span>
                                                                    <span className="font-medium ml-1">{ride.vehicleModel}</span>
                                                                </div>
                                                            )}
                                                            {ride.vehicleColor && (
                                                                <div>
                                                                    <span className="text-gray-600">Color:</span>
                                                                    <span className="font-medium ml-1">{ride.vehicleColor}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        {ride.otherFeatures && (
                                                            <div className="mt-2 text-xs">
                                                                <span className="text-gray-600">Features: </span>
                                                                <span className="font-medium">{ride.otherFeatures}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="ml-6 flex flex-col items-end space-y-2">
                                                <div className="text-right">
                                                    <div className="text-xs text-gray-600">Fare per Seat</div>
                                                    <div className="text-xl font-bold text-green-600">₹{ride.estimatedFare?.toFixed(2) || 'N/A'}</div>
                                                </div>
                                                {showBookingModal[ride.id] ? (
                                                    <div className="bg-white border-2 border-purple-300 rounded-lg p-4 shadow-lg min-w-[300px] max-w-[400px]">
                                                        <div className="mb-4">
                                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                                Number of Seats (Max: {ride.availableSeats})
                                                            </label>
                                                            <input
                                                                type="number"
                                                                min={1}
                                                                max={ride.availableSeats}
                                                                value={selectedSeats[ride.id] || 1}
                                                                onChange={(e) => {
                                                                    const val = parseInt(e.target.value) || 1;
                                                                    const maxVal = Math.min(val, ride.availableSeats);
                                                                    setSelectedSeats({ ...selectedSeats, [ride.id]: Math.max(1, maxVal) });
                                                                }}
                                                                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                                                            />
                                                        </div>
                                                        <div className="text-xs text-gray-600 mb-3">
                                                            Estimated Total: ₹{((ride.estimatedFare || 0) * (selectedSeats[ride.id] || 1)).toFixed(2)}
                                                        </div>
                                                        <div className="flex space-x-2">
                                                            <button
                                                                onClick={() => handleConfirmBooking(ride.id)}
                                                                disabled={!!bookingLoading[ride.id]}
                                                                className={`flex-1 px-4 py-2 rounded-lg text-white text-sm font-semibold ${bookingLoading[ride.id] ? 'bg-green-400 cursor-not-allowed' : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'}`}
                                                            >
                                                                {bookingLoading[ride.id] ? 'Booking…' : 'Confirm'}
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setShowBookingModal({ ...showBookingModal, [ride.id]: false });
                                                                    setSelectedSeats({ ...selectedSeats, [ride.id]: 1 });
                                                                }}
                                                                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 text-sm font-semibold"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedSeats({ ...selectedSeats, [ride.id]: 1 });
                                                            handleBook(ride.id);
                                                        }}
                                                        disabled={ride.availableSeats === 0 || bookingLoading[ride.id]}
                                                        className={`px-6 py-3 rounded-lg font-semibold shadow-lg transform hover:scale-105 transition-all ${
                                                            ride.availableSeats === 0 || bookingLoading[ride.id]
                                                                ? 'bg-gray-400 text-white cursor-not-allowed'
                                                                : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700'
                                                        }`}
                                                    >
                                                        {ride.availableSeats === 0 ? 'Full' : bookingLoading[ride.id] ? (
                                                            <>
                                                                <Loader className="h-4 w-4 animate-spin inline mr-2" />
                                                                Processing…
                                                            </>
                                                        ) : 'Book Now'}
                                                    </button>
                                                )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {/* Pagination controls */}
                                    <div className="flex items-center justify-between px-6 py-4 border-t">
                                        <button
                                            onClick={() => setResultsPage((p) => Math.max(0, p - 1))}
                                            disabled={resultsPage === 0}
                                            className={`px-4 py-2 rounded-lg ${resultsPage === 0 ? 'bg-gray-200 text-gray-500' : 'bg-white border hover:bg-gray-100'}`}
                                        >
                                            Prev
                                        </button>
                                        <div className="text-sm text-gray-600">
                                            Page {resultsPage + 1} of {totalPages} — {displayed.length} rides
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={() => setResultsPage((p) => Math.min(totalPages - 1, p + 1))}
                                                disabled={resultsPage + 1 >= totalPages}
                                                className={`px-4 py-2 rounded-lg ${resultsPage + 1 >= totalPages ? 'bg-gray-200 text-gray-500' : 'bg-white border hover:bg-gray-100'}`}
                                            >
                                                Next
                                            </button>
                                            <select
                                                value={resultsSize}
                                                onChange={(e) => { setResultsPage(0); setResultsSize(parseInt(e.target.value, 10)); }}
                                                className="ml-2 px-2 py-1 border rounded-md bg-white text-sm"
                                            >
                                                {[5,10,20].map(s => (<option key={s} value={s}>{s} / page</option>))}
                                            </select>
                                        </div>
                                    </div>
                                        </>
                                    );
                                })()
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'bookings' && (
                    <div className="bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-100">
                        <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-5">
                            <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
                                <Ticket className="h-5 w-5" />
                                <span>My Bookings ({filteredBookings.length})</span>
                            </h2>
                        </div>
                        <div className="divide-y divide-gray-200">
                            {displayedBookings.length === 0 ? (
                                <div className="p-12 text-center">
                                    <Ticket className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-600 text-base font-medium">No bookings yet</p>
                                    <p className="text-gray-500 text-xs mt-2">Start searching for rides!</p>
                                </div>
                            ) : (
                                displayedBookings.map((booking) => (
                                    <div key={booking.id} className="p-6 hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 transition-all">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="flex items-center space-x-4 mb-3">
                                                    <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg p-2">
                                                        <MapPin className="h-6 w-6 text-white" />
                                                    </div>
                                                    <div>
                                                        <span className="font-bold text-lg text-gray-900">{booking.pickupLocation || booking.ride?.source}</span>
                                                        <span className="mx-3 text-gray-400">→</span>
                                                        <span className="font-bold text-lg text-gray-900">{booking.dropoffLocation || booking.ride?.destination}</span>
                                                    </div>
                                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                                        booking.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                                                            booking.status === 'ACCEPTED' ? 'bg-blue-100 text-blue-800' :
                                                                booking.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                                                    'bg-red-100 text-red-800'
                                                    }`}>
                            {booking.status}
                          </span>
                                                </div>
                                                <div className="mb-3">
                                                    <div className="text-xs text-gray-600 mb-1">Route Details</div>
                                                    <div className="flex flex-col space-y-1 text-sm">
                                                        <div className="flex items-center space-x-2">
                                                            <MapPin className="h-4 w-4 text-gray-500" />
                                                            <span className="text-gray-700"><strong>Pickup 1:</strong> {booking.pickupLocation || booking.ride?.source}</span>
                                                        </div>
                                                        {booking.pickupLocation2 && (
                                                            <div className="flex items-center space-x-2 ml-6">
                                                                <MapPin className="h-4 w-4 text-gray-500" />
                                                                <span className="text-gray-700"><strong>Pickup 2:</strong> {booking.pickupLocation2}</span>
                                                            </div>
                                                        )}
                                                        <div className="flex items-center space-x-2">
                                                            <span className="mx-2 text-gray-400">→</span>
                                                            <span className="text-gray-700"><strong>Drop:</strong> {booking.dropoffLocation || booking.ride?.destination}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                                                    <div className="bg-gray-50 px-3 py-2 rounded-lg">
                                                        <div className="text-gray-600">Date</div>
                                                        <div className="font-semibold text-gray-900">{formatDate(booking.ride?.date)}</div>
                                                    </div>
                                                    <div className="bg-gray-50 px-3 py-2 rounded-lg">
                                                        <div className="text-gray-600">Time</div>
                                                        <div className="font-semibold text-gray-900">{formatTime(booking.ride?.time)}</div>
                                                    </div>
                                                    <div className="bg-gray-50 px-3 py-2 rounded-lg">
                                                        <div className="text-gray-600">Fare</div>
                                                        <div className="font-semibold text-green-600">₹{booking.fareAmount?.toFixed(2) || 'N/A'}</div>
                                                    </div>
                                                    <div className="bg-gray-50 px-3 py-2 rounded-lg">
                                                        <div className="text-gray-600">Seats</div>
                                                        <div className="font-semibold text-gray-900">{booking.numberOfSeats || 1}</div>
                                                    </div>
                                                </div>

                                                {/* Vehicle Photos in Booking */}
                                                {booking.ride?.vehiclePhotosJson && (() => {
                                                    try {
                                                        const photos = JSON.parse(booking.ride.vehiclePhotosJson);
                                                        return photos.length > 0 ? (
                                                            <div className="mb-4">
                                                                <div className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                                                                    <ZoomIn className="h-4 w-4 mr-2" />
                                                                    Vehicle Photos (Click to view):
                                                                </div>
                                                                <div className="flex space-x-2 overflow-x-auto">
                                                                    {photos.map((photo, idx) => (
                                                                        <div
                                                                            key={idx}
                                                                            onClick={() => openPhotoViewer(photos, idx)}
                                                                            className="relative cursor-pointer hover:opacity-80 transition-opacity group"
                                                                        >
                                                                            <img
                                                                                src={photo}
                                                                                alt={`Vehicle ${idx + 1}`}
                                                                                className="w-24 h-24 object-cover rounded-lg border-2 border-gray-300"
                                                                            />
                                                                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all flex items-center justify-center">
                                                                                <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ) : null;
                                                    } catch (e) {
                                                        return null;
                                                    }
                                                })()}

                                                {/* Vehicle Condition Details in Booking */}
                                                {(booking.ride?.hasAC !== null || booking.ride?.vehicleType || booking.ride?.vehicleModel || booking.ride?.vehicleColor) && (
                                                    <div className="bg-blue-50 rounded-lg p-4 mb-4 border-2 border-blue-200">
                                                        <div className="text-sm font-semibold text-gray-700 mb-3">Vehicle Details:</div>
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                                            {booking.ride.vehicleType && (
                                                                <div>
                                                                    <span className="text-gray-600 block mb-1">Vehicle Type:</span>
                                                                    <span className="font-semibold text-gray-900">{booking.ride.vehicleType}</span>
                                                                </div>
                                                            )}
                                                            {booking.ride.hasAC !== null && (
                                                                <div>
                                                                    <span className="text-gray-600 block mb-1">AC:</span>
                                                                    <div className="flex items-center">
                                                                        <Snowflake className={`h-4 w-4 mr-1 ${booking.ride.hasAC ? 'text-blue-500' : 'text-gray-400'}`} />
                                                                        <span className="font-semibold text-gray-900">{booking.ride.hasAC ? 'Yes' : 'No'}</span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {booking.ride.vehicleModel && (
                                                                <div>
                                                                    <span className="text-gray-600 block mb-1">Model:</span>
                                                                    <span className="font-semibold text-gray-900">{booking.ride.vehicleModel}</span>
                                                                </div>
                                                            )}
                                                            {booking.ride.vehicleColor && (
                                                                <div>
                                                                    <span className="text-gray-600 block mb-1">Color:</span>
                                                                    <span className="font-semibold text-gray-900">{booking.ride.vehicleColor}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        {booking.ride.otherFeatures && (
                                                            <div className="mt-3 pt-3 border-t border-blue-200">
                                                                <span className="text-gray-600 text-sm block mb-1">Additional Features:</span>
                                                                <span className="font-medium text-gray-800">{booking.ride.otherFeatures}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                {booking.status === 'PENDING' && (
                                                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                                        <p className="text-sm text-yellow-800 mb-2">
                                                            <strong>Waiting for driver approval.</strong> You will receive an email notification once the driver accepts your booking.
                                                        </p>
                                                        <button
                                                            onClick={() => handleCancelBooking(booking.id)}
                                                            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-semibold shadow-md transform hover:scale-105 transition-all"
                                                        >
                                                            Cancel Booking Request
                                                        </button>
                                                    </div>
                                                )}
                                                {booking.status === 'ACCEPTED' && (
                                                    <div className="mt-4 flex space-x-2">
                                                        <button
                                                            onClick={() => handleProceedToPayment(booking)}
                                                            disabled={paymentProcessing}
                                                            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold shadow-md transform hover:scale-105 transition-all flex items-center space-x-1"
                                                        >
                                                            {paymentProcessing ? (
                                                                <>
                                                                    <Loader className="h-4 w-4 animate-spin" />
                                                                    <span>Processing...</span>
                                                                </>
                                                            ) : (
                                                                <span>Proceed to Payment</span>
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={() => handleCancelBooking(booking.id)}
                                                            disabled={paymentProcessing}
                                                            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold shadow-md transform hover:scale-105 transition-all"
                                                        >
                                                            Cancel Booking
                                                        </button>
                                                    </div>
                                                )}
                                                {booking.status === 'RESCHEDULED' && (
                                                    <div className="mt-4 p-4 bg-orange-50 border-l-4 border-orange-400 rounded-lg">
                                                        <p className="text-sm font-semibold text-orange-800 mb-2">
                                                            ⚠️ Ride Rescheduled by Driver
                                                        </p>
                                                        <p className="text-sm text-orange-700 mb-4">
                                                            The driver has rescheduled this ride. Please review the new schedule and choose to accept or cancel.
                                                        </p>
                                                        <div className="flex space-x-2">
                                                            <button
                                                                onClick={async () => {
                                                                    try {
                                                                        setLoading(true);
                                                                        await bookingService.acceptRescheduledRide(booking.id);
                                                                        await showSuccess('Rescheduled ride accepted successfully!');
                                                                        await fetchMyBookings();
                                                                    } catch (error) {
                                                                        await showError(error.message || 'Error accepting rescheduled ride');
                                                                    } finally {
                                                                        setLoading(false);
                                                                    }
                                                                }}
                                                                disabled={loading}
                                                                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold shadow-md transform hover:scale-105 transition-all"
                                                            >
                                                                Accept New Schedule
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    const confirm = await showConfirm(
                                                                        'Are you sure you want to cancel this rescheduled ride?',
                                                                        'Yes, Cancel',
                                                                        'No'
                                                                    );
                                                                    if (!confirm.isConfirmed) return;
                                                                    try {
                                                                        setLoading(true);
                                                                        await bookingService.cancelRescheduledRide(booking.id);
                                                                        await showSuccess('Rescheduled ride cancelled successfully!');
                                                                        await fetchMyBookings();
                                                                    } catch (error) {
                                                                        await showError(error.message || 'Error cancelling rescheduled ride');
                                                                    } finally {
                                                                        setLoading(false);
                                                                    }
                                                                }}
                                                                disabled={loading}
                                                                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold shadow-md transform hover:scale-105 transition-all"
                                                            >
                                                                Cancel Booking
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                                {booking.status === 'CONFIRMED' && booking.status !== 'COMPLETED' && (
                                                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                                                        <p className="text-sm text-green-800 mb-2">
                                                            <strong>Booking Confirmed!</strong> Your payment has been processed. Please be ready at the pickup location.
                                                        </p>
                                                        <div className="flex space-x-2">
                                                            <button
                                                                onClick={() => handlePrintReceipt(booking)}
                                                                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-semibold shadow-md transform hover:scale-105 transition-all flex items-center space-x-1"
                                                            >
                                                                <Printer className="h-4 w-4" />
                                                                <span>Print Receipt</span>
                                                            </button>
                                                            <button
                                                                onClick={() => handleCancelBooking(booking.id)}
                                                                disabled={loading}
                                                                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold shadow-md transform hover:scale-105 transition-all"
                                                            >
                                                                Cancel Booking
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Pagination Controls - show when more than one page */}
                        {((bookingsTotalPages > 0 && bookingsTotalPages > 1) || (bookingsTotalPages === 0 && filteredBookings.length > bookingsSize)) && (
                            <div className="px-6 py-4 flex items-center justify-between bg-white border-t">
                                <div className="text-sm text-gray-600">Showing page {bookingsPage + 1} {bookingsTotalPages > 0 ? `of ${bookingsTotalPages}` : ''} — {filteredBookings.length} bookings</div>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => fetchBookingsPage(Math.max(0, bookingsPage - 1))}
                                        disabled={bookingsPage <= 0}
                                        className={`px-3 py-1 rounded-md ${bookingsPage <= 0 ? 'bg-gray-200 text-gray-500' : 'bg-white border'}`}
                                    >Prev</button>

                                    <div className="flex items-center space-x-1">
                                        {Array.from({ length: bookingsTotalPages > 0 ? bookingsTotalPages : Math.ceil(Math.max(1, filteredBookings.length) / bookingsSize) }).map((_, idx) => {
                                            const total = bookingsTotalPages > 0 ? bookingsTotalPages : Math.ceil(Math.max(1, filteredBookings.length) / bookingsSize);
                                            // Simple logic to show a few pages around the current one plus ends
                                            const isCurrent = idx === bookingsPage;
                                            const isEdge = idx === 0 || idx === total - 1;
                                            const isNear = Math.abs(idx - bookingsPage) <= 2;
                                            const isEllipsisStart = !isNear && idx === 1;
                                            const isEllipsisEnd = !isNear && idx === total - 2;

                                            if (!isCurrent && !isEdge && !isNear) {
                                                if (isEllipsisStart) return <span key="ellipsis-start" className="px-3 py-1 text-gray-500">...</span>;
                                                if (isEllipsisEnd) return <span key="ellipsis-end" className="px-3 py-1 text-gray-500">...</span>;
                                                return null;
                                            }

                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={() => fetchBookingsPage(idx)}
                                                    className={`px-3 py-1 rounded-md ${isCurrent ? 'bg-purple-600 text-white' : 'bg-white border hover:bg-gray-100'}`}
                                                >{idx + 1}</button>
                                            );
                                        })}
                                    </div>

                                    <button
                                        onClick={() => fetchBookingsPage(Math.min((bookingsTotalPages > 0 ? bookingsTotalPages - 1 : Math.max(0, Math.ceil(filteredBookings.length / bookingsSize) - 1)), bookingsPage + 1))}
                                        disabled={bookingsPage >= ((bookingsTotalPages > 0 ? bookingsTotalPages - 1 : Math.max(0, Math.ceil(filteredBookings.length / bookingsSize) - 1)))}
                                        className={`px-3 py-1 rounded-md ${bookingsPage >= ((bookingsTotalPages > 0 ? bookingsTotalPages - 1 : Math.max(0, Math.ceil(filteredBookings.length / bookingsSize) - 1))) ? 'bg-gray-200 text-gray-500' : 'bg-white border'}`}
                                    >Next</button>
                                </div>
                            </div>
                        )}
                    </div>
                    )}

                {activeTab === 'history' && (
                    <div className="bg-white rounded-xl shadow-2xl p-6 border border-gray-100">
                        <h2 className="text-2xl font-bold mb-6 flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                            <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
                                <History className="h-5 w-5 text-white" />
                            </div>
                            <span>Ride History ({rideHistory.length})</span>
                        </h2>
                        {rideHistory.length === 0 ? (
                            <div className="text-center py-12">
                                <History className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500 text-lg">No ride history found.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {displayedHistory.map(booking => (
                                    <div key={booking.id} className="bg-gradient-to-r from-purple-50/80 to-blue-50/80 rounded-xl shadow-lg p-5 border-2 border-purple-200/50 hover:shadow-xl transition-all">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center space-x-2 mb-2">
                                                    <h3 className="text-lg font-semibold text-gray-800">
                                                        {booking.pickupLocation} <span className="text-gray-500">→</span> {booking.dropoffLocation}
                                                    </h3>
                                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                                        booking.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                                        booking.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-800' :
                                                        'bg-red-100 text-red-800'
                                                    }`}>
                                                        {booking.status}
                                                    </span>
                                                </div>
                                                <div className="text-sm text-gray-600 mb-2">
                                                    <p><strong>Ride:</strong> {(booking.ride?.citySource || booking.ride?.source)} → {(booking.ride?.cityDestination || booking.ride?.destination)}</p>
                                                    <p><strong>Driver:</strong> {getDriverName(booking.ride) || 'N/A'}</p>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2 text-xs mt-2">
                                                    <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-gray-100 text-gray-800">
                                                        <Calendar className="h-3.5 w-3.5" />
                                                        <span>{booking.ride?.date ? new Date(booking.ride.date).toLocaleDateString() : 'N/A'}</span>
                                                    </span>
                                                    <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-gray-100 text-gray-800">
                                                        <Clock className="h-3.5 w-3.5" />
                                                        <span>{booking.ride?.time ? new Date(`1970-01-01T${booking.ride.time}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</span>
                                                    </span>
                                                    <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-gray-100 text-gray-800">
                                                        <Users className="h-3.5 w-3.5" />
                                                        <span>{booking.numberOfSeats || 1} seat(s)</span>
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right ml-4 flex flex-col items-end space-y-2">
                                                <div>
                                                    <div className="text-[11px] text-gray-500 leading-tight">Fare Amount</div>
                                                    <div className="text-lg md:text-xl font-bold text-green-600">₹{(booking.fareAmount ?? 0).toFixed(2)}</div>
                                                </div>
                                              <button
                                              onClick={() => handlePrintReceipt(booking)}
                                              className="px-3 py-1.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-xs font-semibold shadow-md transform hover:scale-105 transition-all flex items-center space-x-1"
                                              >
                                              <Printer className="h-3.5 w-3.5" />
                                              <span>Print Receipt</span>
                                              </button>

                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Pagination Controls for History */}
                        {((historyTotalPages > 0 && historyTotalPages > 1) || (historyTotalPages === 0 && rideHistory.length > historySize)) && (
                            <div className="px-6 py-4 flex items-center justify-between bg-white border-t mt-4 rounded-lg">
                                <div className="text-sm text-gray-600">
                                    Showing page {historyPage + 1} {historyTotalPages > 0 ? `of ${historyTotalPages}` : `of ${Math.ceil(rideHistory.length / historySize)}`} — {rideHistory.length} history items
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => {
                                            const newPage = Math.max(0, historyPage - 1);
                                            if (historyTotalPages > 0) {
                                                fetchHistoryPage(newPage, historySize);
                                            } else {
                                                setHistoryPage(newPage);
                                            }
                                        }}
                                        disabled={historyPage <= 0}
                                        className={`px-3 py-1 rounded-md ${historyPage <= 0 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-white border hover:bg-gray-50'}`}
                                    >Prev</button>
                                    <div className="flex items-center space-x-1">
                                        {Array.from({ length: historyTotalPages > 0 ? historyTotalPages : Math.ceil(Math.max(1, rideHistory.length) / historySize) }).map((_, idx) => {
                                            const total = historyTotalPages > 0 ? historyTotalPages : Math.ceil(Math.max(1, rideHistory.length) / historySize);
                                            const isCurrent = idx === historyPage;
                                            const isEdge = idx === 0 || idx === total - 1;
                                            const isNear = Math.abs(idx - historyPage) <= 2;
                                            const isEllipsisStart = !isNear && idx === 1;
                                            const isEllipsisEnd = !isNear && idx === total - 2;

                                            if (!isCurrent && !isEdge && !isNear) {
                                                if (isEllipsisStart) return <span key="ellipsis-start" className="px-3 py-1 text-gray-500">...</span>;
                                                if (isEllipsisEnd) return <span key="ellipsis-end" className="px-3 py-1 text-gray-500">...</span>;
                                                return null;
                                            }

                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={() => {
                                                        if (historyTotalPages > 0) {
                                                            fetchHistoryPage(idx, historySize);
                                                        } else {
                                                            setHistoryPage(idx);
                                                        }
                                                    }}
                                                    className={`px-3 py-1 rounded-md ${isCurrent ? 'bg-purple-600 text-white' : 'bg-white border hover:bg-gray-100'}`}
                                                >{idx + 1}</button>
                                            );
                                        })}
                                    </div>
                                    <button
                                        onClick={() => {
                                            const total = historyTotalPages > 0 ? historyTotalPages - 1 : Math.max(0, Math.ceil(rideHistory.length / historySize) - 1);
                                            const newPage = Math.min(total, historyPage + 1);
                                            if (historyTotalPages > 0) {
                                                fetchHistoryPage(newPage, historySize);
                                            } else {
                                                setHistoryPage(newPage);
                                            }
                                        }}
                                        disabled={historyPage >= (historyTotalPages > 0 ? historyTotalPages - 1 : Math.max(0, Math.ceil(rideHistory.length / historySize) - 1))}
                                        className={`px-3 py-1 rounded-md ${historyPage >= (historyTotalPages > 0 ? historyTotalPages - 1 : Math.max(0, Math.ceil(rideHistory.length / historySize) - 1)) ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-white border hover:bg-gray-50'}`}
                                    >Next</button>
                                    <select
                                        value={historySize}
                                        onChange={(e) => {
                                            const newSize = parseInt(e.target.value, 10);
                                            setHistorySize(newSize);
                                            setHistoryPage(0);
                                            if (historyTotalPages > 0) {
                                                fetchHistoryPage(0, newSize);
                                            }
                                        }}
                                        className="ml-3 px-2 py-1 border rounded-md bg-white text-sm"
                                    >
                                        {[3, 5, 10, 20].map(s => (
                                            <option key={s} value={s}>{s} / page</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Photo Viewer Modal */}
            {photoViewer.open && (
            <div
                className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center"
                onClick={closePhotoViewer}
            >
                <div className="relative max-w-6xl max-h-full p-4" onClick={(e) => e.stopPropagation()}>
                    {/* Close Button */}
                    <button
                        onClick={closePhotoViewer}
                        className="absolute top-4 right-4 text-white bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full p-2 z-10 transition-all"
                    >
                        <X className="h-6 w-6" />
                    </button>

                    {/* Photo Counter */}
                    <div className="absolute top-4 left-4 text-white bg-black bg-opacity-50 rounded-full px-4 py-2 z-10">
                        {photoViewer.currentIndex + 1} / {photoViewer.photos.length}
                    </div>

                    {/* Main Image */}
                    <img
                        src={photoViewer.photos[photoViewer.currentIndex]}
                        alt={`Vehicle photo ${photoViewer.currentIndex + 1}`}
                        className="max-w-full max-h-[90vh] object-contain rounded-lg"
                    />

                    {/* Navigation Buttons */}
                    {photoViewer.photos.length > 1 && (
                        <>
                            {photoViewer.currentIndex > 0 && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        prevPhoto();
                                    }}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full p-3 transition-all"
                                >
                                    <ChevronLeft className="h-6 w-6" />
                                </button>
                            )}
                            {photoViewer.currentIndex < photoViewer.photos.length - 1 && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        nextPhoto();
                                    }}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full p-3 transition-all"
                                >
                                    <ChevronRight className="h-6 w-6" />
                                </button>
                            )}
                        </>
                    )}

                    {/* Thumbnail Strip */}
                    {photoViewer.photos.length > 1 && (
                        <div className="mt-4 flex space-x-2 overflow-x-auto justify-center">
                            {photoViewer.photos.map((photo, idx) => (
                                <img
                                    key={idx}
                                    src={photo}
                                    alt={`Thumbnail ${idx + 1}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setPhotoViewer({ ...photoViewer, currentIndex: idx });
                                    }}
                                    className={`w-16 h-16 object-cover rounded-lg border-2 cursor-pointer transition-all ${
                                        idx === photoViewer.currentIndex
                                            ? 'border-white scale-110'
                                            : 'border-gray-600 opacity-60 hover:opacity-100'
                                    }`}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
            )}

            {/* Razorpay Payment Modal */}
            {pendingBooking && paymentOrderData && (
                <RazorpayPaymentModal
                    isOpen={showPaymentModal}
                    onClose={() => {
                        setShowPaymentModal(false);
                        setPendingBooking(null);
                        setPaymentOrderData(null);
                    }}
                    orderData={paymentOrderData}
                    onPaymentSuccess={handlePaymentSuccess}
                    onPaymentFailure={handlePaymentFailure}
                />
            )}

            {/* Global Loading Overlay - for all operations */}
            {(loading || paymentProcessing || Object.values(bookingLoading).some(v => v)) && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex items-center justify-center">
                    <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
                        <div className="flex flex-col items-center justify-center space-y-4">
                            <Loader className="h-12 w-12 text-purple-600 animate-spin" />
                            <h3 className="text-xl font-semibold text-gray-800">
                                {paymentProcessing ? 'Processing Payment' : 
                                 Object.values(bookingLoading).some(v => v) ? 'Creating Booking' :
                                 'Processing...'}
                            </h3>
                            <p className="text-sm text-gray-600 text-center">
                                {paymentProcessing 
                                    ? 'Please wait while we process your payment. Do not close this window or refresh the page.'
                                    : Object.values(bookingLoading).some(v => v)
                                    ? 'Please wait while we create your booking request...'
                                    : 'Please wait while we process your request...'}
                            </p>
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                                <div className="bg-purple-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <Footer />
        </div>
    );
};

export default PassengerDashboard;

