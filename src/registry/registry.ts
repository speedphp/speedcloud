// 服务实例。host:port 是实例唯一标识（同一服务内）。
export interface ServiceInstance {
    host: string;
    port: number;
    // 注册时间戳（毫秒），register() 未提供时自动填充 Date.now()
    registeredAt?: number;
    // 元数据扩展位（1.3.6 起承载 version/weight/tags 等，现在预留）
    metadata?: Record<string, unknown>;
}

// 本地注册表：服务注册 + 发现的单点真相（纯内存，不涉及网络）。
// 数据结构为两级：服务名 -> 实例列表（实例列表用数组，实例带 metadata 扩展位）。
export class LocalRegistry {
    // 两级结构：服务名 -> 实例列表（实例列表用数组）
    private instances = new Map<string, ServiceInstance[]>();

    // 注册一个实例。同 host:port 重复注册只更新不新增。
    register(serviceName: string, instance: ServiceInstance): ServiceInstance {
        // 去重键：host:port（同一服务内的实例唯一标识）
        const key = `${instance.host}:${instance.port}`;
        const list = this.instances.get(serviceName);

        // 服务已存在时，在其列表里做线性查找（实例数量少，线性足够）
        if (list) {
            const existing = list.find((item) => `${item.host}:${item.port}` === key);
            if (existing) {
                // 原地刷新注册时间（心跳语义），并替换 metadata（若本次提供）
                existing.registeredAt = Date.now();
                if (instance.metadata !== undefined) {
                    existing.metadata = instance.metadata;
                }
                return existing;
            }
            // 新实例补全 registeredAt 后 push 进列表
            const newInstance: ServiceInstance = {
                ...instance,
                registeredAt: instance.registeredAt ?? Date.now(),
            };
            list.push(newInstance);
            return newInstance;
        }

        // 服务不存在：新建列表并存入 map
        const newInstance: ServiceInstance = {
            ...instance,
            registeredAt: instance.registeredAt ?? Date.now(),
        };
        this.instances.set(serviceName, [newInstance]);
        return newInstance;
    }

    // 注销。找到并移除同 host:port 的实例返回 true；否则返回 false。
    unregister(serviceName: string, host: string, port: number): boolean {
        const list = this.instances.get(serviceName);
        if (!list) {
            return false;
        }
        const key = `${host}:${port}`;
        const index = list.findIndex((item) => `${item.host}:${item.port}` === key);
        if (index === -1) {
            return false;
        }
        list.splice(index, 1);
        // 移除后若该服务实例列表为空，把 serviceName 这个 key 从 map 删除
        if (list.length === 0) {
            this.instances.delete(serviceName);
        }
        return true;
    }

    // 返回该服务的实例列表（浅拷贝，防止外部改动内部状态）；服务不存在返回 []
    getInstances(serviceName: string): ServiceInstance[] {
        const list = this.instances.get(serviceName);
        return list ? [...list] : [];
    }

    // 返回所有已注册的服务名
    getServiceNames(): string[] {
        return Array.from(this.instances.keys());
    }

    // 返回该服务下实例数量；服务不存在返回 0
    getInstanceCount(serviceName: string): number {
        return this.instances.get(serviceName)?.length ?? 0;
    }
}
