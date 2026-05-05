/**
 * Types génériques pour le système de filtres
 * Réutilisable pour tous les modules (Projets, Missions, etc.)
 */

export type Logic = 'AND' | 'OR';

export type FilterOperator = 
  | 'eq' | 'neq' 
  | 'contains' | 'startsWith' | 'endsWith'
  | 'gt' | 'gte' | 'lt' | 'lte'
  | 'between' | 'in'
  | 'isNull' | 'isNotNull';

export type FilterFieldType = 
  | 'string' 
  | 'number' 
  | 'date' 
  | 'enum' 
  | 'userSelect'
  | 'boolean';

/**
 * Configuration d'une colonne filtrable
 */
export interface FilterColumn {
  id: string;
  label: string;
  fieldType: FilterFieldType;
  operators: FilterOperator[];
  
  // Options pour enum/select
  options?: Array<{ label: string; value: string | number }>;
  
  // Pour les champs relationnels (user select, etc.)
  fetchOptions?: () => Promise<Array<{ label: string; value: string | number }>>;
}

/**
 * État d'une ligne de filtre dans le UI
 */
export interface FilterRowState {
  id: string;
  field: string;
  op: FilterOperator;
  value: any;
}

/**
 * Un filtre après sérialisation pour l'API
 */
export interface QueryFilter {
  field: string;
  op: FilterOperator;
  value: any;
}

/**
 * Payload complet envoyé au backend
 */
export interface QueryPayload {
  logic: Logic;
  filters: QueryFilter[];
}

/**
 * Réponse du backend après filtrage
 */
export interface QueryResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
