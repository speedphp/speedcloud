{
    "name": "###appName###",
    "version": "1.0.0",
    "description": "A speed microservice project (built on typespeed).",
    "scripts": {
        "start": "ts-node --transpile-only src/main.ts",
        "build": "tsc -p .",
        "test": "ts-node --transpile-only src/main.ts"
    },
    "dependencies": {
        "speed": "^1.3.0",
        "typespeed": "^2.6.7"
    },
    "devDependencies": {
        "typescript": "^5.9.3",
        "ts-node": "^10.9.2",
        "@types/node": "^22.0.0"
    }
}
