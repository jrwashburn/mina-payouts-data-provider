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
var express_1 = require("express");
var sldb = require("../database/stakingLedgerDb");
var minaAddressShareClass_1 = require("../mina-addresses/minaAddressShareClass");
var router = express_1.default.Router();
router.get('/:ledgerHash', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var key, ledgerHash, stakes, response, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                key = req.query.key;
                ledgerHash = req.params.ledgerHash;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, getStakes(ledgerHash, key)];
            case 2:
                stakes = _a.sent();
                response = { stakes: stakes, messages: [] };
                res.status(200).json(response);
                return [3 /*break*/, 4];
            case 3:
                error_1 = _a.sent();
                console.log(error_1);
                res.status(500).send('An error occurred getting staking ledger information');
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
router.get('/epoch/:epoch', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var key, epoch, stakes, response, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                key = req.query.key;
                epoch = parseInt(req.params.epoch);
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, getStakesByEpoch(key, epoch)];
            case 2:
                stakes = _a.sent();
                response = { stakes: stakes, messages: [] };
                res.status(200).json(response);
                return [3 /*break*/, 4];
            case 3:
                error_2 = _a.sent();
                console.log(error_2);
                res.status(500).send('An error occurred getting staking ledger information');
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
function getStakes(ledgerHash, key) {
    return __awaiter(this, void 0, void 0, function () {
        var totalStakingBalance_1, ledger, stakers, error_3;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    totalStakingBalance_1 = 0;
                    return [4 /*yield*/, sldb.getStakingLedgers(ledgerHash, key)];
                case 1:
                    ledger = _a.sent();
                    return [4 /*yield*/, Promise.all(ledger.map(function (stake) { return __awaiter(_this, void 0, void 0, function () {
                            var balance;
                            var _a;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        balance = Number(stake.balance);
                                        totalStakingBalance_1 += balance;
                                        _a = {
                                            publicKey: stake.pk,
                                            stakingBalance: balance
                                        };
                                        return [4 /*yield*/, calculateUntimedSlot(stake)];
                                    case 1:
                                        _a.untimedAfterSlot = _b.sent();
                                        return [4 /*yield*/, (0, minaAddressShareClass_1.getPublicKeyShareClass)(stake.pk)];
                                    case 2: return [2 /*return*/, (_a.shareClass = _b.sent(),
                                            _a)];
                                }
                            });
                        }); }))];
                case 2:
                    stakers = _a.sent();
                    return [2 /*return*/, [stakers, totalStakingBalance_1]];
                case 3:
                    error_3 = _a.sent();
                    console.error('Error:', error_3);
                    throw error_3;
                case 4: return [2 /*return*/];
            }
        });
    });
}
function getStakesByEpoch(key, epoch) {
    return __awaiter(this, void 0, void 0, function () {
        var totalStakingBalance_2, ledger, stakers, error_4;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    totalStakingBalance_2 = 0;
                    return [4 /*yield*/, sldb.getStakingLedgersByEpoch(key, epoch)];
                case 1:
                    ledger = _a.sent();
                    return [4 /*yield*/, Promise.all(ledger.map(function (stake) { return __awaiter(_this, void 0, void 0, function () {
                            var balance;
                            var _a;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        balance = Number(stake.balance);
                                        totalStakingBalance_2 += balance;
                                        _a = {
                                            publicKey: stake.pk,
                                            stakingBalance: balance
                                        };
                                        return [4 /*yield*/, calculateUntimedSlot(stake)];
                                    case 1:
                                        _a.untimedAfterSlot = _b.sent();
                                        return [4 /*yield*/, (0, minaAddressShareClass_1.getPublicKeyShareClass)(stake.pk)];
                                    case 2: return [2 /*return*/, (_a.shareClass = _b.sent(),
                                            _a)];
                                }
                            });
                        }); }))];
                case 2:
                    stakers = _a.sent();
                    return [2 /*return*/, [stakers, totalStakingBalance_2]];
                case 3:
                    error_4 = _a.sent();
                    console.error('Error:', error_4);
                    throw error_4;
                case 4: return [2 /*return*/];
            }
        });
    });
}
function calculateUntimedSlot(ledgerEntry) {
    if (!ledgerEntry.timing) {
        return 0;
    }
    else {
        var vestingPeriod = Number(ledgerEntry.timing.vesting_period);
        var vestingIncrement = Number(ledgerEntry.timing.vesting_increment);
        var cliffTime = Number(ledgerEntry.timing.cliff_time);
        var cliffAmount = Number(ledgerEntry.timing.cliff_amount);
        var initialMinimumBalance = Number(ledgerEntry.timing.initial_minimum_balance);
        if (vestingIncrement === 0) {
            if (cliffAmount === initialMinimumBalance) {
                return cliffTime;
            }
            else {
                throw new Error('Timed Account with no increment - unsure how to handle');
            }
        }
        else {
            return ((initialMinimumBalance - cliffAmount) / vestingIncrement) * vestingPeriod + cliffTime;
        }
    }
}
exports.default = router;
