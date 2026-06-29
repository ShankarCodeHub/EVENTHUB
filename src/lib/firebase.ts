import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  getDocFromServer
} from 'firebase/firestore';
import { Event, Booking, User, Coupon, Notification, SystemAnalytics, Review } from '../types';

// Hardcoded Firebase Config from firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyDOlulsaeubxVTsmCHaz-WWC_FOVzKndDk",
  authDomain: "studious-territory-85jvd.firebaseapp.com",
  projectId: "studious-territory-85jvd",
  storageBucket: "studious-territory-85jvd.firebasestorage.app",
  messagingSenderId: "674448188510",
  appId: "1:674448188510:web:45fd8b5ec00842d54000cf"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore with custom databaseId if provided, otherwise default
const db = getFirestore(app, "ai-studio-60a0bcee-2797-4b1f-a7eb-9577cbe02e9c");

export { db };

// ==========================================
// ERROR HANDLING DEFINED IN FIREBASE SKILL
// ==========================================
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate Connection to Firestore on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

// ==========================================
// SEEDING DEFAULT DATA
// ==========================================
const DEFAULT_EVENTS: Event[] = [
  {
    id: "event_1",
    title: "Global Tech Summit 2026",
    description: "The premier gathering for developers, tech leaders, and innovators worldwide. Join us for keynote speeches, hands-on workshops, and networking with experts from Google, Microsoft, Meta, and OpenAI. Topics include Generative AI, Next-Gen Web, Cloud Computing, and Quantum Technology.",
    category: "Technology",
    bannerUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=80",
    location: "Moscone Center, San Francisco, CA",
    date: "2026-08-15",
    time: "09:00",
    capacity: 500,
    price: 199,
    organizerId: "organizer_demo",
    organizerName: "Tech Pioneers Guild",
    status: "published",
    ticketCategories: [
      { name: "General Admission", price: 199, capacity: 350, sold: 120 },
      { name: "VIP Experience", price: 499, capacity: 100, sold: 45 },
      { name: "Student Pass", price: 79, capacity: 50, sold: 30 }
    ],
    gallery: [
      "https://images.unsplash.com/photo-1511578314322-379afb476865?w=600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=600&auto=format&fit=crop&q=80"
    ],
    reviews: [
      { id: "rev_1", userId: "user_1", userName: "Sarah Jenkins", rating: 5, comment: "Absolutely mind-blowing talks! The AI panels were outstanding.", createdAt: "2026-06-20" },
      { id: "rev_2", userId: "user_2", userName: "Marcus Vance", rating: 4, comment: "Great organization, but the VIP lunch queues were slightly long. Content was top tier.", createdAt: "2026-06-25" }
    ],
    featured: true
  },
  {
    id: "event_2",
    title: "Symphony Under the Stars",
    description: "Experience an enchanting evening of classical masterpieces performed by the Metropolitan Philharmonic Orchestra under the open summer sky. Featuring compositions from Mozart, Beethoven, and Tchaikovsky. Bring your own picnic blankets and enjoy gourmet food trucks on-site.",
    category: "Music & Arts",
    bannerUrl: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=1200&auto=format&fit=crop&q=80",
    location: "Central Park Great Lawn, New York, NY",
    date: "2026-07-24",
    time: "19:30",
    capacity: 1500,
    price: 35,
    organizerId: "organizer_demo",
    organizerName: "Metropolitan Arts Council",
    status: "published",
    ticketCategories: [
      { name: "Lawn Pass", price: 35, capacity: 1200, sold: 450 },
      { name: "Front Row Seating", price: 95, capacity: 200, sold: 180 },
      { name: "VIP Patron Box", price: 250, capacity: 100, sold: 65 }
    ],
    gallery: [
      "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=600&auto=format&fit=crop&q=80"
    ],
    reviews: [
      { id: "rev_3", userId: "user_3", userName: "David Kim", rating: 5, comment: "Stunning performance. Sound quality on the lawn was flawless.", createdAt: "2026-06-28" }
    ],
    featured: true
  },
  {
    id: "event_3",
    title: "Culinary Masterclass: Modern Gastronomy",
    description: "An exclusive hands-on masterclass led by 3-Michelin-starred Chef Elena Rostova. Learn the art of molecular gastronomy, precision plating, and advanced flavor profiles. All high-end ingredients, professional apron, and a paired wine tasting are included.",
    category: "Food & Drinks",
    bannerUrl: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1200&auto=format&fit=crop&q=80",
    location: "La Cuisine Culinary Institute, Chicago, IL",
    date: "2026-09-05",
    time: "11:00",
    capacity: 30,
    price: 299,
    organizerId: "organizer_2",
    organizerName: "Chef Rostova Masterclasses",
    status: "published",
    ticketCategories: [
      { name: "Single Attendee Station", price: 299, capacity: 24, sold: 18 },
      { name: "Shared Couple Station", price: 549, capacity: 6, sold: 4 }
    ],
    gallery: [
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&auto=format&fit=crop&q=80"
    ],
    reviews: [],
    featured: false
  },
  {
    id: "event_4",
    title: "Vibrant Indie Film Showcase",
    description: "An intimate weekend celebration of independent storytelling. Screening 12 award-winning short films and 3 feature documentaries from breakout filmmakers globally. Includes live director Q&A sessions, panel discussions, and an opening reception party.",
    category: "Music & Arts",
    bannerUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&auto=format&fit=crop&q=80",
    location: "The Roxy Theatre, Los Angeles, CA",
    date: "2026-07-10",
    time: "15:00",
    capacity: 250,
    price: 45,
    organizerId: "organizer_2",
    organizerName: "Roxy Indie Cinema Society",
    status: "published",
    ticketCategories: [
      { name: "Weekend Pass", price: 45, capacity: 200, sold: 110 },
      { name: "Opening Night Ticket", price: 25, capacity: 50, sold: 50 }
    ],
    gallery: [],
    reviews: [],
    featured: false
  },
  {
    id: "event_5",
    title: "Mindfulness & Zen Yoga Retreat",
    description: "Rejuvenate your body, mind, and spirit at this immersive one-day retreat. Enjoy guided meditations, restorative yoga flows, somatic sound baths, and a delicious plant-based lunch. Hosted in a tranquil, wood-framed mountain sanctuary with professional instructors.",
    category: "Health & Wellness",
    bannerUrl: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1200&auto=format&fit=crop&q=80",
    location: "Shambhala Mountain Sanctuary, Boulder, CO",
    date: "2026-10-12",
    time: "08:00",
    capacity: 60,
    price: 125,
    organizerId: "organizer_demo",
    organizerName: "Shambhala Yoga",
    status: "published",
    ticketCategories: [
      { name: "Full Day Pass", price: 125, capacity: 50, sold: 15 },
      { name: "Patron Premium Pass", price: 195, capacity: 10, sold: 2 }
    ],
    gallery: [],
    reviews: [],
    featured: false
  }
];

