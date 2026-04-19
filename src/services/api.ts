const BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';

class ApiService {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('healthai_token', token);
  }

  getToken(): string | null {
    if (!this.token) this.token = localStorage.getItem('healthai_token');
    return this.token;
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('healthai_token');
    localStorage.removeItem('healthai_user');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(err.detail || 'Request failed');
    }
    return res.json();
  }

  // ── AUTH ─────────────────────────────────────────────────────────────────
  async login(email: string, password: string) {
    return this.request<{
      access_token: string;
      token_type: string;
      role: string;
      name: string;
      user_id: number;
    }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  }

  async register(data: {
    name: string;
    email: string;
    phone?: string;
    password: string;
    role?: string;
  }) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ role: 'patient', ...data }),
    });
  }

  // ── DOCTORS ───────────────────────────────────────────────────────────────
  async getDoctors() {
    return this.request<any[]>('/doctors/');
  }

  async addDoctor(data: {
    user_id: number;
    specialization: string;
    experience_years: number;
    location?: string;
    fee: number;
  }) {
    return this.request('/doctors/', { method: 'POST', body: JSON.stringify(data) });
  }

  async toggleDoctorAvailability(doctorId: number) {
    return this.request(`/doctors/${doctorId}/availability`, { method: 'PATCH' });
  }

  async rateDoctor(data: { doctor_id: number; rating: number; review?: string }) {
    return this.request('/doctors/rate', { method: 'POST', body: JSON.stringify(data) });
  }

  // ── APPOINTMENTS ──────────────────────────────────────────────────────────
  async bookAppointment(data: {
    doctor_id: number;
    date: string;
    time: string;
    type?: string;
  }) {
    return this.request<any>('/appointments/book', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getPatientAppointments(userId: number) {
    return this.request<any[]>(`/appointments/user/${userId}`);
  }

  async getDoctorAppointments(doctorId: number) {
    return this.request<any[]>(`/appointments/doctor/${doctorId}`);
  }

  async updateAppointmentStatus(appointmentId: number, status: string) {
    return this.request<any>(`/appointments/${appointmentId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async getDoctorQueue(doctorId: number) {
    return this.request<any[]>(`/appointments/queue/${doctorId}`);
  }

  // ── PRESCRIPTIONS ─────────────────────────────────────────────────────────
  async uploadPrescription(data: {
    appointment_id?: number;
    patient_id: number;
    diagnosis: string;
    medicines: string[];
    notes?: string;
  }) {
    return this.request('/prescription/upload', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getPatientPrescriptions(patientId: number) {
    return this.request<any[]>(`/prescription/${patientId}`);
  }

  async getPharmacyPrescriptions() {
    return this.request<any[]>('/prescription/pharmacy/pending');
  }

  async updatePrescriptionBillingStatus(prescriptionId: number, status: string) {
    return this.request(`/prescription/${prescriptionId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async grantPharmacyAccess(prescriptionId: number) {
    return this.request(`/prescription/${prescriptionId}/grant-access`, {
      method: 'PATCH',
    });
  }

  async revokePharmacyAccess(prescriptionId: number) {
    return this.request(`/prescription/${prescriptionId}/revoke-access`, {
      method: 'PATCH',
    });
  }

  // ── BILLS ─────────────────────────────────────────────────────────────────
  async generateBill(data: {
    prescription_id: number;
    items: Array<{ name: string; quantity: number; price: number; total: number }>;
    total_amount: number;
  }) {
    return this.request('/bill/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getPatientBills(patientId: number) {
    return this.request<any[]>(`/bill/${patientId}`);
  }

  async markBillReady(billId: number) {
    return this.request(`/bill/${billId}/ready`, { method: 'PATCH' });
  }

  // ── FAMILY MEMBERS ────────────────────────────────────────────────────────
  async getFamilyMembers(userId: number) {
    return this.request<any[]>(`/family/${userId}`);
  }

  async addFamilyMember(data: {
    name: string;
    relation: string;
    age: number;
    phone?: string;
    blood_group?: string;
  }) {
    return this.request('/family/add', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async removeFamilyMember(memberId: number) {
    return this.request(`/family/${memberId}`, { method: 'DELETE' });
  }

  // ── EMERGENCY ─────────────────────────────────────────────────────────────
  async triggerEmergency(data: {
    patient_id: number;
    description: string;
    location?: string;
  }) {
    return this.request('/emergency/request', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ── NOTIFICATIONS ─────────────────────────────────────────────────────────
  async getNotifications() {
    return this.request<any[]>('/notifications/');
  }

  async markNotificationsRead() {
    return this.request('/notifications/read', { method: 'PATCH' });
  }

  // ── ADMIN ─────────────────────────────────────────────────────────────────
  async getAdminStats() {
    return this.request<any>('/admin/stats');
  }

  async getUsers() {
    return this.request<any[]>('/admin/users');
  }

  async deleteUser(userId: number) {
    return this.request(`/admin/users/${userId}`, { method: 'DELETE' });
  }

  async registerDoctorAccount(data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    specialization: string;
    experience_years: number;
    location?: string;
    fee: number;
  }) {
    const user = (await this.register({
      name: data.name,
      email: data.email,
      password: data.password,
      phone: data.phone,
      role: 'doctor',
    })) as any;
    return this.addDoctor({
      user_id: user.id,
      specialization: data.specialization,
      experience_years: data.experience_years,
      location: data.location,
      fee: data.fee,
    });
  }

  // ── CHATBOT ───────────────────────────────────────────────────────────────
  async askChatbot(message: string, context?: string) {
    return this.request<{ reply: string }>('/chatbot/ask', {
      method: 'POST',
      body: JSON.stringify({ message, context }),
    });
  }

  async askSmartChatbot(message: string) {
    return this.request<{ reply: string }>('/chatbot/ask/smart', {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }
}

export const api = new ApiService();
