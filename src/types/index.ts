export type Role = 'patient' | 'doctor' | 'admin' | 'pharmacy';
export type Language = 'EN' | 'HI' | 'MR';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialization: string;
  rating: number;
  reviews: number;
  available: boolean;
  experience: string;
  image: string;
  nextSlot: string;
  location: string;
  fee: number;
}

export interface Appointment {
  id: string;
  doctorId: string;
  doctorName: string;
  patientId: string;
  patientName: string;
  date: string;
  time: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'in-progress';
  type: string;
  tokenNumber: number;
}

export interface Prescription {
  id: string;
  doctorName: string;
  patientName: string;
  date: string;
  medicines: string[];
  status: 'urgent' | 'ending-soon' | 'active';
  diagnosis: string;
  billingStatus: 'pending' | 'billed' | 'ready';
  pharmacy_access?: boolean;
}

export interface BillItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Bill {
  id: string;
  prescriptionId: string;
  patientName: string;
  date: string;
  items: BillItem[];
  total: number;
}


export interface QueueEntry {
  tokenNumber: number;
  patientsAhead: number;
  estimatedWait: number;
  status: 'low' | 'medium' | 'high' | 'critical';
  doctorName: string;
  appointmentTime: string;
}

export interface HealthMetric {
  label: string;
  value: string;
  unit: string;
  status: 'normal' | 'moderate' | 'high' | 'critical';
  trend: 'up' | 'down' | 'stable';
}

export interface Notification {
  id: string;
  type: 'emergency' | 'appointment' | 'prescription' | 'info';
  message: string;
  time: string;
  read: boolean;
}

export interface EmergencyAlert {
  id: string;
  patientName: string;
  severity: 'critical' | 'serious' | 'monitor';
  condition: string;
  time: string;
  room: string;
}

export interface DoctorStats {
  totalPatients: number;
  todayAppointments: number;
  completedToday: number;
  pendingReports: number;
}

export interface AdminStats {
  totalDoctors: number;
  totalPatients: number;
  totalAppointments: number;
  revenue: number;
  emergencyAlerts: number;
  activeDoctors: number;
}

export type ActiveView =
  | 'overview'
  | 'find-doctors'
  | 'queue'
  | 'prescriptions'
  | 'health'
  | 'qr-token'
  | 'family'
  | 'doctor-overview'
  | 'patient-queue'
  | 'emergency'
  | 'admin-overview'
  | 'manage-doctors'
  | 'manage-pharmacy'
  | 'analytics'
  | 'pharmacy-panel'
  | 'profile';

