import { supabase } from '../lib/supabase';
import type { Patient, PlateDetail } from '../types';
import { getLocalData, setLocalData, INITIAL_PATIENTS } from './storageHelper';
import { itemService } from './itemService';

const STORAGE_KEY = 'pacientes';

export const formatPlatesSummary = (details: PlateDetail[]): string => {
  if (!details || details.length === 0) return 'Sin placas registradas';
  return details
    .map(p => `${p.cantidad} ${p.cantidad === 1 ? 'placa' : 'placas'} ${p.tipo.replace('x', '×')}`)
    .join(', ');
};

export const patientService = {
  async getAll(): Promise<Patient[]> {
    try {
      const { data, error } = await supabase
        .from('pacientes')
        .select('*')
        .order('codigo_paciente', { ascending: true });

      if (error || !data || data.length === 0) {
        return getLocalData<Patient[]>(STORAGE_KEY, INITIAL_PATIENTS);
      }
      setLocalData(STORAGE_KEY, data);
      return data;
    } catch {
      return getLocalData<Patient[]>(STORAGE_KEY, INITIAL_PATIENTS);
    }
  },

  async getNextCode(): Promise<string> {
    const list = await this.getAll();
    if (list.length === 0) return '001';
    const numbers = list
      .map(p => parseInt(p.codigo_paciente, 10))
      .filter(n => !isNaN(n));
    const max = numbers.length > 0 ? Math.max(...numbers) : 0;
    return String(max + 1).padStart(3, '0');
  },

  async create(patient: Omit<Patient, 'id'>): Promise<Patient> {
    const summary = patient.placas_utilizadas || 
      (patient.detalles_placas ? formatPlatesSummary(patient.detalles_placas) : '');

    const newPatient: Patient = {
      ...patient,
      id: crypto.randomUUID(),
      placas_utilizadas: summary,
      fecha_registro: new Date().toISOString()
    };

    // Deduct stock for each plate used
    if (patient.detalles_placas) {
      for (const plate of patient.detalles_placas) {
        await itemService.deductStock(plate.tipo, plate.cantidad);
      }
    }

    try {
      const { data, error } = await supabase
        .from('pacientes')
        .insert([{
          codigo_paciente: patient.codigo_paciente,
          nombre_paciente: patient.nombre_paciente,
          estudio: patient.estudio,
          medico: patient.medico,
          placas_utilizadas: summary,
          detalles_placas: patient.detalles_placas || [],
          observaciones: patient.observaciones || '',
          creado_por: patient.creado_por || ''
        }])
        .select()
        .single();

      if (!error && data) {
        const local = getLocalData<Patient[]>(STORAGE_KEY, INITIAL_PATIENTS);
        setLocalData(STORAGE_KEY, [...local, data]);
        return data;
      }
    } catch (e) {
      console.warn('Fallback local para paciente create', e);
    }

    const local = getLocalData<Patient[]>(STORAGE_KEY, INITIAL_PATIENTS);
    const updated = [...local, newPatient];
    setLocalData(STORAGE_KEY, updated);
    return newPatient;
  },

  async update(id: string, updates: Partial<Patient>): Promise<Patient | null> {
    if (updates.detalles_placas && !updates.placas_utilizadas) {
      updates.placas_utilizadas = formatPlatesSummary(updates.detalles_placas);
    }

    try {
      const { data, error } = await supabase
        .from('pacientes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        const local = getLocalData<Patient[]>(STORAGE_KEY, INITIAL_PATIENTS);
        const updated = local.map(p => p.id === id ? { ...p, ...data } : p);
        setLocalData(STORAGE_KEY, updated);
        return data;
      }
    } catch (e) {
      console.warn('Fallback local para paciente update', e);
    }

    const local = getLocalData<Patient[]>(STORAGE_KEY, INITIAL_PATIENTS);
    const updated = local.map(p => p.id === id ? { ...p, ...updates } : p);
    setLocalData(STORAGE_KEY, updated);
    return updated.find(p => p.id === id) || null;
  },

  async delete(id: string): Promise<boolean> {
    try {
      await supabase.from('pacientes').delete().eq('id', id);
    } catch (e) {
      console.warn('Fallback local para paciente delete', e);
    }

    const local = getLocalData<Patient[]>(STORAGE_KEY, INITIAL_PATIENTS);
    const updated = local.filter(p => p.id !== id);
    setLocalData(STORAGE_KEY, updated);
    return true;
  }
};
