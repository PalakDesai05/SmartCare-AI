/**
 * EmergencyDemoFlow.tsx
 * Real-time emergency handling demo — 10 animated steps
 */
import { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle, X, Heart, User, Clock, CheckCircle,
  Ambulance, Stethoscope, FileText, QrCode, Star,
  ShieldAlert, Zap, Activity, ChevronRight, RefreshCw,
  Phone, MapPin, Pill, Banknote, BadgeCheck,
} from 'lucide-react';

interface EmergencyDemoFlowProps {
  symptom?: string;   // e.g. "chest pain"
  onClose: () => void;
}

// ─── Step definitions ─────────────────────────────────────
interface Step {
  id: number;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  duration: number;       // ms before auto-advance
  theme: 'red' | 'orange' | 'teal' | 'green' | 'yellow' | 'purple';
  content: React.FC<{ step: Step; elapsed: number }>;
}

// Fake live doctor assignment
const DEMO_DOCTOR = {
  name:   'Dr. Ananya Sharma',
  spec:   'Cardiologist',
  room:   'Block A, Room 204',
  rating: 4.9,
  status: 'Available Now',
};

const STEPS: Step[] = [
  {
    id: 1,
    title: '🚨 EMERGENCY DETECTED',
    subtitle: 'Possible Cardiac Risk',
    icon: ShieldAlert,
    duration: 3500,
    theme: 'red',
    content: ({ elapsed }) => (
      <div className="space-y-5 text-center">
        <div className={`text-6xl transition-all duration-500 ${elapsed > 300 ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
          🫀
        </div>
        <div className="space-y-2">
          <p className="text-white/90 font-semibold text-lg">Symptom Detected:</p>
          <div className="inline-block bg-white/20 rounded-2xl px-5 py-2.5 text-white font-black text-xl tracking-wide">
            ❤️ Chest Pain
          </div>
        </div>
        <div className={`space-y-3 transition-all duration-700 delay-500 ${elapsed > 800 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="bg-white/10 rounded-2xl p-4 text-left space-y-2">
            <p className="text-white/70 text-xs uppercase tracking-wider font-bold">Immediate Actions</p>
            {['📞 Calling ambulance 108…', '🏥 Alerting nearest ER…', '🩺 Finding available cardiologist…'].map((a, i) => (
              <div key={i} className={`flex items-center gap-2 text-white text-sm transition-all duration-500`}
                style={{ transitionDelay: `${600 + i * 300}ms`, opacity: elapsed > 1000 + i * 300 ? 1 : 0.1 }}>
                <div className="w-2 h-2 rounded-full bg-red-300 animate-pulse flex-shrink-0" />
                {a}
              </div>
            ))}
          </div>
          <a href="tel:108"
            className="flex items-center justify-center gap-2 bg-white text-red-600 font-black py-3 rounded-2xl hover:bg-red-50 transition-all text-base shadow-lg">
            <Phone className="w-5 h-5 animate-bounce" /> Call 108 — Ambulance
          </a>
        </div>
      </div>
    ),
  },
  {
    id: 2,
    title: '🫀 Connecting to Specialist',
    subtitle: 'Smart Doctor Auto-Assign',
    icon: Stethoscope,
    duration: 3500,
    theme: 'orange',
    content: ({ elapsed }) => (
      <div className="space-y-5">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-4">
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center">
              <Stethoscope className="w-9 h-9 text-white" />
            </div>
            <div className="absolute inset-0 rounded-full border-4 border-white/40 animate-ping" />
            <div className="absolute inset-0 rounded-full border-4 border-white/20 animate-ping" style={{ animationDelay: '0.3s' }} />
          </div>
          <p className="text-white/70 text-sm font-medium">Scanning available specialists…</p>
        </div>
        <div className={`bg-white/15 rounded-2xl p-4 transition-all duration-700 ${elapsed > 1500 ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-white/25 flex items-center justify-center text-2xl">👩‍⚕️</div>
            <div>
              <p className="text-white font-black text-base">{DEMO_DOCTOR.name}</p>
              <p className="text-white/70 text-xs">{DEMO_DOCTOR.spec}</p>
            </div>
            <span className="ml-auto bg-green-400/30 text-green-200 text-[10px] font-bold px-2 py-1 rounded-lg">
              ✓ AVAILABLE
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: '📍', label: DEMO_DOCTOR.room },
              { icon: '⭐', label: `${DEMO_DOCTOR.rating}/5 Rating` },
              { icon: '🟢', label: 'On Duty' },
              { icon: '⚡', label: 'Response: <2 min' },
            ].map((item, i) => (
              <div key={i} className="bg-white/10 rounded-xl px-2.5 py-1.5 flex items-center gap-1.5">
                <span className="text-xs">{item.icon}</span>
                <span className="text-white/80 text-[11px] font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
        {elapsed > 2200 && (
          <div className="text-center text-green-300 font-bold text-sm animate-fade-in flex items-center justify-center gap-2">
            <CheckCircle className="w-4 h-4" /> Doctor confirmed & notified!
          </div>
        )}
      </div>
    ),
  },
  {
    id: 3,
    title: '🎫 Emergency Token Generated',
    subtitle: 'Priority: IMMEDIATE',
    icon: Zap,
    duration: 3000,
    theme: 'red',
    content: ({ elapsed }) => (
      <div className="space-y-4 text-center">
        <div className={`transition-all duration-700 ${elapsed > 300 ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
          <div className="bg-white rounded-2xl p-6 shadow-xl mx-auto max-w-xs">
            <div className="text-5xl font-black text-red-600 mb-1">E-01</div>
            <div className="text-xs text-gray-400 uppercase tracking-widest mb-3">Emergency Token</div>
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-red-50 rounded-xl px-3 py-2">
                <span className="text-xs text-gray-500">Priority</span>
                <span className="text-xs font-black text-red-600 flex items-center gap-1">
                  🔴 HIGH — IMMEDIATE
                </span>
              </div>
              <div className="flex items-center justify-between bg-green-50 rounded-xl px-3 py-2">
                <span className="text-xs text-gray-500">Wait Time</span>
                <span className="text-xs font-black text-green-700">⚡ NO WAIT</span>
              </div>
              <div className="flex items-center justify-between bg-blue-50 rounded-xl px-3 py-2">
                <span className="text-xs text-gray-500">Doctor</span>
                <span className="text-xs font-semibold text-blue-700">Dr. Ananya S.</span>
              </div>
              <div className="flex items-center justify-between bg-orange-50 rounded-xl px-3 py-2">
                <span className="text-xs text-gray-500">Room</span>
                <span className="text-xs font-semibold text-orange-700">Block A · 204</span>
              </div>
            </div>
          </div>
        </div>
        {elapsed > 1500 && (
          <p className="text-white/80 text-sm animate-fade-in">
            🔔 Token sent to your phone & displayed at reception
          </p>
        )}
      </div>
    ),
  },
  {
    id: 4,
    title: '📊 Live Status Tracking',
    subtitle: 'Real-time emergency response',
    icon: Activity,
    duration: 4000,
    theme: 'teal',
    content: ({ elapsed }) => {
      const statuses = [
        { icon: '🚑', label: 'Ambulance', status: 'On the Way', color: 'text-yellow-300', bg: 'bg-yellow-500/20', progress: Math.min(100, (elapsed / 4000) * 80) },
        { icon: '🩺', label: 'Dr. Ananya', status: 'Ready & Waiting', color: 'text-green-300', bg: 'bg-green-500/20', progress: 100 },
        { icon: '🏥', label: 'Emergency Room', status: 'Room 204 Clear', color: 'text-blue-300', bg: 'bg-blue-500/20', progress: 100 },
        { icon: '🩸', label: 'Blood Type', status: 'Record Accessed', color: 'text-red-300', bg: 'bg-red-500/20', progress: elapsed > 1000 ? 100 : 0 },
      ];
      return (
        <div className="space-y-3">
          {statuses.map((s, i) => (
            <div key={i}
              className={`${s.bg} rounded-2xl p-3.5 transition-all duration-500`}
              style={{ transitionDelay: `${i * 200}ms`, opacity: elapsed > i * 300 ? 1 : 0.2 }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{s.icon}</span>
                  <div>
                    <p className="text-white font-bold text-sm">{s.label}</p>
                    <p className={`text-xs ${s.color}`}>{s.status}</p>
                  </div>
                </div>
                <span className="text-white/60 text-xs font-bold">{Math.round(s.progress)}%</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-1000 ${s.color.replace('text-', 'bg-')}`}
                  style={{ width: `${s.progress}%` }} />
              </div>
            </div>
          ))}
        </div>
      );
    },
  },
  {
    id: 5,
    title: '👨‍⚕️ Doctor Dashboard Updated',
    subtitle: 'Doctor sees emergency alert instantly',
    icon: User,
    duration: 3000,
    theme: 'purple',
    content: ({ elapsed }) => (
      <div className="space-y-3">
        <div className={`bg-white/10 rounded-2xl p-4 border border-red-300/30 transition-all duration-700 ${elapsed > 300 ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
            <p className="text-white/70 text-xs uppercase tracking-wide font-bold">New Emergency Patient</p>
          </div>
          <div className="space-y-2">
            {[
              { label: 'Patient', value: 'Demo Patient', icon: '👤' },
              { label: 'Symptoms', value: 'Chest Pain', icon: '❤️' },
              { label: 'Priority', value: 'HIGH (Red)', icon: '🔴' },
              { label: 'Token', value: 'E-01 · No Wait', icon: '🎫' },
            ].map((row, i) => (
              <div key={i}
                className="flex items-center justify-between bg-white/10 rounded-xl px-3 py-2 transition-all duration-500"
                style={{ transitionDelay: `${400 + i * 200}ms`, opacity: elapsed > 400 + i * 200 ? 1 : 0 }}>
                <span className="text-white/60 text-xs flex items-center gap-1.5">
                  {row.icon} {row.label}
                </span>
                <span className={`text-xs font-bold ${row.label === 'Priority' ? 'text-red-300' : 'text-white'}`}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>
        {elapsed > 2000 && (
          <div className="bg-green-500/20 rounded-2xl p-3 flex items-center gap-2 animate-fade-in">
            <CheckCircle className="w-4 h-4 text-green-300 flex-shrink-0" />
            <p className="text-green-200 text-xs font-semibold">Doctor confirmed receipt of emergency alert</p>
          </div>
        )}
      </div>
    ),
  },
  {
    id: 6,
    title: '📂 Patient Data Auto-Accessed',
    subtitle: 'Doctor views full medical history',
    icon: FileText,
    duration: 3000,
    theme: 'teal',
    content: ({ elapsed }) => {
      const records = [
        { icon: '🩸', name: 'Blood Test Report', date: '12 Apr 2026', type: 'Lab' },
        { icon: '🫀', name: 'ECG Scan', date: '5 Mar 2026', type: 'Cardiology' },
        { icon: '💊', name: 'Last Prescription', date: '1 Apr 2026', type: 'Pharmacy' },
        { icon: '📊', name: 'Health Metrics', date: 'Live', type: 'Vitals' },
      ];
      return (
        <div className="space-y-2">
          <p className={`text-white/70 text-xs text-center mb-3 transition-all duration-500 ${elapsed > 300 ? 'opacity-100' : 'opacity-0'}`}>
            🔓 Emergency access granted automatically
          </p>
          {records.map((r, i) => (
            <div key={i}
              className="bg-white/10 rounded-xl flex items-center gap-3 px-3 py-2.5 transition-all duration-500"
              style={{ transitionDelay: `${300 + i * 250}ms`, opacity: elapsed > 300 + i * 250 ? 1 : 0.1,
                        transform: elapsed > 300 + i * 250 ? 'translateX(0)' : 'translateX(-20px)' }}>
              <span className="text-lg">{r.icon}</span>
              <div className="flex-1">
                <p className="text-white text-xs font-semibold">{r.name}</p>
                <p className="text-white/50 text-[10px]">{r.date}</p>
              </div>
              <span className="text-[10px] bg-teal-500/30 text-teal-200 px-2 py-0.5 rounded-lg font-bold">
                {r.type}
              </span>
            </div>
          ))}
          {elapsed > 2000 && (
            <div className="text-center text-green-300 text-xs font-semibold animate-fade-in">
              ✅ All records loaded in the doctor's view
            </div>
          )}
        </div>
      );
    },
  },
  {
    id: 7,
    title: '💊 Treatment Complete',
    subtitle: 'Prescription sent to patient & pharmacy',
    icon: Pill,
    duration: 3500,
    theme: 'green',
    content: ({ elapsed }) => (
      <div className="space-y-3">
        <div className={`transition-all duration-700 ${elapsed > 300 ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
          <div className="bg-white/15 rounded-2xl p-4 space-y-2">
            <p className="text-white font-bold text-sm flex items-center gap-2">
              <Pill className="w-4 h-4" /> Prescription Issued
            </p>
            {['Aspirin 75mg — 1 tab morning', 'Atorvastatin 10mg — 1 tab night', 'Pantoprazole 40mg — before meals'].map((med, i) => (
              <div key={i}
                className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2"
                style={{ opacity: elapsed > 600 + i * 300 ? 1 : 0.1, transition: 'opacity 0.5s' }}>
                <div className="w-1.5 h-1.5 bg-teal-300 rounded-full flex-shrink-0" />
                <p className="text-white/90 text-xs">{med}</p>
              </div>
            ))}
          </div>
        </div>
        <div className={`grid grid-cols-2 gap-2 transition-all duration-700 ${elapsed > 1800 ? 'opacity-100' : 'opacity-0'}`}>
          <div className="bg-blue-500/20 rounded-xl p-3 text-center">
            <p className="text-blue-200 text-[10px] font-bold uppercase mb-1">Sent to Patient</p>
            <p className="text-white text-xs">📱 App + SMS</p>
          </div>
          <div className="bg-orange-500/20 rounded-xl p-3 text-center">
            <p className="text-orange-200 text-[10px] font-bold uppercase mb-1">Sent to Pharmacy</p>
            <p className="text-white text-xs">🏪 HealthPlus Rx</p>
          </div>
        </div>
        {elapsed > 2800 && (
          <div className="text-center text-green-300 text-xs font-semibold animate-fade-in flex items-center justify-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" /> Medicines ready for pickup
          </div>
        )}
      </div>
    ),
  },
  {
    id: 8,
    title: '💳 Fast Payment',
    subtitle: 'Emergency consultation — ₹500',
    icon: QrCode,
    duration: 3500,
    theme: 'yellow',
    content: ({ elapsed }) => (
      <div className="space-y-4">
        <div className={`grid grid-cols-2 gap-3 transition-all duration-700 ${elapsed > 400 ? 'opacity-100' : 'opacity-0'}`}>
          {/* QR option */}
          <div className="bg-white rounded-2xl p-4 text-center shadow-lg">
            <QrCode className="w-8 h-8 text-teal-600 mx-auto mb-2" />
            <p className="text-gray-700 font-black text-lg">₹500</p>
            <p className="text-gray-500 text-[10px] mb-2">UPI / QR Pay</p>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent('upi://pay?pa=healthai@upi&pn=SmartCare+AI&am=500&cu=INR&tn=Emergency+Fee')}&margin=4`}
              alt="QR" className="w-24 h-24 mx-auto rounded-lg border border-gray-100"
            />
            <p className="text-[10px] text-teal-600 mt-2 font-semibold">Scan to Pay</p>
          </div>
          {/* Cash option */}
          <div className={`bg-white/10 rounded-2xl p-4 text-center flex flex-col justify-center transition-all duration-700 delay-300 ${elapsed > 800 ? 'opacity-100' : 'opacity-0'}`}>
            <Banknote className="w-8 h-8 text-white/80 mx-auto mb-2" />
            <p className="text-white font-bold text-sm">Cash at Counter</p>
            <p className="text-white/60 text-[10px] mt-1">Show Token E-01 at billing desk</p>
            <div className="mt-3 bg-white/10 rounded-xl px-2 py-1.5">
              <p className="text-white/80 text-[10px] font-mono">Rx: E-01-EMG</p>
            </div>
          </div>
        </div>
        {elapsed > 2000 && (
          <div className="bg-green-500/20 rounded-xl p-3 flex items-center gap-2 animate-fade-in">
            <BadgeCheck className="w-4 h-4 text-green-300 flex-shrink-0" />
            <p className="text-green-200 text-xs font-semibold">Payment optional — emergency treatment starts immediately</p>
          </div>
        )}
      </div>
    ),
  },
  {
    id: 9,
    title: '⭐ Rate Your Experience',
    subtitle: 'Help improve emergency care',
    icon: Star,
    duration: 4000,
    theme: 'teal',
    content: ({ elapsed }) => {
      const [rating, setRating] = useState(0);
      const [hov,    setHov]    = useState(0);
      const [done,   setDone]   = useState(false);
      return done ? (
        <div className="text-center py-4 space-y-3 animate-fade-in">
          <div className="text-5xl">🌟</div>
          <p className="text-white font-bold text-lg">Thank you!</p>
          <p className="text-white/70 text-sm">Your feedback helps Dr. {DEMO_DOCTOR.name} and the team.</p>
          <div className="bg-green-500/20 rounded-xl p-3 flex items-center justify-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-300" />
            <p className="text-green-200 text-sm font-semibold">Doctor rating updated ✨</p>
          </div>
        </div>
      ) : (
        <div className={`space-y-4 transition-all duration-700 ${elapsed > 300 ? 'opacity-100' : 'opacity-0'}`}>
          <div className="text-center">
            <p className="text-white text-base font-bold">How was Dr. {DEMO_DOCTOR.name}?</p>
            <p className="text-white/60 text-xs mt-1">{DEMO_DOCTOR.spec} · Emergency Consultation</p>
          </div>
          <div className="flex justify-center gap-3">
            {[1, 2, 3, 4, 5].map(s => (
              <button key={s}
                onMouseEnter={() => setHov(s)} onMouseLeave={() => setHov(0)}
                onClick={() => setRating(s)}
                className="transition-all duration-200 hover:scale-125 active:scale-95">
                <Star className={`w-10 h-10 transition-colors ${s <= (hov || rating) ? 'text-yellow-400 fill-yellow-400' : 'text-white/30'}`} />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <div className="text-center animate-fade-in">
              <p className="text-yellow-300 font-semibold text-sm mb-3">
                {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent!'][rating]}
              </p>
              <button onClick={() => setDone(true)}
                className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-black px-8 py-2.5 rounded-xl text-sm transition-all flex items-center gap-2 mx-auto">
                <Star className="w-4 h-4 fill-yellow-600 text-yellow-600" /> Submit Feedback
              </button>
            </div>
          )}
        </div>
      );
    },
  },
  {
    id: 10,
    title: '✅ Emergency Resolved',
    subtitle: 'Full cycle completed',
    icon: BadgeCheck,
    duration: 99999,
    theme: 'green',
    content: ({ elapsed }) => (
      <div className="text-center space-y-4">
        <div className={`transition-all duration-1000 ${elapsed > 200 ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
          <div className="w-24 h-24 mx-auto bg-green-400/20 rounded-full flex items-center justify-center mb-3">
            <CheckCircle className="w-12 h-12 text-green-300" />
          </div>
          <p className="text-white font-black text-2xl">Emergency Handled!</p>
          <p className="text-white/70 text-sm mt-1">Patient stable · All systems updated</p>
        </div>
        <div className={`grid grid-cols-2 gap-2 text-left transition-all duration-700 delay-500 ${elapsed > 700 ? 'opacity-100' : 'opacity-0'}`}>
          {[
            { icon: '🚨', label: 'Detected', value: 'Cardiac Risk' },
            { icon: '🩺', label: 'Doctor', value: 'Dr. Ananya S.' },
            { icon: '🎫', label: 'Token', value: 'E-01 · No Wait' },
            { icon: '💊', label: 'Rx', value: '3 medicines' },
            { icon: '💳', label: 'Bill', value: '₹500' },
            { icon: '⭐', label: 'Rating', value: 'Updated' },
          ].map((row, i) => (
            <div key={i} className="bg-white/10 rounded-xl px-3 py-2">
              <p className="text-white/50 text-[10px]">{row.icon} {row.label}</p>
              <p className="text-white font-semibold text-xs">{row.value}</p>
            </div>
          ))}
        </div>
        <div className={`text-center transition-all duration-500 delay-1000 ${elapsed > 1200 ? 'opacity-100' : 'opacity-0'}`}>
          <p className="text-green-300 text-xs font-semibold">
            🏆 SmartCare AI handled this in under 60 seconds
          </p>
        </div>
      </div>
    ),
  },
];

// ─── Theme Config ─────────────────────────────────────────
const THEMES: Record<string, { bg: string; ring: string; badge: string }> = {
  red:    { bg: 'from-red-700 to-red-900',     ring: 'ring-red-500',    badge: 'bg-red-500/30 text-red-200'    },
  orange: { bg: 'from-orange-600 to-red-700',  ring: 'ring-orange-400', badge: 'bg-orange-500/30 text-orange-200' },
  teal:   { bg: 'from-teal-700 to-teal-900',   ring: 'ring-teal-500',   badge: 'bg-teal-500/30 text-teal-200'  },
  green:  { bg: 'from-green-700 to-teal-800',  ring: 'ring-green-400',  badge: 'bg-green-500/30 text-green-200' },
  yellow: { bg: 'from-yellow-600 to-orange-700', ring: 'ring-yellow-400', badge: 'bg-yellow-500/30 text-yellow-100' },
  purple: { bg: 'from-purple-700 to-indigo-900', ring: 'ring-purple-400', badge: 'bg-purple-500/30 text-purple-200' },
};

// ─── Main Component ───────────────────────────────────────
export default function EmergencyDemoFlow({ symptom = 'Chest Pain', onClose }: EmergencyDemoFlowProps) {
  const [stepIdx, setStepIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [paused,  setPaused]  = useState(false);

  const step  = STEPS[stepIdx];
  const theme = THEMES[step.theme];
  const isLast = stepIdx === STEPS.length - 1;

  // Elapsed timer
  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setElapsed(e => e + 50), 50);
    return () => clearInterval(t);
  }, [paused, stepIdx]);

  // Auto-advance
  useEffect(() => {
    if (paused || isLast) return;
    if (elapsed >= step.duration) {
      setStepIdx(i => i + 1);
      setElapsed(0);
    }
  }, [elapsed, step.duration, paused, isLast]);

  const goNext = useCallback(() => {
    if (isLast) return;
    setStepIdx(i => i + 1);
    setElapsed(0);
  }, [isLast]);

  const goPrev = useCallback(() => {
    if (stepIdx === 0) return;
    setStepIdx(i => i - 1);
    setElapsed(0);
  }, [stepIdx]);

  const progress = isLast ? 100 : Math.min(100, (elapsed / step.duration) * 100);
  const StepIcon = step.icon;
  const StepContent = step.content;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">

      {/* Flashing red border for step 1 */}
      {step.theme === 'red' && stepIdx === 0 && (
        <div className="fixed inset-0 border-8 border-red-500 animate-pulse pointer-events-none z-[101] rounded-none" />
      )}

      <div className={`w-full max-w-sm bg-gradient-to-b ${theme.bg} rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,0.6)] overflow-hidden ring-2 ${theme.ring} flex flex-col`}
        style={{ maxHeight: '92vh' }}>

        {/* ── Header ── */}
        <div className="px-4 pt-4 pb-3 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            {/* Step dots */}
            <div className="flex gap-1">
              {STEPS.map((_, i) => (
                <div key={i}
                  className={`rounded-full transition-all duration-300 ${
                    i === stepIdx ? 'w-5 h-2 bg-white' : i < stepIdx ? 'w-2 h-2 bg-white/60' : 'w-2 h-2 bg-white/20'
                  }`} />
              ))}
            </div>
            {/* Controls */}
            <div className="flex items-center gap-1.5">
              <button onClick={() => setPaused(p => !p)}
                className="p-1.5 rounded-lg bg-white/10 text-white/70 hover:bg-white/20 transition-all">
                {paused ? <Zap className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
              </button>
              <button onClick={onClose} className="p-1.5 rounded-lg bg-white/10 text-white/70 hover:bg-white/20 transition-all">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Progress bar */}
          {!isLast && (
            <div className="h-1 bg-white/10 rounded-full overflow-hidden mb-3">
              <div className="h-full bg-white/70 rounded-full transition-all duration-100"
                style={{ width: `${progress}%` }} />
            </div>
          )}

          {/* Step badge */}
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider ${theme.badge} mb-2`}>
            <StepIcon className="w-3 h-3" />
            Step {step.id} of {STEPS.length}
          </div>

          <h2 className="text-white font-black text-lg leading-tight">{step.title}</h2>
          <p className="text-white/60 text-xs mt-0.5">{step.subtitle}</p>
        </div>

        {/* ── Step content ── */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <StepContent step={step} elapsed={elapsed} />
        </div>

        {/* ── Navigation ── */}
        <div className="px-4 pb-4 pt-3 flex-shrink-0 border-t border-white/10 flex gap-2">
          <button onClick={goPrev} disabled={stepIdx === 0}
            className="px-4 py-2.5 bg-white/10 text-white/70 rounded-xl text-sm font-semibold hover:bg-white/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
            ← Back
          </button>
          <button onClick={isLast ? onClose : goNext}
            className={`flex-1 py-2.5 rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2 ${
              isLast
                ? 'bg-green-400 hover:bg-green-300 text-gray-900'
                : 'bg-white/20 hover:bg-white/30 text-white'
            }`}>
            {isLast ? (
              <><CheckCircle className="w-4 h-4" /> Close Demo</>
            ) : (
              <>Next <ChevronRight className="w-4 h-4" /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
