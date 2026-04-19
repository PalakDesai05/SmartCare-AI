import { useState, useEffect } from 'react';
import { Calendar, Clock, FileText, Activity, TrendingUp, ChevronRight, Zap } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { listenAppointments, listenPrescriptions, type DbAppointment } from '../../firebase/firebaseDb';

interface PatientOverviewProps {
  userName: string;
  onNavigate: (view: string) => void;
}

const statusColors: Record<string, string> = {
  scheduled:    'text-teal-700 bg-teal-50 border border-teal-200',
  completed:    'text-green-700 bg-green-50 border border-green-200',
  cancelled:    'text-red-600 bg-red-50 border border-red-200',
  'in-progress':'text-orange-600 bg-orange-50 border border-orange-200',
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function PatientOverview({ userName, onNavigate }: PatientOverviewProps) {
  const { user } = useAuth();
  const [appointments,  setAppointments]  = useState<DbAppointment[]>([]);
  const [rxCount,       setRxCount]       = useState(0);
  const [loading,       setLoading]       = useState(true);

  const firstName = (userName || user?.name || 'User').split(' ')[0];

  // Live appointment listener
  useEffect(() => {
    if (!user?.firebaseUid) { setLoading(false); return; }
    const unsub = listenAppointments(user.firebaseUid, appts => {
      setAppointments(appts);
      setLoading(false);
    });
    return unsub;
  }, [user?.firebaseUid]);

  // Live prescription count listener
  useEffect(() => {
    if (!user?.firebaseUid) return;
    const unsub = listenPrescriptions(user.firebaseUid, rxs => setRxCount(rxs.length));
    return unsub;
  }, [user?.firebaseUid]);

  const upcoming  = appointments.filter(a => a.status === 'scheduled' || a.status === 'in-progress');
  const completed = appointments.filter(a => a.status === 'completed');
  const nextAppt  = upcoming[0];

  const stats = [
    { label: 'Upcoming',     value: String(upcoming.length),  icon: Calendar,  gradient: 'from-teal-500 to-green-500',   bg: 'bg-teal-50',   text: 'text-teal-700'   },
    { label: 'Completed',    value: String(completed.length), icon: Clock,     gradient: 'from-green-500 to-teal-500',   bg: 'bg-green-50',  text: 'text-green-700'  },
    { label: 'Prescriptions',value: String(rxCount),          icon: FileText,  gradient: 'from-orange-500 to-yellow-500',bg: 'bg-orange-50', text: 'text-orange-700' },
    { label: 'Total Visits', value: String(appointments.length), icon: Activity, gradient: 'from-red-500 to-orange-500', bg: 'bg-red-50',    text: 'text-red-700'    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero banner */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-500 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute right-12 bottom-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-teal-200" />
            <span className="text-teal-200 text-sm font-medium">{greeting()}</span>
          </div>
          <h2 className="text-2xl font-bold mb-1">{firstName}!</h2>
          {loading ? (
            <p className="text-teal-100 text-sm">Loading your appointments…</p>
          ) : nextAppt ? (
            <p className="text-teal-100 text-sm">
              Next appointment: <strong>{nextAppt.doctorName}</strong> at <strong>{nextAppt.time}</strong>
            </p>
          ) : (
            <p className="text-teal-100 text-sm">No upcoming appointments. Book one now!</p>
          )}
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => onNavigate('queue')}
              className="bg-white text-teal-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-teal-50 transition-all flex items-center gap-2"
            >
              View Queue <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onNavigate('find-doctors')}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            >
              Book Appointment
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, gradient, bg, text }) => (
          <div key={label} className="bg-white rounded-2xl shadow-card overflow-hidden hover:shadow-soft transition-all duration-200 group">
            <div className={`h-1.5 bg-gradient-to-r ${gradient}`} />
            <div className="p-4">
              <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                <Icon className={`w-[18px] h-[18px] ${text}`} />
              </div>
              {loading
                ? <div className="h-7 bg-gray-100 animate-pulse rounded w-8 mb-1" />
                : <p className="text-2xl font-bold text-teal-900">{value}</p>
              }
              <p className="text-gray-500 text-xs mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent appointments + quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl shadow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-teal-900">Recent Appointments</h3>
            <button onClick={() => onNavigate('find-doctors')} className="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1">
              Book new <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl animate-pulse">
                  <div className="w-9 h-9 bg-gray-100 rounded-xl" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-gray-100 rounded w-3/4" />
                    <div className="h-3 bg-gray-50 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : appointments.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-200" />
              <p className="text-sm">No appointments yet</p>
              <button onClick={() => onNavigate('find-doctors')} className="mt-2 text-teal-600 text-xs font-medium hover:underline">
                Book your first appointment →
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {appointments.slice(0, 4).map(apt => (
                <div key={apt.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-teal-50 transition-colors group">
                  <div className="w-9 h-9 bg-teal-100 rounded-xl flex items-center justify-center flex-shrink-0 text-teal-700 font-bold text-xs">
                    #{apt.tokenNumber}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-teal-900 truncate">{apt.doctorName}</p>
                    <p className="text-xs text-gray-500">{apt.date} · {apt.time}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-1 rounded-lg capitalize ${statusColors[apt.status]}`}>
                    {apt.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-2xl shadow-card p-5">
          <h3 className="font-semibold text-teal-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Find Doctors',    view: 'find-doctors',  icon: '🩺', bg: 'bg-teal-50',   text: 'text-teal-700'   },
              { label: 'My Queue',        view: 'queue',         icon: '🎫', bg: 'bg-orange-50', text: 'text-orange-700' },
              { label: 'Prescriptions',   view: 'prescriptions', icon: '💊', bg: 'bg-blue-50',   text: 'text-blue-700'   },
              { label: 'My QR Token',     view: 'qr-token',      icon: '📲', bg: 'bg-purple-50', text: 'text-purple-700' },
              { label: 'Family Members',  view: 'family',        icon: '👨‍👩‍👧', bg: 'bg-green-50',  text: 'text-green-700'  },
              { label: 'Health Metrics',  view: 'health',        icon: '❤️', bg: 'bg-red-50',    text: 'text-red-700'    },
            ].map(({ label, view, icon, bg, text }) => (
              <button
                key={view}
                onClick={() => onNavigate(view)}
                className={`${bg} ${text} p-4 rounded-xl text-left hover:opacity-80 transition-all group`}
              >
                <span className="text-2xl mb-2 block group-hover:scale-110 transition-transform">{icon}</span>
                <p className="text-xs font-semibold">{label}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Live sync badge */}
      <div className="flex items-center gap-2 text-xs text-teal-600 bg-teal-50 border border-teal-200 rounded-xl p-3">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <TrendingUp className="w-3.5 h-3.5" />
        Data synced live from Firebase Realtime Database
      </div>
    </div>
  );
}
