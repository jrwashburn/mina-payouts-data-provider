"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var helmet_1 = require("helmet");
var express_rate_limit_1 = require("express-rate-limit");
var response_time_1 = require("response-time");
var environmentConfiguration_1 = require("./configurations/environmentConfiguration");
var consensus_1 = require("./routes/consensus");
var epoch_1 = require("./routes/epoch");
var blocks_1 = require("./routes/blocks");
var stakingLedgers_1 = require("./routes/stakingLedgers");
var limiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 5 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 100 requests per windowMs
    standardHeaders: 'draft-7',
    legacyHeaders: false,
});
var app = (0, express_1.default)();
app.use((0, response_time_1.default)());
app.use((0, helmet_1.default)());
app.use(limiter);
app.use('/consensus', consensus_1.default);
app.use('/epoch', epoch_1.default);
app.use('/blocks', blocks_1.default);
app.use('/staking-ledger', stakingLedgers_1.default);
app.listen(environmentConfiguration_1.default.port, function () {
    console.log("Mina Pool Payout Data Provider listening on ".concat(environmentConfiguration_1.default.port));
});
