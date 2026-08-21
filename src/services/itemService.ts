import { supabase } from '../lib/supabase';
import type { Item, ItemType } from '../types';
import { getLocalData, setLocalData, INITIAL_ITEMS } from './storageHelper';

const STORAGE_KEY = 'items';

export const itemService = {
  async getAll(): Promise<Item[]> {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('created_at', { ascending: true });

      if (error || !data || data.length === 0) {
        return getLocalData<Item[]>(STORAGE_KEY, INITIAL_ITEMS);
      }
      setLocalData(STORAGE_KEY, data);
      return data;
    } catch {
      return getLocalData<Item[]>(STORAGE_KEY, INITIAL_ITEMS);
    }
  },

  async getNextCode(tipo: ItemType = 'placa'): Promise<string> {
    const list = await this.getAll();
    const prefix = tipo === 'placa' ? 'PLC' : 'INS';
    
    // Filter items with this prefix and extract numbers
    const numbers = list
      .filter(i => (i.tipo || (i.dimension ? 'placa' : 'otro')) === tipo)
      .map(i => {
        const match = i.codigo ? i.codigo.match(/\d+/) : null;
        return match ? parseInt(match[0], 10) : 0;
      })
      .filter(n => !isNaN(n));

    const max = numbers.length > 0 ? Math.max(...numbers) : 0;
    return `${prefix}-${String(max + 1).padStart(3, '0')}`;
  },

  async create(item: Omit<Item, 'id'>): Promise<Item> {
    const itemTipo = item.tipo || 'placa';
    const finalCode = item.codigo?.trim() || (await this.getNextCode(itemTipo));
    const finalDimension = itemTipo === 'placa' ? (item.dimension?.trim() || null) : null;
    const finalCantidad = Number(item.cantidad) || 0;

    const newItem: Item = {
      ...item,
      id: crypto.randomUUID(),
      codigo: finalCode,
      tipo: itemTipo,
      nombre: item.nombre.trim(),
      dimension: finalDimension || undefined,
      cantidad: finalCantidad,
      activo: item.activo ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase
        .from('items')
        .insert([{
          codigo: finalCode,
          tipo: itemTipo,
          nombre: item.nombre.trim(),
          dimension: finalDimension,
          cantidad: finalCantidad,
          activo: item.activo ?? true
        }])
        .select()
        .single();

      if (error) {
        console.error('Error insertando en Supabase items:', error.message, error.details);
      } else if (data) {
        const local = getLocalData<Item[]>(STORAGE_KEY, INITIAL_ITEMS);
        const filtered = local.filter(i => i.id !== data.id && i.codigo !== data.codigo);
        setLocalData(STORAGE_KEY, [...filtered, data]);
        return data;
      }
    } catch (e) {
      console.warn('Fallback a almacenamiento local para item create:', e);
    }

    // Fallback local
    const local = getLocalData<Item[]>(STORAGE_KEY, INITIAL_ITEMS);
    const filtered = local.filter(i => i.id !== newItem.id && i.codigo !== newItem.codigo);
    const updated = [...filtered, newItem];
    setLocalData(STORAGE_KEY, updated);
    return newItem;
  },

  async update(id: string, updates: Partial<Item>): Promise<Item | null> {
    const cleanUpdates = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase
        .from('items')
        .update(cleanUpdates)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        const local = getLocalData<Item[]>(STORAGE_KEY, INITIAL_ITEMS);
        const updated = local.map(i => i.id === id ? { ...i, ...data } : i);
        setLocalData(STORAGE_KEY, updated);
        return data;
      }
    } catch (e) {
      console.warn('Fallback local para item update', e);
    }

    const local = getLocalData<Item[]>(STORAGE_KEY, INITIAL_ITEMS);
    const updated = local.map(i => i.id === id ? { ...i, ...cleanUpdates } : i);
    setLocalData(STORAGE_KEY, updated);
    return updated.find(i => i.id === id) || null;
  },

  async delete(id: string): Promise<boolean> {
    try {
      await supabase.from('items').delete().eq('id', id);
    } catch (e) {
      console.warn('Fallback local para item delete', e);
    }

    const local = getLocalData<Item[]>(STORAGE_KEY, INITIAL_ITEMS);
    const updated = local.filter(i => i.id !== id);
    setLocalData(STORAGE_KEY, updated);
    return true;
  },

  async deductStock(dimension: string, quantityToDeduct: number): Promise<void> {
    const items = await this.getAll();
    const cleanDim = dimension.trim().toLowerCase().replace('×', 'x');
    const target = items.find(i => 
      (i.tipo === 'placa' || i.dimension) &&
      (i.dimension?.trim().toLowerCase().replace('×', 'x') === cleanDim ||
       i.nombre.trim().toLowerCase().includes(cleanDim))
    );
    if (target) {
      const newCantidad = Math.max(0, target.cantidad - quantityToDeduct);
      await this.update(target.id, { cantidad: newCantidad });
    }
  }
};
