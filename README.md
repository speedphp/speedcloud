# speed

一个 TypeScript **微服务编排框架**（对应 Spring Cloud），构建于 [typespeed](https://github.com/speedphp/typespeed) 之上。

> 关系：`typespeed`（单体框架 = SpringBoot）造应用，`speed`（微服务编排 = SpringCloud）管应用群。

## 快速开始（1.3.0）

```bash
npm install speed -g
speed new demo
cd demo
npm install
npm run start        # 访问 http://127.0.0.1:8080/health
```

`speed new` 生成的项目使用 **标准装饰器**（TC39，`experimentalDecorators: false`），入口骨架见 `src/main.ts`。

## 注册中心（1.3.1）

注册表是注册中心服务信息的唯一数据来源，提供 `register` / `unregister` / `getInstances` 三个基础 API（纯内存，同 `host:port` 重复注册只更新不新增）：

```ts
import { LocalRegistry } from "speed/registry";

const registry = new LocalRegistry();
registry.register("user-service", { host: "127.0.0.1", port: 8080 });
registry.register("user-service", { host: "127.0.0.1", port: 8081, metadata: { version: "v2" } });

registry.getInstances("user-service");           // 两个实例
registry.unregister("user-service", "127.0.0.1", 8080); // true
```

> 详见 `docs/1.3.1-本地注册表.md`（为什么 → 怎么用 → 原理 → 怎么扩展）。

## 服务声明（1.3.2）

`@Service` 装饰器把类标记为「可被发现的微服务」——**只声明身份，不注册实例**（真实 host/port 要等启动后拿到再提交）：

```ts
import { Service, serviceRegistrar } from "speed";

@Service("user-service")
class UserService {}

serviceRegistrar.register("user-service", { host: "127.0.0.1", port: 8080 });
serviceRegistrar.getRegistry().getInstances("user-service");
```

> `@Service` 只声明，真实 host/port 在启动后用 `serviceRegistrar.register()` 提交；详见 `docs/1.3.2-Service装饰器.md`。

## 模块（单包 `speed` + 子路径导出）

| 子路径 | 模块 | 版本 |
|---|---|---|
| `speed/registry` | ① 注册中心 | 1.3.x |
| `speed/gateway` | ③ API 网关 | 1.4.x |
| `speed/config` | ② 配置中心 | 1.5.x |
| `speed/loadbalancer` | ⑤ 负载均衡 | 1.6.x |
| `speed/circuit-breaker` | ④ 熔断限流 | 1.7.x |
| `speed/rpc` | ⑥ RPC 客户端 | 1.8.x |
| `speed/messaging` | ⑧ 消息驱动 | 1.9.x |
| `speed/observability` | ⑦+⑨ 追踪可观测 | 1.10.x |

> 骨架阶段，开发中。开发计划见 speedphp 项目内的 `speed-微服务化开发计划.md` 及各模块计划文件。
