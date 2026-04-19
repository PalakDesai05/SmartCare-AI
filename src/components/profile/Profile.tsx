import { useState } from 'react';
import {
  User, Mail, Phone, Shield, Save, RefreshCw, CheckCircle,
  Edit3, Camera, UserCircle,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { saveUserProfile, type DbUser } from '../../firebase/firebaseDb';

const roleBadge: Record<string, { label: string; color: string }> = {
  patient:  { label: 'Patient',        color: 'bg-teal-100 text-teal-700'    },
  doctor:   { label: 'Doctor',         color: 'bg-blue-100 text-blue-700'    },
  admin:    { label: 'Administrator',  color: 'bg-purple-100 text-purple-700' },
  pharmacy: { label: 'Pharmacy Staff', color: 'bg-green-100 text-green-700'  },
};

export default function Profile() {
  const { user } = useAuth();

  const [name,    setName]    = useState(user?.name    || '');
  const [phone,   setPhone]   = useState('');
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [editing, setEditing] = useState(false);

  const initials = (user?.name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const badge    = roleBadge[user?.role || 'patient'];

  const handleSave = async () => {
    if (!user?.firebaseUid) return;
    setSaving(true);
    try {
      const payload: DbUser = {
        uid:       user.firebaseUid,
        name:      name.trim() || user.name,
        email:     user.email,
        role:      user.role as DbUser['role'],
        ...(phone ? { phone } : {}),
        createdAt: Date.now(),
      };
      await saveUserProfile(payload);
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error('profile save failed', e);
    }
    setSaving(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">

      {/* Hero card */}
      <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-3xl p-8 text-white shadow-soft">
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center text-3xl font-black text-white shadow-lg">
              {initials}
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-teal-400 rounded-lg flex items-center justify-center">
              <Camera className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold">{user?.name || 'User'}</h2>
            <p className="text-teal-200 text-sm mt-0.5">{user?.email}</p>
            <span className={`inline-block mt-2 text-xs font-bold px-3 py-1 rounded-lg bg-white/20 text-white`}>
              {badge.label}
            </span>
          </div>
        </div>
      </div>

      {/* Profile form */}
      <div className="bg-white rounded-3xl shadow-card p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-teal-900 text-lg flex items-center gap-2">
            <UserCircle className="w-5 h-5 text-teal-600" /> Profile Details
          </h3>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-teal-200 text-teal-700 text-sm font-semibold hover:bg-teal-50 transition-all"
            >
              <Edit3 className="w-3.5 h-3.5" /> Edit
            </button>
          )}
        </div>

        {/* Fields */}
        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                disabled={!editing}
                className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm transition-all ${
                  editing
                    ? 'border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white'
                    : 'border-gray-100 bg-gray-50 text-gray-700 cursor-default'
                }`}
              />
            </div>
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-100 bg-gray-50 text-gray-500 text-sm cursor-not-allowed"
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-1 pl-1">Email cannot be changed. Contact support if needed.</p>
          </div>

          {/* Phone */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                disabled={!editing}
                placeholder={editing ? 'Enter your phone number' : 'Not set'}
                className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm transition-all ${
                  editing
                    ? 'border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white'
                    : 'border-gray-100 bg-gray-50 text-gray-400 cursor-default'
                }`}
              />
            </div>
          </div>

          {/* Role (read-only) */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
              Role / Account Type
            </label>
            <div className="relative">
              <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={badge.label}
                disabled
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-100 bg-gray-50 text-gray-500 text-sm cursor-not-allowed capitalize"
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-1 pl-1">Role is assigned by the system administrator.</p>
          </div>
        </div>

        {/* Action buttons */}
        {editing && (
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => { setEditing(false); setName(user?.name || ''); setPhone(''); }}
              className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-70 shadow-sm"
            >
              {saving
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving…</>
                : <><Save className="w-4 h-4" /> Save Changes</>}
            </button>
          </div>
        )}

        {saved && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-semibold animate-fade-in">
            <CheckCircle className="w-4 h-4" /> Profile updated successfully!
          </div>
        )}
      </div>

      {/* Account info card */}
      <div className="bg-white rounded-3xl shadow-card p-6">
        <h3 className="font-bold text-teal-900 mb-4 text-sm uppercase tracking-wider">Account Info</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-gray-50">
            <span className="text-sm text-gray-500">Firebase UID</span>
            <span className="text-xs font-mono text-gray-400 bg-gray-50 px-2 py-1 rounded-lg max-w-[180px] truncate">
              {user?.firebaseUid || '—'}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-50">
            <span className="text-sm text-gray-500">Platform</span>
            <span className="text-sm font-semibold text-teal-700">SmartCare AI</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-500">Account Status</span>
            <span className="flex items-center gap-1.5 text-sm font-semibold text-green-600">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Active
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
