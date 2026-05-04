import { prisma } from "../config/prisma.js";
import { TenantContext } from "../config/tenant-context.js";
import { env } from "../config/env.js";
import { SageX3Client } from "./sage-x3.client.js";

type SyncEntity = "SUPPLIERS" | "ITEMS" | "PURCHASE_ORDERS";

function pick(row: Record<string, any>, keys: string[]): any {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== "") {
      return row[key];
    }
  }
  return null;
}

function normalizeDate(value: any): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalizeNumber(value: any, fallback = 0): number {
  if (value === null || value === undefined || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export class ProcurementX3SyncService {
  private static async startJob(entityName: SyncEntity) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error("Tenant session required");

    return prisma.x3SyncJob.create({
      data: {
        tenant_id: tenantId,
        entity_name: entityName,
        status: "RUNNING",
      },
    });
  }

  private static async finishJob(jobId: number, data: { status: "SUCCESS" | "FAILED"; rowsRead: number; rowsUpserted: number; rowsFailed: number; message?: string; }) {
    return prisma.x3SyncJob.update({
      where: { id: jobId },
      data: {
        status: data.status,
        ended_at: new Date(),
        rows_read: data.rowsRead,
        rows_upserted: data.rowsUpserted,
        rows_failed: data.rowsFailed,
        message: data.message,
      },
    });
  }

  private static async updateSyncState(entityName: SyncEntity, sourceUpdatedAt: Date | null, cursor: string | null, error?: string) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error("Tenant session required");

    return prisma.x3SyncState.upsert({
      where: {
        tenant_id_entity_name: {
          tenant_id: tenantId,
          entity_name: entityName,
        },
      },
      create: {
        tenant_id: tenantId,
        entity_name: entityName,
        last_success_at: error ? null : new Date(),
        last_source_updated_at: sourceUpdatedAt,
        last_source_cursor: cursor,
        sync_mode: "INCREMENTAL",
        last_error: error || null,
      },
      update: {
        last_success_at: error ? undefined : new Date(),
        last_source_updated_at: sourceUpdatedAt,
        last_source_cursor: cursor,
        last_error: error || null,
      },
    });
  }

  private static async getSyncState(entityName: SyncEntity) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error("Tenant session required");

    return prisma.x3SyncState.findUnique({
      where: {
        tenant_id_entity_name: {
          tenant_id: tenantId,
          entity_name: entityName,
        },
      },
    });
  }

  static async syncSuppliersFromX3(params: { createdBy: number; batchSize?: number; maxBatches?: number; }) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error("Tenant session required");

    const viewName = env.SAGE_X3_VIEW_SUPPLIERS || "dbo.vw_btp_suppliers";
    const state = await this.getSyncState("SUPPLIERS");
    const job = await this.startJob("SUPPLIERS");

    const batchSize = params.batchSize || 1000;
    const maxBatches = params.maxBatches || 20;

    let rowsRead = 0;
    let rowsUpserted = 0;
    let rowsFailed = 0;
    let lastSourceUpdatedAt = state?.last_source_updated_at || null;
    let lastCursor = state?.last_source_cursor || null;

    try {
      for (let i = 0; i < maxBatches; i += 1) {
        const rows = await SageX3Client.fetchBatchFromView(viewName, {
          batchSize,
          updatedAtColumn: "source_updated_at",
          cursorColumn: "external_id",
          lastUpdatedAt: lastSourceUpdatedAt,
          lastCursor,
        });

        if (!rows.length) break;
        rowsRead += rows.length;

        for (const row of rows) {
          try {
            const externalId = String(pick(row, ["external_id", "supplier_code", "BPRNUM", "bp_code", "code"]) || "").trim();
            const name = String(pick(row, ["name", "supplier_name", "BPRNAM", "bp_name"]) || "").trim();
            if (!externalId || !name) {
              rowsFailed += 1;
              continue;
            }

            const sourceUpdatedAt = normalizeDate(pick(row, ["source_updated_at", "updated_at", "UPDDAT", "last_modified"])) || new Date();

            const existing = await prisma.supplier.findFirst({
              where: {
                tenant_id: tenantId,
                external_system: "SAGE_X3",
                external_id: externalId,
              },
            });

            if (existing) {
              await prisma.supplier.update({
                where: { id: existing.id },
                data: {
                  name,
                  email: pick(row, ["email", "mail", "BPREML"]),
                  phone: pick(row, ["phone", "tel", "BPRTEL"]),
                  address: pick(row, ["address", "full_address", "BPRADR"]),
                  siret: pick(row, ["siret", "nif", "BPRCRN"]),
                  contact_name: pick(row, ["contact_name", "contact", "BPRNAM2"]),
                  specialty: pick(row, ["specialty", "category", "sector"]),
                  status: "ACTIVE",
                  source_updated_at: sourceUpdatedAt,
                  last_synced_at: new Date(),
                  sync_status: "SYNCED",
                },
              });
            } else {
              await prisma.supplier.create({
                data: {
                  tenant_id: tenantId,
                  name,
                  email: pick(row, ["email", "mail", "BPREML"]),
                  phone: pick(row, ["phone", "tel", "BPRTEL"]),
                  address: pick(row, ["address", "full_address", "BPRADR"]),
                  siret: pick(row, ["siret", "nif", "BPRCRN"]),
                  contact_name: pick(row, ["contact_name", "contact", "BPRNAM2"]),
                  specialty: pick(row, ["specialty", "category", "sector"]),
                  status: "ACTIVE",
                  external_system: "SAGE_X3",
                  external_id: externalId,
                  source_updated_at: sourceUpdatedAt,
                  last_synced_at: new Date(),
                  sync_status: "SYNCED",
                  created_by: params.createdBy,
                },
              });
            }

            rowsUpserted += 1;
            lastSourceUpdatedAt = sourceUpdatedAt;
            lastCursor = externalId;
          } catch {
            rowsFailed += 1;
          }
        }
      }

      await this.updateSyncState("SUPPLIERS", lastSourceUpdatedAt, lastCursor);
      await this.finishJob(job.id, { status: "SUCCESS", rowsRead, rowsUpserted, rowsFailed });
      return { rowsRead, rowsUpserted, rowsFailed, entity: "SUPPLIERS" as const };
    } catch (error: any) {
      await this.updateSyncState("SUPPLIERS", lastSourceUpdatedAt, lastCursor, error.message);
      await this.finishJob(job.id, {
        status: "FAILED",
        rowsRead,
        rowsUpserted,
        rowsFailed,
        message: error.message,
      });
      throw error;
    }
  }

  static async syncItemsFromX3(params: { createdBy: number; batchSize?: number; maxBatches?: number; }) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error("Tenant session required");

    const viewName = env.SAGE_X3_VIEW_ITEMS || "dbo.vw_btp_items";
    const state = await this.getSyncState("ITEMS");
    const job = await this.startJob("ITEMS");

    const batchSize = params.batchSize || 1000;
    const maxBatches = params.maxBatches || 20;

    let rowsRead = 0;
    let rowsUpserted = 0;
    let rowsFailed = 0;
    let lastSourceUpdatedAt = state?.last_source_updated_at || null;
    let lastCursor = state?.last_source_cursor || null;

    try {
      for (let i = 0; i < maxBatches; i += 1) {
        const rows = await SageX3Client.fetchBatchFromView(viewName, {
          batchSize,
          updatedAtColumn: "source_updated_at",
          cursorColumn: "external_id",
          lastUpdatedAt: lastSourceUpdatedAt,
          lastCursor,
        });

        if (!rows.length) break;
        rowsRead += rows.length;

        for (const row of rows) {
          try {
            const externalId = String(pick(row, ["external_id", "item_code", "ITMREF", "code"]) || "").trim();
            const name = String(pick(row, ["name", "item_name", "ITMDES", "description"]) || "").trim();
            if (!externalId || !name) {
              rowsFailed += 1;
              continue;
            }

            const sourceUpdatedAt = normalizeDate(pick(row, ["source_updated_at", "updated_at", "UPDDAT", "last_modified"])) || new Date();
            const code = String(pick(row, ["code", "item_code", "ITMREF", "external_id"]) || externalId);

            const existing = await prisma.inventoryItem.findFirst({
              where: {
                tenant_id: tenantId,
                external_system: "SAGE_X3",
                external_id: externalId,
              },
            });

            const payload = {
              code,
              name,
              description: pick(row, ["description", "ITMDES1", "ITMDES"]),
              unit: String(pick(row, ["unit", "UOM", "STU", "SAU"]) || "UN"),
              category: pick(row, ["category", "family", "CFI"]),
              unit_cost: normalizeNumber(pick(row, ["unit_cost", "cost", "avg_cost", "PRICOST"]), 0),
              costing_method: String(pick(row, ["costing_method", "valuation_method"]) || "CMUP").toUpperCase() === "FIFO" ? "FIFO" : "CMUP",
              source_updated_at: sourceUpdatedAt,
              last_synced_at: new Date(),
              sync_status: "SYNCED",
            };

            if (existing) {
              await prisma.inventoryItem.update({
                where: { id: existing.id },
                data: payload,
              });
            } else {
              await prisma.inventoryItem.create({
                data: {
                  tenant_id: tenantId,
                  external_system: "SAGE_X3",
                  external_id: externalId,
                  created_by: params.createdBy,
                  ...payload,
                },
              });
            }

            rowsUpserted += 1;
            lastSourceUpdatedAt = sourceUpdatedAt;
            lastCursor = externalId;
          } catch {
            rowsFailed += 1;
          }
        }
      }

      await this.updateSyncState("ITEMS", lastSourceUpdatedAt, lastCursor);
      await this.finishJob(job.id, { status: "SUCCESS", rowsRead, rowsUpserted, rowsFailed });
      return { rowsRead, rowsUpserted, rowsFailed, entity: "ITEMS" as const };
    } catch (error: any) {
      await this.updateSyncState("ITEMS", lastSourceUpdatedAt, lastCursor, error.message);
      await this.finishJob(job.id, {
        status: "FAILED",
        rowsRead,
        rowsUpserted,
        rowsFailed,
        message: error.message,
      });
      throw error;
    }
  }

  static async syncPurchaseOrdersFromX3(params: { createdBy: number; batchSize?: number; maxBatches?: number; }) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error("Tenant session required");

    const headerViewName = env.SAGE_X3_VIEW_PO_HEADERS || "dbo.vw_btp_po_headers";
    const lineViewName = env.SAGE_X3_VIEW_PO_LINES || "dbo.vw_btp_po_lines";

    const state = await this.getSyncState("PURCHASE_ORDERS");
    const job = await this.startJob("PURCHASE_ORDERS");

    const batchSize = params.batchSize || 500;
    const maxBatches = params.maxBatches || 20;

    let rowsRead = 0;
    let rowsUpserted = 0;
    let rowsFailed = 0;
    let lastSourceUpdatedAt = state?.last_source_updated_at || null;
    let lastCursor = state?.last_source_cursor || null;

    try {
      for (let i = 0; i < maxBatches; i += 1) {
        const headers = await SageX3Client.fetchBatchFromView(headerViewName, {
          batchSize,
          updatedAtColumn: "source_updated_at",
          cursorColumn: "external_id",
          lastUpdatedAt: lastSourceUpdatedAt,
          lastCursor,
        });

        if (!headers.length) break;
        rowsRead += headers.length;

        for (const header of headers) {
          try {
            const externalId = String(pick(header, ["external_id", "po_number", "POHNUM", "number"]) || "").trim();
            if (!externalId) {
              rowsFailed += 1;
              continue;
            }

            const supplierExternalId = String(pick(header, ["supplier_external_id", "supplier_code", "BPSNUM"]) || "").trim();
            const projectId = normalizeNumber(pick(header, ["project_id"]), 0);
            if (!supplierExternalId || !projectId) {
              rowsFailed += 1;
              continue;
            }

            const supplier = await prisma.supplier.findFirst({
              where: {
                tenant_id: tenantId,
                external_system: "SAGE_X3",
                external_id: supplierExternalId,
              },
            });

            if (!supplier) {
              rowsFailed += 1;
              continue;
            }

            const sourceUpdatedAt = normalizeDate(pick(header, ["source_updated_at", "updated_at", "UPDDAT"])) || new Date();
            const orderNumber = String(pick(header, ["number", "po_number", "POHNUM"]) || externalId);

            let order = await prisma.purchaseOrder.findFirst({
              where: {
                tenant_id: tenantId,
                external_system: "SAGE_X3",
                external_id: externalId,
              },
            });

            const orderData = {
              project_id: projectId,
              supplier_id: supplier.id,
              number: orderNumber,
              title: pick(header, ["title", "description", "po_title"]),
              total_amount: normalizeNumber(pick(header, ["total_amount", "amount", "AMTATI"]), 0),
              status: String(pick(header, ["status", "po_status", "app_status"]) || "APPROVED"),
              currency: String(pick(header, ["currency", "CUR", "CUR_0"]) || "EUR"),
              delivery_date: normalizeDate(pick(header, ["delivery_date", "expected_date"])),
              notes: pick(header, ["notes", "comment"]),
              source_updated_at: sourceUpdatedAt,
              last_synced_at: new Date(),
              sync_status: "SYNCED",
              is_external: true,
            };

            if (order) {
              order = await prisma.purchaseOrder.update({
                where: { id: order.id },
                data: orderData,
              });
            } else {
              order = await prisma.purchaseOrder.create({
                data: {
                  tenant_id: tenantId,
                  external_system: "SAGE_X3",
                  external_id: externalId,
                  created_by: params.createdBy,
                  ...orderData,
                },
              });
            }

            const lines = await SageX3Client.fetchBatchFromView(lineViewName, {
              batchSize: 2000,
              updatedAtColumn: "source_updated_at",
              cursorColumn: "external_line_id",
              lastUpdatedAt: null,
              lastCursor: null,
            });

            const filteredLines = lines.filter((line) => {
              const lineOrderRef = String(pick(line, ["order_external_id", "po_external_id", "POHNUM", "po_number"]) || "").trim();
              return lineOrderRef === externalId || lineOrderRef === orderNumber;
            });

            for (const line of filteredLines) {
              const lineExternalId = String(pick(line, ["external_line_id", "line_external_id", "line_id"]) || `${externalId}-${pick(line, ["line_no", "POLIN"]) || "0"}`);
              const lineNo = normalizeNumber(pick(line, ["line_no", "POLIN"]), 0);
              const itemExternalId = String(pick(line, ["item_external_id", "item_code", "ITMREF"]) || "").trim();

              const item = itemExternalId
                ? await prisma.inventoryItem.findFirst({
                    where: {
                      tenant_id: tenantId,
                      external_system: "SAGE_X3",
                      external_id: itemExternalId,
                    },
                  })
                : null;

              const qty = normalizeNumber(pick(line, ["quantity", "QTYUOM", "QTY"]), 0);
              const unitPrice = normalizeNumber(pick(line, ["unit_price", "NETPRI", "GROPRI"]), 0);
              const lineSourceUpdatedAt = normalizeDate(pick(line, ["source_updated_at", "updated_at", "UPDDAT"])) || sourceUpdatedAt;

              const existingLine = await prisma.purchaseOrderLine.findFirst({
                where: {
                  tenant_id: tenantId,
                  order_id: order.id,
                  line_no: lineNo,
                },
              });

              const lineData = {
                item_id: item?.id || null,
                item_code: String(pick(line, ["item_code", "ITMREF"]) || itemExternalId || ""),
                description: pick(line, ["description", "item_name", "ITMDES"]),
                unit: String(pick(line, ["unit", "SAU", "UOM"]) || "UN"),
                quantity: qty,
                unit_price: unitPrice,
                total_price: normalizeNumber(pick(line, ["total_price", "LINAMT"]), qty * unitPrice),
                quantity_remaining: normalizeNumber(pick(line, ["quantity_remaining", "remaining_qty"]), qty),
                delivery_date: normalizeDate(pick(line, ["delivery_date", "expected_date"])),
                external_system: "SAGE_X3",
                external_id: lineExternalId,
                source_updated_at: lineSourceUpdatedAt,
                last_synced_at: new Date(),
              };

              if (existingLine) {
                await prisma.purchaseOrderLine.update({
                  where: { id: existingLine.id },
                  data: lineData,
                });
              } else {
                await prisma.purchaseOrderLine.create({
                  data: {
                    order_id: order.id,
                    tenant_id: tenantId,
                    line_no: lineNo,
                    ...lineData,
                  },
                });
              }
            }

            rowsUpserted += 1;
            lastSourceUpdatedAt = sourceUpdatedAt;
            lastCursor = externalId;
          } catch {
            rowsFailed += 1;
          }
        }
      }

      await this.updateSyncState("PURCHASE_ORDERS", lastSourceUpdatedAt, lastCursor);
      await this.finishJob(job.id, { status: "SUCCESS", rowsRead, rowsUpserted, rowsFailed });
      return { rowsRead, rowsUpserted, rowsFailed, entity: "PURCHASE_ORDERS" as const };
    } catch (error: any) {
      await this.updateSyncState("PURCHASE_ORDERS", lastSourceUpdatedAt, lastCursor, error.message);
      await this.finishJob(job.id, {
        status: "FAILED",
        rowsRead,
        rowsUpserted,
        rowsFailed,
        message: error.message,
      });
      throw error;
    }
  }

  static async getSyncJobs(filters?: { entityName?: string; status?: string; limit?: number; }) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error("Tenant session required");

    return prisma.x3SyncJob.findMany({
      where: {
        tenant_id: tenantId,
        ...(filters?.entityName ? { entity_name: filters.entityName } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
      },
      orderBy: { started_at: "desc" },
      take: filters?.limit || 50,
    });
  }
}
