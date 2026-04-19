import { useState, useEffect } from 'react';
import {
  Users, CheckCircle, Clock, FileText, ChevronRight,
  Stethoscope, Calendar, AlertCircle, Link2, Link2Off, RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  getDoctorByUid, listenDoctorQueue, listenEmergencyAlerts,
  getAllPharmacies, updateDoctorLinkedPharmacy,
  type DbAppointment, type DbEmergencyAlert, type DbDoctor, type DbUser,
} from '../../firebase/firebaseDb';

interface DoctorOverviewProps {
  userName: string;
  onNavigate: (view: string) => void;
}

const statusColors: Record<string, string> = {
  scheduled:    'text-teal-700 bg-teal-50 border-teal-200',
  completed:    'text-green-700 bg-green-50 border-green-200',
  cancelled:    'text-red-600 bg-red-50 border-red-200',
  'in-progress':'text-orange-600 bg-orange-50 border-orange-200',
};

const severityColors = {
  critical: { color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200',    dot: 'bg-red-500'    },
  serious:  { color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', dot: 'bg-orange-500' },
  monitor:  { color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', dot: 'bg-yellow-400' },
};

export default function DoctorOverview({ userName, onNavigate }: DoctorOverviewProps) {
  const { user } = useAuth();
  const [doctorProfile, setDoctorProfile] = useState<DbDoctor | null>(null);
  const [appointments,  setAppointments]  = useState<DbAppointment[]>([]);
  const [emergencies,   setEmergencies]   = useState<DbEmergencyAlert[]>([]);
  const [loading,       setLoading]       = useState(true);

  const firstName = (userName || user?.name || 'Doctor').replace('Dr. ', '').split(' ')[0];
  const today     = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!user?.firebaseUid) { setLoading(false); return; }
    // Load doctor profile
    getDoctorByUid(user.firebaseUid).then(p => setDoctorProfile(p));

    // Live queue
    const unsubQueue = listenDoctorQueue(user.firebaseUid, appts => {
      setAppointments(appts);
      setLoading(false);
    }, () => setLoading(false));

    // Live emergencies
    const unsubEmerg = listenEmergencyAlerts(alerts => {
      setEmergencies(alerts.filter(a => a.status === 'active').slice(0, 3));
    });

    return () => { unsubQueue(); unsubEmerg(); };
  }, [user?.firebaseUid]);

  const todayAppts = appointments.filter(a => a.date === today);
  const completed  = todayAppts.filter(a => a.status === 'completed');
  const pending    = todayAppts.filter(a => a.status === 'scheduled' || a.status === 'in-progress');

  const stats = [
    { label: "Today's Patients", value: String(todayAppts.length), icon: Users,      gradient: 'from-teal-500 to-green-500',   text: 'text-teal-700',   bg: 'bg-teal-50'   },
    { label: 'Completed',        value: String(completed.length),  icon: CheckCircle, gradient: 'from-green-500 to-teal-500',   text: 'text-green-700',  bg: 'bg-green-50'  },
    { label: 'Pending',          value: String(pending.length),    icon: Clock,       gradient: 'from-orange-500 to-yellow-500',text: 'text-orange-700', bg: 'bg-orange-50' },
    { label: 'Active Alerts',    value: String(emergencies.length), icon: AlertCircle, gradient: 'from-red-500 to-orange-500',  text: 'text-red-700',    bg: 'bg-red-50'    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero */}
      <div className="bg-gradient-to-r from-teal-700 to-teal-600 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <Stethoscope className="w-4 h-4 text-teal-200" />
            <span className="text-teal-200 text-sm">Physician Dashboard</span>
          </div>
          <h2 className="text-2xl font-bold mb-1">Welcome, Dr. {firstName}</h2>
          {loading ? (
            <p className="text-teal-100 text-sm">Loading your schedule…</p>
          ) : (
            <p className="text-teal-100 text-sm">
              You have <strong>{pending.length} patient{pending.length !== 1 ? 's' : ''}</strong> remaining today
              {doctorProfile && <> · {doctorProfile.specialization}</>}
            </p>
          )}
          <div className="flex gap-3 mt-4">
            <button onClick={() => onNavigate('patient-queue')}
              className="bg-white text-teal-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-teal-50 transition-all flex items-center gap-2">
              View Queue <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onNavigate('emergency')}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all">
              Emergencies {emergencies.length > 0 && `(${emergencies.length})`}
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, gradient, text, bg }) => (
          <div key={label} className="bg-white rounded-2xl shadow-card overflow-hidden hover:shadow-soft transition-all group">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Today's appointments */}
        <div className="bg-white rounded-2xl shadow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-teal-900">Today's Queue</h3>
            <button onClick={() => onNavigate('patient-queue')} className="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
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
          ) : todayAppts.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No patients scheduled for today</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayAppts.slice(0, 4).map(apt => (
                <div key={apt.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-teal-50 transition-colors">
                  <div className="w-9 h-9 bg-teal-100 rounded-xl flex items-center justify-center flex-shrink-0 text-teal-700 font-bold text-xs">
                    #{apt.tokenNumber}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-teal-900 truncate">{apt.patientName}</p>
                    <p className="text-xs text-gray-500 truncate">{apt.type} · {apt.time}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-1 rounded-lg border capitalize ${statusColors[apt.status]}`}>
                    {apt.status.replace('-', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Emergency alerts */}
        <div className="bg-white rounded-2xl shadow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-teal-900">Emergency Alerts</h3>
            <button onClick={() => onNavigate('emergency')} className="text-xs text-red-500 hover:text-red-600 font-medium flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {emergencies.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-8 h-8 text-green-300 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No active emergencies</p>
            </div>
          ) : (
            <div className="space-y-2">
              {emergencies.map(alert => {
                const cfg = severityColors[alert.severity];
                return (
                  <div key={alert.id} className={`p-3 rounded-xl border ${cfg.bg} ${cfg.border} flex items-center gap-3`}>
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot} animate-pulse`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${cfg.color} truncate`}>{alert.patientName}</p>
                      <p className="text-xs text-gray-500 truncate">{alert.description}</p>
                    </div>
                    <span className="text-[10px] text-gray-400 flex-shrink-0">
                      {Math.floor((Date.now() - alert.createdAt) / 60000)}m ago
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Doctor profile summary */}
      {doctorProfile && (
        <div className="bg-white rounded-2xl shadow-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-4 h-4 text-teal-600" />
            <h3 className="font-semibold text-teal-900">My Profile Summary</h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-teal-50 rounded-xl p-3 text-center">
              <p className="text-xl font-black text-teal-600">{Number(doctorProfile.rating).toFixed(1)}</p>
              <p className="text-xs text-gray-500 mt-0.5">Avg. Rating</p>
            </div>
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <p className="text-xl font-black text-green-600">{doctorProfile.reviews}</p>
              <p className="text-xs text-gray-500 mt-0.5">Total Reviews</p>
            </div>
            <div className="bg-orange-50 rounded-xl p-3 text-center">
              <p className="text-xl font-black text-orange-600">₹{doctorProfile.fee}</p>
              <p className="text-xs text-gray-500 mt-0.5">Fee / Visit</p>
            </div>
          </div>
        </div>
      )}

      {/* Link Pharmacy Panel */}
      <LinkPharmacyPanel
        doctorUid={user?.firebaseUid || ''}
        currentLinkedUid={doctorProfile?.linkedPharmacyUid || ''}
        onLinked={uid => setDoctorProfile(prev => prev ? { ...prev, linkedPharmacyUid: uid } : prev)}
      />
    </div>
  );
}

// ── Link Pharmacy Sub-Component ───────────────────────────
function LinkPharmacyPanel({
  doctorUid, currentLinkedUid, onLinked,
}: {
  doctorUid: string;
  currentLinkedUid: string;
  onLinked: (uid: string) => void;
}) {
  const [pharmacies,   setPharmacies]   = useState<DbUser[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [selectedUid,  setSelectedUid]  = useState(currentLinkedUid);
  const [saved,        setSaved]        = useState(false);

  useEffect(() => { setSelectedUid(currentLinkedUid); }, [currentLinkedUid]);

  useEffect(() => {
    getAllPharmacies()
      .then(p => { setPharmacies(p); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const linked = pharmacies.find(p => p.uid === currentLinkedUid);

  const handleSave = async () => {
    if (!doctorUid) return;
    setSaving(true);
    try {
      await updateDoctorLinkedPharmacy(doctorUid, selectedUid);
      onLinked(selectedUid);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {}
    setSaving(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-card p-5">
      <div className="flex items-center gap-2 mb-1">
        <Link2 className="w-4 h-4 text-teal-600" />
        <h3 className="font-semibold text-teal-900">Linked Pharmacy</h3>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Link your clinic's pharmacy. Prescriptions you upload will be automatically forwarded to them.
      </p>

      {/* Current status */}
      {currentLinkedUid ? (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-teal-50 border border-teal-200 mb-4">
          <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            Rx
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-teal-800">{linked?.name || 'Pharmacy'}</p>
            <p className="text-xs text-teal-600">{linked?.email}</p>
          </div>
          <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-lg font-bold">Linked</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 mb-4">
          <Link2Off className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <p className="text-xs text-amber-700">No pharmacy linked. Prescriptions won't auto-forward.</p>
        </div>
      )}

      {/* Select pharmacy */}
      {loading ? (
        <div className="h-10 bg-gray-100 animate-pulse rounded-xl" />
      ) : pharmacies.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-3">
          No pharmacy accounts found. Ask Admin to add a pharmacy account first.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="space-y-2">
            {pharmacies.map(p => (
              <button
                key={p.uid}
                onClick={() => setSelectedUid(selectedUid === p.uid ? '' : p.uid)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                  selectedUid === p.uid
                    ? 'bg-teal-600 border-teal-600 text-white'
                    : 'bg-white border-gray-200 text-gray-800 hover:border-teal-300'
                }`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  selectedUid === p.uid ? 'bg-white/20 text-white' : 'bg-teal-100 text-teal-700'
                }`}>
                  Rx
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{p.name}</p>
                  <p className={`text-xs truncate ${selectedUid === p.uid ? 'text-teal-100' : 'text-gray-400'}`}>{p.email}</p>
                </div>
                {selectedUid === p.uid && <CheckCircle className="w-4 h-4 flex-shrink-0" />}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || selectedUid === currentLinkedUid}
              className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving…</>
                : saved
                ? <><CheckCircle className="w-4 h-4" /> Saved!</>
                : selectedUid
                ? <><Link2 className="w-4 h-4" /> Link Pharmacy</>
                : <><Link2Off className="w-4 h-4" /> Unlink Pharmacy</>
              }
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
