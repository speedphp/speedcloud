import { expect } from "chai";
import { LocalRegistry } from "../src/registry";

describe("LocalRegistry", () => {
    it("register 后 getInstances 能取到该实例，且 registeredAt 被自动填充为数字", () => {
        const registry = new LocalRegistry();
        const instance = registry.register("user-service", { host: "127.0.0.1", port: 8080 });

        const instances = registry.getInstances("user-service");
        expect(instances).to.have.lengthOf(1);
        expect(instances[0].host).to.equal("127.0.0.1");
        expect(instances[0].port).to.equal(8080);
        expect(instances[0].registeredAt).to.be.a("number");
        expect(instance.registeredAt).to.be.a("number");
    });

    it("getInstances 查询不存在的服务返回空数组", () => {
        const registry = new LocalRegistry();
        expect(registry.getInstances("nonexistent")).to.deep.equal([]);
    });

    it("同 host:port 重复 register 不产生重复条目，且 metadata 被更新", () => {
        const registry = new LocalRegistry();
        registry.register("user-service", { host: "127.0.0.1", port: 8080 });
        registry.register("user-service", { host: "127.0.0.1", port: 8080, metadata: { version: "v2" } });

        expect(registry.getInstanceCount("user-service")).to.equal(1);
        const instances = registry.getInstances("user-service");
        expect(instances[0].metadata).to.deep.equal({ version: "v2" });
    });

    it("register 多个不同 host:port 的实例，getInstances 返回全部", () => {
        const registry = new LocalRegistry();
        registry.register("user-service", { host: "127.0.0.1", port: 8080 });
        registry.register("user-service", { host: "127.0.0.1", port: 8081 });
        registry.register("user-service", { host: "10.0.0.2", port: 8080 });

        expect(registry.getInstances("user-service")).to.have.lengthOf(3);
        expect(registry.getInstanceCount("user-service")).to.equal(3);
    });

    it("unregister 已存在的实例返回 true，之后 getInstances 不再包含它", () => {
        const registry = new LocalRegistry();
        registry.register("user-service", { host: "127.0.0.1", port: 8080 });

        const result = registry.unregister("user-service", "127.0.0.1", 8080);
        expect(result).to.equal(true);
        expect(registry.getInstances("user-service")).to.deep.equal([]);
    });

    it("unregister 不存在的实例返回 false", () => {
        const registry = new LocalRegistry();
        registry.register("user-service", { host: "127.0.0.1", port: 8080 });

        // 服务不存在
        expect(registry.unregister("nonexistent", "127.0.0.1", 8080)).to.equal(false);
        // host:port 不存在
        expect(registry.unregister("user-service", "127.0.0.1", 9999)).to.equal(false);
    });

    it("注销某服务最后一个实例后，getServiceNames 不再包含该服务名", () => {
        const registry = new LocalRegistry();
        registry.register("user-service", { host: "127.0.0.1", port: 8080 });
        registry.unregister("user-service", "127.0.0.1", 8080);

        expect(registry.getServiceNames()).to.not.include("user-service");
    });

    it("getInstances 返回的是拷贝：外部 push 后 getInstanceCount 不变", () => {
        const registry = new LocalRegistry();
        registry.register("user-service", { host: "127.0.0.1", port: 8080 });

        const instances = registry.getInstances("user-service");
        instances.push({ host: "127.0.0.1", port: 9999 });

        expect(registry.getInstanceCount("user-service")).to.equal(1);
    });
});
