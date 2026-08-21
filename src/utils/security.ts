/**
 * Utilidades de Seguridad y Sanitización para el Sistema Hospitalario
 */

// Sanitizar cadenas de texto generales (eliminar etiquetas HTML, scripts y caracteres de control)
export const sanitizeText = (input: string, maxLength = 150): string => {
  if (!input) return '';
  return input
    .replace(/<[^>]*>?/gm, '') // Strip HTML tags
    .replace(/[<>{}\\]/g, '') // Strip script injection chars
    .trim()
    .slice(0, maxLength);
};

// Sanitizar campo Estudio: texto libre sin números (no 0-9), permitiendo espacios, letras, tildes, signos ortográficos y símbolos médicos
export const sanitizeStudyText = (input: string, maxLength = 100): string => {
  if (!input) return '';
  return input
    .replace(/[0-9]/g, '') // Elimina números
    .replace(/<[^>]*>?/gm, '') // Elimina tags HTML
    .replace(/[<>{}\\]/g, '') // Elimina caracteres de inyección de scripts
    .slice(0, maxLength); // No hace .trim() para permitir escribir espacios
};

// Sanitizar nombres de personas (únicamente letras, tildes, espacios, puntos y guiones)
export const sanitizePersonName = (input: string, maxLength = 100): string => {
  if (!input) return '';
  return input
    .replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s\.\-]/g, '')
    .slice(0, maxLength);
};

// Sanitizar nombres de usuario (solo minúsculas, números, guión bajo y punto)
export const sanitizeUsername = (input: string, maxLength = 30): string => {
  if (!input) return '';
  return input
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, '')
    .slice(0, maxLength);
};

// Sanitizar contraseña numérica (estrictamente dígitos)
export const sanitizeNumericPin = (input: string, maxLength = 12): string => {
  if (!input) return '';
  return input
    .replace(/\D/g, '')
    .slice(0, maxLength);
};

// Validar formato de contraseña numérica segura (entre 4 y 12 dígitos)
export const isValidNumericPin = (pin: string): boolean => {
  return /^\d{4,12}$/.test(pin);
};

// Sanitizar dimensiones/tamaños (ej: 20x10, 10x15)
export const sanitizeDimension = (input: string, maxLength = 25): string => {
  if (!input) return '';
  return input
    .replace(/[^0-9xX×\s\.\-]/g, '')
    .trim()
    .slice(0, maxLength);
};
