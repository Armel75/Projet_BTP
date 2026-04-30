/**
 * SOURCE OF TRUTH — Catalogue des rôles et leurs permissions.
 *
 * Ce fichier est la SEULE définition des rôles.
 * Utilisé par :
 *  - seed.controller.ts (endpoint POST /api/v1/seed — dev/reset)
 *  - seed-users-sync.service.ts (démarrage automatique du serveur)
 *
 * Pour ajouter un rôle ou modifier ses permissions : modifier uniquement ce fichier.
 */

import { PERMISSION_CATALOG } from '../config/permissions.js';

export interface RoleDef {
  code:        string;
  name:        string;
  description: string;
  permissions: string[];
}

export const ROLE_CATALOG: RoleDef[] = [
  {
    code:        "GESTIONNAIRE_SYSTEME",
    name:        "Gestionnaire Système",
    description: "Accès complet à toutes les fonctionnalités de gestion",
    permissions: PERMISSION_CATALOG.map(p => p.code), // toutes les permissions
  },
  {
    code:        "DG",
    name:        "Direction Générale",
    description: "Accès lecture globale + approbation financière et contractuelle complète",
    permissions: [
      "user:read", "role:read", "permission:read",
      "project:read", "project-lot:read", "wbs:read", "resource:read", "task:read",
      "supplier:read", "tender:read",
      "purchase-order:read", "purchase-order:approve",
      "delivery:read", "inventory:read", "stock:read", "goods-receipt:read",
      "contract:read", "change-order:read", "change-order:approve",
      "rfi:read", "submittal:read",
      "budget:read", "invoice:read", "invoice:approve", "payment:read",
      "report:read", "report:validate",
      "control-report:read",
      "work-acceptance:read", "work-acceptance:approve",
      "daily-log:read", "inspection:read", "incident:read",
      "punch-item:read", "meeting:read",
      "document:read",
      "workflow:read", "audit-log:read",
      "tenant:read",
    ],
  },
  {
    code:        "SG",
    name:        "Secrétariat Général",
    description: "Gestion administrative : documents, réunions, courriers et suivi",
    permissions: [
      "user:read",
      "project:read", "project-lot:read", "task:read",
      "budget:read", "invoice:read", "payment:read",
      "report:read", "control-report:read",
      "incident:read", "inspection:read", "punch-item:read",
      "meeting:create", "meeting:read", "meeting:update",
      "document:create", "document:read", "document:update",
      "rfi:read", "submittal:read",
    ],
  },
  {
    code:        "DIRECTEUR",
    name:        "Directeur",
    description: "Accès lecture globale + approbation sur tous les domaines",
    permissions: [
      "user:read", "role:read", "permission:read",
      "project:read", "project-lot:read", "wbs:read", "resource:read", "task:read",
      "supplier:read", "tender:read",
      "purchase-order:read", "purchase-order:approve",
      "delivery:read", "inventory:read", "stock:read", "goods-receipt:read",
      "contract:read", "change-order:read", "change-order:approve",
      "rfi:read", "submittal:read",
      "budget:read", "invoice:read", "invoice:approve", "payment:read",
      "report:read", "report:validate", "control-report:read",
      "work-acceptance:read", "work-acceptance:approve",
      "daily-log:read", "inspection:read", "incident:read",
      "punch-item:read", "meeting:read",
      "document:read",
      "workflow:read", "audit-log:read",
    ],
  },
  {
    code:        "CHEF_PROJET",
    name:        "Chef de Projet",
    description: "Gestion complète d'un projet et de son équipe",
    permissions: [
      "user:read",
      "project:create", "project:read", "project:update",
      "project-lot:create", "project-lot:read", "project-lot:update",
      "wbs:create", "wbs:read", "wbs:update",
      "resource:create", "resource:read", "resource:update",
      "task:create", "task:read", "task:update",
      "supplier:create", "supplier:read", "supplier:update",
      "tender:create", "tender:read", "tender:update",
      "purchase-order:create", "purchase-order:read", "purchase-order:update",
      "delivery:create", "delivery:read",
      "inventory:create", "inventory:read",
      "stock:read", "goods-receipt:create", "goods-receipt:read",
      "contract:create", "contract:read", "contract:update",
      "change-order:create", "change-order:read", "change-order:update",
      "rfi:create", "rfi:read", "rfi:update",
      "submittal:create", "submittal:read", "submittal:update",
      "budget:create", "budget:read", "budget:update",
      "invoice:create", "invoice:read", "payment:read",
      "report:create", "report:read", "report:update",
      "control-report:create", "control-report:read",
      "work-acceptance:create", "work-acceptance:read",
      "daily-log:create", "daily-log:read", "daily-log:update",
      "inspection:create", "inspection:read", "inspection:update",
      "incident:create", "incident:read", "incident:update",
      "punch-item:create", "punch-item:read", "punch-item:update",
      "meeting:create", "meeting:read", "meeting:update",
      "document:create", "document:read", "document:update",
    ],
  },
  {
    code:        "CONDUCTEUR_TRAVAUX",
    name:        "Conducteur de Travaux",
    description: "Suivi opérationnel du chantier",
    permissions: [
      "project:read", "task:read", "task:update", "resource:read",
      "delivery:read", "inventory:read", "stock:read",
      "budget:read",
      "report:create", "report:read",
      "control-report:read",
      "daily-log:create", "daily-log:read", "daily-log:update",
      "inspection:create", "inspection:read", "inspection:update",
      "incident:create", "incident:read", "incident:update",
      "punch-item:create", "punch-item:read", "punch-item:update",
      "document:read",
    ],
  },
];
