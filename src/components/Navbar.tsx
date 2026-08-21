import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  Layers,
  UserPlus,
  LogOut,
  ShieldCheck,
  BarChart3
} from 'lucide-react';
import hospitalLogo from '../assets/Images/Logo1.webp';

export type ActiveTab = 'patients' | 'items' | 'users' | 'reports';

interface NavbarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onRequestLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  onRequestLogout,
}) => {
  const { user, isAdmin } = useAuth();

  return (
    <header className="navbar-container">
      <div className="navbar-inner">
        {/* Brand / Logo (Top Left Corner with Logo1.webp) */}
        <div className="navbar-brand" onClick={() => onSelectTab('patients')}>
          <img
            src={hospitalLogo}
            alt="Santiago Centro de Diagnóstico"
            className="navbar-logo-img"
          />
        </div>

        {/* Navigation Tabs */}
        <nav className="navbar-nav">
          <button
            type="button"
            className={`nav-tab-btn ${activeTab === 'patients' ? 'active' : ''}`}
            onClick={() => onSelectTab('patients')}
          >
            <Users size={18} />
            <span>Pacientes</span>
          </button>

          {/* Admin Tabs */}
          {isAdmin && (
            <>
              <button
                type="button"
                className={`nav-tab-btn ${activeTab === 'items' ? 'active' : ''}`}
                onClick={() => onSelectTab('items')}
              >
                <Layers size={18} />
                <span>Inventario</span>
              </button>

              <button
                type="button"
                className={`nav-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
                onClick={() => onSelectTab('users')}
              >
                <UserPlus size={18} />
                <span>Personal</span>
              </button>
            </>
          )}

          {/* Reports Tab - ONLY FOR ADMIN */}
          {isAdmin && (
            <button
              type="button"
              className={`nav-tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
              onClick={() => onSelectTab('reports')}
            >
              <BarChart3 size={18} />
              <span>Reporte de Placas</span>
            </button>
          )}
        </nav>

        {/* Right side controls */}
        <div className="navbar-actions">
          <div className="flex items-center gap-2">
            {isAdmin && (
              <div className="role-pill role-admin">
                <ShieldCheck size={14} />
                <span>ADMIN</span>
              </div>
            )}
            <span className="font-semibold text-gray-800 text-sm mr-2">{user?.nombre_completo || user?.username}</span>
            <button
              type="button"
              className="btn-logout"
              onClick={onRequestLogout}
              title="Cerrar Sesión"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
