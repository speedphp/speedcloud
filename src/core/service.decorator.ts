import { serviceRegistrar } from "../registry/service-registrar";
import type { ServiceOptions } from "../registry/service-registrar";

// 标准类装饰器 context 的最小结构（不依赖 esnext.decorators lib 类型，保持可编译）。
interface StdClassContext {
    kind: string;
    name?: string;
    addInitializer(fn: (this: any) => void): void;
}

// 解析 @Service 的入参：string 视为服务名，对象视为元数据，undefined 用默认。
function resolveOptions(param?: string | ServiceOptions): ServiceOptions {
    if (typeof param === "string") {
        return { name: param };
    }
    return param ?? {};
}

/**
 * @Service —— 类装饰器：把类标记为「可被发现的微服务」，声明即注册。
 *
 * 支持四种形式：
 *   @Service                                     // 服务名默认用类名
 *   @Service()                                   // 同上，显式空参数
 *   @Service("user-service")                     // 指定服务名
 *   @Service({ name, group, version })           // 带元数据
 *
 * 注意：装饰器只做「声明」（登记身份元数据），不注册实例——
 * 真实 host/port 要等服务 start 后才能拿到，由 serviceRegistrar.register() 在启动后提交。
 */
export function Service(...args: any[]): any {
    // 直接装饰形式：@Service（无参数）—— 标准类装饰器收到 (value, context)
    if (args.length === 2 && typeof args[1] === "object" && args[1] !== null && args[1].kind === "class") {
        const context = args[1] as StdClassContext;
        context.addInitializer(function (this: any) {
            // 标准类装饰器 initializer 的 this 是类本身（非实例），this.name 即类名
            serviceRegistrar.declare(this.name, {});
        });
        return;
    }
    // 工厂形式：@Service() / @Service("name") / @Service({...})
    const options = resolveOptions(args[0]);
    return function (value: any, context: StdClassContext): void {
        context.addInitializer(function (this: any) {
            serviceRegistrar.declare(this.name, options);
        });
    };
}
