import { useState, useEffect } from 'react';
import { AlertTriangle, Phone, Clock, MapPin, CheckCircle, Zap, Plus, X, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  listenEmergencyAlerts, createEmergencyAlert, resolveEmergencyAlert,
  type DbEmergencyAlert,
} from '../../firebase/firebaseDb';

const severityConfig = {
  critical: { color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-l-red-500',   badge: 'bg-red-500 text-white',        dot: 'bg-red-500',    label: 'CRITICAL', gradient: 'from-red-500 to-red-600'    },
  serious:  { color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-l-orange-500',badge: 'bg-orange-500 text-white',      dot: 'bg-orange-500', label: 'SERIOUS',  gradient: 'from-orange-500 to-orange-600'},
  monitor:  { color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-l-yellow-400',badge: 'bg-yellow-400 text-yellow-900', dot: 'bg-yellow-400', label: 'MONITOR',  gradient: 'from-yellow-400 to-yellow-500'},
};

function NewAlertModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [patientName,  setPatientName]  = useState('');
  const [description,  setDescription]  = useState('');
  const [location,     setLocation]     = useState('');
  const [severity,     setSeverity]     = useState<'critical' | 'serious' | 'monitor'>('serious');
  const [submitting,   setSubmitting]   = useState(false);

  const handleSubmit = async () => {
    if (!patientName.trim() || !description.trim()) return;
    setSubmitting(true);
    try {
      await createEmergencyAlert({
        patientUid:  user?.firebaseUid || 'system',
        patientName: patientName.trim(),
        description: description.trim(),
        location:    location.trim() || undefined,
        severity,
        status:      'active',
        createdAt:   Date.now(),
      });
      onClose();
    } catch { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-soft w-full max-w-md p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-teal-900 text-lg">Report Emergency</h3>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition-all"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-teal-900 block mb-1.5">Patient Name *</label>
            <input value={patientName} onChange={e => setPatientName(e.target.value)} placeholder="Enter patient name"
              className="w-full px-3 py-2.5 rounded-xl border border-teal-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <div>
            <label className="text-sm font-semibold text-teal-900 block mb-1.5">Description *</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the emergency condition..."
              className="w-full px-3 py-2.5 rounded-xl border border-teal-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none h-20" />
          </div>
          <div>
            <label className="text-sm font-semibold text-teal-900 block mb-1.5">Location / Room</label>
            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. ICU-3, Ward 7B, OPD-12"
              className="w-full px-3 py-2.5 rounded-xl border border-teal-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <div>
            <label className="text-sm font-semibold text-teal-900 block mb-2">Severity</label>
            <div className="grid grid-cols-3 gap-2">
              {(['critical', 'serious', 'monitor'] as const).map(s => (
                <button key={s} onClick={() => setSeverity(s)}
                  className={`py-2 rounded-xl text-xs font-bold capitalize transition-all ${severity === s ? severityConfig[s].badge + ' shadow-glow' : 'bg-gray-100 text-gray-500'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <button onClick={handleSubmit} disabled={!patientName.trim() || !description.trim() || submitting}
            className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              patientName.trim() && description.trim() && !submitting ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}>
            {submitting ? <><RefreshCw className="w-4 h-4 animate-spin" /> Submitting…</> : 'Report Emergency'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EmergencyAlerts() {
  const [alerts,      setAlerts]      = useState<DbEmergencyAlert[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [responded,   setResponded]   = useState<Set<string>>(new Set());
  const [resolving,   setResolving]   = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);

  useEffect(() => {
    const unsub = listenEmergencyAlerts(alerts => {
      setAlerts(alerts);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);

  const active   = alerts.filter(a => a.status === 'active');
  const resolved = alerts.filter(a => a.status === 'resolved');

  const handleResolve = async (alertId: string) => {
    setResolving(alertId);
    try {
      await resolveEmergencyAlert(alertId);
    } catch {
      // optimistic: listener will update
    }
    setResolving(null);
  };

  const criticalCount = active.filter(a => a.severity === 'critical').length;

  if (loading) return (
    <div className="flex items-center justify-center h-32">
      <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5 animate-fade-in">
      {showNewModal && <NewAlertModal onClose={() => setShowNewModal(false)} />}

      {/* Critical banner */}
      {criticalCount > 0 && (
        <div className="bg-red-500 rounded-2xl p-4 text-white flex items-center gap-4 animate-pulse-slow">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="font-bold">{criticalCount} Critical Alert{criticalCount > 1 ? 's' : ''} Active</p>
            <p className="text-red-100 text-sm">Immediate medical attention required</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-teal-900">Emergency Alerts</h3>
          <p className="text-gray-500 text-sm">{active.length} active · {resolved.length} resolved · Live from Firebase</p>
        </div>
        <button onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-semibold transition-all shadow-glow">
          <Plus className="w-4 h-4" /> Report
        </button>
      </div>

      {/* Active alerts */}
      <div className="space-y-4">
        {active.map(alert => {
          const config     = severityConfig[alert.severity];
          const isResponded = responded.has(alert.id);
          const minsAgo    = Math.floor((Date.now() - alert.createdAt) / 60000);

          return (
            <div key={alert.id} className={`bg-white rounded-2xl shadow-card border-l-4 ${config.border} overflow-hidden hover:shadow-soft transition-all`}>
              <div className="p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className={`w-10 h-10 bg-gradient-to-br ${config.gradient} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <AlertTriangle className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <h4 className={`font-bold ${config.color}`}>{alert.patientName}</h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${config.badge}`}>{config.label}</span>
                      {isResponded && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">Responding</span>
                      )}
                    </div>
                    <p className={`text-sm font-semibold ${config.color} mb-1`}>{alert.description}</p>
                    <div className="flex items-center gap-4">
                      {alert.location && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <MapPin className="w-3 h-3 text-teal-500" /><span>{alert.location}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Clock className="w-3 h-3 text-teal-500" />
                        <span>{minsAgo < 1 ? 'Just now' : `${minsAgo}m ago`}</span>
                      </div>
                    </div>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${config.dot} ${!isResponded ? 'animate-pulse' : ''} flex-shrink-0 mt-1`} />
                </div>

                <div className="flex gap-2 pt-3 border-t border-gray-100">
                  {!isResponded ? (
                    <button onClick={() => setResponded(prev => new Set([...prev, alert.id]))}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r ${config.gradient} text-white text-sm font-bold transition-all`}>
                      <Phone className="w-3.5 h-3.5" /> Respond Now
                    </button>
                  ) : (
                    <button onClick={() => handleResolve(alert.id)} disabled={resolving === alert.id}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-bold transition-all disabled:opacity-60">
                      {resolving === alert.id
                        ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        : <><CheckCircle className="w-3.5 h-3.5" /> Mark Resolved</>}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* No active alerts */}
      {active.length === 0 && (
        <div className="text-center py-16">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="w-7 h-7 text-green-500" />
          </div>
          <p className="text-teal-900 font-semibold">All Clear</p>
          <p className="text-gray-500 text-sm mt-1">No active emergency alerts at this time</p>
        </div>
      )}

      {/* Resolved section */}
      {resolved.length > 0 && (
        <div className="bg-white rounded-2xl shadow-card p-5 opacity-60">
          <h4 className="font-semibold text-gray-500 text-sm mb-3">Resolved ({resolved.length})</h4>
          <div className="space-y-2">
            {resolved.slice(0, 3).map(a => (
              <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-600 truncate">{a.patientName}</p>
                  <p className="text-xs text-gray-400 truncate">{a.description}</p>
                </div>
                <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-lg font-bold">Resolved</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
