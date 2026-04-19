import { useState } from 'react';
import {
  Heart, User, Stethoscope, ShieldCheck, Eye, EyeOff,
  Mail, Lock, ArrowRight, Pill, Phone, AlertCircle,
} from 'lucide-react';
import { useAuth, type Role } from '../../contexts/AuthContext';

interface AuthPageProps {
  onLogin?: (role: Role, name: string, userId: number) => void;
}

// Google 'G' logo SVG (official brand colours)
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

const roles = [
  { id: 'patient'  as Role, label: 'Patient',  icon: User        },
  { id: 'doctor'   as Role, label: 'Doctor',   icon: Stethoscope },
  { id: 'admin'    as Role, label: 'Admin',    icon: ShieldCheck },
  { id: 'pharmacy' as Role, label: 'Pharmacy', icon: Pill        },
];

const features = [
  { icon: '🤖', text: 'AI-powered appointment scheduling'     },
  { icon: '⏱️', text: 'Real-time queue tracking'               },
  { icon: '📋', text: 'Digital prescriptions & report management' },
  { icon: '🚨', text: 'Emergency response system'              },
  { icon: '💊', text: 'Pharmacy billing & medicine tracking'  },
];

export default function AuthPage({ onLogin }: AuthPageProps) {
  const { loginWithEmail, loginWithGoogle, register, isLoading, error, clearError } = useAuth();

  const [selectedRole, setSelectedRole] = useState<Role>('patient');
  const [isRegister,   setIsRegister]   = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    clearError();
    setForm(prev => ({ ...prev, [k]: e.target.value }));
  };

  // ── Email / password submit ────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isRegister) {
        await register({
          name:     form.name,
          email:    form.email,
          password: form.password,
          phone:    form.phone || undefined,
        });
      } else {
        await loginWithEmail(form.email, form.password);
      }
    } catch { /* error already in context */ }
  };

  // ── Google sign-in ─────────────────────────────────────
  const handleGoogle = async () => {
    setGoogleLoading(true);
    clearError();
    try {
      await loginWithGoogle();
    } catch { /* error already in context */ } finally {
      setGoogleLoading(false);
    }
  };

  const busy = isLoading || googleLoading;

  return (
    <div className="min-h-screen bg-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-0 shadow-soft rounded-3xl overflow-hidden animate-fade-in">

        {/* ── Left panel — clean premium branding ── */}
        <div className="bg-gradient-to-br from-teal-600 via-teal-700 to-teal-800 p-10 flex flex-col justify-between text-white relative overflow-hidden">

          {/* Decorative circles */}
          <div className="absolute -top-16 -right-16 w-52 h-52 bg-white/5 rounded-full pointer-events-none" />
          <div className="absolute -bottom-20 -left-12 w-64 h-64 bg-white/5 rounded-full pointer-events-none" />

          {/* Logo + brand */}
          <div>
            <div className="flex items-center gap-3 mb-10">
              <div className="bg-white/15 p-2.5 rounded-2xl backdrop-blur-sm">
                <Heart className="w-7 h-7 text-white fill-white" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight">SmartCare AI</h1>
                <p className="text-teal-300 text-xs font-medium">Smart Healthcare Platform</p>
              </div>
            </div>

            {/* Headline */}
            <h2 className="text-3xl font-black leading-tight mb-4 tracking-tight">
              Your health,<br />
              <span className="text-teal-300">intelligently</span> managed.
            </h2>

            {/* Description */}
            <p className="text-teal-100 text-sm leading-relaxed max-w-xs">
              A unified healthcare platform connecting{' '}
              <span className="text-white font-semibold">patients</span>,{' '}
              <span className="text-white font-semibold">doctors</span>,{' '}
              <span className="text-white font-semibold">admin</span>, and{' '}
              <span className="text-white font-semibold">pharmacy</span>{' '}
              for seamless digital care.
            </p>
          </div>

          {/* Feature list */}
          <div className="space-y-3">
            <p className="text-teal-300 text-[10px] uppercase font-bold tracking-widest mb-4">Platform Features</p>
            {features.map(f => (
              <div key={f.text} className="flex items-center gap-3 group">
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-sm flex-shrink-0 group-hover:bg-white/20 transition-all">
                  {f.icon}
                </div>
                <span className="text-teal-100 text-sm font-medium">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="bg-white p-10 flex flex-col justify-center">
          <div className="mb-6">
            <h3 className="text-teal-900 text-2xl font-bold mb-1">
              {isRegister ? 'Create Account' : 'Welcome back'}
            </h3>
            <p className="text-gray-500 text-sm">
              {isRegister
                ? 'Register as a patient. Doctors & staff are added by Admin.'
                : 'Sign in to your SmartCare AI dashboard'}
            </p>
          </div>

          {/* Role selector (login only) */}
          {!isRegister && (
            <div className="grid grid-cols-4 gap-2 mb-5">
              {roles.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => { setSelectedRole(id); clearError(); }}
                  className={`p-2.5 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-1.5 ${
                    selectedRole === id
                      ? 'border-teal-600 bg-teal-50 text-teal-700'
                      : 'border-gray-100 text-gray-500 hover:border-teal-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-[10px] font-semibold">{label}</span>
                </button>
              ))}
            </div>
          )}

          {/* ── Google Sign-In ── */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={busy}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border-2 border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 text-gray-700 font-semibold text-sm transition-all duration-200 disabled:opacity-60 mb-4 shadow-sm"
          >
            {googleLoading
              ? <div className="w-4 h-4 border-2 border-gray-300 border-t-teal-600 rounded-full animate-spin" />
              : <GoogleIcon />
            }
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">or continue with email</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 text-sm animate-fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* ── Email / password form ── */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {isRegister && (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text" placeholder="Full Name" value={form.name}
                  onChange={set('name')} required
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                />
              </div>
            )}
            {isRegister && (
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="tel" placeholder="Phone (optional)" value={form.phone}
                  onChange={set('phone')}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email" placeholder="Email address" value={form.email}
                onChange={set('email')} required
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password" value={form.password}
                onChange={set('password')} required minLength={6}
                className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <button
              type="submit" disabled={busy}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-glow disabled:opacity-70"
            >
              {isLoading && !googleLoading
                ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <>{isRegister ? 'Create Account' : 'Sign In'}<ArrowRight className="w-4 h-4" /></>
              }
            </button>
          </form>

          {/* Switch between sign-in / register */}
          <p className="mt-4 text-center text-sm text-gray-500">
            {isRegister ? 'Already have an account?' : "Don't have an account?"}
            <button
              type="button"
              onClick={() => { setIsRegister(!isRegister); clearError(); }}
              className="ml-1 text-teal-600 font-semibold hover:text-teal-700"
            >
              {isRegister ? 'Sign In' : 'Register as Patient'}
            </button>
          </p>

          {!isRegister && (
            <p className="mt-3 text-center text-xs text-gray-400 bg-gray-50 rounded-xl p-2">
              🔒 Doctor, Admin & Pharmacy accounts are created by the Administrator
            </p>
          )}

        </div>
      </div>
    </div>
  );
}
