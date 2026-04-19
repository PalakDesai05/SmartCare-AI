import { useState, useEffect } from 'react';
import {
  CheckCircle, Upload, Clock, User, AlertCircle, ChevronRight, X,
  RefreshCw, FileText, Link2, Link2Off, Activity, Stethoscope,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  listenDoctorQueue, updateAppointmentStatus, savePrescription,
  getDoctorByUid, getPatientReports, getUserProfile, saveHealthMetrics,
  type DbAppointment, type DbReport,
} from '../../firebase/firebaseDb';

const statusConfig: Record<string, { color: string; bg: string; border: string; label: string }> = {
  scheduled:    { color: 'text-teal-700',   bg: 'bg-teal-50',   border: 'border-teal-200',   label: 'Scheduled'   },
  completed:    { color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200',  label: 'Completed'   },
  cancelled:    { color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200',    label: 'Cancelled'   },
  'in-progress':{ color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', label: 'In Progress' },
};

// ── Patient Reports Viewer ────────────────────────────────
function PatientReportsPanel({ patientUid, patientName, onClose }: {
  patientUid: string; patientName: string; onClose: () => void;
}) {
  const [reports, setReports] = useState<DbReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPatientReports(patientUid)
      .then(r => { setReports(r); setLoading(false); })
      .catch(() => setLoading(false));
  }, [patientUid]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-soft w-full max-w-md max-h-[80vh] flex flex-col animate-slide-up">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-teal-900">Patient Reports</h3>
            <p className="text-gray-500 text-xs mt-0.5">{patientName}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <FileText className="w-10 h-10 mx-auto mb-2 text-gray-200" />
              <p className="text-sm font-medium">No reports uploaded yet</p>
              <p className="text-xs mt-1">Patient can upload reports from their Health Metrics page.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map(r => (
                <div key={r.id} className="flex items-start gap-3 bg-teal-50 rounded-xl p-3.5 border border-teal-100">
                  <FileText className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-teal-900 truncate">{r.fileName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{r.fileType.toUpperCase()} · {new Date(r.uploadedAt).toLocaleDateString('en-IN')}</p>
                    {r.notes && <p className="text-xs text-teal-700 mt-1 italic">{r.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Health Metrics Modal ─────────────────────────────────
function HealthMetricsModal({
  patient, doctorName, onClose, onSaved,
}: {
  patient: DbAppointment;
  doctorName: string;
  onClose: () => void;
  onSaved?: () => void;   // called after successful save (used by guided flow)
}) {
  const [bp,          setBp]          = useState('');
  const [hr,          setHr]          = useState('');
  const [sugar,       setSugar]       = useState('');
  const [spo2,        setSpo2]        = useState('');
  const [temp,        setTemp]        = useState('');
  const [cholesterol, setCholesterol] = useState('');
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [error,       setError]       = useState('');

  const isValid = bp.trim() && hr.trim() && sugar.trim() &&
                  spo2.trim() && temp.trim() && cholesterol.trim();

  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true); setError('');
    try {
      await saveHealthMetrics(patient.patientUid, {
        bloodPressure:  bp.trim(),
        heartRate:      parseFloat(hr),
        bloodSugar:     parseFloat(sugar),
        spo2:           parseFloat(spo2),
        temperature:    parseFloat(temp),
        cholesterol:    parseFloat(cholesterol),
        updatedByName:  doctorName,
        updatedAt:      Date.now(),
      });
      setSaved(true);
      onSaved?.();   // notify guided flow
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed');
    }
    setSaving(false);
  };

  const fields: { label: string; unit: string; value: string; set: (v: string) => void; placeholder: string }[] = [
    { label: 'Blood Pressure', unit: 'mmHg', value: bp,          set: setBp,          placeholder: 'e.g. 120/80' },
    { label: 'Heart Rate',     unit: 'bpm',  value: hr,          set: setHr,          placeholder: 'e.g. 78' },
    { label: 'Blood Sugar',    unit: 'mg/dL',value: sugar,       set: setSugar,       placeholder: 'e.g. 95' },
    { label: 'SpO\u2082',      unit: '%',    value: spo2,        set: setSpo2,        placeholder: 'e.g. 97' },
    { label: 'Temperature',    unit: '\u00b0F', value: temp,     set: setTemp,        placeholder: 'e.g. 98.6' },
    { label: 'Cholesterol',    unit: 'mg/dL',value: cholesterol, set: setCholesterol, placeholder: 'e.g. 180' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-soft w-full max-w-md animate-slide-up">
        {saved ? (
          <div className="p-10 text-center">
            <div className="w-14 h-14 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-7 h-7 text-teal-600" />
            </div>
            <h3 className="font-bold text-teal-900 text-lg mb-2">Metrics Updated!</h3>
            <p className="text-gray-500 text-sm">
              Health metrics for <strong>{patient.patientName}</strong> saved.
              {onSaved ? ' Opening prescription form...' : ' The patient\'s Health Dashboard will update in real time.'}
            </p>
            {!onSaved && (
              <button onClick={onClose} className="mt-5 bg-teal-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-teal-700 transition-all">
                Done
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-teal-900">Update Health Metrics</h3>
                <p className="text-gray-500 text-xs mt-0.5">For {patient.patientName} · Token #{patient.tokenNumber}</p>
              </div>
              <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-3">
              {fields.map(f => (
                <div key={f.label}>
                  <label className="text-xs font-semibold text-teal-900 block mb-1">
                    {f.label} <span className="text-gray-400 font-normal">({f.unit})</span>
                  </label>
                  <input
                    type="text"
                    value={f.value}
                    onChange={e => f.set(e.target.value)}
                    placeholder={f.placeholder}
                    className="w-full px-3 py-2 rounded-xl border border-teal-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              ))}
            </div>
            {error && <p className="mx-5 text-red-500 text-xs bg-red-50 border border-red-200 rounded-lg p-2">{error}</p>}
            <div className="p-5 pt-0">
              <button
                onClick={handleSave}
                disabled={!isValid || saving}
                className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                  isValid && !saving
                    ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-glow'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {saving
                  ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving…</>
                  : <><Activity className="w-4 h-4" /> Save Metrics</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Prescription Upload Modal ─────────────────────────────
function PrescriptionModal({
  patient, doctorName, doctorUid, onClose,
}: {
  patient: DbAppointment;
  doctorName: string;
  doctorUid: string;
  onClose: () => void;
}) {
  const [medicines,      setMedicines]    = useState('');
  const [diagnosis,      setDiagnosis]    = useState('');
  const [instructions,   setInstructions] = useState('');
  const [submitting,     setSubmitting]   = useState(false);
  const [submitted,      setSubmitted]    = useState(false);
  const [error,          setError]        = useState('');
  const [linkedPharmacy, setLinkedPharmacy] = useState<{uid: string; name: string} | null>(null);
  const [loadingLink,    setLoadingLink]  = useState(true);

  // Fetch doctor's linked pharmacy uid AND name
  useEffect(() => {
    getDoctorByUid(doctorUid).then(async doc => {
      if (doc?.linkedPharmacyUid) {
        const pharmacyUid = doc.linkedPharmacyUid;
        // Fetch the actual pharmacy name from /users/{uid}
        try {
          const pharmacyUser = await getUserProfile(pharmacyUid);
          setLinkedPharmacy({
            uid:  pharmacyUid,
            name: pharmacyUser?.name || 'Linked Pharmacy',
          });
        } catch {
          setLinkedPharmacy({ uid: pharmacyUid, name: 'Linked Pharmacy' });
        }
      }
      setLoadingLink(false);
    }).catch(() => setLoadingLink(false));
  }, [doctorUid]);

  const handleSubmit = async () => {
    if (!medicines.trim() || !diagnosis.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await savePrescription(
        patient.patientUid,
        {
          patientUid:          patient.patientUid,
          patientName:         patient.patientName,
          doctorUid,
          doctorName,
          diagnosis:           diagnosis.trim(),
          medicines:           medicines.split('\n').map(m => m.trim()).filter(Boolean),
          notes:               instructions.trim() || undefined,
          billingStatus:       'pending',
          pharmacy_access:     false,
          linkedPharmacyUid:   linkedPharmacy?.uid,
          linkedPharmacyName:  linkedPharmacy?.name,
          createdAt:           Date.now(),
        }
      );
      setSubmitted(true);
    } catch (err: unknown) {
      console.error('Prescription upload error:', err);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(`Upload failed: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-soft w-full max-w-md animate-slide-up">
        {submitted ? (
          <div className="p-10 text-center">
            <div className="w-14 h-14 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-7 h-7 text-teal-600" />
            </div>
            <h3 className="font-bold text-teal-900 text-lg mb-2">Prescription Uploaded!</h3>
            <p className="text-gray-500 text-sm">
              Prescription for <strong>{patient.patientName}</strong> saved to Firebase.
            </p>
            {linkedPharmacy ? (
              <div className="mt-3 flex items-center justify-center gap-2 text-amber-700 text-xs font-semibold bg-amber-50 border border-amber-200 rounded-xl py-2 px-4">
                <Link2 className="w-3.5 h-3.5" />
                Patient must grant access to {linkedPharmacy.name} from their Prescriptions tab
              </div>
            ) : (
              <div className="mt-3 flex items-center justify-center gap-2 text-gray-500 text-xs bg-gray-50 border border-gray-200 rounded-xl py-2 px-4">
                <Link2Off className="w-3.5 h-3.5" />
                No pharmacy linked to your clinic
              </div>
            )}
            <button onClick={onClose} className="mt-5 bg-teal-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-teal-700 transition-all">
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-teal-900">Upload Prescription</h3>
                <p className="text-gray-500 text-xs mt-0.5">For {patient.patientName} · Token #{patient.tokenNumber}</p>
              </div>
              <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Pharmacy link status */}
            {!loadingLink && (
              <div className={`mx-5 mt-4 flex items-center gap-2.5 p-3 rounded-xl border text-xs font-medium ${
                linkedPharmacy
                  ? 'bg-amber-50 border-amber-200 text-amber-700'
                  : 'bg-gray-50 border-gray-200 text-gray-500'
              }`}>
                {linkedPharmacy
                  ? <><Link2 className="w-3.5 h-3.5 flex-shrink-0" /> Rx linked to <strong className="ml-1">{linkedPharmacy.name}</strong> — patient grants access
                  </>
                  : <><Link2Off className="w-3.5 h-3.5 flex-shrink-0" /> No pharmacy linked — link one from your Overview
                  </>
                }
              </div>
            )}

            <div className="p-5 space-y-4">
              <div>
                <label className="text-sm font-semibold text-teal-900 block mb-1.5">Diagnosis *</label>
                <input
                  value={diagnosis}
                  onChange={e => setDiagnosis(e.target.value)}
                  placeholder="Primary diagnosis..."
                  className="w-full px-3 py-2.5 rounded-xl border border-teal-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-teal-900 block mb-1.5">
                  Medications * <span className="text-gray-400 font-normal">(one per line)</span>
                </label>
                <textarea
                  value={medicines}
                  onChange={e => setMedicines(e.target.value)}
                  placeholder={"Amoxicillin 500mg twice daily\nParacetamol 500mg as needed\nVitamin C 1000mg once daily"}
                  className="w-full px-3 py-2.5 rounded-xl border border-teal-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none h-28"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-teal-900 block mb-1.5">Special Instructions</label>
                <textarea
                  value={instructions}
                  onChange={e => setInstructions(e.target.value)}
                  placeholder="Diet, rest, follow-up instructions..."
                  className="w-full px-3 py-2.5 rounded-xl border border-teal-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none h-16"
                />
              </div>
              {error && <p className="text-red-500 text-xs bg-red-50 border border-red-200 rounded-lg p-2">{error}</p>}
              <button
                onClick={handleSubmit}
                disabled={!medicines.trim() || !diagnosis.trim() || submitting}
                className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                  medicines.trim() && diagnosis.trim() && !submitting
                    ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-glow'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {submitting
                  ? <><RefreshCw className="w-4 h-4 animate-spin" /> Uploading…</>
                  : linkedPharmacy
                  ? <><Upload className="w-4 h-4" /> Upload Prescription</>
                  : <><Upload className="w-4 h-4" /> Upload Prescription</>
                }
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────
export default function PatientQueue() {
  const { user } = useAuth();
  const [appointments,        setAppointments]        = useState<DbAppointment[]>([]);
  const [loading,             setLoading]             = useState(true);
  const [activeFilter,        setActiveFilter]        = useState('all');
  const [metricsPatient,      setMetricsPatient]      = useState<DbAppointment | null>(null);
  const [prescriptionPatient, setPrescriptionPatient] = useState<DbAppointment | null>(null);
  const [reportsPatient,      setReportsPatient]      = useState<DbAppointment | null>(null);
  const [completing,          setCompleting]          = useState<string | null>(null);
  // guided flow: metrics → rx → mark complete
  const [guidedApt,           setGuidedApt]           = useState<DbAppointment | null>(null);

  useEffect(() => {
    if (!user?.firebaseUid) { setLoading(false); return; }
    const unsub = listenDoctorQueue(user.firebaseUid, appts => {
      setAppointments(appts);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [user?.firebaseUid]);

  const markCompleted = async (apt: DbAppointment) => {
    if (!user?.firebaseUid) return;
    setCompleting(apt.id);
    try {
      await updateAppointmentStatus(apt.patientUid, apt.id, 'completed', user.firebaseUid);
      setAppointments(prev => prev.map(a => a.id === apt.id ? { ...a, status: 'completed' as const } : a));
    } catch {}
    setCompleting(null);
    setGuidedApt(null);
  };

  /** Step 1 of guided complete: open metrics modal */
  const startGuidedComplete = (apt: DbAppointment) => {
    setGuidedApt(apt);
    setMetricsPatient(apt);
  };

  const markInProgress = async (apt: DbAppointment) => {
    if (!user?.firebaseUid) return;
    try {
      await updateAppointmentStatus(apt.patientUid, apt.id, 'in-progress', user.firebaseUid);
      setAppointments(prev => prev.map(a => a.id === apt.id ? { ...a, status: 'in-progress' as const } : a));
    } catch {}
  };

  const filtered = activeFilter === 'all' ? appointments : appointments.filter(a => a.status === activeFilter);

  return (
    <div className="space-y-5 animate-fade-in">
      {metricsPatient && (
        <HealthMetricsModal
          patient={metricsPatient}
          doctorName={user?.name || 'Doctor'}
          onClose={() => { setMetricsPatient(null); setGuidedApt(null); }}
          onSaved={guidedApt ? () => {
            // Step 2: auto-open prescription modal after slight delay
            setTimeout(() => {
              setMetricsPatient(null);
              setPrescriptionPatient(guidedApt);
            }, 1200);
          } : undefined}
        />
      )}
      {prescriptionPatient && (
        <PrescriptionModal
          patient={prescriptionPatient}
          doctorName={user?.name || 'Doctor'}
          doctorUid={user?.firebaseUid || ''}
          onClose={async () => {
            // Step 3: if this came from guided flow, mark appointment complete
            if (guidedApt && guidedApt.id === prescriptionPatient.id) {
              await markCompleted(guidedApt);
            }
            setPrescriptionPatient(null);
          }}
        />
      )}
      {reportsPatient && (
        <PatientReportsPanel
          patientUid={reportsPatient.patientUid}
          patientName={reportsPatient.patientName}
          onClose={() => setReportsPatient(null)}
        />
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {['all', 'scheduled', 'in-progress', 'completed', 'cancelled'].map(f => (
          <button key={f} onClick={() => setActiveFilter(f)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${
              activeFilter === f ? 'bg-teal-600 text-white' : 'bg-white border border-teal-200 text-teal-700 hover:bg-teal-50'
            }`}>
            {f === 'all' ? `All Patients (${appointments.length})` : f.replace('-', ' ')}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center h-32">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && appointments.length === 0 && (
        <div className="bg-white rounded-2xl shadow-card p-10 text-center border-2 border-dashed border-teal-200">
          <User className="w-10 h-10 text-teal-200 mx-auto mb-3" />
          <p className="font-bold text-teal-900">No patients in your queue</p>
          <p className="text-gray-500 text-sm mt-1">
            Patients will appear here once they book an appointment with you.
          </p>
        </div>
      )}

      {!loading && (
        <div className="space-y-3">
          {filtered.map(apt => {
            const config = statusConfig[apt.status] || statusConfig.scheduled;
            return (
              <div key={apt.id} className="bg-white rounded-2xl shadow-card hover:shadow-soft transition-all p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center flex-shrink-0 text-teal-700 font-bold text-xs">
                    #{apt.tokenNumber}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-semibold text-teal-900">{apt.patientName}</p>
                    </div>
                    <p className="text-xs text-gray-500 mb-1">{apt.type}</p>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="w-3 h-3" /><span>{apt.time}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <AlertCircle className="w-3 h-3" /><span>{apt.date}</span>
                      </div>
                    </div>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-1 rounded-lg border ${config.color} ${config.bg} ${config.border}`}>
                    {config.label}
                  </span>
                </div>

                {apt.status !== 'completed' && apt.status !== 'cancelled' && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                    {apt.status === 'scheduled' && (
                      <button
                        onClick={() => markInProgress(apt)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-orange-200 text-orange-600 text-xs font-semibold hover:bg-orange-50 transition-all"
                      >
                        <Clock className="w-3.5 h-3.5" /> Start
                      </button>
                    )}
                    {/* Guided complete button: metrics → Rx → complete */}
                    <button
                      onClick={() => startGuidedComplete(apt)}
                      disabled={completing === apt.id}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-all disabled:opacity-60"
                      title="Complete with metrics + prescription"
                    >
                      {completing === apt.id
                        ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        : <><Stethoscope className="w-3.5 h-3.5" /> Complete</>}
                    </button>
                    <button
                      onClick={() => setPrescriptionPatient(apt)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-teal-200 text-teal-700 text-xs font-semibold hover:bg-teal-50 transition-all"
                    >
                      <Upload className="w-3.5 h-3.5" /> Upload Rx
                    </button>
                    <button
                      onClick={() => setMetricsPatient(apt)}
                      className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border border-purple-200 text-purple-600 text-xs font-semibold hover:bg-purple-50 transition-all"
                      title="Update health metrics"
                    >
                      <Activity className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setReportsPatient(apt)}
                      className="p-2 rounded-xl border border-gray-200 text-gray-400 hover:bg-gray-50 transition-all"
                      title="View patient reports"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* View reports for completed patients too */}
                {(apt.status === 'completed' || apt.status === 'cancelled') && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => setReportsPatient(apt)}
                      className="flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700 font-medium"
                    >
                      <FileText className="w-3.5 h-3.5" /> View Patient Reports
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="text-xs text-teal-600 bg-teal-50 border border-teal-200 rounded-xl p-3 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        Patient queue synced live from Firebase · Prescriptions auto-forward to linked pharmacy
      </div>
    </div>
  );
}
