import React, { useState, useEffect } from 'react';
import type { Patient, Item, User, PlateDetail } from '../types';
import { useAuth } from '../context/AuthContext';
import { X, Plus, Trash2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { sanitizePersonName, sanitizeText, sanitizeDimension } from '../utils/security';

interface PatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (patientData: Omit<Patient, 'id'>, id?: string) => Promise<void>;
  patientToEdit?: Patient | null;
  items: Item[];
  users?: User[];
  nextCode: string;
}

export interface FormattedPlateOption {
  value: string;
  dimension: string;
  marca: string;
  label: string;
}

export const PatientModal: React.FC<PatientModalProps> = ({
  isOpen,
  onClose,
  onSave,
  patientToEdit,
  items,
  users = [],
  nextCode,
}) => {
  const { user } = useAuth();

  const [nombrePaciente, setNombrePaciente] = useState('');
  const [estudio, setEstudio] = useState('');
  const [medico, setMedico] = useState('');
  const [codigoPaciente, setCodigoPaciente] = useState('');
  
  // Available plates formatted as "Marca - Medida" and sorted cleanly
  const plateOptions: FormattedPlateOption[] = items
    .filter(i => (i.tipo || (i.dimension ? 'placa' : 'otro')) === 'placa' && i.dimension)
    .map(i => ({
      value: `${i.nombre} - ${i.dimension!}`,
      dimension: i.dimension!,
      marca: i.nombre,
      label: `${i.nombre} - ${i.dimension!.replace('x', '×')}`
    }))
    .sort((a, b) => a.marca.localeCompare(b.marca) || a.dimension.localeCompare(b.dimension));

  // Active habilitated staff
  const activeStaff = users.filter(u => u.activo !== false);

  const [plates, setPlates] = useState<PlateDetail[]>([
    { tipo: plateOptions[0]?.value || '', cantidad: 1 }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (patientToEdit) {
      setNombrePaciente(patientToEdit.nombre_paciente || '');
      setEstudio(patientToEdit.estudio || '');
      setMedico(patientToEdit.medico || '');
      setCodigoPaciente(patientToEdit.codigo_paciente || '');
      if (patientToEdit.detalles_placas && patientToEdit.detalles_placas.length > 0) {
        setPlates(patientToEdit.detalles_placas);
      } else {
        setPlates([{ tipo: plateOptions[0]?.value || '', cantidad: 1 }]);
      }
    } else {
      setNombrePaciente('');
      setEstudio('');
      const defaultDoctor = user?.nombre_completo || activeStaff[0]?.nombre_completo || '';
      setMedico(defaultDoctor);
      setCodigoPaciente(nextCode);
      setPlates([
        { tipo: plateOptions[0]?.value || '', cantidad: 1 }
      ]);
    }
    setError(null);
  }, [patientToEdit, isOpen, nextCode, user, plateOptions.length, activeStaff.length]);

  if (!isOpen) return null;

  const handleNombrePacienteChange = (val: string) => {
    setNombrePaciente(sanitizePersonName(val, 100));
    setError(null);
  };

  const handleEstudioChange = (val: string) => {
    setEstudio(sanitizeText(val, 100));
    setError(null);
  };

  const handlePlateChange = (index: number, field: keyof PlateDetail, value: any) => {
    const updated = [...plates];
    updated[index] = {
      ...updated[index],
      [field]: field === 'cantidad' ? Math.max(1, Math.min(999, parseInt(value, 10) || 1)) : value
    };
    setPlates(updated);
  };

  const handleAddPlateRow = () => {
    const nextOption = plateOptions.find(opt => !plates.some(p => p.tipo === opt.value)) || plateOptions[0];
    setPlates([...plates, { tipo: nextOption?.value || '', cantidad: 1 }]);
  };

  const handleRemovePlateRow = (index: number) => {
    if (plates.length > 1) {
      setPlates(plates.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNombre = sanitizePersonName(nombrePaciente.trim(), 100);
    const cleanEstudio = sanitizeText(estudio.trim(), 100);
    const cleanMedico = sanitizePersonName(medico.trim(), 100);

    if (!cleanNombre) {
      setError('Por favor ingresa el nombre del paciente (solo letras)');
      return;
    }
    if (!cleanEstudio) {
      setError('Por favor ingresa el estudio realizado');
      return;
    }
    if (!cleanMedico) {
      setError('Por favor selecciona el médico o encargado');
      return;
    }

    for (const plate of plates) {
      if (!plate.tipo.trim()) {
        setError('Por favor define la placa utilizada');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const detailedPlates = plates.map(p => {
        const matched = plateOptions.find(opt => opt.value === p.tipo || opt.dimension === p.tipo);
        return {
          ...p,
          tipo: matched ? `${matched.marca} - ${matched.dimension}` : sanitizeDimension(p.tipo, 30)
        };
      });

      await onSave({
        codigo_paciente: codigoPaciente || nextCode,
        nombre_paciente: cleanNombre,
        estudio: cleanEstudio,
        medico: cleanMedico,
        detalles_placas: detailedPlates,
        placas_utilizadas: '',
        creado_por: user?.nombre_completo || user?.username,
      }, patientToEdit?.id);

      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.7 }
        });
      } catch {}

      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el paciente');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card modal-patient-dialog animate-scale-in">
        <button 
          type="button" 
          className="modal-close-btn" 
          onClick={onClose}
          aria-label="Cerrar"
        >
          <X size={20} />
        </button>

        <div className="modal-header-section">
          <h2 className="modal-title-teal">
            {patientToEdit ? 'Editar Paciente' : 'Registro de Paciente'}
          </h2>
          <p className="modal-desc-gray">
            Completa los datos del paciente y selecciona las placas utilizadas.
          </p>
        </div>

        {error && (
          <div className="alert-box error mb-4">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="patient-form-layout">
          {/* Patient Name with validation */}
          <div className="form-group">
            <label className="form-label" htmlFor="patient-name">
              Nombre del Paciente *
            </label>
            <input
              id="patient-name"
              type="text"
              className="custom-input"
              placeholder="Nombre del paciente"
              value={nombrePaciente}
              onChange={(e) => handleNombrePacienteChange(e.target.value)}
              maxLength={100}
              required
              autoFocus
            />
          </div>

          {/* Study */}
          <div className="form-group">
            <label className="form-label" htmlFor="patient-study">
              Estudio *
            </label>
            <input
              id="patient-study"
              type="text"
              className="custom-input"
              placeholder="Estudio realizado"
              value={estudio}
              onChange={(e) => handleEstudioChange(e.target.value)}
              maxLength={100}
              required
            />
          </div>

          {/* Doctor / Encargado */}
          <div className="form-group">
            <label className="form-label" htmlFor="patient-doctor">
              Médico / Encargado *
            </label>
            {activeStaff.length > 0 ? (
              <div className="select-wrapper">
                <select
                  id="patient-doctor"
                  className="custom-input custom-select"
                  value={medico}
                  onChange={(e) => setMedico(e.target.value)}
                  required
                >
                  {activeStaff.map((staff) => (
                    <option key={staff.id} value={staff.nombre_completo}>
                      {staff.nombre_completo}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <input
                id="patient-doctor"
                type="text"
                className="custom-input"
                placeholder="Médico o encargado"
                value={medico}
                onChange={(e) => setMedico(sanitizePersonName(e.target.value, 100))}
                required
              />
            )}
          </div>

          {/* Plates Section */}
          <div className="plates-form-section">
            <div className="plates-section-header">
              <label className="form-label font-bold text-gray-800">Placas Utilizadas</label>
              <button
                type="button"
                className="btn-add-plate-type"
                onClick={handleAddPlateRow}
              >
                <Plus size={14} />
                <span>+ Agregar otra placa</span>
              </button>
            </div>

            {plates.map((plate, index) => {
              const currentVal = plate.tipo;

              return (
                <div key={index} className="plate-row-grid">
                  {/* Tipo de Placa: Displays Marca - Medida */}
                  <div className="form-group mb-0">
                    <label className="sub-label">Placa (Marca - Medida)</label>
                    {plateOptions.length > 0 ? (
                      <div className="select-wrapper">
                        <select
                          className="custom-input custom-select"
                          value={currentVal}
                          onChange={(e) => handlePlateChange(index, 'tipo', e.target.value)}
                          required
                        >
                          {plateOptions.map((opt) => (
                            <option key={`${opt.marca}-${opt.dimension}`} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <input
                        type="text"
                        className="custom-input"
                        placeholder="Marca - Medida"
                        value={plate.tipo}
                        onChange={(e) => handlePlateChange(index, 'tipo', sanitizeDimension(e.target.value, 30))}
                        required
                      />
                    )}
                  </div>

                  {/* Cantidad de Placas */}
                  <div className="form-group mb-0">
                    <label className="sub-label">Cantidad</label>
                    <div className="quantity-input-wrapper">
                      <input
                        type="number"
                        min="1"
                        max="999"
                        className="custom-input"
                        value={plate.cantidad}
                        onChange={(e) => handlePlateChange(index, 'cantidad', e.target.value)}
                        required
                      />
                      {plates.length > 1 && (
                        <button
                          type="button"
                          className="btn-remove-plate-row"
                          onClick={() => handleRemovePlateRow(index)}
                          title="Quitar"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn-registrar-paciente"
            disabled={isSubmitting}
            id="btn-submit-paciente"
          >
            {isSubmitting
              ? 'Guardando...'
              : patientToEdit
              ? 'Guardar Cambios'
              : 'Registrar Paciente'}
          </button>
        </form>
      </div>
    </div>
  );
};
