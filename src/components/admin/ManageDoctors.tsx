import { useState, useEffect } from 'react';
import {
  Search, Plus, Star, ToggleLeft, ToggleRight, Trash2, MapPin,
  CheckCircle, X, RefreshCw, AlertCircle, Mail, Pencil,
} from 'lucide-react';
import {
  listenDoctors, saveDoctor, saveUserProfile, deleteDoctor, updateDoctorAvailability,
  type DbDoctor,
} from '../../firebase/firebaseDb';

// Firebase Auth REST API — creates account WITHOUT disturbing the current admin session
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
    // Map Firebase REST error codes to human-readable messages
    const code: string = data?.error?.message || '';
    if (code.includes('EMAIL_EXISTS'))          throw new Error('An account with this email already exists.');
    if (code.includes('WEAK_PASSWORD'))          throw new Error('Password must be at least 6 characters.');
    if (code.includes('INVALID_EMAIL'))          throw new Error('Invalid email address.');
    if (code.includes('TOO_MANY_ATTEMPTS'))      throw new Error('Too many attempts. Try again later.');
    throw new Error(code || 'Failed to create account.');
  }
  return data.localId as string; // This is the Firebase UID
}

// ── Add Doctor Modal ─────────────────────────────────────
function AddDoctorModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    name:           '',
    email:          '',
    password:       '',
    specialization: '',
    experience:     '',
    location:       '',
    fee:            '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState(false);

  const update = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async () => {
    const { name, email, password, specialization, experience, location, fee } = form;
    if (!name || !email || !password || !specialization || !fee) {
      setError('Please fill in all required fields.'); return;
    }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }

    setSubmitting(true);
    setError('');
    try {
      // 1. Create Firebase Auth account via REST API (does NOT log out the admin)
      const uid = await createAuthAccount(email, password);

      // 2. Save user profile in /users/{uid}
      await saveUserProfile({
        uid, name, email, role: 'doctor', createdAt: Date.now(),
      });

      // 3. Save doctor profile in /doctors/{uid}
      await saveDoctor({
        uid,
        name,
        email,
        specialization,
        experience:        experience || 'N/A',
        location:          location || 'Hospital Main Building',
        fee:               parseFloat(fee) || 0,
        rating:            4.5,
        reviews:           0,
        available:         true,
        linkedPharmacyUid: '',
        createdAt:         Date.now(),
      });

      setSuccess(true);
    } catch (e: any) {
      setError(e.message || 'Failed to create doctor account.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-soft w-full max-w-md p-10 text-center animate-slide-up">
        <div className="w-14 h-14 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-7 h-7 text-teal-600" />
        </div>
        <h3 className="font-bold text-teal-900 text-lg mb-2">Doctor Added!</h3>
        <p className="text-gray-500 text-sm">
          <strong>{form.name}</strong> can now login with their email and will appear in Find Doctors.
        </p>
        <button onClick={onClose} className="mt-5 bg-teal-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-teal-700 transition-all">
          Done
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-soft w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-bold text-teal-900 text-lg">Add New Doctor</h3>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition-all"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {[
            { key: 'name',           label: 'Full Name *',        placeholder: 'Dr. John Smith',          type: 'text'     },
            { key: 'email',          label: 'Login Email *',      placeholder: 'doctor@hospital.com',     type: 'email'    },
            { key: 'password',       label: 'Password *',         placeholder: 'Min. 6 characters',       type: 'password' },
            { key: 'specialization', label: 'Specialization *',   placeholder: 'e.g. Cardiologist',       type: 'text'     },
            { key: 'experience',     label: 'Experience',         placeholder: 'e.g. 10 years',           type: 'text'     },
            { key: 'location',       label: 'Room / Location',    placeholder: 'e.g. Block A, Room 204',  type: 'text'     },
            { key: 'fee',            label: 'Consultation Fee *', placeholder: 'e.g. 800',                type: 'number'   },
          ].map(({ key, label, placeholder, type }) => (
            <div key={key}>
              <label className="text-xs font-semibold text-teal-900 capitalize block mb-1.5">{label}</label>
              <input
                type={type}
                value={(form as any)[key]}
                onChange={e => update(key, e.target.value)}
                placeholder={placeholder}
                className="w-full px-3 py-2.5 rounded-xl border border-teal-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          ))}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
            </div>
          )}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {submitting ? <><RefreshCw className="w-4 h-4 animate-spin" /> Creating…</> : 'Create Doctor Account'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Edit Doctor Modal ─────────────────────────────────────
function EditDoctorModal({ doctor, onClose }: { doctor: DbDoctor; onClose: () => void }) {
  const [form, setForm] = useState({
    specialization: doctor.specialization,
    experience:     doctor.experience,
    location:       doctor.location,
    fee:            String(doctor.fee),
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveDoctor({ ...doctor, ...form, fee: parseFloat(form.fee) || doctor.fee });
      onClose();
    } catch { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-soft w-full max-w-md p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-teal-900 text-lg">Edit Doctor</h3>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition-all"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-4">
          {(['specialization', 'experience', 'location', 'fee'] as const).map(field => (
            <div key={field}>
              <label className="text-xs font-semibold text-teal-900 capitalize block mb-1.5">{field}</label>
              <input
                value={form[field]}
                onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-teal-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          ))}
          <button onClick={handleSave} disabled={saving}
            className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────
export default function ManageDoctors() {
  const [doctors,    setDoctors]    = useState<DbDoctor[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [showAdd,    setShowAdd]    = useState(false);
  const [editDoctor, setEditDoctor] = useState<DbDoctor | null>(null);
  const [deleting,   setDeleting]   = useState<string | null>(null);
  const [toggling,   setToggling]   = useState<string | null>(null);

  useEffect(() => {
    const unsub = listenDoctors(docs => { setDoctors(docs); setLoading(false); }, () => setLoading(false));
    return unsub;
  }, []);

  const toggleAvailability = async (d: DbDoctor) => {
    setToggling(d.uid);
    try {
      await updateDoctorAvailability(d.uid, !d.available);
    } catch {}
    setToggling(null);
  };

  const removeDoctor = async (d: DbDoctor) => {
    if (!confirm(`Remove ${d.name}? This will delete their profile.`)) return;
    setDeleting(d.uid);
    try {
      await deleteDoctor(d.uid);
    } catch {}
    setDeleting(null);
  };

  const filtered = doctors.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.specialization.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5 animate-fade-in">
      {showAdd    && <AddDoctorModal    onClose={() => setShowAdd(false)} />}
      {editDoctor && <EditDoctorModal   doctor={editDoctor} onClose={() => setEditDoctor(null)} />}

      {/* Toolbar */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-500" />
          <input
            type="text"
            placeholder="Search doctors..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-teal-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
          />
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-all shadow-glow"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Doctor</span>
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => (
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
      {!loading && doctors.length === 0 && (
        <div className="bg-white rounded-2xl shadow-card p-10 text-center border-2 border-dashed border-teal-200">
          <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8 text-teal-400" />
          </div>
          <h3 className="font-bold text-teal-900 mb-2">No Doctors Yet</h3>
          <p className="text-gray-500 text-sm mb-4">Add your first doctor to get started.</p>
          <button onClick={() => setShowAdd(true)}
            className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold text-sm transition-all">
            Add First Doctor
          </button>
        </div>
      )}

      {/* Doctor grid */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(doctor => (
            <div key={doctor.uid} className="bg-white rounded-2xl shadow-card hover:shadow-soft transition-all p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {doctor.name.replace('Dr. ', '').charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-teal-900 truncate">{doctor.name}</p>
                  <p className="text-teal-600 text-xs">{doctor.specialization}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`w-2.5 h-2.5 ${s <= Math.floor(Number(doctor.rating)) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />
                    ))}
                    <span className="text-[10px] text-gray-500 ml-1">{Number(doctor.rating).toFixed(1)} ({doctor.reviews})</span>
                  </div>
                </div>
                <button
                  onClick={() => toggleAvailability(doctor)}
                  disabled={toggling === doctor.uid}
                  className="flex-shrink-0"
                  title="Toggle availability"
                >
                  {toggling === doctor.uid
                    ? <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />
                    : doctor.available
                    ? <ToggleRight className="w-6 h-6 text-teal-600" />
                    : <ToggleLeft className="w-6 h-6 text-gray-400" />}
                </button>
              </div>

              <div className="space-y-1.5 mb-3">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <MapPin className="w-3 h-3 text-teal-500" /><span className="truncate">{doctor.location}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <CheckCircle className="w-3 h-3 text-teal-500" />
                  <span>{doctor.experience} · ₹{Number(doctor.fee)} per visit</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Mail className="w-3 h-3 text-teal-500" /><span className="truncate">{doctor.email}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                <span className={`flex-1 text-center text-[10px] font-bold py-1 rounded-lg ${doctor.available ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                  {doctor.available ? 'Available' : 'Unavailable'}
                </span>
                <button
                  onClick={() => setEditDoctor(doctor)}
                  className="p-2 rounded-lg border border-teal-200 text-teal-600 hover:bg-teal-50 transition-all"
                  title="Edit doctor"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => removeDoctor(doctor)}
                  disabled={deleting === doctor.uid}
                  className="p-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-all disabled:opacity-50"
                  title="Remove doctor"
                >
                  {deleting === doctor.uid
                    ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && doctors.length > 0 && (
        <p className="text-center text-gray-400 text-sm py-8">No doctors match your search.</p>
      )}
    </div>
  );
}
