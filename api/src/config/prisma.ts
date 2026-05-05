import { PrismaClient } from "@prisma/client";
import { TenantContext } from './tenant-context.js';

const realPrisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL || "sqlserver://localhost:1433;database=mydb;user=sa;password=mypassword;encrypt=true"
});

// Adapter: Mock la BD localement si SQL Server n'est pas dispo
const inMemoryDb = {
  users: [] as any[],
  sessions: [] as any[]
};

/**
 * List of models that have a tenant_id field and should be isolated.
 */
const MULTI_TENANT_MODELS = [
  'user', 'resource', 'project', 'projectLot', 'wBSNode', 'task', 'taskAssignment',
  'supplier', 'tender', 'purchaseOrder', 'delivery', 'inventoryItem', 'materialConsumption',
  'contract', 'contractLineItem', 'changeOrder', 'rFI', 'submittal', 'budgetLine',
    'invoice', 'payment', 'situationTravaux', 'controlReport', 'workAcceptance', 'incident', 'document',
  'documentVersion', 'photo', 'documentExchange', 'workflowDefinition', 'workflowStep',
  'workflowTransition', 'workflowInstance', 'workflowAction', 'auditLog', 'dailyLog',
  'inspection', 'punchItem', 'meeting', 'costTransaction', 'weeklyReport', 'role', 'userRole',
    'goodsReceipt', 'goodsReceiptItem', 'warehouse', 'warehouseLocation', 'inventoryBalance',
    'inventoryValuationLayer', 'inventoryCostSnapshot', 'purchaseOrderLine', 'x3SyncState', 'x3SyncJob'
];

function validateSituationTravauxPayload(payload: any, existing?: any) {
    const merged = existing ? { ...existing, ...payload } : { ...payload };

    const hasContract = merged.contract_id !== null && merged.contract_id !== undefined;
    const hasPurchaseOrder = merged.purchase_order_id !== null && merged.purchase_order_id !== undefined;
    if (!hasContract && !hasPurchaseOrder) {
        throw new Error("SituationTravaux invalid: either contract_id or purchase_order_id is required.");
    }

    if (merged.period_start && merged.period_end) {
        const start = new Date(merged.period_start);
        const end = new Date(merged.period_end);
        if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end < start) {
            throw new Error("SituationTravaux invalid: period_end must be greater than or equal to period_start.");
        }
    }

    if (merged.reception_pct !== null && merged.reception_pct !== undefined) {
        const receptionPct = Number(merged.reception_pct);
        if (Number.isNaN(receptionPct) || receptionPct < 0 || receptionPct > 100) {
            throw new Error("SituationTravaux invalid: reception_pct must be between 0 and 100.");
        }
    }

    const amountFields = [
        'amount_global',
        'amount_proposed',
        'amount_accorded',
        'cumul_paid_before',
        'amount_paid_current',
        'balance_to_pay',
        'remaining_to_receive',
    ];

    for (const field of amountFields) {
        if (merged[field] !== null && merged[field] !== undefined) {
            const value = Number(merged[field]);
            if (Number.isNaN(value) || value < 0) {
                throw new Error(`SituationTravaux invalid: ${field} must be a non-negative number.`);
            }
        }
    }

    if (merged.status === 'APPROVED') {
        if (merged.approved_by === null || merged.approved_by === undefined) {
            throw new Error("SituationTravaux invalid: approved_by is required when status is APPROVED.");
        }
        if (!merged.approved_at) {
            payload.approved_at = new Date();
        }
    }
}

/**
 * Automatically injects tenant_id filter if present in context
 */
function applyTenantFilter(model: string, args: any) {
  if (!MULTI_TENANT_MODELS.includes(model)) return args;
  
  const tenantId = TenantContext.getTenantId();
  if (!tenantId) return args;

  const newArgs = { ...args };
  if (!newArgs.where) newArgs.where = {};
  
  if (newArgs.where.tenant_id === undefined) {
      if (['role', 'userRole'].includes(model)) {
          // These models can have global entries (tenant_id null)
          newArgs.where.OR = [
              { tenant_id: tenantId },
              { tenant_id: null }
          ];
      } else {
          newArgs.where.tenant_id = tenantId;
      }
  }
  return newArgs;
}

