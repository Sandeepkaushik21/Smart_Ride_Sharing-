import { useState, useEffect } from 'react';
import { Users, Car, CheckCircle, XCircle, TrendingUp, DollarSign, Shield, Activity } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BackButton from '../components/BackButton';
import { adminService } from '../services/adminService';
import { showConfirm, showSuccess, showError } from '../utils/swal';

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [pendingDrivers, setPendingDrivers] = useState([]);
    const [allDrivers, setAllDrivers] = useState([]);
    const [allPassengers, setAllPassengers] = useState([]);
    const [activeTab, setActiveTab] = useState('stats');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [statsData, driversData, allDriversData, allPassengersData] = await Promise.all([
                adminService.getDashboardStats(),
                adminService.getPendingDrivers(),
                adminService.getAllDrivers(),
                adminService.getAllPassengers(),
            ]);
            setStats(statsData);
            setPendingDrivers(driversData);
            setAllDrivers(allDriversData);
            setAllPassengers(allPassengersData);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (driverId) => {
        const confirm = await showConfirm(
            'Are you sure you want to approve this driver?',
            'Yes, Approve',
            'Cancel'
        );

        if (!confirm.isConfirmed) return;

        try {
            await adminService.approveDriver(driverId);
            await showSuccess('Driver approved successfully!');
            fetchData();
        } catch (error) {
            await showError('Error approving driver');
        }
    };

    const handleReject = async (driverId) => {
        const confirm = await showConfirm(
            'Are you sure you want to reject this driver?',
            'Yes, Reject',
            'Cancel'
        );

        if (!confirm.isConfirmed) return;

        try {
            await adminService.rejectDriver(driverId);
            await showSuccess('Driver rejected');
            fetchData();
        } catch (error) {
            await showError('Error rejecting driver');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100">
                <Navbar />
                <div className="flex-grow flex items-center justify-center">
                    <div className="text-xl font-semibold text-gray-700">Loading dashboard...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
            <Navbar />

            <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
                <BackButton />

                {/* Header Section */}
                <div className="mb-8 bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-600">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-4xl font-bold text-gray-900 flex items-center space-x-3">
                                <Shield className="h-10 w-10 text-blue-600" />
                                <span>Admin Dashboard</span>
                            </h1>
                            <p className="text-gray-600 mt-2 text-lg">Manage users, drivers, and monitor system statistics</p>
                        </div>
                        <div className="bg-blue-100 rounded-lg px-4 py-2">
                            <Activity className="h-6 w-6 text-blue-600" />
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex space-x-4 mb-6 bg-white rounded-lg shadow-md p-2">
                    <button
                        onClick={() => setActiveTab('stats')}
                        className={`flex-1 px-6 py-3 font-semibold rounded-lg transition-all ${
                            activeTab === 'stats'
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg transform scale-105'
                                : 'text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                        Statistics
                    </button>
                    <button
                        onClick={() => setActiveTab('drivers')}
                        className={`flex-1 px-6 py-3 font-semibold rounded-lg transition-all ${
                            activeTab === 'drivers'
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg transform scale-105'
                                : 'text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                        All Drivers ({allDrivers.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('passengers')}
                        className={`flex-1 px-6 py-3 font-semibold rounded-lg transition-all ${
                            activeTab === 'passengers'
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg transform scale-105'
                                : 'text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                        All Passengers ({allPassengers.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`flex-1 px-6 py-3 font-semibold rounded-lg transition-all ${
                            activeTab === 'pending'
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg transform scale-105'
                                : 'text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                        Pending Approvals ({pendingDrivers.length})
                    </button>
                </div>

                {/* Statistics Cards */}
                {activeTab === 'stats' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform cursor-pointer" onClick={() => setActiveTab('drivers')}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-blue-100 text-sm font-medium mb-1">Total Users</p>
                                    <p className="text-4xl font-bold">{stats?.totalUsers || 0}</p>
                                </div>
                                <div className="bg-white/20 rounded-lg p-3">
                                    <Users className="h-8 w-8" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform cursor-pointer" onClick={() => setActiveTab('drivers')}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-green-100 text-sm font-medium mb-1">Total Drivers</p>
                                    <p className="text-4xl font-bold">{stats?.totalDrivers || 0}</p>
                                </div>
                                <div className="bg-white/20 rounded-lg p-3">
                                    <Car className="h-8 w-8" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform cursor-pointer" onClick={() => setActiveTab('passengers')}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-purple-100 text-sm font-medium mb-1">Total Passengers</p>
                                    <p className="text-4xl font-bold">{stats?.totalPassengers || 0}</p>
                                </div>
                                <div className="bg-white/20 rounded-lg p-3">
                                    <Users className="h-8 w-8" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-yellow-100 text-sm font-medium mb-1">Total Rides</p>
                                    <p className="text-4xl font-bold">{stats?.totalRides || 0}</p>
                                </div>
                                <div className="bg-white/20 rounded-lg p-3">
                                    <TrendingUp className="h-8 w-8" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-indigo-100 text-sm font-medium mb-1">Total Bookings</p>
                                    <p className="text-4xl font-bold">{stats?.totalBookings || 0}</p>
                                </div>
                                <div className="bg-white/20 rounded-lg p-3">
                                    <DollarSign className="h-8 w-8" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-red-500 to-pink-500 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-red-100 text-sm font-medium mb-1">Pending Drivers</p>
                                    <p className="text-4xl font-bold">{stats?.pendingDrivers || 0}</p>
                                </div>
                                <div className="bg-white/20 rounded-lg p-3">
                                    <XCircle className="h-8 w-8" />
                                </div>
                            </div>
                        </div>
                    </div>
                )} {/* <--- CORRECTED: Closed the conditional rendering for 'stats' here */}

                {/* All Drivers Section */}
                {activeTab === 'drivers' && (
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                        <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
                            <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
                                <Car className="h-6 w-6" />
                                <span>All Drivers ({allDrivers.length})</span>
                            </h2>
                        </div>

                        {allDrivers.length === 0 ? (
                            <div className="p-12 text-center">
                                <Car className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-600 text-lg font-medium">No drivers found</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Name</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Vehicle</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Rating</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Total Rides</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Company Income</th>
                                    </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                    {allDrivers.map((driver) => (
                                        <tr key={driver.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-semibold text-gray-900">{driver.name}</div>
                                                <div className="text-xs text-gray-500">{driver.email}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">{driver.vehicleModel || 'N/A'}</div>
                                                <div className="text-xs text-gray-500">{driver.licensePlate || 'N/A'}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center space-x-1">
                                                    <span className="text-sm font-semibold text-yellow-600">{driver.driverRating?.toFixed(1) || '0.0'}</span>
                                                    <span className="text-yellow-500">★</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">{driver.totalRides || 0}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-semibold text-green-600">₹{driver.companyIncome?.toFixed(2) || '0.00'}</div>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* All Passengers Section */}
                {activeTab === 'passengers' && (
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                        <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4">
                            <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
                                <Users className="h-6 w-6" />
                                <span>All Passengers ({allPassengers.length})</span>
                            </h2>
                        </div>

                        {allPassengers.length === 0 ? (
                            <div className="p-12 text-center">
                                <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-600 text-lg font-medium">No passengers found</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Name</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Contact</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Total Bookings</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Total Spending</th>
                                    </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                    {allPassengers.map((passenger) => (
                                        <tr key={passenger.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-semibold text-gray-900">{passenger.name}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-600">{passenger.email}</div>
                                                <div className="text-xs text-gray-500">{passenger.phone || 'N/A'}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">{passenger.totalBookings || 0}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-semibold text-green-600">₹{passenger.totalSpending?.toFixed(2) || '0.00'}</div>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Pending Drivers Section */}
                {activeTab === 'pending' && (
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                            <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
                                <XCircle className="h-6 w-6" />
                                <span>Pending Driver Approvals ({pendingDrivers.length})</span>
                            </h2>
                        </div>

                        {pendingDrivers.length === 0 ? (
                            <div className="p-12 text-center">
                                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                                <p className="text-gray-600 text-lg font-medium">No pending drivers to approve</p>
                                <p className="text-gray-500 text-sm mt-2">All drivers have been processed</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Name</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Email</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Phone</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Vehicle</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">License</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                                    </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                    {pendingDrivers.map((driver) => (
                                        <tr key={driver.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-semibold text-gray-900">{driver.name}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-600">{driver.email}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-600">{driver.phone || 'N/A'}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-600">{driver.vehicleModel || 'N/A'}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded inline-block">
                                                    {driver.licensePlate || 'N/A'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() => handleApprove(driver.id)}
                                                        className="flex items-center space-x-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium text-sm shadow-sm"
                                                    >
                                                        <CheckCircle className="h-4 w-4" />
                                                        <span>Approve</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleReject(driver.id)}
                                                        className="flex items-center space-x-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium text-sm shadow-sm"
                                                    >
                                                        <XCircle className="h-4 w-4" />
                                                        <span>Reject</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
};

export default AdminDashboard;