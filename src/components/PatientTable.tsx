import React, { useState, useMemo } from 'react';
import type { Patient } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  Pencil,
  X,
  Filter,
  Trash2
} from 'lucide-react';

interface PatientTableProps {
  patients: Patient[];
  onNewPatient: () => void;
  onEditPatient: (patient: Patient) => void;
  onDeletePatient: (id: string) => Promise<void>;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export const PatientTable: React.FC<PatientTableProps> = ({
  patients,
  onNewPatient,
  onEditPatient,
  onDeletePatient,
}) => {
  const { isAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('ALL');
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);

  // Extract unique doctors for filtering
  const uniqueDoctors = useMemo(() => {
    const doctors = new Set<string>();
    patients.forEach(p => {
      if (p.medico) doctors.add(p.medico);
    });
    return Array.from(doctors);
  }, [patients]);

  // Filtered patients
  const filteredPatients = useMemo(() => {
    return patients.filter(p => {
      const matchSearch =
        p.nombre_paciente.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.codigo_paciente.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.estudio.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.medico.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.placas_utilizadas.toLowerCase().includes(searchTerm.toLowerCase());

      const matchDoc = selectedDoctor === 'ALL' || p.medico === selectedDoctor;
      return matchSearch && matchDoc;
    });
  }, [patients, searchTerm, selectedDoctor]);

  const confirmDelete = async () => {
    if (patientToDelete) {
      await onDeletePatient(patientToDelete.id);
      setPatientToDelete(null);
    }
  };

  return (
    <div className="table-view-wrapper">
      {/* Top Header */}
      <div className="table-top-bar">
        <div className="table-title-area">
          <h1 className="page-main-heading">Registro de Pacientes</h1>
          <p className="page-sub-heading">Control diario de estudios radiológicos y atención médica</p>
        </div>

        <div className="table-top-actions">
          <button
            type="button"
            className="btn-nuevo-paciente"
            onClick={onNewPatient}
            id="btn-nuevo-paciente"
          >
            <span>+ Nuevo Paciente</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filters-card">
        <div className="search-input-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="filter-search-input"
            placeholder="Buscar por paciente, ID, estudio o médico..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="clear-search-btn" onClick={() => setSearchTerm('')}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className="filter-select-box">
          <Filter size={16} className="filter-icon" />
          <select
            className="custom-select-filter"
            value={selectedDoctor}
            onChange={(e) => setSelectedDoctor(e.target.value)}
          >
            <option value="ALL">Todos los Médicos ({uniqueDoctors.length})</option>
            {uniqueDoctors.map(doc => (
              <option key={doc} value={doc}>{doc}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="patient-table-container">
        <table className="custom-medical-table">
          <thead>
            <tr>
              <th className="col-id">ID</th>
              <th style={{ width: '140px' }}>Fecha y Hora</th>
              <th className="col-paciente">Nombre del Paciente</th>
              <th className="col-estudio">Estudio</th>
              <th className="col-medico">Encargado</th>
              <th className="col-placas">Items utilizados</th>
              {isAdmin && <th className="col-acciones">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {filteredPatients.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 7 : 6} className="empty-table-cell">
                  <div className="empty-state">
                    <p>No se encontraron registros de pacientes.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredPatients.map((patient) => {
                const fechaStr = patient.fecha_registro
                  ? new Date(patient.fecha_registro).toLocaleString('es-ES', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })
                  : '—';
                return (
                  <tr key={patient.id} className="patient-row">
                    <td className="cell-id font-medium">{patient.codigo_paciente}</td>
                    <td className="text-xs text-gray-500 font-mono whitespace-nowrap">{fechaStr}</td>
                    <td className="cell-paciente font-semibold">{patient.nombre_paciente}</td>
                    <td className="cell-estudio">{patient.estudio}</td>
                    <td className="cell-medico">{patient.medico}</td>
                    <td className="cell-placas">{patient.placas_utilizadas}</td>
                    {isAdmin && (
                      <td className="cell-acciones">
                        <div className="action-buttons-group">
                          {/* Edit button only for admin */}
                          <button
                            type="button"
                            className="action-btn-edit"
                            title="Editar Paciente"
                            onClick={() => onEditPatient(patient)}
                          >
                            <Pencil size={18} />
                          </button>

                          {/* Delete button only for admin */}
                          <button
                            type="button"
                            className="action-btn-delete"
                            title="Eliminar Registro"
                            onClick={() => setPatientToDelete(patient)}
                          >
                            <X size={20} strokeWidth={2.5} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer Counter */}
      <div className="table-footer-info">
        <span>Mostrando <strong>{filteredPatients.length}</strong> de <strong>{patients.length}</strong> pacientes registrados</span>
      </div>

      {/* Delete Confirmation Modal */}
      {patientToDelete && (
        <div className="modal-backdrop">
          <div className="modal-card modal-confirm">
            <div className="modal-confirm-icon delete-icon">
              <Trash2 size={28} color="#dc2626" />
            </div>
            <h3 className="modal-confirm-title">¿Eliminar registro?</h3>
            <p className="modal-confirm-text">
              ¿Estás seguro de que deseas eliminar el registro del paciente <strong>{patientToDelete.nombre_paciente}</strong> (ID: {patientToDelete.codigo_paciente})? Esta acción no se puede deshacer.
            </p>
            <div className="modal-confirm-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setPatientToDelete(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-delete-confirm"
                onClick={confirmDelete}
              >
                Eliminar Registro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
