-- ==========================================================
-- SISTEMA DE RAYOS X HOSPITAL - ESQUEMA DE BASE DE DATOS
-- Solo roles 'admin' y 'encargado', contraseñas numéricas
-- ==========================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabla de Usuarios / Personal (Admin y Encargados)
CREATE TABLE IF NOT EXISTS public.usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    nombre_completo TEXT NOT NULL,
    rol TEXT NOT NULL CHECK (rol IN ('admin', 'encargado')),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabla de Items / Inventario General (Placas y Otros Insumos)
CREATE TABLE IF NOT EXISTS public.items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo TEXT UNIQUE NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'placa' CHECK (tipo IN ('placa', 'otro')),
    nombre TEXT NOT NULL,
    dimension TEXT, -- Medida de la placa (ej: '20x10', '10x15', '35x43'). Null para otros items
    cantidad INTEGER NOT NULL DEFAULT 0, -- Cantidad en existencia
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Asegurar columnas si la tabla ya existía previamente
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'placa';
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS dimension TEXT;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS cantidad INTEGER DEFAULT 0;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;

-- 3. Tabla de Pacientes y Registros de Estudios
CREATE TABLE IF NOT EXISTS public.pacientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_paciente TEXT NOT NULL,
    nombre_paciente TEXT NOT NULL,
    estudio TEXT NOT NULL,
    medico TEXT NOT NULL,
    placas_utilizadas TEXT NOT NULL,
    detalles_placas JSONB DEFAULT '[]'::jsonb,
    observaciones TEXT,
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    creado_por TEXT
);

-- 4. Seguridad de Nivel de Fila (RLS)
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir acceso usuarios" ON public.usuarios;
CREATE POLICY "Permitir acceso usuarios" ON public.usuarios
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir acceso items" ON public.items;
CREATE POLICY "Permitir acceso items" ON public.items
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir acceso pacientes" ON public.pacientes;
CREATE POLICY "Permitir acceso pacientes" ON public.pacientes
    FOR ALL USING (true) WITH CHECK (true);

-- 5. Cuentas Iniciales (Contraseñas numéricas por defecto: 1234)
INSERT INTO public.usuarios (username, password_hash, nombre_completo, rol)
VALUES 
    ('admin', '8014110', 'Administrador Principal', 'admin'),
    ('encargado', '1234', 'Encargado de Turno', 'encargado')
ON CONFLICT (username) DO UPDATE 
SET nombre_completo = EXCLUDED.nombre_completo, rol = EXCLUDED.rol;


