import type { Doctor, Appointment, Prescription, QueueEntry, HealthMetric, Notification, EmergencyAlert, Bill } from '../types';

export const mockDoctors: Doctor[] = [
  {
    id: '1',
    name: 'Dr. Ananya Sharma',
    specialization: 'Cardiologist',
    rating: 4.9,
    reviews: 312,
    available: true,
    experience: '14 years',
    image: 'https://images.pexels.com/photos/5452293/pexels-photo-5452293.jpeg?auto=compress&cs=tinysrgb&w=200',
    nextSlot: '11:00 AM',
    location: 'Block A, Room 204',
    fee: 800,
  },
  {
    id: '2',
    name: 'Dr. Rahul Mehta',
    specialization: 'Neurologist',
    rating: 4.7,
    reviews: 198,
    available: true,
    experience: '10 years',
    image: 'https://images.pexels.com/photos/6749778/pexels-photo-6749778.jpeg?auto=compress&cs=tinysrgb&w=200',
    nextSlot: '2:00 PM',
    location: 'Block B, Room 108',
    fee: 1000,
  },
  {
    id: '3',
    name: 'Dr. Priya Nair',
    specialization: 'Pediatrician',
    rating: 4.8,
    reviews: 421,
    available: false,
    experience: '12 years',
    image: 'https://images.pexels.com/photos/5214949/pexels-photo-5214949.jpeg?auto=compress&cs=tinysrgb&w=200',
    nextSlot: 'Tomorrow 9:00 AM',
    location: 'Block C, Room 302',
    fee: 600,
  },
  {
    id: '4',
    name: 'Dr. Vikram Gupta',
    specialization: 'Orthopedic Surgeon',
    rating: 4.6,
    reviews: 176,
    available: true,
    experience: '18 years',
    image: 'https://images.pexels.com/photos/4173239/pexels-photo-4173239.jpeg?auto=compress&cs=tinysrgb&w=200',
    nextSlot: '3:30 PM',
    location: 'Block D, Room 410',
    fee: 1200,
  },
  {
    id: '5',
    name: 'Dr. Deepa Krishnan',
    specialization: 'Dermatologist',
    rating: 4.5,
    reviews: 263,
    available: true,
    experience: '8 years',
    image: 'https://images.pexels.com/photos/5452201/pexels-photo-5452201.jpeg?auto=compress&cs=tinysrgb&w=200',
    nextSlot: '10:30 AM',
    location: 'Block A, Room 115',
    fee: 700,
  },
  {
    id: '6',
    name: 'Dr. Arjun Patel',
    specialization: 'General Physician',
    rating: 4.4,
    reviews: 509,
    available: false,
    experience: '6 years',
    image: 'https://images.pexels.com/photos/5327585/pexels-photo-5327585.jpeg?auto=compress&cs=tinysrgb&w=200',
    nextSlot: 'Tomorrow 11:00 AM',
    location: 'Block B, Room 220',
    fee: 400,
  },
];

export const mockAppointments: Appointment[] = [
  {
    id: 'apt1',
    doctorId: '1',
    doctorName: 'Dr. Ananya Sharma',
    patientId: 'p1',
    patientName: 'Ravi Kumar',
    date: '2026-04-15',
    time: '11:00 AM',
    status: 'scheduled',
    type: 'Cardiac Check-up',
    tokenNumber: 14,
  },
  {
    id: 'apt2',
    doctorId: '2',
    doctorName: 'Dr. Rahul Mehta',
    patientId: 'p2',
    patientName: 'Sunita Patel',
    date: '2026-04-14',
    time: '2:00 PM',
    status: 'completed',
    type: 'Neurology Consultation',
    tokenNumber: 8,
  },
  {
    id: 'apt3',
    doctorId: '3',
    doctorName: 'Dr. Priya Nair',
    patientId: 'p3',
    patientName: 'Aditya Singh',
    date: '2026-04-15',
    time: '9:30 AM',
    status: 'in-progress',
    type: 'Pediatric Follow-up',
    tokenNumber: 3,
  },
  {
    id: 'apt4',
    doctorId: '4',
    doctorName: 'Dr. Vikram Gupta',
    patientId: 'p4',
    patientName: 'Meera Joshi',
    date: '2026-04-13',
    time: '3:30 PM',
    status: 'cancelled',
    type: 'Knee Consultation',
    tokenNumber: 21,
  },
];

export const mockPrescriptions: Prescription[] = [
  {
    id: 'rx1',
    doctorName: 'Dr. Ananya Sharma',
    patientName: 'Ravi Kumar',
    date: '2026-04-10',
    medicines: ['Atorvastatin 20mg', 'Aspirin 75mg', 'Metoprolol 25mg'],
    status: 'active',
    diagnosis: 'Hypertension & Mild Dyslipidemia',
    billingStatus: 'ready',
  },
  {
    id: 'rx2',
    doctorName: 'Dr. Rahul Mehta',
    patientName: 'Sunita Patel',
    date: '2026-03-28',
    medicines: ['Levetiracetam 500mg', 'Vitamin B12'],
    status: 'ending-soon',
    diagnosis: 'Migraine Management',
    billingStatus: 'billed',
  },
  {
    id: 'rx3',
    doctorName: 'Dr. Priya Nair',
    patientName: 'Aditya Singh',
    date: '2026-04-01',
    medicines: ['Amoxicillin 250mg', 'Paracetamol 500mg', 'ORS Sachets'],
    status: 'urgent',
    diagnosis: 'Acute Upper Respiratory Infection',
    billingStatus: 'pending',
  },
];

