import { useState, useEffect } from 'react';
import type { Role, ActiveView } from './types';
import type { Doctor } from './types';

import { AuthProvider, useAuth } from './contexts/AuthContext';

import AuthPage from './components/auth/AuthPage';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';

import PatientOverview from './components/patient/PatientOverview';
import FindDoctors from './components/patient/FindDoctors';
import QueueTracking from './components/patient/QueueTracking';
import Prescriptions from './components/patient/Prescriptions';
import HealthMetrics from './components/patient/HealthMetrics';
import QRToken from './components/patient/QRToken';
import FamilyMembers from './components/patient/FamilyMembers';

import DoctorOverview from './components/doctor/DoctorOverview';
import PatientQueue from './components/doctor/PatientQueue';
import EmergencyAlerts from './components/doctor/EmergencyAlerts';

import AdminOverview from './components/admin/AdminOverview';
import ManageDoctors from './components/admin/ManageDoctors';
import ManagePharmacy from './components/admin/ManagePharmacy';
import Analytics from './components/admin/Analytics';

import BookingModal from './components/shared/BookingModal';
import EmergencyDemoFlow from './components/shared/EmergencyDemoFlow';
import Chatbot from './components/shared/Chatbot';
import ErrorBoundary from './components/shared/ErrorBoundary';

import PharmacyPanel from './components/pharmacy/PharmacyPanel';
import Profile from './components/profile/Profile';

const viewTitles: Record<ActiveView, string> = {
  overview:           'Patient Overview',
  'find-doctors':     'Find Doctors',
  queue:              'My Queue',
  prescriptions:      'Prescriptions',
  health:             'Health Metrics',
  'qr-token':         'QR Token',
  family:             'Family Members',
  'doctor-overview':  'Doctor Dashboard',
  'patient-queue':    'Patient Queue',
  emergency:          'Emergency Alerts',
  'admin-overview':   'Admin Dashboard',
  'manage-doctors':   'Manage Doctors',
  'manage-pharmacy':  'Manage Pharmacy',
  analytics:          'Analytics',
  'pharmacy-panel':   'Pharmacy Dashboard',
  profile:            'My Profile',
};

const defaultViews: Record<Role, ActiveView> = {
  patient:  'overview',
  doctor:   'doctor-overview',
  admin:    'admin-overview',
  pharmacy: 'pharmacy-panel',
};

// ── Inner shell (needs AuthContext already mounted) ───────
function AppShell() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  const [activeView, setActiveView]             = useState<ActiveView>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [bookingDoctor, setBookingDoctor]       = useState<Doctor | null>(null);
  const [showEmergencyDemo, setShowEmergencyDemo] = useState(false);

  // When auth state arrives (login / page refresh), jump to role default view
  useEffect(() => {
    if (isAuthenticated && user) {
      setActiveView(defaultViews[user.role]);
    }
  }, [isAuthenticated, user]);

  // ── Auth callback from AuthPage (kept for legacy compat)
  const handleLogin = (role: Role, name: string, _userId: number) => {
    setActiveView(defaultViews[role]);
  };

  const handleLogout = async () => {
    await logout();
    setActiveView('overview');
  };

  // Firebase resolves auth state asynchronously — show spinner until ready
  if (isLoading) {
    return (
      <div className="min-h-screen bg-teal-50 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
        <p className="text-teal-700 font-medium text-sm">Loading SmartCare AI…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage onLogin={handleLogin} />;
  }

  const renderView = () => {
    const wrap = (node: React.ReactNode, name: string) => (
      <ErrorBoundary name={name}>{node}</ErrorBoundary>
    );
    switch (activeView) {
      case 'overview':        return wrap(<PatientOverview userName={user?.name || ''} onNavigate={v => setActiveView(v as ActiveView)} />, 'PatientOverview');
      case 'find-doctors':   return wrap(<FindDoctors onBook={setBookingDoctor} />, 'FindDoctors');
      case 'queue':          return wrap(<QueueTracking />, 'QueueTracking');
      case 'prescriptions':  return wrap(<Prescriptions />, 'Prescriptions');
      case 'health':         return wrap(<HealthMetrics />, 'HealthMetrics');
      case 'qr-token':       return wrap(<QRToken />, 'QRToken');
      case 'family':         return wrap(<FamilyMembers />, 'FamilyMembers');
      case 'doctor-overview':return wrap(<DoctorOverview userName={user?.name || ''} onNavigate={v => setActiveView(v as ActiveView)} />, 'DoctorOverview');
      case 'patient-queue':  return wrap(<PatientQueue />, 'PatientQueue');
      case 'emergency':      return wrap(<EmergencyAlerts />, 'EmergencyAlerts');
      case 'admin-overview': return wrap(<AdminOverview onNavigate={v => setActiveView(v as ActiveView)} />, 'AdminOverview');
      case 'manage-doctors': return wrap(<ManageDoctors />, 'ManageDoctors');
      case 'manage-pharmacy':return wrap(<ManagePharmacy />, 'ManagePharmacy');
      case 'analytics':      return wrap(<Analytics />, 'Analytics');
      case 'pharmacy-panel': return wrap(<PharmacyPanel />, 'PharmacyPanel');
      case 'profile':        return wrap(<Profile />, 'Profile');
      default: return null;
    }
  };

  return (
    <div className="flex h-screen bg-teal-50 overflow-hidden">
      <Sidebar
        role={user!.role}
        activeView={activeView}
        onNavigate={v => setActiveView(v)}
        onLogout={handleLogout}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        userName={user!.name}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          title={viewTitles[activeView]}
          onEmergency={() => setShowEmergencyDemo(true)}
          onNavigate={v => setActiveView(v)}
        />
        <main className="flex-1 overflow-y-auto p-6">
          {renderView()}
        </main>
      </div>

      {bookingDoctor && (
        <BookingModal
          doctor={bookingDoctor}
          onClose={() => setBookingDoctor(null)}
          onConfirm={(_token) => {
            setBookingDoctor(null);
            setTimeout(() => setActiveView('qr-token'), 300);
          }}
        />
      )}

      {showEmergencyDemo && (
        <EmergencyDemoFlow
          symptom="Chest Pain"
          onClose={() => setShowEmergencyDemo(false)}
        />
      )}

      <Chatbot onEmergencyDemo={() => setShowEmergencyDemo(true)} />
    </div>
  );
}

// ── Root: wrap everything in AuthProvider ─────────────────
export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
