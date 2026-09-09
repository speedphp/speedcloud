// Symbol.metadata polyfill：Node 22/24/26 均无 Symbol.metadata，
// 标准装饰器的 context.metadata 依赖它，缺失会 TypeError，必须最先执行。
(Symbol as { metadata?: symbol }).metadata ??= Symbol("Symbol.metadata");

// 骨架入口：直接使用 typespeed 的 @app 引导 + speed 的 @Service 声明服务。
import { app, autoware, ServerFactory } from "typespeed";
import { Service, serviceRegistrar } from "speed";

/**
 * speed 项目入口骨架（标准装饰器模式）。
 *
 * 目录约定：
 *   - 服务类放 src/（本文件即入口）；
 *   - 配置文件 src/config.json（可选，typespeed 启动时自动读取）；
 *   - tsconfig.json 已固定标准装饰器（experimentalDecorators:false + esnext.decorators lib）。
 *
 * @Service 声明本服务可被发现（服务名 = 应用名 ###appName###）；
 * 启动完成后在 main() 里用真实监听端口调用 serviceRegistrar.register() 提交注册。
 */
@app
@Service("###appName###")
class Main {

    @autoware(ServerFactory)
    public server!: ServerFactory;

    public main() {
        const port = 8080;
        this.server.start(port);
        // 声明/提交分离：@Service 只做声明，这里用真实 host:port 提交注册
        serviceRegistrar.register("###appName###", { host: "127.0.0.1", port });
        console.log(`speed service "###appName###" started at http://127.0.0.1:${port}`);
    }
}
