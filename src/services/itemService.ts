import { supabase } from '../lib/supabase';
import type { Item, ItemType } from '../types';
import { getLocalData, setLocalData, INITIAL_ITEMS } from './storageHelper';

const STORAGE_KEY = 'items';

/** Determine item tipo from its fields */
function inferTipo(item: { tipo?: string; dimension?: string | null }): ItemType {
  if (item.tipo === 'otro') return 'otro';
  if (item.tipo === 'placa') return 'placa';
  // If no tipo set, infer from dimension
  return item.dimension ? 'placa' : 'otro';
}

export const itemService = {
  async getAll(): Promise<Item[]> {
    // 1. Load local items (source of truth for tipo)
    const localRaw = getLocalData<Item[]>(STORAGE_KEY, INITIAL_ITEMS);
    const localMap = new Map<string, Item>();
    for (const item of localRaw) {
      const normalized: Item = { ...item, tipo: inferTipo(item), cantidad: Number(item.cantidad) || 0 };
      localMap.set(normalized.codigo, normalized);
    }

    // 2. Try fetch from Supabase
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        // Build final merged list: Supabase items + local-only items
        const finalMap = new Map<string, Item>();

        for (const raw of data) {
          const supaItem: Item = {
            ...raw,
            tipo: inferTipo(raw),
            cantidad: Number(raw.cantidad) || 0
          };
          // If we have a local version with a DIFFERENT tipo, trust local
          // (handles the case where Supabase defaulted to 'placa' for an 'otro' item)
          const localVersion = localMap.get(supaItem.codigo);
          if (localVersion && localVersion.tipo !== supaItem.tipo) {
            supaItem.tipo = localVersion.tipo;
          }
          finalMap.set(supaItem.codigo, supaItem);
        }

        // Add local-only items (not in Supabase)
        for (const [codigo, localItem] of localMap) {
          if (!finalMap.has(codigo)) {
            finalMap.set(codigo, localItem);
          }
        }

        const merged = Array.from(finalMap.values());
        setLocalData(STORAGE_KEY, merged);
        return merged;
      }
    } catch {
      // Supabase unavailable, use local
    }

    // 3. Fallback: return local only
    const localItems = Array.from(localMap.values());
    setLocalData(STORAGE_KEY, localItems);
    return localItems;
  },

  async getNextCode(tipo: ItemType = 'placa'): Promise<string> {
    const list = await this.getAll();
    const prefix = tipo === 'placa' ? 'PLC' : 'INS';

    const numbers = list
      .filter(i => inferTipo(i) === tipo)
      .map(i => {
        const match = i.codigo ? i.codigo.match(/\d+/) : null;
        return match ? parseInt(match[0], 10) : 0;
      })
      .filter(n => !isNaN(n));

    const max = numbers.length > 0 ? Math.max(...numbers) : 0;
    return `${prefix}-${String(max + 1).padStart(3, '0')}`;
  },

  async create(item: Omit<Item, 'id'>): Promise<Item> {
    const itemTipo = inferTipo(item);
    const finalCode = item.codigo?.trim() || (await this.getNextCode(itemTipo));
    const finalDimension = itemTipo === 'placa' ? (item.dimension?.trim() || null) : null;
    const finalCantidad = Number(item.cantidad) || 0;

    // Build the new item with a local UUID
    const newItem: Item = {
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

    // *** SAVE LOCALLY FIRST — this is what makes items immediately visible ***
    const local = getLocalData<Item[]>(STORAGE_KEY, INITIAL_ITEMS);
    const filtered = local.filter(i => i.codigo !== newItem.codigo);
    setLocalData(STORAGE_KEY, [...filtered, newItem]);

    // Try to persist in Supabase (best-effort, won't block UI)
    try {
      const payload: Record<string, any> = {
        codigo: finalCode,
        tipo: itemTipo,
        nombre: item.nombre.trim(),
        dimension: finalDimension,
        cantidad: finalCantidad,
        activo: item.activo ?? true
      };

      const { data, error } = await supabase
        .from('items')
        .insert([payload])
        .select()
        .single();

      if (!error && data) {
        // Supabase succeeded — update local with the real DB id but keep our tipo
        const savedItem: Item = { ...data, tipo: itemTipo };
        const curLocal = getLocalData<Item[]>(STORAGE_KEY, INITIAL_ITEMS);
        const updated = curLocal.map(i => i.codigo === savedItem.codigo ? { ...savedItem } : i);
        setLocalData(STORAGE_KEY, updated);
        return savedItem;
      }

      if (error) {
        console.warn('[itemService.create] Supabase insert error:', error.message);
        // Retry without tipo column (in case the column doesn't exist in DB)
        const fallbackPayload: Record<string, any> = {
          codigo: finalCode,
          nombre: item.nombre.trim(),
          dimension: finalDimension,
          cantidad: finalCantidad,
          activo: item.activo ?? true
        };
        const retryRes = await supabase.from('items').insert([fallbackPayload]).select().single();
        if (retryRes.data) {
          // Force correct tipo in local copy (DB defaulted to 'placa')
          const savedItem: Item = { ...retryRes.data, tipo: itemTipo };
          const curLocal = getLocalData<Item[]>(STORAGE_KEY, INITIAL_ITEMS);
          const updated = curLocal.map(i => i.codigo === savedItem.codigo ? { ...savedItem } : i);
          setLocalData(STORAGE_KEY, updated);
          return savedItem;
        }
      }
    } catch (e) {
      console.warn('[itemService.create] Exception saving to Supabase:', e);
    }

    // Supabase failed entirely — the item is already in localStorage
    return newItem;
  },

  async update(id: string, updates: Partial<Item>): Promise<Item | null> {
    const cleanUpdates = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    // Update local first
    const local = getLocalData<Item[]>(STORAGE_KEY, INITIAL_ITEMS);
    const updatedLocal = local.map(i => i.id === id ? { ...i, ...cleanUpdates } : i);
    setLocalData(STORAGE_KEY, updatedLocal);

    try {
      const { data, error } = await supabase
        .from('items')
        .update(cleanUpdates)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        // Sync local with DB response but preserve tipo
        const localItem = updatedLocal.find(i => i.id === id);
        const finalItem: Item = { ...data, tipo: localItem?.tipo || inferTipo(data) };
        const curLocal = getLocalData<Item[]>(STORAGE_KEY, INITIAL_ITEMS);
        const synced = curLocal.map(i => i.id === id ? finalItem : i);
        setLocalData(STORAGE_KEY, synced);
        return finalItem;
      }
    } catch (e) {
      console.warn('[itemService.update] Fallback local:', e);
    }

    return updatedLocal.find(i => i.id === id) || null;
  },

  async delete(id: string): Promise<boolean> {
    // Delete locally first
    const local = getLocalData<Item[]>(STORAGE_KEY, INITIAL_ITEMS);
    const updated = local.filter(i => i.id !== id);
    setLocalData(STORAGE_KEY, updated);

    try {
      await supabase.from('items').delete().eq('id', id);
    } catch (e) {
      console.warn('[itemService.delete] Fallback local:', e);
    }

    return true;
  },

  async deductStock(plateIdentifier: string, quantityToDeduct: number): Promise<void> {
    if (!plateIdentifier || quantityToDeduct <= 0) return;
    const items = await this.getAll();
    const cleanId = plateIdentifier.trim().toLowerCase().replace(/×/g, 'x');

    const target = items.find(i => {
      const itemDim = (i.dimension || '').trim().toLowerCase().replace(/×/g, 'x');
      const itemNombre = (i.nombre || '').trim().toLowerCase();
      const combined = `${itemNombre} - ${itemDim}`.toLowerCase();
      const itemCode = (i.codigo || '').trim().toLowerCase();

      // 1. Direct ID or Code match
      if (i.id === plateIdentifier || itemCode === cleanId) return true;

      // 2. Exact match with combined "Brand - Dimension" (e.g. "carestream - 20x25")
      if (combined === cleanId) return true;

      // 3. Both brand and dimension are present in the search string
      if (itemDim && itemNombre && cleanId.includes(itemNombre) && cleanId.includes(itemDim)) return true;

      // 4. Dimension matches exactly
      if (itemDim && itemDim === cleanId) return true;

      // 5. Brand matches exactly
      if (itemNombre && itemNombre === cleanId) return true;

      return false;
    });

    if (target) {
      const newCantidad = Math.max(0, target.cantidad - quantityToDeduct);
      await this.update(target.id, { cantidad: newCantidad });
    } else {
      console.warn(`[itemService] No se encontró item para descontar: "${plateIdentifier}"`);
    }
  }
};
