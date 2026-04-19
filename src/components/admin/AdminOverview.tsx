import { useState, useEffect } from 'react';
import { Users, Stethoscope, Calendar, AlertTriangle, Activity, ChevronRight, TrendingUp } from 'lucide-react';
import { getAllDoctors, getAllUsers, listenEmergencyAlerts, type DbDoctor } from '../../firebase/firebaseDb';

interface AdminOverviewProps {
  onNavigate: (view: string) => void;
}

export default function AdminOverview({ onNavigate }: AdminOverviewProps) {
  const [doctors,     setDoctors]     = useState<DbDoctor[]>([]);
  const [patientCount, setPatientCount] = useState(0);
  const [alertCount,  setAlertCount]  = useState(0);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([getAllDoctors(), getAllUsers()]).then(([docs, users]) => {
      setDoctors(docs);
      setPatientCount(users.filter(u => u.role === 'patient').length);
      setLoading(false);
    }).catch(() => setLoading(false));

    const unsubAlerts = listenEmergencyAlerts(alerts => {
      setAlertCount(alerts.filter(a => a.status === 'active').length);
    });
    return unsubAlerts;
  }, []);

  const activeDoctors = doctors.filter(d => d.available).length;
  const topDoctors    = [...doctors].sort((a, b) => b.rating - a.rating).slice(0, 3);

  const stats = [
    { label: 'Total Doctors',      value: String(doctors.length),   icon: Stethoscope,     gradient: 'from-teal-500 to-teal-600',   bg: 'bg-teal-50',   text: 'text-teal-700',   sub: `${activeDoctors} active` },
    { label: 'Total Patients',     value: String(patientCount),     icon: Users,           gradient: 'from-green-500 to-teal-500',   bg: 'bg-green-50',  text: 'text-green-700',  sub: 'registered users' },
    { label: 'Available Doctors',  value: String(activeDoctors),    icon: Activity,        gradient: 'from-orange-500 to-yellow-500', bg: 'bg-orange-50', text: 'text-orange-700', sub: 'right now' },
    { label: 'Emergency Alerts',   value: String(alertCount),       icon: AlertTriangle,   gradient: 'from-red-500 to-orange-500',   bg: 'bg-red-50',    text: 'text-red-700',    sub: 'active' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero */}
      <div className="bg-gradient-to-r from-teal-800 to-teal-600 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/3 translate-x-1/3" />
        <div className="relative">
          <p className="text-teal-200 text-sm font-medium mb-1">Administrator</p>
          <h2 className="text-2xl font-bold mb-1">Hospital Control Center</h2>
          <p className="text-teal-100 text-sm">
            {loading ? 'Loading system data…' : `${doctors.length} doctors | ${patientCount} patients | ${alertCount} active alerts`}
          </p>
          <div className="flex gap-3 mt-4">
            <button onClick={() => onNavigate('manage-doctors')}
              className="bg-white text-teal-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-teal-50 transition-all flex items-center gap-2">
              Manage Doctors <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onNavigate('analytics')}
              className="bg-teal-700/50 hover:bg-teal-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all">
              View Analytics
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, gradient, bg, text, sub }) => (
          <div key={label} className="bg-white rounded-2xl shadow-card overflow-hidden hover:shadow-soft transition-all group">
            <div className={`h-1.5 bg-gradient-to-r ${gradient}`} />
            <div className="p-4">
              <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                <Icon className={text} style={{ width: '18px', height: '18px' }} />
              </div>
              {loading
                ? <div className="h-7 bg-gray-100 animate-pulse rounded w-12 mb-1" />
                : <p className="text-2xl font-bold text-teal-900">{value}</p>
              }
              <p className="text-gray-500 text-xs mt-0.5">{label}</p>
              <p className={`text-[10px] font-semibold ${text} mt-1`}>{sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Specialization breakdown */}
        <div className="bg-white rounded-2xl shadow-card p-5">
          <div className="flex items-center gap-2 mb-5">
            <Activity className="w-4 h-4 text-teal-600" />
            <h3 className="font-semibold text-teal-900">Doctor Specializations</h3>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-8 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : doctors.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No doctors added yet</p>
          ) : (() => {
            const specs: Record<string, number> = {};
            doctors.forEach(d => { specs[d.specialization] = (specs[d.specialization] || 0) + 1; });
            const max = Math.max(...Object.values(specs));
            return (
              <div className="space-y-3">
                {Object.entries(specs).slice(0, 6).map(([spec, count]) => (
                  <div key={spec}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600 truncate flex-1">{spec}</span>
                      <span className="text-xs font-bold text-teal-900 ml-2">{count}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-teal-400 transition-all duration-700"
                        style={{ width: `${(count / max) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>

        {/* Top doctors */}
        <div className="bg-white rounded-2xl shadow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-teal-900">Top Rated Doctors</h3>
            <button onClick={() => onNavigate('manage-doctors')}
              className="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : topDoctors.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No doctors yet. Add doctors to see rankings.</p>
          ) : (
            <div className="space-y-3">
              {topDoctors.map((doc, i) => (
                <div key={doc.uid} className="flex items-center gap-3 p-3 rounded-xl hover:bg-teal-50 transition-colors">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${i === 0 ? 'bg-yellow-400' : i === 1 ? 'bg-gray-400' : 'bg-orange-400'}`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-teal-900 truncate">{doc.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-teal-500 rounded-full" style={{ width: `${(doc.rating / 5) * 100}%` }} />
                      </div>
                      <span className="text-xs text-teal-600 font-semibold">{doc.rating.toFixed(1)} ★</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-teal-900">{doc.reviews}</p>
                    <p className="text-[10px] text-gray-400">reviews</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Live sync badge */}
      <div className="flex items-center gap-2 text-xs text-teal-600 bg-teal-50 border border-teal-200 rounded-xl p-3">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <TrendingUp className="w-3.5 h-3.5" />
        All statistics are loaded live from Firebase Realtime Database
      </div>
    </div>
  );
}
