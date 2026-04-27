import { AsyncLocalStorage } from 'node:async_hooks';

export class TenantContext {
  private static storage = new AsyncLocalStorage<number>();

  static run<T>(tenantId: number, fn: () => T): T {
    return this.storage.run(tenantId, fn);
  }

  static getTenantId(): number | undefined {
    return this.storage.getStore();
  }
}
