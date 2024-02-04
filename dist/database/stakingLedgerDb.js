"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertBatch = exports.hashExists = exports.getStakingLedgersByEpoch = exports.getStakingLedgers = void 0;
var db = require("./blockArchiveDb");
var databaseFactory_1 = require("./databaseFactory");
require('dotenv').config();
var requiresSSL = Boolean(process.env.SLDB_REQUIRE_SSL);
var sldb = (0, databaseFactory_1.createLedgerPool)(requiresSSL);
function getStakingLedgers(hash, key) {
    return __awaiter(this, void 0, void 0, function () {
        var query, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    query = "SELECT \n        public_key, \n        balance, \n        delegate_key, \n        timing_initial_minimum_balance, \n        timing_cliff_time, \n        timing_cliff_amount, \n        timing_vesting_period, \n        timing_vesting_increment \n        FROM public.staking_ledger\n        WHERE hash = '".concat(hash, "' AND delegate_key = '").concat(key, "'");
                    return [4 /*yield*/, sldb.query(query)];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, buildLedgerEntries(result.rows)];
            }
        });
    });
}
exports.getStakingLedgers = getStakingLedgers;
function getStakingLedgersByEpoch(key, epoch) {
    return __awaiter(this, void 0, void 0, function () {
        var query, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    query = "SELECT \n        public_key, \n        balance, \n        delegate_key, \n        timing_initial_minimum_balance, \n        timing_cliff_time, \n        timing_cliff_amount, \n        timing_vesting_period, \n        timing_vesting_increment \n        FROM public.staking_ledger\n        WHERE delegate_key = '".concat(key, "' AND epoch = ").concat(epoch);
                    return [4 /*yield*/, sldb.query(query)];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, buildLedgerEntries(result.rows)];
            }
        });
    });
}
exports.getStakingLedgersByEpoch = getStakingLedgersByEpoch;
function hashExists(hash) {
    return __awaiter(this, void 0, void 0, function () {
        var query, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    query = "select count(1) from staking_ledger where hash='".concat(hash, "'");
                    return [4 /*yield*/, sldb.query(query)];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result.rows[0].count > 0];
            }
        });
    });
}
exports.hashExists = hashExists;
function insertBatch(dataArray, hash, nextEpoch) {
    return __awaiter(this, void 0, void 0, function () {
        var epoch, client, batchSize, i, batch, values, query, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("insertBatch called: ".concat(dataArray.length, " records to insert."));
                    return [4 /*yield*/, db.getEpoch(hash)];
                case 1:
                    epoch = _a.sent();
                    return [4 /*yield*/, sldb.connect()];
                case 2:
                    client = _a.sent();
                    _a.label = 3;
                case 3:
                    _a.trys.push([3, 10, , 12]);
                    return [4 /*yield*/, client.query('BEGIN')];
                case 4:
                    _a.sent();
                    batchSize = 1000;
                    console.log('Number of records:', dataArray.length);
                    i = 0;
                    _a.label = 5;
                case 5:
                    if (!(i < dataArray.length)) return [3 /*break*/, 8];
                    batch = dataArray.slice(i, i + batchSize);
                    values = batch.map(function (item, index) { return "(DEFAULT, $".concat(index * 20 + 1, ", $").concat(index * 20 + 2, ", $").concat(index * 20 + 3, ", $").concat(index * 20 + 4, ", $").concat(index * 20 + 5, ", $").concat(index * 20 + 6, ", $").concat(index * 20 + 7, ", $").concat(index * 20 + 8, ", $").concat(index * 20 + 9, ", $").concat(index * 20 + 10, ", $").concat(index * 20 + 11, ", $").concat(index * 20 + 12, ", $").concat(index * 20 + 13, ", $").concat(index * 20 + 14, ", $").concat(index * 20 + 15, ", $").concat(index * 20 + 16, ", $").concat(index * 20 + 17, ", $").concat(index * 20 + 18, ", $").concat(index * 20 + 19, ", $").concat(index * 20 + 20, ") "); });
                    query = "INSERT INTO staking_ledger(   \n                  id,\n                  hash,\n                  epoch,\n                  public_key,\n                  balance,\n                  delegate_key, \n                  token,\n                  nonce,\n                  receipt_chain_hash,\n                  voting_for,\n                  timing_initial_minimum_balance,\n                  timing_cliff_time,\n                  timing_cliff_amount,\n                  timing_vesting_period,\n                  timing_vesting_increment,\n                  permissions_stake,\n                  permissions_edit_state,\n                  permissions_send,\n                  permissions_set_delegate,\n                  permissions_set_permissions,\n                  permissions_set_verification_key ) VALUES ".concat(values.join(', '));
                    return [4 /*yield*/, client.query(query, batch.flatMap(function (item) {
                            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
                            return [
                                hash,
                                epoch == -1 ? nextEpoch : epoch,
                                item.pk,
                                item.balance,
                                item.delegate,
                                item.token,
                                item.nonce,
                                item.receipt_chain_hash,
                                item.voting_for,
                                (_a = item.timing) === null || _a === void 0 ? void 0 : _a.initial_minimum_balance,
                                (_b = item.timing) === null || _b === void 0 ? void 0 : _b.cliff_time,
                                (_c = item.timing) === null || _c === void 0 ? void 0 : _c.cliff_amount,
                                (_d = item.timing) === null || _d === void 0 ? void 0 : _d.vesting_period,
                                (_e = item.timing) === null || _e === void 0 ? void 0 : _e.vesting_increment,
                                (_f = item.permissions) === null || _f === void 0 ? void 0 : _f.stake,
                                (_g = item.permissions) === null || _g === void 0 ? void 0 : _g.edit_stake,
                                (_h = item.permissions) === null || _h === void 0 ? void 0 : _h.send,
                                (_j = item.permissions) === null || _j === void 0 ? void 0 : _j.set_delegate,
                                (_k = item.permissions) === null || _k === void 0 ? void 0 : _k.set_permissions,
                                (_l = item.permissions) === null || _l === void 0 ? void 0 : _l.set_verification_key
                            ];
                        }))];
                case 6:
                    _a.sent();
                    console.log("Inserted ".concat(batch.length, " records"));
                    _a.label = 7;
                case 7:
                    i += batchSize;
                    return [3 /*break*/, 5];
                case 8: return [4 /*yield*/, client.query('COMMIT')];
                case 9:
                    _a.sent();
                    return [3 /*break*/, 12];
                case 10:
                    error_1 = _a.sent();
                    return [4 /*yield*/, client.query('ROLLBACK')];
                case 11:
                    _a.sent();
                    console.error("Error inserting batch: ".concat(error_1));
                    return [3 /*break*/, 12];
                case 12: return [2 /*return*/];
            }
        });
    });
}
exports.insertBatch = insertBatch;
function buildLedgerEntries(resultRows) {
    var ledgerEntries = [];
    for (var _i = 0, resultRows_1 = resultRows; _i < resultRows_1.length; _i++) {
        var row = resultRows_1[_i];
        var stakingLedger = {
            pk: row.public_key,
            balance: row.balance,
            delegate: row.delegate_key,
            timing: {
                initial_minimum_balance: row.timing_initial_minimum_balance,
                cliff_time: row.timing_cliff_time,
                cliff_amount: row.timing_cliff_amount,
                vesting_period: row.vesting_period,
                vesting_increment: row.vesting_increment
            }
        };
        ledgerEntries.push(stakingLedger);
    }
    return ledgerEntries;
}
