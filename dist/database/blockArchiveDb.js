"use strict";
// Relies on view ConsensusChainForPayout in the archive database 
// view can be created wihth script in src/database/dbScripts/createMaterializedView.sql
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
exports.getEpoch = exports.getBlocks = exports.getMinMaxBlocksInSlotRange = exports.getLatestBlock = void 0;
var databaseFactory_1 = require("./databaseFactory");
var environmentConfiguration_1 = require("../configurations/environmentConfiguration");
console.log("Creating pool targeting ".concat(environmentConfiguration_1.default.dbHost, " at port ").concat(environmentConfiguration_1.default.dbPort));
var pool = (0, databaseFactory_1.createPool)(environmentConfiguration_1.default.dbConnectionSSL);
var blockQuery = "\n    SELECT\n    blockheight,\n    statehash,\n    stakingledgerhash,\n    blockdatetime,\n    slot,\n    globalslotsincegenesis,\n    creatorpublickey,\n    winnerpublickey,\n    recevierpublickey,\n    coinbase,\n    feetransfertoreceiver,\n    feetransferfromcoinbase,\n    usercommandtransactionfees\n    FROM ConsensusChainForPayout\n    WHERE creatorpublickey = $1\n    AND blockheight >= $2\n    AND blockheight <= $3\n    ORDER BY blockheight DESC;\n";
var getNullParentsQuery = "\n    SELECT height FROM blocks WHERE parent_id is null AND height >= $1 AND height <= $2\n";
function getLatestBlock() {
    return __awaiter(this, void 0, void 0, function () {
        var query, result, blockSummary;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    query = "\n    SELECT \n    height as blockheight, \n    global_slot_since_genesis as globalslotsincegenesis,\n    global_slot as slot,\n    state_hash as statehash,\n    parent_hash as parenthash,\n    ledger_hash as ledgerhash,\n    to_char(to_timestamp(\"timestamp\" / 1000) AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS') || '.' || \n        LPAD(((\"timestamp\" % 1000)::text), 3, '0') || 'Z' as datetime\n    FROM blocks\n    WHERE id in (SELECT MAX(id) FROM blocks)";
                    return [4 /*yield*/, pool.query(query)];
                case 1:
                    result = _a.sent();
                    blockSummary = result.rows[0];
                    return [2 /*return*/, blockSummary];
            }
        });
    });
}
exports.getLatestBlock = getLatestBlock;
function getMinMaxBlocksInSlotRange(min, max) {
    return __awaiter(this, void 0, void 0, function () {
        var query, result, epochminblockheight, epochmaxblockheight;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    query = "\n        SELECT min(blockHeight) as epochminblockheight, max(blockHeight) as epochmaxblockheight \n        FROM ConsensusChainForPayout\n        WHERE globalSlotSinceGenesis between ".concat(min, " and ").concat(max);
                    return [4 /*yield*/, pool.query(query)];
                case 1:
                    result = _a.sent();
                    epochminblockheight = result.rows[0].epochminblockheight;
                    epochmaxblockheight = result.rows[0].epochmaxblockheight;
                    return [2 /*return*/, [epochminblockheight, epochmaxblockheight]];
            }
        });
    });
}
exports.getMinMaxBlocksInSlotRange = getMinMaxBlocksInSlotRange;
function getBlocks(key, minHeight, maxHeight) {
    return __awaiter(this, void 0, void 0, function () {
        var missingHeights, nullParents, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getHeightMissing(minHeight, maxHeight)];
                case 1:
                    missingHeights = _a.sent();
                    if ((minHeight === 0 && (missingHeights.length > 1 || missingHeights[0] != 0)) ||
                        (minHeight > 0 && missingHeights.length > 0)) {
                        throw new Error("Archive database is missing blocks in the specified range. Import them and try again. Missing blocks were: ".concat(JSON.stringify(missingHeights)));
                    }
                    return [4 /*yield*/, getNullParents(minHeight, maxHeight)];
                case 2:
                    nullParents = _a.sent();
                    if ((minHeight === 0 && (nullParents.length > 1 || nullParents[0] != 1)) ||
                        (minHeight > 0 && nullParents.length > 0)) {
                        throw new Error("Archive database has null parents in the specified range. Import them and try again. Blocks with null parents were: ".concat(JSON.stringify(nullParents)));
                    }
                    return [4 /*yield*/, pool.query(blockQuery, [key, minHeight, maxHeight])];
                case 3:
                    result = _a.sent();
                    return [2 /*return*/, result.rows];
            }
        });
    });
}
exports.getBlocks = getBlocks;
function getEpoch(hash) {
    return __awaiter(this, void 0, void 0, function () {
        var query, result, minGlobalSlot, maxGlobalSlot, slotsInEpoch, epoch, nextEpoch, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!process.env.NUM_SLOTS_IN_EPOCH)
                        throw Error('ERROR: NUM_SLOTS_IN_EPOCH not present in .env file. ');
                    query = "\n    SELECT MIN(b.global_slot), MAX(b.global_slot) \n    FROM blocks b\n    INNER JOIN epoch_data ed ON b.staking_epoch_data_id = ed.id\n    INNER JOIN snarked_ledger_hashes slh ON ed.ledger_hash_id = slh.id\n    WHERE slh.value = '".concat(hash, "'\n    ");
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, pool.query(query)];
                case 2:
                    result = _a.sent();
                    if (result.rows[0].min && result.rows[0].max) {
                        minGlobalSlot = Number.parseFloat(result.rows[0].min);
                        maxGlobalSlot = Number.parseFloat(result.rows[0].max);
                        slotsInEpoch = Number.parseInt(process.env.NUM_SLOTS_IN_EPOCH);
                        epoch = Math.floor(minGlobalSlot / slotsInEpoch);
                        nextEpoch = Math.ceil(maxGlobalSlot / slotsInEpoch);
                        if (epoch + 1 == nextEpoch) {
                            return [2 /*return*/, epoch];
                        }
                        else {
                            throw Error("Error getting epoch, minGlobalSlot and maxGlobalSlot are from different epochs");
                        }
                    }
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _a.sent();
                    console.log("Error getting epoch ".concat(error_1));
                    throw error_1;
                case 4: return [2 /*return*/, -1];
            }
        });
    });
}
exports.getEpoch = getEpoch;
function getHeightMissing(minHeight, maxHeight) {
    return __awaiter(this, void 0, void 0, function () {
        var query, result, heights;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    query = "\n    SELECT h as height\n    FROM (SELECT h::int FROM generate_series(".concat(minHeight, " , ").concat(maxHeight, ") h\n    LEFT JOIN blocks b\n    ON h = b.height where b.height is null) as v\n  ");
                    return [4 /*yield*/, pool.query(query)];
                case 1:
                    result = _a.sent();
                    heights = result.rows;
                    return [2 /*return*/, heights.map(function (x) { return x.height; })];
            }
        });
    });
}
function getNullParents(minHeight, maxHeight) {
    return __awaiter(this, void 0, void 0, function () {
        var result, heights;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, pool.query(getNullParentsQuery, [minHeight, maxHeight])];
                case 1:
                    result = _a.sent();
                    heights = result.rows;
                    return [2 /*return*/, heights.map(function (x) { return x.height; })];
            }
        });
    });
}
