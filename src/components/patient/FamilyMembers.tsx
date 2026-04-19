import { useState, useEffect } from 'react';
import {
  Users, Plus, Trash2, User, Phone, Droplet,
  Heart, Baby, X, AlertCircle, CheckCircle,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  listenFamilyMembers,
  addFamilyMember as dbAddFamilyMember,
  removeFamilyMember as dbRemoveFamilyMember,
  type DbFamilyMember,
} from '../../firebase/firebaseDb';
import { api } from '../../services/api';

const RELATIONS   = ['Spouse', 'Child', 'Parent', 'Sibling', 'Grandparent', 'Other'];
const BLOOD_GROUPS = ['A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−'];

const relationIcons: Record<string, React.ElementType> = {
  Spouse: Heart, Child: Baby, Parent: User,
  Sibling: Users, Grandparent: User, Other: User,
};
const relationColors: Record<string, string> = {
  Spouse:      'bg-pink-50 text-pink-600 border-pink-200',
  Child:       'bg-blue-50 text-blue-600 border-blue-200',
  Parent:      'bg-purple-50 text-purple-600 border-purple-200',
  Sibling:     'bg-green-50 text-green-600 border-green-200',
  Grandparent: 'bg-orange-50 text-orange-600 border-orange-200',
  Other:       'bg-gray-50 text-gray-600 border-gray-200',
};