const DEFAULT_USERS: User[] = [
  {
    id: "attendee_demo",
    email: "attendee@eventhub.com",
    name: "Alex Rivera",
    role: "attendee",
    joinedAt: "2026-01-10",
    profileImg: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
    bio: "Event enthusiast, foodie, and music lover looking to experience the best cultural, artistic, and technological meetups."
  },
  {
    id: "organizer_demo",
    email: "organizer@eventhub.com",
    name: "Tech Pioneers Guild",
    role: "organizer",
    joinedAt: "2026-01-05",
    profileImg: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    bio: "We organize premier technological summits and masterclasses for professional growth.",
    company: "Guild Events Inc."
  },
  {
    id: "admin_demo",
    email: "admin@eventhub.com",
    name: "Devin Mercer (Admin)",
    role: "admin",
    joinedAt: "2025-12-01",
    profileImg: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
    bio: "Head Platform Moderator and Operations Lead at EventHub."
  }
];

const DEFAULT_COUPONS: Coupon[] = [
  { id: "coupon_1", code: "WELCOME10", discountPercent: 10, active: true, expiresAt: "2026-12-31" },
  { id: "coupon_2", code: "SUMMER25", discountPercent: 25, active: true, expiresAt: "2026-08-31" },
  { id: "coupon_3", code: "VIPEXTREME", discountPercent: 50, active: false, expiresAt: "2026-06-30" }
];

