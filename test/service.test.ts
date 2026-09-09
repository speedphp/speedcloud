// Symbol.metadata polyfill：Node 22/24/26 均无 Symbol.metadata，
// 标准装饰器的 context.metadata 依赖它，缺失会 TypeError，必须最先执行。
(Symbol as { metadata?: symbol }).metadata ??= Symbol("Symbol.metadata");

import { expect } from "chai";
import { Service } from "../src/core";
import { ServiceRegistrar, serviceRegistrar } from "../src/registry";

describe("ServiceRegistrar（声明/提交两阶段）", () => {
    let registrar: ServiceRegistrar;

    beforeEach(() => {
        registrar = new ServiceRegistrar();
    });

    it("declare + register 后实例进入注册表", () => {
        registrar.declare("UserService", { name: "user-service" });
        registrar.register("user-service", { host: "127.0.0.1", port: 8080 });
        expect(registrar.getRegistry().getInstances("user-service")).to.have.lengthOf(1);
    });

    it("register 未声明的服务名抛错", () => {
        expect(() => registrar.register("unknown", { host: "127.0.0.1", port: 8080 }))
            .to.throw(/未通过 @Service 声明/);
    });

    it("@Service 的 group/version 合并进实例 metadata", () => {
        registrar.declare("UserService", { name: "user-service", group: "default", version: "v1" });
        registrar.register("user-service", { host: "127.0.0.1", port: 8080 });
        const instances = registrar.getRegistry().getInstances("user-service");
        expect(instances[0].metadata).to.deep.equal({ group: "default", version: "v1" });
    });

    it("同名多实例（不同 host:port）并列注册", () => {
        registrar.declare("UserService", { name: "user-service" });
        registrar.register("user-service", { host: "127.0.0.1", port: 8080 });
        registrar.register("user-service", { host: "127.0.0.1", port: 8081 });
        expect(registrar.getRegistry().getInstances("user-service")).to.have.lengthOf(2);
    });

    it("同名异类 declare 触发 console.warn", () => {
        const originalWarn = console.warn;
        let warned = false;
        console.warn = () => { warned = true; };
        registrar.declare("UserService", { name: "user-service" });
        registrar.declare("OrderService", { name: "user-service" });
        console.warn = originalWarn;
        expect(warned).to.equal(true);
    });

    it("同一类重复 declare 幂等（不重复登记）", () => {
        registrar.declare("UserService", { name: "user-service" });
        registrar.declare("UserService", { name: "user-service" });
        registrar.register("user-service", { host: "127.0.0.1", port: 8080 });
        expect(registrar.getRegistry().getInstances("user-service")).to.have.lengthOf(1);
    });

    it("Registration.renew 刷新 registeredAt，deregister 移除实例", () => {
        registrar.declare("UserService", { name: "user-service" });
        const reg = registrar.register("user-service", { host: "127.0.0.1", port: 8080, registeredAt: 1 });
        expect(reg.instanceId).to.equal("127.0.0.1:8080");
        reg.renew();
        const instances = registrar.getRegistry().getInstances("user-service");
        expect(instances[0].registeredAt).to.be.greaterThan(1);
        expect(reg.deregister()).to.equal(true);
        expect(registrar.getRegistry().getInstances("user-service")).to.deep.equal([]);
    });
});

describe("@Service 装饰器（声明到全局单例 serviceRegistrar）", () => {
    @Service("user-service")
    class UserService {}

    @Service
    class PaymentService {}

    @Service({ name: "order-service", group: "default", version: "v2" })
    class OrderService {}

    it("指定服务名生效", () => {
        serviceRegistrar.register("user-service", { host: "127.0.0.1", port: 8080 });
        expect(serviceRegistrar.getRegistry().getInstances("user-service")).to.have.lengthOf(1);
    });

    it("缺省用类名作为服务名", () => {
        serviceRegistrar.register("PaymentService", { host: "127.0.0.1", port: 8080 });
        expect(serviceRegistrar.getRegistry().getInstances("PaymentService")).to.have.lengthOf(1);
    });

    it("带元数据声明，group/version 合并进 metadata", () => {
        serviceRegistrar.register("order-service", { host: "127.0.0.1", port: 8080 });
        const instances = serviceRegistrar.getRegistry().getInstances("order-service");
        expect(instances[0].metadata).to.deep.equal({ group: "default", version: "v2" });
    });
});
