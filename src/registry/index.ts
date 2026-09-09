// ① 注册中心（服务注册 + 发现）—— 1.3.x 实现
export { LocalRegistry } from "./registry";
export type { ServiceInstance, Registration, Registry } from "./registry";
export { ServiceRegistrar, serviceRegistrar } from "./service-registrar";
export type { ServiceOptions } from "./service-registrar";