const DEFAULT_BOOKINGS: Booking[] = [
  {
    id: "booking_1",
    eventId: "event_1",
    eventTitle: "Global Tech Summit 2026",
    eventDate: "2026-08-15",
    eventTime: "09:00",
    eventLocation: "Moscone Center, San Francisco, CA",
    eventBannerUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=80",
    attendeeId: "attendee_demo",
    attendeeName: "Alex Rivera",
    attendeeEmail: "attendee@eventhub.com",
    ticketCategory: "VIP Experience",
    quantity: 1,
    totalPrice: 499,
    status: "booked",
    qrCodeValue: "booking_1",
    checkedIn: false,
    paymentId: "pay_xyz_12345",
    bookedAt: "2026-06-15 14:32:00"
  },
  {
    id: "booking_2",
    eventId: "event_2",
    eventTitle: "Symphony Under the Stars",
    eventDate: "2026-07-24",
    eventTime: "19:30",
    eventLocation: "Central Park Great Lawn, New York, NY",
    eventBannerUrl: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=1200&auto=format&fit=crop&q=80",
    attendeeId: "attendee_demo",
    attendeeName: "Alex Rivera",
    attendeeEmail: "attendee@eventhub.com",
    ticketCategory: "Lawn Pass",
    quantity: 2,
    totalPrice: 70,
    status: "booked",
    qrCodeValue: "booking_2",
    checkedIn: true,
    checkedInAt: "2026-06-25 19:45:00",
    paymentId: "pay_abc_67890",
    bookedAt: "2026-06-10 10:15:00"
  }
];

