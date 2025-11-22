import { useState, useEffect, useMemo } from 'react';
import { Plus, MapPin, Calendar, Clock, Users, Car, Navigation, CheckCircle, X, Upload, Snowflake, Ticket, CheckCircle2, XCircle, History, Edit } from 'lucide-react';
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

    useEffect(() => {
        fetchData();
        loadMasterDetails();
    }, []);

    // Load master vehicle details
    const loadMasterDetails = async () => {
        try {
            const details = await userService.getMasterVehicleDetails();
            if (details) {
                setMasterDetails(details);
                setHasMasterDetails(true);
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

    // (handlers defined above)

    const handlePostRide = async (e) => {
        e.preventDefault();

        // Validate vehicle photos and details only if not using master details
        if (!useMasterDetails) {
            if (vehiclePhotos.length < 4) {
                await showError('Please upload at least 4 photos of your vehicle');
                return;
            }

            if (vehiclePhotos.length > 5) {
                await showError('Please upload maximum 5 photos');
                return;
            }

            // Validate vehicle condition fields
            if (postForm.hasAC === null || postForm.hasAC === undefined) {
                await showError('Please specify if your vehicle has AC');
                return;
            }

            if (!postForm.vehicleType || postForm.vehicleType.trim() === '') {
                await showError('Please specify your vehicle type (Car, Bike, etc.)');
                return;
            }
        } else if (!hasMasterDetails) {
            await showError('No master vehicle details found. Please save master details first or uncheck "Use Master Details".');
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
                useMasterDetails: useMasterDetails,
                vehiclePhotos: useMasterDetails ? [] : vehiclePhotos,
                hasAC: useMasterDetails ? null : postForm.hasAC,
                vehicleType: useMasterDetails ? null : postForm.vehicleType,
                vehicleModel: useMasterDetails ? null : postForm.vehicleModel,
                vehicleColor: useMasterDetails ? null : postForm.vehicleColor,
                otherFeatures: useMasterDetails ? null : postForm.otherFeatures,
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
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            <Navbar />

            <main className="flex-grow max-w-7xl mx-auto w-full px-3 sm:px-5 lg:px-6 py-5">
                <BackButton />

                {/* Header Section */}
                <div className="mb-6 bg-gradient-to-r from-white via-purple-50/30 to-blue-50/30 rounded-xl shadow-2xl p-5 border-2 border-purple-200/50 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg">
                                <Car className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center space-x-2">
                                    <span>Driver Dashboard</span>
                                </h1>
                                <p className="text-gray-600 mt-1 text-sm">
                                    Post rides and manage your bookings
                                    {(() => {
                                        const currentUser = authService.getCurrentUser();
                                        const driverName = currentUser?.name || currentUser?.email || '';
                                        return driverName ? ` • ${driverName}` : '';
                                    })()}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowPostForm(!showPostForm)}
                            className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-bold shadow-xl transform hover:scale-105 transition-all text-base ${
                                showPostForm
                                    ? 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700'
                                    : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700'
                            }`}
                        >
                            {showPostForm ? (
                                <>
                                    <X className="h-5 w-5" />
                                    <span>Cancel</span>
                                </>
                            ) : (
                                <>
                                    <Plus className="h-5 w-5" />
                                    <span>Post New Ride</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {showPostForm && (
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
                            </div>
                        )}

                        {/* Step 3: Details (date, time, photos, vehicle details) */}
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

                                {/* Master Details Option */}
                                <div className="border-t-2 border-gray-200 pt-6">
                                    <div className="flex items-center space-x-3 mb-4">
                                        <input
                                            type="checkbox"
                                            id="useMasterDetails"
                                            checked={useMasterDetails}
                                            onChange={(e) => {
                                                setUseMasterDetails(e.target.checked);
                                                if (e.target.checked && !hasMasterDetails) {
                                                    showError('No master vehicle details found. Please save master details first.');
                                                    setUseMasterDetails(false);
                                                }
                                            }}
                                            disabled={!hasMasterDetails}
                                            className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                                        />
                                        <label htmlFor="useMasterDetails" className="text-sm font-semibold text-gray-700 cursor-pointer">
                                            Use Master Vehicle Details {!hasMasterDetails && '(No master details saved yet)'}
                                        </label>
                                    </div>
                                    {hasMasterDetails && masterDetails && (
                                        <div className="bg-green-50 border-l-4 border-green-400 p-3 rounded mb-4">
                                            <p className="text-sm text-green-800">
                                                <strong>Master Details Available:</strong> {masterDetails.vehicleType || 'N/A'} 
                                                {masterDetails.vehicleModel && ` - ${masterDetails.vehicleModel}`}
                                                {masterDetails.hasAC !== undefined && ` | AC: ${masterDetails.hasAC ? 'Yes' : 'No'}`}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Vehicle Photos Section */}
                                {!useMasterDetails && (
                                <div className="border-t-2 border-gray-200 pt-6">
                                     <label className="block text-sm font-semibold text-gray-700 mb-3">Vehicle Photos * (4-5 photos required)</label>
                                     <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                                         {vehiclePhotos.map((photo, index) => (
                                             <div key={index} className="relative">
                                                 <img src={photo} alt={`Vehicle ${index + 1}`} className="w-full h-32 object-cover rounded-lg border-2 border-gray-300" />
                                                 <button type="button" onClick={() => removePhoto(index)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-all">
                                                     <X className="h-4 w-4" />
                                                 </button>
                                             </div>
                                         ))}
                                         {vehiclePhotos.length < 5 && (
                                             <label className="cursor-pointer">
                                                 <div className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-purple-500 transition-all bg-gray-50">
                                                     <div className="text-center">
                                                        <Upload className="h-6 w-6 text-purple-400 mx-auto mb-1" />
                                                         <span className="text-xs text-gray-500">Add Photo</span>
                                                     </div>
                                                 </div>
                                                 <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
                                             </label>
                                         )}
                                     </div>
                                     {vehiclePhotos.length > 0 && vehiclePhotos.length < 4 && (
                                         <p className="text-sm text-orange-600 mt-2">Please upload at least {4 - vehiclePhotos.length} more photo(s)</p>
                                     )}
                                 </div>
                                 )}

                                 {/* Vehicle Condition Details */}
                                 {!useMasterDetails && (
                                 <div className="border-t-2 border-gray-200 pt-6">
                                     <h3 className="text-lg font-semibold text-gray-800 mb-4">Vehicle Condition Details *</h3>
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                         <div>
                                             <label className="block text-sm font-semibold text-gray-700 mb-2">Vehicle Type * (Car, Bike, etc.)</label>
                                             <select
                                                 required
                                                 value={postForm.vehicleType}
                                                 onChange={(e) => setPostForm({ ...postForm, vehicleType: e.target.value })}
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
                                                    <input type="radio" name="hasAC" value="true" checked={postForm.hasAC === true} onChange={() => setPostForm({ ...postForm, hasAC: true })} className="w-4 h-4 text-purple-600" required />
                                                     <span className="flex items-center"><Snowflake className="h-4 w-4 mr-1" />Yes</span>
                                                 </label>
                                                 <label className="flex items-center space-x-2 cursor-pointer">
                                                    <input type="radio" name="hasAC" value="false" checked={postForm.hasAC === false} onChange={() => setPostForm({ ...postForm, hasAC: false })} className="w-4 h-4 text-purple-600" required />
                                                     <span>No</span>
                                                 </label>
                                             </div>
                                         </div>
                                         <div>
                                             <label className="block text-sm font-semibold text-gray-700 mb-2">Vehicle Model</label>
                                            <input type="text" value={postForm.vehicleModel} onChange={(e) => setPostForm({ ...postForm, vehicleModel: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" placeholder="e.g., Honda City, Yamaha R15" />
                                         </div>
                                         <div>
                                             <label className="block text-sm font-semibold text-gray-700 mb-2">Vehicle Color</label>
                                            <input type="text" value={postForm.vehicleColor} onChange={(e) => setPostForm({ ...postForm, vehicleColor: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" placeholder="e.g., White, Black, Red" />
                                         </div>
                                         <div className="md:col-span-2">
                                             <label className="block text-sm font-semibold text-gray-700 mb-2">Other Features</label>
                                            <textarea value={postForm.otherFeatures} onChange={(e) => setPostForm({ ...postForm, otherFeatures: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" rows="3" placeholder="e.g., Music system, GPS navigation, Leather seats, etc." />
                                         </div>
                                     </div>
                                 </div>
                                 )}

                                <div className="flex justify-between">
                                    <button type="button" onClick={() => setPostStep(2)} className="px-8 py-3 bg-gray-200 rounded-lg">Back</button>
                                    <div className="flex space-x-4">
                                        <button type="submit" disabled={loading} className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg disabled:opacity-50 font-semibold shadow-lg">Post Ride</button>
                                        <button type="button" onClick={() => { setShowPostForm(false); setPostStep(1); }} className="px-8 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-semibold shadow-md">Cancel</button>
                                    </div>
                                </div>
                            </form>
                        )}
                    </div>
                )}

                {/* Tabs for Rides, Bookings, Pending, and History */}
                <div className="bg-white rounded-xl shadow-2xl p-4 mb-8 border border-gray-100">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <button
                            onClick={() => setActiveTab('rides')}
                            className={`px-5 py-3 rounded-xl font-bold transition-all flex items-center justify-center space-x-2 text-base ${
                                activeTab === 'rides'
                                    ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-xl transform scale-105'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gradient-to-r hover:from-green-50 hover:to-green-100'
                            }`}
                        >
                            <Car className="h-5 w-5" />
                            <span className="hidden sm:inline">My Rides</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('bookings')}
                            className={`px-5 py-3 rounded-xl font-bold transition-all flex items-center justify-center space-x-2 text-base ${
                                activeTab === 'bookings'
                                    ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-xl transform scale-105'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gradient-to-r hover:from-green-50 hover:to-green-100'
                            }`}
                        >
                            <Ticket className="h-5 w-5" />
                            <span className="hidden sm:inline">My Bookings</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('pending')}
                            className={`px-5 py-3 rounded-xl font-bold transition-all flex items-center justify-center space-x-2 text-base ${
                                activeTab === 'pending'
                                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-xl transform scale-105'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100'
                            }`}
                        >
                            <CheckCircle2 className="h-5 w-5" />
                            <span className="hidden sm:inline">Accept/Decline</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`px-5 py-3 rounded-xl font-bold transition-all flex items-center justify-center space-x-2 text-base ${
                                activeTab === 'history'
                                    ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-xl transform scale-105'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-purple-100'
                            }`}
                        >
                            <History className="h-5 w-5" />
                            <span className="hidden sm:inline">History</span>
                        </button>
                    </div>

                    {/* Rides Tab Content */}
                    {activeTab === 'rides' && (
                        <div className="mt-6">
                            {/* Section header bar */}
                            <div className="rounded-lg bg-gradient-to-r from-green-600 to-green-500 text-white px-4 py-3 mb-3 flex items-center space-x-2">
                                <Navigation className="h-4 w-4" />
                                <span className="text-sm font-semibold">My Posted Rides ({filteredRides.length})</span>
                            </div>
                            {filteredRides.length === 0 ? (
                                <p className="text-center text-gray-500 py-6">No rides found. Consider posting a new ride!</p>
                            ) : (
                                <div>
                                    {/* Rides List (map over displayedRides) */}
                                    {displayedRides.map(ride => (
                                        <div key={ride.id} className="bg-white rounded-lg shadow-md p-4 mb-4 border-l-4 border-green-500">
                                            <div className="flex items-start justify-between">
                                                {/* Left: icon + route */}
                                                <div className="flex items-start space-x-3">
                                                    <div className="h-10 w-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center flex-shrink-0">
                                                        <MapPin className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center space-x-2">
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
                                                {/* Right: fare + actions */}
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
                                                            <Edit className="h-4 w-4" />
                                                            <span>Reschedule</span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleCancelRide(ride.id)}
                                                            className="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-md text-sm shadow-sm"
                                                        >
                                                            Cancel Ride
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Pagination Controls (for rides) */}
                                    {ridesTotalPages > 0 && (
                                        <div className="flex justify-between items-center mt-4">
                                            <button
                                                onClick={() => fetchRidesPage(ridesPage - 1, ridesSize)}
                                                disabled={ridesPage === 0}
                                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50"
                                            >
                                                Previous
                                            </button>
                                            <span className="text-sm text-gray-500">
                                                Page {ridesPage + 1} of {ridesTotalPages}
                                            </span>
                                            <button
                                                onClick={() => fetchRidesPage(ridesPage + 1, ridesSize)}
                                                disabled={ridesPage + 1 >= ridesTotalPages}
                                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Bookings Tab Content */}
                    {activeTab === 'bookings' && (
                        <div className="mt-6">
                            {/* Section header bar */}
                            <div className="rounded-lg bg-gradient-to-r from-green-600 to-green-500 text-white px-4 py-3 mb-3 flex items-center space-x-2">
                                <Navigation className="h-4 w-4" />
                                <span className="text-sm font-semibold">My Bookings ({filteredBookings.length})</span>
                            </div>
                            {filteredBookings.length === 0 ? (
                                <p className="text-center text-gray-500 py-6">No bookings found.</p>
                            ) : (
                                <div>
                                    {/* Bookings List (map over displayedBookings) */}
                                    {displayedBookings.map(booking => (
                                        <div key={booking.id} className="bg-white rounded-lg shadow-md p-4 mb-4 border-l-4 border-green-500">
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
                                        <div className="flex justify-between items-center mt-4">
                                            <button
                                                onClick={() => fetchBookingsPage(bookingsPage - 1, bookingsSize)}
                                                disabled={bookingsPage === 0}
                                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50"
                                            >
                                                Previous
                                            </button>
                                            <span className="text-sm text-gray-500">
                                                Page {bookingsPage + 1} of {bookingsTotalPages}
                                            </span>
                                            <button
                                                onClick={() => fetchBookingsPage(bookingsPage + 1, bookingsSize)}
                                                disabled={bookingsPage + 1 >= bookingsTotalPages}
                                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Pending Bookings Tab Content */}
                    {activeTab === 'pending' && (
                        <div className="mt-6">
                            <div className="rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 text-white px-4 py-3 mb-3 flex items-center space-x-2">
                                <CheckCircle2 className="h-4 w-4" />
                                <span className="text-sm font-semibold">Pending Bookings ({pendingTotalPages > 0 ? pendingBookings.length : pendingBookings.length})</span>
                            </div>
                            {pendingBookings.length === 0 ? (
                                <p className="text-center text-gray-500 py-6">No pending bookings found.</p>
                            ) : (
                                <div>
                                    {displayedPendingBookings.map(booking => (
                                        <div key={booking.id} className="bg-white rounded-lg shadow-md p-4 mb-4 border-l-4 border-blue-500">
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
                            )}

                            {/* Pagination Controls for Pending Bookings */}
                            {((pendingTotalPages > 0 && pendingTotalPages > 1) || (pendingTotalPages === 0 && pendingBookings.length > pendingSize)) && (
                                <div className="px-6 py-4 flex items-center justify-between bg-white border-t mt-4 rounded-lg">
                                    <div className="text-sm text-gray-600">
                                        Showing page {pendingPage + 1} {pendingTotalPages > 0 ? `of ${pendingTotalPages}` : `of ${Math.ceil(pendingBookings.length / pendingSize)}`} — {pendingBookings.length} pending bookings
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={() => {
                                                const newPage = Math.max(0, pendingPage - 1);
                                                if (pendingTotalPages > 0) {
                                                    fetchPendingPage(newPage, pendingSize);
                                                } else {
                                                    setPendingPage(newPage);
                                                }
                                            }}
                                            disabled={pendingPage <= 0}
                                            className={`px-3 py-1 rounded-md ${pendingPage <= 0 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-white border hover:bg-gray-50'}`}
                                        >Prev</button>
                                        <div className="flex items-center space-x-1">
                                            {Array.from({ length: pendingTotalPages > 0 ? pendingTotalPages : Math.ceil(Math.max(1, pendingBookings.length) / pendingSize) }).map((_, idx) => {
                                                const total = pendingTotalPages > 0 ? pendingTotalPages : Math.ceil(Math.max(1, pendingBookings.length) / pendingSize);
                                                const isCurrent = idx === pendingPage;
                                                const isEdge = idx === 0 || idx === total - 1;
                                                const isNear = Math.abs(idx - pendingPage) <= 2;
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
                                                            if (pendingTotalPages > 0) {
                                                                fetchPendingPage(idx, pendingSize);
                                                            } else {
                                                                setPendingPage(idx);
                                                            }
                                                        }}
                                                        className={`px-3 py-1 rounded-md ${isCurrent ? 'bg-blue-600 text-white' : 'bg-white border hover:bg-gray-100'}`}
                                                    >{idx + 1}</button>
                                                );
                                            })}
                                        </div>
                                        <button
                                            onClick={() => {
                                                const total = pendingTotalPages > 0 ? pendingTotalPages - 1 : Math.max(0, Math.ceil(pendingBookings.length / pendingSize) - 1);
                                                const newPage = Math.min(total, pendingPage + 1);
                                                if (pendingTotalPages > 0) {
                                                    fetchPendingPage(newPage, pendingSize);
                                                } else {
                                                    setPendingPage(newPage);
                                                }
                                            }}
                                            disabled={pendingPage >= (pendingTotalPages > 0 ? pendingTotalPages - 1 : Math.max(0, Math.ceil(pendingBookings.length / pendingSize) - 1))}
                                            className={`px-3 py-1 rounded-md ${pendingPage >= (pendingTotalPages > 0 ? pendingTotalPages - 1 : Math.max(0, Math.ceil(pendingBookings.length / pendingSize) - 1)) ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-white border hover:bg-gray-50'}`}
                                        >Next</button>
                                        <select
                                            value={pendingSize}
                                            onChange={(e) => {
                                                const newSize = parseInt(e.target.value, 10);
                                                setPendingSize(newSize);
                                                setPendingPage(0);
                                                if (pendingTotalPages > 0) {
                                                    fetchPendingPage(0, newSize);
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

                    {/* History Tab Content */}
                    {activeTab === 'history' && (
                        <div className="mt-6">
                            <div className="rounded-lg bg-gradient-to-r from-purple-600 to-purple-500 text-white px-4 py-3 mb-3 flex items-center space-x-2">
                                <History className="h-4 w-4" />
                                <span className="text-sm font-semibold">Ride History ({historyTotalPages > 0 ? rideHistory.length : rideHistory.length})</span>
                            </div>
                            {rideHistory.length === 0 ? (
                                <p className="text-center text-gray-500 py-6">No ride history found.</p>
                            ) : (
                                <div>
                                    {displayedHistory.map(booking => (
                                        <div key={booking.id} className="bg-white rounded-lg shadow-md p-4 mb-4 border-l-4 border-purple-500">
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
                </div>

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

                <Footer />
            </main>
        </div>
    );
};

export default DriverDashboard;
