// 服务实例。host:port 是实例唯一标识（同一服务内）。
export interface ServiceInstance {
    host: string;
    port: number;
    // 注册时间戳（毫秒），register() 未提供时自动填充 Date.now()
    registeredAt?: number;
    // 最近心跳时间戳（毫秒），register() 时自动填充，1.3.3 起由 renew()/心跳定时器持续刷新
    lastHeartbeat?: number;
    // 元数据扩展位（1.3.6 起承载 version/weight/tags 等）
    metadata?: Record<string, unknown>;
    // 实例健康状态，1.3.4 健康检查起用，现在固定 "UP"
    status?: string;
}

// 心跳默认间隔（毫秒）：10 秒。可用 Registration.startHeartbeat(intervalMs) 覆盖。
// 注意：心跳间隔应远小于超时阈值（1.3.4 默认取 ≥ 3 倍心跳间隔），避免网络抖动误摘除。
export const DEFAULT_HEARTBEAT_INTERVAL_MS = 10_000;

// 注册句柄：register() 返回，承载「续期/心跳/注销」能力。
// 1.3.3 心跳用 renew() 续租 + startHeartbeat() 定时续期；1.3.4 摘除/优雅停机用 deregister() 注销。
export interface Registration {
    // 实例稳定标识：`host:port`（与 LocalRegistry 的去重键一致，Nacos 心跳/摘除也按它定位）
    readonly instanceId: string;
    // 心跳续期：刷新 lastHeartbeat。实例已不在注册表（被注销/摘除）时返回 false。
    renew(): boolean;
    // 启动定时心跳：按 intervalMs（默认 DEFAULT_HEARTBEAT_INTERVAL_MS）周期调用 renew()。
    // 幂等——已在心跳中的句柄重复调用不叠加定时器。
    // 心跳失败不立即摘除（摘除是 1.3.4 超时扫描的职责）：renew() 返回 false 时自动停止心跳避免空转。
    startHeartbeat(intervalMs?: number): void;
    // 停止定时心跳（优雅停机/注销前调用）
    stopHeartbeat(): void;
    // 主动注销：立即从注册表移除（并停止心跳）；返回是否真的移除成功
    deregister(): boolean;
}

// 注册表接口：本地实现（LocalRegistry）与后续 Nacos 实现（1.3.8）共同实现。
// 1.3.8 做「接口先行」时，业务代码无感知切换。
export interface Registry {
    register(serviceName: string, instance: ServiceInstance): Registration;
    unregister(serviceName: string, host: string, port: number): boolean;
    getInstances(serviceName: string): ServiceInstance[];
    // 1.3.1 已实现，1.3.3 补入接口（1.3.8 Nacos 适配时方法集对齐）
    getServiceNames(): string[];
    getInstanceCount(serviceName: string): number;
}

// 本地注册表：服务注册 + 发现的唯一数据来源（纯内存，不涉及网络）。
// 数据结构为两级：服务名 -> 实例列表（实例列表用数组，实例带 metadata 扩展位）。
export class LocalRegistry implements Registry {
    private instances = new Map<string, ServiceInstance[]>();

    // 注册一个实例。同 host:port 重复注册只更新不新增。
    register(serviceName: string, instance: ServiceInstance): Registration {
        const key = `${instance.host}:${instance.port}`;
        const list = this.instances.get(serviceName);

        let target: ServiceInstance;
        if (list) {
            const existing = list.find((item) => `${item.host}:${item.port}` === key);
            if (existing) {
                // 重复提交 = 实例重新上线：刷新注册时间与首次心跳，并替换 metadata/status（若本次提供）
                existing.registeredAt = Date.now();
                existing.lastHeartbeat = Date.now();
                if (instance.metadata !== undefined) existing.metadata = instance.metadata;
                if (instance.status !== undefined) existing.status = instance.status;
                target = existing;
            } else {
                target = this.normalize(instance);
                list.push(target);
            }
        } else {
            target = this.normalize(instance);
            this.instances.set(serviceName, [target]);
        }

        return this.makeRegistration(serviceName, target);
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

    // 补全实例的 registeredAt/lastHeartbeat（缺省 Date.now()）与 status（缺省 "UP"）
    private normalize(instance: ServiceInstance): ServiceInstance {
        return {
            ...instance,
            registeredAt: instance.registeredAt ?? Date.now(),
            lastHeartbeat: instance.lastHeartbeat ?? Date.now(),
            status: instance.status ?? "UP",
        };
    }

    // 为已登记实例生成注册句柄；句柄闭包持有该实例引用与所在服务名。
    private makeRegistration(serviceName: string, target: ServiceInstance): Registration {
        const instanceId = `${target.host}:${target.port}`;
        const registry = this;
        let timer: ReturnType<typeof setInterval> | undefined;

        // 续期以注册表当前状态为准（实例可能已被 unregister/摘除），闭包里的 target 只作身份定位
        const renew = (): boolean => {
            const current = registry.instances
                .get(serviceName)
                ?.find((item) => `${item.host}:${item.port}` === instanceId);
            if (!current) {
                return false;
            }
            current.lastHeartbeat = Date.now();
            return true;
        };

        const stopHeartbeat = (): void => {
            if (timer) {
                clearInterval(timer);
                timer = undefined;
            }
        };

        return {
            instanceId,
            renew,
            startHeartbeat: (intervalMs?: number): void => {
                if (timer) {
                    return; // 幂等：已在心跳中
                }
                timer = setInterval(() => {
                    if (!renew()) {
                        // 心跳目标已不在注册表：停止心跳（不摘除——摘除是 1.3.4 超时扫描的职责）
                        stopHeartbeat();
                    }
                }, intervalMs ?? DEFAULT_HEARTBEAT_INTERVAL_MS);
                timer.unref?.(); // 不阻塞进程退出
            },
            stopHeartbeat,
            deregister: (): boolean => {
                const ok = registry.unregister(serviceName, target.host, target.port);
                if (ok) {
                    stopHeartbeat();
                }
                return ok;
            },
        };
    }
}
