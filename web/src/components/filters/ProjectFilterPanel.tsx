/**
 * Composant principal du panneau de filtres pour les Projets
 * Gère l'ajout/suppression de lignes, la logique AND/OR, et l'envoi des filtres
 */

import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Download, RotateCcw } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { ProjectFilterRow } from './ProjectFilterRow';
import { FilterRowState, Logic, QueryPayload } from './types';
import { serializeToPayload } from './serialize';

interface ProjectFilterPanelProps {
  onApply: (payload: QueryPayload) => void;
  onClose: () => void;
  initialRows?: FilterRowState[];
}

export function ProjectFilterPanel({ 
  onApply, 
  onClose, 
  initialRows = [] 
}: ProjectFilterPanelProps) {
  const [rows, setRows] = useState<FilterRowState[]>(
    initialRows.length > 0 ? initialRows : [createNewRow()]
  );
  const [logic, setLogic] = useState<Logic>('AND');
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Fermer si on clique en dehors
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleAddRow = () => {
    setRows([...rows, createNewRow()]);
  };

  const handleUpdateRow = (id: string, updatedRow: FilterRowState) => {
    setRows(rows.map((r) => (r.id === id ? updatedRow : r)));
  };

  const handleRemoveRow = (id: string) => {
    if (rows.length > 1) {
      setRows(rows.filter((r) => r.id !== id));
    }
  };

  const handleApply = async () => {
    const payload = serializeToPayload(rows, logic);
    setLoading(true);
    try {
      onApply(payload);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setRows([createNewRow()]);
    setLogic('AND');
  };

  const hasFilters = rows.some((r) => r.field && (r.value != null || ['isNull', 'isNotNull'].includes(r.op)));

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/30 z-40 hidden md:block" />
      
      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed right-0 top-0 h-screen md:max-w-[720px] w-full bg-white dark:bg-gb-surface-solid shadow-lg z-50 flex flex-col md:rounded-l-lg overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gb-border">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gb-text">Filtrer les projets</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:text-gb-muted dark:hover:text-gb-text rounded hover:bg-gray-100 dark:hover:bg-gb-app transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Logic selector */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gb-app rounded-lg">
            <span className="text-sm font-medium text-gray-700 dark:text-gb-text">Logique:</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={logic === 'AND'}
                onChange={() => setLogic('AND')}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm text-gray-700 dark:text-gb-text">ET (tous les critères)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={logic === 'OR'}
                onChange={() => setLogic('OR')}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm text-gray-700 dark:text-gb-text">OU (au moins un)</span>
            </label>
          </div>

          {/* Filter rows */}
          <div className="space-y-3">
            {rows.map((row, index) => (
              <div key={row.id}>
                {index > 0 && (
                  <div className="text-xs font-semibold text-gray-500 dark:text-gb-muted uppercase mb-2 flex items-center gap-2">
                    <div className="flex-1 h-px bg-gray-300 dark:bg-gb-border" />
                    <span>{logic}</span>
                    <div className="flex-1 h-px bg-gray-300 dark:bg-gb-border" />
                  </div>
                )}
                <ProjectFilterRow
                  row={row}
                  onUpdate={(updated) => handleUpdateRow(row.id, updated)}
                  onRemove={() => handleRemoveRow(row.id)}
                />
              </div>
            ))}
          </div>

          {/* Add row button */}
          <button
            onClick={handleAddRow}
            className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded transition font-medium"
          >
            <Plus size={16} />
            Ajouter un critère
          </button>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gb-border p-4 space-y-3">
          {/* Export info */}
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gb-muted bg-blue-50 dark:bg-gb-app p-2 rounded">
            <Download size={14} />
            <span>Les résultats filtrés peuvent être exportés en PDF ou Excel</span>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              disabled={!hasFilters}
              className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gb-text bg-gray-100 dark:bg-gb-app hover:bg-gray-200 dark:hover:bg-gb-border disabled:opacity-50 disabled:cursor-not-allowed rounded transition"
            >
              <RotateCcw size={16} />
              Réinitialiser
            </button>
            <button
              onClick={handleApply}
              disabled={loading}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition"
            >
              {loading ? 'Application en cours...' : 'Appliquer les filtres'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Crée une nouvelle ligne de filtre vide
 */
function createNewRow(): FilterRowState {
  return {
    id: uuidv4(),
    field: '',
    op: 'contains',
    value: null,
  };
}
