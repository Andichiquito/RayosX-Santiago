export type UserRole = 'admin' | 'encargado';

export interface User {
  id: string;
  username: string;
  password_hash?: string;
  nombre_completo: string;
  rol: UserRole;
  activo: boolean;
  created_at?: string;
}

export interface PlateDetail {
  tipo: string; // ej: '20x10', '10x15'
  cantidad: number;
}

export interface Patient {
  id: string;
  codigo_paciente: string; // ej: '001', '002'
  nombre_paciente: string;
  estudio: string;
  medico: string; // Nombre del médico o encargado que atendió
  placas_utilizadas: string; // ej: '2 placas 20×10, 1 placa 10×15'
  detalles_placas?: PlateDetail[];
  observaciones?: string;
  fecha_registro?: string;
  creado_por?: string;
}

export type ItemType = 'placa' | 'otro';

export interface Item {
  id: string;
  codigo: string;
  tipo: ItemType; // 'placa' o 'otro'
  nombre: string;
  dimension?: string; // Solo aplica si tipo === 'placa' (ej: '20x10', '10x15')
  cantidad: number;  // Cantidad en existencia
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}
