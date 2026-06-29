import React from 'react';
import { X, Bell, Check, Inbox, Ticket, CreditCard, Sparkles, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Notification } from '../types';
import { markNotificationRead } from '../lib/firebase';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onRefresh: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ isOpen, onClose, notifications, onRefresh }) => {
  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'booking':
        return <Ticket className="w-4 h-4 text-primary" />;
      case 'payment':
        return <CreditCard className="w-4 h-4 text-emerald-500" />;
      case 'event':
        return <Sparkles className="w-4 h-4 text-indigo-500" />;
      default:
        return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-md"
          />

          {/* Drawer Body */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full max-w-sm glass h-full shadow-2xl flex flex-col z-10 border-l border-white/10"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                <h3 className="font-extrabold text-white text-base">State Notifications</h3>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-white/10 rounded-full text-slate-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {notifications.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                  <Inbox className="w-12 h-12 stroke-1 mb-2 text-slate-500" />
                  <p className="text-xs font-semibold text-slate-300">Inbox is Empty</p>
                  <p className="text-[10px] text-slate-500 mt-1">We will log security and booking states here.</p>
                </div>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      n.read 
                        ? 'bg-white/5 border-white/5 opacity-60' 
                        : 'bg-white/10 border-indigo-500/20 shadow-sm ring-1 ring-white/5'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="p-2 bg-white/10 rounded-xl shrink-0 mt-0.5">
                        {getIcon(n.type)}
                      </div>
                      <div className="flex-1 text-left">
                        <h4 className="font-bold text-white text-xs">{n.title}</h4>
                        <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">{n.message}</p>
                        <span className="text-[9px] text-slate-400 font-medium block mt-2">{n.createdAt}</span>
                      </div>

                      {!n.read && (
                        <button
                          onClick={() => handleMarkRead(n.id)}
                          className="p-1 bg-white/15 text-primary hover:bg-primary hover:text-white rounded-lg transition-colors shrink-0"
                          title="Mark read"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
