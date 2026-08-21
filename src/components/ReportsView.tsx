import React, { useState, useMemo } from 'react';
import type { Item, Patient } from '../types';
import {
  Calendar,
  Layers,
  Users,
  Printer,
  TrendingUp,
  FileSpreadsheet,
  Download
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface ReportsViewProps {
  patients: Patient[];
  items: Item[];
}
//que yico 

export const ReportsView: React.FC<ReportsViewProps> = ({ patients, items }) => {
  // Current month key (YYYY-MM)
  const currentMonthKey = new Date().toISOString().substring(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);

  // Available months extracted from patient records
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    monthsSet.add(currentMonthKey);
    patients.forEach(p => {
      if (p.fecha_registro) {
        monthsSet.add(p.fecha_registro.substring(0, 7));
      }
    });
    return Array.from(monthsSet).sort().reverse();
  }, [patients, currentMonthKey]);

  // Filter patients by selected month
  const filteredPatients = useMemo(() => {
    if (selectedMonth === 'ALL') return patients;
    return patients.filter(p => p.fecha_registro && p.fecha_registro.startsWith(selectedMonth));
  }, [patients, selectedMonth]);

  // Helper to resolve brand if only dimension is present (legacy data)
  const resolveBrand = (tipoStr: string) => {
    let clean = tipoStr.replace('×', 'x').trim();
    if (clean && !clean.includes('-')) {
      const matchedItem = items.find(i => i.dimension === clean);
      if (matchedItem && matchedItem.nombre) {
        clean = `${matchedItem.nombre} - ${clean}`;
      }
    }
    return clean;
  };

  // Compute total plates used grouped by Marca - Medida
  const plateStats = useMemo(() => {
    const counts: Record<string, number> = {};

    filteredPatients.forEach(p => {
      if (p.detalles_placas && p.detalles_placas.length > 0) {
        p.detalles_placas.forEach(plate => {
          const nameOrDim = resolveBrand(plate.tipo);
          if (nameOrDim) {
            counts[nameOrDim] = (counts[nameOrDim] || 0) + Number(plate.cantidad || 1);
          }
        });
      } else if (p.placas_utilizadas) {
        const match = p.placas_utilizadas.match(/(\d+)\s*placas?\s*([^\,]+)/gi);
        if (match) {
          match.forEach(m => {
            const parts = m.split(/\s*placas?\s*/i);
            if (parts.length === 2) {
              const qty = parseInt(parts[0], 10) || 1;
              const dim = resolveBrand(parts[1]);
              counts[dim] = (counts[dim] || 0) + qty;
            }
          });
        }
      }
    });

    const totalPlates = Object.values(counts).reduce((acc, curr) => acc + curr, 0);
    const list = Object.entries(counts)
      .map(([medida, cantidad]) => ({
        medida,
        cantidad,
      }))
      .sort((a, b) => b.cantidad - a.cantidad);

    return { list, totalPlates };
  }, [filteredPatients, items]);

  const formatMonthLabel = (mKey: string) => {
    if (mKey === 'ALL') return 'Histórico Total (Todos los meses)';
    const [year, month] = mKey.split('-');
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
    const monthName = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    return monthName.charAt(0).toUpperCase() + monthName.slice(1);
  };

  const handlePrint = () => {
    window.print();
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();

    // === Sheet 1: Summary ===
    const summaryData = plateStats.list.map(item => ({
      'Placa (Marca - Medida)': item.medida,
      'Cantidad Utilizada': item.cantidad
    }));

    summaryData.push({
      'Placa (Marca - Medida)': 'TOTAL GENERAL',
      'Cantidad Utilizada': plateStats.totalPlates
    });

    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    summarySheet['!cols'] = [{ wch: 35 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen_Placas');

    // === Sheet 2: Detailed Patients ===
    const detailedData = filteredPatients.map(p => {
      // Build plates used string
      let platesStr = '';
      if (p.detalles_placas && p.detalles_placas.length > 0) {
        platesStr = p.detalles_placas
          .map(pl => `${pl.cantidad} placa(s) ${resolveBrand(pl.tipo)}`)
          .join(', ');
      } else {
        platesStr = p.placas_utilizadas || 'Sin registro';
      }

      return {
        'Fecha y Hora': p.fecha_registro ? new Date(p.fecha_registro).toLocaleString('es-ES') : '',
        'Código': p.codigo_paciente || '',
        'Paciente': p.nombre_paciente || '',
        'Estudio Realizado': p.estudio || '',
        'Médico / Encargado': p.medico || '',
        'Placas Utilizadas': platesStr,
        'Registrado Por': p.creado_por || ''
      };
    });

    const detailedSheet = XLSX.utils.json_to_sheet(detailedData);
    detailedSheet['!cols'] = [
      { wch: 20 }, // Fecha
      { wch: 10 }, // Codigo
      { wch: 35 }, // Paciente
      { wch: 35 }, // Estudio
      { wch: 30 }, // Medico
      { wch: 45 }, // Placas Utilizadas
      { wch: 20 }  // Registrado Por
    ];
    XLSX.utils.book_append_sheet(workbook, detailedSheet, 'Detalle_Estudios');

    XLSX.writeFile(workbook, `Reporte_${selectedMonth}.xlsx`);
  };

  return (
    <div className="table-view-wrapper">
      {/* Top Header */}
      <div className="table-top-bar flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="table-title-area">
          <h1 className="page-main-heading">Reporte de Placas Utilizadas</h1>
          <p className="page-sub-heading">Resumen de consumo total de placas radiográficas agrupadas por marca y medida</p>
        </div>

        <div className="table-top-actions flex flex-wrap gap-2">
          {/* Month Selector */}
          <div className="filter-select-box bg-white border border-slate-200">
            <Calendar size={16} className="text-blue-700" />
            <select
              className="custom-select-filter font-semibold text-slate-800"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              <option value="ALL">Histórico Total</option>
              {availableMonths.map(m => (
                <option key={m} value={m}>
                  {formatMonthLabel(m)}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="btn-nuevo-paciente"
            onClick={exportToExcel}
            style={{ backgroundColor: '#16a34a', borderColor: '#15803d' }}
          >
            <Download size={18} />
            <span>Excel (.xlsx)</span>
          </button>

          <button
            type="button"
            className="btn-nuevo-paciente"
            onClick={handlePrint}
          >
            <Printer size={18} />
            <span>Imprimir Resumen</span>
          </button>
        </div>
      </div>

      {/* Quick Total KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
        <div className="filters-card flex items-center gap-4 p-4 border-l-4 border-l-blue-700 bg-white">
          <div className="brand-icon bg-blue-50 text-blue-900 border border-blue-200" style={{ width: '48px', height: '48px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={24} color="#003b95" />
          </div>
          <div>
            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block">Total Placas Utilizadas</span>
            <span className="text-3xl font-extrabold text-blue-900 font-mono">{plateStats.totalPlates}</span>
            <span className="text-xs text-gray-400 block mt-0.5">{formatMonthLabel(selectedMonth)}</span>
          </div>
        </div>

        <div className="filters-card flex items-center gap-4 p-4 border-l-4 border-l-slate-600 bg-white">
          <div className="brand-icon bg-slate-50 text-slate-800 border border-slate-200" style={{ width: '48px', height: '48px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={24} color="#334155" />
          </div>
          <div>
            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block">Pacientes Registrados</span>
            <span className="text-3xl font-extrabold text-slate-800 font-mono">{filteredPatients.length}</span>
            <span className="text-xs text-gray-400 block mt-0.5">Estudios atendidos</span>
          </div>
        </div>
      </div>

      {/* Main Report Table: Detalle por Paciente */}
      <div className="patient-table-container mt-4">
        <div className="p-4 bg-blue-50/60 border-b border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp size={20} color="#003b95" />
            <h2 className="text-base font-bold text-slate-900">Detalle de Estudios ({formatMonthLabel(selectedMonth)})</h2>
          </div>
          <span className="font-mono text-xs font-bold text-blue-900 bg-white px-3 py-1 rounded-full border border-blue-200 shadow-sm self-start sm:self-auto">
            {filteredPatients.length} {filteredPatients.length === 1 ? 'estudio registrado' : 'estudios registrados'}
          </span>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="custom-medical-table w-full min-w-[700px]">
            <thead>
              <tr>
                <th style={{ width: '50px' }}>#</th>
                <th style={{ width: '140px' }}>Fecha y Hora</th>
                <th>Paciente</th>
                <th>Estudio</th>
                <th>Encargado</th>
                <th>Placas Utilizadas</th>
                <th style={{ width: '80px' }}>Cant.</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty-table-cell">
                    <div className="empty-state">
                      <FileSpreadsheet size={36} className="text-blue-700 opacity-50" />
                      <p>No se registraron estudios en este periodo.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient, idx) => {
                  const fechaStr = patient.fecha_registro
                    ? new Date(patient.fecha_registro).toLocaleString('es-ES', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })
                    : '—';

                  let placasText = '';
                  let totalQty = 0;
                  if (patient.detalles_placas && patient.detalles_placas.length > 0) {
                    placasText = patient.detalles_placas
                      .map(pl => resolveBrand(pl.tipo).replace('x', '×'))
                      .join(', ');
                    totalQty = patient.detalles_placas.reduce((sum, pl) => sum + Number(pl.cantidad || 1), 0);
                  } else {
                    placasText = patient.placas_utilizadas || 'Sin registro';
                  }

                  return (
                    <tr key={patient.id} className="patient-row">
                      <td className="font-mono text-xs text-gray-400 font-bold">{idx + 1}</td>
                      <td className="text-xs text-gray-500 font-mono whitespace-nowrap">{fechaStr}</td>
                      <td className="font-semibold text-gray-800 text-sm">{patient.nombre_paciente}</td>
                      <td className="text-sm text-gray-700">{patient.estudio}</td>
                      <td className="text-sm text-gray-700">{patient.medico}</td>
                      <td className="text-sm text-gray-700">{placasText}</td>
                      <td className="font-mono text-sm font-extrabold text-blue-900 text-center">{totalQty || '—'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredPatients.length > 0 && (
              <tfoot>
                <tr className="bg-blue-50/70 font-bold">
                  <td colSpan={6} className="text-right text-sm text-slate-800 pr-4">
                    TOTAL GENERAL DE PLACAS:
                  </td>
                  <td className="font-mono text-lg text-blue-900 font-extrabold text-center">
                    {plateStats.totalPlates}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Summary by Placa Type */}
      <div className="patient-table-container mt-4">
        <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Layers size={20} color="#334155" />
            <h2 className="text-base font-bold text-slate-900">Resumen por Tipo de Placa</h2>
          </div>
          <span className="font-mono text-xs font-bold text-slate-700 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm self-start sm:self-auto">
            {plateStats.list.length} {plateStats.list.length === 1 ? 'tipo' : 'tipos'}
          </span>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="custom-medical-table w-full min-w-[400px]">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>#</th>
                <th>Placa (Marca - Medida)</th>
                <th style={{ width: '180px' }}>Cantidad Total</th>
              </tr>
            </thead>
            <tbody>
              {plateStats.list.map((item, idx) => (
                <tr key={item.medida} className="patient-row">
                  <td className="font-mono text-xs text-gray-400 font-bold">{idx + 1}</td>
                  <td className="font-semibold text-gray-800 text-sm">{item.medida.replace('x', '×')}</td>
                  <td>
                    <span className="font-mono text-base font-extrabold text-blue-900">{item.cantidad}</span>
                    <span className="text-xs text-gray-500 ml-1">placas</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
