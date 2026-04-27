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
  'invoice', 'payment', 'controlReport', 'workAcceptance', 'incident', 'document',
  'documentVersion', 'photo', 'documentExchange', 'workflowDefinition', 'workflowStep',
  'workflowTransition', 'workflowInstance', 'workflowAction', 'auditLog', 'dailyLog',
  'inspection', 'punchItem', 'meeting', 'costTransaction', 'weeklyReport', 'role', 'userRole',
  'goodsReceipt', 'goodsReceiptItem'
];

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

        update: async (args: any) => {
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
                try { return await target.tenant.findFirst(); } catch(e) { return { id: 1, name: "Default Tenant" }; }
            },
            create: async (args: any) => {
                try { return await target.tenant.create(args); } catch(e) { return { id: 1, name: "Default Tenant" }; }
            }
        }
    }
    
    if (prop === 'role') {
        return {
            findUnique: async(args: any) => { try { return await target.role.findUnique(args); } catch(e) { return { id: 1, code: args?.where?.code || "CHEF_PROJET" }; }},
            create: async(args: any) => { try { return await target.role.create(args); } catch(e) { return { id: 1, code: args?.data?.code || "CHEF_PROJET" }; }},
            upsert: async(args: any) => { try { return await target.role.upsert(args); } catch(e) { return { id: 1, code: args?.create?.code || "CHEF_PROJET" }; }}
        }
    }
    if (prop === 'project') {
        return {
            findMany: async(args?: any) => { try { return await target.project.findMany(args); } catch(e) { return []; }},
            upsert: async(args: any) => { try { return await target.project.upsert(args); } catch(e) { return { id: 1, ...args?.create }; }}
        }
    }
    if (prop === 'userRole') {
        return {
            create: async(args: any) => { try { return await target.userRole.create(args); } catch(e) { return args.data; }},
            findMany: async(args: any) => { 
                try { return await target.userRole.findMany(args); } catch(e) { 
                    const user = inMemoryDb.users.find(u => u.id === args?.where?.user_id);
                    return user ? user.userRoles || [] : [];
                }
            }
        }
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
