import { useState, useEffect } from 'react';
import {
  Search, Plus, Store, Trash2, X, RefreshCw, AlertCircle,
  Mail, CheckCircle, Phone, MapPin, Eye, EyeOff,
} from 'lucide-react';
import {
  getAllPharmacies, saveUserProfile, getUserProfile,
  type DbUser,
} from '../../firebase/firebaseDb';

// Firebase Auth REST API — creates account WITHOUT disturbing the admin session
const FIREBASE_API_KEY = 'AIzaSyDVSOCME3VirH7aPGsoyXH4icBw3xYTKP4';

async function createAuthAccount(email: string, password: string): Promise<string> {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  const data = await res.json();
  if (!res.ok) {
    const code: string = data?.error?.message || '';
    if (code.includes('EMAIL_EXISTS'))     throw new Error('An account with this email already exists.');
    if (code.includes('WEAK_PASSWORD'))    throw new Error('Password must be at least 6 characters.');
    if (code.includes('INVALID_EMAIL'))    throw new Error('Invalid email address.');
    if (code.includes('TOO_MANY_ATTEMPTS'))throw new Error('Too many attempts. Try again later.');
    throw new Error(code || 'Failed to create account.');
  }
  return data.localId as string;
}

async function deleteAuthAccount(idToken: string): Promise<void> {
  await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${FIREBASE_API_KEY}`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    }
  );
}

// ── Add Pharmacy Modal ────────────────────────────────────
function AddPharmacyModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    name:     '',
    email:    '',
    password: '',
    phone:    '',
    location: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting,   setSubmitting]   = useState(false);
  const [error,        setError]        = useState('');
  const [success,      setSuccess]      = useState(false);

  const update = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async () => {
    const { name, email, password, phone, location } = form;
    if (!name || !email || !password) {
      setError('Name, email and password are required.'); return;
    }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }

    setSubmitting(true);
    setError('');
    try {
      // 1. Create Firebase Auth account (does NOT log out the admin)
      const uid = await createAuthAccount(email, password);

      // 2. Save user profile with role = 'pharmacy'
      await saveUserProfile({
        uid,
        name,
        email,
        role:      'pharmacy',
        phone:     phone  || undefined,
        createdAt: Date.now(),
      });

      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-soft w-full max-w-lg animate-slide-up">
        {success ? (
          <div className="p-10 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="font-bold text-teal-900 text-xl mb-2">Pharmacy Account Created!</h3>
            <p className="text-gray-500 text-sm mb-1">
              <strong>{form.name}</strong> can now log in with their credentials.
            </p>
            <p className="text-xs text-teal-600 bg-teal-50 border border-teal-200 rounded-xl px-4 py-2 mt-3 inline-flex items-center gap-2">
              <Store className="w-3.5 h-3.5" /> Doctors can now link this pharmacy from their Overview panel
            </p>
            <button onClick={onClose}
              className="mt-6 w-full bg-teal-600 text-white py-3 rounded-xl font-bold hover:bg-teal-700 transition-all">
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center">
                  <Store className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-teal-900">Add Pharmacy</h3>
                  <p className="text-gray-500 text-xs">Creates a Firebase Auth account + pharmacy profile</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-2 gap-4">
              {/* Name */}
              <div className="col-span-2">
                <label className="text-sm font-semibold text-teal-900 block mb-1.5">
                  Pharmacy Name <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    value={form.name} onChange={e => update('name', e.target.value)}
                    placeholder="City Pharmacy / Apollo Pharmacy"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-teal-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="col-span-2">
                <label className="text-sm font-semibold text-teal-900 block mb-1.5">
                  Login Email <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email" value={form.email} onChange={e => update('email', e.target.value)}
                    placeholder="pharmacy@hospital.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-teal-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="col-span-2">
                <label className="text-sm font-semibold text-teal-900 block mb-1.5">
                  Password <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password} onChange={e => update('password', e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-teal-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="text-sm font-semibold text-teal-900 block mb-1.5">Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel" value={form.phone} onChange={e => update('phone', e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-teal-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="text-sm font-semibold text-teal-900 block mb-1.5">Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    value={form.location} onChange={e => update('location', e.target.value)}
                    placeholder="Ground Floor"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-teal-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {error && (
                <div className="col-span-2 flex items-center gap-2 text-red-600 text-xs bg-red-50 border border-red-200 rounded-xl p-3">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="col-span-2 pt-2">
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !form.name || !form.email || !form.password}
                  className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting
                    ? <><RefreshCw className="w-4 h-4 animate-spin" /> Creating Account…</>
                    : <><Plus className="w-4 h-4" /> Create Pharmacy Account</>
                  }
                </button>
                <p className="text-center text-xs text-gray-400 mt-3 flex items-center justify-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  Uses Firebase Auth REST API — admin stays logged in
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────
export default function ManagePharmacy() {
  const [pharmacies,  setPharmacies]  = useState<DbUser[]>([]);
  const [search,      setSearch]      = useState('');
  const [loading,     setLoading]     = useState(true);
  const [showAdd,     setShowAdd]     = useState(false);
  const [deleting,    setDeleting]    = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    getAllPharmacies()
      .then(p => { setPharmacies(p); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = pharmacies.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase())
  );

  const removePharmacy = async (p: DbUser) => {
    if (!confirm(`Remove ${p.name}? This will delete their profile from the database.`)) return;
    setDeleting(p.uid);
    try {
      const { remove } = await import('firebase/database');
      const { ref }    = await import('firebase/database');
      const { db }     = await import('../../firebase/config');
      await remove(ref(db, `users/${p.uid}`));
      setPharmacies(prev => prev.filter(x => x.uid !== p.uid));
    } catch (e) {
      console.error('Delete failed', e);
    }
    setDeleting(null);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {showAdd && (
        <AddPharmacyModal onClose={() => { setShowAdd(false); load(); }} />
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-teal-700 to-teal-600 rounded-2xl p-5 text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Store className="w-4 h-4 text-teal-200" />
              <span className="text-teal-200 text-sm">Admin Panel</span>
            </div>
            <h2 className="text-2xl font-bold">Manage Pharmacy</h2>
            <p className="text-teal-100 text-sm mt-0.5">
              {loading ? 'Loading…' : `${pharmacies.length} pharmacy account${pharmacies.length !== 1 ? 's' : ''} registered`}
            </p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-white text-teal-700 px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-teal-50 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Pharmacy
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-teal-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm transition-all"
          />
        </div>
        <button onClick={load} className="p-2.5 bg-white border border-teal-200 rounded-xl text-teal-600 hover:bg-teal-50 transition-all shadow-sm">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl shadow-card p-4 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-gray-100 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-3/4" />
                  <div className="h-3 bg-gray-50 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && pharmacies.length === 0 && (
        <div className="bg-white rounded-2xl shadow-card p-10 text-center border-2 border-dashed border-teal-200">
          <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8 text-teal-400" />
          </div>
          <h3 className="font-bold text-teal-900 mb-2">No Pharmacies Yet</h3>
          <p className="text-gray-500 text-sm mb-4">Add your first pharmacy to get started.</p>
          <button onClick={() => setShowAdd(true)}
            className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold text-sm transition-all">
            Add First Pharmacy
          </button>
        </div>
      )}

      {/* Pharmacy grid */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(p => (
            <div key={p.uid} className="bg-white rounded-2xl shadow-card hover:shadow-soft transition-all p-5">
              <div className="flex items-center gap-3 mb-4">
                {/* Avatar */}
                <div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-teal-900 truncate">{p.name}</p>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-lg mt-0.5">
                    <Store className="w-2.5 h-2.5" /> Pharmacy
                  </span>
                </div>
                {/* Delete */}
                <button
                  onClick={() => removePharmacy(p)}
                  disabled={deleting === p.uid}
                  className="p-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-all disabled:opacity-50"
                  title="Remove pharmacy"
                >
                  {deleting === p.uid
                    ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Details */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Mail className="w-3 h-3 text-teal-500" />
                  <span className="truncate">{p.email}</span>
                </div>
                {p.phone && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Phone className="w-3 h-3 text-teal-500" />
                    <span>{p.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span>UID: <span className="font-mono text-[10px] text-gray-400">{p.uid.slice(0, 16)}…</span></span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100">
                <p className="text-[10px] text-gray-400">
                  Created {new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && pharmacies.length > 0 && (
        <p className="text-center text-gray-400 text-sm py-8">No pharmacies match your search.</p>
      )}

      {/* Info banner */}
      <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 flex items-start gap-3">
        <Store className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-teal-700 leading-relaxed">
          <strong className="block mb-0.5">How pharmacy accounts work:</strong>
          After creating a pharmacy here, doctors can link it from their Dashboard → "Linked Pharmacy" panel.
          Prescriptions will then auto-forward to that pharmacy without any patient action needed.
        </div>
      </div>
    </div>
  );
}
