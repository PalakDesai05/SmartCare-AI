import { useState, useEffect } from 'react';
import {
  Download, Pill, Calendar, User, AlertTriangle, Clock,
  CheckCircle, Receipt, RefreshCw, BadgeCheck,
  ShieldCheck, Store, Lock, Unlock, IndianRupee,
  ChevronDown, ChevronUp, Star, QrCode, Banknote, X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  listenPrescriptions,
  listenBills,
  grantPharmacyAccess,
  revokePharmacyAccess,
  markBillPaid,
  saveFeedback,
  type DbPrescription,
  type DbBill,
} from '../../firebase/firebaseDb';

// ── Billing status badge config ───────────────────────────
const billingConfig = {
  pending: { border: 'border-l-yellow-400', badge: 'bg-yellow-50 text-yellow-700 border-yellow-200', label: 'Awaiting Pharmacy', icon: Clock },
  billed:  { border: 'border-l-blue-500',   badge: 'bg-blue-50 text-blue-700 border-blue-200',       label: 'Bill Received',    icon: Receipt },
  ready:   { border: 'border-l-teal-500',   badge: 'bg-teal-50 text-teal-700 border-teal-200',       label: 'Ready for Pickup', icon: CheckCircle },
  paid:    { border: 'border-l-green-500',  badge: 'bg-green-50 text-green-700 border-green-200',    label: 'Paid',             icon: BadgeCheck },
};

