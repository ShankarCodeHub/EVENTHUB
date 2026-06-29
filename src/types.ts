export type UserRole = 'attendee' | 'organizer' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  joinedAt: string;
  profileImg: string;
  bio?: string;
  company?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  password?: string;
  twoFactorSecret?: string;
  twoFactorEnabled?: boolean;
}

export interface TicketCategory {
  name: string;
  price: number;
  capacity: number;
  sold: number;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  category: string;
  bannerUrl: string;
  location: string;
  date: string;
  time: string;
  capacity: number;
  price: number; // Base or starting price
  organizerId: string;
  organizerName: string;
  status: 'draft' | 'published';
  ticketCategories: TicketCategory[];
  gallery: string[];
  reviews: Review[];
  featured?: boolean;
}

export interface Booking {
  id: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  eventBannerUrl: string;
  attendeeId: string;
  attendeeName: string;
  attendeeEmail: string;
  ticketCategory: string;
  quantity: number;
  totalPrice: number;
  status: 'booked' | 'cancelled';
  qrCodeValue: string; // The text encoded in QR: "booking_id"
  checkedIn: boolean;
  checkedInAt?: string;
  paymentId: string;
  bookedAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountPercent: number;
  active: boolean;
  expiresAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  type: 'booking' | 'payment' | 'event' | 'system';
}

export interface SystemAnalytics {
  totalUsers: number;
  totalEvents: number;
  totalRevenue: number;
  totalBookings: number;
}
