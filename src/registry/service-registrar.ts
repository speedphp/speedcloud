import { LocalRegistry, ServiceInstance, Registration, Registry } from "./registry";

// @Service 装饰器可携带的静态身份元数据。
// 注意：不含 host/port —— 那些是运行时网络事实（真实监听地址），
// 只能在「提交」（register）阶段提供，不能在「声明」（装饰）阶段写死。
export interface ServiceOptions {
    name?: string;
    group?: string;
    version?: string;
}

// 一条服务声明（per-class，装饰时执行一次）。
interface ServiceDeclaration {
    className: string;
    name: string;
    group?: string;
    version?: string;
}

// 服务注册协调器：负责「声明 → 提交」两阶段。
//   - 声明：@Service 装饰器在类定义时调用 declare()，只登记身份元数据，不注册实例。
//   - 提交：服务启动后调用 register()，用真实 host/port 注册到注册表（每次启动一次）。
// 「同名多实例」= 一次声明 + N 次提交（合法，负载均衡基础）；
// 「同名异类」= 同一服务名出现多次声明（declare 时告警）。
export class ServiceRegistrar {
    // 声明表：服务名 -> 声明列表（同名异类时会有多条）
    private declarations = new Map<string, ServiceDeclaration[]>();

    private registry: Registry = new LocalRegistry();

    // @Service 装饰器调用：只做声明（幂等——同一类重复声明不重复登记）。
    declare(className: string, options: ServiceOptions): void {
        const name = options.name ?? className;
        const list = this.declarations.get(name) ?? [];
        // 幂等：同一类重复声明（重复 import / 多次装饰）不重复登记
        if (list.some((d) => d.className === className)) {
            return;
        }
        // 同名异类：已有别的类占用该服务名 → 告警（不阻断，多实例场景由「提交」区分）
        if (list.length > 0) {
            console.warn(
                `[speed] 服务名 "${name}" 已被类 ${list.map((d) => d.className).join(", ")} 占用，` +
                `本次 ${className} 声明可能造成同名异类冲突。`
            );
        }
        list.push({ className, name, group: options.group, version: options.version });
        this.declarations.set(name, list);
    }

    // 提交：把已声明的服务名注册到注册表（每次启动调用一次）。
    // host/port 唯一可信来源是真实监听值（server.address().port / start() 后拿到）。
    register(serviceName: string, instance: ServiceInstance): Registration {
        const declarations = this.declarations.get(serviceName);
        if (!declarations || declarations.length === 0) {
            throw new Error(`[speed] 服务名 "${serviceName}" 未通过 @Service 声明，无法注册。`);
        }
        // 取第一条声明的 group/version 合并进 metadata（同名异类场景下取首条；一般只有一个）
        const decl = declarations[0];
        const metadata: Record<string, unknown> = { ...(instance.metadata ?? {}) };
        if (decl.group !== undefined) {
            metadata.group = decl.group;
        }
        if (decl.version !== undefined) {
            metadata.version = decl.version;
        }
        return this.registry.register(serviceName, { ...instance, metadata });
    }

    // 查询入口：拿到底层注册表（供 getInstances / 后续 discover 使用）。
    getRegistry(): Registry {
        return this.registry;
    }

    // 测试/重置用：清空声明与实例。
    clear(): void {
        this.declarations.clear();
        this.registry = new LocalRegistry();
    }
}

// 进程内单例：@Service 装饰器与启动代码共享同一个注册协调器。
export const serviceRegistrar = new ServiceRegistrar();