/**
 * Automatically injects tenant_id for creation
 */
function applyTenantData(model: string, args: any) {
    if (!MULTI_TENANT_MODELS.includes(model)) return args;

    const tenantId = TenantContext.getTenantId();
    if (!tenantId) return args;

    const newArgs = { ...args };
    if (!newArgs.data) newArgs.data = {};
    if (newArgs.data.tenant_id === undefined) {
        newArgs.data.tenant_id = tenantId;
    }
    return newArgs;
}

export const prisma = new Proxy(realPrisma, {
  get(target: any, prop: string) {
    if (prop === 'user') {
      return {
        findFirst: async (args: any) => {
          const filteredArgs = applyTenantFilter('user', args);
          try {
            return await target.user.findFirst(filteredArgs);
          } catch (e) {
            console.log("Using Mock DB for user.findFirst due to DB connection error");
            const emailOrUsername = filteredArgs.where?.OR?.[0]?.email || filteredArgs.where?.email;
            return inMemoryDb.users.find(u => (u.email === emailOrUsername || u.username === emailOrUsername) && (u.tenant_id === filteredArgs.where.tenant_id || !filteredArgs.where.tenant_id));
          }
        },
        create: async (args: any) => {
          const dataArgs = applyTenantData('user', args);
          try {
            return await target.user.create(dataArgs);
          } catch (e) {
            console.log("Using Mock DB for user.create due to DB connection error");
            const newUser = { id: inMemoryDb.users.length + 1, ...dataArgs.data, userRoles: [{ role: { code: dataArgs.data.roleCode || 'CHEF_PROJET' } }] };
            inMemoryDb.users.push(newUser);
            return newUser;
          }
        },
        findUnique: async (args: any) => {
            const result = await realPrisma.user.findUnique(args).catch(() => inMemoryDb.users.find(u => u.id === args.where.id || u.email === args.where.email));
            const tenantId = TenantContext.getTenantId();
            if (result && result.tenant_id && tenantId && result.tenant_id !== tenantId) {
                return null;
            }
            return result;
        },
        upsert: async (args: any) => {
          try { return await target.user.upsert(args); } catch(e) {
            const user = inMemoryDb.users.find(u => u.email === args.where.email || u.username === args.where.username);
            if (user) return user;
            const newUser = { id: inMemoryDb.users.length + 1, ...args.create, userRoles: [{ role: { code: 'CHEF_PROJET' } }] };
            inMemoryDb.users.push(newUser);
            return newUser;
          }
        },
        findMany: async (args?: any) => {
          const filteredArgs = applyTenantFilter('user', args || {});
          try {
            return await target.user.findMany(filteredArgs);
          } catch (e) {
            console.log("Using Mock DB for user.findMany due to DB connection error");
            const tenantId = TenantContext.getTenantId();
            return inMemoryDb.users.filter((u: any) => !tenantId || u.tenant_id === tenantId);
          }
        },        update: async (args: any) => {
          const tenantId = TenantContext.getTenantId();
          if (tenantId) {
              const existing = await target.user.findUnique({ where: args.where }).catch(() => inMemoryDb.users.find(u => u.id === args.where.id));
              if (existing && existing.tenant_id && existing.tenant_id !== tenantId) throw new Error("Forbidden cross-tenant update");
          }
          try { return await target.user.update(args); } catch (e) {
            const user = inMemoryDb.users.find(u => u.id === args.where.id);
            if (user) Object.assign(user, args.data);
            return user;
          }
        }
      };
    }
    if (prop === 'session') {
      return {
        create: async (args: any) => {
          try { return await target.session.create(args); } catch(e) {
            const newSession = { id: "mock-session-" + Date.now(), revoked: false, ...args.data };
            inMemoryDb.sessions.push(newSession);
            return newSession;
          }
        },
        findUnique: async (args: any) => {
          try { return await target.session.findUnique(args); } catch(e) {
             const session = inMemoryDb.sessions.find(s => s.id === args.where.id);
             return session || { id: args.where.id, revoked: false, expiresAt: new Date(Date.now() + 8*3600000) };
          }
        },
        update: async (args: any) => {
          try { return await target.session.update(args); } catch(e) {
            const session = inMemoryDb.sessions.find(s => s.id === args.where.id);
            if (session) Object.assign(session, args.data);
            return session || { id: args.where.id, ...args.data };
          }
        }
      }
    }
    if (prop === 'tenant') {
        return {
            findFirst: async () => {
                try { return await target.tenant.findFirst(); } catch(e) { return { id: 1, name: process.env.SEED_TENANT_NAME ?? 'SOREPCO' }; }
            },
            create: async (args: any) => {
                try { return await target.tenant.create(args); } catch(e) { return { id: 1, name: process.env.SEED_TENANT_NAME ?? 'SOREPCO' }; }
            },
            findUnique: async (args: any) => {
                try { return await target.tenant.findUnique(args); } catch(e) { return null; }
            },
            findMany: async (args?: any) => {
                try { return await target.tenant.findMany(args); } catch(e) { return []; }
            },
            count: async (args?: any) => {
                try { return await target.tenant.count(args); } catch(e) { return 0; }
            },
            update: async (args: any) => {
                try { return await target.tenant.update(args); } catch(e) { return args?.data ?? null; }
            },
            delete: async (args: any) => {
                try { return await target.tenant.delete(args); } catch(e) { return null; }
            },
        }
    }
    
    if (prop === 'role') {
        return {
            findUnique: async(args: any) => { try { return await target.role.findUnique(args); } catch(e) { return { id: 1, code: args?.where?.code || "CHEF_PROJET", name: args?.where?.code || "CHEF_PROJET" }; }},
            findFirst: async(args?: any) => { try { return await target.role.findFirst(args); } catch(e) { return null; }},
            findMany: async(args?: any) => { try { return await target.role.findMany(args); } catch(e) { return []; }},
            create: async(args: any) => { try { return await target.role.create(args); } catch(e) { return { id: Date.now(), ...args?.data }; }},
            upsert: async(args: any) => { try { return await target.role.upsert(args); } catch(e) { return { id: 1, code: args?.create?.code || "CHEF_PROJET", name: args?.create?.name || "N/A" }; }},
            update: async(args: any) => { try { return await target.role.update(args); } catch(e) { return args?.data; }},
            delete: async(args: any) => { try { return await target.role.delete(args); } catch(e) { return null; }},
        }
    }
    if (prop === 'project') {
        return {
            findMany: async (args?: any) => {
                const filteredArgs = applyTenantFilter('project', args || {});
                try { return await target.project.findMany(filteredArgs); } catch(e) { return []; }
            },
            findFirst: async (args?: any) => {
                const filteredArgs = applyTenantFilter('project', args || {});
                try { return await target.project.findFirst(filteredArgs); } catch(e) { return null; }
            },
            findUnique: async (args: any) => {
                try {
                    const result = await target.project.findUnique(args);
                    const tenantId = TenantContext.getTenantId();
                    if (result && tenantId && result.tenant_id !== tenantId) return null;
                    return result;
                } catch(e) { return null; }
            },
            count: async (args?: any) => {
                const filteredArgs = applyTenantFilter('project', args || {});
                try { return await target.project.count(filteredArgs); } catch(e) { return 0; }
            },
            aggregate: async (args?: any) => {
                const filteredArgs = applyTenantFilter('project', args || {});
                try { return await target.project.aggregate(filteredArgs); } catch(e) {
                    return { _sum: { budget_approved: null, budget_spent: null, budget_committed: null }, _count: { id: 0 } };
                }
            },
            groupBy: async (args: any) => {
                const filteredArgs = applyTenantFilter('project', args || {});
                try { return await target.project.groupBy(filteredArgs); } catch(e) { return []; }
            },
            create: async (args: any) => {
                const dataArgs = applyTenantData('project', args);
                try { return await target.project.create(dataArgs); } catch(e) { throw e; }
            },
            update: async (args: any) => {
                try { return await target.project.update(args); } catch(e) { throw e; }
            },
            delete: async (args: any) => {
                try { return await target.project.delete(args); } catch(e) { throw e; }
            },
            upsert: async (args: any) => {
                try { return await target.project.upsert(args); } catch(e) { return { id: 1, ...args?.create }; }
            },
        }
    }
    if (prop === 'userRole') {
        return {
            create: async(args: any) => { try { return await target.userRole.create(args); } catch(e) { return args.data; }},
            findFirst: async(args?: any) => { 
                try { return await target.userRole.findFirst(args); } catch(e) { 
                    const user = inMemoryDb.users.find(u => u.id === args?.where?.user_id);
                    return user?.userRoles?.[0] || null;
                }
            },
            findMany: async(args?: any) => { 
                try { return await target.userRole.findMany(args); } catch(e) { 
                    const user = inMemoryDb.users.find(u => u.id === args?.where?.user_id);
                    return user ? user.userRoles || [] : [];
                }
            },
            upsert: async(args: any) => { try { return await target.userRole.upsert(args); } catch(e) { return args?.create || args?.update || {}; }},
            delete: async(args: any) => { try { return await target.userRole.delete(args); } catch(e) { return null; }},
            deleteMany: async(args: any) => { try { return await target.userRole.deleteMany(args); } catch(e) { return { count: 0 }; }},
        }
    }
    
    if (prop === 'projectLot') {
        return {
            findMany: async (args?: any) => {
                const filteredArgs = applyTenantFilter('projectLot', args || {});
                try { return await target.projectLot.findMany(filteredArgs); } catch(e) { return []; }
            },
            findFirst: async (args?: any) => {
                const filteredArgs = applyTenantFilter('projectLot', args || {});
                try { return await target.projectLot.findFirst(filteredArgs); } catch(e) { return null; }
            },
            findUnique: async (args: any) => {
                try { return await target.projectLot.findUnique(args); } catch(e) { return null; }
            },
            count: async (args?: any) => {
                const filteredArgs = applyTenantFilter('projectLot', args || {});
                try { return await target.projectLot.count(filteredArgs); } catch(e) { return 0; }
            },
            // Write operations: propagate the real Prisma error instead of returning null
            create: async (args: any) => {
                return await target.projectLot.create(args);
            },
            update: async (args: any) => {
                return await target.projectLot.update(args);
            },
            delete: async (args: any) => {
                return await target.projectLot.delete(args);
            },
            deleteMany: async (args: any) => {
                return await target.projectLot.deleteMany(args);
            },
        };
    }

    if (prop === 'resourceType') {
        return {
            findMany: async (args?: any) => {
                try { return await target.resourceType.findMany(args); } catch(e) { return []; }
            },
            findUnique: async (args: any) => {
                try { return await target.resourceType.findUnique(args); } catch(e) { return null; }
            },
            create: async (args: any) => {
                return await target.resourceType.create(args);
            },
            upsert: async (args: any) => {
                return await target.resourceType.upsert(args);
            },
        };
    }

    if (prop === 'resource') {
        return {
            findMany: async (args?: any) => {
                const filteredArgs = applyTenantFilter('resource', args || {});
                try { return await target.resource.findMany(filteredArgs); } catch(e) { return []; }
            },
            findUnique: async (args: any) => {
                try {
                    const result = await target.resource.findUnique(args);
                    const tenantId = TenantContext.getTenantId();
                    if (result && tenantId && result.tenant_id !== tenantId) return null;
                    return result;
                } catch(e) { return null; }
            },
            create: async (args: any) => {
                const dataArgs = applyTenantData('resource', args);
                return await target.resource.create(dataArgs);
            },
            update: async (args: any) => {
                return await target.resource.update(args);
            },
            delete: async (args: any) => {
                return await target.resource.delete(args);
            },
        };
    }

    // Proxy functions to inject tenant isolation
    const original = target[prop];
    if (original && typeof original === 'object' && !['tenant', 'session'].includes(prop)) {
        return new Proxy(original, {
            get(subTarget, subProp) {
                const subOriginal = (subTarget as any)[subProp];
                if (typeof subOriginal === 'function') {
                    return async (...args: any[]) => {
                        let finalArgs = args[0] || {};
                        const tenantId = TenantContext.getTenantId();
                        
                        if (['findMany', 'findFirst', 'count', 'aggregate', 'groupBy'].includes(subProp as string)) {
                            finalArgs = applyTenantFilter(prop, finalArgs);
                        } else if (['create', 'createMany'].includes(subProp as string)) {
                            finalArgs = applyTenantData(prop, finalArgs);
                        } else if (['update', 'delete', 'updateMany', 'deleteMany', 'upsert'].includes(subProp as string)) {
                            if (subProp.toString().endsWith('Many')) {
                                finalArgs = applyTenantFilter(prop, finalArgs);
                            } else if (tenantId) {
                                // Verification before single update/delete/upsert
                                const existing = await (subTarget as any).findUnique({ where: finalArgs.where }).catch(() => null);
                                if (existing && existing.tenant_id && existing.tenant_id !== tenantId) {
                                    throw new Error(`Unauthorized cross-tenant operation on ${prop}`);
                                }
                                if (subProp === 'upsert' && finalArgs.create) {
                                  finalArgs.create.tenant_id = tenantId;
                                }
                                if (finalArgs.data && finalArgs.data.tenant_id === undefined) {
                                  finalArgs.data.tenant_id = tenantId;
                                }
                            }
                        } else if (subProp === 'findUnique') {
                            const result = await subOriginal.apply(subTarget, args).catch(() => null);
                            if (result && result.tenant_id && tenantId && result.tenant_id !== tenantId) {
                                return null;
                            }
                            return result;
                        }

                        if (prop === 'situationTravaux') {
                            if (subProp === 'create' && finalArgs.data) {
                                validateSituationTravauxPayload(finalArgs.data);
                            }

                            if (subProp === 'update' && finalArgs.data) {
                                const existingSituation = await (subTarget as any)
                                    .findUnique({ where: finalArgs.where })
                                    .catch(() => null);
                                validateSituationTravauxPayload(finalArgs.data, existingSituation);
                            }

                            if (subProp === 'upsert') {
                                const existingSituation = await (subTarget as any)
                                    .findUnique({ where: finalArgs.where })
                                    .catch(() => null);

                                if (existingSituation) {
                                    if (finalArgs.update) {
                                        validateSituationTravauxPayload(finalArgs.update, existingSituation);
                                    }
                                } else if (finalArgs.create) {
                                    validateSituationTravauxPayload(finalArgs.create);
                                }
                            }
                        }

                        try { return await subOriginal.apply(subTarget, [finalArgs]); } catch(e) { 
                            // Special check for user model which is heavily mocked
                            if (prop === 'user') {
                                // The original code for user was already quite specific, let's try to find if it corresponds to one of the mocks
                                console.log(`User mock fallback for ${subProp.toString()}`);
                            }
                            console.error(`Mock fallback for ${prop}.${subProp.toString()}`); 
                            return subProp.toString().includes('Many') ? [] : null; 
                        }
                    };
                }
                return subOriginal;
            }
        });
    }

    if (typeof original === 'function') {
        return async (...args: any[]) => {
            try { return await original.apply(target, args); } catch(e) { console.error("Mock fallback for", prop); return []; }
        }
    }
    return original;
  }
});
