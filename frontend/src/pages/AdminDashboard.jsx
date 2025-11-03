import { useState, useEffect } from 'react';
import { Users, Car, CheckCircle, XCircle, TrendingUp, DollarSign, Shield, Activity, Trash2, LayoutGrid, Settings, Menu } from 'lucide-react';
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
    const [sidebarOpen, setSidebarOpen] = useState(false);

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
            // Optimistically remove from pending list immediately
            setPendingDrivers((prev) => prev.filter((driver) => driver.id !== driverId));
            
            await adminService.approveDriver(driverId);
            await showSuccess('Driver approved successfully!');
            
            // Refresh data in background (non-blocking)
            Promise.all([
                adminService.getPendingDrivers().then(setPendingDrivers).catch(() => {}),
                adminService.getAllDrivers().then(setAllDrivers).catch(() => {}),
                adminService.getDashboardStats().then(setStats).catch(() => {})
            ]).catch(() => {});
        } catch (error) {
            // Revert optimistic update on error
            fetchData();
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
            // Optimistically remove from pending list immediately
            setPendingDrivers((prev) => prev.filter((driver) => driver.id !== driverId));
            
            await adminService.rejectDriver(driverId);
            await showSuccess('Driver rejected');
            
            // Refresh data in background (non-blocking)
            Promise.all([
                adminService.getPendingDrivers().then(setPendingDrivers).catch(() => {}),
                adminService.getDashboardStats().then(setStats).catch(() => {})
            ]).catch(() => {});
        } catch (error) {
            // Revert optimistic update on error
            fetchData();
            await showError('Error rejecting driver');
        }
    };

    const handleDeleteUser = async (userId, userName, userType) => {
        const confirm = await showConfirm(
            `Are you sure you want to delete ${userName}? This will permanently remove all their data including rides and bookings.`,
            `Yes, Delete ${userType}`,
            'Cancel'
        );

        if (!confirm.isConfirmed) return;

        try {
            if (userType === 'Driver') {
                setAllDrivers((prev) => prev.filter((user) => user.id !== userId));
            } else {
                setAllPassengers((prev) => prev.filter((user) => user.id !== userId));
            }
            
            await adminService.deleteUser(userId);
            await showSuccess(`${userType} deleted successfully!`);
            
            // Refresh data in background (non-blocking)
            Promise.all([
                adminService.getAllDrivers().then(setAllDrivers).catch(() => {}),
                adminService.getAllPassengers().then(setAllPassengers).catch(() => {}),
                adminService.getDashboardStats().then(setStats).catch(() => {})
            ]).catch(() => {});
        } catch (error) {
            // Revert optimistic update on error
            fetchData();
            await showError(`Error deleting ${userType.toLowerCase()}`);
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
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Navbar />

            {/* Responsive Shell with Sidebar */}
            <div className="flex flex-1">
                {/* Sidebar (desktop) */}
                <aside className={`hidden lg:flex lg:flex-col lg:w-64 bg-white border-r shadow-sm`}>
                    <div className="h-16 flex items-center px-4 border-b">
                        <div className="flex items-center gap-2 text-gray-800 font-bold">
                            <LayoutGrid className="h-5 w-5 text-blue-600" />
                            <span>Admin Panel</span>
                        </div>
                    </div>
                    <nav className="flex-1 px-2 py-4 space-y-1">
                        <SidebarItem icon={<Activity className="h-4 w-4" />} label="Overview" active={activeTab==='stats'} onClick={() => setActiveTab('stats')} />
                        <SidebarItem icon={<Car className="h-4 w-4" />} label={`Drivers (${allDrivers.length})`} active={activeTab==='drivers'} onClick={() => setActiveTab('drivers')} />
                        <SidebarItem icon={<Users className="h-4 w-4" />} label={`Passengers (${allPassengers.length})`} active={activeTab==='passengers'} onClick={() => setActiveTab('passengers')} />
                        <SidebarItem icon={<XCircle className="h-4 w-4" />} label={`Pending (${pendingDrivers.length})`} active={activeTab==='pending'} onClick={() => setActiveTab('pending')} />
                        <div className="pt-2 mt-2 border-t"></div>
                        <SidebarItem icon={<Settings className="h-4 w-4" />} label="Settings" active={false} onClick={() => {}} />
                        <SidebarItem icon={<Shield className="h-4 w-4" />} label="Logout" active={false} onClick={() => {}} />
                    </nav>
                    <div className="p-4 text-xs text-gray-500">© {new Date().getFullYear()} RSA Admin</div>
                </aside>

                {/* Mobile Sidebar Drawer */}
                {sidebarOpen && (
                    <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setSidebarOpen(false)}>
                        <div className="absolute inset-0 bg-black/30"></div>
                        <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-xl">
                            <div className="h-16 flex items-center justify-between px-4 border-b">
                                <div className="flex items-center gap-2 text-gray-800 font-bold">
                                    <LayoutGrid className="h-5 w-5 text-blue-600" />
                                    <span>Admin Panel</span>
                                </div>
                                <button onClick={() => setSidebarOpen(false)} className="p-2 rounded hover:bg-gray-100">
                                    <XCircle className="h-5 w-5" />
                                </button>
                            </div>
                            <nav className="px-2 py-4 space-y-1">
                                <SidebarItem icon={<Activity className="h-4 w-4" />} label="Overview" active={activeTab==='stats'} onClick={() => { setActiveTab('stats'); setSidebarOpen(false); }} />
                                <SidebarItem icon={<Car className="h-4 w-4" />} label={`Drivers (${allDrivers.length})`} active={activeTab==='drivers'} onClick={() => { setActiveTab('drivers'); setSidebarOpen(false); }} />
                                <SidebarItem icon={<Users className="h-4 w-4" />} label={`Passengers (${allPassengers.length})`} active={activeTab==='passengers'} onClick={() => { setActiveTab('passengers'); setSidebarOpen(false); }} />
                                <SidebarItem icon={<XCircle className="h-4 w-4" />} label={`Pending (${pendingDrivers.length})`} active={activeTab==='pending'} onClick={() => { setActiveTab('pending'); setSidebarOpen(false); }} />
                                <div className="pt-2 mt-2 border-t"></div>
                                <SidebarItem icon={<Settings className="h-4 w-4" />} label="Settings" active={false} onClick={() => { setSidebarOpen(false); }} />
                                <SidebarItem icon={<Shield className="h-4 w-4" />} label="Logout" active={false} onClick={() => { setSidebarOpen(false); }} />
                            </nav>
                        </aside>
                    </div>
                )}

                {/* Content */}
                <main className="flex-1 min-w-0">
                    {/* Top header */}
                    <div className="px-4 sm:px-6 lg:px-8 py-4 border-b bg-white flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button className="lg:hidden p-2 rounded hover:bg-gray-100" onClick={() => setSidebarOpen(true)}>
                                <Menu className="h-5 w-5" />
                            </button>
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                                <Shield className="h-6 w-6 text-blue-600" />
                                Admin Dashboard
                            </h1>
                        </div>
                        <div className="hidden sm:flex items-center gap-2 text-sm">
                            <button className="px-3 py-1.5 rounded border hover:bg-gray-50">Share</button>
                            <button className="px-3 py-1.5 rounded border hover:bg-gray-50">Print</button>
                            <button className="px-3 py-1.5 rounded bg-indigo-600 text-white">Export</button>
                        </div>
                    </div>

                    <div className="px-4 sm:px-6 lg:px-8 py-6">
                        {/* Quick Stats Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
                            <StatCard title="Total Users" value={stats?.totalUsers || 0} icon={<Users className="h-8 w-8" />} gradient="from-blue-500 to-blue-600" />
                            <StatCard title="Total Drivers" value={stats?.totalDrivers || 0} icon={<Car className="h-8 w-8" />} gradient="from-green-500 to-green-600" />
                            <StatCard title="Total Passengers" value={stats?.totalPassengers || 0} icon={<Users className="h-8 w-8" />} gradient="from-purple-500 to-purple-600" />
                            <StatCard title="Total Rides" value={stats?.totalRides || 0} icon={<TrendingUp className="h-8 w-8" />} gradient="from-yellow-500 to-orange-500" />
                            <StatCard title="Total Bookings" value={stats?.totalBookings || 0} icon={<DollarSign className="h-8 w-8" />} gradient="from-indigo-500 to-indigo-600" />
                            <StatCard title="Pending Drivers" value={stats?.pendingDrivers || 0} icon={<XCircle className="h-8 w-8" />} gradient="from-red-500 to-pink-500" />
                        </div>

                        {/* Overview-only content continues below */}

                {activeTab === 'stats' && (
                    <>
                        {/* Top toolbar similar to screenshot */}
                        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                                <span className="font-semibold text-gray-800">Overview</span>
                                <span className="text-gray-400">Audiences</span>
                                <span className="text-gray-400">Demographics</span>
                                <span className="text-gray-400">More</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <select className="px-3 py-2 border rounded-lg text-sm text-gray-700 bg-white">
                                    <option>Select Category</option>
                                    <option>Rides</option>
                                    <option>Bookings</option>
                                    <option>Users</option>
                                </select>
                                <input type="date" className="px-3 py-2 border rounded-lg text-sm text-gray-700 bg-white" />
                                <button className="px-3 py-2 border rounded-lg text-sm">Share</button>
                                <button className="px-3 py-2 border rounded-lg text-sm">Print</button>
                                <button className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm">Export</button>
                            </div>
                        </div>

                        {/* Market Overview + Todo List */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                            {/* Market Overview (simple bar chart) */}
                            <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <div className="text-sm font-semibold text-gray-800">Market Overview</div>
                                        <div className="text-xs text-gray-500">Weekly performance snapshot</div>
                                    </div>
                                    <button className="px-3 py-1 border rounded-lg text-sm">This month ▾</button>
                                </div>
                                <div className="text-2xl font-bold text-gray-900 mb-2">₹{(stats?.totalBookings || 0) * 523}</div>
                                <div className="text-xs text-green-600 font-semibold mb-4">+1.37%</div>
                                {/* Bars */}
                                <div className="h-48 flex items-end gap-2">
                                    {[...Array(12)].map((_, i) => {
                                        const base = (stats?.totalBookings || 10) + (i * 3);
                                        const height = 20 + (base % 60); // 20-80
                                        return (
                                            <div key={i} className="flex-1 flex flex-col items-center">
                                                <div className="w-full bg-blue-200 rounded-t h-2"></div>
                                                <div style={{ height: `${height}%` }} className="w-full bg-indigo-500 rounded-t"></div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="mt-2 flex justify-between text-xs text-gray-500">
                                    {['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'].map(m => (
                                        <span key={m}>{m}</span>
                                    ))}
                                </div>
                            </div>

                            {/* Todo List */}
                            <div className="bg-white rounded-xl shadow-lg p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="text-sm font-semibold text-gray-800">Todo List</div>
                                    <button className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-sm">＋</button>
                                </div>
                                <ul className="space-y-3 text-sm">
                                    {[{
                                        text: 'Review pending driver documents', date: 'Today', tag: 'Due tomorrow', color: 'bg-yellow-100 text-yellow-800'
                                    },{
                                        text: 'Export bookings report', date: 'Yesterday', tag: 'Done', color: 'bg-green-100 text-green-800'
                                    },{
                                        text: 'Audit suspicious accounts', date: '2 days ago', tag: 'Done', color: 'bg-green-100 text-green-800'
                                    },{
                                        text: 'Archive inactive users', date: 'Last week', tag: 'Expired', color: 'bg-red-100 text-red-800'
                                    }].map((t, idx) => (
                                        <li key={idx} className="flex items-start gap-3">
                                            <input type="checkbox" className="mt-1" defaultChecked={t.tag === 'Done'} />
                                            <div className="flex-1">
                                                <div className="text-gray-800">{t.text}</div>
                                                <div className="text-xs text-gray-500 flex items-center gap-2">
                                                    <span>{t.date}</span>
                                                    <span className={`px-2 py-0.5 rounded-full ${t.color}`}>{t.tag}</span>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* Type By Amount (donut) */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                            <div className="bg-white rounded-xl shadow-lg p-6">
                                <div className="text-sm font-semibold text-gray-800 mb-4">Type By Amount</div>
                                <div className="flex items-center gap-8">
                                    <div className="relative w-40 h-40">
                                        <div className="absolute inset-0 rounded-full" style={{ background: 'conic-gradient(#6366f1 0 120deg, #22c55e 0 240deg, #f59e0b 0 330deg, #e5e7eb 0 360deg)' }}></div>
                                        <div className="absolute inset-4 bg-white rounded-full"></div>
                                    </div>
                                    <div className="text-sm space-y-2">
                                        <div className="flex items-center gap-2"><span className="w-3 h-3 bg-indigo-500 rounded-sm"></span> Rides</div>
                                        <div className="flex items-center gap-2"><span className="w-3 h-3 bg-green-500 rounded-sm"></span> Bookings</div>
                                        <div className="flex items-center gap-2"><span className="w-3 h-3 bg-amber-500 rounded-sm"></span> Drivers</div>
                                        <div className="flex items-center gap-2"><span className="w-3 h-3 bg-gray-300 rounded-sm"></span> Other</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}

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
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
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
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <button
                                                    onClick={() => handleDeleteUser(driver.id, driver.name, 'Driver')}
                                                    className="flex items-center space-x-1 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium text-sm shadow-sm"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                    <span>Remove</span>
                                                </button>
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
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
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
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <button
                                                    onClick={() => handleDeleteUser(passenger.id, passenger.name, 'Passenger')}
                                                    className="flex items-center space-x-1 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium text-sm shadow-sm"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                    <span>Remove</span>
                                                </button>
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
                    </div>
            </main>
            {/* Close flex container around sidebar + content */}
            </div>

            <Footer />
        </div>
    );
};

export default AdminDashboard;

// Small presentational helpers
function SidebarItem({ icon, label, active, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                active ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-100'
            }`}
        >
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-gray-100 text-gray-700">
                {icon}
            </span>
            <span className="truncate">{label}</span>
        </button>
    );
}

function StatCard({ title, value, icon, gradient }) {
    return (
        <div className={`bg-gradient-to-br ${gradient} rounded-xl shadow-lg p-6 text-white`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-white/80 text-sm font-medium mb-1">{title}</p>
                    <p className="text-3xl font-bold">{value}</p>
                </div>
                <div className="bg-white/20 rounded-lg p-3">
                    {icon}
                </div>
            </div>
        </div>
    );
}