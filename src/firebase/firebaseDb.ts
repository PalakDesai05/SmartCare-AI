/**
 * firebaseDb.ts — Complete Firebase RTDB service for HealthAI
 *
 * Database structure:
 *   /users/{uid}/                               ← all role profiles
 *   /doctors/{doctorUid}/                       ← doctor profile + availability
 *   /doctor_queue/{doctorUid}/{apptId}/         ← appointments visible to doctor
 *   /appointments/{patientUid}/{apptId}/        ← patient's appointment list
 *   /prescriptions/{patientUid}/{rxId}/         ← patient's prescriptions
 *   /pharmacy_queue/{pharmacyUid}/{rxId}/       ← prescriptions for THAT pharmacy
 *   /bills/{patientUid}/{billId}/               ← patient's bills
 *   /reports/{patientUid}/{reportId}/           ← patient's uploaded reports
 *   /family_members/{patientUid}/{id}/          ← family member profiles
 *   /emergency_alerts/{alertId}/               ← hospital emergencies
 *   /notifications/{uid}/{notifId}/            ← per-user notifications
 *   /health_metrics/{patientUid}/               ← vitals written by doctor
 *   /feedbacks/{doctorUid}/{feedbackId}/        ← patient feedback + ratings
 */

import {
  ref, set, get, push, update, remove,
  onValue,
  type DataSnapshot,
} from 'firebase/database';
import { db } from './config';

// ══════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════

export interface DbUser {
  uid:       string;
  name:      string;
  email:     string;
  role:      'patient' | 'doctor' | 'admin' | 'pharmacy';
  phone?:    string;
  photoURL?: string;
  createdAt: number;
}

export interface DbDoctor {
  uid:               string;
  name:              string;
  email:             string;
  specialization:    string;
  experience:        string;
  location:          string;
  fee:               number;
  rating:            number;
  reviews:           number;
  available:         boolean;
  linkedPharmacyUid: string;   // UID of linked pharmacy account (empty = none)
  createdAt:         number;
}

export interface DbAppointment {
  id:          string;
  patientUid:  string;
  patientName: string;
  doctorUid:   string;
  doctorName:  string;
  date:        string;
  time:        string;
  type:        string;
  status:      'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  tokenNumber: number;
  createdAt:   number;
}

export interface DbPrescription {
  id:                  string;
  patientUid:          string;
  patientName:         string;
  doctorUid:           string;
  doctorName:          string;
  diagnosis:           string;
  medicines:           string[];
  notes?:              string;
  billingStatus:       'pending' | 'billed' | 'ready' | 'paid';
  pharmacy_access:     boolean;   // patient toggled — grants linked pharmacy visibility
  linkedPharmacyUid?:  string;    // pharmacy UID set by doctor when uploading Rx
  linkedPharmacyName?: string;    // pharmacy display name (stored so patient sees it)
  createdAt:           number;
}

export interface DbReport {
  id:          string;
  patientUid:  string;
  patientName: string;
  fileName:    string;
  fileType:    string;   // 'pdf' | 'image'
  notes?:      string;
  uploadedAt:  number;
}

export interface DbFamilyMember {
  id:           string;
  name:         string;
  relation:     string;
  age:          number;
  phone?:       string;
  blood_group?: string;
  createdAt:    number;
}

export interface DbBill {
  id:             string;
  prescriptionId: string;
  patientUid:     string;
  patientName:    string;
  doctorName:     string;
  items:          Array<{ name: string; quantity: number; price: number; total: number }>;
  total:          number;
  status:         'generated' | 'ready' | 'paid';
  createdAt:      number;
}

export interface DbEmergencyAlert {
  id:          string;
  patientUid:  string;
  patientName: string;
  description: string;
  location?:   string;
  severity:    'critical' | 'serious' | 'monitor';
  status:      'active' | 'resolved';
  createdAt:   number;
}

