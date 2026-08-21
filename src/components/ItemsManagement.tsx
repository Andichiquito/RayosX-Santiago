import React, { useState } from 'react';
import type { Item, ItemType } from '../types';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Search, 
  X, 
  Package, 
  Layers, 
  Boxes
} from 'lucide-react';
import { itemService } from '../services/itemService';
import { sanitizeText, sanitizeDimension } from '../utils/security';

interface ItemsManagementProps {
  items: Item[];
  onCreateItem: (item: Omit<Item, 'id'>) => Promise<void>;
  onUpdateItem: (id: string, updates: Partial<Item>) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export const ItemsManagement: React.FC<ItemsManagementProps> = ({
  items,
  onCreateItem,
  onUpdateItem,
  onDeleteItem,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'placa' | 'otro'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<Item | null>(null);
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);

  // Form states (Marca, Tamaño, Cantidad)
  const [tipo, setTipo] = useState<ItemType>('placa');
  const [autoCode, setAutoCode] = useState('PLC-001');
  const [marca, setMarca] = useState('');
  const [dimension, setDimension] = useState('');
  const [cantidad, setCantidad] = useState(50);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchNextCode = async (selectedTipo: ItemType) => {
    const code = await itemService.getNextCode(selectedTipo);
    setAutoCode(code);
  };

  const openCreateModal = async () => {
    setItemToEdit(null);
    setTipo('placa');
    await fetchNextCode('placa');
    setMarca('');
    setDimension('');
    setCantidad(50);
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: Item) => {
    setItemToEdit(item);
    const itemTipo = item.tipo || (item.dimension ? 'placa' : 'otro');
    setTipo(itemTipo);
    setAutoCode(item.codigo);
    setMarca(item.nombre);
    setDimension(item.dimension || '');
    setCantidad(item.cantidad);
    setError(null);
    setIsModalOpen(true);
  };

  const handleTipoChange = async (newTipo: ItemType) => {
    setTipo(newTipo);
    if (!itemToEdit) {
      await fetchNextCode(newTipo);
      setMarca('');
      setDimension('');
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMarca = sanitizeText(marca.trim(), 100);
    const cleanDim = sanitizeDimension(dimension.trim(), 30);
    const cleanCantidad = Math.max(0, Math.min(99999, Number(cantidad) || 0));

    if (!cleanMarca) {
      setError(tipo === 'placa' ? 'Por favor ingresa la marca de la placa' : 'Por favor ingresa la marca del item');
      return;
    }

    if (tipo === 'placa' && !cleanDim) {
      setError('Por favor ingresa el tamaño de la placa');
      return;
    }

    const finalDimension = tipo === 'placa' ? cleanDim : undefined;

    try {
      setIsSubmitting(true);
      setError(null);

      if (itemToEdit) {
        await onUpdateItem(itemToEdit.id, {
          codigo: itemToEdit.codigo,
          tipo,
          nombre: cleanMarca,
          dimension: finalDimension,
          cantidad: cleanCantidad,
        });
      } else {
        await onCreateItem({
          codigo: autoCode,
          tipo,
          nombre: cleanMarca,
          dimension: finalDimension,
          cantidad: cleanCantidad,
          activo: true,
        });
      }

      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Error guardando el registro');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdjustStock = async (item: Item, delta: number) => {
    const newCantidad = Math.max(0, item.cantidad + delta);
    await onUpdateItem(item.id, { cantidad: newCantidad });
  };

  const confirmDelete = async () => {
    if (itemToDelete) {
      await onDeleteItem(itemToDelete.id);
      setItemToDelete(null);
    }
  };

  const filteredItems = items.filter((i) => {
    const itemTipo = i.tipo || (i.dimension ? 'placa' : 'otro');
    const matchType = filterType === 'ALL' || itemTipo === filterType;
    const matchSearch =
      i.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (i.dimension && i.dimension.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchType && matchSearch;
  });

  const plateCount = items.filter(i => (i.tipo || (i.dimension ? 'placa' : 'otro')) === 'placa').length;
  const otherCount = items.filter(i => (i.tipo || (i.dimension ? 'placa' : 'otro')) === 'otro').length;

  return (
    <div className="table-view-wrapper">
      {/* Top Header */}
      <div className="table-top-bar">
        <div className="table-title-area">
          <h1 className="page-main-heading">Inventario General</h1>
          <p className="page-sub-heading">Control de placas radiológicas y otros insumos</p>
        </div>

        <div className="table-top-actions">
          <button
            type="button"
            className="btn-nuevo-paciente"
            onClick={openCreateModal}
          >
            <Plus size={18} />
            <span>Nuevo Registro +</span>
          </button>
        </div>
      </div>

      {/* Category Tabs & Search Bar */}
      <div className="filters-card flex flex-col md:flex-row gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`nav-tab-btn text-xs py-1.5 px-3 rounded-lg ${filterType === 'ALL' ? 'active' : 'bg-gray-100'}`}
            onClick={() => setFilterType('ALL')}
          >
            <Boxes size={14} />
            <span>Todos ({items.length})</span>
          </button>
          <button
            type="button"
            className={`nav-tab-btn text-xs py-1.5 px-3 rounded-lg ${filterType === 'placa' ? 'active' : 'bg-gray-100'}`}
            onClick={() => setFilterType('placa')}
          >
            <Layers size={14} />
            <span>Placas ({plateCount})</span>
          </button>
          <button
            type="button"
            className={`nav-tab-btn text-xs py-1.5 px-3 rounded-lg ${filterType === 'otro' ? 'active' : 'bg-gray-100'}`}
            onClick={() => setFilterType('otro')}
          >
            <Package size={14} />
            <span>Otros Insumos ({otherCount})</span>
          </button>
        </div>

        <div className="search-input-box flex-1">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="filter-search-input"
            placeholder="Buscar por ID, marca o tamaño..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="clear-search-btn" onClick={() => setSearchTerm('')}>
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Items Table */}
      <div className="patient-table-container">
        <table className="custom-medical-table">
          <thead>
            <tr>
              <th style={{ width: '120px' }}>ID</th>
              <th style={{ width: '140px' }}>Categoría</th>
              <th>Marca</th>
              <th style={{ width: '150px' }}>Tamaño</th>
              <th style={{ width: '220px' }}>Cantidad</th>
              <th style={{ width: '120px' }} className="text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty-table-cell">
                  <div className="empty-state">
                    <Package size={36} className="text-blue-700 opacity-50" />
                    <p>No se encontraron registros en el inventario.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => {
                const isPlaca = (item.tipo || (item.dimension ? 'placa' : 'otro')) === 'placa';

                return (
                  <tr key={item.id} className="patient-row">
                    <td className="font-mono text-sm font-bold text-blue-900">{item.codigo}</td>
                    <td>
                      {isPlaca ? (
                        <span className="role-pill small role-medico">
                          <Layers size={12} />
                          <span>PLACA</span>
                        </span>
                      ) : (
                        <span className="role-pill small bg-purple-100 text-purple-800 border border-purple-200">
                          <Package size={12} />
                          <span>ITEM</span>
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="font-semibold text-gray-900">{item.nombre}</div>
                    </td>
                    <td>
                      {item.dimension ? (
                        <span className="dimension-badge">{item.dimension.replace('x', '×')}</span>
                      ) : (
                        <span className="text-gray-400 text-sm italic">-</span>
                      )}
                    </td>
                    <td>
                      <div className="stock-control-cell">
                        <button
                          className="stock-btn"
                          title="Restar 5"
                          onClick={() => handleAdjustStock(item, -5)}
                        >
                          -5
                        </button>
                        <button
                          className="stock-btn"
                          title="Restar 1"
                          onClick={() => handleAdjustStock(item, -1)}
                        >
                          -1
                        </button>
                        <span className={`stock-number ${item.cantidad <= 5 ? 'stock-low' : 'stock-ok'}`}>
                          {item.cantidad}
                        </span>
                        <button
                          className="stock-btn"
                          title="Sumar 1"
                          onClick={() => handleAdjustStock(item, 1)}
                        >
                          +1
                        </button>
                        <button
                          className="stock-btn"
                          title="Sumar 10"
                          onClick={() => handleAdjustStock(item, 10)}
                        >
                          +10
                        </button>
                      </div>
                    </td>
                    <td>
                      <div className="action-buttons-group center">
                        <button
                          type="button"
                          className="action-btn-edit"
                          title="Editar"
                          onClick={() => openEditModal(item)}
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          type="button"
                          className="action-btn-delete"
                          title="Eliminar"
                          onClick={() => setItemToDelete(item)}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal to Create/Edit Item */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card modal-patient-dialog animate-scale-in">
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => setIsModalOpen(false)}
            >
              <X size={20} />
            </button>

            <div className="modal-header-section">
              <div className="flex items-center justify-between">
                <h2 className="modal-title-teal">
                  {itemToEdit 
                    ? (tipo === 'placa' ? 'Editar Placa' : 'Editar Item')
                    : (tipo === 'placa' ? 'Nueva Placa' : 'Nuevo Item')}
                </h2>
                <span className="font-mono text-xs bg-blue-50 text-blue-900 border border-blue-200 px-2.5 py-1 rounded-full font-bold">
                  ID: {autoCode} (Auto)
                </span>
              </div>
            </div>

            {/* Type Switcher Selector */}
            <div className="plates-form-section mb-4">
              <label className="form-label font-bold text-gray-800">Tipo de Registro</label>
              <div className="quick-buttons-grid">
                <button
                  type="button"
                  className={`quick-btn ${tipo === 'placa' ? 'border-blue-600 bg-blue-50 text-blue-950 shadow-sm' : ''}`}
                  onClick={() => handleTipoChange('placa')}
                >
                  <Layers size={20} color="#003b95" />
                  <div>
                    <span className="font-bold block">Placa Radiográfica</span>
                  </div>
                </button>

                <button
                  type="button"
                  className={`quick-btn ${tipo === 'otro' ? 'border-purple-600 bg-purple-50 text-purple-900 shadow-sm' : ''}`}
                  onClick={() => handleTipoChange('otro')}
                >
                  <Package size={20} color="#7c3aed" />
                  <div>
                    <span className="font-bold block">Otro Insumo</span>
                  </div>
                </button>
              </div>
            </div>

            {error && (
              <div className="alert-box error mb-4">
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSaveItem} className="patient-form-layout">
              {/* 1. Marca */}
              <div className="form-group">
                <label className="form-label">
                  {tipo === 'placa' ? 'Marca de la Placa *' : 'Marca del Item *'}
                </label>
                <input
                  type="text"
                  className="custom-input"
                  placeholder={tipo === 'placa' ? 'Marca de la placa' : 'Marca del item'}
                  value={marca}
                  onChange={(e) => setMarca(sanitizeText(e.target.value, 100))}
                  maxLength={100}
                  required
                  autoFocus
                />
              </div>

              {/* 2. Tamaño (Only for Placa) */}
              {tipo === 'placa' && (
                <div className="form-group">
                  <label className="form-label">Tamaño de la Placa *</label>
                  <input
                    type="text"
                    className="custom-input"
                    placeholder="Medida"
                    value={dimension}
                    onChange={(e) => setDimension(sanitizeDimension(e.target.value, 30))}
                    maxLength={30}
                    required
                  />
                </div>
              )}

              {/* 3. Cantidad */}
              <div className="form-group">
                <label className="form-label">Cantidad *</label>
                <input
                  type="number"
                  min="0"
                  max="99999"
                  className="custom-input"
                  placeholder="Cantidad"
                  value={cantidad}
                  onChange={(e) => setCantidad(Math.max(0, Math.min(99999, parseInt(e.target.value, 10) || 0)))}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn-registrar-paciente"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? 'Guardando...'
                  : itemToEdit
                  ? 'Guardar Cambios'
                  : 'Guardar en Inventario'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Item Confirmation */}
      {itemToDelete && (
        <div className="modal-backdrop">
          <div className="modal-card modal-confirm">
            <div className="modal-confirm-icon delete-icon">
              <Trash2 size={28} color="#dc2626" />
            </div>
            <h3 className="modal-confirm-title">¿Eliminar del inventario?</h3>
            <p className="modal-confirm-text">
              ¿Estás seguro de eliminar <strong>{itemToDelete.nombre}</strong> (ID: {itemToDelete.codigo})?
            </p>
            <div className="modal-confirm-actions">
              <button 
                type="button" 
                className="btn-cancel"
                onClick={() => setItemToDelete(null)}
              >
                Cancelar
              </button>
              <button 
                type="button" 
                className="btn-delete-confirm"
                onClick={confirmDelete}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
