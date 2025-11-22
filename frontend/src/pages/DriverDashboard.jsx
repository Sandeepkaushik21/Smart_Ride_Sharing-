import { useState, useEffect, useMemo } from 'react';
import { Plus, MapPin, Calendar, Clock, Users, Car, Navigation, CheckCircle, X, Upload, Snowflake, Ticket, CheckCircle2, XCircle, History, Edit, Phone, Star, DollarSign, TrendingUp, Bell } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BackButton from '../components/BackButton';
import CityAutocomplete from '../components/CityAutocomplete';
import { rideService } from '../services/rideService';
import { bookingService } from '../services/bookingService';
import { userService } from '../services/userService';
import { showConfirm, showSuccess, showError } from '../utils/swal';
import { authService } from '../services/authService';

const DriverDashboard = () => {
    const [currentView, setCurrentView] = useState('main'); // 'main', 'post-ride', 'rides', 'bookings', 'pending', 'history', 'vehicle-details'
    const [showPostForm, setShowPostForm] = useState(false);
    const [postForm, setPostForm] = useState({
        source: '',
        destination: '',
        date: '',
        time: '',
        availableSeats: '',
        hasAC: null,
        vehicleType: '',
        vehicleModel: '',
        vehicleColor: '',
        otherFeatures: '',
    });
    const [vehiclePhotos, setVehiclePhotos] = useState([]);
    const [myRides, setMyRides] = useState([]);
    // Support paginated bookings for drivers
    const [bookings, setBookings] = useState([]);
    const [bookingsPage, setBookingsPage] = useState(0); // zero-based
    const [bookingsSize, setBookingsSize] = useState(3);
    const [bookingsTotalPages, setBookingsTotalPages] = useState(0);
    // Pending bookings for accept/decline
    const [pendingBookings, setPendingBookings] = useState([]);
    const [pendingPage, setPendingPage] = useState(0);
    const [pendingSize, setPendingSize] = useState(3);
    const [pendingTotalPages, setPendingTotalPages] = useState(0);
    // Ride history
    const [rideHistory, setRideHistory] = useState([]);
    const [historyPage, setHistoryPage] = useState(0);
    const [historySize, setHistorySize] = useState(3);
    const [historyTotalPages, setHistoryTotalPages] = useState(0);
    // Reschedule modal state
    const [showRescheduleModal, setShowRescheduleModal] = useState(false);
    const [rescheduleRideId, setRescheduleRideId] = useState(null);
    const [rescheduleForm, setRescheduleForm] = useState({
        newDate: '',
        newTime: '',
        reason: ''
    });
    // const [bookingsTotalElements, setBookingsTotalElements] = useState(0);
    // Pagination for rides (driver)
    const [ridesPage, setRidesPage] = useState(0);
    const [ridesSize, setRidesSize] = useState(3); // default 3 per page
    const [ridesTotalPages, setRidesTotalPages] = useState(0);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('rides');
    // Wizard for Post Ride (1: From/To Cities, 2: 4 popular locations each, 3: Details)
    const [postStep, setPostStep] = useState(1);
    const [fromCity, setFromCity] = useState('');
    const [toCity, setToCity] = useState('');
    // Restore: arrays for up to 4 pickup & 4 drop locations (step 2 of wizard)
    const [pickupLocations, setPickupLocations] = useState(['', '', '', '']);
    const [dropLocations, setDropLocations] = useState(['', '', '', '']);
    // Master vehicle details
    const [useMasterDetails, setUseMasterDetails] = useState(false);
    const [masterDetails, setMasterDetails] = useState(null);
    const [hasMasterDetails, setHasMasterDetails] = useState(false);
    // Vehicle details management
    const [showVehicleDetailsForm, setShowVehicleDetailsForm] = useState(false);
    const [vehicleDetailsForm, setVehicleDetailsForm] = useState({
        vehicleType: '',
        vehicleModel: '',
        vehicleColor: '',
        hasAC: null,
        otherFeatures: '',
    });
    const [masterVehiclePhotos, setMasterVehiclePhotos] = useState([]);

    const handlePickupChange = (index, value) => {
        const updated = [...pickupLocations];
        updated[index] = value;
        setPickupLocations(updated);
    };

    const handleDropChange = (index, value) => {
        const updated = [...dropLocations];
        updated[index] = value;
        setDropLocations(updated);
    };

    const [userProfile, setUserProfile] = useState(null);
    const [walletData, setWalletData] = useState(null);

    useEffect(() => {
        fetchData();
        loadMasterDetails();
        loadUserProfile();
        loadWalletData();
    }, []);

    const loadUserProfile = async () => {
        try {
            const profile = await userService.getProfile();
            setUserProfile(profile);
        } catch (error) {
            console.error('Error loading user profile:', error);
        }
    };

    const loadWalletData = async () => {
        try {
            const { paymentService } = await import('../services/paymentService');
            const wallet = await paymentService.getDriverWallet();
            setWalletData(wallet);
        } catch (error) {
            console.error('Error loading wallet data:', error);
        }
    };

    // Calculate stats for main dashboard
    const stats = useMemo(() => {
        // Calculate weekly earnings from bookings
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const weeklyEarnings = bookings
            .filter(booking => {
                const bookingDate = new Date(booking.createdAt || booking.ride?.date || 0);
                return bookingDate >= weekAgo && 
                       (booking.status === 'CONFIRMED' || booking.status === 'COMPLETED');
            })
            .reduce((sum, booking) => {
                const fare = booking.fareAmount || booking.totalPrice || 0;
                // Driver gets 90% of fare
                return sum + (fare * 0.9);
            }, 0);

        // Trips completed (from history)
        const tripsCompleted = rideHistory.filter(
            booking => booking.status === 'COMPLETED'
        ).length;

        // Overall rating from user profile
        const overallRating = userProfile?.driverRating || 0.0;
        const ratingCount = userProfile?.totalRides || 0;

        // Acceptance rate
        const totalRequests = pendingBookings.length + bookings.filter(b => b.status === 'CONFIRMED' || b.status === 'COMPLETED').length;
        const acceptedRequests = bookings.filter(b => b.status === 'CONFIRMED' || b.status === 'COMPLETED').length;
        const acceptanceRate = totalRequests > 0 ? Math.round((acceptedRequests / totalRequests) * 100) : 0;

        return {
            weeklyEarnings: weeklyEarnings.toFixed(2),
            tripsCompleted,
            overallRating: overallRating.toFixed(2),
            ratingCount,
            acceptanceRate
        };
    }, [bookings, rideHistory, userProfile, pendingBookings]);

    // Load master vehicle details
    const loadMasterDetails = async () => {
        try {
            const details = await userService.getMasterVehicleDetails();
            if (details) {
                setMasterDetails(details);
                setHasMasterDetails(true);
                // Populate form with existing details
                setVehicleDetailsForm({
                    vehicleType: details.vehicleType || '',
                    vehicleModel: details.vehicleModel || '',
                    vehicleColor: details.vehicleColor || '',
                    hasAC: details.hasAC !== null && details.hasAC !== undefined ? details.hasAC : null,
                    otherFeatures: details.otherFeatures || '',
                });
                if (details.vehiclePhotos && Array.isArray(details.vehiclePhotos)) {
                    setMasterVehiclePhotos(details.vehiclePhotos);
                } else if (details.vehiclePhotosJson) {
                    try {
                        const photos = JSON.parse(details.vehiclePhotosJson);
                        setMasterVehiclePhotos(photos);
                    } catch (e) {
                        setMasterVehiclePhotos([]);
                    }
                } else {
                    setMasterVehiclePhotos([]);
                }
            } else {
                setHasMasterDetails(false);
            }
        } catch (error) {
            console.log('No master details found or error loading:', error);
            setHasMasterDetails(false);
        }
    };

    // Reset location arrays when cities change
    useEffect(() => {
        setPickupLocations(['', '', '', '']);
    }, [fromCity]);

    useEffect(() => {
        setDropLocations(['', '', '', '']);
    }, [toCity]);

    // No prefetching; step 2 uses realtime place autocomplete within the chosen cities

    // Helper: check if a date has passed (is before today)
    const isDatePassed = (dateValue) => {
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
        const rideDate = new Date(dateStr);
        rideDate.setHours(0, 0, 0, 0);

        return rideDate < today;
    };

    const fetchData = async () => {
        try {
            // Try to request paginated rides & bookings; services should accept page/size but fall back to full arrays
            const [ridesData, bookingsData, pendingData, historyData] = await Promise.all([
                // rideService may accept pagination args
                rideService.getMyRides({ page: ridesPage, size: ridesSize }).catch(() => rideService.getMyRides()),
                bookingService.getDriverBookings({ page: bookingsPage, size: bookingsSize }).catch(() => bookingService.getDriverBookings()),
                bookingService.getPendingBookings({ page: pendingPage, size: pendingSize }).catch(() => bookingService.getPendingBookings()),
                bookingService.getRideHistory({ page: historyPage, size: historySize }).catch(() => bookingService.getRideHistory()),
            ]);

            // Handle rides response (array or paginated)
            if (Array.isArray(ridesData)) {
                setMyRides(ridesData);
                setRidesTotalPages(0);
            } else {
                setMyRides(Array.isArray(ridesData.content) ? ridesData.content : []);
                setRidesTotalPages(Number.isFinite(ridesData.totalPages) ? ridesData.totalPages : 0);
            }

            // bookingService is expected to return either an array (legacy) or a paginated response
            if (Array.isArray(bookingsData)) {
                setBookings(bookingsData);
                setBookingsTotalPages(0);
            } else {
                setBookings(Array.isArray(bookingsData.content) ? bookingsData.content : []);
                setBookingsTotalPages(Number.isFinite(bookingsData.totalPages) ? bookingsData.totalPages : 0);
            }

            // Handle pending bookings response (array or paginated)
            if (Array.isArray(pendingData)) {
                setPendingBookings(pendingData);
                setPendingTotalPages(0);
            } else {
                setPendingBookings(Array.isArray(pendingData.content) ? pendingData.content : []);
                setPendingTotalPages(Number.isFinite(pendingData.totalPages) ? pendingData.totalPages : 0);
            }

            // Handle history response (array or paginated)
            if (Array.isArray(historyData)) {
                setRideHistory(historyData);
                setHistoryTotalPages(0);
            } else {
                setRideHistory(Array.isArray(historyData.content) ? historyData.content : []);
                setHistoryTotalPages(Number.isFinite(historyData.totalPages) ? historyData.totalPages : 0);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            // Set empty arrays on error to prevent undefined issues
            setMyRides([]);
            setBookings([]);
            setPendingBookings([]);
            setRideHistory([]);
        }
    };

    // Separate helper to fetch only bookings for pagination changes
    const fetchBookingsPage = async (page = bookingsPage, size = bookingsSize) => {
        try {
            const resp = await bookingService.getDriverBookings({ page, size });
            if (Array.isArray(resp)) {
                setBookings(resp);
                setBookingsTotalPages(0);
                // setBookingsTotalElements(resp.length);
            } else {
                setBookings(Array.isArray(resp.content) ? resp.content : []);
                setBookingsTotalPages(Number.isFinite(resp.totalPages) ? resp.totalPages : 0);
                // setBookingsTotalElements(Number.isFinite(resp.totalElements) ? resp.totalElements : (Array.isArray(resp.content) ? resp.content.length : 0));
            }
            setBookingsPage(page);
            setBookingsSize(size);
        } catch (err) {
            console.error('Error fetching bookings page:', err);
            setBookings([]);
        }
    };

    // Fetch rides page (server-side if available, otherwise keep full list and use client-side slicing)
    const fetchRidesPage = async (page = ridesPage, size = ridesSize) => {
        try {
            const resp = await rideService.getMyRides({ page, size });
            if (Array.isArray(resp)) {
                // server returned full array
                setMyRides(resp);
                setRidesTotalPages(0);
            } else {
                setMyRides(Array.isArray(resp.content) ? resp.content : []);
                setRidesTotalPages(Number.isFinite(resp.totalPages) ? resp.totalPages : 0);
            }
            setRidesPage(page);
            setRidesSize(size);
        } catch (err) {
            // Fallback: try non-paginated endpoint
            try {
                const all = await rideService.getMyRides();
                setMyRides(Array.isArray(all) ? all : []);
                setRidesTotalPages(0);
            } catch (e) {
                console.error('Error fetching rides page:', err, e);
                setMyRides([]);
            }
        }
    };

    // Fetch pending bookings page
    const fetchPendingPage = async (page = pendingPage, size = pendingSize) => {
        try {
            const resp = await bookingService.getPendingBookings({ page, size });
            if (Array.isArray(resp)) {
                setPendingBookings(resp);
                setPendingTotalPages(0);
            } else {
                setPendingBookings(Array.isArray(resp.content) ? resp.content : []);
                setPendingTotalPages(Number.isFinite(resp.totalPages) ? resp.totalPages : 0);
            }
            setPendingPage(page);
            setPendingSize(size);
        } catch (err) {
            // Fallback: try non-paginated endpoint
            try {
                const all = await bookingService.getPendingBookings();
                setPendingBookings(Array.isArray(all) ? all : []);
                setPendingTotalPages(0);
            } catch (e) {
                console.error('Error fetching pending bookings page:', err, e);
                setPendingBookings([]);
            }
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

    // When the user opens the bookings tab, ensure we have the correct page loaded.
    useEffect(() => {
        if (activeTab === 'bookings') {
            fetchBookingsPage(bookingsPage, bookingsSize);
        } else if (activeTab === 'pending') {
            fetchPendingPage(pendingPage, pendingSize);
        } else if (activeTab === 'history') {
            fetchHistoryPage(historyPage, historySize);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    const handleAcceptBooking = async (bookingId) => {
        const confirm = await showConfirm(
            'Are you sure you want to accept this booking? An email notification will be sent to the passenger.',
            'Yes, Accept',
            'Cancel'
        );

        if (!confirm.isConfirmed) return;

        setLoading(true);
        try {
            await bookingService.acceptBooking(bookingId);
            await showSuccess('Booking accepted successfully! Passenger has been notified via email.');
            await fetchPendingPage(pendingPage, pendingSize);
        } catch (error) {
            await showError(error.message || 'Error accepting booking');
        } finally {
            setLoading(false);
        }
    };

    const handleDeclineBooking = async (bookingId) => {
        const confirm = await showConfirm(
            'Are you sure you want to decline this booking?',
            'Yes, Decline',
            'Cancel'
        );

        if (!confirm.isConfirmed) return;

        setLoading(true);
        try {
            await bookingService.declineBooking(bookingId);
            await showSuccess('Booking declined successfully.');
            await fetchPendingPage(pendingPage, pendingSize);
        } catch (error) {
            await showError(error.message || 'Error declining booking');
        } finally {
            setLoading(false);
        }
    };

    const handleRescheduleClick = (rideId) => {
        const ride = myRides.find(r => r.id === rideId);
        if (ride) {
            setRescheduleRideId(rideId);
            setRescheduleForm({
                newDate: ride.date || '',
                newTime: ride.time || '',
                reason: ''
            });
            setShowRescheduleModal(true);
        }
    };

    const handleRescheduleSubmit = async (e) => {
        e.preventDefault();
        
        if (!rescheduleForm.newDate || !rescheduleForm.newTime) {
            await showError('Please select both new date and time');
            return;
        }

        const confirm = await showConfirm(
            `Reschedule this ride to ${rescheduleForm.newDate} at ${rescheduleForm.newTime}? All passengers will be notified via email.`,
            'Yes, Reschedule',
            'Cancel'
        );

        if (!confirm.isConfirmed) return;

        setLoading(true);
        try {
            await rideService.rescheduleRide(rescheduleRideId, {
                newDate: rescheduleForm.newDate,
                newTime: rescheduleForm.newTime,
                reason: rescheduleForm.reason || null
            });
            await showSuccess('Ride rescheduled successfully! All passengers have been notified via email.');
            setShowRescheduleModal(false);
            setRescheduleRideId(null);
            setRescheduleForm({ newDate: '', newTime: '', reason: '' });
            await fetchData();
        } catch (error) {
            await showError(error.message || 'Error rescheduling ride');
        } finally {
            setLoading(false);
        }
    };

    // Filter rides to exclude cancelled and past dates
    const filteredRides = myRides.filter(ride => !(ride.status === 'CANCELLED' || (ride.date && isDatePassed(ride.date))));

    // Filter bookings to exclude cancelled and past dates
    const filteredBookings = bookings.filter(booking => !(booking.status === 'CANCELLED' || (booking.ride?.date && isDatePassed(booking.ride.date))));

    // Compute displayed arrays: server-side pagination returns already-paged content (ridesTotalPages>0),
    // otherwise fall back to client-side slicing of the full arrays.
    const displayedRides = (() => {
        if (ridesTotalPages > 0) return filteredRides;
        const start = ridesPage * ridesSize;
        return filteredRides.slice(start, start + ridesSize);
    })();

    const displayedBookings = (() => {
        if (bookingsTotalPages > 0) return filteredBookings;
        const start = bookingsPage * bookingsSize;
        return filteredBookings.slice(start, start + bookingsSize);
    })();

    // Client-side pagination for pending bookings
    const displayedPendingBookings = useMemo(() => {
        if (pendingTotalPages > 0) return pendingBookings;
        const start = pendingPage * pendingSize;
        return pendingBookings.slice(start, start + pendingSize);
    }, [pendingBookings, pendingPage, pendingSize, pendingTotalPages]);

    // Client-side pagination for history
    const displayedHistory = useMemo(() => {
        if (historyTotalPages > 0) return rideHistory;
        const start = historyPage * historySize;
        return rideHistory.slice(start, start + historySize);
    }, [rideHistory, historyPage, historySize, historyTotalPages]);

    const handleCancelRide = async (rideId) => {
        const confirm = await showConfirm(
            'Are you sure you want to cancel this ride? All bookings will be cancelled and refunded.',
            'Yes, Cancel Ride',
            'No'
        );

        if (!confirm.isConfirmed) return;

        try {
            // Use response payload which includes updated lists
            const resp = await rideService.cancelRide(rideId);
            // If backend returned the consolidated response, update local state directly
            if (resp && resp.myRides) {
                setMyRides(Array.isArray(resp.myRides) ? resp.myRides : []);
            } else {
                // fallback: remove cancelled ride locally
                setMyRides(prev => prev.map(r => r.id === rideId ? ({...r, status: 'CANCELLED'}) : r));
            }

            if (resp && resp.driverBookings) {
                // If backend returned paginated driverBookings, attempt to set paging info
                const db = resp.driverBookings;
                if (Array.isArray(db)) {
                    setBookings(db);
                    setBookingsTotalPages(0);
                    // setBookingsTotalElements(db.length);
                } else {
                    setBookings(Array.isArray(db.content) ? db.content : []);
                    setBookingsTotalPages(Number.isFinite(db.totalPages) ? db.totalPages : 0);
                }
            }

            await showSuccess('Ride cancelled successfully!');
            // Keep UI on same tab; counts should update from state above
        } catch (error) {
            await showError(error.message || 'Error cancelling ride');
        }
    };

    const handlePhotoUpload = (e) => {
        const files = Array.from(e.target.files);
        const imageFiles = files.filter(file => file.type.startsWith('image/'));

        if (imageFiles.length === 0) {
            showError('Please select valid image files');
            return;
        }

        const promises = imageFiles.map((file) => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    resolve(reader.result);
                };
                reader.onerror = () => {
                    resolve(null);
                };
                reader.readAsDataURL(file);
            });
        });

        Promise.all(promises).then((base64Strings) => {
            const validPhotos = base64Strings.filter(photo => photo !== null);
            const updatedPhotos = [...vehiclePhotos, ...validPhotos].slice(0, 5); // Max 5 photos
            setVehiclePhotos(updatedPhotos);
            // Reset file input
            e.target.value = '';
        });
    };

    const removePhoto = (index) => {
        setVehiclePhotos(vehiclePhotos.filter((_, i) => i !== index));
    };

    // Vehicle details photo handlers
    const handleMasterPhotoUpload = (e) => {
        const files = Array.from(e.target.files);
        const imageFiles = files.filter(file => file.type.startsWith('image/'));

        if (imageFiles.length === 0) {
            showError('Please select valid image files');
            return;
        }

        const promises = imageFiles.map((file) => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    resolve(reader.result);
                };
                reader.onerror = () => {
                    resolve(null);
                };
                reader.readAsDataURL(file);
            });
        });

        Promise.all(promises).then((base64Strings) => {
            const validPhotos = base64Strings.filter(photo => photo !== null);
            const updatedPhotos = [...masterVehiclePhotos, ...validPhotos].slice(0, 5); // Max 5 photos
            setMasterVehiclePhotos(updatedPhotos);
            e.target.value = '';
        });
    };

    const removeMasterPhoto = (index) => {
        setMasterVehiclePhotos(masterVehiclePhotos.filter((_, i) => i !== index));
    };

    // Save vehicle details
    const handleSaveVehicleDetails = async (e) => {
        e.preventDefault();

        // Validate vehicle photos
        if (masterVehiclePhotos.length < 4) {
            await showError('Please upload at least 4 photos of your vehicle');
            return;
        }

        if (masterVehiclePhotos.length > 5) {
            await showError('Please upload maximum 5 photos');
            return;
        }

        // Validate vehicle condition fields
        if (vehicleDetailsForm.hasAC === null || vehicleDetailsForm.hasAC === undefined) {
            await showError('Please specify if your vehicle has AC');
            return;
        }

        if (!vehicleDetailsForm.vehicleType || vehicleDetailsForm.vehicleType.trim() === '') {
            await showError('Please specify your vehicle type (Car, Bike, etc.)');
            return;
        }

        setLoading(true);
        try {
            await userService.saveMasterVehicleDetails({
                vehiclePhotos: masterVehiclePhotos,
                hasAC: vehicleDetailsForm.hasAC,
                vehicleType: vehicleDetailsForm.vehicleType,
                vehicleModel: vehicleDetailsForm.vehicleModel,
                vehicleColor: vehicleDetailsForm.vehicleColor,
                otherFeatures: vehicleDetailsForm.otherFeatures,
            });
            await showSuccess('Vehicle details saved successfully!');
            await loadMasterDetails();
            setShowVehicleDetailsForm(false);
        } catch (error) {
            await showError(error.message || 'Error saving vehicle details');
        } finally {
            setLoading(false);
        }
    };

    // (handlers defined above)

    const handlePostRide = async (e) => {
        e.preventDefault();

        // Validate that master vehicle details exist
        if (!hasMasterDetails) {
            await showError('Please add your vehicle details first in the "Vehicle Details" section on the main dashboard');
            return;
        }

        // Validate basic ride details
        if (!postForm.date || !postForm.time || !postForm.availableSeats) {
            await showError('Please fill in all required fields (date, time, seats)');
            return;
        }

        const confirm = await showConfirm(
            `Post a ride from ${fromCity} to ${toCity} on ${postForm.date}?`,
            'Yes, Post Ride',
            'Cancel'
        );

        if (!confirm.isConfirmed) return;

        setLoading(true);

        try {
            // Use city names for both city-level and specific locations
            // Always use master details for vehicle information
            await rideService.postRide({
                citySource: fromCity,
                cityDestination: toCity,
                source: fromCity,
                destination: toCity,
                // include any pickup/drop locations (filter out empty entries)
                pickupLocations: pickupLocations.filter(x => x && x.trim().length > 0),
                dropLocations: dropLocations.filter(x => x && x.trim().length > 0),
                date: postForm.date,
                time: postForm.time,
                availableSeats: parseInt(postForm.availableSeats),
                useMasterDetails: true, // Always use master details
            });
            await showSuccess('Ride posted successfully!');
            setShowPostForm(false);
            setPostForm({
                date: '',
                time: '',
                availableSeats: '',
                hasAC: null,
                vehicleType: '',
                vehicleModel: '',
                vehicleColor: '',
                otherFeatures: '',
            });
            setFromCity('');
            setToCity('');
            setPickupLocations(['', '', '', '']);
            setDropLocations(['', '', '', '']);
            setPostStep(1);
            setVehiclePhotos([]);
            setUseMasterDetails(false);
            // Refresh data to show newly posted ride
            await fetchData();
            // Switch to rides tab to show updated list
            setActiveTab('rides');
        } catch (error) {
            await showError(error.message || 'Error posting ride');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative overflow-hidden">
            {/* Animated Background Elements */}
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
                                    <span>Driver Dashboard</span>
                                </h1>
                                <p className="text-gray-600 mt-1 text-sm">
                                    Welcome, {(() => {
                                        const currentUser = authService.getCurrentUser();
                                        const driverName = currentUser?.name || currentUser?.email || 'Driver';
                                        return driverName.split(' ')[0] + ' ' + (driverName.split(' ')[1]?.[0] || '') + '.';
                                    })()} Manage your shifts, earnings, and vehicle documentation.
                                </p>
                            </div>
                        </div>
                        {currentView !== 'main' && (
                            <button
                                onClick={() => {
                                    setCurrentView('main');
                                    setShowPostForm(false);
                                    setActiveTab('rides');
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
                            {/* Welcome Section */}
                            <div className="mb-8">
                                <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                                    Driver Dashboard 🚗
                                </h1>
                                <p className="text-gray-600 text-lg">Manage your rides and earnings</p>
                            </div>

                            {/* Stats Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                            {/* Weekly Earnings Card */}
                            <div className="group relative bg-gradient-to-br from-green-500 via-emerald-600 to-teal-600 rounded-2xl shadow-lg p-6 transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-green-500/50 overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                            <DollarSign className="h-6 w-6 text-white" />
                                        </div>
                                        <div className="text-white/80 text-xs font-semibold">This Week</div>
                                    </div>
                                    <div className="text-white text-sm font-semibold mb-2 opacity-90">Weekly Earnings</div>
                                    <div className="text-4xl font-bold text-white mb-2">₹{stats.weeklyEarnings}</div>
                                    <div className="flex items-center text-green-100 text-sm">
                                        <TrendingUp className="h-4 w-4 mr-1" />
                                        <span>+12% vs last week</span>
                                    </div>
                                </div>
                            </div>

                            {/* Trips Completed Card */}
                            <div className="group relative bg-gradient-to-br from-blue-500 via-blue-600 to-cyan-600 rounded-2xl shadow-lg p-6 transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/50 overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                            <CheckCircle2 className="h-6 w-6 text-white" />
                                        </div>
                                        <div className="text-white/80 text-xs font-semibold">This Week</div>
                                    </div>
                                    <div className="text-white text-sm font-semibold mb-2 opacity-90">Trips Completed</div>
                                    <div className="text-4xl font-bold text-white mb-2">{stats.tripsCompleted}</div>
                                    <div className="flex items-center text-blue-100 text-sm">
                                        <Clock className="h-4 w-4 mr-1" />
                                        <span>35 hours logged</span>
                                    </div>
                                </div>
                            </div>

                            {/* Overall Rating Card */}
                            <div className="group relative bg-gradient-to-br from-amber-500 via-yellow-600 to-orange-600 rounded-2xl shadow-lg p-6 transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-amber-500/50 overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                            <Star className="h-6 w-6 text-white fill-white" />
                                        </div>
                                        <div className="text-white/80 text-xs font-semibold">Rating</div>
                                    </div>
                                    <div className="text-white text-sm font-semibold mb-2 opacity-90">Overall Rating</div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="text-4xl font-bold text-white">{stats.overallRating}</div>
                                        <Star className="h-7 w-7 text-white fill-white" />
                                    </div>
                                    <div className="flex items-center text-amber-100 text-sm">
                                        <Users className="h-4 w-4 mr-1" />
                                        <span>Based on {stats.ratingCount} ratings</span>
                                    </div>
                                </div>
                            </div>

                            {/* Acceptance Rate Card */}
                            <div className="group relative bg-gradient-to-br from-purple-500 via-indigo-600 to-blue-600 rounded-2xl shadow-lg p-6 transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/50 overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                            <CheckCircle className="h-6 w-6 text-white" />
                                        </div>
                                        <div className="text-white/80 text-xs font-semibold">Quality</div>
                                    </div>
                                    <div className="text-white text-sm font-semibold mb-2 opacity-90">Acceptance Rate</div>
                                    <div className="text-4xl font-bold text-white mb-2">{stats.acceptanceRate}%</div>
                                    <div className="flex items-center text-purple-100 text-sm">
                                        <TrendingUp className="h-4 w-4 mr-1" />
                                        <span>Maintaining high quality</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Navigation Buttons */}
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                                <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Driver Tools & Settings</span>
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                                <button
                                    onClick={() => {
                                        setCurrentView('post-ride');
                                        setShowPostForm(true);
                                    }}
                                    className="group relative bg-white rounded-2xl shadow-lg p-8 transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/30 border-2 border-transparent hover:border-purple-200 flex flex-col items-center justify-center gap-4 overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-pink-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                    <div className="relative z-10 p-4 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg">
                                        <Plus className="h-10 w-10 text-white" />
                                    </div>
                                    <span className="relative z-10 font-bold text-gray-800 text-lg group-hover:text-purple-600 transition-colors duration-300">Post Ride</span>
                                    <p className="relative z-10 text-sm text-gray-500 group-hover:text-gray-700">Create new ride</p>
                                </button>
                                <button
                                    onClick={() => {
                                        setCurrentView('rides');
                                        setActiveTab('rides');
                                        fetchData();
                                    }}
                                    className="group relative bg-white rounded-2xl shadow-lg p-8 transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/30 border-2 border-transparent hover:border-blue-200 flex flex-col items-center justify-center gap-4 overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-cyan-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                    <div className="relative z-10 p-4 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg">
                                        <Car className="h-10 w-10 text-white" />
                                    </div>
                                    <span className="relative z-10 font-bold text-gray-800 text-lg group-hover:text-blue-600 transition-colors duration-300">My Rides</span>
                                    <p className="relative z-10 text-sm text-gray-500 group-hover:text-gray-700">Manage your rides</p>
                                </button>
                                <button
                                    onClick={() => {
                                        setCurrentView('pending');
                                        setActiveTab('pending');
                                        fetchData();
                                    }}
                                    className="group relative bg-white rounded-2xl shadow-lg p-8 transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-orange-500/30 border-2 border-transparent hover:border-orange-200 flex flex-col items-center justify-center gap-4 overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-amber-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                    <div className="relative z-10 p-4 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg">
                                        <Bell className="h-10 w-10 text-white" />
                                    </div>
                                    <span className="relative z-10 font-bold text-gray-800 text-lg group-hover:text-orange-600 transition-colors duration-300">Requests</span>
                                    <p className="relative z-10 text-sm text-gray-500 group-hover:text-gray-700">Review bookings</p>
                                </button>
                                <button
                                    onClick={() => {
                                        setCurrentView('history');
                                        setActiveTab('history');
                                        fetchData();
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
                                <button
                                    onClick={() => {
                                        setCurrentView('vehicle-details');
                                        setShowVehicleDetailsForm(true);
                                        loadMasterDetails();
                                    }}
                                    className="group relative bg-white rounded-2xl shadow-lg p-8 transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-teal-500/30 border-2 border-transparent hover:border-teal-200 flex flex-col items-center justify-center gap-4 overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-teal-50 to-cyan-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                    <div className="relative z-10 p-4 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg">
                                        <Car className="h-10 w-10 text-white" />
                                    </div>
                                    <span className="relative z-10 font-bold text-gray-800 text-lg group-hover:text-teal-600 transition-colors duration-300">Vehicle Details</span>
                                    <p className="relative z-10 text-sm text-gray-500 group-hover:text-gray-700">Manage vehicle info</p>
                                </button>
                            </div>
                        </div>
                        </div>
                    </div>
                )}

                {/* Vehicle Details Section */}
                {currentView === 'vehicle-details' && showVehicleDetailsForm && (
                    <div className="bg-white rounded-xl shadow-2xl p-6 mb-6 border-2 border-purple-300/50 backdrop-blur-sm">
                        <h2 className="text-2xl font-bold mb-6 flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                            <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg">
                                <Car className="h-5 w-5 text-white" />
                            </div>
                            <span>Vehicle Details</span>
                        </h2>
                        <p className="text-gray-600 mb-6">Manage your vehicle information. These details will be automatically used when posting rides.</p>

                        <form onSubmit={handleSaveVehicleDetails} className="space-y-6">
                            {/* Vehicle Photos Section */}
                            <div className="border-t-2 border-gray-200 pt-6">
                                <label className="block text-sm font-semibold text-gray-700 mb-3">Vehicle Photos * (4-5 photos required)</label>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                                    {masterVehiclePhotos.map((photo, index) => (
                                        <div key={index} className="relative">
                                            <img src={photo} alt={`Vehicle ${index + 1}`} className="w-full h-32 object-cover rounded-lg border-2 border-gray-300" />
                                            <button type="button" onClick={() => removeMasterPhoto(index)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-all">
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                    {masterVehiclePhotos.length < 5 && (
                                        <label className="cursor-pointer">
                                            <div className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-purple-500 transition-all bg-gray-50">
                                                <div className="text-center">
                                                    <Upload className="h-6 w-6 text-purple-400 mx-auto mb-1" />
                                                    <span className="text-xs text-gray-500">Add Photo</span>
                                                </div>
                                            </div>
                                            <input type="file" accept="image/*" multiple onChange={handleMasterPhotoUpload} className="hidden" />
                                        </label>
                                    )}
                                </div>
                                {masterVehiclePhotos.length > 0 && masterVehiclePhotos.length < 4 && (
                                    <p className="text-sm text-orange-600 mt-2">Please upload at least {4 - masterVehiclePhotos.length} more photo(s)</p>
                                )}
                            </div>

                            {/* Vehicle Condition Details */}
                            <div className="border-t-2 border-gray-200 pt-6">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Vehicle Condition Details *</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Vehicle Type * (Car, Bike, etc.)</label>
                                        <select
                                            required
                                            value={vehicleDetailsForm.vehicleType}
                                            onChange={(e) => setVehicleDetailsForm({ ...vehicleDetailsForm, vehicleType: e.target.value })}
                                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        >
                                            <option value="">Select Vehicle Type</option>
                                            <option value="Car">Car</option>
                                            <option value="Bike">Bike</option>
                                            <option value="Scooter">Scooter</option>
                                            <option value="Auto">Auto</option>
                                            <option value="SUV">SUV</option>
                                            <option value="Van">Van</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Has AC? *</label>
                                        <div className="flex space-x-4 mt-2">
                                            <label className="flex items-center space-x-2 cursor-pointer">
                                                <input type="radio" name="hasAC" value="true" checked={vehicleDetailsForm.hasAC === true} onChange={() => setVehicleDetailsForm({ ...vehicleDetailsForm, hasAC: true })} className="w-4 h-4 text-purple-600" required />
                                                <span className="flex items-center"><Snowflake className="h-4 w-4 mr-1" />Yes</span>
                                            </label>
                                            <label className="flex items-center space-x-2 cursor-pointer">
                                                <input type="radio" name="hasAC" value="false" checked={vehicleDetailsForm.hasAC === false} onChange={() => setVehicleDetailsForm({ ...vehicleDetailsForm, hasAC: false })} className="w-4 h-4 text-purple-600" required />
                                                <span>No</span>
                                            </label>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Vehicle Model</label>
                                        <input type="text" value={vehicleDetailsForm.vehicleModel} onChange={(e) => setVehicleDetailsForm({ ...vehicleDetailsForm, vehicleModel: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" placeholder="e.g., Honda City, Yamaha R15" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Vehicle Color</label>
                                        <input type="text" value={vehicleDetailsForm.vehicleColor} onChange={(e) => setVehicleDetailsForm({ ...vehicleDetailsForm, vehicleColor: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" placeholder="e.g., White, Black, Red" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Other Features</label>
                                        <textarea value={vehicleDetailsForm.otherFeatures} onChange={(e) => setVehicleDetailsForm({ ...vehicleDetailsForm, otherFeatures: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" rows="3" placeholder="e.g., Music system, GPS navigation, Leather seats, etc." />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end space-x-4 pt-4">
                                <button type="button" onClick={() => { setCurrentView('main'); setShowVehicleDetailsForm(false); }} className="px-8 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-semibold shadow-md">Cancel</button>
                                <button type="submit" disabled={loading} className="px-8 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-lg disabled:opacity-50 font-semibold shadow-lg">Save Vehicle Details</button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Existing Content - Conditional on currentView */}
                {(currentView === 'post-ride' || currentView === 'rides' || currentView === 'bookings' || currentView === 'pending' || currentView === 'history') && (
                    <>
                        {(currentView === 'post-ride' || showPostForm) && (
                    <div className="bg-white rounded-xl shadow-2xl p-6 mb-6 border-2 border-purple-300/50 backdrop-blur-sm">
                        <h2 className="text-2xl font-bold mb-6 flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                            <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
                                <Plus className="h-5 w-5 text-white" />
                            </div>
                            <span>Post a New Ride</span>
                        </h2>

                        {/* Stepper */}
                        <div className="flex items-center justify-center space-x-4 mb-6">
                            {[1,2,3].map((s) => (
                                <div key={s} className="flex items-center">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${postStep >= s ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700'}`}>{s}</div>
                                    {s !== 3 && <div className={`w-10 h-1 mx-2 ${postStep > s ? 'bg-purple-600' : 'bg-gray-200'}`}></div>}
                                </div>
                            ))}
                        </div>

                        {/* Step 1: From/To Cities (cities only) */}
                         {postStep === 1 && (
                             <div className="space-y-6">
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <div>
                                         <label className="block text-sm font-semibold text-gray-700 mb-2">From City *</label>
                                         <CityAutocomplete
                                             value={fromCity}
                                             onChange={(v) => {
                                                 setFromCity(v);
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
                                             }}
                                             placeholder="Type a city (e.g., Bengaluru)"
                                             mode="city"
                                         />
                                     </div>
                                 </div>
                                 <div className="flex justify-end">
                                     <button
                                         onClick={() => setPostStep(2)}
                                         disabled={!fromCity || !toCity || fromCity.trim().length < 2 || toCity.trim().length < 2}
                                        className="px-6 py-2 bg-purple-600 text-white rounded-lg disabled:opacity-50"
                                     >
                                         Next
                                     </button>
                                 </div>
                             </div>
                         )}

                        {/* Step 2: Pickup & Drop Locations (4 each) */}
                        {postStep === 2 && (
                            <>
                                <div className="space-y-6">
                                    {/* Review Selected Route - green card like in the reference */}
                                    <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-lg">
                                        <h3 className="text-sm font-semibold text-green-800 mb-3">Review Your Route</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-green-700 mb-1">From City</label>
                                                <div className="text-sm font-medium text-gray-900">{fromCity}</div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-green-700 mb-1">To City</label>
                                                <div className="text-sm font-medium text-gray-900">{toCity}</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <h3 className="text-sm font-semibold text-gray-700 mb-1">Select 4 Pickup Locations in {fromCity} *</h3>
                                            <p className="text-xs text-gray-600 mb-3">
                                                Choose 4 areas in {fromCity} where passengers can be picked up. You can search for any location within {fromCity}.
                                            </p>
                                            <div className="grid grid-cols-1 gap-3">
                                                {pickupLocations.map((val, idx) => (
                                                    <div key={`pickup-wrap-${idx}`} className="space-y-1">
                                                        <label className="block text-xs font-semibold text-gray-700">
                                                            Pickup Location {idx + 1} *
                                                        </label>
                                                        <CityAutocomplete
                                                            key={`pickup-${idx}`}
                                                            value={val}
                                                            onChange={(v) => handlePickupChange(idx, v)}
                                                            placeholder={`Search a place in ${fromCity}`}
                                                            withinCity={fromCity}
                                                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-semibold text-gray-700 mb-1">Select 4 Drop Locations in {toCity} *</h3>
                                            <p className="text-xs text-gray-600 mb-3">
                                                Choose 4 areas in {toCity} where passengers can be dropped off. You can search for any location within {toCity}.
                                            </p>
                                            <div className="grid grid-cols-1 gap-3">
                                                {dropLocations.map((val, idx) => (
                                                    <div key={`drop-wrap-${idx}`} className="space-y-1">
                                                        <label className="block text-xs font-semibold text-gray-700">
                                                            Drop Location {idx + 1} *
                                                        </label>
                                                        <CityAutocomplete
                                                            key={`drop-${idx}`}
                                                            value={val}
                                                            onChange={(v) => handleDropChange(idx, v)}
                                                            placeholder={`Search a place in ${toCity}`}
                                                            withinCity={toCity}
                                                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-between">
                                    <button type="button" onClick={() => setPostStep(1)} className="px-8 py-3 bg-gray-200 rounded-lg">Back</button>
                                    <div className="flex">
                                        <button
                                            type="button"
                                            onClick={() => setPostStep(3)}
                                            disabled={pickupLocations.filter(Boolean).length !== 4 || dropLocations.filter(Boolean).length !== 4}
                                            className="px-6 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Step 3: Details (date, time, seats only) */}
                        {postStep === 3 && (
                            <form onSubmit={handlePostRide} className="space-y-6">
                             {/* Review Selected Route */}
                             <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg">
                                <h3 className="text-sm font-semibold text-blue-800 mb-3">Review Your Route</h3>
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <div>
                                         <label className="block text-xs font-semibold text-blue-700 mb-1">From</label>
                                         <div className="text-sm font-medium text-gray-900">{fromCity}</div>
                                     </div>
                                     <div>
                                         <label className="block text-xs font-semibold text-blue-700 mb-1">To</label>
                                         <div className="text-sm font-medium text-gray-900">{toCity}</div>
                                     </div>
                                 </div>
                             </div>

                                {/* Info about using master vehicle details */}
                                {hasMasterDetails && (
                                    <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-lg">
                                        <p className="text-sm text-green-800">
                                            <strong>Note:</strong> Your saved vehicle details (photos, type, model, etc.) will be automatically used for this ride.
                                        </p>
                                    </div>
                                )}
                                {!hasMasterDetails && (
                                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
                                        <p className="text-sm text-yellow-800">
                                            <strong>Note:</strong> Please add your vehicle details in the "Vehicle Details" section on the main dashboard before posting rides.
                                        </p>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Date *</label>
                                        <input
                                            type="date"
                                            required
                                            value={postForm.date}
                                            onChange={(e) => setPostForm({ ...postForm, date: e.target.value })}
                                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                            min={new Date().toISOString().split('T')[0]}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Time *</label>
                                        <input
                                            type="time"
                                            required
                                            value={postForm.time}
                                            onChange={(e) => setPostForm({ ...postForm, time: e.target.value })}
                                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Available Seats *</label>
                                        <input
                                            type="number"
                                            required
                                            min={1}
                                            value={postForm.availableSeats}
                                            onChange={(e) => setPostForm({ ...postForm, availableSeats: e.target.value })}
                                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                            placeholder="4"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-between">
                                    <button type="button" onClick={() => setPostStep(2)} className="px-8 py-3 bg-gray-200 rounded-lg">Back</button>
                                    <div className="flex space-x-4">
                                        <button type="submit" disabled={loading} className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg disabled:opacity-50 font-semibold shadow-lg">Post Ride</button>
                                        <button type="button" onClick={() => { setCurrentView('main'); setShowPostForm(false); setPostStep(1); }} className="px-8 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-semibold shadow-md">Cancel</button>
                                    </div>
                                </div>
                            </form>
                        )}
                    </div>
                )}

                {/* Tabs for Rides, Bookings, Pending, and History */}
                {(currentView === 'rides' || currentView === 'bookings' || currentView === 'pending' || currentView === 'history') && (
                <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl p-4 mb-8 border-2 border-purple-100/50 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-green-200/20 to-blue-200/20 rounded-full blur-3xl -mr-32 -mt-32"></div>
                    <div className="relative z-10">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <button
                                onClick={() => setActiveTab('rides')}
                                className={`px-4 py-2.5 rounded-xl font-bold transition-all duration-300 flex items-center justify-center space-x-2 text-sm ${
                                    activeTab === 'rides'
                                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-xl transform scale-105 hover:scale-110'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 hover:scale-102'
                                }`}
                            >
                                <Car className="h-4 w-4" />
                                <span className="hidden sm:inline">My Rides</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('bookings')}
                                className={`px-4 py-2.5 rounded-xl font-bold transition-all duration-300 flex items-center justify-center space-x-2 text-sm ${
                                    activeTab === 'bookings'
                                        ? 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-xl transform scale-105 hover:scale-110'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 hover:scale-102'
                                }`}
                            >
                                <Ticket className="h-4 w-4" />
                                <span className="hidden sm:inline">My Bookings</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('pending')}
                                className={`px-4 py-2.5 rounded-xl font-bold transition-all duration-300 flex items-center justify-center space-x-2 text-sm ${
                                    activeTab === 'pending'
                                        ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-xl transform scale-105 hover:scale-110'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gradient-to-r hover:from-orange-50 hover:to-amber-50 hover:scale-102'
                                }`}
                            >
                                <CheckCircle2 className="h-4 w-4" />
                                <span className="hidden sm:inline">Accept/Decline</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`px-4 py-2.5 rounded-xl font-bold transition-all duration-300 flex items-center justify-center space-x-2 text-sm ${
                                    activeTab === 'history'
                                        ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-xl transform scale-105 hover:scale-110'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-indigo-50 hover:scale-102'
                                }`}
                            >
                                <History className="h-4 w-4" />
                                <span className="hidden sm:inline">History</span>
                            </button>
                        </div>
                    </div>

                    {/* Rides Tab Content */}
                    {activeTab === 'rides' && (
                        <div className="mt-6 relative z-10">
                            <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border-2 border-purple-100/50 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-green-200/30 to-emerald-200/30 rounded-full blur-3xl -mr-32 -mt-32"></div>
                                <div className="relative z-10">
                                    <h2 className="text-2xl font-bold mb-8 flex items-center space-x-3 bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent">
                                        <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
                                            <Car className="h-5 w-5 text-white" />
                                        </div>
                                        <span>My Rides ({filteredRides.length})</span>
                                    </h2>
                                    {filteredRides.length === 0 ? (
                                        <div className="text-center py-16 relative z-10">
                                            <div className="inline-block p-6 bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl mb-4">
                                                <Car className="h-16 w-16 text-green-400 mx-auto" />
                                            </div>
                                            <p className="text-gray-700 text-lg font-semibold mb-2">No rides found.</p>
                                            <p className="text-gray-500 text-sm">Consider posting a new ride!</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-5">
                                            {displayedRides.map(ride => (
                                                <div key={ride.id} className="bg-gradient-to-r from-green-50/90 to-emerald-50/90 rounded-2xl shadow-lg p-6 border-2 border-green-200/50 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 group relative overflow-hidden">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex items-start space-x-3 flex-1">
                                                            <div className="h-10 w-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center flex-shrink-0">
                                                                <MapPin className="h-4 w-4" />
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="flex items-center space-x-2 mb-2">
                                                                    <h3 className="text-base md:text-lg font-semibold text-gray-800">
                                                                        {(ride.citySource || ride.source)} <span className="text-gray-500">→</span> {(ride.cityDestination || ride.destination)}
                                                                    </h3>
                                                                    {ride.status && (
                                                                        <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${ride.status === 'ACTIVE' || ride.status === 'SCHEDULED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                                            {ride.status === 'ACTIVE' ? 'SCHEDULED' : ride.status}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                                                                        <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-gray-100 text-gray-800">
                                                                            <Calendar className="h-3.5 w-3.5" />
                                                                            <span>{new Date(ride.date).toLocaleDateString()}</span>
                                                                        </span>
                                                                        <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-gray-100 text-gray-800">
                                                                            <Clock className="h-3.5 w-3.5" />
                                                                            <span>{new Date(`1970-01-01T${ride.time}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                                        </span>
                                                                        <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-gray-100 text-gray-800">
                                                                            <Users className="h-3.5 w-3.5" />
                                                                            <span>{ride.availableSeats} seats</span>
                                                                        </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right ml-4 flex flex-col items-end space-y-2">
                                                            <div>
                                                                <div className="text-[11px] text-gray-500 leading-tight">Estimated Fare</div>
                                                                <div className="text-lg md:text-xl font-bold text-green-600">₹{(ride.estimatedFare ?? 0).toFixed(2)}</div>
                                                            </div>
                                                            <div className="flex space-x-2">
                                                                <button
                                                                    onClick={() => handleRescheduleClick(ride.id)}
                                                                    className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm shadow-sm flex items-center space-x-1"
                                                                >
                                                                    <Edit className="h-3.5 w-3.5" />
                                                                    <span>Reschedule</span>
                                                                </button>
                                                                <button
                                                                    onClick={() => handleCancelRide(ride.id)}
                                                                    className="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-md text-sm shadow-sm"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {/* Pagination Controls (for rides) */}
                                    {ridesTotalPages > 0 && (
                                        <div className="px-6 py-4 flex items-center justify-between bg-white/80 backdrop-blur-sm border-t mt-6 rounded-xl shadow-lg">
                                            <div className="text-sm text-gray-600">
                                                Showing page {ridesPage + 1}
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <button onClick={() => fetchRidesPage(ridesPage - 1, ridesSize)} disabled={ridesPage === 0} className="px-3 py-1 rounded-md bg-white border hover:bg-gray-50 text-sm">Prev</button>
                                                <button onClick={() => fetchRidesPage(ridesPage + 1, ridesSize)} className="px-3 py-1 rounded-md bg-white border hover:bg-gray-50 text-sm">Next</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Bookings Tab Content */}
                    {activeTab === 'bookings' && (
                        <div className="mt-6 relative z-10">
                            <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border-2 border-purple-100/50 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-200/30 to-cyan-200/30 rounded-full blur-3xl -mr-32 -mt-32"></div>
                                <div className="relative z-10">
                                    <h2 className="text-2xl font-bold mb-8 flex items-center space-x-3 bg-gradient-to-r from-blue-600 via-cyan-600 to-green-600 bg-clip-text text-transparent">
                                        <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl shadow-lg">
                                            <Navigation className="h-5 w-5 text-white" />
                                        </div>
                                        <span>My Bookings ({filteredBookings.length})</span>
                                    </h2>
                                    {filteredBookings.length === 0 ? (
                                        <div className="text-center py-16 relative z-10">
                                            <div className="inline-block p-6 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-2xl mb-4">
                                                <Ticket className="h-20 w-20 text-blue-400 mx-auto" />
                                            </div>
                                            <p className="text-gray-700 text-xl font-semibold mb-2">No bookings found.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-5">
                                            {displayedBookings.map(booking => (
                                                <div key={booking.id} className="bg-gradient-to-r from-blue-50/90 to-cyan-50/90 rounded-2xl shadow-lg p-6 border-2 border-blue-200/50 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 group relative overflow-hidden">
                                            <div className="flex items-start justify-between">
                                                {/* Left: icon + route */}
                                                <div className="flex items-start space-x-3">
                                                    <div className="h-10 w-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center flex-shrink-0">
                                                        <MapPin className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center space-x-2">
                                                            <h3 className="text-base md:text-lg font-semibold text-gray-800">
                                                                {(booking.ride.citySource || booking.ride.source)} <span className="text-gray-500">→</span> {(booking.ride.cityDestination || booking.ride.destination)}
                                                            </h3>
                                                            <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${booking.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                                {booking.status}
                                                            </span>
                                                        </div>
                                                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                                                            <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-gray-100 text-gray-800">
                                                                <Calendar className="h-3.5 w-3.5" />
                                                                <span>{new Date(booking.ride.date).toLocaleDateString()}</span>
                                                            </span>
                                                            <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-gray-100 text-gray-800">
                                                                <Clock className="h-3.5 w-3.5" />
                                                                <span>{new Date(`1970-01-01T${booking.ride.time}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                            </span>
                                                            <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-gray-100 text-gray-800">
                                                                <Users className="h-3.5 w-3.5" />
                                                                <span>{booking.seats} seats</span>
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Right: fare */}
                                                <div className="text-right ml-4 flex flex-col items-end space-y-2">
                                                    <div>
                                                        <div className="text-[11px] text-gray-500 leading-tight">Estimated Fare</div>
                                                        <div className="text-lg md:text-xl font-bold text-green-600">₹{(booking.totalPrice ?? booking.fareAmount ?? 0).toFixed(2)}</div>
                                                    </div>
                                                </div>
                                            </div>
                                            </div>
                                    ))}

                                            {/* Pagination Controls (for bookings) */}
                                            {bookingsTotalPages > 0 && (
                                                <div className="px-6 py-4 flex items-center justify-between bg-white/80 backdrop-blur-sm border-t mt-6 rounded-xl shadow-lg">
                                                    <div className="text-sm text-gray-600">
                                                        Showing page {bookingsPage + 1}
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <button onClick={() => fetchBookingsPage(bookingsPage - 1, bookingsSize)} disabled={bookingsPage === 0} className="px-3 py-1 rounded-md bg-white border hover:bg-gray-50">Prev</button>
                                                        <button onClick={() => fetchBookingsPage(bookingsPage + 1, bookingsSize)} className="px-3 py-1 rounded-md bg-white border hover:bg-gray-50">Next</button>
                                                    </div>
                                                </div>
                                            )}
                                    </div>
                                )}
                        </div>
                    </div>
                </div>
                    )}

                    {/* Pending Bookings Tab Content */}
                    {activeTab === 'pending' && (
                        <div className="mt-6 relative z-10">
                            <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border-2 border-purple-100/50 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-orange-200/30 to-amber-200/30 rounded-full blur-3xl -mr-32 -mt-32"></div>
                                <div className="relative z-10">
                                    <h2 className="text-2xl font-bold mb-8 flex items-center space-x-3 bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 bg-clip-text text-transparent">
                                        <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl shadow-lg">
                                            <CheckCircle2 className="h-5 w-5 text-white" />
                                        </div>
                                        <span>Pending Bookings ({pendingBookings.length})</span>
                                    </h2>
                                    {pendingBookings.length === 0 ? (
                                        <div className="text-center py-16 relative z-10">
                                            <div className="inline-block p-6 bg-gradient-to-br from-orange-100 to-amber-100 rounded-2xl mb-4">
                                                <Bell className="h-20 w-20 text-orange-400 mx-auto" />
                                            </div>
                                            <p className="text-gray-700 text-xl font-semibold mb-2">No pending bookings found.</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="space-y-5">
                                                {displayedPendingBookings.map(booking => (
                                                    <div key={booking.id} className="bg-gradient-to-r from-orange-50/90 to-amber-50/90 rounded-2xl shadow-lg p-6 border-2 border-orange-200/50 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 group relative overflow-hidden">
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex items-start space-x-3 flex-1">
                                                                <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
                                                                    <MapPin className="h-5 w-5" />
                                                                </div>
                                                                <div className="flex-1">
                                                                    <div className="flex items-center space-x-2 mb-2">
                                                                        <h3 className="text-base md:text-lg font-semibold text-gray-800">
                                                                            {booking.pickupLocation} <span className="text-gray-500">→</span> {booking.dropoffLocation}
                                                                        </h3>
                                                                        <span className="text-xs font-semibold rounded-full px-2 py-0.5 bg-yellow-100 text-yellow-800">
                                                                            PENDING
                                                                        </span>
                                                                    </div>
                                                                    <div className="text-sm text-gray-600 mb-2">
                                                                        <p><strong>Passenger:</strong> {booking.passenger?.name || booking.passenger?.email || 'N/A'}</p>
                                                                        <p><strong>Ride:</strong> {(booking.ride?.citySource || booking.ride?.source)} → {(booking.ride?.cityDestination || booking.ride?.destination)}</p>
                                                                    </div>
                                                                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
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
                                                            </div>
                                                            <div className="text-right ml-4 flex flex-col items-end space-y-2">
                                                                <div>
                                                                    <div className="text-[11px] text-gray-500 leading-tight">Fare Amount</div>
                                                                    <div className="text-lg md:text-xl font-bold text-green-600">₹{(booking.fareAmount ?? 0).toFixed(2)}</div>
                                                                </div>
                                                                <div className="flex space-x-2">
                                                                    <button
                                                                        onClick={() => handleAcceptBooking(booking.id)}
                                                                        className="px-4 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-md text-sm shadow-sm flex items-center space-x-1"
                                                                    >
                                                                        <CheckCircle2 className="h-4 w-4" />
                                                                        <span>Accept</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeclineBooking(booking.id)}
                                                                        className="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-md text-sm shadow-sm flex items-center space-x-1"
                                                                    >
                                                                        <XCircle className="h-4 w-4" />
                                                                        <span>Decline</span>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            {/* Pagination Controls for Pending Bookings */}
                                            {((pendingTotalPages > 0 && pendingTotalPages > 1) || (pendingTotalPages === 0 && pendingBookings.length > pendingSize)) && (
                                                <div className="px-6 py-4 flex items-center justify-between bg-white/80 backdrop-blur-sm border-t mt-6 rounded-xl shadow-lg">
                                                    <div className="text-sm text-gray-600">
                                                        Showing page {pendingPage + 1}
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <button onClick={() => fetchPendingPage(Math.max(0, pendingPage - 1), pendingSize)} disabled={pendingPage <= 0} className="px-3 py-1 rounded-md bg-white border hover:bg-gray-50">Prev</button>
                                                        <button onClick={() => fetchPendingPage(pendingPage + 1, pendingSize)} className="px-3 py-1 rounded-md bg-white border hover:bg-gray-50">Next</button>
                                                    </div>
                                                </div>
                                            )}
                                    </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* History Tab Content */}
                    {activeTab === 'history' && (
                        <div className="mt-6 relative z-10">
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
                                                <div key={booking.id} className="bg-gradient-to-r from-purple-50/90 to-blue-50/90 rounded-2xl shadow-lg p-6 border-2 border-purple-200/50 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 group relative overflow-hidden">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex items-start space-x-3 flex-1">
                                                            <div className="h-10 w-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0">
                                                                <MapPin className="h-5 w-5" />
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="flex items-center space-x-2 mb-2">
                                                                    <h3 className="text-base md:text-lg font-semibold text-gray-800">
                                                                        {booking.pickupLocation} <span className="text-gray-500">→</span> {booking.dropoffLocation}
                                                                    </h3>
                                                                    <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${
                                                                        booking.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                                                        booking.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-800' :
                                                                        'bg-red-100 text-red-800'
                                                                    }`}>
                                                                        {booking.status}
                                                                    </span>
                                                                </div>
                                                                <div className="text-sm text-gray-600 mb-2">
                                                                    <p><strong>Passenger:</strong> {booking.passenger?.name || booking.passenger?.email || 'N/A'}</p>
                                                                    <p><strong>Ride:</strong> {(booking.ride?.citySource || booking.ride?.source)} → {(booking.ride?.cityDestination || booking.ride?.destination)}</p>
                                                                </div>
                                                                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
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
                                                        </div>
                                                        <div className="text-right ml-4">
                                                            <div className="text-[11px] text-gray-500 leading-tight">Fare Amount</div>
                                                            <div className="text-lg md:text-xl font-bold text-green-600">₹{(booking.fareAmount ?? 0).toFixed(2)}</div>
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
                                                <button onClick={() => fetchHistoryPage(Math.max(0, historyPage - 1), historySize)} disabled={historyPage <= 0} className="px-3 py-1 rounded-md bg-white border hover:bg-gray-50">Prev</button>
                                                <button onClick={() => fetchHistoryPage(historyPage + 1, historySize)} className="px-3 py-1 rounded-md bg-white border hover:bg-gray-50">Next</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                )}

                        {/* Reschedule Modal */}
                        {showRescheduleModal && (
                            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                                <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-xl font-bold text-gray-800 flex items-center space-x-2">
                                            <Edit className="h-5 w-5 text-blue-600" />
                                            <span>Reschedule Ride</span>
                                        </h2>
                                        <button
                                            onClick={() => {
                                                setShowRescheduleModal(false);
                                                setRescheduleRideId(null);
                                                setRescheduleForm({ newDate: '', newTime: '', reason: '' });
                                            }}
                                            className="text-gray-500 hover:text-gray-700"
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>
                                    <form onSubmit={handleRescheduleSubmit} className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">New Date *</label>
                                            <input
                                                type="date"
                                                required
                                                value={rescheduleForm.newDate}
                                                onChange={(e) => setRescheduleForm({ ...rescheduleForm, newDate: e.target.value })}
                                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                min={new Date().toISOString().split('T')[0]}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">New Time *</label>
                                            <input
                                                type="time"
                                                required
                                                value={rescheduleForm.newTime}
                                                onChange={(e) => setRescheduleForm({ ...rescheduleForm, newTime: e.target.value })}
                                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Reason (Optional)</label>
                                            <textarea
                                                value={rescheduleForm.reason}
                                                onChange={(e) => setRescheduleForm({ ...rescheduleForm, reason: e.target.value })}
                                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                rows="3"
                                                placeholder="Enter reason for rescheduling (optional)"
                                            />
                                        </div>
                                        <div className="flex space-x-3 pt-4">
                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-lg disabled:opacity-50"
                                            >
                                                {loading ? 'Rescheduling...' : 'Reschedule Ride'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowRescheduleModal(false);
                                                    setRescheduleRideId(null);
                                                    setRescheduleForm({ newDate: '', newTime: '', reason: '' });
                                                }}
                                                className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-semibold"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>

            <Footer fullWidth={true} />
        </div>
    );
};

export default DriverDashboard;