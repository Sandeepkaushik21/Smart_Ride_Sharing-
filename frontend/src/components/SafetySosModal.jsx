import { useState, useEffect } from 'react';
import { ShieldAlert, Phone, MessageSquare, AlertTriangle, X, Check, Save, User, Car, MapPin, ExternalLink, ShieldCheck } from 'lucide-react';
import { bookingService } from '../services/bookingService';
import { userService } from '../services/userService';
import { showSuccess, showError, showConfirm } from '../utils/swal';

const SafetySosModal = ({ isOpen, onClose, booking, userProfile, onProfileUpdated }) => {
    const [emergencyContact, setEmergencyContact] = useState({
        name: '',
        phone: ''
    });
    const [isSavingContact, setIsSavingContact] = useState(false);
    const [isSendingSos, setIsSendingSos] = useState(false);
    const [sosTriggered, setSosTriggered] = useState(false);

    useEffect(() => {
        if (userProfile) {
            setEmergencyContact({
                name: userProfile.emergencyContactName || localStorage.getItem('rsa_emergency_contact_name') || '',
                phone: userProfile.emergencyContactPhone || localStorage.getItem('rsa_emergency_contact_phone') || ''
            });
        }
        if (booking?.sosTriggered) {
            setSosTriggered(true);
        } else {
            setSosTriggered(false);
        }
    }, [userProfile, booking]);

    if (!isOpen || !booking) return null;

    const driverName = booking.ride?.driver?.name || booking.driver?.name || 'Driver';
    const driverPhone = booking.ride?.driver?.phone || booking.driver?.phone || '';
    const vehicleInfo = [
        booking.ride?.vehicleType || '',
        booking.ride?.vehicleModel || '',
        booking.ride?.vehicleColor || ''
    ].filter(Boolean).join(' ') || 'Standard Vehicle';
    const licensePlate = booking.ride?.driver?.licensePlate || booking.ride?.licensePlate || '';
    const pickup = booking.pickupLocation || booking.ride?.citySource || booking.ride?.source || 'Pickup Point';
    const dropoff = booking.dropoffLocation || booking.ride?.cityDestination || booking.ride?.destination || 'Drop-off Point';
    const rideDate = booking.ride?.date ? new Date(booking.ride.date).toLocaleDateString() : 'Today';
    const rideTime = booking.ride?.time ? new Date(`1970-01-01T${booking.ride.time}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Scheduled Time';

    // Generate formatted WhatsApp message text
    const generateTripShareText = () => {
        return `🚗 *Smart Ride Sharing - Live Trip Details*
━━━━━━━━━━━━━━━━━━━━
👤 *Passenger:* ${userProfile?.name || 'Passenger'}
🚘 *Driver:* ${driverName} ${driverPhone ? `(${driverPhone})` : ''}
🚙 *Vehicle:* ${vehicleInfo} ${licensePlate ? `[${licensePlate}]` : ''}
📍 *Pickup:* ${pickup}
🎯 *Destination:* ${dropoff}
📅 *Date & Time:* ${rideDate} at ${rideTime}
🔖 *Booking Reference:* #${booking.id}
🟢 *Ride Status:* ${booking.status === 'IN_PROGRESS' ? 'IN PROGRESS (Passenger Boarded)' : 'CONFIRMED'}
━━━━━━━━━━━━━━━━━━━━
_Shared for safety & live tracking via Smart Ride Sharing._`;
    };

    // Open WhatsApp Web or App
    const handleShareWhatsApp = (targetPhone = '') => {
        const text = encodeURIComponent(generateTripShareText());
        let url = `https://wa.me/?text=${text}`;
        if (targetPhone) {
            const cleanPhone = targetPhone.replace(/\D/g, '');
            url = `https://wa.me/${cleanPhone}?text=${text}`;
        }
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    // Save emergency contact to profile & local storage
    const handleSaveContact = async (e) => {
        e.preventDefault();
        if (!emergencyContact.name.trim() || !emergencyContact.phone.trim()) {
            await showError('Please enter both contact name and a valid phone number');
            return;
        }

        setIsSavingContact(true);
        try {
            localStorage.setItem('rsa_emergency_contact_name', emergencyContact.name.trim());
            localStorage.setItem('rsa_emergency_contact_phone', emergencyContact.phone.trim());

            await userService.updateProfile({
                emergencyContactName: emergencyContact.name.trim(),
                emergencyContactPhone: emergencyContact.phone.trim()
            });

            if (onProfileUpdated) {
                onProfileUpdated();
            }
            await showSuccess('Emergency contact saved successfully!');
        } catch (error) {
            console.error('Error saving emergency contact:', error);
            // Even if server fails, local is saved
            await showSuccess('Emergency contact saved locally on this device!');
        } finally {
            setIsSavingContact(false);
        }
    };

    // Dispatch Emergency SOS Alert to Backend
    const handleTriggerSos = async () => {
        const confirm = await showConfirm(
            '⚠️ Are you sure you want to trigger an Emergency SOS Alert? This will instantly dispatch your live trip details to emergency contacts and safety authorities.',
            '🚨 YES, TRIGGER SOS',
            'Cancel'
        );

        if (!confirm.isConfirmed) return;

        setIsSendingSos(true);
        try {
            await bookingService.triggerSosAlert(booking.id, 'Emergency SOS Triggered from Passenger Safety Center');
            setSosTriggered(true);
            await showSuccess('🚨 Emergency SOS Alert has been logged and dispatched! Trip snapshot details were sent.');
        } catch (error) {
            console.error('Error triggering SOS alert:', error);
            const msg = error.response?.data?.message || error.message || 'Error triggering SOS alert.';
            await showError(msg);
        } finally {
            setIsSendingSos(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="relative bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border-2 border-red-100 animate-in fade-in zoom-in-95 duration-200">
                {/* Header with gradient */}
                <div className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 p-6 text-white relative">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner">
                                <ShieldAlert className="h-7 w-7 text-white animate-pulse" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black tracking-tight">Safety & SOS Center</h2>
                                <p className="text-red-100 text-xs font-medium">Instant Emergency Help & Trip Sharing</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    {sosTriggered && (
                        <div className="mt-4 p-3 bg-red-800/80 backdrop-blur-md rounded-xl border border-red-300 flex items-center space-x-2 text-sm font-bold">
                            <AlertTriangle className="h-5 w-5 text-yellow-300 flex-shrink-0 animate-bounce" />
                            <span>Emergency SOS Alert is ACTIVE for this booking!</span>
                        </div>
                    )}
                </div>

                <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                    {/* Trip Snapshot Card */}
                    <div className="bg-gradient-to-br from-gray-50 to-red-50/30 rounded-2xl p-4 border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                <Car className="h-3.5 w-3.5 text-gray-600" />
                                Current Trip Snapshot
                            </span>
                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                                #{booking.id} • {booking.status}
                            </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div className="space-y-1">
                                <p className="text-gray-600 flex items-center gap-1.5">
                                    <MapPin className="h-4 w-4 text-green-600 flex-shrink-0" />
                                    <span><strong>From:</strong> {pickup}</span>
                                </p>
                                <p className="text-gray-600 flex items-center gap-1.5">
                                    <MapPin className="h-4 w-4 text-red-600 flex-shrink-0" />
                                    <span><strong>To:</strong> {dropoff}</span>
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-gray-600 flex items-center gap-1.5">
                                    <User className="h-4 w-4 text-purple-600 flex-shrink-0" />
                                    <span><strong>Driver:</strong> {driverName}</span>
                                    {driverPhone && (
                                        <a
                                            href={`tel:${driverPhone}`}
                                            className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-md text-xs font-bold hover:bg-green-200"
                                        >
                                            <Phone className="h-3 w-3" /> Call
                                        </a>
                                    )}
                                </p>
                                <p className="text-gray-600 flex items-center gap-1.5">
                                    <Car className="h-4 w-4 text-indigo-600 flex-shrink-0" />
                                    <span><strong>Vehicle:</strong> {vehicleInfo} {licensePlate && `(${licensePlate})`}</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 1-Click WhatsApp Live Sharing */}
                    <div className="bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden group">
                        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="space-y-1 text-center md:text-left">
                                <div className="flex items-center justify-center md:justify-start space-x-2">
                                    <MessageSquare className="h-6 w-6 text-white" />
                                    <h3 className="text-lg font-bold">1-Click WhatsApp Trip Sharing</h3>
                                </div>
                                <p className="text-emerald-100 text-xs">
                                    Share complete driver, vehicle, and live route details with your family or friends.
                                </p>
                            </div>
                            <button
                                onClick={() => handleShareWhatsApp()}
                                className="w-full md:w-auto px-5 py-3 bg-white text-emerald-700 font-extrabold rounded-xl shadow-md hover:bg-emerald-50 hover:scale-105 active:scale-95 transition-all flex items-center justify-center space-x-2 text-sm whitespace-nowrap"
                            >
                                <ExternalLink className="h-4 w-4" />
                                <span>Share on WhatsApp</span>
                            </button>
                        </div>
                    </div>

                    {/* Instant Emergency SOS Dispatch Button */}
                    <div className="bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-300 rounded-2xl p-5 text-center space-y-3">
                        <div className="flex items-center justify-center space-x-2 text-red-700 font-black text-lg">
                            <AlertTriangle className="h-6 w-6 animate-bounce" />
                            <span>In Danger or Feeling Unsafe?</span>
                        </div>
                        <p className="text-xs text-gray-600 max-w-md mx-auto">
                            Triggering SOS records an immediate emergency flag on the system and dispatches your live location snapshot.
                        </p>
                        <button
                            onClick={handleTriggerSos}
                            disabled={isSendingSos}
                            className="w-full py-3.5 px-6 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-700 hover:to-rose-700 text-white font-black text-base rounded-xl shadow-xl shadow-red-500/30 transform hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                        >
                            <ShieldAlert className="h-5 w-5 animate-pulse" />
                            <span>{isSendingSos ? 'DISPATCHING SOS...' : '🚨 DISPATCH EMERGENCY SOS ALERT'}</span>
                        </button>
                    </div>

                    {/* National Emergency Helplines */}
                    <div>
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                            Emergency Helplines (Instant One-Tap Call)
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <a
                                href="tel:112"
                                className="p-3 bg-gradient-to-br from-red-50 to-white border border-red-200 rounded-xl hover:shadow-md transition-all flex items-center justify-between group"
                            >
                                <div>
                                    <div className="text-sm font-black text-red-700">112</div>
                                    <div className="text-[11px] text-gray-500">National Emergency</div>
                                </div>
                                <div className="p-2 bg-red-100 group-hover:bg-red-600 group-hover:text-white rounded-lg text-red-600 transition-colors">
                                    <Phone className="h-4 w-4" />
                                </div>
                            </a>

                            <a
                                href="tel:1091"
                                className="p-3 bg-gradient-to-br from-purple-50 to-white border border-purple-200 rounded-xl hover:shadow-md transition-all flex items-center justify-between group"
                            >
                                <div>
                                    <div className="text-sm font-black text-purple-700">1091</div>
                                    <div className="text-[11px] text-gray-500">Women Safety Helpline</div>
                                </div>
                                <div className="p-2 bg-purple-100 group-hover:bg-purple-600 group-hover:text-white rounded-lg text-purple-600 transition-colors">
                                    <Phone className="h-4 w-4" />
                                </div>
                            </a>

                            <a
                                href="tel:108"
                                className="p-3 bg-gradient-to-br from-amber-50 to-white border border-amber-200 rounded-xl hover:shadow-md transition-all flex items-center justify-between group"
                            >
                                <div>
                                    <div className="text-sm font-black text-amber-700">108</div>
                                    <div className="text-[11px] text-gray-500">Ambulance Service</div>
                                </div>
                                <div className="p-2 bg-amber-100 group-hover:bg-amber-600 group-hover:text-white rounded-lg text-amber-600 transition-colors">
                                    <Phone className="h-4 w-4" />
                                </div>
                            </a>
                        </div>
                    </div>

                    {/* Trusted Emergency Contact Manager */}
                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                                <ShieldCheck className="h-4 w-4 text-blue-600" />
                                Trusted Emergency Contact
                            </h4>
                            {emergencyContact.phone && (
                                <div className="flex items-center gap-2">
                                    <a
                                        href={`tel:${emergencyContact.phone}`}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-200"
                                    >
                                        <Phone className="h-3 w-3" /> Call Contact
                                    </a>
                                    <button
                                        type="button"
                                        onClick={() => handleShareWhatsApp(emergencyContact.phone)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold hover:bg-green-200"
                                    >
                                        <MessageSquare className="h-3 w-3" /> WhatsApp
                                    </button>
                                </div>
                            )}
                        </div>

                        <form onSubmit={handleSaveContact} className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                            <input
                                type="text"
                                placeholder="Contact Name (e.g. Dad, Sister)"
                                value={emergencyContact.name}
                                onChange={(e) => setEmergencyContact({ ...emergencyContact, name: e.target.value })}
                                className="sm:col-span-2 px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            <input
                                type="tel"
                                placeholder="Phone (e.g. +91 9876543210)"
                                value={emergencyContact.phone}
                                onChange={(e) => setEmergencyContact({ ...emergencyContact, phone: e.target.value })}
                                className="sm:col-span-2 px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            <button
                                type="submit"
                                disabled={isSavingContact}
                                className="sm:col-span-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1 disabled:opacity-50"
                            >
                                <Save className="h-3.5 w-3.5" />
                                <span>{isSavingContact ? 'Saving...' : 'Save'}</span>
                            </button>
                        </form>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-100 px-6 py-4 flex items-center justify-between border-t">
                    <p className="text-[11px] text-gray-500 flex items-center gap-1">
                        <Check className="h-3.5 w-3.5 text-green-600" />
                        24/7 Smart Ride Safety Protocol Active
                    </p>
                    <button
                        onClick={onClose}
                        className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl text-xs font-bold transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SafetySosModal;
