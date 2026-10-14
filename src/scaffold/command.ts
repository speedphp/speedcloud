#!/usr/bin/env node
import { Command } from 'commander';
import * as fs from "fs";
import * as path from "path";

const program = new Command();

// CLI 版本与包版本保持单一来源（发版只改 package.json，不在此硬编码，避免漏改导致版本不一致）。
// 注意路径：本文件编译到 dist/scaffold/command.js，`../../package.json` 相对该位置=包根 package.json。
const pkg = require("../../package.json") as { version: string };

program
    .name("speed")
    .description("A microservices orchestration framework for TypeScript (the Spring Cloud equivalent, built on typespeed).")
    .version(pkg.version);

// 项目名规则：与 npm name 规则一致（小写字母开头，仅含小写字母/数字/-/_）。
// 校验既防路径穿越（如 speed new ../evil 写目录外），也防非法字符破坏生成的 package.json/目录。
const PROJECT_NAME_RE = /^[a-z][a-z0-9_-]*$/;

program.command('new <projectName>')
    .description('Create a new speed project.')
    .action((projectName: string) => {
        if (!PROJECT_NAME_RE.test(projectName)) {
            console.error('');
            console.error(`  Error: invalid project name "${projectName}".`);
            console.error('  Project name must start with a lowercase letter and contain only');
            console.error('  lowercase letters, digits, "-" and "_".');
            console.error('');
            process.exit(1);
        }

        const currentDir = process.cwd();
        const appPath = path.join(currentDir, projectName);

        if (fs.existsSync(appPath)) {
            console.error('');
            console.error(`  Error: directory "${projectName}" already exists.`);
            console.error('');
            process.exit(1);
        }

        fs.mkdirSync(appPath);
        mkFile("package.json", appPath, projectName);
        mkFile("tsconfig.json", appPath, projectName);
        mkFile(".gitignore", appPath, projectName);

        fs.mkdirSync(path.join(appPath, "src"));
        mkFile("main.ts", path.join(appPath, "src"), projectName);
        mkFile("config.json", path.join(appPath, "src"), projectName);

        fs.mkdirSync(path.join(appPath, "test"));
        mkFile("smoke.test.ts", path.join(appPath, "test"), projectName);

        console.log('');
        console.log('  Create speed project success!');
        console.log('');
        console.log('  Next steps:');
        console.log(`    cd ${projectName}`);
        console.log('    npm install');
        console.log('    npm run start');
        console.log('    npm test');
        console.log('');
    });

program.on('--help', () => {
    console.log('');
    console.log('  Examples:');
    console.log('');
    console.log('    $ speed new demo');
});

// 仅作为 CLI 入口直接执行时才解析参数（被 require 时无副作用）
if (require.main === module) {
    program.parse(process.argv);
}

function mkFile(fileName: string, targetPath: string, projectName: string) {
    const tplPath = path.join(__dirname, "templates");
    const fileContents = fs.readFileSync(path.join(tplPath, fileName + ".tpl"), "utf-8");
    fs.writeFileSync(path.join(targetPath, fileName), fileContents.replace(/###appName###/g, projectName));
}
