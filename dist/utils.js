"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorMessage_MissingAppCredentialsKeys = exports.sleep = exports.doDebug = exports.silentFail = exports.errorMessage = exports.InputError = exports.GenericError = void 0;
class GenericError extends Error {
    runConclusion = 'unknown';
}
exports.GenericError = GenericError;
class InputError extends GenericError {
}
exports.InputError = InputError;
function errorMessage(error) {
    return error instanceof Error ? error.message : typeof error === 'string' ? error : JSON.stringify(error);
}
exports.errorMessage = errorMessage;
function silentFail(noThrow) {
    return ['true', 'yes'].includes(noThrow.toLowerCase());
}
exports.silentFail = silentFail;
function doDebug(options, ...values) {
    if (['true', 'yes'].includes((options.debug ?? 'no').toLowerCase())) {
        if (typeof values[0] === 'string') {
            console.log(`::group::${values[0]}`);
        }
        console.log(...values);
        if (typeof values[0] === 'string') {
            console.log('::endgroup::');
        }
    }
}
exports.doDebug = doDebug;
async function sleep(interval = 1000) {
    return new Promise((resolve) => setTimeout(resolve, interval));
}
exports.sleep = sleep;
exports.errorMessage_MissingAppCredentialsKeys = 'Missing appId, installationId, or privateKey in AppCredentials.';
