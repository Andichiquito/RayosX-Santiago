import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://ivqnenvgimaseesralqm.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_DWwFNCtbkXv9TZudWgecpQ_CPlcpAKN';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.from('pacientes').select('id').limit(1);
    if (error && error.code === '42P01') {
      // Table doesn't exist yet in Supabase
      console.warn('Tabla pacientes no existe en Supabase todavía. Por favor ejecuta el script schema.sql.');
      return false;
    }
    return !error;
  } catch (err) {
    console.error('Error conectando a Supabase:', err);
    return false;
  }
};
