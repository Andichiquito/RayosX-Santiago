import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './components/Login';
import { Navbar, type ActiveTab } from './components/Navbar';
import { PatientTable } from './components/PatientTable';
import { PatientModal } from './components/PatientModal';
import { ItemsManagement } from './components/ItemsManagement';
import { UserManagement } from './components/UserManagement';
import { ReportsView } from './components/ReportsView';
import type { Patient, Item, User } from './types';
import { patientService } from './services/patientService';
import { itemService } from './services/itemService';
import { userService } from './services/userService';
import { LogOut } from 'lucide-react';

const MainApplication: React.FC = () => {
  const { user, isAdmin, logout, isLoading: authLoading } = useAuth();
  
  // Navigation & Modals
  const [activeTab, setActiveTab] = useState<ActiveTab>('patients');
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [patientToEdit, setPatientToEdit] = useState<Patient | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [nextPatientCode, setNextPatientCode] = useState('001');

  // Application Data
  const [patients, setPatients] = useState<Patient[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  // Load all data
  const loadAllData = useCallback(async () => {
    setDataLoading(true);
    try {
      const [patientsData, itemsData, usersData, nextCode] = await Promise.all([
        patientService.getAll(),
        itemService.getAll(),
        userService.getAll(),
        patientService.getNextCode(),
      ]);

      setPatients(patientsData);
      setItems(itemsData);
      setUsers(usersData);
      setNextPatientCode(nextCode);
    } catch (err) {
      console.error('Error cargando datos:', err);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user, loadAllData]);

  // AFK Timer
  useEffect(() => {
    if (!user) return;

    let timeoutId: number;

    const resetTimer = () => {
      window.clearTimeout(timeoutId);
      const timeoutMs = isAdmin ? 2 * 60 * 1000 : 5 * 60 * 1000;
      timeoutId = window.setTimeout(() => {
        logout();
      }, timeoutMs);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(e => document.addEventListener(e, resetTimer, { passive: true }));

    resetTimer();

    return () => {
      window.clearTimeout(timeoutId);
      events.forEach(e => document.removeEventListener(e, resetTimer));
    };
  }, [user, isAdmin, logout]);

  // If user is encargado and tries to access admin tabs, reset to 'patients'
  useEffect(() => {
    if (!isAdmin && (activeTab === 'items' || activeTab === 'users' || activeTab === 'reports')) {
      setActiveTab('patients');
    }
  }, [isAdmin, activeTab]);

  // --- Patient Handlers ---
  const handleOpenNewPatient = async () => {
    const nextCode = await patientService.getNextCode();
    setNextPatientCode(nextCode);
    setPatientToEdit(null);
    setIsPatientModalOpen(true);
  };

  const handleEditPatient = (patient: Patient) => {
    setPatientToEdit(patient);
    setIsPatientModalOpen(true);
  };

  const handleSavePatient = async (patientData: Omit<Patient, 'id'>, id?: string) => {
    if (id) {
      await patientService.update(id, patientData);
    } else {
      await patientService.create(patientData);
    }
    await loadAllData();
  };

  const handleDeletePatient = async (id: string) => {
    await patientService.delete(id);
    await loadAllData();
  };

  // --- Item Handlers ---
  const handleCreateItem = async (itemData: Omit<Item, 'id'>) => {
    await itemService.create(itemData);
    await loadAllData();
  };

  const handleUpdateItem = async (id: string, updates: Partial<Item>) => {
    await itemService.update(id, updates);
    await loadAllData();
  };

  const handleDeleteItem = async (id: string) => {
    await itemService.delete(id);
    await loadAllData();
  };

  // --- User Handlers ---
  const handleCreateUser = async (userData: Omit<User, 'id'>) => {
    await userService.create(userData);
    await loadAllData();
  };

  const handleUpdateUser = async (id: string, updates: Partial<User>) => {
    await userService.update(id, updates);
    await loadAllData();
  };

  const handleDeleteUser = async (id: string) => {
    await userService.delete(id);
    await loadAllData();
  };

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    logout();
  };

  if (authLoading) {
    return (
      <div className="login-container">
        <div className="empty-state">
          <p className="font-semibold text-teal-800">Cargando sistema...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="app-layout">
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onRequestLogout={() => setShowLogoutConfirm(true)}
      />

      {/* Main View Area */}
      <main className="main-content">
        {activeTab === 'patients' && (
          <PatientTable
            patients={patients}
            onNewPatient={handleOpenNewPatient}
            onEditPatient={handleEditPatient}
            onDeletePatient={handleDeletePatient}
            onRefresh={loadAllData}
            isLoading={dataLoading}
          />
        )}

        {activeTab === 'items' && isAdmin && (
          <ItemsManagement
            items={items}
            onCreateItem={handleCreateItem}
            onUpdateItem={handleUpdateItem}
            onDeleteItem={handleDeleteItem}
            onRefresh={loadAllData}
            isLoading={dataLoading}
          />
        )}

        {activeTab === 'users' && isAdmin && (
          <UserManagement
            users={users}
            onCreateUser={handleCreateUser}
            onUpdateUser={handleUpdateUser}
            onDeleteUser={handleDeleteUser}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsView
            patients={patients}
            items={items}
          />
        )}
      </main>

      {/* Patient Register / Edit Modal */}
      <PatientModal
        isOpen={isPatientModalOpen}
        onClose={() => {
          setIsPatientModalOpen(false);
          setPatientToEdit(null);
        }}
        onSave={handleSavePatient}
        patientToEdit={patientToEdit}
        items={items}
        users={users}
        nextCode={nextPatientCode}
      />

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="modal-backdrop">
          <div className="modal-card modal-confirm animate-scale-in">
            <div className="modal-confirm-icon delete-icon">
              <LogOut size={26} color="#dc2626" />
            </div>
            <h3 className="modal-confirm-title">¿Cerrar Sesión?</h3>
            <p className="modal-confirm-text">
              ¿Estás seguro de que deseas salir del sistema? Tendrás que ingresar tus credenciales para volver a entrar.
            </p>
            <div className="modal-confirm-actions">
              <button 
                type="button" 
                className="btn-cancel"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancelar
              </button>
              <button 
                type="button" 
                className="btn-delete-confirm"
                onClick={handleConfirmLogout}
              >
                Sí, Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApplication />
    </AuthProvider>
  );
}