// Seed initial data if collections are empty
export async function seedDatabaseIfNeeded() {
  try {
    let userSnap;
    try {
      userSnap = await getDocs(collection(db, 'users'));
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'users');
    }

    if (userSnap && userSnap.empty) {
      console.log('Seeding initial users...');
      for (const u of DEFAULT_USERS) {
        try {
          await setDoc(doc(db, 'users', u.id), u);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${u.id}`);
        }
      }
    }

    let eventSnap;
    try {
      eventSnap = await getDocs(collection(db, 'events'));
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'events');
    }

    if (eventSnap && eventSnap.empty) {
      console.log('Seeding initial events...');
      for (const ev of DEFAULT_EVENTS) {
        try {
          await setDoc(doc(db, 'events', ev.id), ev);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `events/${ev.id}`);
        }
      }
    }

    let couponSnap;
    try {
      couponSnap = await getDocs(collection(db, 'coupons'));
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'coupons');
    }

    if (couponSnap && couponSnap.empty) {
      console.log('Seeding initial coupons...');
      for (const cp of DEFAULT_COUPONS) {
        try {
          await setDoc(doc(db, 'coupons', cp.id), cp);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `coupons/${cp.id}`);
        }
      }
    }

    let bookingSnap;
    try {
      bookingSnap = await getDocs(collection(db, 'bookings'));
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'bookings');
    }

    if (bookingSnap && bookingSnap.empty) {
      console.log('Seeding initial bookings...');
      for (const bk of DEFAULT_BOOKINGS) {
        try {
          await setDoc(doc(db, 'bookings', bk.id), bk);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `bookings/${bk.id}`);
        }
      }
    }

    // Ensure the specific Sports event of 1 rupee exists for testing
    const sportsEventId = "event_sports_1";
    try {
      const sportsEventDocRef = doc(db, 'events', sportsEventId);
      const docSnap = await getDoc(sportsEventDocRef);
      if (!docSnap.exists()) {
        console.log('Seeding 1-Rupee Sports Event...');
        const sportsEvent: Event = {
          id: sportsEventId,
          title: "Championship Cricket Match 2026",
          description: "Join the live stadium experience for the epic sports showdown of the season! Book this ticket for just ₹1 to test and verify the real-time UPI and RuPay payment workflows seamlessly.",
          category: "Sports",
          bannerUrl: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1200&auto=format&fit=crop&q=80",
          location: "Chinnaswamy Stadium, Bengaluru, India",
          date: "2026-07-15",
          time: "18:00",
          capacity: 1100,
          price: 0.0125, // 0.0125 * 80 = 1 INR
          organizerId: "organizer_demo",
          organizerName: "Uma Shankar Sports League",
          status: "published",
          ticketCategories: [
            { name: "Standard Pass", price: 0.0125, capacity: 1000, sold: 5 },
            { name: "VIP Grandstand", price: 0.0625, capacity: 100, sold: 1 }
          ],
          gallery: [
            "https://images.unsplash.com/photo-1540747737956-378724044432?w=600&auto=format&fit=crop&q=80"
          ],
          reviews: [],
          featured: true
        };
        await setDoc(sportsEventDocRef, sportsEvent);
        console.log("Successfully seeded 1-Rupee Sports Event.");
      }
    } catch (err) {
      console.error("Failed to seed sports event:", err);
    }

    console.log('Seeding check completed successfully.');
  } catch (error) {
    console.error('Database seeding failed:', error);
    throw error;
  }
}

// ==========================================
// DB SERVICE METHODS
// ==========================================

// --- USERS SERVICE ---
export async function getUserProfile(userId: string): Promise<User | null> {
  const docRef = doc(db, 'users', userId);
  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as User;
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/${userId}`);
    return null;
  }
}

export async function updateUserProfile(userId: string, data: Partial<User>): Promise<User> {
  const docRef = doc(db, 'users', userId);
  try {
    await updateDoc(docRef, data);
    const snap = await getDoc(docRef);
    return snap.data() as User;
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
    throw err;
  }
}

export async function createUser(user: User): Promise<void> {
  try {
    await setDoc(doc(db, 'users', user.id), user);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `users/${user.id}`);
  }
}

export async function getAllUsers(): Promise<User[]> {
  try {
    const snap = await getDocs(collection(db, 'users'));
    const users: User[] = [];
    snap.forEach(d => users.push(d.data() as User));
    return users;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'users');
    return [];
  }
}

// --- EVENTS SERVICE ---
export async function getEvents(): Promise<Event[]> {
  try {
    const snap = await getDocs(collection(db, 'events'));
    const events: Event[] = [];
    snap.forEach(d => {
      events.push({ id: d.id, ...d.data() } as Event);
    });
    return events;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'events');
    return [];
  }
}

export async function getEventById(eventId: string): Promise<Event | null> {
  const docRef = doc(db, 'events', eventId);
  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as Event;
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `events/${eventId}`);
    return null;
  }
}

export async function createEvent(eventData: Omit<Event, 'id'> & { id?: string }): Promise<Event> {
  const eventId = eventData.id || "event_" + Math.random().toString(36).substring(2, 11);
  const fullEvent = { ...eventData, id: eventId } as Event;
  try {
    await setDoc(doc(db, 'events', eventId), fullEvent);
    return fullEvent;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `events/${eventId}`);
    throw err;
  }
}

export async function updateEvent(eventId: string, eventData: Partial<Event>): Promise<Event> {
  const docRef = doc(db, 'events', eventId);
  try {
    await updateDoc(docRef, eventData);
    const snap = await getDoc(docRef);
    return { id: snap.id, ...snap.data() } as Event;
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `events/${eventId}`);
    throw err;
  }
}

