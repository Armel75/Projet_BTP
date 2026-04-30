import { AsyncLocalStorage } from 'node:async_hooks';
export class TenantContext {
    static storage = new AsyncLocalStorage();
    static run(tenantId, fn) {
        return this.storage.run(tenantId, fn);
    }
    static getTenantId() {
        return this.storage.getStore();
    }
}
