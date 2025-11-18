import { useState, useEffect } from 'react';
import { Plus, MapPin, Calendar, Clock, Users, Car, Navigation, CheckCircle, X, Upload, Snowflake, Ticket, CheckCircle2, XCircle, History, Edit } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BackButton from '../components/BackButton';
import CityAutocomplete from '../components/CityAutocomplete';
import { rideService } from '../services/rideService';
import { bookingService } from '../services/bookingService';
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
    // Ride history
    const [rideHistory, setRideHistory] = useState([]);
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
    }, []);

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
                bookingService.getPendingBookings().catch(() => []),
                bookingService.getRideHistory().catch(() => []),
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

            // Set pending bookings and history
            setPendingBookings(Array.isArray(pendingData) ? pendingData : []);
            setRideHistory(Array.isArray(historyData) ? historyData : []);
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

    // When the user opens the bookings tab, ensure we have the correct page loaded.
    useEffect(() => {
        if (activeTab === 'bookings') {
            fetchBookingsPage(bookingsPage, bookingsSize);
        } else if (activeTab === 'pending' || activeTab === 'history') {
            fetchData();
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
            await fetchData();
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
            await fetchData();
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

        // Validate vehicle photos
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
                vehiclePhotos: vehiclePhotos,
                hasAC: postForm.hasAC,
                vehicleType: postForm.vehicleType,
                vehicleModel: postForm.vehicleModel,
                vehicleColor: postForm.vehicleColor,
                otherFeatures: postForm.otherFeatures,
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
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
            <Navbar />

            <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
                <BackButton />

                {/* Header Section */}
                <div className="mb-8 bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-600">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-3">
                                <Car className="h-6 w-6 text-purple-600" />
                                <span>Driver Dashboard</span>
                            </h1>
                            <p className="text-gray-600 mt-2 text-sm">
                                Post rides and manage your bookings
                                {(() => {
                                    const currentUser = authService.getCurrentUser();
                                    const driverName = currentUser?.name || currentUser?.email || '';
                                    return driverName ? ` • ${driverName}` : '';
                                })()}
                            </p>
                        </div>
                        <button
                            onClick={() => setShowPostForm(!showPostForm)}
                            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold shadow-lg transform hover:scale-105 transition-all ${
                                showPostForm
                                    ? 'bg-gradient-to-r from-red-500 to-red-600 text-white'
                                    : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700'
                            }`}
                        >
                            {showPostForm ? (
                                <>
                                    <span>×</span>
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
                    <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border-2 border-purple-200">
                        <h2 className="text-xl font-bold mb-6 flex items-center space-x-2 text-gray-800">
                            <Plus className="h-5 w-5 text-purple-600" />
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

                                {/* Vehicle Photos Section */}
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

                                 {/* Vehicle Condition Details */}
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
                <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <button
                            onClick={() => setActiveTab('rides')}
                            className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center justify-center space-x-2 ${
                                activeTab === 'rides'
                                    ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            <Car className="h-5 w-5" />
                            <span className="hidden sm:inline">My Rides</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('bookings')}
                            className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center justify-center space-x-2 ${
                                activeTab === 'bookings'
                                    ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            <Ticket className="h-5 w-5" />
                            <span className="hidden sm:inline">My Bookings</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('pending')}
                            className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center justify-center space-x-2 ${
                                activeTab === 'pending'
                                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            <CheckCircle2 className="h-5 w-5" />
                            <span className="hidden sm:inline">Accept/Decline</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center justify-center space-x-2 ${
                                activeTab === 'history'
                                    ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                                                <div className="text-right ml-4">
                                                    <div className="text-[11px] text-gray-500 leading-tight">Estimated Fare</div>
                                                    <div className="text-lg md:text-xl font-bold text-green-600">₹{(booking.totalPrice ?? 0).toFixed(2)}</div>
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
                                <span className="text-sm font-semibold">Pending Bookings ({pendingBookings.length})</span>
                            </div>
                            {pendingBookings.length === 0 ? (
                                <p className="text-center text-gray-500 py-6">No pending bookings found.</p>
                            ) : (
                                <div>
                                    {pendingBookings.map(booking => (
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
                        </div>
                    )}

                    {/* History Tab Content */}
                    {activeTab === 'history' && (
                        <div className="mt-6">
                            <div className="rounded-lg bg-gradient-to-r from-purple-600 to-purple-500 text-white px-4 py-3 mb-3 flex items-center space-x-2">
                                <History className="h-4 w-4" />
                                <span className="text-sm font-semibold">Ride History ({rideHistory.length})</span>
                            </div>
                            {rideHistory.length === 0 ? (
                                <p className="text-center text-gray-500 py-6">No ride history found.</p>
                            ) : (
                                <div>
                                    {rideHistory.map(booking => (
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
