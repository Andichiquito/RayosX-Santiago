import React, { useState } from 'react';
import type { User, UserRole } from '../types';
import { 
  UserPlus, 
  Trash2, 
  Lock, 
  User as UserIcon, 
  X, 
  KeyRound, 
  Pencil, 
  UserCog
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { sanitizePersonName, sanitizeUsername, sanitizeNumericPin, isValidNumericPin } from '../utils/security';

interface UserManagementProps {
  users: User[];
  onCreateUser: (userData: Omit<User, 'id'>) => Promise<void>;
  onUpdateUser: (id: string, updates: Partial<User>) => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
}

export const UserManagement: React.FC<UserManagementProps> = ({
  users,
  onCreateUser,
  onUpdateUser,
  onDeleteUser,
}) => {
  const { user: currentUser } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form fields
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState<UserRole>('encargado');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const openCreateModal = () => {
    setEditingUser(null);
    setNombreCompleto('');
    setUsername('');
    setPassword('');
    setRol('encargado');
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (u: User) => {
    setEditingUser(u);
    setNombreCompleto(u.nombre_completo);
    setUsername(u.username);
    setPassword('');
    setRol(u.rol as UserRole);
    setError(null);
    setIsModalOpen(true);
  };

  const handleNombreChange = (val: string) => {
    setNombreCompleto(sanitizePersonName(val, 100));
    setError(null);
  };

  const handleUsernameChange = (val: string) => {
    setUsername(sanitizeUsername(val, 30));
    setError(null);
  };

  const handlePasswordChange = (val: string) => {
    setPassword(sanitizeNumericPin(val, 12));
    setError(null);
  };

  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNombre = sanitizePersonName(nombreCompleto.trim(), 100);
    const cleanUser = sanitizeUsername(username.trim(), 30);
    const cleanPass = sanitizeNumericPin(password.trim(), 12);

    if (!cleanNombre || !cleanUser) {
      setError('Por favor completa todos los campos requeridos');
      return;
    }

    if (!editingUser && !cleanPass) {
      setError('Por favor ingresa una contraseña numérica');
      return;
    }

    if (cleanPass && !isValidNumericPin(cleanPass)) {
      setError('La contraseña numérica debe tener entre 4 y 12 dígitos');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      if (editingUser) {
        const updates: Partial<User> = {
          nombre_completo: cleanNombre,
          username: cleanUser,
          rol,
        };
        if (cleanPass) {
          updates.password_hash = cleanPass;
        }
        await onUpdateUser(editingUser.id, updates);
      } else {
        await onCreateUser({
          nombre_completo: cleanNombre,
          username: cleanUser,
          password_hash: cleanPass,
          rol,
          activo: true,
        });
      }

      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Error al procesar usuario');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickRoleChange = async (userId: string, newRole: UserRole) => {
    await onUpdateUser(userId, { rol: newRole });
  };

  const handleToggleActive = async (user: User) => {
    if (user.id === currentUser?.id) return;
    await onUpdateUser(user.id, { activo: !user.activo });
  };

  const confirmDelete = async () => {
    if (userToDelete) {
      await onDeleteUser(userToDelete.id);
      setUserToDelete(null);
    }
  };

  return (
    <div className="table-view-wrapper">
      {/* Top Header */}
      <div className="table-top-bar">
        <div className="table-title-area">
          <h1 className="page-main-heading">Gestión de Personal & Roles</h1>
          <p className="page-sub-heading">Administra las cuentas de <strong>Encargados</strong> y <strong>Administradores</strong></p>
        </div>

        <div className="table-top-actions">
          <button
            type="button"
            className="btn-nuevo-paciente"
            onClick={openCreateModal}
          >
            <UserPlus size={18} />
            <span>Nuevo Encargado / Admin +</span>
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="patient-table-container">
        <table className="custom-medical-table">
          <thead>
            <tr>
              <th>Nombre Completo</th>
              <th style={{ width: '180px' }}>Usuario</th>
              <th style={{ width: '200px' }}>Rol Asignado</th>
              <th style={{ width: '130px' }}>Estado</th>
              <th style={{ width: '120px' }} className="text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isMe = u.id === currentUser?.id;
              const isAdminRole = u.rol === 'admin';

              return (
                <tr key={u.id} className="patient-row">
                  <td>
                    <div className="font-semibold text-gray-900 flex items-center gap-2">
                      <span>{u.nombre_completo}</span>
                      {isMe && <span className="text-xs text-blue-700 font-normal bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">(Tu cuenta)</span>}
                    </div>
                  </td>
                  <td className="font-mono text-sm font-semibold text-blue-900">
                    @{u.username}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <select
                        className={`custom-select-filter text-xs font-semibold py-1 px-2 rounded-md border ${
                          isAdminRole 
                            ? 'bg-amber-50 text-amber-800 border-amber-300' 
                            : 'bg-blue-50 text-blue-800 border-blue-200'
                        }`}
                        value={u.rol}
                        onChange={(e) => handleQuickRoleChange(u.id, e.target.value as UserRole)}
                        disabled={isMe}
                      >
                        <option value="admin">Administrador</option>
                        <option value="encargado">Encargado</option>
                      </select>
                    </div>
                  </td>
                  <td>
                    <button
                      type="button"
                      className={`status-toggle-btn ${u.activo ? 'active' : 'inactive'}`}
                      onClick={() => handleToggleActive(u)}
                      disabled={isMe}
                    >
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td>
                    <div className="action-buttons-group center">
                      <button
                        type="button"
                        className="action-btn-edit"
                        title="Editar Datos y Rol"
                        onClick={() => openEditModal(u)}
                      >
                        <Pencil size={17} />
                      </button>

                      {!isMe && (
                        <button
                          type="button"
                          className="action-btn-delete"
                          title="Eliminar Cuenta"
                          onClick={() => setUserToDelete(u)}
                        >
                          <Trash2 size={17} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal for Creating or Editing Staff/User */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card modal-patient-dialog animate-scale-in">
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => setIsModalOpen(false)}
            >
              <X size={20} />
            </button>

            <div className="modal-header-section">
              <h2 className="modal-title-teal">
                {editingUser ? 'Modificar Cuenta' : 'Crear Nueva Cuenta'}
              </h2>
              <p className="modal-desc-gray">
                Asigna las credenciales con <strong>contraseña numérica confidencial</strong>.
              </p>
            </div>

            {error && (
              <div className="alert-box error mb-4">
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSaveSubmit} className="patient-form-layout">
              <div className="form-group">
                <label className="form-label">
                  <UserIcon size={16} /> Nombre Completo *
                </label>
                <input
                  type="text"
                  className="custom-input"
                  placeholder="Nombre completo"
                  value={nombreCompleto}
                  onChange={(e) => handleNombreChange(e.target.value)}
                  maxLength={100}
                  required
                  autoFocus
                />
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">
                    <KeyRound size={16} /> Nombre de Usuario *
                  </label>
                  <input
                    type="text"
                    className="custom-input"
                    placeholder="usuario"
                    value={username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    maxLength={30}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <Lock size={16} /> {editingUser ? 'Nueva Contraseña (Opcional)' : 'Contraseña Numérica *'}
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="custom-input font-mono"
                    placeholder={editingUser ? 'Dejar en blanco para no cambiar' : '••••••'}
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    maxLength={12}
                    required={!editingUser}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <UserCog size={16} /> Rol en el Sistema *
                </label>
                <select
                  className="custom-input custom-select"
                  value={rol}
                  onChange={(e) => setRol(e.target.value as UserRole)}
                >
                  <option value="encargado">Encargado (Registro y atención de pacientes)</option>
                  <option value="admin">Administrador (Control total, inventario y usuarios)</option>
                </select>
              </div>

              <button
                type="submit"
                className="btn-registrar-paciente"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? 'Guardando...'
                  : editingUser
                  ? 'Actualizar Cuenta'
                  : 'Crear Cuenta & Guardar'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirm */}
      {userToDelete && (
        <div className="modal-backdrop">
          <div className="modal-card modal-confirm">
            <div className="modal-confirm-icon delete-icon">
              <Trash2 size={28} color="#dc2626" />
            </div>
            <h3 className="modal-confirm-title">¿Eliminar cuenta de usuario?</h3>
            <p className="modal-confirm-text">
              ¿Estás seguro de eliminar a <strong>{userToDelete.nombre_completo}</strong> (@{userToDelete.username}, rol: {userToDelete.rol})?
            </p>
            <div className="modal-confirm-actions">
              <button 
                type="button" 
                className="btn-cancel"
                onClick={() => setUserToDelete(null)}
              >
                Cancelar
              </button>
              <button 
                type="button" 
                className="btn-delete-confirm"
                onClick={confirmDelete}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
