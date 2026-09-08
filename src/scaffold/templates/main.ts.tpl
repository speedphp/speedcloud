// Symbol.metadata polyfill：Node 22/24/26 均无 Symbol.metadata，
// 标准装饰器的 context.metadata 依赖它，缺失会 TypeError，必须最先执行。
(Symbol as { metadata?: symbol }).metadata ??= Symbol("Symbol.metadata");

// 骨架阶段直接使用 typespeed 的 @app 引导（speed 的微服务装饰器 @Service 等自 1.3.2 起提供）。
import { app, autoware, ServerFactory } from "typespeed";

/**
 * speed 项目入口骨架（标准装饰器模式）。
 *
 * 目录约定：
 *   - 服务类放 src/（本文件即入口）；
 *   - 配置文件 src/config.json（可选，typespeed 启动时自动读取，可用 config()/@value 访问）；
 *   - tsconfig.json 已固定标准装饰器（experimentalDecorators:false + esnext.decorators lib）。
 */
@app
class Main {

    @autoware(ServerFactory)
    public server!: ServerFactory;

    public main() {
        this.server.start(8080);
        console.log("speed service started at http://127.0.0.1:8080");
    }
}
