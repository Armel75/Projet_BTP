/**
 * Utilitaire de conversion des filtres API en conditions Prisma
 * Traite chaque type de champ (string, number, date, enum, etc.)
 */

import { RbacService } from '../services/rbac.service.js';

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
  scopeFilter?: any
): any {
  // Convertir chaque filtre en condition Prisma
  const conditions = filters
    .map((f) => toPrismaCondition(f))
    .filter((c) => c !== null);

  const andClauses: any[] = [
    { tenant_id: { equals: tenantId } },
  ];

  // Filtre de périmètre utilisateur (qui peut voir quoi)
  if (scopeFilter) andClauses.push(scopeFilter);

  // Conditions issues des filtres API
  if (conditions.length > 0) {
    andClauses.push(
      logic === 'OR' ? { OR: conditions } : { AND: conditions }
    );
  }

  // Par défaut : exclure les projets archivés
  // (sauf si l'utilisateur filtre explicitement is_archived)
  const hasArchivedFilter = conditions.some((c: any) => 'is_archived' in c);
  if (!hasArchivedFilter) {
    andClauses.push({ is_archived: { equals: false } });
  }

  return { AND: andClauses };
}

/**
 * Construit le filtre Prisma de périmètre projet pour un utilisateur.
 * - canReadAll = true  → null (pas de restriction, l'utilisateur voit tout)
 * - canReadAll = false → filtre OR : créateur | chef de projet | responsable HSE | membre
 */
export function buildProjectScopeWhere(userId: number, canReadAll: boolean): any | null {
  if (canReadAll) return null;
  return {
    OR: [
      { created_by: userId },
      { project_manager_id: userId },
      { hse_responsible_id: userId },
      { userRoles: { some: { user_id: userId } } },
    ],
  };
}

/**
 * Résout le filtre de périmètre depuis le user JWT (async, requête DB).
 * - Si l'utilisateur a 'project:read:all' → null (accès global)
 * - Sinon → filtre restreint aux projets auxquels il est rattaché
 */
export async function getProjectAccessFilter(user: any): Promise<any | null> {
  if (!user?.id) return null;
  const permissions = await RbacService.getUserPermissions(user.id);
  return buildProjectScopeWhere(user.id, permissions.includes('project:read:all'));
}
