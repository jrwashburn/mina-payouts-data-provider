"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLedgerPool = exports.createPool = void 0;
var pg_1 = require("pg");
var environmentConfiguration_1 = require("../configurations/environmentConfiguration");
function createPool(useSSL) {
    if (useSSL) {
        return new pg_1.Pool({
            user: environmentConfiguration_1.default.dbUser,
            host: environmentConfiguration_1.default.dbHost,
            database: environmentConfiguration_1.default.dbName,
            password: environmentConfiguration_1.default.dbPassword,
            port: environmentConfiguration_1.default.dbPort,
            ssl: {
                ca: environmentConfiguration_1.default.dbCertificate,
            },
        });
    }
    return new pg_1.Pool({
        user: environmentConfiguration_1.default.dbUser,
        host: environmentConfiguration_1.default.dbHost,
        database: environmentConfiguration_1.default.dbName,
        password: environmentConfiguration_1.default.dbPassword,
        port: environmentConfiguration_1.default.dbPort,
    });
}
exports.createPool = createPool;
function createLedgerPool(useSSL) {
    if (useSSL) {
        return new pg_1.Pool({
            user: environmentConfiguration_1.default.slDbUser,
            host: environmentConfiguration_1.default.slDbHost,
            database: environmentConfiguration_1.default.slDbName,
            password: environmentConfiguration_1.default.slDbPassword,
            port: environmentConfiguration_1.default.slDbPort,
            ssl: {
                ca: environmentConfiguration_1.default.slDbCertificate,
            },
        });
    }
    return new pg_1.Pool({
        user: environmentConfiguration_1.default.slDbUser,
        host: environmentConfiguration_1.default.slDbHost,
        database: environmentConfiguration_1.default.slDbName,
        password: environmentConfiguration_1.default.slDbPassword,
        port: environmentConfiguration_1.default.slDbPort,
    });
}
exports.createLedgerPool = createLedgerPool;