// ── Add member modal ──────────────────────────────────────
function AddMemberModal({
  patientUid,
  onClose,
}: { patientUid: string; onClose: () => void }) {
  const [form, setForm] = useState({
    name: '', relation: 'Spouse', age: '', phone: '', blood_group: '',
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState(false);

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.age) return setError('Name and age are required.');
    setLoading(true);
    setError('');
    try {
      await dbAddFamilyMember(patientUid, {
        name:        form.name,
        relation:    form.relation,
        age:         parseInt(form.age),
        phone:       form.phone || undefined,
        blood_group: form.blood_group || undefined,
        createdAt:   Date.now(),
      });
      setSuccess(true);
      setTimeout(onClose, 1000);
    } catch {
      // RTDB failed — try backend API
      try {
        await api.addFamilyMember({
          name: form.name, relation: form.relation,
          age: parseInt(form.age), phone: form.phone || undefined,
          blood_group: form.blood_group || undefined,
        });
        setSuccess(true);
        setTimeout(onClose, 1000);
      } catch {
        setError('Could not save member. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-10 text-center animate-slide-up">
        <div className="w-14 h-14 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <CheckCircle className="w-7 h-7 text-teal-600" />
        </div>
        <p className="font-bold text-teal-900">Member Added!</p>
        <p className="text-xs text-gray-500 mt-1">Saved to Firebase</p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-soft w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-teal-900">Add Family Member</h3>
            <p className="text-gray-500 text-xs mt-0.5">Stored securely in Firebase</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-teal-900 block mb-1.5">Full Name *</label>
            <input value={form.name} onChange={set('name')} placeholder="Member's full name"
              className="w-full px-3 py-2.5 rounded-xl border border-teal-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-teal-900 block mb-1.5">Relation *</label>
              <select value={form.relation} onChange={set('relation')}
                className="w-full px-3 py-2.5 rounded-xl border border-teal-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
                {RELATIONS.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-teal-900 block mb-1.5">Age *</label>
              <input type="number" value={form.age} onChange={set('age')} placeholder="Age"
                min="0" max="120"
                className="w-full px-3 py-2.5 rounded-xl border border-teal-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-teal-900 block mb-1.5">Phone</label>
              <input value={form.phone} onChange={set('phone')} placeholder="Mobile no."
                className="w-full px-3 py-2.5 rounded-xl border border-teal-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label className="text-xs font-semibold text-teal-900 block mb-1.5">Blood Group</label>
              <select value={form.blood_group} onChange={set('blood_group')}
                className="w-full px-3 py-2.5 rounded-xl border border-teal-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
                <option value="">Select</option>
                {BLOOD_GROUPS.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-70 flex items-center justify-center gap-2">
            {loading
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <><Plus className="w-4 h-4" /> Add Member</>}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────
export default function FamilyMembers() {
  const { user } = useAuth();
  const [members, setMembers] = useState<DbFamilyMember[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rtdbError, setRtdbError] = useState(false);

  useEffect(() => {
    if (!user?.firebaseUid) { setLoading(false); return; }
    // Real-time RTDB listener
    const unsub = listenFamilyMembers(
      user.firebaseUid,
      data => { setMembers(data); setLoading(false); setRtdbError(false); },
      _err => { setRtdbError(true); setLoading(false); }
    );
    return unsub;
  }, [user?.firebaseUid]);

  const handleRemove = async (id: string) => {
    if (!user?.firebaseUid) return;
    await dbRemoveFamilyMember(user.firebaseUid, id).catch(() => {});
    // onValue will fire automatically and update UI
  };

  if (loading) return (
    <div className="flex items-center justify-center h-32">
      <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (rtdbError) return (
    <div className="max-w-2xl animate-fade-in">
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-amber-900 text-sm">Firebase Rules Not Configured</p>
          <p className="text-xs text-amber-700 mt-1">Go to <strong>Firebase Console → Realtime Database → Rules</strong> and set:</p>
          <pre className="mt-2 text-[10px] bg-amber-100 rounded-lg p-2 text-amber-800">{`{ "rules": { ".read": "auth != null", ".write": "auth != null" } }`}</pre>
          <p className="text-xs text-amber-700 mt-1">Then click <strong>Publish</strong> and reload.</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-5 animate-fade-in">
      {showAdd && user?.firebaseUid && (
        <AddMemberModal patientUid={user.firebaseUid} onClose={() => setShowAdd(false)} />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-teal-900">Family Members</h3>
          <p className="text-gray-500 text-sm mt-0.5">Manage healthcare for your entire family • Synced to Firebase</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-all shadow-glow">
          <Plus className="w-4 h-4" /> Add Member
        </button>
      </div>

      {members.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-teal-200 rounded-3xl">
          <div className="w-14 h-14 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <Users className="w-7 h-7 text-teal-400" />
          </div>
          <p className="text-teal-900 font-semibold">No family members yet</p>
          <p className="text-gray-500 text-sm mt-1">Data syncs in real-time via Firebase</p>
          <button onClick={() => setShowAdd(true)}
            className="mt-4 px-5 py-2 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700 transition-all">
            Add First Member
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {members.map(member => {
            const RelIcon    = relationIcons[member.relation] || User;
            const colorClass = relationColors[member.relation] || 'bg-gray-50 text-gray-600 border-gray-200';
            return (
              <div key={member.id} className="bg-white rounded-2xl shadow-card hover:shadow-soft transition-all p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${colorClass} flex-shrink-0`}>
                    <RelIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-teal-900">{member.name}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${colorClass}`}>
                      {member.relation}
                    </span>
                  </div>
                  <button onClick={() => handleRemove(member.id)}
                    className="p-2 rounded-xl text-red-400 hover:bg-red-50 hover:text-red-600 transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <User className="w-3.5 h-3.5 text-teal-500" />
                    <span>Age: {member.age} years</span>
                  </div>
                  {member.phone && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Phone className="w-3.5 h-3.5 text-teal-500" />
                      <span>{member.phone}</span>
                    </div>
                  )}
                  {member.blood_group && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Droplet className="w-3.5 h-3.5 text-red-500" />
                      <span>Blood Group: <strong className="text-red-600">{member.blood_group}</strong></span>
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <button className="w-full py-2 text-xs font-semibold text-teal-700 border border-teal-200 rounded-xl hover:bg-teal-50 transition-all">
                    Book Appointment for {member.name.split(' ')[0]}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-gradient-to-r from-teal-50 to-green-50 border border-teal-200 rounded-2xl p-5">
        <p className="text-sm font-bold text-teal-900 mb-1 flex items-center gap-2">
          <Heart className="w-4 h-4 text-red-500 fill-red-500" />
          Family Health Tip
        </p>
        <p className="text-xs text-teal-700 leading-relaxed">
          Regular health check-ups for all family members help in early detection of conditions.
          Schedule annual health screenings for everyone above 40 years.
        </p>
      </div>
    </div>
  );
}
