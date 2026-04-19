import { useState, useEffect } from 'react';
import {
  Clock, Users, Ticket, RefreshCw, Stethoscope, Calendar,
  XCircle, AlertCircle, CheckCircle, X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  listenAppointments, updateAppointmentStatus, getDoctorByUid,
  type DbAppointment,
} from '../../firebase/firebaseDb';

const statusConfig = {
  scheduled:     { label: 'Scheduled',   color: 'text-teal-700',  bg: 'bg-teal-50',  border: 'border-teal-200',  dot: 'bg-teal-500'  },
  'in-progress': { label: 'In Progress', color: 'text-blue-700',  bg: 'bg-blue-50',  border: 'border-blue-200',  dot: 'bg-blue-500'  },
  completed:     { label: 'Completed',   color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200', dot: 'bg-green-500' },
  cancelled:     { label: 'Cancelled',   color: 'text-red-600',   bg: 'bg-red-50',   border: 'border-red-200',   dot: 'bg-red-400'   },
};

/** Parse "HH:MM AM/PM" style time to a Date for today */
function parseApptDateTime(dateStr: string, timeStr: string): Date {
  const base = new Date(dateStr);
  const [time, ampm] = timeStr.split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  if (ampm === 'PM' && hours !== 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  base.setHours(hours, minutes, 0, 0);
  return base;
}

function CancelModal({ appt, onConfirm, onClose }: {
  appt: DbAppointment; onConfirm: () => void; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-soft w-full max-w-sm p-6 animate-slide-up text-center">
        <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-7 h-7 text-red-500" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Cancel Appointment?</h3>
        <p className="text-sm text-gray-500 mb-1"><strong>{appt.doctorName}</strong></p>
        <p className="text-sm text-gray-500 mb-5">
          {new Date(appt.date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })} at {appt.time}
        </p>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all">
            Keep It
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-semibold transition-all">
            Yes, Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function QueueTracking() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<DbAppointment[]>([]);
  const [doctorQueueSizes, setDoctorQueueSizes] = useState<Record<string, number>>({});
  const [loading,      setLoading]      = useState(true);
  const [rtdbError,    setRtdbError]    = useState(false);
  const [cancelTarget, setCancelTarget] = useState<DbAppointment | null>(null);
  const [cancelling,   setCancelling]   = useState<string | null>(null);

  useEffect(() => {
    if (!user?.firebaseUid) { setLoading(false); return; }

    const unsub = listenAppointments(
      user.firebaseUid,
      async (data) => {
        const now = Date.now();
        const GRACE_MS = 30 * 60 * 1000; // 30 minutes grace

        // Auto-cancel missed appointments
        const updates: Promise<void>[] = [];
        data.forEach(appt => {
          if (appt.status === 'scheduled') {
            const apptTime = parseApptDateTime(appt.date, appt.time).getTime();
            if (now - apptTime > GRACE_MS) {
              updates.push(
                updateAppointmentStatus(user.firebaseUid, appt.id, 'cancelled', appt.doctorUid)
                  .catch(() => {})
              );
            }
          }
        });
        if (updates.length > 0) await Promise.all(updates);

        setAppointments(data);
        setLoading(false);
        setRtdbError(false);
      },
      (_err) => { setRtdbError(true); setLoading(false); }
    );
    return unsub;
  }, [user?.firebaseUid]);

  const handleCancel = async (appt: DbAppointment) => {
    if (!user?.firebaseUid) return;
    setCancelling(appt.id);
    try {
      await updateAppointmentStatus(user.firebaseUid, appt.id, 'cancelled', appt.doctorUid);
    } catch {
      setAppointments(prev => prev.map(a => a.id === appt.id ? { ...a, status: 'cancelled' } : a));
    }
    setCancelTarget(null);
    setCancelling(null);
  };

  const active   = appointments.filter(a => a.status === 'scheduled' || a.status === 'in-progress');
  const past     = appointments.filter(a => a.status === 'completed'  || a.status === 'cancelled');
  const nextAppt = active[0] ?? null;

  // Estimate how many are ahead: tokenNumber - 1 (rough estimate based on token order)
  const patientsAhead = nextAppt ? Math.max(0, nextAppt.tokenNumber - 1) : 0;
  const estimatedWait = patientsAhead * 10; // ~10 min per patient

  if (rtdbError) return (
    <div className="max-w-2xl mx-auto space-y-4 animate-fade-in">
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-amber-900 text-sm">Firebase Rules Not Configured</p>
          <p className="text-xs text-amber-700 mt-1 leading-relaxed">
            Go to <strong>Firebase Console → Realtime Database → Rules</strong> and paste the rules from <code>firebase/database.rules.json</code>.
          </p>
          <p className="text-xs text-amber-700 mt-1">Then click Publish and reload the page.</p>
        </div>
      </div>
    </div>
  );

  if (loading) return (
    <div className="flex items-center justify-center h-32">
      <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5 animate-fade-in max-w-2xl mx-auto">
      {cancelTarget && (
        <CancelModal
          appt={cancelTarget}
          onConfirm={() => handleCancel(cancelTarget)}
          onClose={() => setCancelTarget(null)}
        />
      )}

      {/* Next appointment */}
      {nextAppt ? (
        <div className="bg-white rounded-2xl shadow-card border-l-4 border-teal-500 overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-bold text-teal-900 text-lg">Next Appointment</h3>
                <p className="text-gray-500 text-sm mt-0.5">Live queue status from Firebase</p>
              </div>
              <span className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-teal-50 text-teal-700 border border-teal-200">
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                Live
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-5">
              <div className="text-center p-4 rounded-2xl bg-teal-50 border border-teal-200">
                <div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Ticket className="w-6 h-6 text-white" />
                </div>
                <p className="text-3xl font-black text-teal-700">#{nextAppt.tokenNumber}</p>
                <p className="text-xs text-teal-500 font-medium mt-0.5">Your Token</p>
              </div>
              <div className="text-center p-4 rounded-2xl bg-orange-50 border border-orange-200">
                <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <p className="text-3xl font-black text-orange-600">{patientsAhead}</p>
                <p className="text-xs text-orange-500 font-medium mt-0.5">Ahead of You</p>
              </div>
              <div className="text-center p-4 rounded-2xl bg-blue-50 border border-blue-200">
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <p className="text-3xl font-black text-blue-600">~{estimatedWait}</p>
                <p className="text-xs text-blue-500 font-medium mt-0.5">Min Wait</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-teal-50 rounded-xl mb-4">
              <Stethoscope className="w-4 h-4 text-teal-600 flex-shrink-0" />
              <div>
                <p className="text-xs text-teal-700 font-semibold">{nextAppt.doctorName}</p>
                <p className="text-xs text-teal-500">Appointment at {nextAppt.time} · {nextAppt.type}</p>
              </div>
              <span className={`ml-auto text-[10px] font-bold px-2 py-1 rounded-lg capitalize ${statusConfig[nextAppt.status]?.bg} ${statusConfig[nextAppt.status]?.color}`}>
                {statusConfig[nextAppt.status]?.label}
              </span>
            </div>

            <button
              onClick={() => setCancelTarget(nextAppt)}
              disabled={cancelling === nextAppt.id}
              className="w-full py-2.5 border border-red-200 text-red-500 rounded-xl text-sm font-semibold hover:bg-red-50 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {cancelling === nextAppt.id
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Cancelling…</>
                : <><XCircle className="w-4 h-4" /> Cancel This Appointment</>}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-card p-8 text-center border-2 border-dashed border-teal-200">
          <div className="w-14 h-14 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <Calendar className="w-7 h-7 text-teal-400" />
          </div>
          <p className="font-bold text-teal-900">No upcoming appointments</p>
          <p className="text-gray-500 text-sm mt-1">Book one from "Find Doctors"</p>
        </div>
      )}

      {/* All active */}
      {active.length > 1 && (
        <div className="bg-white rounded-2xl shadow-card p-5">
          <h4 className="font-semibold text-teal-900 mb-4">Upcoming ({active.length})</h4>
          <div className="space-y-3">
            {active.map(appt => {
              const sc = statusConfig[appt.status];
              return (
                <div key={appt.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-all">
                  <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-xs font-bold text-teal-700 flex-shrink-0">
                    #{appt.tokenNumber}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{appt.doctorName}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(appt.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} · {appt.time}
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${sc.bg} ${sc.color}`}>{sc.label}</span>
                  <button
                    onClick={() => setCancelTarget(appt)}
                    disabled={cancelling === appt.id}
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                    title="Cancel"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Past */}
      {past.length > 0 && (
        <div className="bg-white rounded-2xl shadow-card p-5">
          <h4 className="font-semibold text-teal-900 mb-4">History ({past.length})</h4>
          <div className="space-y-2">
            {past.map(appt => {
              const sc = statusConfig[appt.status];
              return (
                <div key={appt.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 opacity-70">
                  <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center">
                    {appt.status === 'completed'
                      ? <CheckCircle className="w-4 h-4 text-green-500" />
                      : <XCircle className="w-4 h-4 text-red-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{appt.doctorName}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(appt.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} · {appt.time}
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${sc.bg} ${sc.color}`}>{sc.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-teal-700">
        <span className="w-2 h-2 rounded-full bg-green-500 mt-1 animate-pulse flex-shrink-0" />
        Appointments sync live from Firebase. Missed appointments are auto-cancelled after 30 minutes.
      </div>
    </div>
  );
}
