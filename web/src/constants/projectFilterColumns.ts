/**
 * Configuration des colonnes filtrables pour les Projets
 * Définit tous les champs, leurs types et opérateurs disponibles
 */

import { FilterColumn } from '../components/filters/types';

export const projectFilterColumns: FilterColumn[] = [
  {
    id: 'title',
    label: 'Nom du projet',
    fieldType: 'string',
    operators: ['contains', 'eq', 'startsWith', 'endsWith', 'isNull', 'isNotNull'],
  },
  {
    id: 'code',
    label: 'Code',
    fieldType: 'string',
    operators: ['contains', 'eq', 'startsWith', 'endsWith', 'isNull', 'isNotNull'],
  },
  {
    id: 'status',
    label: 'Statut',
    fieldType: 'enum',
    operators: ['eq', 'neq', 'in'],
    options: [
      { label: 'Planifié', value: 'PLANNED' },
      { label: 'En cours', value: 'IN_PROGRESS' },
      { label: 'Suspendu', value: 'SUSPENDED' },
      { label: 'Terminé', value: 'COMPLETED' },
      { label: 'Annulé', value: 'CANCELLED' },
      { label: 'Archivé', value: 'ARCHIVED' },
    ],
  },
  {
    id: 'phase',
    label: 'Phase',
    fieldType: 'enum',
    operators: ['eq', 'neq', 'in'],
    options: [
      { label: 'Étude', value: 'ETUDE' },
      { label: 'Préparation', value: 'PREPARATION' },
      { label: 'Exécution', value: 'EXECUTION' },
      { label: 'Réception', value: 'RECEPTION' },
      { label: 'Clôture', value: 'CLOTURE' },
    ],
  },
  {
    id: 'client_name',
    label: 'Client',
    fieldType: 'string',
    operators: ['contains', 'eq', 'startsWith', 'endsWith', 'isNull', 'isNotNull'],
  },
  {
    id: 'location',
    label: 'Localisation',
    fieldType: 'string',
    operators: ['contains', 'eq', 'startsWith', 'endsWith', 'isNull', 'isNotNull'],
  },
  {
    id: 'city',
    label: 'Ville',
    fieldType: 'string',
    operators: ['contains', 'eq', 'startsWith', 'endsWith', 'isNull', 'isNotNull'],
  },
  {
    id: 'project_manager_id',
    label: 'Chef de projet',
    fieldType: 'userSelect',
    operators: ['eq', 'neq', 'isNull', 'isNotNull'],
  },
  {
    id: 'budget_initial',
    label: 'Budget initial',
    fieldType: 'number',
    operators: ['eq', 'gt', 'gte', 'lt', 'lte', 'between'],
  },
  {
    id: 'budget_committed',
    label: 'Budget engagé',
    fieldType: 'number',
    operators: ['eq', 'gt', 'gte', 'lt', 'lte', 'between'],
  },
  {
    id: 'start_date',
    label: 'Date de début',
    fieldType: 'date',
    operators: ['eq', 'gt', 'lt', 'between', 'isNull', 'isNotNull'],
  },
  {
    id: 'end_date',
    label: 'Date de fin',
    fieldType: 'date',
    operators: ['eq', 'gt', 'lt', 'between', 'isNull', 'isNotNull'],
  },
  {
    id: 'building_type',
    label: 'Type de bâtiment',
    fieldType: 'enum',
    operators: ['eq', 'neq', 'in'],
    options: [
      { label: 'Résidentiel', value: 'RESIDENTIAL' },
      { label: 'Tertiaire', value: 'TERTIARY' },
      { label: 'Industriel', value: 'INDUSTRIAL' },
      { label: 'Mixte', value: 'MIXED' },
      { label: 'Autre', value: 'OTHER' },
    ],
  },
  {
    id: 'is_archived',
    label: 'Statut archivage',
    fieldType: 'boolean',
    operators: ['eq'],
    options: [
      { label: 'Archive', value: 'true' },
      { label: 'Actif', value: 'false' },
    ],
  },
];

/**
 * Récupère une colonne par son ID
 */
export function getFilterColumnById(id: string): FilterColumn | undefined {
  return projectFilterColumns.find((col) => col.id === id);
}

/**
 * Récupère les opérateurs disponibles pour un champ
 */
export function getOperatorsForField(fieldId: string): string[] {
  const column = getFilterColumnById(fieldId);
  return column?.operators || [];
}
