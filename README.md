# speed

一个 TypeScript **微服务编排框架**（对标 Spring Cloud），构建于 [typespeed](https://github.com/speedphp/typespeed) 之上。

> 关系：`typespeed`（单体框架 = SpringBoot）造应用，`speed`（微服务编排 = SpringCloud）管应用群。

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
