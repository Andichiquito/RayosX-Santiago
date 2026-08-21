import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, User as UserIcon, AlertCircle } from 'lucide-react';
import hospitalLogo from '../assets/Images/Logo1.webp';
import { sanitizeUsername, sanitizeNumericPin, isValidNumericPin } from '../utils/security';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleUsernameChange = (val: string) => {
    setUsername(sanitizeUsername(val));
    setError(null);
  };

  const handlePasswordChange = (val: string) => {
    setPassword(sanitizeNumericPin(val));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      setError('Por favor ingresa tu usuario y contraseña numérica');
      return;
    }

    if (!isValidNumericPin(cleanPass)) {
      setError('La contraseña debe tener entre 4 y 12 dígitos numéricos');
      return;
    }

    setError(null);
    setIsLoading(true);
    const result = await login(cleanUser, cleanPass);
    setIsLoading(false);

    if (!result.success) {
      setError(result.message || 'Credenciales incorrectas');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {/* Header with Hospital Logo */}
        <div className="login-header">
          <div className="login-logo-wrapper">
            <img
              src={hospitalLogo}
              alt="Santiago Centro de Diagnóstico & Importaciones"
              className="login-hospital-logo"
            />
          </div>
          <p className="login-subtitle">Sistema de control de pacientes</p>
        </div>

        {error && (
          <div className="alert-box error mb-4">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label" htmlFor="username">
              <UserIcon size={16} /> Nombre de Usuario
            </label>
            <input
              id="username"
              type="text"
              className="custom-input"
              placeholder="Ingresa tu usuario"
              value={username}
              onChange={(e) => handleUsernameChange(e.target.value)}
              autoFocus
              maxLength={30}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              <Lock size={16} /> Contraseña
            </label>
            <input
              id="password"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              className="custom-input font-mono"
              placeholder="••••••"
              value={password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              maxLength={12}
              required
            />

          </div>

          <button
            type="submit"
            className="btn-primary-teal w-full mt-2"
            disabled={isLoading}
            id="login-submit-btn"
          >
            {isLoading ? 'Iniciando sesión...' : 'Ingresar al Sistema'}
          </button>
        </form>
      </div>
    </div>
  );
};
