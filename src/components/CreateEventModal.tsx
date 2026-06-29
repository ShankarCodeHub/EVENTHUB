import React, { useState } from 'react';
import { X, Calendar, MapPin, Tag, Image, Sparkles, Plus, Trash2, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { createEvent, updateEvent } from '../lib/firebase';
import { Event, TicketCategory } from '../types';
import { useAuth } from '../context/AuthContext';
import { formatINR } from '../utils/currency';

interface CreateEventModalProps {
  eventToEdit?: Event | null;
  onClose: () => void;
  onSuccess: (event: Event) => void;
}

// Preset banner suggestions
const BANNER_PRESETS = [
  { name: 'Tech / AI', url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=80' },
  { name: 'Music Concert', url: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=1200&auto=format&fit=crop&q=80' },
  { name: 'Food / Culinary', url: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1200&auto=format&fit=crop&q=80' },
  { name: 'Yoga / Wellness', url: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1200&auto=format&fit=crop&q=80' },
  { name: 'Startup Networking', url: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=1200&auto=format&fit=crop&q=80' }
];

export const CreateEventModal: React.FC<CreateEventModalProps> = ({ eventToEdit, onClose, onSuccess }) => {
  const { currentUser } = useAuth();

  // Initial States
  const [title, setTitle] = useState(eventToEdit?.title || '');
  const [category, setCategory] = useState(eventToEdit?.category || 'Technology');
  const [description, setDescription] = useState(eventToEdit?.description || '');
  const [bannerUrl, setBannerUrl] = useState(eventToEdit?.bannerUrl || BANNER_PRESETS[0].url);
  const [location, setLocation] = useState(eventToEdit?.location || '');
  const [date, setDate] = useState(eventToEdit?.date || '');
  const [time, setTime] = useState(eventToEdit?.time || '');
  
  // Custom ticket categories
  const [ticketCategories, setTicketCategories] = useState<TicketCategory[]>(
    eventToEdit?.ticketCategories || [
      { name: "General Admission", price: 49, capacity: 100, sold: 0 },
      { name: "VIP Pass", price: 149, capacity: 20, sold: 0 }
    ]
  );

  const [newCatName, setNewCatName] = useState('');
  const [newCatPrice, setNewCatPrice] = useState(25);
  const [newCatCap, setNewCatCap] = useState(50);
  const [status, setStatus] = useState<'draft' | 'published'>(eventToEdit?.status || 'published');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddTicketCategory = () => {
    if (!newCatName.trim()) return;
    setTicketCategories(prev => [
      ...prev,
      { name: newCatName.trim(), price: newCatPrice, capacity: newCatCap, sold: 0 }
    ]);
    setNewCatName('');
    setNewCatPrice(25);
    setNewCatCap(50);
  };

  const handleRemoveTicketCategory = (index: number) => {
    setTicketCategories(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !location.trim() || !date || !time || ticketCategories.length === 0) return;

    setIsSubmitting(true);
    
    // Starting or base price
    const basePrice = Math.min(...ticketCategories.map(c => c.price));
    const totalCapacity = ticketCategories.reduce((sum, c) => sum + c.capacity, 0);

    const eventPayload = {
      title: title.trim(),
      description: description.trim() || "Join us for this exciting live event!",
      category,
      bannerUrl,
      location: location.trim(),
      date,
      time,
      capacity: totalCapacity,
      price: basePrice,
      organizerId: currentUser?.id || "organizer_demo",
      organizerName: currentUser?.name || "EventHub Organizer",
      status,
      ticketCategories,
      gallery: eventToEdit?.gallery || [],
      reviews: eventToEdit?.reviews || []
    };

    try {
      let resultEvent: Event;
      if (eventToEdit) {
        resultEvent = await updateEvent(eventToEdit.id, eventPayload);
      } else {
        resultEvent = await createEvent(eventPayload);
      }
      onSuccess(resultEvent);
    } catch (err) {
      console.error("Failed to save event:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="glass rounded-3xl shadow-2xl border border-white/10 max-w-2xl w-full overflow-hidden relative flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/20 rounded-xl text-primary">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-lg">
                {eventToEdit ? "Modify Event Parameters" : "Publish a Smart Event"}
              </h3>
              <p className="text-xs text-slate-400">Deploy high-performance booking allocations</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-white/10 rounded-full text-slate-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 text-left">
          {/* Section 1: Core details */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">1. Event Basics</h4>
            
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Event Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Next-Gen Founders Summit"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder-slate-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option className="bg-slate-900 text-white">Technology</option>
                  <option className="bg-slate-900 text-white">Music & Arts</option>
                  <option className="bg-slate-900 text-white">Food & Drinks</option>
                  <option className="bg-slate-900 text-white">Health & Wellness</option>
                  <option className="bg-slate-900 text-white">Sports</option>
                  <option className="bg-slate-900 text-white">Business</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'draft' | 'published')}
                  className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="published" className="bg-slate-900 text-white">Active & Published</option>
                  <option value="draft" className="bg-slate-900 text-white">Draft / Private</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Description</label>
              <textarea
                rows={3}
                placeholder="Detailed event program, syllabus, guest line-up, and attendance rules..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder-slate-400"
              />
            </div>
          </div>

          {/* Section 2: Banner Selection */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Image className="w-4 h-4 text-slate-400" />
              2. Cover Art Image
            </h4>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">Preset Presets (Click to choose)</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {BANNER_PRESETS.map(preset => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => setBannerUrl(preset.url)}
                    className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
                      bannerUrl === preset.url 
                        ? 'bg-primary text-white border-primary shadow-sm' 
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
                    }`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>

              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Or enter custom Image URL</label>
              <input
                type="url"
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Section 3: Time & Location */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">3. Logistics</h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 text-white rounded-xl pl-10 pr-4 py-3 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Time</label>
                <input
                  type="time"
                  required
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-xs focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Venue Location</label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Lincoln Center, NYC or Virtual Link"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 text-white rounded-xl pl-10 pr-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder-slate-400"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Ticket Pricing Allocations */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">4. Ticket Capacity Allocations</h4>

            {/* List current allocations */}
            <div className="space-y-2">
              {ticketCategories.map((cat, idx) => (
                <div key={idx} className="flex items-center justify-between bg-indigo-500/10 border border-indigo-500/20 p-3.5 rounded-2xl">
                  <div>
                    <p className="font-bold text-white text-xs">{cat.name}</p>
                    <p className="text-[10px] text-slate-300 mt-0.5">Capacity: {cat.capacity} seats | Price: {formatINR(cat.price)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveTicketCategory(idx)}
                    className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Form to add a new pricing category */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-[11px] font-bold text-white">Add Seating Tier</p>
                <span className="text-[9px] text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded-md">
                  1 Unit = ₹80 INR
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Tier Name (e.g. VIP Pass)"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="bg-white/5 border border-white/10 text-white placeholder-slate-400 rounded-xl px-3 py-2 text-[11px] focus:outline-none"
                />
                
                <div className="flex items-center bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                  <span className="text-[11px] text-slate-400 font-mono mr-1">₹</span>
                  <input
                    type="number"
                    min={0}
                    placeholder="Units (e.g. 10)"
                    value={newCatPrice}
                    onChange={(e) => setNewCatPrice(Number(e.target.value))}
                    className="w-full bg-transparent text-white text-[11px] focus:outline-none"
                  />
                </div>

                <input
                  type="number"
                  min={1}
                  placeholder="Seats"
                  value={newCatCap}
                  onChange={(e) => setNewCatCap(Number(e.target.value))}
                  className="bg-white/5 border border-white/10 text-white placeholder-slate-400 rounded-xl px-3 py-2 text-[11px] focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handleAddTicketCategory}
                className="w-full bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold text-xs py-2 rounded-xl transition-all flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Append Seating Category
              </button>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 flex gap-3 bg-white/5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-white/10 border border-white/10 text-white font-bold py-3 rounded-2xl text-sm hover:bg-white/20 transition-all"
          >
            Cancel
          </button>
          
          <button
            type="button"
            disabled={isSubmitting || !title.trim() || !location.trim() || ticketCategories.length === 0}
            onClick={handleSubmit}
            className="flex-1 bg-indigo-600 text-white font-bold py-3 rounded-2xl text-sm hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md flex items-center justify-center gap-1.5"
          >
            {isSubmitting ? (
              "Deploying State..."
            ) : (
              <>
                {eventToEdit ? "Update Event" : "Publish Event"}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
