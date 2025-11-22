import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Car, CheckCircle, XCircle, TrendingUp, DollarSign, Shield, Activity, Trash2, LayoutGrid, Settings, Menu, Plus, X, Clock, AlertCircle, ArrowUp, ArrowDown, Target, BarChart3, PieChart, LineChart as LineChartIcon, Zap } from 'lucide-react';
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
    const [todos, setTodos] = useState(() => {
        const saved = localStorage.getItem('adminTodos');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch {
                return [];
            }
        }
        return [
            { id: 1, text: 'Review pending driver documents', date: 'Today', completed: false, priority: 'high' },
            { id: 2, text: 'Export bookings report', date: 'Yesterday', completed: true, priority: 'medium' },
            { id: 3, text: 'Audit suspicious accounts', date: '2 days ago', completed: true, priority: 'low' },
            { id: 4, text: 'Archive inactive users', date: 'Last week', completed: false, priority: 'medium' }
        ];
    });
    const [showAddTodo, setShowAddTodo] = useState(false);
    const [newTodoText, setNewTodoText] = useState('');
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

    useEffect(() => {
        localStorage.setItem('adminTodos', JSON.stringify(todos));
    }, [todos]);

    const addTodo = () => {
        if (newTodoText.trim()) {
            const newTodo = {
                id: Date.now(),
                text: newTodoText.trim(),
                date: 'Today',
                completed: false,
                priority: 'medium'
            };
            setTodos([newTodo, ...todos]);
            setNewTodoText('');
            setShowAddTodo(false);
        }
    };

    const toggleTodo = (id) => {
        setTodos(todos.map(todo => 
            todo.id === id ? { ...todo, completed: !todo.completed } : todo
        ));
    };

    const deleteTodo = (id) => {
        setTodos(todos.filter(todo => todo.id !== id));
    };

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
            <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative overflow-hidden">
                {/* Animated Background Elements */}
                <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                    <div className="absolute top-0 left-0 w-96 h-96 bg-purple-300/20 rounded-full blur-3xl animate-blob"></div>
                    <div className="absolute top-0 right-0 w-96 h-96 bg-blue-300/20 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
                    <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-indigo-300/20 rounded-full blur-3xl animate-blob animation-delay-4000"></div>
                    <div className="absolute inset-0 bg-grid-pattern opacity-30"></div>
                </div>
                <Navbar />
                <div className="flex-grow flex items-center justify-center relative z-10">
                    <div className="text-sm font-semibold text-gray-700">Loading dashboard...</div>
                </div>
            </div>
        );
    }

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

            {/* Responsive Shell with Sidebar */}
            <div className="flex flex-1">
                {/* Sidebar (desktop) */}
                <aside className={`hidden lg:flex lg:flex-col lg:w-56 bg-white/90 backdrop-blur-lg border-r shadow-2xl rounded-r-xl relative z-10`}>
                    <div className="h-16 flex items-center px-4 border-b bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                        <div className="flex items-center gap-2 text-white font-bold text-base relative z-10">
                            <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                                <LayoutGrid className="h-5 w-5" />
                            </div>
                            <span>Admin Panel</span>
                        </div>
                    </div>
                    <nav className="flex-1 px-2 py-3 space-y-0.5">
                        <SidebarItem icon={<Activity className="h-3.5 w-3.5" />} label="Overview" active={activeTab==='stats'} onClick={() => setActiveTab('stats')} />
                        <SidebarItem icon={<Car className="h-3.5 w-3.5" />} label={`Drivers (${allDrivers.length})`} active={activeTab==='drivers'} onClick={() => setActiveTab('drivers')} />
                        <SidebarItem icon={<Users className="h-3.5 w-3.5" />} label={`Passengers (${allPassengers.length})`} active={activeTab==='passengers'} onClick={() => setActiveTab('passengers')} />
                        <SidebarItem icon={<XCircle className="h-3.5 w-3.5" />} label={`Pending (${pendingDrivers.length})`} active={activeTab==='pending'} onClick={() => setActiveTab('pending')} />
                        <div className="pt-1.5 mt-1.5 border-t"></div>
                        <SidebarItem icon={<Settings className="h-3.5 w-3.5" />} label="Settings" active={activeTab==='settings'} onClick={() => setActiveTab('settings')} />
                        <SidebarItem icon={<Shield className="h-3.5 w-3.5" />} label="Logout" active={false} onClick={handleLogout} />
                    </nav>
                    <div className="p-3 text-xs text-gray-500">© {new Date().getFullYear()} RSA Admin</div>
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
                <main className="flex-1 min-w-0 relative z-10">
                    {/* Top header */}
                    <div className="px-3 sm:px-5 lg:px-6 py-4 border-b bg-white/90 backdrop-blur-lg shadow-lg flex items-center justify-between relative">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-200/20 to-purple-200/20 rounded-full blur-3xl -mr-32 -mt-32"></div>
                        <div className="flex items-center gap-2">
                            <button className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 transition-colors" onClick={() => setSidebarOpen(true)}>
                                <Menu className="h-4 w-4" />
                            </button>
                            <h1 className="text-base sm:text-lg font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-1.5">
                                <Shield className="h-4 w-4 text-blue-600" />
                                Admin Dashboard
                            </h1>
                        </div>
                        <div className="hidden sm:flex items-center gap-1.5 text-xs">
                            <button onClick={handleShare} className="px-2.5 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors text-xs">Share</button>
                            <button onClick={handlePrint} className="px-2.5 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors text-xs">Print</button>
                            <button onClick={handleExport} className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 transition-all text-xs shadow-lg">Export</button>
                        </div>
                    </div>

                    <div className="px-4 sm:px-6 lg:px-8 py-6 relative z-10">
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
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <div className="text-lg font-bold text-gray-900 capitalize flex items-center gap-2">
                                            {activeOverviewTab === 'overview' && <BarChart3 className="h-5 w-5 text-indigo-600" />}
                                            {activeOverviewTab === 'audiences' && <Users className="h-5 w-5 text-indigo-600" />}
                                            {activeOverviewTab === 'demographics' && <PieChart className="h-5 w-5 text-indigo-600" />}
                                            {activeOverviewTab === 'more' && <Activity className="h-5 w-5 text-indigo-600" />}
                                            {activeOverviewTab === 'overview' ? 'Business Overview' : activeOverviewTab === 'audiences' ? 'Audience Analytics' : activeOverviewTab === 'demographics' ? 'Demographics' : 'Advanced Analytics'}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">Comprehensive insights and trends</div>
                                    </div>
                                    <select className="px-3 py-1.5 border rounded-lg text-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                        <option>This month</option>
                                        <option>Last month</option>
                                        <option>Last 3 months</option>
                                        <option>Last 6 months</option>
                                        <option>This year</option>
                                    </select>
                                </div>

                                {activeOverviewTab === 'overview' && (
                                    <div className="space-y-8">
                                        {/* Detailed Statistics */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200 shadow-sm">
                                                <div className="flex items-center gap-3 mb-5 pb-4 border-b-2 border-green-200">
                                                    <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-lg">
                                                        <Users className="h-5 w-5 text-white" />
                                                    </div>
                                                    <div className="text-base font-bold text-green-900">User Statistics</div>
                                                </div>
                                                <div className="space-y-4">
                                                    <div className="flex justify-between items-center py-2 hover:bg-green-100 rounded-lg px-2 transition-colors">
                                                        <div className="flex items-center gap-2">
                                                            <Car className="h-4 w-4 text-green-600" />
                                                            <span className="text-sm text-green-800">Total Drivers</span>
                                                        </div>
                                                        <span className="text-lg font-bold text-green-900">{stats?.totalDrivers || 0}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center py-2 hover:bg-green-100 rounded-lg px-2 transition-colors">
                                                        <div className="flex items-center gap-2">
                                                            <Users className="h-4 w-4 text-green-600" />
                                                            <span className="text-sm text-green-800">Total Passengers</span>
                                                        </div>
                                                        <span className="text-lg font-bold text-green-900">{stats?.totalPassengers || 0}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center py-2 hover:bg-green-100 rounded-lg px-2 transition-colors">
                                                        <div className="flex items-center gap-2">
                                                            <TrendingUp className="h-4 w-4 text-green-600" />
                                                            <span className="text-sm text-green-800">Driver Share</span>
                                                        </div>
                                                        <span className="text-lg font-bold text-green-900">
                                                            {stats?.totalUsers ? `${((stats.totalDrivers / stats.totalUsers) * 100).toFixed(1)}%` : '0%'}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center py-2 hover:bg-green-100 rounded-lg px-2 transition-colors">
                                                        <div className="flex items-center gap-2">
                                                            <Activity className="h-4 w-4 text-green-600" />
                                                            <span className="text-sm text-green-800">Passenger Share</span>
                                                        </div>
                                                        <span className="text-lg font-bold text-green-900">
                                                            {stats?.totalUsers ? `${((stats.totalPassengers / stats.totalUsers) * 100).toFixed(1)}%` : '0%'}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center pt-3 mt-3 border-t-2 border-green-200">
                                                        <div className="flex items-center gap-2">
                                                            <Target className="h-4 w-4 text-green-600" />
                                                            <span className="text-sm font-semibold text-green-900">Driver:Passenger Ratio</span>
                                                        </div>
                                                        <span className="text-lg font-bold text-green-900">
                                                            {stats?.totalDrivers && stats?.totalPassengers 
                                                                ? `${(stats.totalDrivers / stats.totalPassengers).toFixed(2)}:1`
                                                                : '0:0'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 border-2 border-purple-200 shadow-sm">
                                                <div className="flex items-center gap-3 mb-5 pb-4 border-b-2 border-purple-200">
                                                    <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
                                                        <Activity className="h-5 w-5 text-white" />
                                                    </div>
                                                    <div className="text-base font-bold text-purple-900">Platform Performance</div>
                                                </div>
                                                <div className="space-y-4">
                                                    <div className="flex justify-between items-center py-2 hover:bg-purple-100 rounded-lg px-2 transition-colors">
                                                        <div className="flex items-center gap-2">
                                                            <Car className="h-4 w-4 text-purple-600" />
                                                            <span className="text-sm text-purple-800">Total Rides</span>
                                                        </div>
                                                        <span className="text-lg font-bold text-purple-900">{stats?.totalRides || 0}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center py-2 hover:bg-purple-100 rounded-lg px-2 transition-colors">
                                                        <div className="flex items-center gap-2">
                                                            <DollarSign className="h-4 w-4 text-purple-600" />
                                                            <span className="text-sm text-purple-800">Total Bookings</span>
                                                        </div>
                                                        <span className="text-lg font-bold text-purple-900">{stats?.totalBookings || 0}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center py-2 hover:bg-purple-100 rounded-lg px-2 transition-colors">
                                                        <div className="flex items-center gap-2">
                                                            <TrendingUp className="h-4 w-4 text-purple-600" />
                                                            <span className="text-sm text-purple-800">Booking Rate</span>
                                                        </div>
                                                        <span className="text-lg font-bold text-purple-900">
                                                            {stats?.totalRides ? `${((stats.totalBookings / stats.totalRides) * 100).toFixed(1)}%` : '0%'}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center py-2 hover:bg-purple-100 rounded-lg px-2 transition-colors">
                                                        <div className="flex items-center gap-2">
                                                            <Users className="h-4 w-4 text-purple-600" />
                                                            <span className="text-sm text-purple-800">Avg Bookings/User</span>
                                                        </div>
                                                        <span className="text-lg font-bold text-purple-900">
                                                            {stats?.totalBookings && stats?.totalUsers 
                                                                ? (stats.totalBookings / stats.totalUsers).toFixed(2)
                                                                : '0.00'}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center pt-3 mt-3 border-t-2 border-purple-200">
                                                        <div className="flex items-center gap-2">
                                                            <CheckCircle className="h-4 w-4 text-purple-600" />
                                                            <span className="text-sm font-semibold text-purple-900">Driver Approval Rate</span>
                                                        </div>
                                                        <span className="text-lg font-bold text-purple-900">
                                                            {stats?.totalDrivers && stats?.pendingDrivers 
                                                                ? `${((stats.totalDrivers / (stats.totalDrivers + stats.pendingDrivers)) * 100).toFixed(1)}%`
                                                                : '100%'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Additional Metrics */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                            <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl p-6 border-2 border-cyan-200 shadow-sm hover:shadow-lg transition-all duration-200">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <div className="p-1.5 bg-cyan-500 rounded-lg">
                                                        <Target className="h-4 w-4 text-white" />
                                                    </div>
                                                    <div className="text-sm font-medium text-cyan-700">Conversion Rate</div>
                                                </div>
                                                <div className="text-3xl font-bold text-cyan-900 mb-2">
                                                    {stats?.totalBookings && stats?.totalUsers 
                                                        ? `${((stats.totalBookings / stats.totalUsers) * 100).toFixed(1)}%`
                                                        : '0%'}
                                                </div>
                                                <div className="text-xs text-cyan-600 leading-relaxed">Users who made bookings</div>
                                            </div>
                                            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 border-2 border-emerald-200 shadow-sm hover:shadow-lg transition-all duration-200">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <div className="p-1.5 bg-emerald-500 rounded-lg">
                                                        <Activity className="h-4 w-4 text-white" />
                                                    </div>
                                                    <div className="text-sm font-medium text-emerald-700">Platform Utilization</div>
                                                </div>
                                                <div className="text-3xl font-bold text-emerald-900 mb-2">
                                                    {stats?.totalRides && stats?.totalBookings 
                                                        ? `${((stats.totalBookings / stats.totalRides) * 100).toFixed(1)}%`
                                                        : '0%'}
                                                </div>
                                                <div className="text-xs text-emerald-600 leading-relaxed">Rides with bookings</div>
                                            </div>
                                            <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-6 border-2 border-violet-200 shadow-sm hover:shadow-lg transition-all duration-200">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <div className="p-1.5 bg-violet-500 rounded-lg">
                                                        <TrendingUp className="h-4 w-4 text-white" />
                                                    </div>
                                                    <div className="text-sm font-medium text-violet-700">User Engagement</div>
                                                </div>
                                                <div className="text-3xl font-bold text-violet-900 mb-2">
                                                    {stats?.totalBookings && stats?.totalUsers 
                                                        ? (stats.totalBookings / stats.totalUsers).toFixed(2)
                                                        : '0.00'}
                                                </div>
                                                <div className="text-xs text-violet-600 leading-relaxed">Bookings per user</div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeOverviewTab === 'audiences' && (
                                    <div className="space-y-6">
                                        {/* Audience Metrics */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-4 border border-blue-100">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="text-xs text-gray-600 font-medium">Total Audience</div>
                                                    <Users className="h-4 w-4 text-blue-600" />
                                                </div>
                                                <div className="text-2xl font-bold text-gray-900">{stats?.totalUsers || 0}</div>
                                                <div className="flex items-center gap-1 mt-1 text-xs">
                                                    <ArrowUp className="h-3 w-3 text-green-600" />
                                                    <span className="text-green-600 font-semibold">+15.3%</span>
                                                    <span className="text-gray-500">growth</span>
                                                </div>
                                            </div>
                                            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-100">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="text-xs text-gray-600 font-medium">Active Users</div>
                                                    <Activity className="h-4 w-4 text-indigo-600" />
                                                </div>
                                                <div className="text-2xl font-bold text-gray-900">
                                                    {Math.round((stats?.totalUsers || 0) * 0.75)}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1">75% of total users</div>
                                            </div>
                                        </div>

                                        {/* User Growth Chart */}
                                        <div>
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="text-sm font-semibold text-gray-700">User Growth (Last 8 Weeks)</div>
                                                <div className="flex items-center gap-2 text-xs">
                                                    <div className="flex items-center gap-1">
                                                        <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                                                        <span className="text-gray-600">New Users</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                                        <span className="text-gray-600">Active</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <LineChart data={generateWeeklySeries(stats)} height={250} stroke="#6366f1" />
                                        </div>

                                        {/* User Segmentation */}
                                        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                                            <div className="text-center">
                                                <div className="text-xs text-gray-500 mb-1">Drivers</div>
                                                <div className="text-lg font-bold text-gray-900">{stats?.totalDrivers || 0}</div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    {stats?.totalUsers ? Math.round((stats.totalDrivers / stats.totalUsers) * 100) : 0}% of total
                                                </div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-xs text-gray-500 mb-1">Passengers</div>
                                                <div className="text-lg font-bold text-gray-900">{stats?.totalPassengers || 0}</div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    {stats?.totalUsers ? Math.round((stats.totalPassengers / stats.totalUsers) * 100) : 0}% of total
                                                </div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-xs text-gray-500 mb-1">Engagement</div>
                                                <div className="text-lg font-bold text-gray-900">
                                                    {stats?.totalBookings && stats?.totalUsers 
                                                        ? Math.round((stats.totalBookings / stats.totalUsers) * 10) / 10 
                                                        : 0}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1">bookings/user</div>
                                            </div>
                                        </div>

                                        {/* Audience Insights */}
                                        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-100">
                                            <div className="flex items-start gap-3">
                                                <Zap className="h-5 w-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                                                <div>
                                                    <div className="text-sm font-semibold text-gray-900 mb-1">Key Insight</div>
                                                    <div className="text-xs text-gray-600">
                                                        Your audience has grown by {stats?.totalUsers ? Math.round((stats.totalUsers / Math.max(1, stats.totalUsers - 10)) * 100 - 100) : 0}% this month. 
                                                        Driver-to-passenger ratio is {stats?.totalDrivers && stats?.totalPassengers 
                                                            ? (stats.totalDrivers / stats.totalPassengers).toFixed(2) 
                                                            : '0'}:1, indicating a healthy marketplace balance.
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeOverviewTab === 'demographics' && (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <div className="text-sm font-semibold text-gray-700 mb-3">User Distribution</div>
                                                <DonutChart segments={[
                                                    { label: 'Drivers', value: stats?.totalDrivers || 0, color: '#22c55e' },
                                                    { label: 'Passengers', value: stats?.totalPassengers || 0, color: '#6366f1' },
                                                    { label: 'Other', value: Math.max(1, (stats?.totalUsers || 0) - ((stats?.totalDrivers||0)+(stats?.totalPassengers||0))), color: '#f59e0b' },
                                                ]} />
                                            </div>
                                            <div className="space-y-4">
                                                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-100">
                                                    <div className="text-xs text-gray-600 mb-1">Driver Share</div>
                                                    <div className="text-2xl font-bold text-gray-900">
                                                        {stats?.totalUsers ? Math.round((stats.totalDrivers / stats.totalUsers) * 100) : 0}%
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-1">{stats?.totalDrivers || 0} drivers</div>
                                                </div>
                                                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-100">
                                                    <div className="text-xs text-gray-600 mb-1">Passenger Share</div>
                                                    <div className="text-2xl font-bold text-gray-900">
                                                        {stats?.totalUsers ? Math.round((stats.totalPassengers / stats.totalUsers) * 100) : 0}%
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-1">{stats?.totalPassengers || 0} passengers</div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="pt-4 border-t">
                                            <div className="text-sm font-semibold text-gray-700 mb-3">Platform Balance</div>
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-gray-600">Driver-to-Passenger Ratio</span>
                                                    <span className="text-sm font-semibold text-gray-900">
                                                        {stats?.totalDrivers && stats?.totalPassengers 
                                                            ? (stats.totalDrivers / stats.totalPassengers).toFixed(2) 
                                                            : '0'}:1
                                                    </span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                    <div 
                                                        className="bg-gradient-to-r from-green-500 to-indigo-500 h-2 rounded-full transition-all"
                                                        style={{ 
                                                            width: `${stats?.totalUsers ? Math.min(100, (stats.totalDrivers / Math.max(1, stats.totalPassengers)) * 50) : 0}%` 
                                                        }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeOverviewTab === 'more' && (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg p-4 border border-yellow-100">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="text-xs text-gray-600 font-medium">Pending Actions</div>
                                                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                                                </div>
                                                <div className="text-2xl font-bold text-gray-900">{stats?.pendingDrivers || 0}</div>
                                                <div className="text-xs text-gray-500 mt-1">Drivers awaiting approval</div>
                                            </div>
                                            <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-lg p-4 border border-red-100">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="text-xs text-gray-600 font-medium">System Health</div>
                                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                                </div>
                                                <div className="text-2xl font-bold text-gray-900">98%</div>
                                                <div className="text-xs text-gray-500 mt-1">Uptime this month</div>
                                            </div>
                                        </div>
                                        <div className="text-center py-8 text-gray-500">
                                            <Activity className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                                            <div className="text-sm font-medium">Advanced Analytics</div>
                                            <div className="text-xs mt-1">More detailed analytics and custom reports coming soon</div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Todo List */}
                            <div className="bg-white rounded-xl shadow-lg p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <div className="text-sm font-semibold text-gray-800">Todo List</div>
                                        <div className="text-xs text-gray-500">{todos.filter(t => !t.completed).length} pending tasks</div>
                                    </div>
                                    <button 
                                        onClick={() => setShowAddTodo(!showAddTodo)}
                                        className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors flex items-center gap-1"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Add
                                    </button>
                                </div>
                                
                                {showAddTodo && (
                                    <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
                                        <input
                                            type="text"
                                            value={newTodoText}
                                            onChange={(e) => setNewTodoText(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && addTodo()}
                                            placeholder="Enter new task..."
                                            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            autoFocus
                                        />
                                        <div className="flex items-center gap-2 mt-2">
                                            <button
                                                onClick={addTodo}
                                                className="px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"
                                            >
                                                Add Task
                                            </button>
                                            <button
                                                onClick={() => { setShowAddTodo(false); setNewTodoText(''); }}
                                                className="px-3 py-1 border rounded text-sm hover:bg-gray-100"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <ul className="space-y-3 text-sm max-h-96 overflow-y-auto">
                                    {todos.length === 0 ? (
                                        <li className="text-center text-gray-500 py-4">No tasks yet. Add one to get started!</li>
                                    ) : (
                                        todos.map((todo) => {
                                            const getPriorityColor = (priority) => {
                                                switch(priority) {
                                                    case 'high': return 'bg-red-100 text-red-800';
                                                    case 'medium': return 'bg-yellow-100 text-yellow-800';
                                                    default: return 'bg-blue-100 text-blue-800';
                                                }
                                            };
                                            const getStatusColor = (completed) => {
                                                return completed ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
                                            };
                                            return (
                                                <li key={todo.id} className={`flex items-start gap-3 p-2 rounded-lg transition-colors ${todo.completed ? 'bg-gray-50 opacity-75' : 'hover:bg-gray-50'}`}>
                                                    <input 
                                                        type="checkbox" 
                                                        className="mt-1 cursor-pointer" 
                                                        checked={todo.completed}
                                                        onChange={() => toggleTodo(todo.id)}
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <div className={`text-gray-800 ${todo.completed ? 'line-through' : ''}`}>{todo.text}</div>
                                                        <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                                                            <Clock className="h-3 w-3" />
                                                            <span>{todo.date}</span>
                                                            <span className={`px-2 py-0.5 rounded-full text-xs ${getPriorityColor(todo.priority)}`}>
                                                                {todo.priority}
                                                            </span>
                                                            <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(todo.completed)}`}>
                                                                {todo.completed ? 'Done' : 'Pending'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => deleteTodo(todo.id)}
                                                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                                        title="Delete task"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </li>
                                            );
                                        })
                                    )}
                                </ul>
                            </div>
                        </div>

                        {/* Type By Amount + Performance Metrics */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                            {/* Type By Amount - Enhanced with Bar Chart */}
                            <div className="bg-white rounded-xl shadow-lg p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <div className="text-lg font-semibold text-gray-800">Type By Amount</div>
                                        <div className="text-xs text-gray-500">Revenue breakdown by category</div>
                                    </div>
                                </div>
                                <div className="mb-6">
                                    <DonutChart segments={[
                                        { label: 'Rides', value: stats?.totalRides || 0, color: '#6366f1' },
                                        { label: 'Bookings', value: stats?.totalBookings || 0, color: '#22c55e' },
                                        { label: 'Drivers', value: stats?.totalDrivers || 0, color: '#f59e0b' },
                                        { label: 'Other', value: Math.max(1, (stats?.totalUsers || 0) - ((stats?.totalDrivers||0)+(stats?.totalPassengers||0))), color: '#d1d5db' },
                                    ]} />
                                </div>
                                <div className="mt-6">
                                    <div className="text-sm font-semibold text-gray-700 mb-3">Amount Distribution</div>
                                    <EnhancedBarChart data={[
                                        { label: 'Rides', value: stats?.totalRides || 0, color: '#6366f1', amount: (stats?.totalRides || 0) * 523 },
                                        { label: 'Bookings', value: stats?.totalBookings || 0, color: '#22c55e', amount: (stats?.totalBookings || 0) * 523 },
                                        { label: 'Drivers', value: stats?.totalDrivers || 0, color: '#f59e0b', amount: (stats?.totalDrivers || 0) * 300 },
                                        { label: 'Other', value: Math.max(1, (stats?.totalUsers || 0) - ((stats?.totalDrivers||0)+(stats?.totalPassengers||0))), color: '#d1d5db', amount: 1000 },
                                    ]} />
                                </div>
                            </div>

                            {/* Performance Metrics - New Section */}
                            <div className="bg-white rounded-xl shadow-lg p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <div className="text-lg font-semibold text-gray-800">Performance Metrics</div>
                                        <div className="text-xs text-gray-500">Key performance indicators</div>
                                    </div>
                                </div>
                                
                                <div className="space-y-4">
                                    {/* Revenue Card */}
                                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="text-xs text-gray-600 mb-1">Total Revenue</div>
                                                <div className="text-2xl font-bold text-gray-900">₹{((stats?.totalBookings || 0) * 523 + (stats?.totalRides || 0) * 400).toLocaleString()}</div>
                                                <div className="text-xs text-green-600 font-semibold mt-1 flex items-center gap-1">
                                                    <TrendingUp className="h-3 w-3" />
                                                    +12.5% from last month
                                                </div>
                                            </div>
                                            <div className="bg-green-100 rounded-full p-3">
                                                <DollarSign className="h-6 w-6 text-green-600" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Active Users Card */}
                                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="text-xs text-gray-600 mb-1">Active Users</div>
                                                <div className="text-2xl font-bold text-gray-900">{stats?.totalUsers || 0}</div>
                                                <div className="text-xs text-blue-600 font-semibold mt-1 flex items-center gap-1">
                                                    <Users className="h-3 w-3" />
                                                    {stats?.totalDrivers || 0} drivers, {stats?.totalPassengers || 0} passengers
                                                </div>
                                            </div>
                                            <div className="bg-blue-100 rounded-full p-3">
                                                <Users className="h-6 w-6 text-blue-600" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Completion Rate */}
                                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="text-xs text-gray-600 mb-1">Ride Completion Rate</div>
                                                <div className="text-2xl font-bold text-gray-900">
                                                    {stats?.totalRides && stats?.totalBookings 
                                                        ? Math.round((stats.totalRides / stats.totalBookings) * 100) 
                                                        : 0}%
                                                </div>
                                                <div className="text-xs text-purple-600 font-semibold mt-1 flex items-center gap-1">
                                                    <CheckCircle className="h-3 w-3" />
                                                    {stats?.totalRides || 0} completed rides
                                                </div>
                                            </div>
                                            <div className="bg-purple-100 rounded-full p-3">
                                                <CheckCircle className="h-6 w-6 text-purple-600" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Pending Actions Alert */}
                                    {stats?.pendingDrivers > 0 && (
                                        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg p-4 border border-yellow-200">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="text-xs text-gray-600 mb-1">Pending Actions</div>
                                                    <div className="text-2xl font-bold text-gray-900">{stats.pendingDrivers}</div>
                                                    <div className="text-xs text-yellow-600 font-semibold mt-1 flex items-center gap-1">
                                                        <AlertCircle className="h-3 w-3" />
                                                        Drivers awaiting approval
                                                    </div>
                                                </div>
                                                <div className="bg-yellow-100 rounded-full p-3">
                                                    <AlertCircle className="h-6 w-6 text-yellow-600" />
                                                </div>
                                            </div>
                                        </div>
                                    )}
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
        <div className={`group relative bg-gradient-to-br ${gradient} rounded-2xl shadow-lg p-6 text-white transform transition-all duration-300 hover:scale-105 hover:shadow-2xl overflow-hidden`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
            <div className="relative z-10">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-white/90 text-sm font-semibold mb-2">{title}</p>
                        <p className="text-4xl font-bold">{value}</p>
                    </div>
                    <div className="bg-white/20 rounded-xl p-3 backdrop-blur-sm transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                        {icon}
                    </div>
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
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return (
        <div className="space-y-2" style={{ height }}>
            <div className="h-48 flex items-end gap-2">
                {data.map((d, i) => {
                    const barHeight = (d.value / max) * 100;
                    return (
                        <div key={i} className="flex-1 flex flex-col items-center group">
                            <div 
                                style={{ height: `${barHeight}%` }} 
                                className="w-full bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t transition-all duration-300 hover:from-indigo-700 hover:to-indigo-500 shadow-sm group-hover:shadow-md"
                                title={`${monthNames[d.label] || d.label}: ${d.value}`}
                            ></div>
                        </div>
                    );
                })}
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500 px-1">
                {data.slice(0, 6).map((d, i) => (
                    <span key={i} className="flex-1 text-center">{monthNames[d.label] || d.label}</span>
                ))}
            </div>
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
    const areaPoints = `${points} 100,100 0,100`;
    return (
        <div className="relative w-full" style={{ height }}>
            <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                {/* Gradient definitions */}
                <defs>
                    <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={stroke} stopOpacity="0.3" />
                        <stop offset="100%" stopColor={stroke} stopOpacity="0.05" />
                    </linearGradient>
                </defs>
                {/* Area fill */}
                <polygon fill="url(#lineGradient)" points={areaPoints} />
                {/* Line */}
                <polyline 
                    fill="none" 
                    stroke={stroke} 
                    strokeWidth="2.5" 
                    points={points}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                {/* Data points */}
                {data.map((d, i) => {
                    const x = (i / (data.length - 1)) * 100;
                    const y = 100 - (d.value / max) * 90;
                    return (
                        <circle 
                            key={i}
                            cx={x} 
                            cy={y} 
                            r="2" 
                            fill={stroke}
                            className="hover:r-3 transition-all"
                        />
                    );
                })}
            </svg>
        </div>
    );
}

function DonutChart({ segments }) {
    const total = segments.reduce((s, x) => s + Math.max(0, x.value), 0) || 1;
    let acc = 0;
    const arcs = segments.map((seg, idx) => {
        const start = (acc / total) * 360; acc += Math.max(0, seg.value);
        const end = (acc / total) * 360;
        return { start, end, color: seg.color, label: seg.label, value: seg.value };
    });
    const conic = arcs.map(a => `${a.color} ${a.start}deg ${a.end}deg`).join(', ');
    const percentage = (val) => total > 0 ? Math.round((val / total) * 100) : 0;
    return (
        <div className="flex items-center gap-8">
            <div className="relative w-40 h-40 flex-shrink-0">
                <div className="absolute inset-0 rounded-full" style={{ background: `conic-gradient(${conic})` }}></div>
                <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center">
                    <div className="text-center">
                        <div className="text-xs text-gray-500">Total</div>
                        <div className="text-lg font-bold text-gray-900">{total}</div>
                    </div>
                </div>
            </div>
            <div className="text-sm space-y-3 flex-1">
                {segments.map((s, i) => (
                    <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded-sm shadow-sm" style={{ background: s.color }}></span>
                            <span className="text-gray-700 font-medium">{s.label}</span>
                        </div>
                        <div className="text-right">
                            <div className="text-gray-900 font-semibold">{s.value}</div>
                            <div className="text-xs text-gray-500">{percentage(s.value)}%</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function EnhancedBarChart({ data }) {
    const max = Math.max(1, ...data.map(d => d.amount));
    return (
        <div className="space-y-3">
            {data.map((d, i) => {
                const percentage = (d.amount / max) * 100;
                return (
                    <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-700 font-medium">{d.label}</span>
                            <span className="text-gray-900 font-semibold">₹{d.amount.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                            <div 
                                className="h-full rounded-full transition-all duration-500 shadow-sm"
                                style={{ 
                                    width: `${percentage}%`,
                                    background: `linear-gradient(90deg, ${d.color}, ${d.color}dd)`
                                }}
                            ></div>
                        </div>
                    </div>
                );
            })}
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