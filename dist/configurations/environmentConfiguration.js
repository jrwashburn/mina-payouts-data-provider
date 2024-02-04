"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var dotenv_1 = require("dotenv");
var configuration = loadConfiguration();
function loadConfiguration() {
    (0, dotenv_1.config)();
    validateEnv();
    var configuration = {
        port: Number(process.env.API_PORT),
        slotsPerEpoch: Number(process.env.NUM_SLOTS_IN_EPOCH),
        dbConnectionSSL: Boolean(process.env.DB_REQUIRE_SSL),
        dbCertificate: String(process.env.DB_CERTIFICATE),
        dbUser: String(process.env.DB_USER),
        dbPassword: String(process.env.DB_PASSWORD),
        dbHost: String(process.env.DB_HOST),
        dbPort: Number(process.env.DB_PORT),
        dbName: String(process.env.DB_NAME),
        slDbConnectionSSL: Boolean(process.env.SLDB_REQUIRE_SSL),
        slDbCertificate: String(process.env.SLDB_CERTIFICATE),
        slDbUser: String(process.env.SLDB_USER),
        slDbPassword: String(process.env.SLDB_PASSWORD),
        slDbHost: String(process.env.SLDB_HOST),
        slDbPort: Number(process.env.SLDB_PORT),
        slDbName: String(process.env.SLDB_NAME),
    };
    return configuration;
}
function validateEnv() {
    var envVars = [
        'API_PORT',
        'NUM_SLOTS_IN_EPOCH',
        'DB_USER',
        'DB_PASSWORD',
        'DB_HOST',
        'DB_PORT',
        'DB_NAME',
        'DB_REQUIRE_SSL',
        'DB_CERTIFICATE',
        'SLDB_USER',
        'SLDB_PASSWORD',
        'SLDB_HOST',
        'SLDB_PORT',
        'SLDB_NAME',
        'SLDB_REQUIRE_SSL',
        'SLDB_CERTIFICATE',
    ];
    envVars.forEach(function (variable) {
        if (!process.env[variable]) {
            var message = "Environment variable ".concat(variable, " is missing");
            console.log(message);
            throw Error(message);
        }
    });
}
exports.default = configuration;