export interface DbNotification {
  id:        string;
  uid:       string;
  message:   string;
  type:      'appointment' | 'prescription' | 'bill' | 'emergency' | 'info';
  read:      boolean;
  createdAt: number;
}

export interface DbHealthMetrics {
  bloodPressure:  string;   // e.g. "138/88"
  heartRate:      number;   // bpm
  bloodSugar:     number;   // mg/dL
  spo2:           number;   // %
  temperature:    number;   // °F
  cholesterol:    number;   // mg/dL
  updatedByName:  string;   // doctor name
  updatedAt:      number;   // timestamp
}

export interface DbFeedback {
  id:          string;
  doctorUid:   string;
  patientUid:  string;
  patientName: string;
  rating:      number;   // 1–5
  review:      string;
  createdAt:   number;
}

// ── Helpers ──────────────────────────────────────────────
function snap2list<T>(snap: DataSnapshot): T[] {
  if (!snap.exists()) return [];
  return Object.values(snap.val()) as T[];
}

function snap2obj<T>(snap: DataSnapshot): Record<string, T> {
  if (!snap.exists()) return {};
  return snap.val() as Record<string, T>;
}

// ══════════════════════════════════════════════════════════
// NOTIFICATIONS (internal helper)
// ══════════════════════════════════════════════════════════

async function pushNotification(
  uid: string,
  data: { message: string; type: DbNotification['type'] }
): Promise<void> {
  const newRef = push(ref(db, `notifications/${uid}`));
  const id     = newRef.key!;
  await set(newRef, { ...data, id, uid, read: false, createdAt: Date.now() });
}

// ══════════════════════════════════════════════════════════
// USER PROFILE
// ══════════════════════════════════════════════════════════

export async function saveUserProfile(user: DbUser): Promise<void> {
  await set(ref(db, `users/${user.uid}`), user);
}

export async function getUserProfile(uid: string): Promise<DbUser | null> {
  const snap = await get(ref(db, `users/${uid}`));
  return snap.exists() ? (snap.val() as DbUser) : null;
}

export async function updateUserRole(uid: string, role: DbUser['role']): Promise<void> {
  await update(ref(db, `users/${uid}`), { role });
}

export async function getAllUsers(): Promise<DbUser[]> {
  const snap = await get(ref(db, 'users'));
  return snap2list<DbUser>(snap);
}

export async function getAllPharmacies(): Promise<DbUser[]> {
  const snap = await get(ref(db, 'users'));
  return snap2list<DbUser>(snap).filter(u => u.role === 'pharmacy');
}

// ══════════════════════════════════════════════════════════
// DOCTORS
// ══════════════════════════════════════════════════════════

/** Normalise a raw Firebase doctor snapshot — coerce all numeric fields so
 *  components can safely call .toFixed() / arithmetic without crashing. */
function normalizeDoctor(raw: Record<string, unknown>): DbDoctor {
  return {
    uid:               String(raw.uid   || ''),
    name:              String(raw.name  || 'Doctor'),
    email:             String(raw.email || ''),
    specialization:    String(raw.specialization || 'General'),
    experience:        String(raw.experience     || 'N/A'),
    location:          String(raw.location       || 'Hospital'),
    fee:               Number(raw.fee)    || 0,
    rating:            Number(raw.rating) || 4.5,
    reviews:           Number(raw.reviews)|| 0,
    available:         raw.available !== false,          // default true
    linkedPharmacyUid: String(raw.linkedPharmacyUid || ''),
    createdAt:         Number(raw.createdAt) || Date.now(),
  };
}

export async function saveDoctor(doctor: DbDoctor): Promise<void> {
  await set(ref(db, `doctors/${doctor.uid}`), doctor);
}

export async function getAllDoctors(): Promise<DbDoctor[]> {
  const snap = await get(ref(db, 'doctors'));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return snap2list<Record<string, any>>(snap)
    .map(normalizeDoctor)
    .sort((a, b) => b.rating - a.rating);
}

