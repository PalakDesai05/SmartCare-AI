import {
  Heart, LayoutDashboard, Search, Clock, Activity,
  QrCode, Users, AlertTriangle, BarChart2, UserCog, LogOut,
  ChevronLeft, ChevronRight, Pill, UserPlus, Store, UserCircle,
} from 'lucide-react';
import type { Role, ActiveView } from '../../types';

interface SidebarProps {
  role:        Role;
  activeView:  ActiveView;
  onNavigate:  (view: ActiveView) => void;
  onLogout:    () => void | Promise<void>;
  collapsed:   boolean;
  onToggle:    () => void;
  userName:    string;
  userEmail?:  string;
}

const patientNav = [
  { id: 'overview'      as ActiveView, label: 'Overview',         icon: LayoutDashboard },
  { id: 'find-doctors'  as ActiveView, label: 'Find Doctors',     icon: Search          },
  { id: 'queue'         as ActiveView, label: 'My Queue',         icon: Clock           },
  { id: 'prescriptions' as ActiveView, label: 'Pharmacy / Meds',  icon: Pill            },
  { id: 'health'        as ActiveView, label: 'Health Metrics',   icon: Activity        },
  { id: 'qr-token'      as ActiveView, label: 'QR Token',         icon: QrCode          },
  { id: 'family'        as ActiveView, label: 'Family Members',   icon: UserPlus        },
];

const doctorNav = [
  { id: 'doctor-overview' as ActiveView, label: 'Overview',      icon: LayoutDashboard },
  { id: 'patient-queue'   as ActiveView, label: 'Patient Queue', icon: Users           },
  { id: 'emergency'       as ActiveView, label: 'Emergency',     icon: AlertTriangle   },
];

const adminNav = [
  { id: 'admin-overview'   as ActiveView, label: 'Overview',          icon: LayoutDashboard },
  { id: 'manage-doctors'   as ActiveView, label: 'Manage Doctors',    icon: UserCog         },
  { id: 'manage-pharmacy'  as ActiveView, label: 'Manage Pharmacy',   icon: Store           },
  { id: 'analytics'        as ActiveView, label: 'Analytics',         icon: BarChart2       },
];

const pharmacyNav = [
  { id: 'pharmacy-panel' as ActiveView, label: 'Pharmacy Board', icon: LayoutDashboard },
];

const navMap: Record<Role, typeof patientNav> = {
  patient:  patientNav,
  doctor:   doctorNav,
  admin:    adminNav,
  pharmacy: pharmacyNav,
};

const roleLabels: Record<Role, string> = {
  patient:  'Patient',
  doctor:   'Doctor',
  admin:    'Administrator',
  pharmacy: 'Pharmacy Staff',
};

const roleBadgeColors: Record<Role, string> = {
  patient:  'bg-teal-100 text-teal-700',
  doctor:   'bg-blue-100 text-blue-700',
  admin:    'bg-purple-100 text-purple-700',
  pharmacy: 'bg-green-100 text-green-700',
};

export default function Sidebar({
  role, activeView, onNavigate, onLogout,
  collapsed, onToggle, userName,
}: SidebarProps) {
  const navItems = navMap[role];
  const initials = userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <aside className={`${collapsed ? 'w-16' : 'w-60'} transition-all duration-300 bg-teal-50 border-r border-teal-200 flex flex-col h-full flex-shrink-0`}>

      {/* Logo row */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-teal-200">
        {!collapsed && (
          <div className="flex items-center gap-2.5 animate-fade-in">
            <div className="bg-teal-600 p-1.5 rounded-lg">
              <Heart className="w-5 h-5 text-white fill-white" />
            </div>
            <div>
              <span className="text-teal-900 font-bold text-base">SmartCare AI</span>
              <p className="text-teal-600 text-[10px] font-medium leading-none mt-0.5">{roleLabels[role]}</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="bg-teal-600 p-1.5 rounded-lg mx-auto">
            <Heart className="w-5 h-5 text-white fill-white" />
          </div>
        )}
        <button
          onClick={onToggle}
          className={`${collapsed ? 'absolute left-14 top-5 bg-white border border-teal-200 shadow-sm z-10' : ''} p-1.5 rounded-lg text-teal-600 hover:bg-teal-100 transition-colors`}
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Role badge (expanded only) */}
      {!collapsed && (
        <div className="px-4 pt-3">
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg ${roleBadgeColors[role]}`}>
            {roleLabels[role]}
          </span>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        {navItems.map(({ id, label, icon: Icon }) => {
          const active = activeView === id;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                active
                  ? 'bg-teal-600 text-white shadow-glow'
                  : 'text-teal-800 hover:bg-teal-100 hover:text-teal-900'
              }`}
              title={collapsed ? label : undefined}
            >
              <Icon
                className={`flex-shrink-0 ${active ? 'text-white' : 'text-teal-600 group-hover:text-teal-700'}`}
                style={{ width: '18px', height: '18px' }}
              />
              {!collapsed && <span className="text-sm font-medium truncate">{label}</span>}
              {!collapsed && active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-teal-200" />}
            </button>
          );
        })}
      </nav>

      {/* User info + Profile + Logout */}
      <div className="px-3 pb-4 border-t border-teal-200 pt-3 space-y-1">
        <button
          onClick={() => onNavigate('profile')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:bg-teal-100 ${
            activeView === 'profile' ? 'bg-teal-100' : ''
          } ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? 'My Profile' : undefined}
        >
          <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {initials}
          </div>
          {!collapsed && (
            <div className="overflow-hidden flex-1">
              <p className="text-teal-900 text-sm font-semibold truncate">{userName}</p>
              <p className="text-teal-600 text-xs capitalize">{roleLabels[role]}</p>
            </div>
          )}
          {!collapsed && <UserCircle className="w-4 h-4 text-teal-400 flex-shrink-0" />}
        </button>
        <button
          onClick={onLogout}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-500 hover:bg-red-50 transition-all duration-200 ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut style={{ width: '18px', height: '18px' }} className="flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Logout</span>}
        </button>
      </div>
    </aside>
  );
}
