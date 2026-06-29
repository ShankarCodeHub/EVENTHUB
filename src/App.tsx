import React, { useState, useEffect } from 'react';
import { 
  Search, SlidersHorizontal, LogIn, LogOut, Bell, Compass, 
  Ticket, LayoutDashboard, Settings, UserCheck, Plus, RefreshCw, 
  MapPin, Calendar, Heart, ShieldAlert, CheckCircle, Star, Sparkles, 
  ArrowLeft, Users, CircleDollarSign, BarChart3, Receipt, Eye, Edit, Trash2, Scan
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Context & State
import { AuthProvider, useAuth } from './context/AuthContext';

// Services & Components
import { 
  getEvents, getBookingsByUserId, getBookingsByEventId, 
  getNotifications, getSystemAnalytics, deleteEvent, addEventReview,
  cancelBooking, getAllUsers, updateUserProfile
} from './lib/firebase';
import { Event, Booking, Notification, SystemAnalytics, User, Review } from './types';
import { EventCard } from './components/EventCard';
import { DashboardCharts } from './components/DashboardCharts';
import { QRScannerModal } from './components/QRScannerModal';
import { CheckoutModal } from './components/CheckoutModal';
import { CreateEventModal } from './components/CreateEventModal';
import { NotificationDrawer } from './components/NotificationDrawer';
import { formatINR } from './utils/currency';
import { AuthModal } from './components/AuthModal';

function EventHubAppContent() {
  const { currentUser, logout, login, register, switchRole, updateProfile } = useAuth();

  // State managers
  const [events, setEvents] = useState<Event[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [systemAnalytics, setSystemAnalytics] = useState<SystemAnalytics | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedPriceType, setSelectedPriceType] = useState('All'); // All, Free, Paid
  const [selectedSort, setSelectedSort] = useState('upcoming'); // upcoming, reviews, priceAsc, priceDesc

  // Navigation
  const [activeTab, setActiveTab] = useState<'discover' | 'my-bookings' | 'organizer-dash' | 'admin-dash' | 'profile'>('discover');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // Modals / Drawer triggers
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<Event | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [scannerEventBookings, setScannerEventBookings] = useState<Booking[]>([]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Review Form state
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');

  // Toast / Alert notifications
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Profile Form state
  const [profileBio, setProfileBio] = useState('');
  const [profileCompany, setProfileCompany] = useState('');

  // Fetch initial data
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const fetchedEvents = await getEvents();
      setEvents(fetchedEvents);

      if (currentUser) {
        // Fetch current user bookings
        const userBookings = await getBookingsByUserId(currentUser.id);
        setBookings(userBookings);

        // Fetch notifications
        const notifs = await getNotifications(currentUser.id);
        setNotifications(notifs);

        // Load profile values
        setProfileBio(currentUser.bio || '');
        setProfileCompany(currentUser.company || '');
      }

      if (currentUser?.role === 'admin') {
        const analytics = await getSystemAnalytics();
        setSystemAnalytics(analytics);
        const users = await getAllUsers();
        setAllUsers(users);
      }
    } catch (err) {
      console.error("Error loading application state:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Switch role and notify
  const handleRoleSwitch = async (role: 'attendee' | 'organizer' | 'admin') => {
    await switchRole(role);
    showToast(`Switched profile state to demo: ${role.toUpperCase()}`, 'success');
    if (role === 'attendee') setActiveTab('discover');
    if (role === 'organizer') setActiveTab('organizer-dash');
    if (role === 'admin') setActiveTab('admin-dash');
    setSelectedEvent(null);
  };

  // Delete event handler
  const handleDeleteEvent = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this event? This action is permanent.")) return;
    try {
      await deleteEvent(id);
      showToast("Event successfully de-allocated from database", "success");
      fetchData();
    } catch (err) {
      showToast("Failed to delete event", "error");
    }
  };

  // Submit Review
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedEvent) return;
    try {
      const review: Review = {
        id: "rev_" + Math.random().toString(36).substring(2, 9),
        userId: currentUser.id,
        userName: currentUser.name,
        rating: newRating,
        comment: newComment.trim() || "Amazing event!",
        createdAt: new Date().toISOString().substring(0, 10)
      };
      const updatedEvent = await addEventReview(selectedEvent.id, review);
      setSelectedEvent(updatedEvent);
      setNewComment('');
      showToast("Thank you! Your rating is synced.", "success");
      // Refresh list
      const fetchedEvents = await getEvents();
      setEvents(fetchedEvents);
    } catch (err) {
      showToast("Review failed.", "error");
    }
  };

  // Save profile edits
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    try {
      await updateProfile({ bio: profileBio, company: profileCompany });
      showToast("Profile credentials updated successfully", "success");
    } catch (err) {
      showToast("Failed to save profile changes", "error");
    }
  };

  // Filter events logic
  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          event.location.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'All' || event.category === selectedCategory;
    
    const isFree = event.price === 0;
    const matchesPrice = selectedPriceType === 'All' || 
                         (selectedPriceType === 'Free' && isFree) || 
                         (selectedPriceType === 'Paid' && !isFree);
    
    return matchesSearch && matchesCategory && matchesPrice && event.status === 'published';
  });

  // Sort events logic
  const sortedEvents = [...filteredEvents].sort((a, b) => {
    if (selectedSort === 'priceAsc') return a.price - b.price;
    if (selectedSort === 'priceDesc') return b.price - a.price;
    if (selectedSort === 'reviews') {
      const ratingA = a.reviews && a.reviews.length > 0 ? (a.reviews.reduce((s, r) => s + r.rating, 0) / a.reviews.length) : 0;
      const ratingB = b.reviews && b.reviews.length > 0 ? (b.reviews.reduce((s, r) => s + r.rating, 0) / b.reviews.length) : 0;
      return ratingB - ratingA;
    }
    // Default upcoming date
    return a.date.localeCompare(b.date);
  });

  const categories = ['All', 'Technology', 'Music & Arts', 'Food & Drinks', 'Health & Wellness', 'Sports', 'Business'];

  const unreadNotifsCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen mesh-gradient text-slate-100 font-sans flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Toast Alert */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-5 py-3.5 rounded-2xl shadow-xl border flex items-center gap-2.5 font-semibold text-xs ${
              toastMsg.type === 'success' 
                ? 'bg-emerald-950 text-emerald-100 border-emerald-800/50' 
                : 'bg-rose-950 text-rose-100 border-rose-800/50'
            }`}
          >
            {toastMsg.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-rose-400" />
            )}
            {toastMsg.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Developer Demo Bar / Quick Role Switcher */}
      <div className="bg-slate-950/60 backdrop-blur-md text-white py-2 px-4 flex flex-col md:flex-row items-center justify-between text-[11px] font-mono border-b border-white/5 shrink-0 gap-2">
        <div className="flex items-center gap-1.5 text-slate-400">
          <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
          <span>SANDBOX MODE: Click a role to instantly switch state permissions:</span>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <button 
            onClick={() => handleRoleSwitch('attendee')} 
            className={`px-2.5 py-1 rounded transition-colors ${currentUser?.role === 'attendee' ? 'bg-indigo-600 text-white font-extrabold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
          >
            Attendee (Alex)
          </button>
          <button 
            onClick={() => handleRoleSwitch('organizer')} 
            className={`px-2.5 py-1 rounded transition-colors ${currentUser?.role === 'organizer' ? 'bg-purple-600 text-white font-extrabold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
          >
            Organizer (Guild)
          </button>
          <button 
            onClick={() => handleRoleSwitch('admin')} 
            className={`px-2.5 py-1 rounded transition-colors ${currentUser?.role === 'admin' ? 'bg-cyan-600 text-white font-extrabold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
          >
            Platform Admin
          </button>
        </div>
      </div>

      {/* Header Navigation */}
      <header className="glass border-b border-white/10 sticky top-0 z-40 px-6 py-4 flex items-center justify-between shadow-lg shrink-0">
        <div className="flex items-center gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setActiveTab('discover'); setSelectedEvent(null); }}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white font-black text-lg shadow-md shadow-indigo-500/20">
              EH
            </div>
            <div className="text-left hidden sm:block">
              <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-white via-indigo-200 to-cyan-300 bg-clip-text text-transparent">EventHub</span>
              <p className="text-[9px] text-indigo-300 font-bold uppercase tracking-wider -mt-1">Smart Engine</p>
            </div>
          </div>

          {/* Nav Tabs */}
          <nav className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <button
              onClick={() => { setActiveTab('discover'); setSelectedEvent(null); }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all ${activeTab === 'discover' ? 'bg-white/10 text-white font-bold border border-white/10' : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'}`}
            >
              <Compass className="w-4 h-4" />
              Discover Events
            </button>
            {currentUser && (
              <>
                {currentUser.role === 'attendee' && (
                  <button
                    onClick={() => setActiveTab('my-bookings')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all ${activeTab === 'my-bookings' ? 'bg-white/10 text-white font-bold border border-white/10' : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'}`}
                  >
                    <Ticket className="w-4 h-4" />
                    My Tickets
                  </button>
                )}
                {currentUser.role === 'organizer' && (
                  <button
                    onClick={() => setActiveTab('organizer-dash')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all ${activeTab === 'organizer-dash' ? 'bg-white/10 text-purple-200 font-bold border border-purple-500/20' : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'}`}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Organizer Hub
                  </button>
                )}
                {currentUser.role === 'admin' && (
                  <button
                    onClick={() => setActiveTab('admin-dash')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all ${activeTab === 'admin-dash' ? 'bg-white/10 text-cyan-200 font-bold border border-cyan-500/20' : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'}`}
                  >
                    <Settings className="w-4 h-4" />
                    Admin Command
                  </button>
                )}
              </>
            )}
          </nav>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-3">
          {currentUser ? (
            <div className="flex items-center gap-3">
              {/* Notifications */}
              <button
                onClick={() => setIsNotifOpen(true)}
                className="p-2 hover:bg-white/10 border border-white/10 rounded-xl relative text-slate-200 transition-colors"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white font-extrabold text-[9px] rounded-full flex items-center justify-center animate-pulse">
                    {unreadNotifsCount}
                  </span>
                )}
              </button>

              {/* Profile Shortcut */}
              <div 
                onClick={() => setActiveTab('profile')}
                className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors"
              >
                <img 
                  src={currentUser.profileImg} 
                  alt={currentUser.name} 
                  className="w-7 h-7 rounded-lg object-cover"
                />
                <div className="text-left hidden lg:block pr-1">
                  <p className="text-xs font-bold text-white line-clamp-1 leading-none">{currentUser.name}</p>
                  <span className="text-[9px] text-slate-400 font-semibold capitalize">{currentUser.role}</span>
                </div>
              </div>

              {/* Logout */}
              <button
                onClick={logout}
                className="p-2 hover:bg-rose-500/10 border border-transparent rounded-xl text-rose-400 hover:text-rose-500 transition-colors"
                title="Sign out of EventHub"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="text-xs font-bold text-slate-300 hover:text-white px-3 py-1.5"
              >
                Sign In
              </button>
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md transition-colors hover:bg-indigo-700 flex items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" />
                Quick Login
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Viewport Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {isLoading ? (
          /* SKELETON LOADING */
          <div className="py-24 space-y-6 text-center flex flex-col items-center justify-center">
            <RefreshCw className="w-10 h-10 text-primary animate-spin" />
            <p className="text-slate-400 font-semibold text-sm">Querying active state registers...</p>
          </div>
        ) : selectedEvent ? (
          /* EVENT DETAILS SCREEN */
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Back Button */}
            <button
              onClick={() => setSelectedEvent(null)}
              className="flex items-center gap-1.5 font-bold text-xs text-slate-500 hover:text-slate-800 transition-colors self-start"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Catalog
            </button>

            {/* Event Hero Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Hero Image & Information */}
              <div className="lg:col-span-2 space-y-6 text-left">
                <div className="h-96 w-full rounded-3xl overflow-hidden shadow-lg border border-slate-100 bg-slate-900">
                  <img 
                    src={selectedEvent.bannerUrl} 
                    alt={selectedEvent.title} 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="bg-indigo-50 border border-indigo-100 text-primary font-bold text-xs px-3 py-1 rounded-full">{selectedEvent.category}</span>
                    {selectedEvent.featured && (
                      <span className="bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-xs flex items-center gap-1">
                        <Sparkles className="w-3 h-3 animate-pulse" />
                        Featured
                      </span>
                    )}
                  </div>

                  <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">{selectedEvent.title}</h1>

                  {/* Date, Time, Venue Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="flex items-center gap-3 bg-white border border-slate-100 p-4 rounded-2xl shadow-xs">
                      <div className="p-3 bg-indigo-50 rounded-xl text-primary">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Date & Hours</p>
                        <p className="text-xs font-bold text-slate-800">{new Date(selectedEvent.date).toLocaleDateString('en', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{selectedEvent.time}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 bg-white border border-slate-100 p-4 rounded-2xl shadow-xs">
                      <div className="p-3 bg-indigo-50 rounded-xl text-primary">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Location Venue</p>
                        <p className="text-xs font-bold text-slate-800 line-clamp-1">{selectedEvent.location}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Physical / Live On-Site</p>
                      </div>
                    </div>
                  </div>

                  <hr className="border-slate-100 my-6" />

                  <div className="space-y-2">
                    <h3 className="font-extrabold text-slate-900 text-lg">About This Event</h3>
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{selectedEvent.description}</p>
                  </div>
                </div>

                {/* Reviews List & Ratings */}
                <div className="pt-6 space-y-4">
                  <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-1.5">
                    <Star className="w-5 h-5 text-amber-500 fill-current" />
                    Attendee Reviews ({selectedEvent.reviews?.length || 0})
                  </h3>

                  {/* Reviews grid */}
                  <div className="grid grid-cols-1 gap-3">
                    {selectedEvent.reviews && selectedEvent.reviews.length > 0 ? (
                      selectedEvent.reviews.map(rev => (
                        <div key={rev.id} className="bg-white border border-slate-100 p-4 rounded-2xl shadow-xs flex flex-col justify-between">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-xs font-bold text-slate-800">{rev.userName}</p>
                              <span className="text-[10px] text-slate-400">{rev.createdAt}</span>
                            </div>
                            <div className="flex items-center gap-0.5">
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  className={`w-3.5 h-3.5 ${i < rev.rating ? 'text-amber-400 fill-current' : 'text-slate-200'}`} 
                                />
                              ))}
                            </div>
                          </div>
                          <p className="text-xs text-slate-500 italic mt-2">"{rev.comment}"</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400">No reviews submitted yet for this event.</p>
                    )}
                  </div>

                  {/* Review Submission Box (Only for Attendees) */}
                  {currentUser && currentUser.role === 'attendee' && (
                    <form onSubmit={handleSubmitReview} className="bg-white border border-indigo-100 p-5 rounded-2xl space-y-4 shadow-xs mt-4">
                      <p className="text-xs font-bold text-slate-800">Submit a Review & Rating</p>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">Your Rating:</span>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map(star => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setNewRating(star)}
                              className="focus:outline-none"
                            >
                              <Star className={`w-5 h-5 ${star <= newRating ? 'text-amber-400 fill-current' : 'text-slate-200 hover:text-amber-300'}`} />
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          required
                          placeholder="e.g. Incredible speaker panels, well structured!"
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <button
                          type="submit"
                          className="bg-primary text-white font-bold text-xs px-5 py-2.5 rounded-xl hover:bg-opacity-95 transition-all"
                        >
                          Submit
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>

              {/* Sidebar Booking Panel */}
              <div className="space-y-6 text-left">
                <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-md space-y-6 sticky top-28">
                  <div>
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Admission Price</span>
                    <p className="text-3xl font-black text-slate-950 mt-1">
                      {selectedEvent.price === 0 ? "FREE" : `${formatINR(selectedEvent.price)}`}
                      <span className="text-xs text-slate-400 font-normal ml-1">starting price</span>
                    </p>
                  </div>

                  <div className="border-t border-slate-100 pt-4 space-y-3">
                    <p className="text-xs font-bold text-slate-800">Seating Categories available:</p>
                    {selectedEvent.ticketCategories.map(cat => {
                      const avail = cat.capacity - cat.sold;
                      const isSoldOut = avail <= 0;
                      return (
                        <div key={cat.name} className="flex justify-between items-center text-xs">
                          <div>
                            <span className="font-semibold text-slate-700 block">{cat.name}</span>
                            <span className="text-[10px] text-slate-400">{isSoldOut ? "Sold Out" : `${avail} spots left`}</span>
                          </div>
                          <span className="font-extrabold text-slate-900">{formatINR(cat.price)}</span>
                        </div>
                      );
                    })}
                  </div>

                  {currentUser ? (
                    currentUser.role === 'attendee' ? (
                      <button
                        onClick={() => setIsCheckoutOpen(true)}
                        className="w-full bg-primary text-white py-3.5 rounded-2xl font-bold text-sm shadow-lg hover:bg-opacity-90 transition-all flex items-center justify-center gap-1.5"
                      >
                        <Ticket className="w-4 h-4" />
                        Book Passes Securely
                      </button>
                    ) : (
                      <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl text-xs text-amber-800 text-center">
                        <ShieldAlert className="w-4 h-4 mx-auto mb-1 text-amber-500" />
                        You are logged in as an <strong>{currentUser.role.toUpperCase()}</strong>. Switch to the <strong>Attendee</strong> role above to purchase test passes.
                      </div>
                    )
                  ) : (
                    <button
                      onClick={() => setIsAuthModalOpen(true)}
                      className="w-full bg-slate-900 text-white py-3.5 rounded-2xl font-bold text-sm shadow-md hover:bg-slate-800 transition-all"
                    >
                      Login to Reserve Ticket
                    </button>
                  )}

                  <div className="border-t border-slate-100 pt-4 text-center">
                    <p className="text-[10.5px] text-slate-400">
                      Standard sandbox environment with simulated instant payment verification certificates.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : activeTab === 'discover' ? (
          /* EVENT DISCOVERY VIEW */
          <div className="space-y-8">
            {/* Search, Filter, and Sort Bar */}
            <div className="glass p-5 rounded-3xl shadow-lg space-y-4">
              <div className="flex flex-col md:flex-row gap-3">
                {/* Search Field */}
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search conference titles, musicians, chefs, cities, or keywords..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 pl-11 pr-4 py-3.5 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all text-white font-medium placeholder-slate-400"
                  />
                </div>

                {/* Quick Filters */}
                <div className="flex flex-wrap md:flex-nowrap gap-2">
                  <select
                    value={selectedPriceType}
                    onChange={(e) => setSelectedPriceType(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-xs font-semibold text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/25"
                  >
                    <option value="All" className="bg-slate-900 text-white">All Pricing</option>
                    <option value="Free" className="bg-slate-900 text-white">Free Entry</option>
                    <option value="Paid" className="bg-slate-900 text-white">Paid Passes</option>
                  </select>

                  <select
                    value={selectedSort}
                    onChange={(e) => setSelectedSort(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-xs font-semibold text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/25"
                  >
                    <option value="upcoming" className="bg-slate-900 text-white">Sort by Date (Soonest)</option>
                    <option value="reviews" className="bg-slate-900 text-white">Sort by Top Rated</option>
                    <option value="priceAsc" className="bg-slate-900 text-white">Price: Low to High</option>
                    <option value="priceDesc" className="bg-slate-900 text-white">Price: High to Low</option>
                  </select>
                </div>
              </div>

              {/* Categories slider */}
              <div className="flex gap-1.5 overflow-x-auto pb-1.5 pt-1 border-t border-white/10">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`text-xs px-4 py-2 rounded-xl border font-bold transition-all shrink-0 ${
                      selectedCategory === cat 
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-500/20' 
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Event Catalog Grid */}
            <div className="space-y-6 text-left">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight">Upcoming Active Events</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Explore {sortedEvents.length} events matching your selection</p>
                </div>
              </div>

              {sortedEvents.length === 0 ? (
                <div className="glass rounded-3xl py-16 text-center space-y-4">
                  <SlidersHorizontal className="w-12 h-12 stroke-1 text-slate-500 mx-auto" />
                  <p className="text-sm font-semibold text-slate-300">No events found matching current criteria.</p>
                  <button 
                    onClick={() => { setSearchQuery(''); setSelectedCategory('All'); setSelectedPriceType('All'); }}
                    className="text-primary font-bold text-xs hover:underline"
                  >
                    Reset Explorer Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sortedEvents.map(event => (
                    <EventCard 
                      key={event.id} 
                      event={event} 
                      onSelect={(ev) => setSelectedEvent(ev)} 
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'my-bookings' ? (
          /* ATTENDEE TICKETS VIEW */
          <div className="space-y-6 text-left">
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">My Booked Passes</h2>
              <p className="text-xs text-slate-400">View QR credentials, receipts, and event entries</p>
            </div>

            {bookings.length === 0 ? (
              <div className="glass rounded-3xl py-16 text-center space-y-4">
                <Ticket className="w-12 h-12 stroke-1 text-slate-500 mx-auto" />
                <p className="text-sm font-semibold text-slate-300">No active tickets registered to this profile.</p>
                <button 
                  onClick={() => setActiveTab('discover')}
                  className="bg-primary text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md"
                >
                  Discover Events & Book
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {bookings.map(book => {
                  const isCancelled = book.status === 'cancelled';
                  return (
                    <div 
                      key={book.id} 
                      id={`ticket-${book.id}`}
                      className={`glass rounded-3xl border shadow-lg overflow-hidden flex flex-col md:flex-row ${
                        isCancelled ? 'border-white/5 opacity-60' : 'border-white/10'
                      }`}
                    >
                      {/* Ticket Left: QR Code info */}
                      <div className="p-6 bg-slate-950/40 text-white flex flex-col items-center justify-center shrink-0 md:w-52 relative border-b md:border-b-0 md:border-r border-dashed border-white/10">
                        {/* Decorative ticket notch holes */}
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 md:top-1/2 md:-translate-y-1/2 md:-left-3 w-6 h-6 bg-[#030712] rounded-full z-10 hidden sm:block"></div>
                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:-right-3 w-6 h-6 bg-[#030712] rounded-full z-10 hidden sm:block"></div>

                        {isCancelled ? (
                          <div className="text-center py-6 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider">
                            Cancelled Pass
                          </div>
                        ) : (
                          <div className="text-center space-y-2">
                            {book.qrCodeValue && (
                              <div className="bg-white p-2 rounded-2xl w-36 h-36 mx-auto shadow-inner flex items-center justify-center">
                                <img src={book.qrCodeValue} alt="Check-in Pass QR" className="w-full h-full object-contain" />
                              </div>
                            )}
                            <p className="font-mono text-[9px] text-cyan-400 font-semibold tracking-widest uppercase">ID: {book.id}</p>
                            {book.checkedIn ? (
                              <span className="inline-block bg-emerald-500/20 text-emerald-400 font-bold text-[9px] px-2 py-0.5 rounded-full">
                                Checked In
                              </span>
                            ) : (
                              <span className="inline-block bg-indigo-500/20 text-indigo-400 font-bold text-[9px] px-2 py-0.5 rounded-full animate-pulse">
                                Active Pass
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Ticket Right: Event particulars */}
                      <div className="p-6 flex-1 flex flex-col justify-between">
                        <div className="space-y-2">
                          <span className="text-[9px] bg-white/10 text-slate-300 font-extrabold px-2 py-0.5 rounded-full capitalize">
                            {book.ticketCategory} Allocation
                          </span>
                          <h3 className="font-extrabold text-white text-base line-clamp-1">{book.eventTitle}</h3>
                          
                          <div className="space-y-1 text-[11px] text-slate-300">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-primary" />
                              <span>{book.eventDate} at {book.eventTime}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-primary" />
                              <span className="line-clamp-1">{book.eventLocation}</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                          <div className="text-left">
                            <p className="text-[9px] text-slate-400 font-bold uppercase">Ordered Amount</p>
                            <p className="font-extrabold text-white text-sm">
                              {book.quantity} Seats ({formatINR(book.totalPrice)})
                            </p>
                          </div>

                          {!isCancelled && !book.checkedIn && (
                            <button
                              onClick={async () => {
                                if (window.confirm("Are you sure you want to cancel this booking and initiate a refund?")) {
                                  try {
                                    await cancelBooking(book.id);
                                    showToast("Booking successfully cancelled. Refund processing.", "success");
                                    fetchData();
                                  } catch (err) {
                                    showToast("Cancellation failed.", "error");
                                  }
                                }
                              }}
                              className="text-xs font-bold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              Cancel Pass
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : activeTab === 'organizer-dash' ? (
          /* ORGANIZER HUB VIEW */
          <div className="space-y-8 text-left">
            {/* Header Hub info */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">Organizer Control Desk</h2>
                <p className="text-xs text-slate-400 mt-0.5">Manage live ticket capacities, earnings, and attendee validation</p>
              </div>
              
              <button
                onClick={() => { setEventToEdit(null); setIsCreateModalOpen(true); }}
                className="bg-purple-600 text-white font-bold text-xs px-5 py-3 rounded-2xl shadow-md hover:bg-purple-700 transition-colors flex items-center justify-center gap-1.5 self-start md:self-auto"
              >
                <Plus className="w-4 h-4" />
                Schedule New Event
              </button>
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="glass p-5 rounded-2xl shadow-lg flex items-center gap-4 border border-white/10">
                <div className="p-4 bg-purple-500/10 rounded-xl text-purple-300">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Hosted Events</span>
                  <p className="text-xl font-black text-white">
                    {events.filter(e => e.organizerId === currentUser?.id).length} Active
                  </p>
                </div>
              </div>

              <div className="glass p-5 rounded-2xl shadow-lg flex items-center gap-4 border border-white/10">
                <div className="p-4 bg-emerald-500/10 rounded-xl text-emerald-300">
                  <CircleDollarSign className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Gross Revenues</span>
                  <p className="text-xl font-black text-white">
                    {formatINR(bookings.reduce((sum, b) => b.status === 'booked' ? sum + b.totalPrice : sum, 0))}
                  </p>
                </div>
              </div>

              <div className="glass p-5 rounded-2xl shadow-lg flex items-center gap-4 border border-white/10">
                <div className="p-4 bg-cyan-500/10 rounded-xl text-cyan-300">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Scan-in Rate</span>
                  <p className="text-xl font-black text-white">
                    {bookings.filter(b => b.status === 'booked').length > 0 
                      ? ((bookings.filter(b => b.checkedIn).length / bookings.filter(b => b.status === 'booked').length) * 100).toFixed(0)
                      : "0"}% Attended
                  </p>
                </div>
              </div>
            </div>

            {/* Recharts Analytics Panel */}
            <div className="space-y-4">
              <h3 className="font-extrabold text-white text-base">Analytical Statistics</h3>
              <DashboardCharts 
                events={events} 
                bookings={bookings} 
                mode="organizer" 
                targetOrganizerId={currentUser?.id} 
              />
            </div>

            {/* Hosted Events Table/Grid */}
            <div className="space-y-4 pt-4">
              <h3 className="font-extrabold text-white text-base">Event Allocation Registry</h3>
              
              <div className="glass rounded-2xl shadow-lg overflow-hidden border border-white/10">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white/5 border-b border-white/10 text-slate-300 uppercase tracking-wider font-extrabold">
                      <tr>
                        <th className="p-4">Event details</th>
                        <th className="p-4">Logistics</th>
                        <th className="p-4">Capacity allocations</th>
                        <th className="p-4">Revenue</th>
                        <th className="p-4 text-center">Action commands</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-medium text-slate-300">
                      {events.filter(e => e.organizerId === currentUser?.id).map(e => {
                        const eventBookings = bookings.filter(b => b.eventId === e.id && b.status === 'booked');
                        const seatsBooked = eventBookings.reduce((sum, b) => sum + b.quantity, 0);
                        const revenue = eventBookings.reduce((sum, b) => sum + b.totalPrice, 0);

                        return (
                          <tr key={e.id} className="hover:bg-white/5 transition-colors">
                            <td className="p-4 flex items-center gap-3">
                              <img src={e.bannerUrl} className="w-10 h-10 rounded-lg object-cover shrink-0" referrerPolicy="no-referrer" />
                              <div>
                                <span className="font-bold text-white block line-clamp-1">{e.title}</span>
                                <span className="text-[10px] text-purple-300 bg-purple-500/15 font-bold px-1.5 py-0.5 rounded-md mt-1 inline-block capitalize">{e.category}</span>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className="block text-slate-200 font-bold">{e.date}</span>
                              <span className="text-[10px] text-slate-400 block mt-0.5">{e.location.split(',')[0]}</span>
                            </td>
                            <td className="p-4">
                              <span className="block text-slate-200 font-bold">{seatsBooked} / {e.capacity} sold</span>
                              <div className="w-24 bg-white/10 h-1.5 rounded-full mt-1 overflow-hidden">
                                <div className="bg-purple-600 h-full" style={{ width: `${Math.min(100, (seatsBooked / e.capacity) * 100)}%` }}></div>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className="text-white font-extrabold block">{formatINR(revenue)}</span>
                            </td>
                            <td className="p-4 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    // Fetch bookings for this event
                                    const eventBks = await getBookingsByEventId(e.id);
                                    setScannerEventBookings(eventBks);
                                    setIsScannerOpen(true);
                                  }}
                                  className="p-1.5 bg-white/5 border border-white/10 text-slate-200 hover:bg-slate-900 hover:text-white rounded-lg transition-all"
                                  title="Check-in QR Scanner"
                                >
                                  <Scan className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setEventToEdit(e); setIsCreateModalOpen(true); }}
                                  className="p-1.5 bg-white/5 border border-white/10 text-slate-200 hover:bg-purple-600 hover:text-white rounded-lg transition-all"
                                  title="Edit Event"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteEvent(e.id)}
                                  className="p-1.5 bg-white/5 border border-white/10 text-rose-400 hover:bg-rose-600 hover:text-white rounded-lg transition-all"
                                  title="Delete Event"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'admin-dash' ? (
          /* PLATFORM ADMIN PANEL */
          <div className="space-y-8 text-left">
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">Platform Operations Console</h2>
              <p className="text-xs text-slate-400">Moderation center, user management, and ledger reports</p>
            </div>

            {/* Admin Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="glass p-5 rounded-2xl shadow-lg border border-white/10">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Total Platform Revenue</span>
                <p className="text-2xl font-black text-white mt-1">
                  {systemAnalytics?.totalRevenue ? formatINR(systemAnalytics.totalRevenue) : "₹0"}
                </p>
              </div>
              <div className="glass p-5 rounded-2xl shadow-lg border border-white/10">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Registered accounts</span>
                <p className="text-2xl font-black text-white mt-1">{systemAnalytics?.totalUsers || 0}</p>
              </div>
              <div className="glass p-5 rounded-2xl shadow-lg border border-white/10">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Active allocations</span>
                <p className="text-2xl font-black text-white mt-1">{systemAnalytics?.totalEvents || 0}</p>
              </div>
              <div className="glass p-5 rounded-2xl shadow-lg border border-white/10">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Total checkouts</span>
                <p className="text-2xl font-black text-white mt-1">{systemAnalytics?.totalBookings || 0}</p>
              </div>
            </div>

            {/* Multi-charts for platform */}
            <div className="space-y-4">
              <h3 className="font-extrabold text-white text-base">Global Operational Analytics</h3>
              <DashboardCharts 
                events={events} 
                bookings={bookings} 
                mode="admin" 
              />
            </div>

            {/* Moderation section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* User management table */}
              <div className="glass p-5 rounded-2xl border border-white/10 shadow-lg space-y-4">
                <h4 className="font-extrabold text-white text-sm">User Directory & Role Moderation</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px] font-medium text-slate-300">
                    <thead className="bg-white/5 border-b border-white/10 text-slate-300 font-extrabold uppercase tracking-wider">
                      <tr>
                        <th className="p-3">User</th>
                        <th className="p-3">Email</th>
                        <th className="p-3">Role Status</th>
                        <th className="p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {allUsers.map(u => (
                        <tr key={u.id} className="hover:bg-white/5">
                          <td className="p-3 flex items-center gap-2">
                            <img src={u.profileImg} className="w-6 h-6 rounded-lg object-cover" />
                            <span className="font-bold text-white">{u.name}</span>
                          </td>
                          <td className="p-3 text-slate-400 font-mono">{u.email}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              u.role === 'admin' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : u.role === 'organizer' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-white/10 text-slate-300'
                            }`}>{u.role}</span>
                          </td>
                          <td className="p-3">
                            <select
                              value={u.role}
                              onChange={async (e) => {
                                const newRole = e.target.value as 'attendee' | 'organizer' | 'admin';
                                try {
                                  await updateUserProfile(u.id, { role: newRole });
                                  showToast(`Updated role of ${u.name} to ${newRole}`, 'success');
                                  const users = await getAllUsers();
                                  setAllUsers(users);
                                } catch (err) {
                                  showToast("Failed to modify role", "error");
                                }
                              }}
                              className="bg-white/5 border border-white/10 rounded p-1 text-[10px] text-white"
                            >
                              <option value="attendee" className="bg-slate-900">Attendee</option>
                              <option value="organizer" className="bg-slate-900">Organizer</option>
                              <option value="admin" className="bg-slate-900">Admin</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Moderation panel for events */}
              <div className="glass p-5 rounded-2xl border border-white/10 shadow-lg space-y-4">
                <h4 className="font-extrabold text-white text-sm">Global Event Audit Moderation</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px] font-medium text-slate-300">
                    <thead className="bg-white/5 border-b border-white/10 text-slate-300 font-extrabold uppercase tracking-wider">
                      <tr>
                        <th className="p-3">Event title</th>
                        <th className="p-3">Host</th>
                        <th className="p-3">Rating</th>
                        <th className="p-3">Moderation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {events.map(e => (
                        <tr key={e.id} className="hover:bg-white/5">
                          <td className="p-3">
                            <span className="font-bold text-white block line-clamp-1">{e.title}</span>
                          </td>
                          <td className="p-3 text-slate-400">{e.organizerName}</td>
                          <td className="p-3 font-bold text-white">
                            {e.reviews?.length > 0 
                              ? (e.reviews.reduce((s, r) => s + r.rating, 0) / e.reviews.length).toFixed(1) 
                              : "No reviews"}
                          </td>
                          <td className="p-3">
                            <button
                              onClick={() => handleDeleteEvent(e.id)}
                              className="text-rose-400 hover:text-rose-300 font-bold hover:underline"
                            >
                              Take Down
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* PROFILE SCREEN */
          <div className="max-w-xl mx-auto glass rounded-3xl border border-white/10 p-8 shadow-lg text-left space-y-6">
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">My Credentials & Profile</h2>
              <p className="text-xs text-slate-400 mt-0.5">Maintain security parameters and host/attendee particulars</p>
            </div>

            <div className="flex items-center gap-4 bg-white/5 p-5 rounded-2xl border border-white/10">
              <img src={currentUser?.profileImg} className="w-16 h-16 rounded-2xl object-cover" />
              <div>
                <h3 className="font-extrabold text-white text-base">{currentUser?.name}</h3>
                <p className="text-xs text-slate-400">{currentUser?.email}</p>
                <span className="inline-block bg-primary/20 text-indigo-300 font-bold text-[10px] px-2 py-0.5 rounded-full mt-1.5 uppercase tracking-wider">{currentUser?.role} Account</span>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Company / Organization affiliation</label>
                <input
                  type="text"
                  placeholder="e.g. Guild Events Inc."
                  value={profileCompany}
                  onChange={(e) => setProfileCompany(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Professional Bio</label>
                <textarea
                  rows={4}
                  placeholder="Describe your interests, background, and hosting parameters..."
                  value={profileBio}
                  onChange={(e) => setProfileBio(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-xs focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-primary hover:bg-opacity-90 text-white font-bold py-3 rounded-2xl text-xs shadow-md transition-all"
              >
                Save Credentials
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Floating Action Modal Drawer Overlays */}

      {/* SECURE CHECKOUT WINDOW */}
      {isCheckoutOpen && selectedEvent && (
        <CheckoutModal 
          event={selectedEvent} 
          onClose={() => setIsCheckoutOpen(false)} 
          onSuccess={(bk) => {
            setIsCheckoutOpen(false);
            showToast("Transaction verified! Ticket pass issued.", "success");
            fetchData();
            setActiveTab('my-bookings');
            setSelectedEvent(null);
          }} 
        />
      )}

      {/* CREATE / EDIT EVENT WINDOW */}
      {isCreateModalOpen && (
        <CreateEventModal
          eventToEdit={eventToEdit}
          onClose={() => { setIsCreateModalOpen(false); setEventToEdit(null); }}
          onSuccess={(ev) => {
            setIsCreateModalOpen(false);
            setEventToEdit(null);
            showToast(eventToEdit ? "Event updated successfully" : "Event deployed live to state", "success");
            fetchData();
          }}
        />
      )}

      {/* ORGANIZER QR CHECK-IN TERMINAL */}
      {isScannerOpen && (
        <QRScannerModal
          onClose={() => { setIsScannerOpen(false); setScannerEventBookings([]); }}
          activeEventBookings={scannerEventBookings}
          onCheckInSuccess={() => {
            fetchData();
          }}
        />
      )}

      {/* NOTIFICATIONS DRAWER */}
      <NotificationDrawer
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        notifications={notifications}
        onRefresh={() => fetchData()}
      />

      {/* SECURE GATEWAY / AUTHENTICATION MODAL */}
      {isAuthModalOpen && (
        <AuthModal 
          onClose={() => setIsAuthModalOpen(false)} 
          onSuccess={(msg) => showToast(msg, "success")}
        />
      )}

      {/* Footer bar */}
      <footer className="glass border-t border-white/10 py-6 text-center text-xs text-slate-400 mt-12 shrink-0">
        <p>© 2026 EventHub. Scalable Cloud Event Management System. Built using Google Cloud & Firebase Firestore.</p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <EventHubAppContent />
    </AuthProvider>
  );
}