export async function getDoctorByUid(uid: string): Promise<DbDoctor | null> {
  const snap = await get(ref(db, `doctors/${uid}`));
  if (!snap.exists()) return null;
  return normalizeDoctor(snap.val() as Record<string, unknown>);
}

export async function updateDoctorAvailability(uid: string, available: boolean): Promise<void> {
  await update(ref(db, `doctors/${uid}`), { available });
}

export async function updateDoctorRating(uid: string, newRating: number, newReviews: number): Promise<void> {
  await update(ref(db, `doctors/${uid}`), { rating: newRating, reviews: newReviews });
}

/** Link or unlink a pharmacy to this doctor's clinic. */
export async function updateDoctorLinkedPharmacy(
  doctorUid: string,
  pharmacyUid: string
): Promise<void> {
  await update(ref(db, `doctors/${doctorUid}`), { linkedPharmacyUid: pharmacyUid });
}

export async function deleteDoctor(uid: string): Promise<void> {
  await remove(ref(db, `doctors/${uid}`));
}

export function listenDoctors(
  callback: (docs: DbDoctor[]) => void,
  onError?: (err: Error) => void
): () => void {
  return onValue(
    ref(db, 'doctors'),
    snap => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const docs = snap2list<Record<string, any>>(snap)
        .map(normalizeDoctor)
        .sort((a, b) => b.rating - a.rating);
      callback(docs);
    },
    err => { console.warn('RTDB doctors error:', err.message); onError?.(err); }
  );
}

// ══════════════════════════════════════════════════════════
// APPOINTMENTS — patient side + doctor queue
// ══════════════════════════════════════════════════════════

export async function bookAppointment(
  patientUid: string,
  appt: Omit<DbAppointment, 'id'>
): Promise<string> {
  const patientRef = ref(db, `appointments/${patientUid}`);
  const newRef     = push(patientRef);
  const id         = newRef.key!;
  const full       = { ...appt, id };
  await set(newRef, full);
  await set(ref(db, `doctor_queue/${appt.doctorUid}/${id}`), full);
  return id;
}

export async function getPatientAppointments(patientUid: string): Promise<DbAppointment[]> {
  const snap = await get(ref(db, `appointments/${patientUid}`));
  return snap2list<DbAppointment>(snap).sort((a, b) => b.createdAt - a.createdAt);
}

export async function updateAppointmentStatus(
  patientUid: string,
  apptId: string,
  status: DbAppointment['status'],
  doctorUid?: string
): Promise<void> {
  await update(ref(db, `appointments/${patientUid}/${apptId}`), { status });
  if (doctorUid) {
    await update(ref(db, `doctor_queue/${doctorUid}/${apptId}`), { status });
  }
  await pushNotification(patientUid, {
    message: `Your appointment status changed to: ${status}`,
    type: 'appointment',
  });
}

export function listenAppointments(
  patientUid: string,
  callback: (appts: DbAppointment[]) => void,
  onError?: (err: Error) => void
): () => void {
  return onValue(
    ref(db, `appointments/${patientUid}`),
    snap => callback(snap2list<DbAppointment>(snap).sort((a, b) => b.createdAt - a.createdAt)),
    err  => { console.warn('RTDB appointments error:', err.message); onError?.(err); }
  );
}

export function listenDoctorQueue(
  doctorUid: string,
  callback: (appts: DbAppointment[]) => void,
  onError?: (err: Error) => void
): () => void {
  return onValue(
    ref(db, `doctor_queue/${doctorUid}`),
    snap => callback(snap2list<DbAppointment>(snap).sort((a, b) => a.tokenNumber - b.tokenNumber)),
    err  => { console.warn('RTDB doctor_queue error:', err.message); onError?.(err); }
  );
}

// ══════════════════════════════════════════════════════════
// PRESCRIPTIONS
// ══════════════════════════════════════════════════════════

