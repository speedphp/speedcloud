#!/usr/bin/env node
import { Command } from 'commander';
import * as fs from "fs";
import * as path from "path";

const program = new Command();

program
    .name("speed")
    .description("A microservices orchestration framework for TypeScript (the Spring Cloud equivalent, built on typespeed).")
    .version("1.3.2");

program.command('new <projectName>')
    .description('Create a new speed project.')
    .action((projectName: string) => {
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

        console.log('');
        console.log('  Create speed project success!');
        console.log('');
        console.log('  Next steps:');
        console.log(`    cd ${projectName}`);
        console.log('    npm install');
        console.log('    npm run start');
        console.log('');
    });

program.on('--help', () => {
    console.log('');
    console.log('  Examples:');
    console.log('');
    console.log('    $ speed new demo');
});

program.parse(process.argv);

function mkFile(fileName: string, targetPath: string, projectName: string) {
    const tplPath = path.join(__dirname, "templates");
    const fileContents = fs.readFileSync(path.join(tplPath, fileName + ".tpl"), "utf-8");
    fs.writeFileSync(path.join(targetPath, fileName), fileContents.replace(/###appName###/g, projectName));
}