// ── Feedback Modal ────────────────────────────────────────
function FeedbackModal({
  doctorUid, doctorName, patientUid, patientName, onClose,
}: {
  doctorUid: string; doctorName: string;
  patientUid: string; patientName: string;
  onClose: () => void;
}) {
  const [rating,   setRating]   = useState(0);
  const [hover,    setHover]    = useState(0);
  const [review,   setReview]   = useState('');
  const [saving,   setSaving]   = useState(false);
  const [done,     setDone]     = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSaving(true);
    try {
      await saveFeedback(doctorUid, {
        doctorUid,
        patientUid,
        patientName,
        rating,
        review: review.trim(),
        createdAt: Date.now(),
      });
      setDone(true);
    } catch (e) {
      console.error('saveFeedback failed', e);
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-soft w-full max-w-sm animate-slide-up">
        {done ? (
          <div className="p-10 text-center">
            <div className="w-14 h-14 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <Star className="w-7 h-7 text-yellow-400 fill-yellow-400" />
            </div>
            <h3 className="font-bold text-teal-900 text-lg mb-2">Thank you!</h3>
            <p className="text-gray-500 text-sm">Your feedback for <strong>Dr. {doctorName}</strong> has been saved. It helps others find the right doctor.</p>
            <button onClick={onClose} className="mt-5 bg-teal-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-teal-700 transition-all">
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-teal-900">Rate Your Experience</h3>
                <p className="text-gray-500 text-xs mt-0.5">Dr. {doctorName}</p>
              </div>
              <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Star selector */}
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map(s => (
                  <button
                    key={s}
                    onMouseEnter={() => setHover(s)}
                    onMouseLeave={() => setHover(0)}
                    onClick={() => setRating(s)}
                    className="transition-transform hover:scale-125 active:scale-95"
                  >
                    <Star
                      className={`w-9 h-9 transition-colors ${
                        s <= (hover || rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'
                      }`}
                    />
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <p className="text-center text-sm font-semibold text-teal-700">
                  {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
                </p>
              )}
              <textarea
                value={review}
                onChange={e => setReview(e.target.value)}
                placeholder="Write a review (optional)…"
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl border border-teal-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />
              <button
                onClick={handleSubmit}
                disabled={rating === 0 || saving}
                className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                  rating > 0 && !saving
                    ? 'bg-teal-600 hover:bg-teal-700 text-white'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {saving ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving…</> : <><Star className="w-4 h-4" /> Submit Feedback</>}
              </button>
              <button onClick={onClose} className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors">
                Skip for now
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── QR Payment Card ───────────────────────────────────────
function QrPaymentCard({
  bill, patientUid, onPaid,
}: {
  bill: DbBill; patientUid: string;
  onPaid: (billId: string) => void;
}) {
  const [mode,     setMode]     = useState<'qr' | 'cash' | null>(null);
  const [paying,   setPaying]   = useState(false);

  const qrData = `upi://pay?pa=healthai@upi&pn=HealthAI+Pharmacy&am=${bill.total}&cu=INR&tn=Bill+${bill.id.slice(-6)}`;
  const qrUrl  = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}&margin=10`;

  const handleConfirmOnline = async () => {
    setPaying(true);
    try {
      await markBillPaid(patientUid, bill.id);
      onPaid(bill.id);
    } catch {}
    setPaying(false);
  };

  return (
    <div className="mt-3 space-y-3">
      <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-center text-green-800 text-sm font-semibold flex items-center justify-center gap-2">
        <CheckCircle className="w-4 h-4" /> Medicines packed &amp; ready for pickup!
      </div>

      {/* Payment options */}
      {!mode && (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setMode('qr')}
            className="flex flex-col items-center gap-1.5 p-4 bg-teal-50 border-2 border-teal-200 hover:border-teal-500 rounded-2xl transition-all group"
          >
            <QrCode className="w-8 h-8 text-teal-600 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-teal-800">Pay via QR / UPI</span>
            <span className="text-[10px] text-teal-500">Scan & pay instantly</span>
          </button>
          <button
            onClick={() => setMode('cash')}
            className="flex flex-col items-center gap-1.5 p-4 bg-amber-50 border-2 border-amber-200 hover:border-amber-500 rounded-2xl transition-all group"
          >
            <Banknote className="w-8 h-8 text-amber-600 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-amber-800">Pay at Counter</span>
            <span className="text-[10px] text-amber-500">Cash / card in-person</span>
          </button>
        </div>
      )}

      {/* QR Code view */}
      {mode === 'qr' && (
        <div className="border border-teal-200 rounded-2xl p-4 bg-white space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-teal-900 flex items-center gap-1.5">
              <QrCode className="w-4 h-4" /> Scan to Pay ₹{bill.total.toFixed(2)}
            </p>
            <button onClick={() => setMode(null)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex justify-center">
            <img
              src={qrUrl}
              alt="UPI Payment QR"
              className="w-48 h-48 rounded-xl border border-gray-200 shadow-sm"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
          <p className="text-[10px] text-center text-gray-400">
            Open any UPI app • Scan QR • Amount ₹{bill.total.toFixed(2)} auto-filled
          </p>
          <button
            onClick={handleConfirmOnline}
            disabled={paying}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {paying
              ? <><RefreshCw className="w-4 h-4 animate-spin" /> Confirming…</>
              : <><CheckCircle className="w-4 h-4" /> I Have Paid Online</>}
          </button>
        </div>
      )}

      {/* Cash view */}
      {mode === 'cash' && (
        <div className="border border-amber-200 rounded-2xl p-4 bg-amber-50 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-amber-900 flex items-center gap-1.5">
              <Banknote className="w-4 h-4" /> Pay at Pharmacy Counter
            </p>
            <button onClick={() => setMode(null)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            Visit the pharmacy counter and pay <strong>₹{bill.total.toFixed(2)}</strong> in cash or by card. Show your prescription number <strong>#{bill.prescriptionId.slice(-6).toUpperCase()}</strong> to the pharmacist.
          </p>
          <div className="p-3 bg-white rounded-xl text-center border border-amber-200">
            <p className="text-lg font-black text-amber-700">₹{bill.total.toFixed(2)}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Tell pharmacist: Rx #{bill.prescriptionId.slice(-6).toUpperCase()}</p>
          </div>
          <p className="text-[10px] text-amber-700 text-center">The pharmacist will confirm your payment on their panel.</p>
        </div>
      )}
    </div>
  );
}

// ── Pharmacy Access Toggle ────────────────────────────────
function PharmacyToggle({
  rx, patientUid, onUpdate,
}: {
  rx: DbPrescription;
  patientUid: string;
  onUpdate: (rxId: string, granted: boolean) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const hasPharmacy  = !!rx.linkedPharmacyUid;
  const pharmacyName = rx.linkedPharmacyName || 'Linked Pharmacy';
  const granted      = rx.pharmacy_access;

  const handleToggle = async () => {
    if (!hasPharmacy) return;
    setLoading(true); setError('');
    try {
      if (granted) {
        await revokePharmacyAccess(patientUid, rx.id);
        onUpdate(rx.id, false);
      } else {
        await grantPharmacyAccess(patientUid, rx.id);
        onUpdate(rx.id, true);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update access.');
    }
    setLoading(false);
  };

  if (!hasPharmacy) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-500">
        <Store className="w-3.5 h-3.5 flex-shrink-0" />
        <span>Your doctor hasn't linked a pharmacy yet.</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
        granted ? 'bg-teal-50 border-teal-200' : 'bg-white border-gray-200 hover:border-teal-200'
      }`}>
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${granted ? 'bg-teal-600' : 'bg-gray-100'}`}>
            {granted ? <Unlock className="w-4 h-4 text-white" /> : <Lock className="w-4 h-4 text-gray-400" />}
          </div>
          <div>
            <p className="text-sm font-semibold text-teal-900">{pharmacyName}</p>
            <p className="text-xs text-gray-500">{granted ? 'Has access · processing your prescription' : 'No access yet'}</p>
          </div>
        </div>
        <button
          onClick={handleToggle} disabled={loading}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            granted
              ? 'bg-white border border-red-200 text-red-600 hover:bg-red-50'
              : 'bg-teal-600 hover:bg-teal-700 text-white shadow-sm'
          } disabled:opacity-60`}
        >
          {loading
            ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            : granted ? <><Lock className="w-3.5 h-3.5" /> Revoke</> : <><Unlock className="w-3.5 h-3.5" /> Grant Access</>}
        </button>
      </div>
      {error && (
        <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />{error}
        </p>
      )}
      {granted && (
        <p className="text-xs text-teal-600 flex items-center gap-1.5 px-1">
          <CheckCircle className="w-3 h-3" />
          Pharmacy is processing your prescription. Bill will appear once ready.
        </p>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────
export default function Prescriptions() {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState<DbPrescription[]>([]);
  const [bills,         setBills]         = useState<DbBill[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [expanded,      setExpanded]      = useState<string | null>(null);
  // Feedback modal state
  const [feedbackRx,    setFeedbackRx]    = useState<DbPrescription | null>(null);

  useEffect(() => {
    if (!user?.firebaseUid) { setLoading(false); return; }
    const unsub = listenPrescriptions(user.firebaseUid, rxs => {
      setPrescriptions(rxs);
      setLoading(false);
    });
    return unsub;
  }, [user?.firebaseUid]);

  useEffect(() => {
    if (!user?.firebaseUid) return;
    const unsub = listenBills(user.firebaseUid, setBills);
    return unsub;
  }, [user?.firebaseUid]);

  const handleUpdate = (rxId: string, granted: boolean) => {
    setPrescriptions(prev =>
      prev.map(rx => rx.id === rxId ? { ...rx, pharmacy_access: granted } : rx)
    );
  };

  // Called after online QR payment confirmed
  const handlePaid = (billId: string, rx: DbPrescription) => {
    setBills(prev => prev.map(b => b.id === billId ? { ...b, status: 'paid' as const } : b));
    setPrescriptions(prev => prev.map(p => p.id === rx.id ? { ...p, billingStatus: 'paid' } : p));
    // Trigger feedback
    if (rx.doctorUid) setFeedbackRx(rx);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-32">
      <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Feedback modal */}
      {feedbackRx && feedbackRx.doctorUid && (
        <FeedbackModal
          doctorUid={feedbackRx.doctorUid}
          doctorName={feedbackRx.doctorName}
          patientUid={user?.firebaseUid || ''}
          patientName={user?.name || 'Patient'}
          onClose={() => setFeedbackRx(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-teal-900 text-lg">Prescriptions &amp; Bills</h3>
          <p className="text-gray-500 text-sm mt-0.5">Grant pharmacy access to receive your medicines &amp; bill</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs bg-green-50 text-green-700 px-2.5 py-1.5 rounded-lg border border-green-200 font-medium">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> Live
        </div>
      </div>

      {/* How-it-works strip */}
      <div className="grid grid-cols-4 gap-2 bg-teal-50 border border-teal-200 rounded-2xl p-4">
        {[
          { step: '1', label: 'Doctor uploads Rx',   sub: 'Sent instantly' },
          { step: '2', label: 'Grant pharmacy access', sub: 'Tap below' },
          { step: '3', label: 'Pharmacy bills you',  sub: 'QR or cash' },
          { step: '4', label: 'Rate your doctor',    sub: 'After payment' },
        ].map(s => (
          <div key={s.step} className="text-center">
            <div className="w-7 h-7 bg-teal-600 rounded-full flex items-center justify-center text-white text-xs font-bold mx-auto mb-1">{s.step}</div>
            <p className="text-xs font-semibold text-teal-900">{s.label}</p>
            <p className="text-[10px] text-teal-600 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Prescription cards */}
      {prescriptions.length === 0 ? (
        <div className="p-10 text-center border-2 border-dashed border-gray-200 rounded-3xl text-gray-400">
          <Pill className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="font-semibold">No prescriptions yet</p>
          <p className="text-xs mt-1">Prescriptions uploaded by your doctor will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {prescriptions.map(rx => {
            const cfg       = billingConfig[rx.billingStatus] ?? billingConfig.pending;
            const Icon      = cfg.icon;
            const bill      = bills.find(b => b.prescriptionId === rx.id);
            const isExpanded = expanded === rx.id;
            const isPaid    = bill?.status === 'paid' || rx.billingStatus === 'paid';

            return (
              <div key={rx.id}
                className={`bg-white rounded-3xl shadow-card border-l-4 ${cfg.border} overflow-hidden transition-all hover:shadow-soft`}>

                {/* Rx Header */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-11 h-11 bg-teal-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Pill className="w-5 h-5 text-teal-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center flex-wrap gap-2">
                          <h4 className="font-bold text-teal-900">{rx.diagnosis}</h4>
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg border ${cfg.badge}`}>
                            <Icon className="w-3 h-3" />{cfg.label}
                          </span>
                          {isPaid && (
                            <span className="text-[10px] text-yellow-600 font-semibold flex items-center gap-0.5">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> Rate doctor
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-1">
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <User className="w-3 h-3" />{rx.doctorName}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Calendar className="w-3 h-3" />
                            {new Date(rx.createdAt).toLocaleDateString('en-IN')}
                          </span>
                          {bill && (
                            <span className="flex items-center gap-1 text-xs font-bold text-teal-700">
                              <IndianRupee className="w-3 h-3" />₹{Number(bill.total).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setExpanded(isExpanded ? null : rx.id)}
                      className="p-2 rounded-xl border border-gray-200 text-gray-400 hover:bg-teal-50 hover:border-teal-200 hover:text-teal-600 transition-all flex-shrink-0"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Medicine tags */}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {rx.medicines.map((med, i) => (
                      <span key={i} className="text-xs bg-teal-50 text-teal-700 px-2.5 py-1 rounded-xl border border-teal-200 font-medium">
                        {med}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/50">
                    <div className="p-5 space-y-4">

                      {/* Notes */}
                      {rx.notes && (
                        <div className="p-3 bg-white rounded-xl border border-gray-100">
                          <p className="text-xs font-semibold text-gray-500 mb-0.5">Special Instructions</p>
                          <p className="text-sm text-gray-700">{rx.notes}</p>
                        </div>
                      )}

                      {/* Pharmacy Access Toggle */}
                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Pharmacy Access</p>
                        <PharmacyToggle rx={rx} patientUid={user!.firebaseUid} onUpdate={handleUpdate} />
                      </div>

                      {/* Bill section */}
                      {bill && rx.billingStatus !== 'pending' && (
                        <div>
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Your Bill</p>
                          <div className="bg-white rounded-2xl border border-teal-100 overflow-hidden shadow-sm">
                            <table className="w-full text-left">
                              <thead className="bg-teal-50 text-xs text-teal-800 uppercase tracking-wider">
                                <tr>
                                  <th className="px-4 py-2.5 font-semibold">Medicine</th>
                                  <th className="px-4 py-2.5 font-semibold text-center">Qty</th>
                                  <th className="px-4 py-2.5 font-semibold text-right">Rate</th>
                                  <th className="px-4 py-2.5 font-semibold text-right">Total</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50">
                                {bill.items.map((item, i) => (
                                  <tr key={i} className="text-sm text-gray-600">
                                    <td className="px-4 py-2.5 font-medium text-gray-800">{item.name}</td>
                                    <td className="px-4 py-2.5 text-center">{item.quantity}</td>
                                    <td className="px-4 py-2.5 text-right">₹{Number(item.price).toFixed(2)}</td>
                                    <td className="px-4 py-2.5 text-right font-semibold text-teal-700">₹{Number(item.total).toFixed(2)}</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot className="bg-teal-50">
                                <tr>
                                  <td colSpan={3} className="px-4 py-3 text-right font-bold text-teal-900 text-xs uppercase">Grand Total</td>
                                  <td className="px-4 py-3 font-bold text-teal-800 text-right text-base">₹{Number(bill.total).toFixed(2)}</td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>

                          {/* QR + Cash payment — shown when ready & not yet paid */}
                          {rx.billingStatus === 'ready' && !isPaid && (
                            <QrPaymentCard
                              bill={bill}
                              patientUid={user!.firebaseUid}
                              onPaid={billId => handlePaid(billId, rx)}
                            />
                          )}

                          {/* Awaiting payment */}
                          {rx.billingStatus === 'billed' && (
                            <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-800 flex items-center gap-2">
                              <Clock className="w-4 h-4 flex-shrink-0" />
                              Bill received. Pharmacy is packing your medicines — status will update to "Ready" soon.
                            </div>
                          )}

                          {/* Paid status */}
                          {isPaid && (
                            <div className="mt-3 space-y-2">
                              <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-center text-green-800 text-sm font-bold flex items-center justify-center gap-2">
                                <BadgeCheck className="w-4 h-4" /> Payment Confirmed — Collect your medicines!
                              </div>
                              {rx.doctorUid && (
                                <button
                                  onClick={() => setFeedbackRx(rx)}
                                  className="w-full py-2.5 border border-yellow-300 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                                >
                                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" /> Rate Dr. {rx.doctorName}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Info footer */}
      <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-teal-700 leading-relaxed">
          <strong>Your data is private.</strong> The pharmacy can only see your prescription after you explicitly grant access. You can revoke at any time.
        </p>
      </div>
    </div>
  );
}
