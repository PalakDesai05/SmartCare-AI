import { Bell, Search, AlertCircle, CalendarCheck, Pill, Info, X, UserCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { listenNotifications, markNotificationsRead, type DbNotification } from '../../firebase/firebaseDb';
import type { ActiveView } from '../../types';

interface HeaderProps {
  title: string;
  onEmergency: () => void;
  onNavigate?: (view: ActiveView) => void;
}

const langLabels: Record<Language, string> = { EN: 'English', HI: 'हिन्दी', MR: 'मराठी' };



const notifIcons: Record<DbNotification['type'], React.ElementType> = {
  emergency:    AlertCircle,
  appointment:  CalendarCheck,
  prescription: Pill,
  bill:         Info,
  info:         Info,
};

const notifColors: Record<DbNotification['type'], string> = {
  emergency:    'text-red-500 bg-red-50',
  appointment:  'text-teal-600 bg-teal-50',
  prescription: 'text-orange-500 bg-orange-50',
  bill:         'text-green-600 bg-green-50',
  info:         'text-blue-500 bg-blue-50',
};

export default function Header({ title, onEmergency, onNavigate }: HeaderProps) {
  const { user } = useAuth();
  const [notifOpen,     setNotifOpen]     = useState(false);
  const [notifications, setNotifications] = useState<DbNotification[]>([]);

  useEffect(() => {
    if (!user?.firebaseUid) return;
    const unsub = listenNotifications(user.firebaseUid, setNotifications);
    return unsub;
  }, [user?.firebaseUid]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = async () => {
    if (!user?.firebaseUid) return;
    await markNotificationsRead(user.firebaseUid).catch(() => {});
  };

  return (
    <header className="h-16 bg-white border-b border-teal-100 flex items-center justify-between px-6 flex-shrink-0 shadow-card relative z-20">
      <div className="flex items-center gap-4">
        <div>
          <h2 className="text-teal-900 font-bold text-lg leading-tight">{title}</h2>
          <p className="text-teal-500 text-xs">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-xl px-3 py-2 w-56">
          <Search className="w-3.5 h-3.5 text-teal-500" />
          <input type="text" placeholder="Search..." className="bg-transparent text-sm text-teal-900 placeholder-teal-400 focus:outline-none w-full" />
        </div>

        {/* Profile icon */}
        <button
          onClick={() => onNavigate?.('profile')}
          className="p-2.5 rounded-xl border border-teal-200 text-teal-700 hover:bg-teal-50 transition-all flex items-center gap-2"
          title="My Profile"
        >
          <UserCircle className="w-5 h-5" />
          {user?.name && <span className="hidden md:inline text-sm font-medium">{user.name.split(' ')[0]}</span>}
        </button>

        <div className="relative">
          <button
            onClick={() => { setNotifOpen(!notifOpen); setLangOpen(false); }}
            className="relative p-2.5 rounded-xl border border-teal-200 text-teal-700 hover:bg-teal-50 transition-all"
          >
            <Bell className="w-4.5 h-4.5" style={{ width: '18px', height: '18px' }} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center" style={{ width: '18px', height: '18px' }}>
                {unreadCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-soft border border-teal-100 animate-slide-up z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-teal-100">
                <h4 className="font-semibold text-teal-900 text-sm">Notifications</h4>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-xs text-teal-600 hover:text-teal-700 font-medium">
                      Mark all read
                    </button>
                  )}
                  <button onClick={() => setNotifOpen(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                {notifications.length === 0 ? (
                  <div className="px-4 py-6 text-center text-gray-400 text-sm">No notifications yet</div>
                ) : notifications.map(notif => {
                  const Icon = notifIcons[notif.type] || Info;
                  const relTime = Math.floor((Date.now() - notif.createdAt) / 60000);
                  const timeLabel = relTime < 1 ? 'Just now' : relTime < 60 ? `${relTime}m ago` : `${Math.floor(relTime/60)}h ago`;
                  return (
                    <div key={notif.id} className={`px-4 py-3 flex gap-3 hover:bg-gray-50 transition-colors ${!notif.read ? 'bg-teal-50/50' : ''}`}>
                      <div className={`p-2 rounded-lg flex-shrink-0 ${notifColors[notif.type] || 'text-blue-500 bg-blue-50'}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-700 leading-relaxed line-clamp-2">{notif.message}</p>
                        <p className="text-[10px] text-gray-400 mt-1">{timeLabel}</p>
                      </div>
                      {!notif.read && <div className="w-2 h-2 rounded-full bg-teal-500 flex-shrink-0 mt-1" />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onEmergency}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-all shadow-sm animate-pulse-slow"
        >
          <AlertCircle className="w-4 h-4" />
          <span className="hidden sm:inline">Emergency</span>
        </button>
      </div>
    </header>
  );
}
