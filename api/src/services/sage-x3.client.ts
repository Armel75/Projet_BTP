import sql from "mssql";
import { env } from "../config/env.js";

function requireEnv(name: string, value?: string): string {
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const DEFAULT_BATCH_SIZE = 1000;

export class SageX3Client {
  private static pool: sql.ConnectionPool | null = null;

  private static getConfig(): sql.config {
    return {
      server: requireEnv("SAGE_X3_SERVER", env.SAGE_X3_SERVER),
      database: requireEnv("SAGE_X3_DATABASE", env.SAGE_X3_DATABASE),
      user: requireEnv("SAGE_X3_USER", env.SAGE_X3_USER),
      password: requireEnv("SAGE_X3_PASSWORD", env.SAGE_X3_PASSWORD),
      options: {
        encrypt: (env.SAGE_X3_ENCRYPT || "false").toLowerCase() === "true",
        trustServerCertificate: (env.SAGE_X3_TRUST_SERVER_CERTIFICATE || "true").toLowerCase() === "true",
      },
      pool: {
        max: 20,
        min: 2,
        idleTimeoutMillis: 30000,
      },
    };
  }

  static async getPool(): Promise<sql.ConnectionPool> {
    if (this.pool && this.pool.connected) {
      return this.pool;
    }

    const pool = new sql.ConnectionPool(this.getConfig());
    this.pool = await pool.connect();
    return this.pool;
  }

  static async closePool(): Promise<void> {
    if (this.pool) {
      await this.pool.close();
      this.pool = null;
    }
  }

  static async fetchBatchFromView(
    viewName: string,
    options?: {
      batchSize?: number;
      updatedAtColumn?: string;
      cursorColumn?: string;
      lastUpdatedAt?: Date | null;
      lastCursor?: string | null;
    }
  ): Promise<Record<string, any>[]> {
    const pool = await this.getPool();
    const batchSize = options?.batchSize ?? DEFAULT_BATCH_SIZE;
    const updatedAtColumn = options?.updatedAtColumn || "source_updated_at";
    const cursorColumn = options?.cursorColumn || "external_id";

    const request = pool.request();
    request.input("batchSize", sql.Int, batchSize);
    request.input("lastUpdatedAt", sql.DateTime2, options?.lastUpdatedAt || null);
    request.input("lastCursor", sql.NVarChar(255), options?.lastCursor || null);

    const query = `
      SELECT TOP (@batchSize) *
      FROM ${viewName}
      WHERE
        (@lastUpdatedAt IS NULL OR ${updatedAtColumn} > @lastUpdatedAt)
        OR (
          ${updatedAtColumn} = @lastUpdatedAt
          AND @lastCursor IS NOT NULL
          AND CAST(${cursorColumn} AS NVARCHAR(255)) > @lastCursor
        )
      ORDER BY ${updatedAtColumn} ASC, ${cursorColumn} ASC;
    `;

    const result = await request.query(query);
    return result.recordset || [];
  }
}
