{
    "name": "###appName###",
    "version": "1.0.0",
    "description": "A speed microservice project (built on typespeed).",
    "scripts": {
        "start": "ts-node --transpile-only src/main.ts",
        "build": "tsc -p .",
        "test": "NODE_OPTIONS=--no-experimental-strip-types mocha --require ts-node/register test/**/*.ts --exit"
    },
    "dependencies": {
        "speed": "^1.3.3",
        "typespeed": "^2.6.8"
    },
    "devDependencies": {
        "typescript": "^5.9.3",
        "ts-node": "^10.9.2",
        "@types/node": "^22.0.0",
        "mocha": "^10.2.0",
        "chai": "^4.3.7",
        "@types/mocha": "^10.0.1",
        "@types/chai": "^4.3.11"
    }
}
