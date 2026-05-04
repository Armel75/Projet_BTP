/**
 * SOURCE OF TRUTH — Permissions catalog
 *
 * Format  : resource:action
 * Resource: nom du modèle Prisma normalisé (kebab-case)
 * Action  : create | read | update | delete | approve | validate | manage | assign-role | assign-permission
 *
 * ⚠️  Ce fichier est la SEULE définition des permissions.
 *     Aucune permission ne doit être écrite en dur ailleurs dans le code.
 *     Pour ajouter une permission : l'ajouter ici uniquement.
 */

// ─── Structure déclarative ────────────────────────────────────────────────────

export const PERMISSIONS = {
  // ── RBAC & USER MANAGEMENT ─────────────────────────────────────────────────
  // Modèles : User, Role, Permission, UserRole, RolePermission
  user:             ['create', 'read', 'update', 'delete', 'assign-role'],
  role:             ['create', 'read', 'update', 'delete', 'assign-permission'],
  permission:       ['create', 'read', 'update', 'delete'],

  // ── PROJECT CORE ───────────────────────────────────────────────────────────
  // Modèles : Project, ProjectLot, WBSNode, Resource, Task, TaskAssignment
  project:          ['create', 'read', 'update', 'delete'],
  'project-lot':    ['create', 'read', 'update', 'delete'],
  wbs:              ['create', 'read', 'update', 'delete'],
  resource:         ['create', 'read', 'update', 'delete'],
  task:             ['create', 'read', 'update', 'delete'],

  // ── PROCUREMENT ────────────────────────────────────────────────────────────
  // Modèles : Supplier, Tender, TenderBid, PurchaseOrder, Delivery,
  //           InventoryItem, ProjectStock, GoodsReceipt, StockMovement, MaterialConsumption
  supplier:         ['create', 'read', 'update', 'delete'],
  tender:           ['create', 'read', 'update', 'delete'],
  'purchase-order': ['create', 'read', 'update', 'delete', 'approve'],
  delivery:         ['create', 'read', 'update'],
  inventory:        ['create', 'read', 'update', 'delete'],
  warehouse:        ['create', 'read', 'update', 'delete'],
  'warehouse-location': ['create', 'read', 'update', 'delete'],
  stock:            ['read', 'update'],
  'goods-receipt':  ['create', 'read'],
  'erp-sync':       ['read', 'manage'],

  // ── CONTRACTS & ENGINEERING ────────────────────────────────────────────────
  // Modèles : Contract, ContractLineItem, ChangeOrder, RFI, Submittal
  contract:         ['create', 'read', 'update', 'delete'],
  'change-order':   ['create', 'read', 'update', 'approve'],
  rfi:              ['create', 'read', 'update'],
  submittal:        ['create', 'read', 'update'],

  // ── FINANCE ────────────────────────────────────────────────────────────────
  // Modèles : BudgetLine, Invoice, Payment, CostTransaction
  budget:           ['create', 'read', 'update'],
  invoice:          ['create', 'read', 'update', 'approve'],
  payment:          ['create', 'read'],

  // ── REPORTING ──────────────────────────────────────────────────────────────
  // Modèles : WeeklyReport, ControlReport, WorkAcceptance
  report:           ['create', 'read', 'update', 'validate'],
  'control-report': ['create', 'read', 'update', 'approve'],
  'work-acceptance':['create', 'read', 'approve'],

  // ── SITE OPERATIONS ────────────────────────────────────────────────────────
  // Modèles : DailyLog, Inspection, Incident, PunchItem, Meeting
  'daily-log':      ['create', 'read', 'update', 'delete'],
  inspection:       ['create', 'read', 'update', 'delete'],
  incident:         ['create', 'read', 'update', 'delete'],
  'punch-item':     ['create', 'read', 'update', 'delete'],
  meeting:          ['create', 'read', 'update'],

  // ── DOCUMENTS ──────────────────────────────────────────────────────────────
  // Modèles : Document, DocumentVersion, Photo, DocumentExchange
  document:         ['create', 'read', 'update', 'delete'],

  // ── WORKFLOW ───────────────────────────────────────────────────────────────
  // Modèles : WorkflowDefinition, WorkflowInstance, WorkflowStep, WorkflowAction
  workflow:         ['create', 'read', 'manage'],

  // ── AUDIT ──────────────────────────────────────────────────────────────────
  // Modèle : AuditLog (lecture seule — jamais de modification)
  'audit-log':      ['read'],

  // ── TENANT MANAGEMENT ──────────────────────────────────────────────────────
  // Modèle : Tenant — réservé aux GESTIONNAIRE_SYSTEME
  tenant:           ['create', 'read', 'update', 'delete'],
} as const;

// ─── Types ───────────────────────────────────────────────────────────────────

export type Resource = keyof typeof PERMISSIONS;
export type PermissionCode = string;

// ─── Labels (FR) pour affichage dans l'UI RBAC ───────────────────────────────

const ACTION_LABELS: Record<string, string> = {
  create:              'Créer',
  read:                'Voir',
  update:              'Modifier',
  delete:              'Supprimer',
  approve:             'Approuver',
  validate:            'Valider',
  manage:              'Gérer',
  'assign-role':       'Assigner un rôle',
  'assign-permission': 'Assigner une permission',
};

const RESOURCE_LABELS: Record<string, string> = {
  user:              'utilisateur',
  role:              'rôle',
  permission:        'permission',
  project:           'projet',
  'project-lot':     'lot de projet',
  wbs:               'nœud WBS',
  resource:          'ressource',
  task:              'tâche',
  supplier:          'fournisseur',
  tender:            "appel d'offres",
  'purchase-order':  'bon de commande',
  delivery:          'livraison',
  inventory:         "article d'inventaire",
  warehouse:         'magasin',
  'warehouse-location': 'emplacement de magasin',
  stock:             'stock projet',
  'goods-receipt':   'bon de réception',
  'erp-sync':        'synchronisation ERP',
  contract:          'contrat',
  'change-order':    'avenant',
  rfi:               'RFI',
  submittal:         'soumission',
  budget:            'ligne budgétaire',
  invoice:           'facture',
  payment:           'paiement',
  report:            'rapport hebdomadaire',
  'control-report':  'rapport de contrôle',
  'work-acceptance': 'réception de travaux',
  'daily-log':       'journal de chantier',
  inspection:        'inspection',
  incident:          'incident',
  'punch-item':      'punch list',
  meeting:           'réunion',
  document:          'document',
  workflow:          'workflow',
  'audit-log':       "journal d'audit",
};

// ─── Exports calculés ─────────────────────────────────────────────────────────

/**
 * Liste plate de tous les codes de permissions (ex: "user:read")
 * Utilisée pour les comparaisons rapides côté frontend.
 */
export const PERMISSION_CODES: PermissionCode[] = Object.entries(PERMISSIONS).flatMap(
  ([resource, actions]) => (actions as readonly string[]).map(action => `${resource}:${action}`)
);

/**
 * Catalogue complet { code, label } — source utilisée par le seed et le service de sync.
 * Label généré automatiquement en français depuis ACTION_LABELS et RESOURCE_LABELS.
 */
export const PERMISSION_CATALOG: { code: string; label: string }[] = Object.entries(PERMISSIONS).flatMap(
  ([resource, actions]) =>
    (actions as readonly string[]).map(action => ({
      code:  `${resource}:${action}`,
      label: `${ACTION_LABELS[action] ?? action} ${RESOURCE_LABELS[resource] ?? resource}`,
    }))
);