/**
 * Save a prescription:
 * 1. Under /prescriptions/{patientUid}/{id} with pharmacy_access = FALSE
 * 2. linkedPharmacyUid + linkedPharmacyName stored so patient knows who to grant access to
 * 3. Pharmacy only sees it AFTER patient explicitly toggles "Grant Access"
 * 4. Notify patient
 */
export async function savePrescription(
  patientUid: string,
  rx: Omit<DbPrescription, 'id'>
): Promise<string> {
  const listRef = ref(db, `prescriptions/${patientUid}`);
  const newRef  = push(listRef);
  const id      = newRef.key!;

  const full: DbPrescription = {
    ...rx,
    id,
    pharmacy_access: false,   // always starts as NOT granted
  };

  await set(newRef, full);

  await pushNotification(patientUid, {
    message: `New prescription from ${rx.doctorName}: ${rx.diagnosis}. Open Pharmacy/Meds to view and grant pharmacy access.`,
    type: 'prescription',
  });

  return id;
}

export async function getPatientPrescriptions(patientUid: string): Promise<DbPrescription[]> {
  const snap = await get(ref(db, `prescriptions/${patientUid}`));
  return snap2list<DbPrescription>(snap).sort((a, b) => b.createdAt - a.createdAt);
}

/** Patient grants pharmacy access — copies prescription into pharmacy's scoped queue. */
export async function grantPharmacyAccess(
  patientUid: string,
  rxId: string
): Promise<void> {
  // Read the prescription to get the linkedPharmacyUid
  const rxSnap = await get(ref(db, `prescriptions/${patientUid}/${rxId}`));
  if (!rxSnap.exists()) throw new Error('Prescription not found');
  const rx = rxSnap.val() as DbPrescription;
  const pharmacyUid = rx.linkedPharmacyUid;
  if (!pharmacyUid) throw new Error('No pharmacy linked by doctor');

  await update(ref(db, `prescriptions/${patientUid}/${rxId}`), {
    pharmacy_access: true,
  });

  // Write full prescription into pharmacy's scoped queue
  await set(ref(db, `pharmacy_queue/${pharmacyUid}/${rxId}`), {
    ...rx,
    pharmacy_access: true,
  });

  // Notify pharmacy
  await pushNotification(pharmacyUid, {
    message: `${rx.patientName} has granted you access to their prescription: ${rx.diagnosis}`,
    type: 'prescription',
  });
}

/** Patient revokes pharmacy access — removes from pharmacy's scoped queue. */
export async function revokePharmacyAccess(
  patientUid: string,
  rxId: string
): Promise<void> {
  const rxSnap = await get(ref(db, `prescriptions/${patientUid}/${rxId}`));
  const rx = rxSnap.exists() ? (rxSnap.val() as DbPrescription) : null;
  const pharmacyUid = rx?.linkedPharmacyUid;

  await update(ref(db, `prescriptions/${patientUid}/${rxId}`), {
    pharmacy_access: false,
  });

  if (pharmacyUid) {
    await remove(ref(db, `pharmacy_queue/${pharmacyUid}/${rxId}`));
  }
}

export async function updatePrescriptionBillingStatus(
  patientUid: string,
  rxId: string,
  billingStatus: DbPrescription['billingStatus'],
  pharmacyUid?: string
): Promise<void> {
  await update(ref(db, `prescriptions/${patientUid}/${rxId}`), { billingStatus });
  if (pharmacyUid) {
    const qSnap = await get(ref(db, `pharmacy_queue/${pharmacyUid}/${rxId}`));
    if (qSnap.exists()) {
      await update(ref(db, `pharmacy_queue/${pharmacyUid}/${rxId}`), { billingStatus });
    }
  }
}

export function listenPrescriptions(
  patientUid: string,
  callback: (rxs: DbPrescription[]) => void,
  onError?: (err: Error) => void
): () => void {
  return onValue(
    ref(db, `prescriptions/${patientUid}`),
    snap => callback(snap2list<DbPrescription>(snap).sort((a, b) => b.createdAt - a.createdAt)),
    err  => { console.warn('RTDB prescriptions error:', err.message); onError?.(err); }
  );
}

