"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAction = void 0;
const core = __importStar(require("@actions/core"));
const options_1 = require("./options");
const utils_1 = require("./utils");
const trigger_1 = require("./workflow/trigger");
const wait_1 = require("./workflow/wait");
async function run() {
    const options = (0, options_1.processOptions)();
    try {
        await runAction(options);
        core.setOutput('run_conclusion', 'success');
    }
    catch (err) {
        console.log(err);
        const conclusion = err instanceof utils_1.GenericError ? err.runConclusion ?? 'unknown' : 'unknown';
        core.setOutput('run_conclusion', conclusion);
        core.info(`Run Conclusion: ${conclusion}`);
        core.info(`Error: ${(0, utils_1.errorMessage)(err)}`);
        (0, utils_1.doDebug)(options, '[runAction]', err);
        if ((0, utils_1.silentFail)(options.noThrow)) {
            core.warning('Silent fail enabled. Suppressing action failure.');
        }
        else {
            core.setFailed(`Action failed with error: ${(0, utils_1.errorMessage)(err)}`);
        }
    }
}
exports.default = run;
async function runAction(options) {
    const { action } = options;
    if (action.includes('trigger')) {
        options.runId = await (0, trigger_1.triggerWorkflow)(options);
    }
    if (action.includes('wait')) {
        if (!options.runId) {
            throw new utils_1.InputError(`run_id is required for action: wait-only`);
        }
        await (0, wait_1.waitForWorkflow)(options);
    }
}
exports.runAction = runAction;
