import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, MapPin, Calendar, Clock, User, CheckCircle, Car, Navigation, Star, Ticket, Snowflake, ChevronLeft, ChevronRight, X, ZoomIn, History, Users, Loader, Printer, Phone, DollarSign, TrendingUp } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BackButton from '../components/BackButton';
import CityAutocomplete from '../components/CityAutocomplete';
import RazorpayPaymentModal from '../components/RazorpayPaymentModal';
import { rideService } from '../services/rideService';
import { bookingService } from '../services/bookingService';
import { paymentService } from '../services/paymentService';
import { userService } from '../services/userService';
import { authService } from '../services/authService';
import { reviewService } from '../services/reviewService';
import { showConfirm, showSuccess, showError } from '../utils/swal';

const PassengerDashboard = () => {

    const [showCarDetails, setShowCarDetails] = useState(false);
    const [selectedCar, setSelectedCar] = useState(null);



    const [currentView, setCurrentView] = useState('main'); // 'main', 'search', 'bookings', 'history'

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
            return val.split(':').slice(0, 2).join(':');
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
    // ✨ WIZARD STATE & LOGIC START ✨
    // =========================================================================
    const [wizardStep, setWizardStep] = useState(1);
    const [fromCity, setFromCity] = useState('');
    const [toCity, setToCity] = useState('');

    const [driverPickupLocations, setDriverPickupLocations] = useState([]); // Aggregated pickup locations from all drivers
    const [driverDropLocations, setDriverDropLocations] = useState([]); // Aggregated drop locations from all drivers
    const [availableRides, setAvailableRides] = useState([]); // Rides for current search to get pickup locations
    const [loading, setLoading] = useState(false);

    const goNext = useCallback(async () => {
        // Step 1 -> 2: Fetch available rides to get driver pickup and drop locations
        if (wizardStep === 1) {
            setSearchForm(prev => ({ ...prev, source: '', destination: '' })); // Reset locations
            setWizardStep(2);
            setLoading(true);
            // Fetch rides to get driver pickup and drop locations
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
                        // console.log(`[PassengerDashboard] Found ${list.length} rides for date ${dateStr}`);
                        allRides.push(...list);
                    } catch (err) {
                        // Suppress frequent errors during aggregation
                    }
                }

                console.log(`[PassengerDashboard] Total rides found: ${allRides.length}`);

                // Extract and aggregate pickup locations from all rides
                const allPickupLocations = new Set();
                const allDropLocations = new Set();

                allRides.forEach((ride) => {
                    // Handle pickup locations - try both camelCase and snake_case field names
                    let pickupLocationsData = ride.pickupLocationsJson || ride.pickupLocations;
                    if (pickupLocationsData) {
                        try {
                            let locations;
                            if (Array.isArray(pickupLocationsData)) {
                                locations = pickupLocationsData;
                            } else if (typeof pickupLocationsData === 'string') {
                                locations = JSON.parse(pickupLocationsData);
                            } else {
                                locations = [];
                            }

                            if (Array.isArray(locations)) {
                                locations.forEach(loc => {
                                    if (loc && typeof loc === 'string' && loc.trim()) {
                                        allPickupLocations.add(loc.trim());
                                    }
                                });
                            }
                        } catch (e) {
                            console.error('Error parsing pickup locations:', e);
                        }
                    }

                    // Handle drop locations
                    let dropLocationsData = ride.dropLocationsJson || ride.dropLocations;
                    if (dropLocationsData) {
                        try {
                            let locations;
                            if (Array.isArray(dropLocationsData)) {
                                locations = dropLocationsData;
                            } else if (typeof dropLocationsData === 'string') {
                                locations = JSON.parse(dropLocationsData);
                            } else {
                                locations = [];
                            }

                            if (Array.isArray(locations)) {
                                locations.forEach(loc => {
                                    if (loc && typeof loc === 'string' && loc.trim()) {
                                        allDropLocations.add(loc.trim());
                                    }
                                });
                            }
                        } catch (e) {
                            console.error('Error parsing drop locations:', e);
                        }
                    }
                });

                setDriverPickupLocations(Array.from(allPickupLocations));
                setDriverDropLocations(Array.from(allDropLocations));
                setAvailableRides(allRides);
            } catch (error) {
                console.error('Error fetching rides for locations:', error);
                setDriverPickupLocations([]);
                setDriverDropLocations([]);
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

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const bookingDate = new Date(dateStr);
        bookingDate.setHours(0, 0, 0, 0);

        return bookingDate < today;
    }, []);

    // Filter bookings to exclude cancelled and past dates
    const filteredBookings = useMemo(() => bookings.filter(booking => !(booking.status === 'CANCELLED' || (booking.ride?.date && isDatePassed(booking.ride.date)))), [bookings, isDatePassed]);

    // Handle client-side pagination if server-side is not available
    const displayedBookings = useMemo(() => {
        if (bookingsTotalPages > 0) {
            return bookings;
        }
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
    // ✨ WIZARD STATE & LOGIC END ✨
    // =========================================================================

    const [activeTab, setActiveTab] = useState('search');
    const [selectedSeats, setSelectedSeats] = useState({});
    const [showBookingModal, setShowBookingModal] = useState({});
    const [bookingLoading, setBookingLoading] = useState({});

    // Pagination for Available Rides (results tab)
    const [resultsPage, setResultsPage] = useState(0); // zero-based
    const [resultsSize, setResultsSize] = useState(5);

    const [photoViewer, setPhotoViewer] = useState({ open: false, photos: [], currentIndex: 0 });
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [pendingBooking, setPendingBooking] = useState(null);
    const [paymentOrderData, setPaymentOrderData] = useState(null);
    const [paymentProcessing, setPaymentProcessing] = useState(false);

    // Rating modal state
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [ratingBooking, setRatingBooking] = useState(null);
    const [rating, setRating] = useState(0);
    const [ratingComment, setRatingComment] = useState('');
    const [submittingRating, setSubmittingRating] = useState(false);
    const [hasReviewedMap, setHasReviewedMap] = useState({});

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

    // Fetch passenger bookings
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

    const [userProfile, setUserProfile] = useState(null);

    useEffect(() => {
        fetchMyBookings(0, bookingsSize);
        fetchHistoryPage(0, historySize);
        loadUserProfile();
    }, []);

    const loadUserProfile = async () => {
        try {
            const profile = await userService.getProfile();
            setUserProfile(profile);
        } catch (error) {
            console.error('Error loading user profile:', error);
        }
    };

    // Calculate stats for main dashboard
    const stats = useMemo(() => {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const weeklySpending = bookings
            .filter(booking => {
                const bookingDate = new Date(booking.createdAt || booking.ride?.date || 0);
                return bookingDate >= weekAgo &&
                    (booking.status === 'CONFIRMED' || booking.status === 'COMPLETED');
            })
            .reduce((sum, booking) => {
                const fare = booking.fareAmount || booking.totalPrice || 0;
                return sum + fare;
            }, 0);

        const tripsCompleted = rideHistory.filter(
            booking => booking.status === 'COMPLETED'
        ).length;

        const upcomingRides = bookings.filter(booking => {
            if (booking.status === 'CANCELLED') return false;
            const rideDate = booking.ride?.date;
            if (!rideDate) return false;
            const bookingDate = new Date(rideDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            bookingDate.setHours(0, 0, 0, 0);
            return bookingDate >= today;
        }).length;

        const totalRidesBooked = bookings.filter(
            booking => booking.status !== 'CANCELLED'
        ).length;

        return {
            weeklySpending: weeklySpending.toFixed(2),
            tripsCompleted,
            upcomingRides,
            totalRidesBooked
        };
    }, [bookings, rideHistory]);

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

    const fetchBookingsPage = async (page = 0) => {
        if (bookingsTotalPages > 0) {
            await fetchMyBookings(page, bookingsSize);
        } else {
            setBookingsPage(page);
        }
    };

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

        if (!searchForm.source || !searchForm.destination) {
            await showError('Pickup and drop locations must be selected in Step 2.');
            if (wizardStep !== 2) setWizardStep(2);
            return;
        }

        setLoading(true);
        try {
            const searchData = {
                source: fromCity,
                destination: toCity,
                date: searchForm.date
            };
            const data = await rideService.searchRides(searchData);
            const list = Array.isArray(data) ? data : (data && Array.isArray(data.content) ? data.content : []);

            const normalized = list.map((r) => {
                if (!r || typeof r !== 'object') return r;
                if (r.driver && typeof r.driver === 'object') return { ...r, driver: r.driver };
                if (r.driverInfo && typeof r.driverInfo === 'object') return { ...r, driver: r.driverInfo };
                if (r.driverResponse && typeof r.driverResponse === 'object') return { ...r, driver: r.driverResponse };
                if (typeof r.driver === 'string') return { ...r, driver: { id: null, name: r.driver, driverRating: null } };

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
                return { ...r, driver: r.driver || null };
            });

            setRides(normalized);
            setAvailableRides(normalized);
            setResultsPage(0);
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
        const pickupLocation = searchForm.source || ride.source || '';
        const dropoffLocation = searchForm.destination || ride.destination || '';

        if (!pickupLocation || !dropoffLocation) {
            await showError('Pickup and dropoff locations are required. Please go back and select them in the search form.');
            return;
        }

        if (numberOfSeats > ride.availableSeats) {
            await showError(`Only ${ride.availableSeats} seat(s) available`);
            return;
        }

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
            await bookingService.createBooking({
                rideId,
                pickupLocation: pickupLocation,
                dropoffLocation: dropoffLocation,
                numberOfSeats: numberOfSeats,
            });

            await showSuccess('Booking request created! Waiting for driver approval.');
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
            const bookingFareAmountRu = Number.isFinite(Number(bookingFareAmountRaw)) ? Number(bookingFareAmountRaw) : 0;

            setPendingBooking({
                rideId: booking.ride?.id,
                ride: booking.ride,
                numberOfSeats: booking.numberOfSeats || 1,
                totalFare: bookingFareAmountRu,
                bookingId: booking.id,
                pickupLocation: booking.pickupLocation,
                dropoffLocation: booking.dropoffLocation,
            });

            const orderResponse = await paymentService.createOrder({
                amount: bookingFareAmountRu,
                bookingId: booking.id,
                currency: 'INR'
            });

            setPaymentOrderData({
                orderId: orderResponse.orderId,
                amount: orderResponse.amount || Math.round(bookingFareAmountRu * 100),
                amountInRupees: orderResponse.amountInRupees || bookingFareAmountRu,
                currency: orderResponse.currency || 'INR',
                keyId: orderResponse.keyId,
                bookingId: booking.id
            });

            setShowPaymentModal(true);
        } catch (error) {
            console.error('Error creating payment order:', error);
            await showError(error.message || 'Error creating payment order.');
        } finally {
            setPaymentProcessing(false);
        }
    };

    const handlePaymentSuccess = async (paymentData) => {
        if (!pendingBooking) return;
        setPaymentProcessing(true);
        setShowPaymentModal(false);

        try {
            await paymentService.verifyPayment({
                bookingId: pendingBooking.bookingId,
                razorpayOrderId: paymentData.razorpayOrderId,
                razorpayPaymentId: paymentData.razorpayPaymentId,
                razorpaySignature: paymentData.razorpaySignature,
            });

            setSelectedSeats({ ...selectedSeats, [pendingBooking.rideId]: 1 });
            setRides((prevRides) =>
                prevRides.map((r) =>
                    r.id === pendingBooking.rideId
                        ? { ...r, availableSeats: r.availableSeats - pendingBooking.numberOfSeats }
                        : r
                )
            );

            showSuccess('Payment successful! Ride booked successfully!');
            setActiveTab('bookings');

            Promise.all([
                fetchMyBookings(),
                rideService.searchRides(searchForm).then((updatedRides) => {
                    setRides(updatedRides);
                }).catch(err => console.error(err))
            ]).catch(err => console.error(err));
        } catch (error) {
            console.error('Payment verification error:', error);
            await showError(error.message || 'Payment verification failed.');
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
            if (resp && resp.myBookings) {
                setBookings(Array.isArray(resp.myBookings) ? resp.myBookings : []);
            } else {
                setBookings(prev => prev.map(b => b.id === bookingId ? ({ ...b, status: 'CANCELLED' }) : b));
            }

            if (resp && resp.updatedRide && Array.isArray(rides)) {
                setRides(prev => prev.map(r => r.id === resp.updatedRide.id ? resp.updatedRide : r));
            }

            await showSuccess('Booking cancelled successfully!');
        } catch (error) {
            console.error('Cancel booking error:', error);
            await showError(error.message || 'Error cancelling booking');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenRatingModal = async (booking) => {
        try {
            // Check if already reviewed
            const hasReviewed = await reviewService.hasReviewed(booking.id);
            if (hasReviewed) {
                await showError('You have already reviewed this ride');
                return;
            }
            setRatingBooking(booking);
            setRating(0);
            setRatingComment('');
            setShowRatingModal(true);
        } catch (error) {
            console.error('Error checking review status:', error);
            // Still open modal, let backend handle duplicate check
            setRatingBooking(booking);
            setRating(0);
            setRatingComment('');
            setShowRatingModal(true);
        }
    };

    const handleSubmitRating = async () => {
        if (!ratingBooking || rating === 0) {
            await showError('Please select a rating');
            return;
        }

        setSubmittingRating(true);
        try {
            await reviewService.submitReview(ratingBooking.id, rating, ratingComment);
            await showSuccess('Thank you for your review!');

            // Update hasReviewedMap immediately
            setHasReviewedMap(prev => ({ ...prev, [ratingBooking.id]: true }));

            // Refresh bookings and history to get updated data
            await Promise.all([
                fetchMyBookings(bookingsPage, bookingsSize),
                fetchHistoryPage(historyPage, historySize)
            ]);

            // Re-check review status for all completed bookings to ensure consistency
            const checkReviewStatus = async () => {
                try {
                    const hasReviewed = await reviewService.hasReviewed(ratingBooking.id);
                    setHasReviewedMap(prev => ({ ...prev, [ratingBooking.id]: hasReviewed }));
                } catch (error) {
                    console.error('Error re-checking review status:', error);
                }
            };
            await checkReviewStatus();

            setShowRatingModal(false);
            setRatingBooking(null);
            setRating(0);
            setRatingComment('');
        } catch (error) {
            console.error('Error submitting review:', error);
            await showError(error.message || 'Error submitting review');
        } finally {
            setSubmittingRating(false);
        }
    };

    // Check review status for completed bookings on load (both from bookings and history)
    useEffect(() => {
        const checkReviews = async () => {
            // Check bookings that are COMPLETED or CONFIRMED with date passed
            const completedBookings = bookings.filter(b =>
                b.status === 'COMPLETED' ||
                (b.status === 'CONFIRMED' && b.ride?.date && isDatePassed(b.ride.date))
            );
            // Also check history bookings
            const completedHistoryBookings = rideHistory.filter(b =>
                b.status === 'COMPLETED' ||
                (b.status === 'CONFIRMED' && b.ride?.date && isDatePassed(b.ride.date))
            );

            const allCompletedBookings = [...completedBookings, ...completedHistoryBookings];

            for (const booking of allCompletedBookings) {
                try {
                    const hasReviewed = await reviewService.hasReviewed(booking.id);
                    setHasReviewedMap(prev => ({ ...prev, [booking.id]: hasReviewed }));
                } catch (error) {
                    console.error(`Error checking review for booking ${booking.id}:`, error);
                }
            }
        };
        if (bookings.length > 0 || rideHistory.length > 0) {
            checkReviews();
        }
    }, [bookings, rideHistory, isDatePassed]);

    const handlePrintReceipt = async (booking) => {
        if (!booking) {
            await showError('Cannot print receipt: Booking data is missing.');
            return;
        }
        setLoading(true);
        try {
            const content = `
                <h2>Ride Receipt - Booking ID: ${booking.id}</h2>
                <p><strong>Status:</strong> ${booking.status}</p>
                <p><strong>Route:</strong> ${booking.pickupLocation || booking.ride?.source} → ${booking.dropoffLocation || booking.ride?.destination}</p>
                <p><strong>Date:</strong> ${formatDate(booking.ride?.date)} at ${formatTime(booking.ride?.time)}</p>
                <p><strong>Seats Booked:</strong> ${booking.numberOfSeats || 1}</p>
                <hr style="margin: 15px 0;">
                <p style="font-size: 1.2em; font-weight: bold;">Total Fare Paid: ₹${booking.fareAmount?.toFixed(2) || 'N/A'}</p>
                <p style="font-size: 0.8em; color: gray;">Thank you for riding with us!</p>
            `;

            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(`
                    <html>
                    <head>
                        <title>Receipt - Booking ${booking.id}</title>
                        <style>
                            body { font-family: Arial, sans-serif; padding: 20px; }
                            h2 { color: #5B21B6; }
                            hr { border: 0; border-top: 1px solid #ccc; }
                        </style>
                    </head>
                    <body>
                        ${content}
                        <script>
                            window.onload = function() {
                                window.print();
                            }
                        </script>
                    </body>
                    </html>
                `);
                printWindow.document.close();
            } else {
                await showError('Could not open print window. Please allow pop-ups.');
            }
            await showSuccess('Receipt prepared for printing.');
        } catch (error) {
            console.error('Error generating receipt:', error);
            await showError('Failed to generate receipt.');
        } finally {
            setLoading(false);
        }
    };

    const getDriverName = (ride) => {
        if (!ride) return 'N/A';
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
        return name && name !== 'N/A' ? name : 'N/A';
    };

    const getDriverRating = (ride) => {
        const raw = ride?.driver?.driverRating ?? ride?.driverRating ?? ride?.driver_rating ?? null;
        const num = raw !== null && raw !== undefined ? Number(raw) : null;
        return Number.isNaN(num) ? null : num;
    };

    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative overflow-hidden">
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-0 left-0 w-96 h-96 bg-purple-300/20 rounded-full blur-3xl animate-blob"></div>
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-300/20 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
                <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-indigo-300/20 rounded-full blur-3xl animate-blob animation-delay-4000"></div>
                <div className="absolute inset-0 bg-grid-pattern opacity-30"></div>
            </div>
            <Navbar />

            <main className="flex-grow max-w-7xl mx-auto w-full px-3 sm:px-5 lg:px-6 py-5 relative z-10">
                <BackButton />

                {/* Header Section */}
                <div className="mb-6 bg-gradient-to-r from-white via-purple-50/30 to-blue-50/30 rounded-xl shadow-2xl p-5 border-2 border-purple-200/50 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg">
                                <Phone className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center space-x-2">
                                    <span>Passenger Dashboard</span>
                                </h1>
                                <p className="text-gray-600 mt-1 text-sm">
                                    Welcome, {(() => {
                                        const currentUser = authService.getCurrentUser();
                                        const passengerName = currentUser?.name || currentUser?.email || 'Passenger';
                                        return passengerName.split(' ')[0] + ' ' + (passengerName.split(' ')[1]?.[0] || '') + '.';
                                    })()} Find and book rides, manage your trips.
                                </p>
                            </div>
                        </div>
                        {currentView !== 'main' && (
                            <button
                                onClick={() => {
                                    setCurrentView('main');
                                    setActiveTab('search');
                                }}
                                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl font-bold shadow-xl transform hover:scale-105 transition-all text-base"
                            >
                                <Navigation className="h-5 w-5" />
                                <span>Back to Dashboard</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Main Dashboard View */}
                {currentView === 'main' && (
                    <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border-2 border-purple-100/50 relative overflow-hidden hover:shadow-purple-500/20 transition-shadow duration-300">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-purple-200/20 to-blue-200/20 rounded-full blur-3xl -mr-48 -mt-48"></div>
                        <div className="relative z-10">
                            <div className="mb-8">
                                <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                                    Welcome Back! 👋
                                </h1>
                                <p className="text-gray-600 text-lg">Here's your ride sharing overview</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                                {/* Stats Cards... same as before */}
                                <div className="group relative bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-600 rounded-2xl shadow-lg p-6 transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/50 overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                                    <div className="relative z-10">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                                <DollarSign className="h-6 w-6 text-white" />
                                            </div>
                                            <div className="text-white/80 text-xs font-semibold">This Week</div>
                                        </div>
                                        <div className="text-white text-sm font-semibold mb-2 opacity-90">Weekly Spending</div>
                                        <div className="text-4xl font-bold text-white mb-2">₹{stats.weeklySpending}</div>
                                        <div className="flex items-center text-green-200 text-sm">
                                            <TrendingUp className="h-4 w-4 mr-1" />
                                            <span>Track your expenses</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="group relative bg-gradient-to-br from-blue-500 via-blue-600 to-cyan-600 rounded-2xl shadow-lg p-6 transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/50 overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                                    <div className="relative z-10">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                                <CheckCircle className="h-6 w-6 text-white" />
                                            </div>
                                            <div className="text-white/80 text-xs font-semibold">All Time</div>
                                        </div>
                                        <div className="text-white text-sm font-semibold mb-2 opacity-90">Trips Completed</div>
                                        <div className="text-4xl font-bold text-white mb-2">{stats.tripsCompleted}</div>
                                        <div className="flex items-center text-blue-100 text-sm">
                                            <Car className="h-4 w-4 mr-1" />
                                            <span>Total completed rides</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="group relative bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600 rounded-2xl shadow-lg p-6 transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-emerald-500/50 overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                                    <div className="relative z-10">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                                <Calendar className="h-6 w-6 text-white" />
                                            </div>
                                            <div className="text-white/80 text-xs font-semibold">Scheduled</div>
                                        </div>
                                        <div className="text-white text-sm font-semibold mb-2 opacity-90">Upcoming Rides</div>
                                        <div className="text-4xl font-bold text-white mb-2">{stats.upcomingRides}</div>
                                        <div className="flex items-center text-emerald-100 text-sm">
                                            <Clock className="h-4 w-4 mr-1" />
                                            <span>Scheduled rides</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="group relative bg-gradient-to-br from-orange-500 via-amber-600 to-yellow-600 rounded-2xl shadow-lg p-6 transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-orange-500/50 overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                                    <div className="relative z-10">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                                <Ticket className="h-6 w-6 text-white" />
                                            </div>
                                            <div className="text-white/80 text-xs font-semibold">All Time</div>
                                        </div>
                                        <div className="text-white text-sm font-semibold mb-2 opacity-90">Total Rides Booked</div>
                                        <div className="text-4xl font-bold text-white mb-2">{stats.totalRidesBooked}</div>
                                        <div className="flex items-center text-orange-100 text-sm">
                                            <Users className="h-4 w-4 mr-1" />
                                            <span>All time bookings</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Navigation Buttons */}
                            <div className="mb-8">
                                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                                    <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Passenger Tools</span>
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <button
                                        onClick={() => {
                                            setCurrentView('search');
                                            setActiveTab('search');
                                        }}
                                        className="group relative bg-white rounded-2xl shadow-lg p-8 transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/30 border-2 border-transparent hover:border-purple-200 flex flex-col items-center justify-center gap-4 overflow-hidden"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-blue-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                        <div className="relative z-10 p-4 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg">
                                            <Search className="h-10 w-10 text-white" />
                                        </div>
                                        <span className="relative z-10 font-bold text-gray-800 text-lg group-hover:text-purple-600 transition-colors duration-300">Search Rides</span>
                                        <p className="relative z-10 text-sm text-gray-500 group-hover:text-gray-700">Find your perfect ride</p>
                                    </button>
                                    <button
                                        onClick={() => {
                                            setCurrentView('bookings');
                                            setActiveTab('bookings');
                                            fetchMyBookings(0, bookingsSize);
                                        }}
                                        className="group relative bg-white rounded-2xl shadow-lg p-8 transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/30 border-2 border-transparent hover:border-blue-200 flex flex-col items-center justify-center gap-4 overflow-hidden"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-cyan-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                        <div className="relative z-10 p-4 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg">
                                            <CheckCircle className="h-10 w-10 text-white" />
                                        </div>
                                        <span className="relative z-10 font-bold text-gray-800 text-lg group-hover:text-blue-600 transition-colors duration-300">My Bookings</span>
                                        <p className="relative z-10 text-sm text-gray-500 group-hover:text-gray-700">Manage your rides</p>
                                    </button>
                                    <button
                                        onClick={() => {
                                            setCurrentView('history');
                                            setActiveTab('history');
                                            fetchHistoryPage(0, historySize);
                                        }}
                                        className="group relative bg-white rounded-2xl shadow-lg p-8 transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-indigo-500/30 border-2 border-transparent hover:border-indigo-200 flex flex-col items-center justify-center gap-4 overflow-hidden"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                        <div className="relative z-10 p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg">
                                            <History className="h-10 w-10 text-white" />
                                        </div>
                                        <span className="relative z-10 font-bold text-gray-800 text-lg group-hover:text-indigo-600 transition-colors duration-300">History</span>
                                        <p className="relative z-10 text-sm text-gray-500 group-hover:text-gray-700">View past trips</p>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Navigation Tabs and Content */}
                {(currentView === 'search' || currentView === 'bookings' || currentView === 'history') && (
                    <>
                        <div className="flex space-x-3 mb-6 bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl p-2 border-2 border-purple-100/50">
                            <button
                                onClick={() => setActiveTab('search')}
                                className={`flex-1 px-4 py-2.5 font-bold rounded-xl transition-all duration-300 text-sm flex items-center justify-center space-x-2 ${activeTab === 'search'
                                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-xl transform scale-105 hover:scale-110'
                                    : 'text-gray-600 hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 hover:scale-102'
                                    }`}
                            >
                                <Search className="h-4 w-4" />
                                <span>Search Rides</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('bookings')}
                                className={`flex-1 px-4 py-2.5 font-bold rounded-xl transition-all duration-300 text-sm flex items-center justify-center space-x-2 ${activeTab === 'bookings'
                                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-xl transform scale-105 hover:scale-110'
                                    : 'text-gray-600 hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 hover:scale-102'
                                    }`}
                            >
                                <CheckCircle className="h-4 w-4" />
                                <span>My Bookings ({filteredBookings.length})</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`flex-1 px-4 py-2.5 font-bold rounded-xl transition-all duration-300 text-sm flex items-center justify-center space-x-2 ${activeTab === 'history'
                                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-xl transform scale-105 hover:scale-110'
                                    : 'text-gray-600 hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 hover:scale-102'
                                    }`}
                            >
                                <History className="h-4 w-4" />
                                <span>History ({rideHistory.length})</span>
                            </button>
                        </div>

                        {activeTab === 'search' && (
                            <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-2xl p-8 mb-6 border-2 border-purple-100/50 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-200/30 to-blue-200/30 rounded-full blur-3xl -mr-32 -mt-32"></div>
                                <div className="relative z-10">
                                    <h2 className="text-2xl font-bold mb-6 flex items-center space-x-3 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                        <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg transform hover:scale-110 transition-transform">
                                            <Search className="h-5 w-5 text-white" />
                                        </div>
                                        <span>Search Rides</span>
                                    </h2>

                                    {/* Stepper */}
                                    <div className="flex items-center justify-center space-x-4 mb-8">
                                        {[1, 2, 3].map((step) => (
                                            <div key={step} className="flex items-center">
                                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-base font-bold transition-all duration-300 ${wizardStep >= step
                                                    ? 'bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-lg scale-110'
                                                    : 'bg-gray-200 text-gray-700'
                                                    }`}>
                                                    {step}
                                                </div>
                                                {step !== 3 && (
                                                    <div className={`w-16 h-2 mx-3 rounded-full transition-all duration-300 ${wizardStep > step
                                                        ? 'bg-gradient-to-r from-purple-600 to-blue-600'
                                                        : 'bg-gray-200'
                                                        }`}></div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Step 1: Pick From & To Cities */}
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
                                                    className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold shadow-lg transform hover:scale-105 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                                >
                                                    Next →
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Step 2: Select Pickup and Drop Locations */}
                                    {wizardStep === 2 && (
                                        <div className="space-y-6">
                                            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg">
                                                <h3 className="text-sm font-semibold text-blue-800 mb-2">Select Your Pickup and Drop Locations</h3>
                                                <p className="text-xs text-blue-700">
                                                    Select your pickup location in **{fromCity}** and drop location in **{toCity}** from the driver's available choices.
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

                                                                        {/* Button beside rating */}
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setSelectedCar(ride);
                                                                                setShowCarDetails(true);
                                                                            }}
                                                                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium 
               rounded-full bg-purple-100 text-purple-700 hover:bg-purple-200 
               transition"
                                                                        >
                                                                            <Car className="h-3 w-3" />
                                                                            View Car
                                                                        </button>

                                                                    </div>

                                                                    {/* Vehicle Photos */}
                                                                    {/* {ride.vehiclePhotosJson && (() => {
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
                                                                    })()} */}

                                                                    {/* Vehicle Condition Details */}
                                                                    {/* {(ride.hasAC !== null || ride.vehicleType || ride.vehicleModel || ride.vehicleColor) && (
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
                                                                    )} */}

                                                                    {/* Button to open car details modal */}




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
                                                                            className={`px-6 py-3 rounded-lg font-semibold shadow-lg transform hover:scale-105 transition-all ${ride.availableSeats === 0 || bookingLoading[ride.id]
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
                                                                {[5, 10, 20].map(s => (<option key={s} value={s}>{s} / page</option>))}
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
                            <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-2xl overflow-hidden border-2 border-purple-100/50 relative">
                                {/* Booking Tab Content */}
                                <div className="divide-y divide-gray-200/50">
                                    {displayedBookings.length === 0 ? (
                                        <div className="p-16 text-center relative z-10">
                                            <div className="inline-block p-6 bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl mb-4">
                                                <Ticket className="h-20 w-20 text-purple-400 mx-auto" />
                                            </div>
                                            <p className="text-gray-700 text-xl font-semibold mb-2">No bookings yet</p>
                                            <p className="text-gray-500 text-sm">Start searching for rides to get started!</p>
                                        </div>
                                    ) : (
                                        displayedBookings.map((booking) => (
                                            <div key={booking.id} className="p-6 hover:bg-gradient-to-r hover:from-purple-50/80 hover:to-blue-50/80 transition-all duration-300 group relative overflow-hidden">
                                                {/* Single booking item content */}
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <div className="flex items-center space-x-4 mb-4">
                                                            <div className="bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl p-3 shadow-lg transform group-hover:scale-110 transition-transform">
                                                                <MapPin className="h-7 w-7 text-white" />
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="flex items-center flex-wrap gap-2">
                                                                    <span className="font-bold text-xl text-gray-900">{booking.pickupLocation || booking.ride?.source}</span>
                                                                    <span className="mx-2 text-purple-500 font-bold">→</span>
                                                                    <span className="font-bold text-xl text-gray-900">{booking.dropoffLocation || booking.ride?.destination}</span>
                                                                </div>
                                                            </div>
                                                            <span className={`px-4 py-2 rounded-xl text-sm font-bold shadow-md ${(booking.status === 'COMPLETED' || (booking.status === 'CONFIRMED' && booking.ride?.date && isDatePassed(booking.ride.date))) ? 'bg-gradient-to-r from-purple-400 to-indigo-500 text-white' :
                                                                booking.status === 'CONFIRMED' ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white' :
                                                                    booking.status === 'ACCEPTED' ? 'bg-gradient-to-r from-blue-400 to-cyan-500 text-white' :
                                                                        booking.status === 'PENDING' ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white' :
                                                                            'bg-gradient-to-r from-red-400 to-pink-500 text-white'
                                                                }`}>
                                                                {(booking.status === 'CONFIRMED' && booking.ride?.date && isDatePassed(booking.ride.date)) ? 'COMPLETED' : booking.status}
                                                            </span>
                                                        </div>
                                                        {/* Other booking details... */}
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
                                                            <div className="bg-gradient-to-br from-purple-50 to-blue-50 px-4 py-3 rounded-xl border-2 border-purple-100 hover:shadow-md transition-all">
                                                                <div className="text-gray-600 text-xs font-semibold mb-1">Date</div>
                                                                <div className="font-bold text-gray-900 text-base">{formatDate(booking.ride?.date)}</div>
                                                            </div>
                                                            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 px-4 py-3 rounded-xl border-2 border-blue-100 hover:shadow-md transition-all">
                                                                <div className="text-gray-600 text-xs font-semibold mb-1">Time</div>
                                                                <div className="font-bold text-gray-900 text-base">{formatTime(booking.ride?.time)}</div>
                                                            </div>
                                                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 px-4 py-3 rounded-xl border-2 border-green-100 hover:shadow-md transition-all">
                                                                <div className="text-gray-600 text-xs font-semibold mb-1">Fare</div>
                                                                <div className="font-bold text-green-600 text-lg">₹{booking.fareAmount?.toFixed(2) || 'N/A'}</div>
                                                            </div>
                                                            <div className="bg-gradient-to-br from-orange-50 to-amber-50 px-4 py-3 rounded-xl border-2 border-orange-100 hover:shadow-md transition-all">
                                                                <div className="text-gray-600 text-xs font-semibold mb-1">Seats</div>
                                                                <div className="font-bold text-gray-900 text-base">{booking.numberOfSeats || 1}</div>
                                                            </div>
                                                        </div>

                                                        {booking.status === 'PENDING' && (
                                                            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                                                <p className="text-sm text-yellow-800 mb-2">
                                                                    <strong>Waiting for driver approval.</strong>
                                                                </p>
                                                                <button onClick={() => handleCancelBooking(booking.id)} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-semibold">Cancel Booking Request</button>
                                                            </div>
                                                        )}
                                                        {booking.status === 'ACCEPTED' && (
                                                            <div className="mt-4 flex space-x-2">
                                                                <button onClick={() => handleProceedToPayment(booking)} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm font-semibold">Proceed to Payment</button>
                                                                <button onClick={() => handleCancelBooking(booking.id)} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-semibold">Cancel Booking</button>
                                                            </div>
                                                        )}
                                                        {booking.status === 'CONFIRMED' && booking.ride?.date && !isDatePassed(booking.ride.date) && (
                                                            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                                                                <p className="text-sm text-green-800 mb-2"><strong>Booking Confirmed!</strong></p>
                                                                <div className="flex space-x-2">
                                                                    <button onClick={() => handlePrintReceipt(booking)} className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold flex items-center space-x-1"><Printer className="h-4 w-4" /><span>Print Receipt</span></button>
                                                                    <button onClick={() => handleCancelBooking(booking.id)} className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-semibold">Cancel Booking</button>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {(booking.status === 'COMPLETED' || (booking.status === 'CONFIRMED' && booking.ride?.date && isDatePassed(booking.ride.date))) && (
                                                            <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                                                                <p className="text-sm text-purple-800 mb-2"><strong>Ride Completed!</strong></p>
                                                                <div className="flex space-x-2">
                                                                    <button onClick={() => handlePrintReceipt(booking)} className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold flex items-center space-x-1"><Printer className="h-4 w-4" /><span>Print Receipt</span></button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                                {/* Pagination Controls */}
                                {((bookingsTotalPages > 0 && bookingsTotalPages > 1) || (bookingsTotalPages === 0 && filteredBookings.length > bookingsSize)) && (
                                    <div className="px-6 py-4 flex items-center justify-between bg-white border-t">
                                        <div className="text-sm text-gray-600">Showing page {bookingsPage + 1} {bookingsTotalPages > 0 ? `of ${bookingsTotalPages}` : ''}</div>
                                        <div className="flex items-center space-x-2">
                                            <button onClick={() => fetchBookingsPage(Math.max(0, bookingsPage - 1))} disabled={bookingsPage <= 0} className="px-3 py-1 rounded-md bg-white border hover:bg-gray-50">Prev</button>
                                            <button onClick={() => fetchBookingsPage(bookingsPage + 1)} disabled={false} className="px-3 py-1 rounded-md bg-white border hover:bg-gray-100">Next</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'history' && (
                            <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border-2 border-purple-100/50 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-200/30 to-purple-200/30 rounded-full blur-3xl -mr-32 -mt-32"></div>
                                <div className="relative z-10">
                                    <h2 className="text-2xl font-bold mb-8 flex items-center space-x-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent">
                                        <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg">
                                            <History className="h-5 w-5 text-white" />
                                        </div>
                                        <span>Ride History ({rideHistory.length})</span>
                                    </h2>
                                    {rideHistory.length === 0 ? (
                                        <div className="text-center py-16 relative z-10">
                                            <div className="inline-block p-6 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl mb-4">
                                                <History className="h-20 w-20 text-indigo-400 mx-auto" />
                                            </div>
                                            <p className="text-gray-700 text-xl font-semibold mb-2">No ride history found.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-5">
                                            {displayedHistory.map(booking => (
                                                <div key={booking.id} className="bg-gradient-to-r from-purple-50/90 to-blue-50/90 rounded-2xl shadow-lg p-5 border-2 border-purple-200/50 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 group relative overflow-hidden">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex items-start space-x-3 flex-1">
                                                            <div className="h-9 w-9 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0">
                                                                <MapPin className="h-4 w-4" />
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="flex items-center space-x-2 mb-2">
                                                                    <h3 className="text-base md:text-lg font-semibold text-gray-800">
                                                                        {booking.pickupLocation} <span className="text-gray-500">→</span> {booking.dropoffLocation}
                                                                    </h3>
                                                                    <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${(booking.status === 'COMPLETED' || (booking.status === 'CONFIRMED' && booking.ride?.date && isDatePassed(booking.ride.date))) ? 'bg-green-100 text-green-800' :
                                                                        booking.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-800' :
                                                                            'bg-red-100 text-red-800'
                                                                        }`}>
                                                                        {(booking.status === 'CONFIRMED' && booking.ride?.date && isDatePassed(booking.ride.date)) ? 'COMPLETED' : booking.status}
                                                                    </span>
                                                                </div>
                                                                <div className="text-xs text-gray-600 mb-2">
                                                                    <p><strong>Driver:</strong> {booking.driver?.name || booking.driver?.email || 'N/A'}</p>
                                                                    <p><strong>Ride:</strong> {(booking.ride?.citySource || booking.ride?.source)} → {(booking.ride?.cityDestination || booking.ride?.destination)}</p>
                                                                </div>
                                                                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                                                                    <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-gray-100 text-gray-800">
                                                                        <Calendar className="h-3.5 w-3.5" />
                                                                        <span>{booking.ride?.date ? formatDate(booking.ride.date) : 'N/A'}</span>
                                                                    </span>
                                                                    <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-gray-100 text-gray-800">
                                                                        <Clock className="h-3.5 w-3.5" />
                                                                        <span>{booking.ride?.time ? formatTime(booking.ride.time) : 'N/A'}</span>
                                                                    </span>
                                                                    <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-gray-100 text-gray-800">
                                                                        <Users className="h-3.5 w-3.5" />
                                                                        <span>{booking.numberOfSeats || booking.seats || 1} seat(s)</span>
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right ml-4 flex flex-col items-end space-y-2">
                                                            <div>
                                                                <div className="text-[11px] text-gray-500 leading-tight">Fare Amount</div>
                                                                <div className="text-base md:text-lg font-bold text-green-600">₹{(booking.fareAmount ?? 0).toFixed(2)}</div>
                                                            </div>
                                                            <div className="flex flex-row space-x-2">
                                                                {(booking.status === 'COMPLETED' || (booking.status === 'CONFIRMED' && booking.ride?.date && isDatePassed(booking.ride.date))) && (
                                                                    <>
                                                                        {!hasReviewedMap[booking.id] && (
                                                                            <button
                                                                                onClick={() => handleOpenRatingModal(booking)}
                                                                                className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl hover:from-yellow-600 hover:to-orange-600 text-xs font-bold shadow-lg transform hover:scale-105 transition-all flex items-center space-x-2"
                                                                            >
                                                                                <Star className="h-3.5 w-3.5" />
                                                                                <span>Rate Driver</span>
                                                                            </button>
                                                                        )}
                                                                        {hasReviewedMap[booking.id] && (
                                                                            <span className="px-4 py-2 bg-gray-300 text-gray-700 rounded-xl text-xs font-bold flex items-center space-x-2">
                                                                                <Star className="h-3.5 w-3.5" />
                                                                                <span>Reviewed</span>
                                                                            </span>
                                                                        )}
                                                                    </>
                                                                )}
                                                                <button
                                                                    onClick={() => handlePrintReceipt(booking)}
                                                                    className="px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 text-xs font-bold shadow-lg transform hover:scale-105 transition-all flex items-center space-x-2"
                                                                >
                                                                    <Printer className="h-3.5 w-3.5" />
                                                                    <span>Print</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {/* Pagination Controls for History */}
                                    {((historyTotalPages > 0 && historyTotalPages > 1) || (historyTotalPages === 0 && rideHistory.length > historySize)) && (
                                        <div className="px-6 py-4 flex items-center justify-between bg-white/80 backdrop-blur-sm border-t mt-6 rounded-xl shadow-lg">
                                            <div className="text-sm text-gray-600">
                                                Showing page {historyPage + 1}
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <button onClick={() => fetchHistoryPage(Math.max(0, historyPage - 1), historySize)} disabled={historyPage <= 0} className="px-3 py-1 rounded-md bg-white border hover:bg-gray-50 text-sm">Prev</button>
                                                <button onClick={() => fetchHistoryPage(historyPage + 1, historySize)} className="px-3 py-1 rounded-md bg-white border hover:bg-gray-50 text-sm">Next</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* Photo Viewer Modal */}
            {photoViewer.open && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center"
                    onClick={closePhotoViewer}
                >
                    <div className="relative max-w-6xl max-h-full p-4" onClick={(e) => e.stopPropagation()}>
                        <button onClick={closePhotoViewer} className="absolute top-4 right-4 text-white bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full p-2 z-10 transition-all">
                            <X className="h-6 w-6" />
                        </button>
                        <img
                            src={photoViewer.photos[photoViewer.currentIndex]}
                            alt={`Vehicle photo ${photoViewer.currentIndex + 1}`}
                            className="max-w-full max-h-[90vh] object-contain rounded-lg"
                        />
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

            {/* Rating Modal */}
            {showRatingModal && ratingBooking && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-2xl font-bold text-gray-800 flex items-center space-x-2">
                                <Star className="h-6 w-6 text-yellow-500" />
                                <span>Rate Your Driver</span>
                            </h2>
                            <button
                                onClick={() => {
                                    setShowRatingModal(false);
                                    setRatingBooking(null);
                                    setRating(0);
                                    setRatingComment('');
                                }}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="mb-4">
                            <p className="text-sm text-gray-600 mb-2">
                                Driver: <span className="font-semibold">{ratingBooking.ride?.driver?.name || ratingBooking.driver?.name || 'N/A'}</span>
                            </p>
                            <p className="text-sm text-gray-600">
                                Route: <span className="font-semibold">{ratingBooking.pickupLocation} → {ratingBooking.dropoffLocation}</span>
                            </p>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-semibold text-gray-700 mb-3">
                                Rating *
                            </label>
                            <div className="flex items-center space-x-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => setRating(star)}
                                        className={`transition-all transform hover:scale-110 ${rating >= star
                                            ? 'text-yellow-500'
                                            : 'text-gray-300'
                                            }`}
                                    >
                                        <Star
                                            className={`h-10 w-10 ${rating >= star ? 'fill-current' : ''
                                                }`}
                                        />
                                    </button>
                                ))}
                            </div>
                            {rating > 0 && (
                                <p className="text-sm text-gray-600 mt-2">
                                    {rating === 1 && 'Poor'}
                                    {rating === 2 && 'Fair'}
                                    {rating === 3 && 'Good'}
                                    {rating === 4 && 'Very Good'}
                                    {rating === 5 && 'Excellent'}
                                </p>
                            )}
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Comments (Optional)
                            </label>
                            <textarea
                                value={ratingComment}
                                onChange={(e) => setRatingComment(e.target.value)}
                                placeholder="Share your experience (comments are stored but not displayed)"
                                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-none"
                                rows="4"
                                maxLength={1000}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                {ratingComment.length}/1000 characters
                            </p>
                        </div>

                        <div className="flex space-x-3">
                            <button
                                onClick={() => {
                                    setShowRatingModal(false);
                                    setRatingBooking(null);
                                    setRating(0);
                                    setRatingComment('');
                                }}
                                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold transition-colors"
                                disabled={submittingRating}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmitRating}
                                disabled={rating === 0 || submittingRating}
                                className="flex-1 px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg hover:from-yellow-600 hover:to-orange-600 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                            >
                                {submittingRating ? (
                                    <>
                                        <Loader className="h-4 w-4 animate-spin" />
                                        <span>Submitting...</span>
                                    </>
                                ) : (
                                    <>
                                        <Star className="h-4 w-4" />
                                        <span>Submit Review</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Car Details Modal */}
            {showCarDetails && selectedCar && (
                <div className="fixed inset-0 z-[55] bg-black/40 backdrop-blur-sm flex items-center justify-center">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full mx-4 relative">
                        {/* Close button */}
                        <button
                            type="button"
                            onClick={() => {
                                setShowCarDetails(false);
                                setSelectedCar(null);
                            }}
                            className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-100"
                        >
                            <X className="h-5 w-5 text-gray-600" />
                        </button>

                        <div className="p-6">
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Car className="h-5 w-5 text-purple-600" />
                                <span>Vehicle Details</span>
                            </h2>

                            {/* Photos */}
                            {(() => {
                                try {
                                    const raw = selectedCar.vehiclePhotosJson;
                                    const photos = Array.isArray(raw) ? raw : raw ? JSON.parse(raw) : [];
                                    return photos.length ? (
                                        <div className="mb-6">
                                            <div className="text-xs font-semibold text-gray-600 mb-2">
                                                Photos
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                {photos.map((photo, idx) => (
                                                    <img
                                                        key={idx}
                                                        src={photo}
                                                        alt={`Vehicle ${idx + 1}`}
                                                        className="w-full h-32 object-cover rounded-lg border"
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    ) : null;
                                } catch (e) {
                                    return null;
                                }
                            })()}

                            {/* Text details */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                {selectedCar.vehicleType && (
                                    <p>
                                        <span className="font-medium text-gray-600">Type: </span>
                                        {selectedCar.vehicleType}
                                    </p>
                                )}
                                {selectedCar.vehicleModel && (
                                    <p>
                                        <span className="font-medium text-gray-600">Model: </span>
                                        {selectedCar.vehicleModel}
                                    </p>
                                )}
                                {(selectedCar.hasAC !== null && selectedCar.hasAC !== undefined) && (
                                    <p className="flex items-center">
                                        <Snowflake className="h-4 w-4 mr-1 text-blue-500" />
                                        <span className="font-medium text-gray-600">AC: </span>
                                        <span className="ml-1">{selectedCar.hasAC ? 'Yes' : 'No'}</span>
                                    </p>
                                )}
                                {selectedCar.vehicleColor && (
                                    <p>
                                        <span className="font-medium text-gray-600">Color: </span>
                                        {selectedCar.vehicleColor}
                                    </p>
                                )}
                                {selectedCar.otherFeatures && (
                                    <p className="sm:col-span-2">
                                        <span className="font-medium text-gray-600">Features: </span>
                                        {selectedCar.otherFeatures}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {/* Global Loading Overlay */}
            {(loading || paymentProcessing || Object.values(bookingLoading).some(v => v)) && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex items-center justify-center">
                    <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
                        <div className="flex flex-col items-center justify-center space-y-4">
                            <Loader className="h-12 w-12 text-purple-600 animate-spin" />
                            <h3 className="text-xl font-semibold text-gray-800">Processing...</h3>
                        </div>
                    </div>
                </div>
            )}

            <Footer />
        </div>
    );
};

export default PassengerDashboard;