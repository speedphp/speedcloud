// 冒烟测试：验证 speed 注册表基本链路可用（npm test 用 mocha 执行）。
import { expect } from "chai";
import { LocalRegistry } from "speed";

describe("speed 项目冒烟", () => {
    it("注册表注册/查询基本链路可用", () => {
        const registry = new LocalRegistry();
        const reg = registry.register("smoke", { host: "127.0.0.1", port: 8080 });
        expect(reg.instanceId).to.equal("127.0.0.1:8080");
        expect(registry.getInstanceCount("smoke")).to.equal(1);
        expect(registry.getInstances("smoke")[0].lastHeartbeat).to.be.a("number");
    });
});
