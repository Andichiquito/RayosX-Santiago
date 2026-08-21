import type { Patient, Item, User } from '../types';

export const INITIAL_USERS: User[] = [
  {
    id: '1',
    username: 'admin',
    password_hash: '8014110',
    nombre_completo: 'Administrador Principal',
    rol: 'admin',
    activo: true,
  },
  {
    id: '2',
    username: 'encargado',
    password_hash: '1234',
    nombre_completo: 'Encargado de Turno',
    rol: 'encargado',
    activo: true,
  }
];

export const INITIAL_ITEMS: Item[] = [];
export const INITIAL_PATIENTS: Patient[] = [];

export const getLocalData = <T>(key: string, defaultData: T): T => {
  try {
    const raw = localStorage.getItem(`rayos_${key}`);
    if (raw) return JSON.parse(raw);
    localStorage.setItem(`rayos_${key}`, JSON.stringify(defaultData));
    return defaultData;
  } catch {
    return defaultData;
  }
};

export const setLocalData = <T>(key: string, data: T): void => {
  try {
    localStorage.setItem(`rayos_${key}`, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving to localStorage', e);
  }
};
