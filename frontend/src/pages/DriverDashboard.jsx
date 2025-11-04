import { useState, useEffect } from 'react';
import { Plus, MapPin, Calendar, Clock, Users, Car, Navigation, CheckCircle, X, Upload, Snowflake } from 'lucide-react';
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

  useEffect(() => {
    fetchData();
  }, []);

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
      const [ridesData, bookingsData] = await Promise.all([
        // rideService may accept pagination args
        rideService.getMyRides({ page: ridesPage, size: ridesSize }).catch(() => rideService.getMyRides()),
        bookingService.getDriverBookings({ page: bookingsPage, size: bookingsSize }).catch(() => bookingService.getDriverBookings()),
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
    } catch (error) {
      console.error('Error fetching data:', error);
      // Set empty arrays on error to prevent undefined issues
      setMyRides([]);
      setBookings([]);
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

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
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border-2 border-green-200">
            <h2 className="text-xl font-bold mb-6 flex items-center space-x-2 text-gray-800">
              <Plus className="h-5 w-5 text-green-600" />
              <span>Post a New Ride</span>
            </h2>

            {/* Stepper */}
            <div className="flex items-center justify-center space-x-4 mb-6">
              {[1,2,3].map((s) => (
                <div key={s} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${postStep >= s ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}>{s}</div>
                  {s !== 3 && <div className={`w-10 h-1 mx-2 ${postStep > s ? 'bg-green-600' : 'bg-gray-200'}`}></div>}
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
                        setPostForm({ ...postForm, source: '' });
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
                        setPostForm({ ...postForm, destination: '' });
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
                    className="px-6 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: From/To with realtime autocomplete within selected cities */}
            {postStep === 2 && (
              <div className="space-y-6">
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">From (any place in {fromCity})</label>
                      <CityAutocomplete
                        value={postForm.source}
                        onChange={(value) => setPostForm({ ...postForm, source: value })}
                        placeholder={`Search a place in ${fromCity}`}
                        withinCity={fromCity}
                        disableCache={true}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">To (any place in {toCity})</label>
                      <CityAutocomplete
                        value={postForm.destination}
                        onChange={(value) => setPostForm({ ...postForm, destination: value })}
                        placeholder={`Search a place in ${toCity}`}
                        withinCity={toCity}
                        disableCache={true}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-between">
                  <button onClick={() => setPostStep(1)} className="px-6 py-2 bg-gray-200 rounded-lg">Back</button>
                  <button
                    onClick={() => setPostStep(3)}
                    disabled={!postForm.source || !postForm.destination}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Details */}
            {postStep === 3 && (
              <form onSubmit={handlePostRide} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">From *</label>
                    <input
                      type="text"
                      required
                      value={postForm.source}
                      onChange={(e) => setPostForm({ ...postForm, source: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">To *</label>
                    <input
                      type="text"
                      required
                      value={postForm.destination}
                      onChange={(e) => setPostForm({ ...postForm, destination: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Date *</label>
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
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Time *</label>
                    <input
                      type="time"
                      required
                      value={postForm.time}
                      onChange={(e) => setPostForm({ ...postForm, time: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
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
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
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
                        <div className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-green-500 transition-all bg-gray-50">
                          <div className="text-center">
                            <Upload className="h-6 w-6 text-gray-400 mx-auto mb-1" />
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
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
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
                          <input type="radio" name="hasAC" value="true" checked={postForm.hasAC === true} onChange={() => setPostForm({ ...postForm, hasAC: true })} className="w-4 h-4 text-green-600" required />
                          <span className="flex items-center"><Snowflake className="h-4 w-4 mr-1" />Yes</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input type="radio" name="hasAC" value="false" checked={postForm.hasAC === false} onChange={() => setPostForm({ ...postForm, hasAC: false })} className="w-4 h-4 text-green-600" required />
                          <span>No</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Vehicle Model</label>
                      <input type="text" value={postForm.vehicleModel} onChange={(e) => setPostForm({ ...postForm, vehicleModel: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="e.g., Honda City, Yamaha R15" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Vehicle Color</label>
                      <input type="text" value={postForm.vehicleColor} onChange={(e) => setPostForm({ ...postForm, vehicleColor: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="e.g., White, Black, Red" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Other Features</label>
                      <textarea value={postForm.otherFeatures} onChange={(e) => setPostForm({ ...postForm, otherFeatures: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" rows="3" placeholder="e.g., Music system, GPS navigation, Leather seats, etc." />
                    </div>
                  </div>
                </div>

                <div className="flex justify-between">
                  <button type="button" onClick={() => setPostStep(2)} className="px-8 py-3 bg-gray-200 rounded-lg">Back</button>
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
                    <button type="button" onClick={() => setShowPostForm(false)} className="px-8 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-semibold shadow-md transition-all">Cancel</button>
                  </div>
                </div>
              </form>
            )}
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
            My Rides ({filteredRides.length})
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
            Bookings ({filteredBookings.length})
          </button>
        </div>

        {activeTab === 'rides' && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-teal-600 px-6 py-4">
              <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                <Navigation className="h-5 w-5" />
                <span>My Posted Rides ({filteredRides.length})</span>
              </h2>
            </div>
            <div className="divide-y divide-gray-200">
              {displayedRides.length === 0 ? (
                <div className="p-12 text-center">
                  <Car className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 text-base font-medium">No rides posted yet</p>
                  <p className="text-gray-500 text-xs mt-2">Click "Post New Ride" to get started!</p>
                </div>
              ) : (
                displayedRides.map((ride) => (
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
            {/* Rides Pagination Controls */}
            {((ridesTotalPages > 0 && ridesTotalPages > 1) || (ridesTotalPages === 0 && filteredRides.length > ridesSize)) && (
              <div className="px-6 py-4 flex items-center justify-between bg-white border-t">
                <div className="text-sm text-gray-600">Showing page {ridesPage + 1} {ridesTotalPages > 0 ? `of ${ridesTotalPages}` : ``} — {filteredRides.length} rides</div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      const p = Math.max(0, ridesPage - 1);
                      if (ridesTotalPages > 0) fetchRidesPage(p, ridesSize); else setRidesPage(p);
                    }}
                    disabled={ridesPage <= 0}
                    className={`px-3 py-1 rounded-md ${ridesPage <= 0 ? 'bg-gray-200 text-gray-500' : 'bg-white border'}`}
                  >Prev</button>

                  <div className="flex items-center space-x-1">
                    {Array.from({ length: ridesTotalPages > 0 ? ridesTotalPages : Math.ceil(Math.max(1, filteredRides.length) / ridesSize) }).map((_, idx) => {
                      const total = ridesTotalPages > 0 ? ridesTotalPages : Math.ceil(Math.max(1, filteredRides.length) / ridesSize);
                      const start = Math.max(0, ridesPage - 3);
                      const end = Math.min(total - 1, ridesPage + 3);
                      if (idx < start || idx > end) return null;
                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            if (ridesTotalPages > 0) fetchRidesPage(idx, ridesSize); else setRidesPage(idx);
                          }}
                          className={`px-3 py-1 rounded-md ${idx === ridesPage ? 'bg-green-600 text-white' : 'bg-white border'}`}
                        >{idx + 1}</button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => {
                      const p = Math.min((ridesTotalPages > 0 ? ridesTotalPages - 1 : Math.max(0, Math.ceil(filteredRides.length / ridesSize) - 1)), ridesPage + 1);
                      if (ridesTotalPages > 0) fetchRidesPage(p, ridesSize); else setRidesPage(p);
                    }}
                    disabled={ridesPage >= ((ridesTotalPages > 0 ? ridesTotalPages - 1 : Math.max(0, Math.ceil(filteredRides.length / ridesSize) - 1)))}
                    className={`px-3 py-1 rounded-md ${ridesPage >= ((ridesTotalPages > 0 ? ridesTotalPages - 1 : Math.max(0, Math.ceil(filteredRides.length / ridesSize) - 1))) ? 'bg-gray-200 text-gray-500' : 'bg-white border'}`}
                  >Next</button>

                  <select
                    value={ridesSize}
                    onChange={(e) => {
                      const s = parseInt(e.target.value, 10);
                      if (ridesTotalPages > 0) fetchRidesPage(0, s); else { setRidesSize(s); setRidesPage(0); }
                    }}
                    className="ml-3 px-2 py-1 border rounded-md bg-white"
                  >
                    {[3,5,10,20].map(s => (
                      <option key={s} value={s}>{s} / page</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
           </div>
         )}

        {activeTab === 'bookings' && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-blue-600 px-6 py-4">
              <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                <CheckCircle className="h-5 w-5" />
                <span>My Bookings ({filteredBookings.length})</span>
              </h2>
            </div>
            <div className="divide-y divide-gray-200">
              {displayedBookings.length === 0 ? (
                <div className="p-12 text-center">
                  <Ticket className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 text-base font-medium">No bookings yet</p>
                  <p className="text-gray-500 text-xs mt-2">Start accepting rides!</p>
                </div>
              ) : (
                displayedBookings.map((booking) => (
                  <div key={booking.id} className="p-6 hover:bg-gradient-to-r hover:from-green-50 hover:to-blue-50 transition-all">
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
                            <div className="font-semibold text-gray-900">{booking.ride?.date || 'N/A'}</div>
                          </div>
                          <div className="bg-gray-50 px-3 py-2 rounded-lg">
                            <div className="text-gray-600">Time</div>
                            <div className="font-semibold text-gray-900">{booking.ride?.time || 'N/A'}</div>
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
            {/* Pagination Controls */}
            {((bookingsTotalPages > 0 && bookingsTotalPages > 1) || (bookingsTotalPages === 0 && filteredBookings.length > bookingsSize)) && (
               <div className="px-6 py-4 flex items-center justify-between bg-white border-t">
                 <div className="text-sm text-gray-600">Showing page {bookingsPage + 1} of {bookingsTotalPages} — {filteredBookings.length} bookings</div>
                 <div className="flex items-center space-x-2">
                   <button
                     onClick={() => fetchBookingsPage(Math.max(0, bookingsPage - 1), bookingsSize)}
                     disabled={bookingsPage <= 0}
                     className={`px-3 py-1 rounded-md ${bookingsPage <= 0 ? 'bg-gray-200 text-gray-500' : 'bg-white border'}`}
                   >Prev</button>
                   {/* Render up to 7 page buttons centered around current page */}
                   <div className="flex items-center space-x-1">
                     {Array.from({ length: (bookingsTotalPages > 0 ? bookingsTotalPages : Math.ceil(Math.max(1, filteredBookings.length) / bookingsSize)) }).map((_, idx) => {
                       const total = bookingsTotalPages > 0 ? bookingsTotalPages : Math.ceil(Math.max(1, filteredBookings.length) / bookingsSize);
                       const start = Math.max(0, bookingsPage - 3);
                       const end = Math.min(total - 1, bookingsPage + 3);
                       if (idx < start || idx > end) return null;
                       return (
                         <button
                           key={idx}
                           onClick={() => {
                             if (bookingsTotalPages > 0) fetchBookingsPage(idx, bookingsSize); else setBookingsPage(idx);
                           }}
                           className={`px-3 py-1 rounded-md ${idx === bookingsPage ? 'bg-green-600 text-white' : 'bg-white border'}`}
                         >{idx + 1}</button>
                       );
                     })}
                   </div>
                   <button
                     onClick={() => fetchBookingsPage(Math.min(bookingsTotalPages - 1, bookingsPage + 1), bookingsSize)}
                     disabled={bookingsPage >= bookingsTotalPages - 1}
                     className={`px-3 py-1 rounded-md ${bookingsPage >= bookingsTotalPages - 1 ? 'bg-gray-200 text-gray-500' : 'bg-white border'}`}
                   >Next</button>

                   <select
                     value={bookingsSize}
                     onChange={(e) => fetchBookingsPage(0, parseInt(e.target.value, 10))}
                     className="ml-3 px-2 py-1 border rounded-md bg-white"
                   >
                     {[3,5,10,20,50].map(s => (
                       <option key={s} value={s}>{s} / page</option>
                     ))}
                   </select>
                 </div>
               </div>
            )}
            </div>
          )}
        </main>

        <Footer />
     </div>
   );
 };

 export default DriverDashboard;
