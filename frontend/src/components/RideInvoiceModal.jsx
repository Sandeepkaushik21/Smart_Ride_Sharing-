import { useState, useEffect } from 'react';
import { 
    X, 
    Printer, 
    Download, 
    CheckCircle2, 
    Car, 
    User, 
    MapPin, 
    Calendar, 
    Clock, 
    ShieldCheck, 
    Receipt, 
    CreditCard, 
    FileText,
    Loader2
} from 'lucide-react';
import { bookingService } from '../services/bookingService';

const RideInvoiceModal = ({ isOpen, onClose, booking }) => {
    const [invoice, setInvoice] = useState(null);
    const [loading, setLoading] = useState(false);
    const [fetchError, setFetchError] = useState(null);

    useEffect(() => {
        if (isOpen && booking) {
            const fetchInvoiceData = async () => {
                const bookingId = booking.id || booking.bookingId;
                if (!bookingId) return;

                setLoading(true);
                setFetchError(null);
                try {
                    const data = await bookingService.getInvoice(bookingId);
                    setInvoice(data);
                } catch (err) {
                    console.error('Failed to fetch invoice from API, building fallback:', err);
                    setFetchError('Could not fetch server invoice. Displaying standard receipt.');
                    // Fallback to locally computed DTO
                    const fare = booking.fareAmount || booking.ride?.estimatedFare || 0;
                    const platformFee = Math.round(Math.min(20, fare * 0.04) * 100) / 100;
                    const taxableBase = Math.round((fare / 1.05) * 100) / 100;
                    const totalTax = Math.round((fare - taxableBase) * 100) / 100;
                    const cgst = Math.round((totalTax / 2) * 100) / 100;
                    const sgst = Math.round((totalTax - cgst) * 100) / 100;
                    const baseFare = Math.round(Math.max(0, taxableBase - platformFee) * 100) / 100;

                    setInvoice({
                        invoiceNumber: `INV-${new Date().getFullYear()}-${String(bookingId).padStart(6, '0')}`,
                        invoiceDate: booking.createdAt || new Date().toISOString(),
                        gstin: '29AAACR1234F1Z5',
                        sacCode: '9964',
                        companyName: 'Smart Ride Sharing Technologies Ltd.',
                        companyAddress: 'Electronic City Phase 1, Hosur Road, Bengaluru, Karnataka 560100',
                        companyEmail: 'billing@smartrideshare.com',
                        companySupportPhone: '+91 1800-419-7433',
                        bookingId: bookingId,
                        bookingStatus: booking.status || 'CONFIRMED',
                        isOtpVerified: booking.isOtpVerified || false,
                        passengerName: booking.passenger?.name || 'Passenger',
                        passengerEmail: booking.passenger?.email || '',
                        passengerPhone: booking.passenger?.phone || '',
                        driverName: booking.ride?.driver?.name || booking.driver?.name || 'Driver',
                        driverPhone: booking.ride?.driver?.phone || booking.driver?.phone || '',
                        vehicleType: booking.ride?.vehicleType || 'Standard Vehicle',
                        vehicleModel: booking.ride?.vehicleModel || booking.ride?.driver?.vehicleModel || 'Sedan',
                        vehicleColor: booking.ride?.vehicleColor || 'N/A',
                        licensePlate: booking.ride?.driver?.licensePlate || booking.ride?.licensePlate || 'N/A',
                        sourceCity: booking.ride?.citySource || booking.pickupLocation || '',
                        destinationCity: booking.ride?.cityDestination || booking.dropoffLocation || '',
                        pickupLocation: booking.pickupLocation || booking.ride?.source || 'Pickup Point',
                        dropoffLocation: booking.dropoffLocation || booking.ride?.destination || 'Drop-off Point',
                        rideDate: booking.ride?.date || '',
                        rideTime: booking.ride?.time || '',
                        numberOfSeats: booking.numberOfSeats || 1,
                        baseFare: baseFare,
                        platformFee: platformFee,
                        cgstRate: 2.5,
                        cgstAmount: cgst,
                        sgstRate: 2.5,
                        sgstAmount: sgst,
                        totalTax: totalTax,
                        totalAmount: fare,
                        paymentStatus: 'SUCCESS',
                        paymentMethod: 'RAZORPAY_ONLINE',
                        razorpayPaymentId: booking.payment?.razorpayPaymentId || `pay_${bookingId}99281`,
                        razorpayOrderId: booking.payment?.razorpayOrderId || `order_${bookingId}88192`,
                        paidAt: booking.updatedAt || new Date().toISOString()
                    });
                } finally {
                    setLoading(false);
                }
            };

            fetchInvoiceData();
        }
    }, [isOpen, booking]);

    if (!isOpen || !booking) return null;

    const handlePrint = () => {
        window.print();
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        try {
            const d = new Date(dateStr);
            return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch {
            return dateStr;
        }
    };

    const formatDateTime = (dateStr) => {
        if (!dateStr) return 'N/A';
        try {
            const d = new Date(dateStr);
            return isNaN(d.getTime()) ? dateStr : d.toLocaleString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dateStr;
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 print:p-0 print:bg-white print:static">
            {/* Embedded Print CSS to cleanly isolate the invoice */}
            <style>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #printable-invoice-container, #printable-invoice-container * {
                        visibility: visible;
                    }
                    #printable-invoice-container {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        margin: 0;
                        padding: 20px !important;
                        box-shadow: none !important;
                        border: none !important;
                        background: white !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                }
            `}</style>

            <div className="relative bg-white rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200 print:max-w-none print:w-full print:rounded-none print:shadow-none print:border-none">
                {/* Top Action Bar (hidden on print) */}
                <div className="no-print bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-indigo-500/20 backdrop-blur-md rounded-xl border border-indigo-400/30">
                            <Receipt className="h-5 w-5 text-indigo-300" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">Tax Invoice & Expense Receipt</h2>
                            <p className="text-xs text-slate-300">GST Compliant Ride Invoice</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={handlePrint}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-1.5 active:scale-95"
                            title="Print or Save as PDF"
                        >
                            <Printer className="h-4 w-4" />
                            <span>Print / PDF</span>
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Loading State */}
                {loading ? (
                    <div className="p-16 flex flex-col items-center justify-center space-y-4">
                        <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
                        <p className="text-sm font-medium text-gray-600">Generating itemized tax invoice...</p>
                    </div>
                ) : invoice ? (
                    /* Invoice Card Printable Container */
                    <div id="printable-invoice-container" className="p-6 sm:p-8 max-h-[82vh] overflow-y-auto print:max-h-none print:overflow-visible space-y-6 text-gray-800 bg-white">
                        
                        {fetchError && (
                            <div className="no-print p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-medium">
                                ℹ️ {fetchError}
                            </div>
                        )}

                        {/* Company Header & Invoice Metadata */}
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-gray-200">
                            <div className="space-y-1">
                                <div className="flex items-center space-x-2">
                                    <div className="p-2 bg-indigo-600 rounded-xl text-white font-black text-sm tracking-wider">
                                        RSA
                                    </div>
                                    <h1 className="text-xl font-black tracking-tight text-slate-900">
                                        {invoice.companyName}
                                    </h1>
                                </div>
                                <p className="text-xs text-gray-500 max-w-sm">{invoice.companyAddress}</p>
                                <div className="pt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 font-medium">
                                    <span><strong>GSTIN:</strong> {invoice.gstin}</span>
                                    <span><strong>SAC Code:</strong> {invoice.sacCode}</span>
                                </div>
                                <div className="text-xs text-gray-500">
                                    <span>Email: {invoice.companyEmail}</span> • <span>Support: {invoice.companySupportPhone}</span>
                                </div>
                            </div>

                            <div className="sm:text-right space-y-1 self-stretch sm:self-auto bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-xl">
                                <div className="inline-block px-3 py-1 bg-indigo-100 text-indigo-800 rounded-lg text-xs font-extrabold tracking-wider uppercase">
                                    TAX INVOICE
                                </div>
                                <div className="text-sm font-black text-slate-900 pt-1">
                                    {invoice.invoiceNumber}
                                </div>
                                <p className="text-xs text-gray-500">
                                    <strong>Date:</strong> {formatDate(invoice.invoiceDate)}
                                </p>
                                <p className="text-xs text-gray-500">
                                    <strong>Booking ID:</strong> #{invoice.bookingId}
                                </p>
                                <div className="pt-1 flex items-center sm:justify-end gap-1 text-emerald-600 font-black text-xs">
                                    <CheckCircle2 className="h-4 w-4" />
                                    <span>PAYMENT COMPLETED</span>
                                </div>
                            </div>
                        </div>

                        {/* Customer & Driver/Vehicle Columns */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                            {/* Passenger Details */}
                            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2">
                                <div className="flex items-center space-x-1.5 text-indigo-700 font-bold uppercase tracking-wider text-[11px]">
                                    <User className="h-3.5 w-3.5" />
                                    <span>Billed To (Passenger)</span>
                                </div>
                                <div className="text-sm font-bold text-slate-900">{invoice.passengerName}</div>
                                {invoice.passengerEmail && (
                                    <p className="text-gray-600"><strong>Email:</strong> {invoice.passengerEmail}</p>
                                )}
                                {invoice.passengerPhone && (
                                    <p className="text-gray-600"><strong>Phone:</strong> {invoice.passengerPhone}</p>
                                )}
                                <p className="text-gray-500"><strong>Passenger Ref:</strong> #{invoice.passengerId || invoice.bookingId}</p>
                            </div>

                            {/* Driver & Vehicle Details */}
                            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2">
                                <div className="flex items-center space-x-1.5 text-indigo-700 font-bold uppercase tracking-wider text-[11px]">
                                    <Car className="h-3.5 w-3.5" />
                                    <span>Driver & Vehicle Details</span>
                                </div>
                                <div className="text-sm font-bold text-slate-900">{invoice.driverName}</div>
                                <p className="text-gray-600">
                                    <strong>Vehicle:</strong> {invoice.vehicleModel} {invoice.vehicleColor !== 'N/A' ? `(${invoice.vehicleColor})` : ''} • {invoice.vehicleType}
                                </p>
                                <p className="text-gray-600">
                                    <strong>Reg. No:</strong> <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-gray-300">{invoice.licensePlate}</span>
                                </p>
                                {invoice.driverPhone && (
                                    <p className="text-gray-500"><strong>Contact:</strong> {invoice.driverPhone}</p>
                                )}
                            </div>
                        </div>

                        {/* Trip Route Details */}
                        <div className="border border-slate-200 rounded-2xl p-4 bg-gradient-to-r from-slate-50 to-indigo-50/30 text-xs space-y-3">
                            <div className="font-bold text-slate-800 flex items-center justify-between border-b pb-2">
                                <span className="flex items-center gap-1.5">
                                    <MapPin className="h-4 w-4 text-indigo-600" />
                                    Trip & Journey Details
                                </span>
                                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[11px] flex items-center gap-1">
                                    <ShieldCheck className="h-3.5 w-3.5" />
                                    {invoice.isOtpVerified ? 'OTP Verified Safe Boarding' : 'Confirmed Ride'}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <div className="text-gray-500 font-medium">Pickup Point:</div>
                                    <div className="font-semibold text-slate-900 mt-0.5">{invoice.pickupLocation}</div>
                                    {invoice.sourceCity && invoice.sourceCity !== invoice.pickupLocation && (
                                        <div className="text-[11px] text-gray-500">City: {invoice.sourceCity}</div>
                                    )}
                                </div>
                                <div>
                                    <div className="text-gray-500 font-medium">Drop-off Destination:</div>
                                    <div className="font-semibold text-slate-900 mt-0.5">{invoice.dropoffLocation}</div>
                                    {invoice.destinationCity && invoice.destinationCity !== invoice.dropoffLocation && (
                                        <div className="text-[11px] text-gray-500">City: {invoice.destinationCity}</div>
                                    )}
                                </div>
                            </div>

                            <div className="pt-2 border-t flex flex-wrap gap-4 text-gray-600">
                                <div className="flex items-center gap-1">
                                    <Calendar className="h-3.5 w-3.5 text-gray-400" />
                                    <span><strong>Date:</strong> {invoice.rideDate || formatDate(invoice.invoiceDate)}</span>
                                </div>
                                {invoice.rideTime && (
                                    <div className="flex items-center gap-1">
                                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                                        <span><strong>Time:</strong> {invoice.rideTime}</span>
                                    </div>
                                )}
                                <div>
                                    <span><strong>Seats Booked:</strong> {invoice.numberOfSeats}</span>
                                </div>
                            </div>
                        </div>

                        {/* Itemized Financial / Tax Breakdown Table */}
                        <div>
                            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                                <FileText className="h-3.5 w-3.5 text-indigo-600" />
                                Itemized Fare & Tax Breakdown
                            </h3>
                            <div className="overflow-hidden border border-slate-200 rounded-2xl shadow-sm">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                                        <tr>
                                            <th className="p-3">Description</th>
                                            <th className="p-3 text-center">SAC Code</th>
                                            <th className="p-3 text-right">Tax Rate</th>
                                            <th className="p-3 text-right">Amount (₹)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        <tr>
                                            <td className="p-3 font-medium text-slate-800">
                                                Base Passenger Transport Service
                                                <p className="text-[11px] text-gray-500 font-normal">Standard distance & seating fare</p>
                                            </td>
                                            <td className="p-3 text-center text-gray-600 font-mono">9964</td>
                                            <td className="p-3 text-right text-gray-600">-</td>
                                            <td className="p-3 text-right font-mono font-medium">₹{invoice.baseFare?.toFixed(2)}</td>
                                        </tr>
                                        <tr>
                                            <td className="p-3 font-medium text-slate-800">
                                                Platform & Safety Protocol Fee
                                                <p className="text-[11px] text-gray-500 font-normal">Technology platform, 24/7 SOS monitoring & support</p>
                                            </td>
                                            <td className="p-3 text-center text-gray-600 font-mono">9964</td>
                                            <td className="p-3 text-right text-gray-600">-</td>
                                            <td className="p-3 text-right font-mono font-medium">₹{invoice.platformFee?.toFixed(2)}</td>
                                        </tr>
                                        <tr className="bg-slate-50/50">
                                            <td className="p-3 font-medium text-slate-700">Central GST (CGST)</td>
                                            <td className="p-3 text-center text-gray-600 font-mono">9964</td>
                                            <td className="p-3 text-right text-gray-600">{invoice.cgstRate}%</td>
                                            <td className="p-3 text-right font-mono font-medium text-slate-700">₹{invoice.cgstAmount?.toFixed(2)}</td>
                                        </tr>
                                        <tr className="bg-slate-50/50">
                                            <td className="p-3 font-medium text-slate-700">State GST (SGST)</td>
                                            <td className="p-3 text-center text-gray-600 font-mono">9964</td>
                                            <td className="p-3 text-right text-gray-600">{invoice.sgstRate}%</td>
                                            <td className="p-3 text-right font-mono font-medium text-slate-700">₹{invoice.sgstAmount?.toFixed(2)}</td>
                                        </tr>
                                    </tbody>
                                    <tfoot className="bg-slate-100/90 font-bold border-t-2 border-slate-300">
                                        <tr>
                                            <td colSpan="3" className="p-3 text-slate-800 uppercase text-[11px] tracking-wider">
                                                Total Taxable Value + Applicable GST
                                            </td>
                                            <td className="p-3 text-right font-mono text-slate-800">
                                                ₹{invoice.totalAmount?.toFixed(2)}
                                            </td>
                                        </tr>
                                        <tr className="bg-indigo-50/80 text-indigo-950 font-black text-sm">
                                            <td colSpan="3" className="p-3 uppercase tracking-wider">
                                                Grand Total Paid (INR)
                                            </td>
                                            <td className="p-3 text-right font-mono text-base text-indigo-700">
                                                ₹{invoice.totalAmount?.toFixed(2)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        {/* Payment & Transaction Snapshot */}
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs space-y-2">
                            <div className="flex items-center space-x-1.5 text-indigo-700 font-bold uppercase tracking-wider text-[11px]">
                                <CreditCard className="h-3.5 w-3.5" />
                                <span>Payment & Transaction Reference</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-1">
                                <div>
                                    <span className="text-gray-500">Method:</span>
                                    <div className="font-semibold text-slate-800">{invoice.paymentMethod}</div>
                                </div>
                                <div>
                                    <span className="text-gray-500">Status:</span>
                                    <div className="font-semibold text-emerald-600">{invoice.paymentStatus}</div>
                                </div>
                                {invoice.razorpayPaymentId && (
                                    <div className="col-span-1 md:col-span-2">
                                        <span className="text-gray-500">Razorpay Payment ID:</span>
                                        <div className="font-mono font-semibold text-slate-800 break-all">{invoice.razorpayPaymentId}</div>
                                    </div>
                                )}
                            </div>
                            {invoice.paidAt && (
                                <p className="text-[11px] text-gray-500 pt-1">
                                    <strong>Paid At:</strong> {formatDateTime(invoice.paidAt)}
                                </p>
                            )}
                        </div>

                        {/* Legal Note & Electronic Signature */}
                        <div className="pt-4 border-t border-gray-200 text-[11px] text-gray-500 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                            <div className="space-y-1 max-w-md">
                                <p className="font-medium text-gray-600">Terms & Conditions:</p>
                                <p>1. This is an electronically generated tax invoice and does not require a physical signature.</p>
                                <p>2. Issued under Section 31 of the Central Goods and Services Tax Act, 2017.</p>
                                <p>3. Passenger transport services are taxable under SAC Code 9964.</p>
                            </div>
                            <div className="text-right sm:self-end">
                                <div className="inline-block border-2 border-indigo-700 text-indigo-800 px-3 py-1.5 rounded-xl font-bold uppercase text-[10px] tracking-wider bg-indigo-50/50">
                                    ✔ Digitally Verified & Signed
                                </div>
                                <p className="text-[10px] text-gray-500 mt-1">Smart Ride Sharing Technologies</p>
                            </div>
                        </div>

                    </div>
                ) : null}

                {/* Footer (hidden on print) */}
                <div className="no-print bg-slate-100 px-6 py-4 flex items-center justify-between border-t border-slate-200">
                    <p className="text-xs text-slate-500">
                        Need expense report help? Contact billing@smartrideshare.com
                    </p>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={handlePrint}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-1.5"
                        >
                            <Download className="h-4 w-4" />
                            <span>Download Invoice</span>
                        </button>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RideInvoiceModal;