// ══════════════════════════════════════════════════════════
// PHARMACY QUEUE — scoped per pharmacy UID
// ══════════════════════════════════════════════════════════

/** Real-time listener: only shows THIS pharmacy's prescriptions. */
export function listenPharmacyQueue(
  pharmacyUid: string,
  callback: (rxs: DbPrescription[]) => void,
  onError?: (err: Error) => void
): () => void {
  return onValue(
    ref(db, `pharmacy_queue/${pharmacyUid}`),
    snap => callback(snap2list<DbPrescription>(snap).sort((a, b) => b.createdAt - a.createdAt)),
    err  => { console.warn('RTDB pharmacy_queue error:', err.message); onError?.(err); }
  );
}

// ══════════════════════════════════════════════════════════
// BILLS
// ══════════════════════════════════════════════════════════

export async function generateBill(
  patientUid: string,
  bill: Omit<DbBill, 'id' | 'status'>,
  pharmacyUid?: string
): Promise<string> {
  const listRef = ref(db, `bills/${patientUid}`);
  const newRef  = push(listRef);
  const id      = newRef.key!;
  await set(newRef, { ...bill, id, status: 'generated' });
  await updatePrescriptionBillingStatus(patientUid, bill.prescriptionId, 'billed', pharmacyUid);
  await pushNotification(patientUid, {
    message: `Your bill of ₹${bill.total} from ${bill.doctorName} has been generated by the pharmacy.`,
    type: 'bill',
  });
  return id;
}

export async function getPatientBills(patientUid: string): Promise<DbBill[]> {
  const snap = await get(ref(db, `bills/${patientUid}`));
  return snap2list<DbBill>(snap).sort((a, b) => b.createdAt - a.createdAt);
}

export async function markBillReady(
  patientUid: string,
  rxId: string,
  pharmacyUid?: string
): Promise<void> {
  await updatePrescriptionBillingStatus(patientUid, rxId, 'ready', pharmacyUid);
  const snap  = await get(ref(db, `bills/${patientUid}`));
  const bills = snap2obj<DbBill>(snap);
  for (const [key, bill] of Object.entries(bills)) {
    if (bill.prescriptionId === rxId) {
      await update(ref(db, `bills/${patientUid}/${key}`), { status: 'ready' });
    }
  }
  await pushNotification(patientUid, {
    message: '✅ Your medicines are ready for pickup at the pharmacy counter!',
    type: 'bill',
  });
}

export async function markBillPaid(patientUid: string, billId: string): Promise<void> {
  await update(ref(db, `bills/${patientUid}/${billId}`), { status: 'paid' });
  await pushNotification(patientUid, {
    message: 'Payment confirmed! Thank you for using HealthAI.',
    type: 'bill',
  });
}

export function listenBills(
  patientUid: string,
  callback: (bills: DbBill[]) => void,
  onError?: (err: Error) => void
): () => void {
  return onValue(
    ref(db, `bills/${patientUid}`),
    snap => callback(snap2list<DbBill>(snap).sort((a, b) => b.createdAt - a.createdAt)),
    err  => { console.warn('RTDB bills error:', err.message); onError?.(err); }
  );
}

// ══════════════════════════════════════════════════════════
// REPORTS — patient upload metadata
// ══════════════════════════════════════════════════════════

export async function saveReport(
  patientUid: string,
  report: Omit<DbReport, 'id'>
): Promise<string> {
  const newRef = push(ref(db, `reports/${patientUid}`));
  const id     = newRef.key!;
  await set(newRef, { ...report, id });
  return id;
}

export async function getPatientReports(patientUid: string): Promise<DbReport[]> {
  const snap = await get(ref(db, `reports/${patientUid}`));
  return snap2list<DbReport>(snap).sort((a, b) => b.uploadedAt - a.uploadedAt);
}

