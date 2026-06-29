import React, { useState, useEffect } from 'react';
import { X, Ticket, Minus, Plus, Tag, ShieldCheck, CreditCard, Sparkles, AlertCircle, Smartphone, Check, Loader2, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import QRCode from 'qrcode';
import { Event, Booking, Coupon } from '../types';
import { validateCoupon, createBooking } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { formatINR } from '../utils/currency';

interface CheckoutModalProps {
  event: Event;
  onClose: () => void;
  onSuccess: (booking: Booking) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ event, onClose, onSuccess }) => {
  const { currentUser } = useAuth();
  
  // States
  const [selectedCategory, setSelectedCategory] = useState(event.ticketCategories[0]?.name || "General Admission");
  const [quantity, setQuantity] = useState(1);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');
  const [isVerifyingCoupon, setIsVerifyingCoupon] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'details' | 'payment' | 'loading'>('details');
  const [billingName, setBillingName] = useState(currentUser?.name || '');
  const [billingEmail, setBillingEmail] = useState(currentUser?.email || '');
  const [paymentError, setPaymentError] = useState('');

  // Indian payment specific states
  const [paymentMode, setPaymentMode] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [upiOption, setUpiOption] = useState<'qr' | 'id'>('qr');
  const [vpaId, setVpaId] = useState('');
  const [isVpaVerifying, setIsVpaVerifying] = useState(false);
  const [isVpaVerified, setIsVpaVerified] = useState(false);
  const [vpaVerifiedName, setVpaVerifiedName] = useState('');
  const [upiQrCodeData, setUpiQrCodeData] = useState('');
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');
  const [cardNumber, setCardNumber] = useState('4532 9876 1234 5678');
  const [cardHolder, setCardHolder] = useState(currentUser?.name || '');
  const [cardExpiry, setCardExpiry] = useState('12/29');
  const [cardCvv, setCardCvv] = useState('123');
  const [upiTimer, setUpiTimer] = useState(180); // 3-minute UPI checkout timer

  // Find price of selected tier
  const tier = event.ticketCategories.find(c => c.name === selectedCategory);
  const unitPrice = tier ? tier.price : event.price;
  const remainingTickets = tier ? (tier.capacity - tier.sold) : 0;
  const isTierSoldOut = remainingTickets <= 0;

  // Invoice calculations
  const subtotal = unitPrice * quantity;
  const discountAmount = appliedCoupon ? (subtotal * appliedCoupon.discountPercent) / 100 : 0;
  const processingFee = event.price <= 0.05 ? 0 : 2.50; // Flat nominal fee (waived for small test payments like ₹1)
  const total = Math.max(0, subtotal - discountAmount + processingFee);

  // Generate UPI QR Code and manage timer
  useEffect(() => {
    if (checkoutStep === 'payment' && paymentMode === 'upi' && upiOption === 'qr') {
      const upiLink = `upi://pay?pa=umakashyap344@oksbi&pn=Uma%20Shankar&am=${(total * 80).toFixed(2)}&cu=INR&tn=Passes%20for%20${encodeURIComponent(event.title.substring(0, 20))}`;
      QRCode.toDataURL(upiLink, {
        margin: 1,
        width: 200,
        color: {
          dark: '#1e1b4b', // deep indigo/navy QR
          light: '#ffffff'
        }
      }).then(url => {
        setUpiQrCodeData(url);
      }).catch(err => {
        console.error("UPI QR Gen Error:", err);
      });
    }
  }, [checkoutStep, paymentMode, upiOption, total, event.title]);

  // Countdown timer for real-time payment session
  useEffect(() => {
    let interval: any = null;
    if (checkoutStep === 'payment') {
      interval = setInterval(() => {
        setUpiTimer(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 180; // Reset
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setUpiTimer(180);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [checkoutStep]);

  // Format countdown timer (MM:SS)
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Verify VPA (UPI ID)
  const handleVerifyVPA = () => {
    if (!vpaId.trim() || !vpaId.includes('@')) {
      setPaymentError("Please enter a valid VPA / UPI ID (e.g. name@bank)");
      return;
    }
    setPaymentError('');
    setIsVpaVerifying(true);
    setIsVpaVerified(false);

    setTimeout(() => {
      setIsVpaVerifying(false);
      setIsVpaVerified(true);
      // Generate a realistic Indian name based on VPA
      const prefix = vpaId.split('@')[0];
      const capitalized = prefix.charAt(0).toUpperCase() + prefix.slice(1);
      setVpaVerifiedName(capitalized + " " + (currentUser?.lastName || "Kumar"));
    }, 1200);
  };

  // Apply Coupon Code
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setIsVerifyingCoupon(true);
    setCouponError('');
    try {
      const coupon = await validateCoupon(couponCode);
      if (coupon) {
        setAppliedCoupon(coupon);
        setCouponCode('');
      } else {
        setCouponError('Invalid or expired coupon code.');
      }
    } catch (err) {
      setCouponError('Error verifying coupon.');
    } finally {
      setIsVerifyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
  };

  // Process Mock Stripe / Razorpay Checkout
  const handleCompletePayment = async () => {
    if (!billingName.trim() || !billingEmail.trim()) {
      setPaymentError("Billing details are required.");
      return;
    }

    setCheckoutStep('loading');

    // Simulate Payment network request delay
    setTimeout(async () => {
      try {
        const mockBookingId = "book_" + Math.random().toString(36).substring(2, 11);
        
        // Generate a REAL check-in QR Code utilizing the installed 'qrcode' package!
        // This QR encodes the exact booking ID which is verified by the Organizer scanner!
        const qrCodeDataUrl = await QRCode.toDataURL(mockBookingId, {
          margin: 1,
          width: 250,
          color: {
            dark: '#1e293b',
            light: '#f8fafc'
          }
        });

        const upiRef = paymentMode === 'upi' 
          ? "pay_upi_utr_" + Math.floor(100000000000 + Math.random() * 900000000000)
          : paymentMode === 'netbanking' 
            ? "pay_netbank_" + Math.random().toString(36).substring(2, 11).toUpperCase()
            : "pay_card_" + Math.random().toString(36).substring(2, 11).toUpperCase();

        const newBooking: Booking = {
          id: mockBookingId,
          eventId: event.id,
          eventTitle: event.title,
          eventDate: event.date,
          eventTime: event.time,
          eventLocation: event.location,
          eventBannerUrl: event.bannerUrl,
          attendeeId: currentUser?.id || "guest_user",
          attendeeName: billingName,
          attendeeEmail: billingEmail,
          ticketCategory: selectedCategory,
          quantity,
          totalPrice: total,
          status: 'booked',
          qrCodeValue: mockBookingId, // Scanner checks this against Firestore doc id
          checkedIn: false,
          paymentId: upiRef,
          bookedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
        };

        // Write directly to Firestore using our service!
        const savedBooking = await createBooking(newBooking);
        
        // Return generated booking containing the QR URL
        onSuccess({ ...savedBooking, qrCodeValue: qrCodeDataUrl });
      } catch (err) {
        console.error("Payment error:", err);
        setPaymentError("A transaction error occurred. Please check your network and try again.");
        setCheckoutStep('payment');
      }
    }, 2500);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <AnimatePresence mode="wait">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="glass rounded-3xl shadow-2xl border border-white/10 max-w-lg w-full overflow-hidden relative flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5 shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/20 rounded-xl text-primary">
                <Ticket className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-lg">Secure Ticket Checkout</h3>
                <p className="text-xs text-slate-400">Order tickets safely with SSL protection</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-1.5 hover:bg-white/10 rounded-full text-slate-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Loading Indicator */}
          {checkoutStep === 'loading' ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div className="relative w-16 h-16 mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-white/5"></div>
                <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin"></div>
              </div>
              <h4 className="font-extrabold text-white text-lg">Processing Transaction...</h4>
              <p className="text-sm text-slate-400 mt-2">Connecting to Stripe payment processor. Do not close or refresh this pane.</p>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mt-6 max-w-sm w-full text-left text-xs space-y-1.5">
                <div className="flex justify-between font-medium text-slate-300">
                  <span>Merchant:</span>
                  <span className="text-white">EventHub, Inc.</span>
                </div>
                <div className="flex justify-between font-medium text-slate-300">
                  <span>Amount:</span>
                  <span className="font-bold text-white">{formatINR(total)}</span>
                </div>
                <div className="flex justify-between font-medium text-slate-300">
                  <span>Passes:</span>
                  <span className="text-white">{quantity}x {selectedCategory}</span>
                </div>
              </div>
            </div>
          ) : (
            /* Main Content Scrollable Area */
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Event Mini Card Summary */}
              <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
                <img 
                  src={event.bannerUrl} 
                  alt={event.title} 
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 rounded-xl object-cover animate-fade-in" 
                />
                <div className="text-left">
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-bold px-2 py-0.5 rounded-full">{event.category}</span>
                  <h4 className="font-bold text-white text-sm line-clamp-1 mt-1">{event.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">{new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {event.location.split(',')[0]}</p>
                </div>
              </div>

              {checkoutStep === 'details' ? (
                /* STEP 1: CHOOSE TICKET TIER & QUANTITY */
                <div className="space-y-5 text-left">
                  {/* Category Selection */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                      Select Ticket Category
                    </label>
                    <div className="grid grid-cols-1 gap-2.5">
                      {event.ticketCategories.map(cat => {
                        const isSold = cat.sold >= cat.capacity;
                        const available = cat.capacity - cat.sold;
                        const isSelected = selectedCategory === cat.name;

                        return (
                          <button
                            key={cat.name}
                            type="button"
                            disabled={isSold}
                            onClick={() => setSelectedCategory(cat.name)}
                            className={`w-full flex items-center justify-between p-4 rounded-2xl border text-left transition-all ${
                              isSelected 
                                ? 'border-primary bg-indigo-500/10 shadow-md ring-1 ring-primary' 
                                : isSold 
                                  ? 'border-white/5 bg-white/5 opacity-40 cursor-not-allowed'
                                  : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                            }`}
                          >
                            <div>
                              <p className="font-bold text-white text-sm">{cat.name}</p>
                              <p className="text-xs text-slate-400 mt-0.5">
                                {isSold ? "Sold Out" : `${available} seats remaining`}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-extrabold text-white">{formatINR(cat.price)}</p>
                              {isSelected && <span className="text-[10px] text-primary font-bold">Selected</span>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Quantity selector */}
                  <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/10">
                    <div>
                      <p className="font-bold text-white text-sm">Quantity</p>
                      <p className="text-xs text-slate-400 mt-0.5">Limit of 10 passes per checkout</p>
                    </div>

                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => setQuantity(q => Math.max(1, q - 1))}
                        disabled={quantity <= 1}
                        className="w-10 h-10 bg-white/10 hover:bg-white/20 border border-white/10 rounded-full flex items-center justify-center text-white disabled:opacity-40 transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="font-extrabold text-lg text-white w-6 text-center">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity(q => Math.min(10, remainingTickets, q + 1))}
                        disabled={quantity >= 10 || quantity >= remainingTickets}
                        className="w-10 h-10 bg-white/10 hover:bg-white/20 border border-white/10 rounded-full flex items-center justify-center text-white disabled:opacity-40 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Coupon Codes */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Promo / Coupon Code
                    </label>
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 rounded-2xl text-emerald-300 text-xs font-medium">
                        <div className="flex items-center gap-1.5">
                          <Tag className="w-4 h-4 text-emerald-400 fill-current" />
                          <span>Promo <strong>{appliedCoupon.code}</strong> Applied: <strong>{appliedCoupon.discountPercent}% Off</strong></span>
                        </div>
                        <button 
                          onClick={handleRemoveCoupon}
                          className="font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="e.g. WELCOME10, SUMMER25"
                          value={couponCode}
                          onChange={(e) => { setCouponCode(e.target.value); setCouponError(''); }}
                          className="flex-1 bg-white/5 border border-white/10 text-white placeholder-slate-400 rounded-2xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        <button
                          type="button"
                          onClick={handleApplyCoupon}
                          disabled={isVerifyingCoupon || !couponCode.trim()}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 rounded-2xl transition-colors disabled:opacity-50"
                        >
                          {isVerifyingCoupon ? "Checking..." : "Apply"}
                        </button>
                      </div>
                    )}
                    {couponError && (
                      <p className="text-[11px] text-rose-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {couponError}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                /* STEP 2: BILLING & PAYMENT FORM */
                <div className="space-y-4 text-left">
                  <h4 className="font-bold text-white text-sm uppercase tracking-wider mb-2">Billing & Attendance Details</h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-400">Attendee Name</label>
                      <input 
                        type="text" 
                        value={billingName}
                        onChange={(e) => setBillingName(e.target.value)}
                        placeholder="Alex Rivera"
                        className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-400">Email Address</label>
                      <input 
                        type="email" 
                        value={billingEmail}
                        onChange={(e) => setBillingEmail(e.target.value)}
                        placeholder="attendee@eventhub.com"
                        className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>                  {/* Payment Info */}
                  <div className="space-y-3 mt-4">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Select Real-Time Indian Payment Method
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => { setPaymentMode('upi'); setPaymentError(''); }}
                        className={`py-3 px-1.5 rounded-2xl border flex flex-col items-center justify-center gap-1 text-center transition-all ${
                          paymentMode === 'upi'
                            ? 'border-indigo-500 bg-indigo-500/20 text-white font-bold ring-1 ring-indigo-500'
                            : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <Smartphone className="w-4 h-4 text-indigo-400" />
                        <span className="text-[9px] uppercase font-bold tracking-wider">BHIM UPI</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setPaymentMode('card'); setPaymentError(''); }}
                        className={`py-3 px-1.5 rounded-2xl border flex flex-col items-center justify-center gap-1 text-center transition-all ${
                          paymentMode === 'card'
                            ? 'border-indigo-500 bg-indigo-500/20 text-white font-bold ring-1 ring-indigo-500'
                            : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <CreditCard className="w-4 h-4 text-indigo-400" />
                        <span className="text-[9px] uppercase font-bold tracking-wider">Cards / RuPay</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setPaymentMode('netbanking'); setPaymentError(''); }}
                        className={`py-3 px-1.5 rounded-2xl border flex flex-col items-center justify-center gap-1 text-center transition-all ${
                          paymentMode === 'netbanking'
                            ? 'border-indigo-500 bg-indigo-500/20 text-white font-bold ring-1 ring-indigo-500'
                            : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <Building2 className="w-4 h-4 text-indigo-400" />
                        <span className="text-[9px] uppercase font-bold tracking-wider">Net Banking</span>
                      </button>
                    </div>
                  </div>

                  {/* Payment Panel Content */}
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/10 mt-3 space-y-4">
                    {/* UPI PANEL */}
                    {paymentMode === 'upi' && (
                      <div className="space-y-4">
                        <div className="flex gap-2 p-0.5 bg-white/5 rounded-xl border border-white/10">
                          <button
                            type="button"
                            onClick={() => setUpiOption('qr')}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold tracking-wider transition-all ${
                              upiOption === 'qr' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            DYNAMIC SCAN QR
                          </button>
                          <button
                            type="button"
                            onClick={() => setUpiOption('id')}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold tracking-wider transition-all ${
                              upiOption === 'id' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            ENTER UPI ID
                          </button>
                        </div>

                        {upiOption === 'qr' ? (
                          <div className="flex flex-col items-center text-center py-1 space-y-3">
                            <p className="text-[10px] text-slate-300">
                              Scan this real-time secure QR code using GPay, PhonePe, Paytm, or any UPI app.
                            </p>
                            
                            <div className="bg-white p-2.5 rounded-2xl shadow-xl flex items-center justify-center border border-white/20 relative">
                              {upiQrCodeData ? (
                                <img src={upiQrCodeData} alt="UPI Payment QR Code" className="w-36 h-36 object-contain" />
                              ) : (
                                <div className="w-36 h-36 flex items-center justify-center">
                                  <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                                </div>
                              )}
                              
                              {/* Small BHIM UPI center badge */}
                              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 py-0.5 border border-slate-200 rounded-md font-black text-[8px] text-indigo-900 tracking-wider">
                                UPI
                              </div>
                            </div>

                            <div className="text-center py-1 bg-slate-900/50 rounded-xl px-4 py-2 border border-slate-800 w-full max-w-[200px]">
                              <p className="text-[10px] text-slate-400">Payee: <strong className="text-white font-bold">Uma Shankar</strong></p>
                              <p className="text-[10px] text-slate-400 mt-0.5">UPI ID: <strong className="text-indigo-400 font-mono select-all font-bold">umakashyap344@oksbi</strong></p>
                            </div>

                            <div className="flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-xl text-[10px] text-indigo-300">
                              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-ping"></span>
                              <span>Real-Time Session Expires: </span>
                              <span className="font-mono font-bold text-white bg-indigo-950 px-1.5 py-0.5 rounded border border-indigo-500/30">
                                {formatTimer(upiTimer)}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                Virtual Payment Address (UPI ID)
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="e.g. shankar@okhdfcbank"
                                  value={vpaId}
                                  onChange={(e) => {
                                    setVpaId(e.target.value);
                                    setIsVpaVerified(false);
                                  }}
                                  className="flex-1 bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                />
                                <button
                                  type="button"
                                  onClick={handleVerifyVPA}
                                  disabled={isVpaVerifying || !vpaId.trim()}
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] px-3.5 rounded-xl transition-all disabled:opacity-50 shrink-0 flex items-center gap-1"
                                >
                                  {isVpaVerifying ? (
                                    <>
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                      Checking
                                    </>
                                  ) : isVpaVerified ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-400" />
                                      Verified
                                    </>
                                  ) : (
                                    "Verify ID"
                                  )}
                                </button>
                              </div>
                            </div>

                            {isVpaVerified && (
                              <motion.div
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-xs text-left"
                              >
                                <p className="text-emerald-400 font-bold flex items-center gap-1.5">
                                  <Check className="w-3.5 h-3.5 bg-emerald-500/20 text-emerald-300 rounded-full p-0.5" />
                                  VPA Verified Successfully
                                </p>
                                <p className="text-[10px] text-slate-300 mt-1">
                                  Payer Name: <span className="font-bold text-white">{vpaVerifiedName}</span>
                                </p>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  A payment request notification will be pushed to your UPI app on checkout.
                                </p>
                              </motion.div>
                            )}

                            <div className="flex items-center gap-1.5 bg-white/5 px-3 py-2 rounded-xl text-[10px] text-slate-400">
                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                              <span>We accept GPay, Paytm, PhonePe, BHIM, Mobikwik & major UPI apps.</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* CARD / RUPAY PANEL */}
                    {paymentMode === 'card' && (
                      <div className="space-y-3 text-left">
                        <div className="flex justify-between items-center pb-2 border-b border-white/5">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">RuPay / Debit / Credit Cards</span>
                          <span className="text-[9px] font-bold text-indigo-300 bg-indigo-500/15 px-1.5 py-0.5 rounded border border-indigo-500/20">India Domestic Gateway</span>
                        </div>
                        
                        <div className="space-y-2.5">
                          <div className="space-y-1">
                            <label className="block text-[10px] text-slate-400">Card Number</label>
                            <div className="relative">
                              <input
                                type="text"
                                placeholder="4532 9876 1234 5678"
                                value={cardNumber}
                                onChange={(e) => setCardNumber(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2 text-xs focus:outline-none"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-extrabold text-orange-400 border border-orange-500/20 bg-orange-500/10 px-1.5 py-0.5 rounded uppercase">
                                RuPay
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="block text-[10px] text-slate-400">Expiry (MM/YY)</label>
                              <input
                                type="text"
                                placeholder="12/29"
                                value={cardExpiry}
                                onChange={(e) => setCardExpiry(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2 text-xs focus:outline-none"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-[10px] text-slate-400">CVV</label>
                              <input
                                type="password"
                                placeholder="123"
                                value={cardCvv}
                                onChange={(e) => setCardCvv(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2 text-xs focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="block text-[10px] text-slate-400">Card Holder Name</label>
                            <input
                              type="text"
                              placeholder="Shankar Kumar"
                              value={cardHolder}
                              onChange={(e) => setCardHolder(e.target.value)}
                              className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2 text-xs focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* NET BANKING PANEL */}
                    {paymentMode === 'netbanking' && (
                      <div className="space-y-3 text-left">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Select Popular Indian Bank
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Bank', 'Yes Bank'].map((bank) => {
                            const isSelected = selectedBank === bank;
                            return (
                              <button
                                key={bank}
                                type="button"
                                onClick={() => setSelectedBank(bank)}
                                className={`p-2 rounded-xl border text-[10px] font-medium text-left transition-all ${
                                  isSelected
                                    ? 'border-indigo-500 bg-indigo-500/20 text-white font-extrabold ring-1 ring-indigo-500'
                                    : 'border-white/5 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                                }`}
                              >
                                {bank}
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-[10px] text-slate-400 text-center mt-1">
                          You will be securely redirected to {selectedBank}'s internet banking page to authorize.
                        </p>
                      </div>
                    )}
                  </div>

                  {paymentError && (
                    <p className="text-[11px] text-rose-400 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {paymentError}
                    </p>
                  )}
                </div>
              )}

              {/* Order Invoice Summary Panel */}
              <div className="bg-white/5 border border-white/10 p-5 rounded-2xl text-left space-y-3">
                <h4 className="font-bold text-white text-xs uppercase tracking-wider pb-2 border-b border-white/10">Receipt Invoice</h4>
                <div className="space-y-1.5 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span>Subtotal ({quantity}x {selectedCategory}):</span>
                    <span className="font-medium text-white">{formatINR(subtotal)}</span>
                  </div>
                  {appliedCoupon && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Promo Discount ({appliedCoupon.discountPercent}%):</span>
                      <span>-{formatINR(discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Merchant processing & handling fee:</span>
                    <span>{processingFee === 0 ? "FREE" : formatINR(processingFee)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-white/10 font-bold text-sm text-white">
                    <span>Total Payment:</span>
                    <span className="text-primary font-extrabold">{formatINR(total)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Checkout Action Footer */}
          {checkoutStep !== 'loading' && (
            <div className="p-6 border-t border-white/10 flex gap-3 bg-white/5 shrink-0">
              {checkoutStep === 'payment' && (
                <button
                  type="button"
                  onClick={() => setCheckoutStep('details')}
                  className="bg-white/10 border border-white/10 text-white font-bold px-5 rounded-2xl text-sm hover:bg-white/20 transition-colors"
                >
                  Back
                </button>
              )}
              
              <button
                type="button"
                onClick={checkoutStep === 'details' ? () => setCheckoutStep('payment') : handleCompletePayment}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-2xl text-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all"
              >
                {checkoutStep === 'details' ? (
                  <>
                    Continue to Payment
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  </>
                ) : (
                  <>
                    Pay & Generate Pass
                    <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                  </>
                )}
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
