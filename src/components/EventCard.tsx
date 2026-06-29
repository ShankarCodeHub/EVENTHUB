import React from 'react';
import { Calendar, MapPin, Tag, Users, Star } from 'lucide-react';
import { motion } from 'motion/react';
import { Event } from '../types';
import { formatINR } from '../utils/currency';

interface EventCardProps {
  event: Event;
  onSelect: (event: Event) => void;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onSelect }) => {
  // Calculate average rating
  const averageRating = event.reviews && event.reviews.length > 0
    ? (event.reviews.reduce((acc, r) => acc + r.rating, 0) / event.reviews.length).toFixed(1)
    : null;

  // Calculate remaining tickets
  const totalCapacity = event.ticketCategories.reduce((sum, cat) => sum + cat.capacity, 0);
  const totalSold = event.ticketCategories.reduce((sum, cat) => sum + cat.sold, 0);
  const remaining = Math.max(0, totalCapacity - totalSold);
  const isSoldOut = remaining === 0;

  // Format date
  const formattedDate = new Date(event.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <motion.div
      layoutId={`event-card-${event.id}`}
      id={`event-card-${event.id}`}
      whileHover={{ y: -6, scale: 1.01 }}
      className="glass rounded-2xl shadow-lg border border-white/10 overflow-hidden flex flex-col cursor-pointer transition-all hover:shadow-2xl hover:border-white/20 relative"
      onClick={() => onSelect(event)}
    >
      {/* Banner Image */}
      <div className="relative h-48 w-full overflow-hidden bg-slate-950/45">
        <img
          src={event.bannerUrl}
          alt={event.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
        />
        
        {/* Category Badge */}
        <span className="absolute top-4 left-4 glass text-white font-semibold text-xs px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1">
          <Tag className="w-3.5 h-3.5 text-accent" />
          {event.category}
        </span>

        {/* Rating Badge */}
        {averageRating && (
          <span className="absolute top-4 right-4 bg-amber-500 text-white font-bold text-xs px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1">
            <Star className="w-3.5 h-3.5 fill-current" />
            {averageRating}
          </span>
        )}

        {/* Price Tag Overlay */}
        <div className="absolute bottom-4 right-4 bg-primary text-white font-bold text-sm px-3.5 py-1.5 rounded-xl shadow-lg">
          {event.price === 0 ? "FREE" : `${formatINR(event.price)}+`}
        </div>
      </div>

      {/* Content Details */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Organiser Info */}
          <p className="text-xs text-slate-400 font-medium mb-1">
            Hosted by {event.organizerName}
          </p>

          <h3 className="text-lg font-bold text-white line-clamp-1 mb-2 hover:text-primary transition-colors">
            {event.title}
          </h3>

          <p className="text-sm text-slate-300 line-clamp-2 mb-4">
            {event.description}
          </p>
        </div>

        {/* Metadata Details */}
        <div className="space-y-2 border-t border-white/10 pt-4 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary shrink-0" />
            <span>{formattedDate} at {event.time}</span>
          </div>

          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary shrink-0" />
            <span className="line-clamp-1">{event.location}</span>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-slate-400" />
              <span>
                {isSoldOut ? (
                  <span className="text-rose-400 font-semibold">Sold Out</span>
                ) : (
                  <span>{remaining} / {totalCapacity} seats left</span>
                )}
              </span>
            </div>
            
            {/* Dynamic Status indicators */}
            {!isSoldOut && remaining < (totalCapacity * 0.2) && (
              <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold px-2 py-0.5 rounded text-[10px] animate-pulse">
                Filling Fast
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
