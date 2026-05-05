/**
 * Composant pour une ligne de filtre (champ + opérateur + valeur)
 * Réutilisable pour tous les modules
 */

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { FilterRowState, FilterOperator, FilterColumn } from './types';
import { projectFilterColumns, getFilterColumnById, getOperatorsForField } from '../../constants/projectFilterColumns';

interface ProjectFilterRowProps {
  row: FilterRowState;
  onUpdate: (row: FilterRowState) => void;
  onRemove: () => void;
  availableColumns?: FilterColumn[];
}

export function ProjectFilterRow({ 
  row, 
  onUpdate, 
  onRemove, 
  availableColumns = projectFilterColumns 
}: ProjectFilterRowProps) {
  const column = getFilterColumnById(row.field);
  const [userOptions, setUserOptions] = useState<Array<{ label: string; value: string | number }>>([]);
  const [loading, setLoading] = useState(false);

  // Charger les options utilisateurs si applicable
  useEffect(() => {
    if (row.field === 'project_manager_id' && column?.fetchOptions) {
      setLoading(true);
      column.fetchOptions()
        .then(setUserOptions)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [row.field, column]);

  const handleFieldChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newField = e.target.value;
    const newColumn = getFilterColumnById(newField);
    const newOp = newColumn?.operators[0] || 'eq';
    
    onUpdate({
      ...row,
      field: newField,
      op: newOp as FilterOperator,
      value: null,
    });
  };

  const handleOpChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newOp = e.target.value as FilterOperator;
    let newValue = row.value;
    
    // Reset value si le nouvel opérateur ne l'accepte pas
    if (newOp === 'isNull' || newOp === 'isNotNull') {
      newValue = null;
    } else if (newOp === 'between' && !Array.isArray(newValue)) {
      newValue = [null, null];
    }
    
    onUpdate({
      ...row,
      op: newOp,
      value: newValue,
    });
  };

  const handleValueChange = (newValue: any) => {
    onUpdate({ ...row, value: newValue });
  };

  const operators = getOperatorsForField(row.field);
  const currentColumn = getFilterColumnById(row.field);

  return (
    <div className="flex gap-2 items-end flex-wrap">
      {/* Champ */}
      <div className="flex-1 min-w-[140px]">
        <label className="block text-xs font-medium text-gray-600 mb-1">Champ</label>
        <select
          value={row.field}
          onChange={handleFieldChange}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Sélectionner...</option>
          {availableColumns.map((col) => (
            <option key={col.id} value={col.id}>
              {col.label}
            </option>
          ))}
        </select>
      </div>

      {/* Opérateur */}
      {row.field && (
        <div className="flex-1 min-w-[120px]">
          <label className="block text-xs font-medium text-gray-600 mb-1">Opérateur</label>
          <select
            value={row.op}
            onChange={handleOpChange}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {operators.map((op) => (
              <option key={op} value={op}>
                {getOperatorLabel(op)}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Valeur (si applicable) */}
      {row.field && !['isNull', 'isNotNull'].includes(row.op) && (
        <div className="flex-1 min-w-[140px]">
          <ProjectFilterValueInput
            row={row}
            column={currentColumn}
            userOptions={userOptions}
            loading={loading}
            onChange={handleValueChange}
          />
        </div>
      )}

      {/* Bouton supprimer */}
      <button
        onClick={onRemove}
        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition"
        title="Supprimer ce filtre"
      >
        <X size={18} />
      </button>
    </div>
  );
}

/**
 * Composant pour l'input de valeur (polymorphe selon le type de champ)
 */
function ProjectFilterValueInput({ row, column, userOptions, loading, onChange }: any) {
  if (!column) return null;

  const { fieldType, options } = column;

  // String
  if (fieldType === 'string') {
    return (
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Valeur</label>
        <input
          type="text"
          value={row.value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Entrer la valeur..."
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
    );
  }

  // Number
  if (fieldType === 'number') {
    if (row.op === 'between') {
      return (
        <div className="flex gap-1">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">De</label>
            <input
              type="number"
              value={Array.isArray(row.value) ? row.value[0] ?? '' : ''}
              onChange={(e) =>
                onChange([
                  e.target.value ? Number(e.target.value) : null,
                  Array.isArray(row.value) ? row.value[1] : null,
                ])
              }
              placeholder="Min"
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">À</label>
            <input
              type="number"
              value={Array.isArray(row.value) ? row.value[1] ?? '' : ''}
              onChange={(e) =>
                onChange([
                  Array.isArray(row.value) ? row.value[0] : null,
                  e.target.value ? Number(e.target.value) : null,
                ])
              }
              placeholder="Max"
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      );
    }
    return (
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Valeur</label>
        <input
          type="number"
          value={row.value ?? ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
          placeholder="Entrer le nombre..."
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
    );
  }

  // Date
  if (fieldType === 'date') {
    if (row.op === 'between') {
      return (
        <div className="flex gap-1">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Du</label>
            <input
              type="date"
              value={
                Array.isArray(row.value) && row.value[0]
                  ? row.value[0].split('T')[0]
                  : ''
              }
              onChange={(e) =>
                onChange([
                  e.target.value,
                  Array.isArray(row.value) ? row.value[1] : null,
                ])
              }
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Au</label>
            <input
              type="date"
              value={
                Array.isArray(row.value) && row.value[1]
                  ? row.value[1].split('T')[0]
                  : ''
              }
              onChange={(e) =>
                onChange([
                  Array.isArray(row.value) ? row.value[0] : null,
                  e.target.value,
                ])
              }
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      );
    }
    return (
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
        <input
          type="date"
          value={row.value ? row.value.split('T')[0] : ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
    );
  }

  // Enum / Select
  if (fieldType === 'enum' || fieldType === 'userSelect' || fieldType === 'boolean') {
    const opts = fieldType === 'userSelect' ? userOptions : options || [];
    
    if (row.op === 'in') {
      // Multi-select pour 'in'
      return (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Valeurs</label>
          <div className="space-y-1">
            {opts.map((opt: { label: string; value: string | number }) => (
              <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={Array.isArray(row.value) ? row.value.includes(opt.value) : false}
                  onChange={(e) => {
                    const arr = Array.isArray(row.value) ? row.value : [];
                    if (e.target.checked) {
                      onChange([...arr, opt.value]);
                    } else {
                      onChange(arr.filter((v: any) => v !== opt.value));
                    }
                  }}
                  className="rounded border-gray-300"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Valeur</label>
        <select
          value={row.value ?? ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : e.target.value)}
          disabled={loading}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Sélectionner...</option>
          {opts.map((opt: { label: string; value: string | number }) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return null;
}

/**
 * Obtient le label lisible pour un opérateur
 */
function getOperatorLabel(op: FilterOperator | string): string {
  const labels: Record<string, string> = {
    eq: 'Égal à',
    neq: 'Différent de',
    contains: 'Contient',
    startsWith: 'Commence par',
    endsWith: 'Se termine par',
    gt: 'Supérieur à',
    gte: 'Supérieur ou égal à',
    lt: 'Inférieur à',
    lte: 'Inférieur ou égal à',
    between: 'Entre',
    in: 'Dans la liste',
    isNull: 'Est vide',
    isNotNull: 'N\'est pas vide',
  };
  return labels[op] || op;
}
