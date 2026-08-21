import { supabase } from '../lib/supabase';
import type { User } from '../types';
import { getLocalData, setLocalData, INITIAL_USERS } from './storageHelper';

const STORAGE_KEY = 'usuarios';

export const userService = {
  async getAll(): Promise<User[]> {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .order('created_at', { ascending: true });

      if (error || !data || data.length === 0) {
        return getLocalData<User[]>(STORAGE_KEY, INITIAL_USERS);
      }
      setLocalData(STORAGE_KEY, data);
      return data;
    } catch {
      return getLocalData<User[]>(STORAGE_KEY, INITIAL_USERS);
    }
  },

  async create(user: Omit<User, 'id'>): Promise<User> {
    const newUser: User = {
      ...user,
      id: crypto.randomUUID(),
      activo: user.activo ?? true,
      created_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase
        .from('usuarios')
        .insert([{
          username: user.username,
          password_hash: user.password_hash,
          nombre_completo: user.nombre_completo,
          rol: user.rol,
          activo: user.activo ?? true
        }])
        .select()
        .single();

      if (!error && data) {
        const local = getLocalData<User[]>(STORAGE_KEY, INITIAL_USERS);
        setLocalData(STORAGE_KEY, [...local, data]);
        return data;
      }
    } catch (e) {
      console.warn('Fallback a almacenamiento local para usuario:', e);
    }

    const local = getLocalData<User[]>(STORAGE_KEY, INITIAL_USERS);
    const updated = [...local, newUser];
    setLocalData(STORAGE_KEY, updated);
    return newUser;
  },

  async update(id: string, updates: Partial<User>): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        const local = getLocalData<User[]>(STORAGE_KEY, INITIAL_USERS);
        const updated = local.map(u => u.id === id ? { ...u, ...data } : u);
        setLocalData(STORAGE_KEY, updated);
        return data;
      }
    } catch (e) {
      console.warn('Fallback local para update usuario', e);
    }

    const local = getLocalData<User[]>(STORAGE_KEY, INITIAL_USERS);
    const updated = local.map(u => u.id === id ? { ...u, ...updates } : u);
    setLocalData(STORAGE_KEY, updated);
    return updated.find(u => u.id === id) || null;
  },

  async delete(id: string): Promise<boolean> {
    try {
      await supabase.from('usuarios').delete().eq('id', id);
    } catch (e) {
      console.warn('Fallback local para delete usuario', e);
    }

    const local = getLocalData<User[]>(STORAGE_KEY, INITIAL_USERS);
    const updated = local.filter(u => u.id !== id);
    setLocalData(STORAGE_KEY, updated);
    return true;
  },

  async authenticate(username: string, password: string): Promise<User | null> {
    const users = await this.getAll();
    const cleanUser = username.trim().toLowerCase();
    
    const found = users.find(u => 
      u.username.toLowerCase() === cleanUser && 
      u.password_hash === password &&
      u.activo !== false
    );
    return found || null;
  }
};