export function listenPatientReports(
  patientUid: string,
  callback: (reports: DbReport[]) => void
): () => void {
  return onValue(
    ref(db, `reports/${patientUid}`),
    snap => callback(snap2list<DbReport>(snap).sort((a, b) => b.uploadedAt - a.uploadedAt))
  );
}

// ══════════════════════════════════════════════════════════
// FAMILY MEMBERS
// ══════════════════════════════════════════════════════════

export async function addFamilyMember(
  patientUid: string,
  member: Omit<DbFamilyMember, 'id'>
): Promise<DbFamilyMember> {
  const newRef = push(ref(db, `family_members/${patientUid}`));
  const id     = newRef.key!;
  const full   = { ...member, id };
  await set(newRef, full);
  return full;
}

export async function getFamilyMembers(patientUid: string): Promise<DbFamilyMember[]> {
  const snap = await get(ref(db, `family_members/${patientUid}`));
  return snap2list<DbFamilyMember>(snap).sort((a, b) => b.createdAt - a.createdAt);
}

export async function removeFamilyMember(patientUid: string, memberId: string): Promise<void> {
  await remove(ref(db, `family_members/${patientUid}/${memberId}`));
}

export function listenFamilyMembers(
  patientUid: string,
  callback: (members: DbFamilyMember[]) => void,
  onError?: (err: Error) => void
): () => void {
  return onValue(
    ref(db, `family_members/${patientUid}`),
    snap => callback(snap2list<DbFamilyMember>(snap).sort((a, b) => b.createdAt - a.createdAt)),
    err  => { console.warn('RTDB family_members error:', err.message); onError?.(err); }
  );
}

// ══════════════════════════════════════════════════════════
// EMERGENCY ALERTS
// ══════════════════════════════════════════════════════════

export async function createEmergencyAlert(
  alert: Omit<DbEmergencyAlert, 'id'>
): Promise<string> {
  const newRef = push(ref(db, 'emergency_alerts'));
  const id     = newRef.key!;
  await set(newRef, { ...alert, id });
  return id;
}

export async function resolveEmergencyAlert(alertId: string): Promise<void> {
  await update(ref(db, `emergency_alerts/${alertId}`), { status: 'resolved' });
}

export function listenEmergencyAlerts(
  callback: (alerts: DbEmergencyAlert[]) => void,
  onError?: (err: Error) => void
): () => void {
  return onValue(
    ref(db, 'emergency_alerts'),
    snap => {
      const all = snap2list<DbEmergencyAlert>(snap);
      callback(all.sort((a, b) => b.createdAt - a.createdAt));
    },
    err => { console.warn('RTDB emergency error:', err.message); onError?.(err); }
  );
}

// ══════════════════════════════════════════════════════════
// NOTIFICATIONS
// ══════════════════════════════════════════════════════════

export async function markNotificationsRead(uid: string): Promise<void> {
  const snap = await get(ref(db, `notifications/${uid}`));
  if (!snap.exists()) return;
  const updates: Record<string, boolean> = {};
  Object.keys(snap.val()).forEach(k => { updates[`notifications/${uid}/${k}/read`] = true; });
  await update(ref(db), updates);
}

export function listenNotifications(
  uid: string,
  callback: (notifs: DbNotification[]) => void,
  onError?: (err: Error) => void
): () => void {
  return onValue(
    ref(db, `notifications/${uid}`),
    snap => callback(snap2list<DbNotification>(snap).sort((a, b) => b.createdAt - a.createdAt)),
    err  => { console.warn('RTDB notifications error:', err.message); onError?.(err); }
  );
}

// ══════════════════════════════════════════════════════════
// HEALTH METRICS  — written by doctor, read by patient
// ══════════════════════════════════════════════════════════

