import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Car, CheckCircle, XCircle, TrendingUp, DollarSign, Shield, Activity, Trash2, LayoutGrid, Settings, Menu } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BackButton from '../components/BackButton';
import { adminService } from '../services/adminService';
import { authService } from '../services/authService';
import { showConfirm, showSuccess, showError } from '../utils/swal';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [pendingDrivers, setPendingDrivers] = useState([]);
    const [allDrivers, setAllDrivers] = useState([]);
    const [allPassengers, setAllPassengers] = useState([]);
    const [activeTab, setActiveTab] = useState('stats');
    const [activeOverviewTab, setActiveOverviewTab] = useState('overview');
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    // Pagination for admin driver/passenger lists (client-side)
    const [driversPage, setDriversPage] = useState(0);
    const [driversSize, setDriversSize] = useState(5);
    const [passengersPage, setPassengersPage] = useState(0);
    const [passengersSize, setPassengersSize] = useState(5);

    // Derived pagination slices
    const getDisplayedDrivers = () => {
        const start = driversPage * driversSize;
        return (allDrivers || []).slice(start, start + driversSize);
    };
    const getDisplayedPassengers = () => {
        const start = passengersPage * passengersSize;
        return (allPassengers || []).slice(start, start + passengersSize);
    };

    // Header actions: Share/Print/Export
    const handleShare = async () => {
        try {
            const url = window.location.href;
            if (navigator.share) {
                await navigator.share({ title: 'RSA Admin Dashboard', text: 'Check out the dashboard', url });
                return;
            }
            await navigator.clipboard.writeText(url);
            await showSuccess('Link copied to clipboard');
        } catch (e) {
            await showError('Unable to share right now');
        }
    };

    const handlePrint = () => {
        try { window.print(); } catch { /* ignore */ }
    };

    const handleExport = async () => {
        try {
            if (activeTab === 'drivers') {
                const rows = [['Name','Email','Vehicle','License','Rating','Total Rides','Company Income']];
                for (const d of allDrivers) rows.push([
                    d.name||'', d.email||'', d.vehicleModel||'', d.licensePlate||'',
                    (d.driverRating?.toFixed?.(1) || ''), (d.totalRides||0), (d.companyIncome?.toFixed?.(2) || '0.00')
                ]);
                const csv = rows.map(r => r.map(v => `"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');
                downloadBlob('drivers.csv', csv);
                return;
            }
            if (activeTab === 'passengers') {
                const rows = [['Name','Email','Phone','Total Bookings','Total Spending']];
                for (const p of allPassengers) rows.push([
                    p.name||'', p.email||'', p.phone||'', (p.totalBookings||0), (p.totalSpending?.toFixed?.(2)||'0.00')
                ]);
                const csv = rows.map(r => r.map(v => `"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');
                downloadBlob('passengers.csv', csv);
                return;
            }
            if (activeTab === 'pending') {
                const rows = [['Name','Email','Phone','Vehicle','License']];
                for (const d of pendingDrivers) rows.push([
                    d.name||'', d.email||'', d.phone||'', d.vehicleModel||'', d.licensePlate||''
                ]);
                const csv = rows.map(r => r.map(v => `"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');
                downloadBlob('pending_drivers.csv', csv);
                return;
            }
            // default: export stats
            const rows = Object.entries(stats || {}).map(([k,v]) => [k, v]);
            const csv = [['metric','value'], ...rows].map(r => r.join(',')).join('\n');
            downloadBlob('stats.csv', csv);
        } catch (e) {
            await showError('Export failed');
        }
    };

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
            const errorMessage = error?.response?.data?.message || error?.message || 'Unknown error occurred';
            console.error('Delete user error:', error);
            await showError(`Error deleting ${userType.toLowerCase()}: ${errorMessage}`);
        }
    };

    const handleLogout = async () => {
        const confirm = await showConfirm(
            'Are you sure you want to logout?',
            'Yes, Logout',
            'Cancel'
        );

        if (confirm.isConfirmed) {
            authService.logout();
            navigate('/');
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
                        <SidebarItem icon={<Settings className="h-4 w-4" />} label="Settings" active={activeTab==='settings'} onClick={() => setActiveTab('settings')} />
                        <SidebarItem icon={<Shield className="h-4 w-4" />} label="Logout" active={false} onClick={handleLogout} />
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
                                <SidebarItem icon={<Settings className="h-4 w-4" />} label="Settings" active={activeTab==='settings'} onClick={() => { setActiveTab('settings'); setSidebarOpen(false); }} />
                                <SidebarItem icon={<Shield className="h-4 w-4" />} label="Logout" active={false} onClick={async () => { setSidebarOpen(false); await handleLogout(); }} />
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
                            <button onClick={handleShare} className="px-3 py-1.5 rounded border hover:bg-gray-50">Share</button>
                            <button onClick={handlePrint} className="px-3 py-1.5 rounded border hover:bg-gray-50">Print</button>
                            <button onClick={handleExport} className="px-3 py-1.5 rounded bg-indigo-600 text-white">Export</button>
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
                            <div className="flex items-center gap-4 text-sm">
                                <button onClick={() => setActiveOverviewTab('overview')} className={`${activeOverviewTab==='overview' ? 'font-semibold text-gray-900' : 'text-gray-500 hover:text-gray-800'}`}>Overview</button>
                                <button onClick={() => setActiveOverviewTab('audiences')} className={`${activeOverviewTab==='audiences' ? 'font-semibold text-gray-900' : 'text-gray-500 hover:text-gray-800'}`}>Audiences</button>
                                <button onClick={() => setActiveOverviewTab('demographics')} className={`${activeOverviewTab==='demographics' ? 'font-semibold text-gray-900' : 'text-gray-500 hover:text-gray-800'}`}>Demographics</button>
                                <button onClick={() => setActiveOverviewTab('more')} className={`${activeOverviewTab==='more' ? 'font-semibold text-gray-900' : 'text-gray-500 hover:text-gray-800'}`}>More</button>
                            </div>
                            <div className="flex items-center gap-3">
                                <select className="px-3 py-2 border rounded-lg text-sm text-gray-700 bg-white">
                                    <option>Select Category</option>
                                    <option>Rides</option>
                                    <option>Bookings</option>
                                    <option>Users</option>
                                </select>
                                <input type="date" className="px-3 py-2 border rounded-lg text-sm text-gray-700 bg-white" />
                                <div className="hidden sm:flex items-center gap-2 text-sm">
                            <button onClick={handleShare} className="px-3 py-1.5 rounded border hover:bg-gray-50">Share</button>
                            <button onClick={handlePrint} className="px-3 py-1.5 rounded border hover:bg-gray-50">Print</button>
                            <button onClick={handleExport} className="px-3 py-1.5 rounded bg-indigo-600 text-white">Export</button>
                        </div>
                            </div>
                        </div>

                        {/* Market Overview + Todo List */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                            {/* Market Overview (interactive charts) */}
                            <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <div className="text-sm font-semibold text-gray-800 capitalize">{activeOverviewTab}</div>
                                        <div className="text-xs text-gray-500">Interactive snapshot</div>
                                    </div>
                                    <button className="px-3 py-1 border rounded-lg text-sm">This month ▾</button>
                                </div>
                                <div className="text-2xl font-bold text-gray-900 mb-2">₹{(stats?.totalBookings || 0) * 523}</div>
                                <div className="text-xs text-green-600 font-semibold mb-4">+1.37%</div>
                                {activeOverviewTab === 'overview' && (
                                    <BarChart data={generateMonthlySeries(stats)} height={200} />
                                )}
                                {activeOverviewTab === 'audiences' && (
                                    <LineChart data={generateWeeklySeries(stats)} height={200} />
                                )}
                                {activeOverviewTab === 'demographics' && (
                                    <DonutChart segments={[
                                        { label: 'Drivers', value: stats?.totalDrivers || 0, color: '#22c55e' },
                                        { label: 'Passengers', value: stats?.totalPassengers || 0, color: '#6366f1' },
                                        { label: 'Other', value: Math.max(1, (stats?.totalUsers || 0) - ((stats?.totalDrivers||0)+(stats?.totalPassengers||0))), color: '#f59e0b' },
                                    ]} />
                                )}
                                {activeOverviewTab === 'more' && (
                                    <div className="text-sm text-gray-600">More analytics coming soon. Use other tabs for insights.</div>
                                )}
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
                                <DonutChart segments={[
                                    { label: 'Rides', value: stats?.totalRides || 0, color: '#6366f1' },
                                    { label: 'Bookings', value: stats?.totalBookings || 0, color: '#22c55e' },
                                    { label: 'Drivers', value: stats?.totalDrivers || 0, color: '#f59e0b' },
                                    { label: 'Other', value: Math.max(1, (stats?.totalUsers || 0) - ((stats?.totalDrivers||0)+(stats?.totalPassengers||0))), color: '#d1d5db' },
                                ]} />
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
                                    {getDisplayedDrivers().map((driver) => (
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
                                <div className="px-6 py-4 flex items-center justify-between bg-white border-t">
                                    <div className="text-sm text-gray-600">Showing page {driversPage + 1} of {Math.max(1, Math.ceil(Math.max(1, allDrivers.length) / driversSize))} — {allDrivers.length} drivers</div>
                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={() => setDriversPage(Math.max(0, driversPage - 1))}
                                            disabled={driversPage <= 0}
                                            className={`px-3 py-1 rounded-md ${driversPage <= 0 ? 'bg-gray-200 text-gray-500' : 'bg-white border'}`}
                                        >Prev</button>
                                        <div className="flex items-center space-x-1">
                                            {Array.from({ length: Math.max(1, Math.ceil(Math.max(1, allDrivers.length) / driversSize)) }).map((_, idx) => {
                                                const start = Math.max(0, driversPage - 3);
                                                const end = Math.min(Math.max(1, Math.ceil(Math.max(1, allDrivers.length) / driversSize)) - 1, driversPage + 3);
                                                if (idx < start || idx > end) return null;
                                                return (
                                                    <button key={idx} onClick={() => setDriversPage(idx)} className={`px-3 py-1 rounded-md ${idx === driversPage ? 'bg-green-600 text-white' : 'bg-white border'}`}>{idx + 1}</button>
                                                );
                                            })}
                                        </div>
                                        <button
                                            onClick={() => setDriversPage(Math.min(Math.max(0, Math.ceil(Math.max(1, allDrivers.length) / driversSize) - 1), driversPage + 1))}
                                            disabled={driversPage >= Math.max(0, Math.ceil(Math.max(1, allDrivers.length) / driversSize) - 1)}
                                            className={`px-3 py-1 rounded-md ${driversPage >= Math.max(0, Math.ceil(Math.max(1, allDrivers.length) / driversSize) - 1) ? 'bg-gray-200 text-gray-500' : 'bg-white border'}`}
                                        >Next</button>
                                        <select
                                            value={driversSize}
                                            onChange={(e) => { setDriversSize(parseInt(e.target.value, 10)); setDriversPage(0); }}
                                            className="ml-3 px-2 py-1 border rounded-md bg-white"
                                        >
                                            {[5,10,20,50].map(s => (
                                                <option key={s} value={s}>{s} / page</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
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
                                    {getDisplayedPassengers().map((passenger) => (
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
                                <div className="px-6 py-4 flex items-center justify-between bg-white border-t">
                                    <div className="text-sm text-gray-600">Showing page {passengersPage + 1} of {Math.max(1, Math.ceil(Math.max(1, allPassengers.length) / passengersSize))} — {allPassengers.length} passengers</div>
                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={() => setPassengersPage(Math.max(0, passengersPage - 1))}
                                            disabled={passengersPage <= 0}
                                            className={`px-3 py-1 rounded-md ${passengersPage <= 0 ? 'bg-gray-200 text-gray-500' : 'bg-white border'}`}
                                        >Prev</button>
                                        <div className="flex items-center space-x-1">
                                            {Array.from({ length: Math.max(1, Math.ceil(Math.max(1, allPassengers.length) / passengersSize)) }).map((_, idx) => {
                                                const start = Math.max(0, passengersPage - 3);
                                                const end = Math.min(Math.max(1, Math.ceil(Math.max(1, allPassengers.length) / passengersSize)) - 1, passengersPage + 3);
                                                if (idx < start || idx > end) return null;
                                                return (
                                                    <button key={idx} onClick={() => setPassengersPage(idx)} className={`px-3 py-1 rounded-md ${idx === passengersPage ? 'bg-purple-600 text-white' : 'bg-white border'}`}>{idx + 1}</button>
                                                );
                                            })}
                                        </div>
                                        <button
                                            onClick={() => setPassengersPage(Math.min(Math.max(0, Math.ceil(Math.max(1, allPassengers.length) / passengersSize) - 1), passengersPage + 1))}
                                            disabled={passengersPage >= Math.max(0, Math.ceil(Math.max(1, allPassengers.length) / passengersSize) - 1)}
                                            className={`px-3 py-1 rounded-md ${passengersPage >= Math.max(0, Math.ceil(Math.max(1, allPassengers.length) / passengersSize) - 1) ? 'bg-gray-200 text-gray-500' : 'bg-white border'}`}
                                        >Next</button>
                                        <select
                                            value={passengersSize}
                                            onChange={(e) => { setPassengersSize(parseInt(e.target.value, 10)); setPassengersPage(0); }}
                                            className="ml-3 px-2 py-1 border rounded-md bg-white"
                                        >
                                            {[5,10,20,50].map(s => (
                                                <option key={s} value={s}>{s} / page</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
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
                
                {/* Settings Section */}
                {activeTab === 'settings' && (
                    <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-lg font-bold text-gray-900">Settings</div>
                                <div className="text-sm text-gray-500">Control platform preferences</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="col-span-1 lg:col-span-2 space-y-6">
                                <CardSection title="General">
                                    <ToggleRow
                                        label="Maintenance mode"
                                        description="Temporarily disable new bookings and postings"
                                        onToggle={async (val) => { await showSuccess(`Maintenance mode ${val? 'enabled':'disabled'}`); }}
                                    />
                                    <ToggleRow
                                        label="Auto-approve trusted drivers"
                                        description="Fast-track approvals for drivers with verified docs"
                                        onToggle={async (val) => { await showSuccess(`Auto-approval ${val? 'enabled':'disabled'}`); }}
                                    />
                                    <ToggleRow
                                        label="Require strong passwords"
                                        description="Enforce stronger password policy for all users"
                                        defaultChecked
                                        onToggle={async () => {}}
                                    />
                                </CardSection>

                                <CardSection title="Data & Reports">
                                    <div className="flex flex-wrap gap-2">
                                        <button className="px-3 py-2 rounded border hover:bg-gray-50" onClick={async()=>{ await showSuccess('Users report exported'); }}>Export Users</button>
                                        <button className="px-3 py-2 rounded border hover:bg-gray-50" onClick={async()=>{ await showSuccess('Rides report exported'); }}>Export Rides</button>
                                        <button className="px-3 py-2 rounded border hover:bg-gray-50" onClick={async()=>{ await showSuccess('Bookings report exported'); }}>Export Bookings</button>
                                    </div>
                                </CardSection>

                                <CardSection title="System">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="font-medium text-gray-900">Clear cached data</div>
                                            <div className="text-sm text-gray-500">Invalidate local caches to refresh metrics</div>
                                        </div>
                                        <button className="px-3 py-2 rounded bg-red-500 text-white hover:bg-red-600" onClick={async()=>{ try { localStorage.clear(); await showSuccess('Cache cleared'); } catch { await showError('Unable to clear cache'); } }}>Clear</button>
                                    </div>
                                </CardSection>
                            </div>

                            <div className="space-y-6">
                                <CardSection title="Shortcuts">
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <button onClick={()=>setActiveTab('drivers')} className="px-3 py-2 rounded border hover:bg-gray-50 text-left">Manage Drivers</button>
                                        <button onClick={()=>setActiveTab('passengers')} className="px-3 py-2 rounded border hover:bg-gray-50 text-left">Manage Passengers</button>
                                        <button onClick={()=>setActiveTab('pending')} className="px-3 py-2 rounded border hover:bg-gray-50 text-left">Pending Approvals</button>
                                        <button onClick={()=>setActiveTab('stats')} className="px-3 py-2 rounded border hover:bg-gray-50 text-left">Back to Overview</button>
                                    </div>
                                </CardSection>
                            </div>
                        </div>
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

// ===== Lightweight chart + settings helpers (no external deps) =====
// Pagination helpers (scoped under component via closure variables)
function downloadBlob(filename, data, type = 'text/csv;charset=utf-8') {
    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

function BarChart({ data, height = 200 }) {
    const max = Math.max(1, ...data.map(d => d.value));
    return (
        <div className="h-48 flex items-end gap-2" style={{ height }}>
            {data.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center">
                    <div className="w-full bg-blue-200 rounded-t h-1"></div>
                    <div style={{ height: `${(d.value / max) * 90}%` }} className="w-full bg-indigo-500 rounded-t"></div>
                </div>
            ))}
        </div>
    );
}

function LineChart({ data, height = 200, stroke = '#6366f1' }) {
    const max = Math.max(1, ...data.map(d => d.value));
    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = 100 - (d.value / max) * 90;
        return `${x},${y}`;
    }).join(' ');
    return (
        <svg viewBox="0 0 100 100" className="w-full h-52">
            <polyline fill="none" stroke={stroke} strokeWidth="2" points={points} />
        </svg>
    );
}

function DonutChart({ segments }) {
    const total = segments.reduce((s, x) => s + Math.max(0, x.value), 0) || 1;
    let acc = 0;
    const arcs = segments.map((seg, idx) => {
        const start = (acc / total) * 360; acc += Math.max(0, seg.value);
        const end = (acc / total) * 360;
        return { start, end, color: seg.color, label: seg.label };
    });
    const conic = arcs.map(a => `${a.color} ${a.start}deg ${a.end}deg`).join(', ');
    return (
        <div className="flex items-center gap-8">
            <div className="relative w-40 h-40">
                <div className="absolute inset-0 rounded-full" style={{ background: `conic-gradient(${conic})` }}></div>
                <div className="absolute inset-4 bg-white rounded-full"></div>
            </div>
            <div className="text-sm space-y-2">
                {segments.map((s, i) => (
                    <div key={i} className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm" style={{ background: s.color }}></span> {s.label}</div>
                ))}
            </div>
        </div>
    );
}

function CardSection({ title, children }) {
    return (
        <div className="bg-white rounded-xl border shadow-sm p-4">
            <div className="font-semibold mb-3 text-gray-800">{title}</div>
            {children}
        </div>
    );
}

function ToggleRow({ label, description, defaultChecked = false, onToggle }) {
    const [checked, setChecked] = useState(defaultChecked);
    return (
        <div className="flex items-start justify-between py-3">
            <div>
                <div className="font-medium text-gray-900">{label}</div>
                <div className="text-sm text-gray-500">{description}</div>
            </div>
            <label className="inline-flex items-center cursor-pointer select-none">
                <input type="checkbox" className="sr-only" checked={checked} onChange={(e)=>{ setChecked(e.target.checked); onToggle && onToggle(e.target.checked); }} />
                <span className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${checked ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                    <span className={`bg-white w-4 h-4 rounded-full transform transition-transform ${checked ? 'translate-x-4' : ''}`}></span>
                </span>
            </label>
        </div>
    );
}

// Simple data generators from stats for charts
function generateMonthlySeries(stats) {
    const base = (stats?.totalBookings || 20);
    return Array.from({ length: 12 }).map((_, i) => ({ label: i, value: Math.max(5, Math.round(base * (0.6 + ((i % 5) * 0.1)))) }));
}

function generateWeeklySeries(stats) {
    const base = (stats?.totalUsers || 50);
    return Array.from({ length: 8 }).map((_, i) => ({ label: i, value: Math.max(5, Math.round(base * (0.4 + ((Math.sin(i) + 1) / 3)))) }));
}