import { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, Minus, Upload, Activity, Heart, Zap, CheckCircle, X, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  getPatientAppointments, saveReport, listenPatientReports,
  listenHealthMetrics,
  type DbAppointment, type DbReport, type DbHealthMetrics,
} from '../../firebase/firebaseDb';

// ── Clinical threshold helpers ────────────────────────────
type Status = 'normal' | 'moderate' | 'high' | 'critical';
type Trend  = 'up' | 'down' | 'stable';

function bpStatus(val: string): Status {
  const parts = val.split('/').map(Number);
  if (parts.length !== 2 || isNaN(parts[0])) return 'normal';
  const [s, d] = parts;
  if (s >= 180 || d >= 120) return 'critical';
  if (s >= 140 || d >= 90)  return 'high';
  if (s >= 120 || d >= 80)  return 'moderate';
  return 'normal';
}
function hrStatus(v: number): Status {
  if (v > 150 || v < 40)  return 'critical';
  if (v > 120 || v < 50)  return 'high';
  if (v > 100)             return 'moderate';
  return 'normal';
}
function sugarStatus(v: number): Status {
  if (v >= 200) return 'critical';
  if (v >= 126) return 'high';
  if (v >= 100) return 'moderate';
  return 'normal';
}
function spo2Status(v: number): Status {
  if (v < 90)  return 'critical';
  if (v < 95)  return 'high';
  if (v < 97)  return 'moderate';
  return 'normal';
}
function tempStatus(v: number): Status {
  if (v > 103 || v < 95)    return 'critical';
  if (v > 100.4 || v < 96)  return 'high';
  if (v > 99 || v < 97)     return 'moderate';
  return 'normal';
}
function cholStatus(v: number): Status {
  if (v >= 280) return 'critical';
  if (v >= 240) return 'high';
  if (v >= 200) return 'moderate';
  return 'normal';
}

