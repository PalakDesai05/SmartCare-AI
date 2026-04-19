import { useState, useEffect } from 'react';
import { Calendar, Clock, Ticket, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { listenAppointments, type DbAppointment } from '../../firebase/firebaseDb';

function QRPattern({ token }: { token: number }) {
  // Deterministic pattern based on token
  const pattern = Array.from({ length: 64 }, (_, i) => (i * token + i) % 3 !== 0 ? 1 : 0);
  return (
    <div className="w-44 h-44 bg-white p-3 rounded-xl border-4 border-teal-600 mx-auto relative overflow-hidden shadow-inner">
      <div className="w-full h-full grid grid-cols-8 gap-0.5">
        {pattern.map((v, i) => (
          <div key={i} className={`${v ? 'bg-teal-900' : 'bg-white'} rounded-sm`} />
        ))}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-white p-1 rounded">
          <div className="w-9 h-9 bg-teal-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-black">{token}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function QRToken() {
  const { user } = useAuth();
  const [appt,    setAppt]    = useState<DbAppointment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.firebaseUid) { setLoading(false); return; }
    const unsub = listenAppointments(user.firebaseUid, appts => {
      const next = appts.find(a => a.status === 'scheduled' || a.status === 'in-progress') ?? null;
      setAppt(next);
      setLoading(false);
    });
    return unsub;
  }, [user?.firebaseUid]);

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!appt) return (
    <div className="max-w-lg mx-auto space-y-5 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-card p-10 text-center">
        <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Calendar className="w-8 h-8 text-teal-400" />
        </div>
        <h3 className="font-bold text-teal-900 text-lg mb-2">No Active Appointment</h3>
        <p className="text-gray-500 text-sm">
          You don't have any upcoming appointments. Book one from "Find Doctors" to get your QR token.
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-5 animate-fade-in max-w-lg mx-auto">
      <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 to-teal-500 p-5 text-white text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Ticket className="w-5 h-5 text-teal-200" />
            <h3 className="font-bold text-lg">Appointment Token</h3>
          </div>
          <p className="text-teal-200 text-sm">HealthAI Medical Center</p>
        </div>

        {/* Token + QR */}
        <div className="p-6 text-center">
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Your Token Number</p>
          <p className="text-6xl font-black text-teal-700 mb-1">#{appt.tokenNumber}</p>
          <p className="text-gray-400 text-xs font-mono mb-5">TK-{new Date(appt.createdAt).getFullYear()}-{String(appt.tokenNumber).padStart(4, '0')}</p>

          <QRPattern token={appt.tokenNumber} />
          <p className="text-xs text-gray-400 mt-3">Scan at the reception counter</p>
        </div>

        {/* Appointment details */}
        <div className="mx-5 mb-5 bg-teal-50 border border-teal-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0 text-teal-700 font-bold text-sm">
              {appt.doctorName.replace('Dr. ', '').charAt(0)}
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">Doctor</p>
              <p className="text-sm font-semibold text-teal-900">{appt.doctorName}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-teal-500" />
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Date</p>
                <p className="text-xs font-medium text-teal-900">
                  {new Date(appt.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-teal-500" />
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Time</p>
                <p className="text-xs font-medium text-teal-900">{appt.time}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${appt.status === 'in-progress' ? 'bg-orange-500 animate-pulse' : 'bg-teal-500'}`} />
            <p className="text-xs text-teal-700 font-medium capitalize">{appt.status.replace('-', ' ')}</p>
          </div>
          <div className="text-xs text-gray-500 bg-white rounded-lg p-2 border border-teal-100">
            <strong>Type:</strong> {appt.type}
          </div>
        </div>

        {/* Status icons */}
        <div className="flex justify-center gap-6 pb-5 pt-2 border-t border-teal-50">
          <div className="flex items-center gap-1.5 text-xs text-teal-600">
            <CheckCircle className="w-4 h-4" />
            Booked
          </div>
          <div className={`flex items-center gap-1.5 text-xs ${appt.status === 'in-progress' ? 'text-orange-600' : 'text-gray-300'}`}>
            <Clock className="w-4 h-4" />
            In Progress
          </div>
          <div className={`flex items-center gap-1.5 text-xs ${appt.status === 'completed' ? 'text-green-600' : 'text-gray-300'}`}>
            <XCircle className="w-4 h-4" />
            Done
          </div>
        </div>
      </div>
    </div>
  );
}