/** Doctor saves 6 vitals for a patient — overwrites previous values. */
export async function saveHealthMetrics(
  patientUid: string,
  metrics: DbHealthMetrics,
): Promise<void> {
  await set(ref(db, `health_metrics/${patientUid}`), metrics);
  // Notify the patient
  await pushNotification(patientUid, {
    message: `Dr. ${metrics.updatedByName} updated your health metrics. Check your Health Dashboard.`,
    type: 'info',
  });
}

/** One-time fetch of a patient's latest metrics. */
export async function getHealthMetrics(
  patientUid: string,
): Promise<DbHealthMetrics | null> {
  const snap = await get(ref(db, `health_metrics/${patientUid}`));
  return snap.exists() ? (snap.val() as DbHealthMetrics) : null;
}

/** Real-time listener — patient dashboard subscribes here. */
export function listenHealthMetrics(
  patientUid: string,
  callback: (metrics: DbHealthMetrics | null) => void,
  onError?: (err: Error) => void,
): () => void {
  return onValue(
    ref(db, `health_metrics/${patientUid}`),
    snap => callback(snap.exists() ? (snap.val() as DbHealthMetrics) : null),
    err => { console.warn('RTDB health_metrics error:', err.message); onError?.(err); },
  );
}

// ══════════════════════════════════════════════════════════
// PAYMENT HELPERS
// ══════════════════════════════════════════════════════════

/** Pharmacy marks a bill as paid via cash — same effect as patient confirming online. */
export async function markBillCashPaid(
  patientUid: string,
  billId: string,
  rxId: string,
  pharmacyUid?: string,
): Promise<void> {
  await update(ref(db, `bills/${patientUid}/${billId}`), { status: 'paid' });
  await updatePrescriptionBillingStatus(patientUid, rxId, 'paid', pharmacyUid);
  await pushNotification(patientUid, {
    message: 'Cash payment confirmed! Your medicines are ready for pickup.',
    type: 'bill',
  });
}

// ══════════════════════════════════════════════════════════
// FEEDBACK & RATINGS
// ══════════════════════════════════════════════════════════

/**
 * Save patient feedback for a doctor.
 * Automatically recalculates the doctor's average rating.
 */
export async function saveFeedback(
  doctorUid: string,
  feedback: Omit<DbFeedback, 'id'>,
): Promise<void> {
  const newRef = push(ref(db, `feedbacks/${doctorUid}`));
  const id     = newRef.key!;
  await set(newRef, { ...feedback, id });

  // Recalculate doctor's average rating from all feedbacks
  const allSnap = await get(ref(db, `feedbacks/${doctorUid}`));
  const all     = snap2list<DbFeedback>(allSnap);
  if (all.length === 0) return;
  const avg = all.reduce((sum, f) => sum + f.rating, 0) / all.length;
  await update(ref(db, `doctors/${doctorUid}`), {
    rating:  Math.round(avg * 10) / 10,
    reviews: all.length,
  });
}

export function listenFeedbacksByDoctor(
  doctorUid: string,
  callback: (feedbacks: DbFeedback[]) => void,
  onError?: (err: Error) => void,
): () => void {
  return onValue(
    ref(db, `feedbacks/${doctorUid}`),
    snap => callback(snap2list<DbFeedback>(snap).sort((a, b) => b.createdAt - a.createdAt)),
    err => { console.warn('RTDB feedbacks error:', err.message); onError?.(err); },
  );
}

// ══════════════════════════════════════════════════════════
// ADMIN HELPERS
// ══════════════════════════════════════════════════════════

export async function getAdminStats(): Promise<{
  totalDoctors: number; totalPatients: number; activeDoctors: number;
}> {
  const [usersSnap, doctorsSnap] = await Promise.all([
    get(ref(db, 'users')),
    get(ref(db, 'doctors')),
  ]);
  const users   = snap2list<DbUser>(usersSnap);
  const doctors = snap2list<DbDoctor>(doctorsSnap);
  return {
    totalDoctors:  doctors.length,
    activeDoctors: doctors.filter(d => d.available).length,
    totalPatients: users.filter(u => u.role === 'patient').length,
  };
}