export async function deleteEvent(eventId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'events', eventId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `events/${eventId}`);
  }
}

// Add Review to Event
export async function addEventReview(eventId: string, review: Review): Promise<Event> {
  try {
    const event = await getEventById(eventId);
    if (!event) throw new Error("Event not found");
    
    const reviews = [...(event.reviews || []), review];
    return await updateEvent(eventId, { reviews });
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('{')) {
      throw err;
    }
    handleFirestoreError(err, OperationType.UPDATE, `events/${eventId}`);
    throw err;
  }
}

// --- BOOKINGS SERVICE ---
export async function getBookingsByUserId(userId: string): Promise<Booking[]> {
  try {
    const q = query(collection(db, 'bookings'), where('attendeeId', '==', userId));
    const snap = await getDocs(q);
    const bookings: Booking[] = [];
    snap.forEach(d => {
      bookings.push({ id: d.id, ...d.data() } as Booking);
    });
    return bookings.sort((a, b) => b.bookedAt.localeCompare(a.bookedAt));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'bookings');
    return [];
  }
}

export async function getBookingsByEventId(eventId: string): Promise<Booking[]> {
  try {
    const q = query(collection(db, 'bookings'), where('eventId', '==', eventId));
    const snap = await getDocs(q);
    const bookings: Booking[] = [];
    snap.forEach(d => {
      bookings.push({ id: d.id, ...d.data() } as Booking);
    });
    return bookings;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'bookings');
    return [];
  }
}

export async function getBookingById(bookingId: string): Promise<Booking | null> {
  const docRef = doc(db, 'bookings', bookingId);
  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as Booking;
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `bookings/${bookingId}`);
    return null;
  }
}

export async function createBooking(bookingData: Omit<Booking, 'id'>): Promise<Booking> {
  const bookingId = "book_" + Math.random().toString(36).substring(2, 11);
  const fullBooking = { ...bookingData, id: bookingId } as Booking;
  
  try {
    // Save booking
    await setDoc(doc(db, 'bookings', bookingId), fullBooking);

    // Update event sold count
    const event = await getEventById(bookingData.eventId);
    if (event) {
      const updatedCategories = event.ticketCategories.map(cat => {
        if (cat.name === bookingData.ticketCategory) {
          return { ...cat, sold: cat.sold + bookingData.quantity };
        }
        return cat;
      });
      await updateEvent(event.id, { ticketCategories: updatedCategories });
    }

    // Create success notification for user
    await createNotification({
      userId: bookingData.attendeeId,
      title: "Ticket Booked Successfully!",
      message: `You booked ${bookingData.quantity}x ${bookingData.ticketCategory} tickets for ${bookingData.eventTitle}.`,
      type: 'booking'
    });

    return fullBooking;
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('{')) {
      throw err;
    }
    handleFirestoreError(err, OperationType.CREATE, `bookings/${bookingId}`);
    throw err;
  }
}

export async function cancelBooking(bookingId: string): Promise<Booking> {
  try {
    const booking = await getBookingById(bookingId);
    if (!booking) throw new Error("Booking not found");

    await updateDoc(doc(db, 'bookings', bookingId), { status: 'cancelled' });

    // Refund ticket sold count
    const event = await getEventById(booking.eventId);
    if (event) {
      const updatedCategories = event.ticketCategories.map(cat => {
        if (cat.name === booking.ticketCategory) {
          return { ...cat, sold: Math.max(0, cat.sold - booking.quantity) };
        }
        return cat;
      });
      await updateEvent(event.id, { ticketCategories: updatedCategories });
    }

    // Create notification
    await createNotification({
      userId: booking.attendeeId,
      title: "Booking Cancelled",
      message: `Your booking for ${booking.eventTitle} has been cancelled and a refund is being initiated.`,
      type: 'booking'
    });

    const updatedSnap = await getDoc(doc(db, 'bookings', bookingId));
    return { id: updatedSnap.id, ...updatedSnap.data() } as Booking;
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('{')) {
      throw err;
    }
    handleFirestoreError(err, OperationType.UPDATE, `bookings/${bookingId}`);
    throw err;
  }
}