export const mockBills: Bill[] = [
  {
    id: 'bill1',
    prescriptionId: 'rx1',
    patientName: 'Ravi Kumar',
    date: '2026-04-10',
    items: [
      { name: 'Atorvastatin 20mg', quantity: 30, price: 5, total: 150 },
      { name: 'Aspirin 75mg', quantity: 30, price: 2, total: 60 },
      { name: 'Metoprolol 25mg', quantity: 30, price: 4, total: 120 },
    ],
    total: 330,
  },
  {
    id: 'bill2',
    prescriptionId: 'rx2',
    patientName: 'Sunita Patel',
    date: '2026-03-28',
    items: [
      { name: 'Levetiracetam 500mg', quantity: 15, price: 10, total: 150 },
      { name: 'Vitamin B12', quantity: 15, price: 8, total: 120 },
    ],
    total: 270,
  }
];

export const mockQueue: QueueEntry = {
  tokenNumber: 14,
  patientsAhead: 3,
  estimatedWait: 22,
  status: 'medium',
  doctorName: 'Dr. Ananya Sharma',
  appointmentTime: '11:00 AM',
};

export const mockHealthMetrics: HealthMetric[] = [
  { label: 'Blood Pressure', value: '128/84', unit: 'mmHg', status: 'moderate', trend: 'up' },
  { label: 'Heart Rate', value: '72', unit: 'bpm', status: 'normal', trend: 'stable' },
  { label: 'Blood Sugar', value: '145', unit: 'mg/dL', status: 'high', trend: 'up' },
  { label: 'SpO2', value: '98', unit: '%', status: 'normal', trend: 'stable' },
  { label: 'Temperature', value: '98.6', unit: '°F', status: 'normal', trend: 'stable' },
  { label: 'Cholesterol', value: '215', unit: 'mg/dL', status: 'moderate', trend: 'down' },
];

export const mockNotifications: Notification[] = [
  { id: 'n1', type: 'emergency', message: 'Emergency alert: Patient in Room 4 needs immediate attention', time: '2 min ago', read: false },
  { id: 'n2', type: 'appointment', message: 'Your appointment with Dr. Ananya is confirmed for 11:00 AM', time: '15 min ago', read: false },
  { id: 'n3', type: 'prescription', message: 'Prescription Rx-2 is expiring in 3 days', time: '1 hr ago', read: true },
  { id: 'n4', type: 'info', message: 'New lab report available: Blood Panel - Apr 12', time: '3 hr ago', read: true },
  { id: 'n5', type: 'appointment', message: 'Reminder: Follow-up with Dr. Priya tomorrow at 9 AM', time: '5 hr ago', read: true },
];

export const mockEmergencyAlerts: EmergencyAlert[] = [
  { id: 'e1', patientName: 'Suresh Bhatt', severity: 'critical', condition: 'Cardiac Arrest', time: '2 min ago', room: 'ICU-3' },
  { id: 'e2', patientName: 'Kavita Rao', severity: 'serious', condition: 'Respiratory Distress', time: '18 min ago', room: 'Ward 7B' },
  { id: 'e3', patientName: 'Mohan Das', severity: 'monitor', condition: 'High BP - 180/110', time: '35 min ago', room: 'OPD-12' },
];

export const weeklyAppointmentData = [
  { day: 'Mon', count: 12 },
  { day: 'Tue', count: 18 },
  { day: 'Wed', count: 15 },
  { day: 'Thu', count: 22 },
  { day: 'Fri', count: 19 },
  { day: 'Sat', count: 8 },
  { day: 'Sun', count: 5 },
];

export const revenueData = [
  { month: 'Jan', amount: 42000 },
  { month: 'Feb', amount: 51000 },
  { month: 'Mar', amount: 48000 },
  { month: 'Apr', amount: 63000 },
  { month: 'May', amount: 58000 },
  { month: 'Jun', amount: 72000 },
];

export const doctorPerformance = [
  { name: 'Dr. Ananya Sharma', patients: 312, rating: 4.9, satisfaction: 96 },
  { name: 'Dr. Rahul Mehta', patients: 198, rating: 4.7, satisfaction: 91 },
  { name: 'Dr. Priya Nair', patients: 421, rating: 4.8, satisfaction: 94 },
  { name: 'Dr. Vikram Gupta', patients: 176, rating: 4.6, satisfaction: 88 },
  { name: 'Dr. Deepa Krishnan', patients: 263, rating: 4.5, satisfaction: 86 },
];
