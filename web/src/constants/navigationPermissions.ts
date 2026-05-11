export const NAV_PERMISSION_GROUPS = {
  dashboard: ["project:read", "project:read:all", "task:read", "incident:read", "incident:read:all", "report:read", "report:read:all", "budget:read"],
  projects: ["project:read", "project:read:all"],
  workflow: ["purchase-order:approve", "change-order:approve", "control-report:approve", "invoice:approve", "budget:update"],
  resources: ["resource:read"],
  procurement: ["tender:read", "supplier:read", "purchase-order:read", "delivery:read", "goods-receipt:read", "warehouse:read", "stock:read", "erp-sync:read"],
  tasks: ["task:read"],
  reporting: ["daily-log:read", "daily-log:read:all", "report:read", "report:read:all", "control-report:read", "control-report:read:all"],
  incidents: ["incident:read", "incident:read:all"],
  executionNotes: ["execution-note:read"],
  inspections: ["inspection:read", "inspection:read:all"],
  punchList: ["punch-item:read", "punch-item:read:all"],
  receptions: ["work-acceptance:read"],
  finance: ["contract:read", "change-order:read", "invoice:read", "payment:read", "situation-travaux:read"],
  documents: ["document:read"],
  meetings: ["meeting:read", "meeting:read:all"],
  rfi: ["rfi:read", "rfi:read:all"],
  controlReports: ["control-report:read", "control-report:read:all"],
  settings: ["user:read", "role:read", "permission:read", "tenant:read", "resource:read"],

  procurementTabs: {
    tenders: ["tender:read"],
    suppliers: ["supplier:read"],
    orders: ["purchase-order:read"],
    deliveries: ["delivery:read", "goods-receipt:read"],
    inventory: ["warehouse:read", "stock:read"],
    x3sync: ["erp-sync:read"],
  },

  financeTabs: {
    contracts: ["contract:read"],
    changeOrders: ["change-order:read"],
    situations: ["situation-travaux:read"],
    invoices: ["invoice:read"],
    payments: ["payment:read"],
  },

  reportingTabs: {
    daily: ["daily-log:read", "daily-log:read:all"],
    weekly: ["report:read", "report:read:all"],
    control: ["control-report:read", "control-report:read:all"],
  },
} as const;
