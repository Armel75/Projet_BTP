/**
 * Utilitaire de conversion des filtres API en conditions Prisma
 * Traite chaque type de champ (string, number, date, enum, etc.)
 */

interface FilterItem {
  field: string;
  op: string;
  value: any;
}

/**
 * Convertit un filtre API unique en condition Prisma
 * Retourne l'objet de condition ou null si invalide
 */
export function toPrismaCondition(filter: FilterItem): any {
  const { field, op, value } = filter;

  // ─── STRING FIELDS ───────────────────────────────────────────────
  if (['title', 'description', 'code', 'client_name', 'location', 'city', 'country'].includes(field)) {
    if (op === 'contains') return { [field]: { contains: value, mode: 'insensitive' } };
    if (op === 'startsWith') return { [field]: { startsWith: value, mode: 'insensitive' } };
    if (op === 'endsWith') return { [field]: { endsWith: value, mode: 'insensitive' } };
    if (op === 'eq') return { [field]: { equals: value, mode: 'insensitive' } };
    if (op === 'isNull') return { [field]: { equals: null } };
    if (op === 'isNotNull') return { [field]: { not: null } };
  }

  // ─── ENUM FIELDS ────────────────────────────────────────────────
  if (['status', 'phase', 'building_type'].includes(field)) {
    if (op === 'eq') return { [field]: { equals: value } };
    if (op === 'neq') return { [field]: { not: value } };
    if (op === 'in') return { [field]: { in: Array.isArray(value) ? value : [value] } };
    if (op === 'isNull') return { [field]: { equals: null } };
    if (op === 'isNotNull') return { [field]: { not: null } };
  }

  // ─── BOOLEAN FIELDS ─────────────────────────────────────────────
  if (['is_archived'].includes(field)) {
    if (op === 'eq') return { [field]: { equals: value === true || value === 'true' } };
    if (op === 'isNull') return { [field]: { equals: null } };
    if (op === 'isNotNull') return { [field]: { not: null } };
  }

  // ─── NUMBER FIELDS ──────────────────────────────────────────────
  if (['budget_initial', 'budget_committed', 'budget_approved', 'budget_spent'].includes(field)) {
    const numValue = Number(value);
    if (op === 'eq') return { [field]: { equals: numValue } };
    if (op === 'gt') return { [field]: { gt: numValue } };
    if (op === 'gte') return { [field]: { gte: numValue } };
    if (op === 'lt') return { [field]: { lt: numValue } };
    if (op === 'lte') return { [field]: { lte: numValue } };
    if (op === 'between' && Array.isArray(value) && value.length === 2) {
      return {
        AND: [
          { [field]: { gte: Number(value[0]) } },
          { [field]: { lte: Number(value[1]) } },
        ],
      };
    }
    if (op === 'isNull') return { [field]: { equals: null } };
    if (op === 'isNotNull') return { [field]: { not: null } };
  }

  // ─── DATE FIELDS ────────────────────────────────────────────────
  if (['start_date', 'end_date'].includes(field)) {
    const dateValue = new Date(value);
    if (op === 'eq') return { [field]: { equals: dateValue } };
    if (op === 'gt') return { [field]: { gt: dateValue } };
    if (op === 'lt') return { [field]: { lt: dateValue } };
    if (op === 'between' && Array.isArray(value) && value.length === 2) {
      return {
        AND: [
          { [field]: { gte: new Date(value[0]) } },
          { [field]: { lte: new Date(value[1]) } },
        ],
      };
    }
    if (op === 'isNull') return { [field]: { equals: null } };
    if (op === 'isNotNull') return { [field]: { not: null } };
  }

  // ─── RELATION FIELDS ────────────────────────────────────────────
  // Chef de projet (project_manager_id)
  if (field === 'project_manager_id') {
    const userId = Number(value);
    if (op === 'eq') return { project_manager_id: { equals: userId } };
    if (op === 'neq') return { project_manager_id: { not: userId } };
    if (op === 'isNull') return { project_manager_id: { equals: null } };
    if (op === 'isNotNull') return { project_manager_id: { not: null } };
  }

  // Si aucune correspondance, retourner null
  return null;
}

/**
 * Construit la clause WHERE complète combinant tous les filtres
 * Applique aussi les filtres d'accès selon les permissions
 */
export function buildProjectWhere(
  logic: 'AND' | 'OR',
  filters: FilterItem[],
  tenantId: number,
  accessFilter?: any
): any {
  // Convertir chaque filtre en condition Prisma
  const conditions = filters
    .map((f) => toPrismaCondition(f))
    .filter((c) => c !== null);

  // Si pas de filtres valides
  if (conditions.length === 0) {
    return {
      AND: [
        { tenant_id: { equals: tenantId } },
        accessFilter || { is_archived: { equals: false } }, // Par défaut, pas archivés
      ],
    };
  }

  // Combiner les conditions avec la logique AND/OR
  const combinedConditions = logic === 'OR'
    ? { OR: conditions }
    : { AND: conditions };

  // Ajouter tenant_id et access filter
  return {
    AND: [
      { tenant_id: { equals: tenantId } },
      combinedConditions,
      accessFilter || { is_archived: { equals: false } },
    ],
  };
}

/**
 * Filtre d'accès basé sur les permissions
 * Peut être étendu selon les règles RBAC
 */
export function getProjectAccessFilter(user: any): any | null {
  // Pour l'instant, tout utilisateur authentifié peut voir les projets
  // À adapter selon vos règles RBAC
  return null;
}
