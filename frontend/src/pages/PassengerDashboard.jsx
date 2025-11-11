import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, MapPin, Calendar, Clock, User, CheckCircle, Car, Navigation, Star, Ticket, Snowflake, ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BackButton from '../components/BackButton';
import CityAutocomplete from '../components/CityAutocomplete';
import LocationAutocompleteWithDriverOptions from '../components/LocationAutocompleteWithDriverOptions';
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
            // Fetch rides to get driver pickup and drop locations (use today's date to get current rides)
            try {
                const today = new Date().toISOString().split('T')[0];
                const searchData = {
                    source: fromCity,
                    destination: toCity,
                    date: today // Use today's date to get available rides
                };
                const data = await rideService.searchRides(searchData);
                const list = Array.isArray(data) ? data : (data && Array.isArray(data.content) ? data.content : []);
                
                // Extract and aggregate pickup locations from all rides
                const allPickupLocations = new Set();
                const allDropLocations = new Set();
                list.forEach(ride => {
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
                setAvailableRides(list);
            } catch (error) {
                console.error('Error fetching rides for locations:', error);
                // Continue anyway, user can still type to search
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
            `Proceed to payment for ${numberOfSeats} seat(s)?\n\n` +
            `From: ${pickupLocation}\n` +
            `To: ${dropoffLocation}\n\n`,
            'Yes, Proceed to Payment',
            'Cancel'
        );

        if (!confirm.isConfirmed) return;

        setPaymentProcessing(true);
        setShowBookingModal({ ...showBookingModal, [rideId]: false });

        try {
            // First create booking with PENDING status
            const booking = await bookingService.createBooking({
                rideId,
                pickupLocation: pickupLocation,
                dropoffLocation: dropoffLocation,
                numberOfSeats: numberOfSeats,
            });

            // Store booking details
            // Note: totalFare comes from booking response since it's calculated on backend based on pickup/dropoff
            // Ensure fare is a numeric rupee value (frontend/backend use rupees for Booking.fareAmount)
            const bookingFareAmountRaw = booking.fareAmount ?? 0;
            const bookingFareAmount = Number(bookingFareAmountRaw);
            const bookingFareAmountRu = Number.isFinite(bookingFareAmount) ? bookingFareAmount : 0;

            setPendingBooking({
                rideId,
                ride,
                numberOfSeats,
                totalFare: bookingFareAmountRu, // in rupees
                bookingId: booking.id,
                pickupLocation: pickupLocation,
                dropoffLocation: dropoffLocation,
            });

            // Create Razorpay order with the fare amount from booking (in rupees)
            console.log('Creating order for booking:', booking.id, 'Amount (rupees):', bookingFareAmountRu);
            const orderResponse = await paymentService.createOrder({
                // Backend expects amount in rupees (Double). Keep that contract.
                amount: bookingFareAmountRu,
                bookingId: booking.id,
                currency: 'INR'
            });

            console.log('Order created successfully:', orderResponse);

            // Set order data for payment modal
            // Note: orderResponse.amount is already in paise from Razorpay
            const amountPaiseFromOrder = Number(orderResponse.amount ?? NaN);
            const amountRupeesFromOrder = Number(orderResponse.amountInRupees ?? NaN);
            const fallbackPaise = Math.round(bookingFareAmountRu * 100);

            // Use Razorpay paise for the actual amount used during checkout if available,
            // but ALWAYS use the backend-provided rupee amount for display if available
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
             console.error('Error creating booking or order:', error);
             await showError(error.message || 'Error creating booking. Please try again.');
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
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
            <Navbar />

            <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
                <BackButton />

                {/* Header Section */}
                <div className="mb-8 bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-600">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-3">
                                <Ticket className="h-6 w-6 text-purple-600" />
                                <span>Passenger Dashboard</span>
                            </h1>
                            <p className="text-gray-600 mt-2 text-sm">Search and book rides easily</p>
                        </div>
                        <div className="bg-purple-100 rounded-lg px-4 py-2">
                            <Navigation className="h-6 w-6 text-purple-600" />
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex space-x-4 mb-6 bg-white rounded-lg shadow-md p-2">
                    <button
                        onClick={() => setActiveTab('search')}
                        className={`flex-1 px-6 py-3 font-semibold rounded-lg transition-all ${
                            activeTab === 'search'
                                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg transform scale-105'
                                : 'text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                        <Search className="inline h-5 w-5 mr-2" />
                        Search Rides
                    </button>
                    <button
                        onClick={() => setActiveTab('bookings')}
                        className={`flex-1 px-6 py-3 font-semibold rounded-lg transition-all ${
                            activeTab === 'bookings'
                                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg transform scale-105'
                                : 'text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                        <CheckCircle className="inline h-5 w-5 mr-2" />
                        My Bookings ({filteredBookings.length})
                    </button>
                </div>

                {activeTab === 'search' && (
                    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                        <h2 className="text-xl font-bold mb-6 flex items-center space-x-2 text-gray-800">
                            <Search className="h-5 w-5 text-purple-600" />
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
                                        Select your pickup location in {fromCity} and drop location in {toCity}. 
                                        {driverPickupLocations.length > 0 || driverDropLocations.length > 0 ? (
                                            <span> Drivers have selected preferred locations (marked with ★). You can also type to search for other locations.</span>
                                        ) : (
                                            <span> Search for any location within the selected cities.</span>
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
                                        <LocationAutocompleteWithDriverOptions
                                            value={searchForm.source}
                                            onChange={(value) => setSearchForm({ ...searchForm, source: value })}
                                            placeholder={`Search a place in ${fromCity}${driverPickupLocations.length > 0 ? ' or select from driver choices' : ''}`}
                                            withinCity={fromCity}
                                            driverLocations={driverPickupLocations}
                                            disableCache={true}
                                        />
                                        {driverPickupLocations.length > 0 && (
                                            <p className="text-xs text-purple-600 mt-2">
                                                ★ {driverPickupLocations.length} driver-selected pickup locations available
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Drop Location in {toCity} *</label>
                                        <LocationAutocompleteWithDriverOptions
                                            value={searchForm.destination}
                                            onChange={(value) => setSearchForm({ ...searchForm, destination: value })}
                                            placeholder={`Search a place in ${toCity}${driverDropLocations.length > 0 ? ' or select from driver choices' : ''}`}
                                            withinCity={toCity}
                                            driverLocations={driverDropLocations}
                                            disableCache={true}
                                        />
                                        {driverDropLocations.length > 0 && (
                                            <p className="text-xs text-purple-600 mt-2">
                                                ★ {driverDropLocations.length} driver-selected drop locations available
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex justify-between">
                                    <button type="button" onClick={goPrev} className="px-6 py-2 bg-gray-200 rounded-lg">Back</button>
                                    <button
                                        onClick={goNext}
                                        disabled={!searchForm.source || !searchForm.destination}
                                        className="px-6 py-2 bg-purple-600 text-white rounded-lg disabled:opacity-50"
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
                                                        {ride.availableSeats === 0 ? 'Full' : bookingLoading[ride.id] ? 'Processing…' : 'Book Now'}
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
                                                    Page {resultsPage + 1} of {totalPages} — {rides.length} rides
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
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                        <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4">
                            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
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
                                                            booking.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                                                'bg-red-100 text-red-800'
                                                    }`}>
                            {booking.status}
                          </span>
                                                </div>
                                                <div className="mb-3">
                                                    <div className="text-xs text-gray-600 mb-1">Route Details</div>
                                                    <div className="flex items-center space-x-2 text-sm">
                                                        <MapPin className="h-4 w-4 text-gray-500" />
                                                        <span className="text-gray-700"><strong>From:</strong> {booking.pickupLocation || booking.ride?.source}</span>
                                                        <span className="mx-2 text-gray-400">→</span>
                                                        <span className="text-gray-700"><strong>To:</strong> {booking.dropoffLocation || booking.ride?.destination}</span>
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
                                                {booking.status !== 'CANCELLED' && booking.status !== 'COMPLETED' && (
                                                    <div className="mt-4">
                                                        <button
                                                            onClick={() => handleCancelBooking(booking.id)}
                                                            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-semibold shadow-md transform hover:scale-105 transition-all"
                                                        >
                                                            Cancel Booking
                                                        </button>
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

            <Footer />
        </div>
    );
};

export default PassengerDashboard;

