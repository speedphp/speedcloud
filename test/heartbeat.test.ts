import { expect } from "chai";
import { LocalRegistry } from "../src/registry";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("1.3.3 心跳机制", () => {
    it("register 时 lastHeartbeat 自动填充为数字", () => {
        const registry = new LocalRegistry();
        registry.register("user-service", { host: "127.0.0.1", port: 8080 });

        const instances = registry.getInstances("user-service");
        expect(instances[0].lastHeartbeat).to.be.a("number");
    });

    it("renew 刷新 lastHeartbeat，registeredAt 保持不变", async () => {
        const registry = new LocalRegistry();
        const reg = registry.register("user-service", { host: "127.0.0.1", port: 8080, registeredAt: 100, lastHeartbeat: 100 });

        await wait(10);
        expect(reg.renew()).to.equal(true);

        const instance = registry.getInstances("user-service")[0];
        expect(instance.lastHeartbeat).to.be.greaterThan(100);
        expect(instance.registeredAt).to.equal(100);
    });

    it("startHeartbeat 按间隔持续刷新 lastHeartbeat", async () => {
        const registry = new LocalRegistry();
        const reg = registry.register("user-service", { host: "127.0.0.1", port: 8080 });
        reg.startHeartbeat(50);

        const first = registry.getInstances("user-service")[0].lastHeartbeat;
        await wait(130);
        const second = registry.getInstances("user-service")[0].lastHeartbeat;
        expect(second).to.be.greaterThan(first);
        reg.stopHeartbeat();
    });

    it("stopHeartbeat 后 lastHeartbeat 不再前进", async () => {
        const registry = new LocalRegistry();
        const reg = registry.register("user-service", { host: "127.0.0.1", port: 8080 });
        reg.startHeartbeat(50);
        await wait(110);
        reg.stopHeartbeat();

        const frozen = registry.getInstances("user-service")[0].lastHeartbeat;
        await wait(130);
        expect(registry.getInstances("user-service")[0].lastHeartbeat).to.equal(frozen);
    });

    it("startHeartbeat 幂等：重复调用不叠加定时器", async () => {
        const registry = new LocalRegistry();
        const reg = registry.register("user-service", { host: "127.0.0.1", port: 8080 });
        reg.startHeartbeat(50);
        reg.startHeartbeat(50);
        reg.startHeartbeat(50);
        reg.stopHeartbeat(); // 只停一次：若叠加了定时器，还剩定时器继续刷新

        const frozen = registry.getInstances("user-service")[0].lastHeartbeat;
        await wait(130);
        expect(registry.getInstances("user-service")[0].lastHeartbeat).to.equal(frozen);
    });

    it("deregister 后实例立即移除且心跳自动停止（不空转、不复活）", async () => {
        const registry = new LocalRegistry();
        const reg = registry.register("user-service", { host: "127.0.0.1", port: 8080 });
        reg.startHeartbeat(50);
        await wait(110);

        expect(reg.deregister()).to.equal(true);
        await wait(130);
        expect(registry.getInstances("user-service")).to.deep.equal([]);
    });

    it("实例被 unregister 后 renew 返回 false，心跳自我停止", async () => {
        const registry = new LocalRegistry();
        const reg = registry.register("user-service", { host: "127.0.0.1", port: 8080 });
        reg.startHeartbeat(50);

        registry.unregister("user-service", "127.0.0.1", 8080);
        expect(reg.renew()).to.equal(false);
        // 定时器自我停止：等待超过一个间隔后注册表仍为空（renew 不会把实例加回来）
        await wait(130);
        expect(registry.getInstances("user-service")).to.deep.equal([]);
    });

    it("同 host:port 重复 register（重新上线）刷新 registeredAt 与 lastHeartbeat", async () => {
        const registry = new LocalRegistry();
        registry.register("user-service", { host: "127.0.0.1", port: 8080, registeredAt: 1, lastHeartbeat: 1 });
        await wait(10);
        registry.register("user-service", { host: "127.0.0.1", port: 8080 });

        const instance = registry.getInstances("user-service")[0];
        expect(instance.registeredAt).to.be.greaterThan(1);
        expect(instance.lastHeartbeat).to.be.greaterThan(1);
        expect(registry.getInstanceCount("user-service")).to.equal(1);
    });
});
