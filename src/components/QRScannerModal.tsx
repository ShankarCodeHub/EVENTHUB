import React, { useState } from 'react';
import { X, CheckCircle, AlertTriangle, Scan, Keyboard, RefreshCw, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { checkInBooking } from '../lib/firebase';
import { Booking } from '../types';

interface QRScannerModalProps {
  onClose: () => void;
  onCheckInSuccess: () => void;
  activeEventBookings: Booking[];
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({ onClose, onCheckInSuccess, activeEventBookings }) => {
  const [method, setMethod] = useState<'scan' | 'manual'>('scan');
  const [ticketId, setTicketId] = useState('');
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [scannedBooking, setScannedBooking] = useState<Booking | null>(null);

  // Filter bookings to those that are active & not checked in yet to help testing
  const eligibleBookings = activeEventBookings.filter(b => b.status === 'booked' && !b.checkedIn);

  const handleManualCheckIn = async (idToUse?: string) => {
    const finalId = idToUse || ticketId;
    if (!finalId.trim()) return;

    setStatus('scanning');
    
    // Simulate a slight network delay
    setTimeout(async () => {
      try {
        const res = await checkInBooking(finalId.trim());
        if (res.success && res.booking) {
          setStatus('success');
          setMessage(res.message);
          setScannedBooking(res.booking);
          onCheckInSuccess();
        } else {
          setStatus('error');
          setMessage(res.message);
          setScannedBooking(null);
        }
      } catch (err) {
        setStatus('error');
        setMessage('A verification error occurred. Please try again.');
        setScannedBooking(null);
      }
    }, 1200);
  };

  // Selects a random eligible ticket to simulate a physical camera scan
  const handleSimulateScan = () => {
    if (eligibleBookings.length === 0) {
      setStatus('error');
      setMessage("All active attendees have already checked in for this event!");
      setScannedBooking(null);
      return;
    }

    const randomIndex = Math.floor(Math.random() * eligibleBookings.length);
    const randomBooking = eligibleBookings[randomIndex];
    
    setStatus('scanning');
    setMessage(`Focusing lens on Ticket: ${randomBooking.id}...`);

    setTimeout(async () => {
      try {
        const res = await checkInBooking(randomBooking.id);
        if (res.success && res.booking) {
          setStatus('success');
          setMessage(`Scanned Code: "${randomBooking.id}" - ${res.message}`);
          setScannedBooking(res.booking);
          onCheckInSuccess();
        } else {
          setStatus('error');
          setMessage(res.message);
          setScannedBooking(null);
        }
      } catch (err) {
        setStatus('error');
        setMessage('Scan decoding failed.');
        setScannedBooking(null);
      }
    }, 1500);
  };

  const resetScanner = () => {
    setTicketId('');
    setStatus('idle');
    setMessage('');
    setScannedBooking(null);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="glass rounded-3xl shadow-2xl border border-white/10 max-w-md w-full overflow-hidden relative"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/20 rounded-xl text-primary">
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">Check-in Terminal</h3>
              <p className="text-xs text-slate-400">Scan QR passes or input booking IDs</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-white/10 rounded-full text-slate-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-white/10 bg-white/5 p-1 m-4 rounded-xl">
          <button
            onClick={() => { setMethod('scan'); resetScanner(); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
              method === 'scan' ? 'bg-white/10 shadow-sm text-primary' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Scan className="w-4 h-4" />
            Interactive Lens
          </button>
          <button
            onClick={() => { setMethod('manual'); resetScanner(); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
              method === 'manual' ? 'bg-white/10 shadow-sm text-primary' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Keyboard className="w-4 h-4" />
            Manual Entry
          </button>
        </div>

        {/* Content Panel */}
        <div className="p-6 pt-2">
          {status === 'scanning' ? (
            /* SCANNING LOADER */
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <RefreshCw className="w-12 h-12 text-primary animate-spin mb-4" />
              <p className="font-semibold text-white">Verifying Pass Certificate...</p>
              <p className="text-xs text-slate-400 mt-1">{message || "Accessing decentralized state..."}</p>
            </div>
          ) : status === 'success' ? (
            /* SUCCESS STATE */
            <div className="flex flex-col items-center justify-center text-center py-6">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-400 mb-4 animate-bounce">
                <CheckCircle className="w-10 h-10" />
              </div>
              <h4 className="font-bold text-white text-lg">Check-in Confirmed!</h4>
              <p className="text-sm text-emerald-400 mt-1 font-medium">{message}</p>

              {scannedBooking && (
                <div className="bg-white/5 w-full rounded-2xl p-4 mt-6 text-left border border-white/10 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Attendee:</span>
                    <span className="font-semibold text-slate-200">{scannedBooking.attendeeName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ticket Type:</span>
                    <span className="font-semibold text-slate-200">{scannedBooking.ticketCategory}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Quantity:</span>
                    <span className="font-semibold text-slate-200">{scannedBooking.quantity} Ticket(s)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Check-in Time:</span>
                    <span className="font-semibold text-slate-200">{scannedBooking.checkedInAt}</span>
                  </div>
                </div>
              )}

              <button
                onClick={resetScanner}
                className="mt-6 bg-indigo-600 text-white w-full py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all text-sm"
              >
                Scan Next Pass
              </button>
            </div>
          ) : status === 'error' ? (
            /* ERROR STATE */
            <div className="flex flex-col items-center justify-center text-center py-6">
              <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-400 mb-4">
                <AlertTriangle className="w-10 h-10" />
              </div>
              <h4 className="font-bold text-white text-lg">Verification Failed</h4>
              <p className="text-sm text-rose-400 mt-2 font-medium px-4">{message}</p>

              <button
                onClick={resetScanner}
                className="mt-6 bg-white/15 text-white w-full py-3 rounded-2xl font-bold hover:bg-white/20 transition-all text-sm"
              >
                Retry Scanner
              </button>
            </div>
          ) : (
            /* IDLE INPUT PANEL */
            <div>
              {method === 'scan' ? (
                <div className="flex flex-col items-center">
                  {/* Camera Finder Box */}
                  <div className="relative w-60 h-60 border-2 border-dashed border-primary/40 rounded-3xl overflow-hidden bg-slate-950 flex flex-col items-center justify-center mb-6">
                    {/* Laser Scanner animation line */}
                    <div className="absolute left-0 right-0 h-1 bg-cyan-500 opacity-80 shadow-[0_0_15px_#06b6d4] animate-[bounce_2s_infinite]"></div>
                    
                    {/* Corner accents */}
                    <div className="absolute top-4 left-4 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-md"></div>
                    <div className="absolute top-4 right-4 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-md"></div>
                    <div className="absolute bottom-4 left-4 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-md"></div>
                    <div className="absolute bottom-4 right-4 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-md"></div>
 
                    <Scan className="w-12 h-12 text-white/30 animate-pulse mb-3" />
                    <p className="text-[11px] text-white/60 text-center px-4">
                      Point camera window at pass QR code
                    </p>
                  </div>

                  <button
                    onClick={handleSimulateScan}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all"
                  >
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    Simulate Ticket Scan
                  </button>

                  <div className="mt-4 text-center">
                    <p className="text-[11px] text-slate-400">
                      Eligible check-ins available for this event: <span className="font-semibold text-slate-300">{eligibleBookings.length}</span>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Booking reference / ticket code
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. booking_1 or book_z3b8z"
                      value={ticketId}
                      onChange={(e) => setTicketId(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 text-white rounded-2xl p-4 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder-slate-400"
                    />
                  </div>

                  <button
                    onClick={() => handleManualCheckIn()}
                    disabled={!ticketId.trim()}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-3.5 px-4 rounded-2xl font-bold text-sm transition-all shadow-md"
                  >
                    Validate Code
                  </button>

                  {eligibleBookings.length > 0 && (
                    <div className="pt-4 border-t border-white/10">
                      <p className="text-xs text-slate-400 font-semibold mb-2">Available Codes for Testing:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {eligibleBookings.slice(0, 3).map(b => (
                          <button
                            key={b.id}
                            onClick={() => {
                              setTicketId(b.id);
                              handleManualCheckIn(b.id);
                            }}
                            className="bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono text-slate-300 px-2 py-1 rounded-lg transition-colors"
                          >
                            {b.id} ({b.attendeeName.split(' ')[0]})
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
