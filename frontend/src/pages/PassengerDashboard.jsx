import { useState, useEffect } from 'react';
import { Search, MapPin, Calendar, Clock, User, CheckCircle, Car, Navigation, Star, Ticket } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BackButton from '../components/BackButton';
import CityAutocomplete from '../components/CityAutocomplete';
import { rideService } from '../services/rideService';
import { bookingService } from '../services/bookingService';
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
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('search');

    useEffect(() => {
        fetchMyBookings();
    }, []);

    const fetchMyBookings = async () => {
        try {
            const data = await bookingService.getMyBookings();
            setBookings(data);
        } catch (error) {
            console.error('Error fetching bookings:', error);
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const data = await rideService.searchRides(searchForm);
            setRides(data);
            setActiveTab('results');
        } catch (error) {
            await showError('Error searching rides');
        } finally {
            setLoading(false);
        }
    };

    const [selectedSeats, setSelectedSeats] = useState({});
    const [showBookingModal, setShowBookingModal] = useState({});

    const handleBook = async (rideId) => {
        setShowBookingModal({ ...showBookingModal, [rideId]: true });
    };

    const handleConfirmBooking = async (rideId) => {
        const ride = rides.find(r => r.id === rideId);
        const numberOfSeats = selectedSeats[rideId] || 1;
        const farePerSeat = ride?.estimatedFare || 0;
        const totalFare = farePerSeat * numberOfSeats;

        if (numberOfSeats > ride.availableSeats) {
            await showError(`Only ${ride.availableSeats} seat(s) available`);
            return;
        }

        const confirm = await showConfirm(
            `Confirm booking ${numberOfSeats} seat(s) from ${ride?.source} to ${ride?.destination} for ₹${totalFare.toFixed(2)}?`,
            'Yes, Book Ride',
            'Cancel'
        );

        if (!confirm.isConfirmed) return;

        try {
            await bookingService.createBooking({
                rideId,
                pickupLocation: searchForm.source,
                dropoffLocation: searchForm.destination,
                numberOfSeats: numberOfSeats,
            });
            await showSuccess('Ride booked successfully!');
            setShowBookingModal({ ...showBookingModal, [rideId]: false });
            setSelectedSeats({ ...selectedSeats, [rideId]: 1 });
            // Refresh bookings to show newly booked ride
            await fetchMyBookings();
            // Also refresh rides to update available seats
            const updatedRides = await rideService.searchRides(searchForm);
            setRides(updatedRides);
            // Switch to bookings tab to show updated list
            setActiveTab('bookings');
        } catch (error) {
            console.error('Booking error (passenger):', error, error.original || error);
            await showError(error.message || 'Error booking ride');
        }
    };

    const handleCancelBooking = async (bookingId) => {
        const confirm = await showConfirm(
            'Are you sure you want to cancel this booking?',
            'Yes, Cancel Booking',
            'No'
        );

        if (!confirm.isConfirmed) return;

        try {
            await bookingService.cancelBooking(bookingId);
            await showSuccess('Booking cancelled successfully!');
            await fetchMyBookings();
        } catch (error) {
            console.error('Cancel booking error (passenger):', error, error.original || error);
            await showError(error.message || 'Error cancelling booking');
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
                        My Bookings ({bookings.length})
                    </button>
                </div>

                {activeTab === 'search' && (
                    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                        <h2 className="text-xl font-bold mb-6 flex items-center space-x-2 text-gray-800">
                            <Search className="h-5 w-5 text-purple-600" />
                            <span>Search Rides</span>
                        </h2>
                        <form onSubmit={handleSearch} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        From *
                                    </label>
                                    <CityAutocomplete
                                        value={searchForm.source}
                                        onChange={(value) => setSearchForm({ ...searchForm, source: value })}
                                        placeholder="Source city"
                                        showNearbyLocations={true}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        To *
                                    </label>
                                    <CityAutocomplete
                                        value={searchForm.destination}
                                        onChange={(value) => setSearchForm({ ...searchForm, destination: value })}
                                        placeholder="Destination city"
                                        showNearbyLocations={true}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Date *
                                    </label>
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
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 font-semibold shadow-lg transform hover:scale-105 transition-all flex items-center justify-center space-x-2"
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
                        </form>
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
                                rides.map((ride) => (
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
                                                <div className="flex items-center space-x-4">
                                                    <div className="flex items-center space-x-2">
                                                        <Car className="h-5 w-5 text-gray-500" />
                                                        <span className="font-medium text-gray-700">Driver: {ride.driver?.name || 'N/A'}</span>
                                                    </div>
                                                    {ride.driver?.driverRating && (
                                                        <div className="flex items-center space-x-1 bg-yellow-100 px-2 py-1 rounded">
                                                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                                                            <span className="text-sm font-semibold text-yellow-700">{ride.driver.driverRating.toFixed(1)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="ml-6 flex flex-col items-end space-y-2">
                                                <div className="text-right">
                                                    <div className="text-xs text-gray-600">Fare per Seat</div>
                                                    <div className="text-xl font-bold text-green-600">₹{ride.estimatedFare?.toFixed(2) || 'N/A'}</div>
                                                </div>
                                                {showBookingModal[ride.id] ? (
                                                    <div className="bg-white border-2 border-purple-300 rounded-lg p-4 shadow-lg min-w-[200px]">
                                                        <label className="block text-xs font-semibold text-gray-700 mb-2">
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
                                                            className="w-full px-2 py-1 border-2 border-gray-300 rounded-lg mb-2"
                                                        />
                                                        <div className="text-xs text-gray-600 mb-2">
                                                            Total: ₹{((ride.estimatedFare || 0) * (selectedSeats[ride.id] || 1)).toFixed(2)}
                                                        </div>
                                                        <div className="flex space-x-2">
                                                            <button
                                                                onClick={() => handleConfirmBooking(ride.id)}
                                                                className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 text-sm font-semibold"
                                                            >
                                                                Confirm
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
                                                        disabled={ride.availableSeats === 0}
                                                        className={`px-6 py-3 rounded-lg font-semibold shadow-lg transform hover:scale-105 transition-all ${
                                                            ride.availableSeats === 0
                                                                ? 'bg-gray-400 text-white cursor-not-allowed'
                                                                : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700'
                                                        }`}
                                                    >
                                                        {ride.availableSeats === 0 ? 'Full' : 'Book Now'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'bookings' && (
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                        <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4">
                            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                                <Ticket className="h-5 w-5" />
                                <span>My Bookings ({bookings.length})</span>
                            </h2>
                        </div>
                        <div className="divide-y divide-gray-200">
                            {bookings.length === 0 ? (
                                <div className="p-12 text-center">
                                    <Ticket className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-600 text-base font-medium">No bookings yet</p>
                                    <p className="text-gray-500 text-xs mt-2">Start searching for rides!</p>
                                </div>
                            ) : (
                                bookings.map((booking) => (
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
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
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
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
};

export default PassengerDashboard;
