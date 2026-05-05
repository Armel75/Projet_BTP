/**
 * Sérialisation des filtres: UI → Payload API
 * Valide et transforme les lignes de filtre avant envoi au backend
 */

import { FilterRowState, QueryPayload, Logic } from './types';

/**
 * Valide et transforme l'état du filtre en payload pour l'API
 */
export function serializeToPayload(rows: FilterRowState[], logic: Logic): QueryPayload {
  const filters = rows
    .filter((row) => {
      // Exclure les lignes sans champ
      if (!row.field) return false;
      
      // Inclure les opérateurs NULL/NOT NULL même sans valeur
      if (row.op === 'isNull' || row.op === 'isNotNull') return true;
      
      // Pour 'between', vérifier qu'on a 2 valeurs
      if (row.op === 'between') {
        return (
          Array.isArray(row.value) &&
          row.value.length === 2 &&
          row.value[0] != null &&
          row.value[1] != null
        );
      }
      
      // Pour les autres opérateurs, vérifier qu'on a une valeur
      return row.value != null && row.value !== '' && 
             !(Array.isArray(row.value) && row.value.length === 0);
    })
    .map((row) => {
      // Pour 'between', nettoyer les valeurs null
      if (row.op === 'between' && Array.isArray(row.value)) {
        return {
          field: row.field,
          op: row.op,
          value: row.value.filter((v: any) => v != null),
        };
      }
      
      return {
        field: row.field,
        op: row.op,
        value: row.value,
      };
    });

  return {
    logic,
    filters,
  };
}

/**
 * Vérifie si au moins un filtre valide est présent
 */
export function hasValidFilters(rows: FilterRowState[]): boolean {
  return serializeToPayload(rows, 'AND').filters.length > 0;
}
