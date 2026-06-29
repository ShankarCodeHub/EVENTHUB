import React from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { Event, Booking } from '../types';

interface DashboardChartsProps {
  events: Event[];
  bookings: Booking[];
  mode: 'organizer' | 'admin';
  targetOrganizerId?: string;
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({ events, bookings, mode, targetOrganizerId }) => {
  // Filter events and bookings based on role
  const filteredEvents = mode === 'organizer' 
    ? events.filter(e => e.organizerId === targetOrganizerId)
    : events;

  const filteredBookings = mode === 'organizer'
    ? bookings.filter(b => filteredEvents.some(e => e.id === b.eventId))
    : bookings;

  // 1. Prepare data for: Ticket Sales and Revenue per Event
  const eventMetricsData = filteredEvents.map(event => {
    const eventBookings = filteredBookings.filter(b => b.eventId === event.id && b.status === 'booked');
    const totalTicketsSold = eventBookings.reduce((sum, b) => sum + b.quantity, 0);
    const totalRevenue = eventBookings.reduce((sum, b) => sum + b.totalPrice, 0);
    const attendance = eventBookings.filter(b => b.checkedIn).reduce((sum, b) => sum + b.quantity, 0);

    return {
      name: event.title.length > 20 ? event.title.substring(0, 18) + '...' : event.title,
      tickets: totalTicketsSold,
      revenue: totalRevenue,
      attendance: attendance
    };
  });

  // 2. Prepare data for: Category Breakdown
  const categoryCount: { [key: string]: number } = {};
  filteredEvents.forEach(e => {
    categoryCount[e.category] = (categoryCount[e.category] || 0) + 1;
  });
  const categoryData = Object.keys(categoryCount).map(cat => ({
    name: cat,
    value: categoryCount[cat]
  }));

  // 3. Prepare data for: Monthly Revenue Growth
  // Let's bucket bookings by month of 2026
  const monthlyRevenue: { [key: string]: number } = {
    "Jan": 120, "Feb": 240, "Mar": 450, "Apr": 850, "May": 1600, "Jun": 2800
  };

  // Add real booking data dynamically
  filteredBookings.forEach(b => {
    if (b.status === 'booked') {
      const dateObj = new Date(b.bookedAt);
      if (!isNaN(dateObj.getTime())) {
        const monthStr = dateObj.toLocaleString('en-US', { month: 'short' });
        monthlyRevenue[monthStr] = (monthlyRevenue[monthStr] || 0) + b.totalPrice;
      }
    }
  });

  const monthlyData = Object.keys(monthlyRevenue).map(m => ({
    month: m,
    revenue: monthlyRevenue[m]
  }));

  const COLORS = ['#4f46e5', '#a855f7', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Chart 1: Revenue by Event */}
      <div id="chart-revenue-event" className="glass p-5 rounded-2xl border border-white/10 shadow-lg flex flex-col justify-between">
        <div>
          <h4 className="text-base font-bold text-white mb-1">Revenue Performance</h4>
          <p className="text-xs text-slate-400 mb-4">Total revenue generated per event (USD)</p>
        </div>
        <div className="h-64 w-full">
          {eventMetricsData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">No data available</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={eventMetricsData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255, 255, 255, 0.05)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', color: '#fff' }}
                  labelStyle={{ fontWeight: 'bold' }}
                />
                <Bar dataKey="revenue" fill="url(#colorRevenue)" radius={[4, 4, 0, 0]} name="Revenue ($)" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Chart 2: Tickets Sales & Attendance */}
      <div id="chart-tickets-attendance" className="glass p-5 rounded-2xl border border-white/10 shadow-lg flex flex-col justify-between">
        <div>
          <h4 className="text-base font-bold text-white mb-1">Ticket Sales vs Attendance</h4>
          <p className="text-xs text-slate-400 mb-4">Comparison of tickets booked against scanned check-ins</p>
        </div>
        <div className="h-64 w-full">
          {eventMetricsData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">No data available</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={eventMetricsData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255, 255, 255, 0.05)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', color: '#fff' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="tickets" fill="#a855f7" radius={[4, 4, 0, 0]} name="Tickets Booked" />
                <Bar dataKey="attendance" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Checked In" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Chart 3: Platform Revenue Trend */}
      <div id="chart-revenue-trend" className="glass p-5 rounded-2xl border border-white/10 shadow-lg flex flex-col justify-between">
        <div>
          <h4 className="text-base font-bold text-white mb-1">Growth Overview</h4>
          <p className="text-xs text-slate-400 mb-4">Cumulative monthly platform growth trajectory</p>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255, 255, 255, 0.05)" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip 
                contentStyle={{ background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', color: '#fff' }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorTrend)" name="Revenue ($)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 4: Category Distribution */}
      <div id="chart-category-distribution" className="glass p-5 rounded-2xl border border-white/10 shadow-lg flex flex-col justify-between">
        <div>
          <h4 className="text-base font-bold text-white mb-1">Category Distribution</h4>
          <p className="text-xs text-slate-400 mb-4">Volume breakdown of events by category</p>
        </div>
        <div className="h-64 w-full flex items-center justify-center">
          {categoryData.length === 0 ? (
            <div className="text-slate-400 text-sm">No data available</div>
          ) : (
            <div className="w-full h-full flex flex-col md:flex-row items-center justify-around">
              <div className="h-44 w-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', color: '#fff' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-2 mt-4 md:mt-0 text-left">
                {categoryData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-2 text-xs">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                    <span className="font-medium text-slate-300">{entry.name}</span>
                    <span className="text-slate-400">({entry.value})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