// ── Metric status styling ─────────────────────────────────
const metricStatusConfig: Record<Status, { color: string; bg: string; border: string; bar: string; label: string }> = {
  normal:   { color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-200',  bar: 'bg-green-500',  label: 'Normal'   },
  moderate: { color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', bar: 'bg-yellow-400', label: 'Moderate' },
  high:     { color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', bar: 'bg-orange-500', label: 'High'     },
  critical: { color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200',    bar: 'bg-red-500',    label: 'Critical' },
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function HealthMetrics() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [weeklyData,   setWeeklyData]   = useState<{ day: string; count: number }[]>(
    DAYS.map(d => ({ day: d, count: 0 }))
  );
  const [reports,      setReports]      = useState<DbReport[]>([]);
  const [liveMetrics,  setLiveMetrics]  = useState<DbHealthMetrics | null>(null);
  const [uploading,    setUploading]    = useState(false);
  const [uploadNote,   setUploadNote]   = useState('');
  const [showNote,     setShowNote]     = useState(false);
  const [pendingFile,  setPendingFile]  = useState<File | null>(null);
  const [uploadDone,   setUploadDone]   = useState(false);

  // Weekly appointment chart
  useEffect(() => {
    if (!user?.firebaseUid) return;
    getPatientAppointments(user.firebaseUid)
      .then((appts: DbAppointment[]) => {
        const counts: Record<string, number> = {};
        DAYS.forEach(d => { counts[d] = 0; });
        appts.forEach(a => {
          const day = DAYS[new Date(a.createdAt).getDay()];
          counts[day] = (counts[day] || 0) + 1;
        });
        setWeeklyData(DAYS.map(d => ({ day: d, count: counts[d] })));
      })
      .catch(() => {});
  }, [user?.firebaseUid]);

  // Live reports
  useEffect(() => {
    if (!user?.firebaseUid) return;
    const unsub = listenPatientReports(user.firebaseUid, setReports);
    return unsub;
  }, [user?.firebaseUid]);

  // Live health metrics written by doctor
  useEffect(() => {
    if (!user?.firebaseUid) return;
    const unsub = listenHealthMetrics(user.firebaseUid, setLiveMetrics);
    return unsub;
  }, [user?.firebaseUid]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setShowNote(true);
    e.target.value = '';
  };

  const handleUpload = async () => {
    if (!pendingFile || !user?.firebaseUid) return;
    setUploading(true);
    try {
      await saveReport(user.firebaseUid, {
        patientUid:  user.firebaseUid,
        patientName: user.name || 'Patient',
        fileName:    pendingFile.name,
        fileType:    pendingFile.type.startsWith('image') ? 'image' : 'pdf',
        notes:       uploadNote.trim() || undefined,
        uploadedAt:  Date.now(),
      });
      setUploadDone(true);
      setPendingFile(null);
      setUploadNote('');
      setShowNote(false);
      setTimeout(() => setUploadDone(false), 3000);
    } catch {}
    setUploading(false);
  };

  const maxBar = Math.max(...weeklyData.map(d => d.count), 1);

  // Build display metrics from live data (or dashes if none)
  const displayMetrics: {
    label: string; value: string; unit: string;
    status: Status; trend: Trend; barPct: number;
  }[] = liveMetrics
    ? [
        {
          label:  'Blood Pressure',
          value:  liveMetrics.bloodPressure,
          unit:   'mmHg',
          status: bpStatus(liveMetrics.bloodPressure),
          trend:  'stable',
          barPct: Math.min(100, Math.round((parseInt(liveMetrics.bloodPressure) / 200) * 100)),
        },
        {
          label:  'Heart Rate',
          value:  String(liveMetrics.heartRate),
          unit:   'bpm',
          status: hrStatus(liveMetrics.heartRate),
          trend:  liveMetrics.heartRate > 100 ? 'up' : 'stable',
          barPct: Math.min(100, Math.round((liveMetrics.heartRate / 150) * 100)),
        },
        {
          label:  'Blood Sugar',
          value:  String(liveMetrics.bloodSugar),
          unit:   'mg/dL',
          status: sugarStatus(liveMetrics.bloodSugar),
          trend:  liveMetrics.bloodSugar > 99 ? 'up' : 'stable',
          barPct: Math.min(100, Math.round((liveMetrics.bloodSugar / 300) * 100)),
        },
        {
          label:  'SpO\u2082',
          value:  String(liveMetrics.spo2),
          unit:   '%',
          status: spo2Status(liveMetrics.spo2),
          trend:  liveMetrics.spo2 < 97 ? 'down' : 'stable',
          barPct: Math.min(100, liveMetrics.spo2),
        },
        {
          label:  'Temperature',
          value:  String(liveMetrics.temperature),
          unit:   '\u00b0F',
          status: tempStatus(liveMetrics.temperature),
          trend:  liveMetrics.temperature > 99 ? 'up' : 'stable',
          barPct: Math.min(100, Math.round(((liveMetrics.temperature - 95) / 15) * 100)),
        },
        {
          label:  'Cholesterol',
          value:  String(liveMetrics.cholesterol),
          unit:   'mg/dL',
          status: cholStatus(liveMetrics.cholesterol),
          trend:  liveMetrics.cholesterol > 200 ? 'up' : 'down',
          barPct: Math.min(100, Math.round((liveMetrics.cholesterol / 300) * 100)),
        },
      ]
    : [
        { label: 'Blood Pressure', value: '\u2014', unit: 'mmHg',  status: 'normal',   trend: 'stable', barPct: 0 },
        { label: 'Heart Rate',     value: '\u2014', unit: 'bpm',   status: 'normal',   trend: 'stable', barPct: 0 },
        { label: 'Blood Sugar',    value: '\u2014', unit: 'mg/dL', status: 'moderate', trend: 'up',     barPct: 0 },
        { label: 'SpO\u2082',      value: '\u2014', unit: '%',     status: 'normal',   trend: 'stable', barPct: 0 },
        { label: 'Temperature',    value: '\u2014', unit: '\u00b0F', status: 'normal', trend: 'stable', barPct: 0 },
        { label: 'Cholesterol',    value: '\u2014', unit: 'mg/dL', status: 'moderate', trend: 'down',   barPct: 0 },
      ];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {displayMetrics.map(metric => {
          const config = metricStatusConfig[metric.status];
          return (
            <div key={metric.label}
              className={`bg-white rounded-2xl shadow-card border-t-4 ${config.border.replace('border-', 'border-t-')} p-4 hover:shadow-soft transition-all`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500 font-medium">{metric.label}</p>
                {metric.trend === 'up'
                  ? <TrendingUp  className="w-3.5 h-3.5 text-orange-500" />
                  : metric.trend === 'down'
                  ? <TrendingDown className="w-3.5 h-3.5 text-green-500" />
                  : <Minus className="w-3.5 h-3.5 text-gray-400" />}
              </div>
              <div className="flex items-end gap-1 mb-2">
                <span className={`text-2xl font-black ${config.color}`}>{metric.value}</span>
                <span className="text-gray-400 text-xs mb-1">{metric.unit}</span>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg ${config.bg} ${config.color}`}>
                {config.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Last-updated banner OR placeholder banner */}
      {liveMetrics ? (
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 text-xs text-teal-700 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
          Last updated by <strong className="mx-1">Dr. {liveMetrics.updatedByName}</strong>
          on {new Date(liveMetrics.updatedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
        </div>
      ) : (
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 text-xs text-teal-700">
          \uD83D\uDCA1 Health metrics will appear here once your doctor fills them in during your appointment.
        </div>
      )}

      {/* Weekly bar chart */}
      <div className="bg-white rounded-2xl shadow-card p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-teal-600" />
            <h3 className="font-semibold text-teal-900">Weekly Appointment Activity</h3>
          </div>
          <span className="text-xs text-teal-600 font-medium bg-teal-50 px-2 py-1 rounded-lg border border-teal-200">Live</span>
        </div>
        <div className="flex items-end gap-3 h-36">
          {weeklyData.map(d => (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5">
              <span className="text-[10px] text-gray-500 font-medium">{d.count}</span>
              <div className="w-full flex items-end" style={{ height: '96px' }}>
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-teal-600 to-teal-400"
                  style={{ height: `${Math.max((d.count / maxBar) * 96, d.count > 0 ? 4 : 2)}px` }}
                />
              </div>
              <span className="text-[10px] text-gray-400">{d.day}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Vitals progress bars */}
        <div className="bg-white rounded-2xl shadow-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-4 h-4 text-red-500 fill-red-500" />
            <h3 className="font-semibold text-teal-900">Vitals Summary</h3>
          </div>
          <div className="space-y-3">
            {displayMetrics.slice(0, 3).map(metric => {
              const config = metricStatusConfig[metric.status];
              return (
                <div key={metric.label} className="flex items-center gap-3">
                  <p className="text-xs text-gray-600 w-32 flex-shrink-0">{metric.label}</p>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${config.bar} transition-all duration-700`}
                      style={{ width: `${Math.max(metric.barPct, 5)}%` }}
                    />
                  </div>
                  <span className={`text-xs font-semibold w-20 text-right ${config.color}`}>
                    {metric.value !== '\u2014' ? `${metric.value} ${metric.unit}` : '\u2014'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upload reports */}
        <div className="bg-white rounded-2xl shadow-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Upload className="w-4 h-4 text-teal-600" />
            <h3 className="font-semibold text-teal-900">Upload Reports</h3>
          </div>

          {showNote && pendingFile && (
            <div className="mb-3 border border-teal-200 rounded-xl p-3 bg-teal-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-teal-800 truncate flex-1">{pendingFile.name}</span>
                <button onClick={() => { setPendingFile(null); setShowNote(false); }}>
                  <X className="w-3.5 h-3.5 text-gray-400" />
                </button>
              </div>
              <input
                value={uploadNote}
                onChange={e => setUploadNote(e.target.value)}
                placeholder="Add a note for your doctor (optional)..."
                className="w-full px-2.5 py-2 text-xs border border-teal-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 mb-2"
              />
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all disabled:opacity-60"
              >
                {uploading
                  ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...</>
                  : <><Upload className="w-3.5 h-3.5" /> Save Report</>}
              </button>
            </div>
          )}

          {uploadDone && (
            <div className="mb-3 flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-xl p-2.5 text-xs font-semibold">
              <CheckCircle className="w-4 h-4" /> Report saved! Your doctor can now view it.
            </div>
          )}

          <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFileChange} />
          <div
            className="border-2 border-dashed border-teal-200 rounded-xl p-5 text-center hover:border-teal-400 transition-colors cursor-pointer group"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-7 h-7 text-teal-300 mx-auto mb-2 group-hover:text-teal-500 transition-colors" />
            <p className="text-sm text-gray-600 font-medium">Drop files or click to upload</p>
            <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG up to 10MB</p>
          </div>

          {reports.length > 0 && (
            <div className="mt-3 space-y-2">
              {reports.map(r => (
                <div key={r.id} className="flex items-center gap-2.5 p-2.5 bg-teal-50 rounded-xl">
                  <Zap className="w-3.5 h-3.5 text-teal-600" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-teal-800 font-medium truncate block">{r.fileName}</span>
                    <span className="text-[10px] text-gray-400">{new Date(r.uploadedAt).toLocaleDateString('en-IN')}</span>
                  </div>
                  <span className="text-[10px] text-green-600 font-semibold">Uploaded</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
