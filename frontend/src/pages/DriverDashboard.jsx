import { useState, useEffect } from 'react';
import { Plus, MapPin, Calendar, Clock, Users, Car, Navigation, CheckCircle, DollarSign, TrendingUp } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BackButton from '../components/BackButton';
import CityAutocomplete from '../components/CityAutocomplete';
import { rideService } from '../services/rideService';
import { bookingService } from '../services/bookingService';
import { showConfirm, showSuccess, showError } from '../utils/swal';

const DriverDashboard = () => {
  const [showPostForm, setShowPostForm] = useState(false);
  const [postForm, setPostForm] = useState({
    source: '',
    destination: '',
    date: '',
    time: '',
    availableSeats: '',
  });
  const [myRides, setMyRides] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('rides');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [ridesData, bookingsData] = await Promise.all([
        rideService.getMyRides(),
        bookingService.getDriverBookings(),
      ]);
      // Ensure we're setting arrays
      setMyRides(Array.isArray(ridesData) ? ridesData : []);
      setBookings(Array.isArray(bookingsData) ? bookingsData : []);
    } catch (error) {
      console.error('Error fetching data:', error);
      // Set empty arrays on error to prevent undefined issues
      setMyRides([]);
      setBookings([]);
    }
  };

  const handleCancelRide = async (rideId) => {
    const confirm = await showConfirm(
      'Are you sure you want to cancel this ride? All bookings will be cancelled and refunded.',
      'Yes, Cancel Ride',
      'No'
    );

    if (!confirm.isConfirmed) return;

    try {
      await rideService.cancelRide(rideId);
      await showSuccess('Ride cancelled successfully!');
      await fetchData();
    } catch (error) {
      await showError(error.response?.data?.message || 'Error cancelling ride');
    }
  };

  const handlePostRide = async (e) => {
    e.preventDefault();
    
    const confirm = await showConfirm(
      `Post a ride from ${postForm.source} to ${postForm.destination} on ${postForm.date}?`,
      'Yes, Post Ride',
      'Cancel'
    );

    if (!confirm.isConfirmed) return;

    setLoading(true);

    try {
      await rideService.postRide({
        source: postForm.source,
        destination: postForm.destination,
        date: postForm.date,
        time: postForm.time,
        availableSeats: parseInt(postForm.availableSeats),
      });
      await showSuccess('Ride posted successfully!');
      setShowPostForm(false);
      setPostForm({
        source: '',
        destination: '',
        date: '',
        time: '',
        availableSeats: '',
      });
      // Refresh data to show newly posted ride
      await fetchData();
      // Switch to rides tab to show updated list
      setActiveTab('rides');
    } catch (error) {
      await showError(error.response?.data?.message || 'Error posting ride');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-green-50 via-blue-50 to-teal-50">
      <Navbar />
      
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <BackButton />
        
        {/* Header Section */}
        <div className="mb-8 bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-600">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-3">
                <Car className="h-6 w-6 text-green-600" />
                <span>Driver Dashboard</span>
              </h1>
              <p className="text-gray-600 mt-2 text-sm">Post rides and manage your bookings</p>
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
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border-2 border-green-200">
            <h2 className="text-xl font-bold mb-6 flex items-center space-x-2 text-gray-800">
              <Plus className="h-5 w-5 text-green-600" />
              <span>Post a New Ride</span>
            </h2>
            <form onSubmit={handlePostRide} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    From *
                  </label>
                  <CityAutocomplete
                    value={postForm.source}
                    onChange={(value) => setPostForm({ ...postForm, source: value })}
                    placeholder="Source city"
                    showNearbyLocations={true}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    To *
                  </label>
                  <CityAutocomplete
                    value={postForm.destination}
                    onChange={(value) => setPostForm({ ...postForm, destination: value })}
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
                    value={postForm.date}
                    onChange={(e) => setPostForm({ ...postForm, date: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={postForm.time}
                    onChange={(e) => setPostForm({ ...postForm, time: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Available Seats *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={postForm.availableSeats}
                    onChange={(e) => setPostForm({ ...postForm, availableSeats: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="4"
                  />
                </div>
              </div>
              <div className="flex space-x-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 disabled:opacity-50 font-semibold shadow-lg transform hover:scale-105 transition-all flex items-center space-x-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Posting...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-5 w-5" />
                      <span>Post Ride</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPostForm(false)}
                  className="px-8 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-semibold shadow-md transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tabs */}
        <div className="flex space-x-4 mb-6 bg-white rounded-lg shadow-md p-2">
          <button
            onClick={() => setActiveTab('rides')}
            className={`flex-1 px-6 py-3 font-semibold rounded-lg transition-all ${
              activeTab === 'rides'
                ? 'bg-gradient-to-r from-green-600 to-teal-600 text-white shadow-lg transform scale-105'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Car className="inline h-5 w-5 mr-2" />
            My Rides ({myRides.length})
          </button>
          <button
            onClick={() => setActiveTab('bookings')}
            className={`flex-1 px-6 py-3 font-semibold rounded-lg transition-all ${
              activeTab === 'bookings'
                ? 'bg-gradient-to-r from-green-600 to-teal-600 text-white shadow-lg transform scale-105'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <CheckCircle className="inline h-5 w-5 mr-2" />
            Bookings ({bookings.length})
          </button>
        </div>

        {activeTab === 'rides' && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-teal-600 px-6 py-4">
              <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                <Navigation className="h-5 w-5" />
                <span>My Posted Rides</span>
              </h2>
            </div>
            <div className="divide-y divide-gray-200">
              {myRides.length === 0 ? (
                <div className="p-12 text-center">
                  <Car className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 text-base font-medium">No rides posted yet</p>
                  <p className="text-gray-500 text-xs mt-2">Click "Post New Ride" to get started!</p>
                </div>
              ) : (
                myRides.map((ride) => (
                  <div key={ride.id} className="p-6 hover:bg-gradient-to-r hover:from-green-50 hover:to-teal-50 transition-all">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-3">
                          <div className="bg-gradient-to-r from-green-500 to-teal-500 rounded-lg p-2">
                            <MapPin className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <span className="font-bold text-lg text-gray-900">{ride.source}</span>
                            <span className="mx-3 text-gray-400">→</span>
                            <span className="font-bold text-lg text-gray-900">{ride.destination}</span>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            ride.status === 'SCHEDULED' ? 'bg-green-100 text-green-800' :
                            ride.status === 'ONGOING' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {ride.status}
                          </span>
                        </div>
                        <div className="flex items-center space-x-6 text-sm mb-3">
                          <div className="flex items-center space-x-2 bg-gray-100 px-3 py-1 rounded-lg">
                            <Calendar className="h-4 w-4" />
                            <span className="font-medium">{ride.date}</span>
                          </div>
                          <div className="flex items-center space-x-2 bg-gray-100 px-3 py-1 rounded-lg">
                            <Clock className="h-4 w-4" />
                            <span className="font-medium">{ride.time}</span>
                          </div>
                          <div className="flex items-center space-x-2 bg-gray-100 px-3 py-1 rounded-lg">
                            <Users className="h-4 w-4" />
                            <span className="font-medium">{ride.availableSeats} / {ride.totalSeats} seats</span>
                          </div>
                        </div>
                      </div>
                      <div className="ml-6 text-right">
                        <div className="text-xs text-gray-600 mb-1">Estimated Fare</div>
                        <div className="text-xl font-bold text-green-600">₹{ride.estimatedFare?.toFixed(2) || 'N/A'}</div>
                        {ride.status !== 'CANCELLED' && ride.status !== 'COMPLETED' && (
                          <button
                            onClick={() => handleCancelRide(ride.id)}
                            className="mt-3 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-semibold shadow-md transform hover:scale-105 transition-all"
                          >
                            Cancel Ride
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
            <div className="bg-gradient-to-r from-green-600 to-teal-600 px-6 py-4">
              <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Bookings for My Rides ({bookings.length})</span>
              </h2>
            </div>
            <div className="divide-y divide-gray-200">
              {bookings.length === 0 ? (
                <div className="p-12 text-center">
                  <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 text-base font-medium">No bookings yet</p>
                  <p className="text-gray-500 text-xs mt-2">Passengers will appear here when they book your rides</p>
                </div>
              ) : (
                bookings.map((booking) => (
                  <div key={booking.id} className="p-6 hover:bg-gradient-to-r hover:from-green-50 hover:to-teal-50 transition-all">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-3">
                          <div className="bg-gradient-to-r from-green-500 to-teal-500 rounded-lg p-2">
                            <MapPin className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <span className="font-bold text-lg text-gray-900">{booking.ride?.source}</span>
                            <span className="mx-3 text-gray-400">→</span>
                            <span className="font-bold text-lg text-gray-900">{booking.ride?.destination}</span>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            booking.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                            booking.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {booking.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="bg-gray-50 px-3 py-2 rounded-lg">
                            <div className="text-gray-600">Passenger</div>
                            <div className="font-semibold text-gray-900">{booking.passenger?.name || 'N/A'}</div>
                          </div>
                          <div className="bg-gray-50 px-3 py-2 rounded-lg">
                            <div className="text-gray-600">Date</div>
                            <div className="font-semibold text-gray-900">{booking.ride?.date}</div>
                          </div>
                          <div className="bg-gray-50 px-3 py-2 rounded-lg">
                            <div className="text-gray-600">Fare</div>
                            <div className="font-semibold text-green-600">₹{booking.fareAmount?.toFixed(2) || 'N/A'}</div>
                          </div>
                        </div>
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

export default DriverDashboard;