// Perform QR Code Check-In
export async function checkInBooking(bookingId: string): Promise<{ success: boolean; message: string; booking?: Booking }> {
  try {
    const booking = await getBookingById(bookingId);
    if (!booking) {
      return { success: false, message: "Invalid booking QR Code." };
    }

    if (booking.status === 'cancelled') {
      return { success: false, message: "This booking has been cancelled." };
    }

    if (booking.checkedIn) {
      return { 
        success: false, 
        message: `Already checked in at ${new Date(booking.checkedInAt || '').toLocaleTimeString()}.` 
      };
    }

    const checkInTime = new Date().toISOString().replace('T', ' ').substring(0, 19);
    await updateDoc(doc(db, 'bookings', bookingId), {
      checkedIn: true,
      checkedInAt: checkInTime
    });

    const updatedBooking = await getBookingById(bookingId);
    return { 
      success: true, 
      message: "Check-in successful! Welcome to the event.", 
      booking: updatedBooking || undefined 
    };
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('{')) {
      throw err;
    }
    handleFirestoreError(err, OperationType.UPDATE, `bookings/${bookingId}`);
    return { success: false, message: "Check-in failed due to server error." };
  }
}

// --- COUPONS SERVICE ---
export async function validateCoupon(code: string): Promise<Coupon | null> {
  try {
    const q = query(collection(db, 'coupons'), where('code', '==', code.toUpperCase()), where('active', '==', true));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const c = snap.docs[0].data() as Coupon;
    // Check expiry
    if (new Date(c.expiresAt) < new Date()) return null;
    return c;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'coupons');
    return null;
  }
}

// --- NOTIFICATIONS SERVICE ---
export async function getNotifications(userId: string): Promise<Notification[]> {
  try {
    const q = query(collection(db, 'notifications'), where('userId', '==', userId));
    const snap = await getDocs(q);
    const notifications: Notification[] = [];
    snap.forEach(d => {
      notifications.push({ id: d.id, ...d.data() } as Notification);
    });
    return notifications.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'notifications');
    return [];
  }
}

export async function createNotification(notifData: Omit<Notification, 'id' | 'createdAt' | 'read'>): Promise<Notification> {
  const notifId = "notif_" + Math.random().toString(36).substring(2, 11);
  const fullNotif = {
    ...notifData,
    id: notifId,
    read: false,
    createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
  } as Notification;

  try {
    await setDoc(doc(db, 'notifications', notifId), fullNotif);
    return fullNotif;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `notifications/${notifId}`);
    throw err;
  }
}

export async function markNotificationRead(notifId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'notifications', notifId), { read: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `notifications/${notifId}`);
  }
}

// --- ANALYTICS & REVENUE SERVICE ---
export async function getSystemAnalytics(): Promise<SystemAnalytics> {
  try {
    const users = await getAllUsers();
    const events = await getEvents();
    
    const bookingsSnap = await getDocs(collection(db, 'bookings'));
    let totalRevenue = 0;
    let totalBookings = 0;
    
    bookingsSnap.forEach(d => {
      const booking = d.data() as Booking;
      if (booking.status === 'booked') {
        totalRevenue += booking.totalPrice;
        totalBookings += 1;
      }
    });

    return {
      totalUsers: users.length,
      totalEvents: events.length,
      totalRevenue,
      totalBookings
    };
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('{')) {
      throw err;
    }
    handleFirestoreError(err, OperationType.LIST, 'bookings');
    throw err;
  }
}
