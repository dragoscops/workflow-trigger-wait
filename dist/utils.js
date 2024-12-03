export class GenericError extends Error {
    runConclusion = 'unknown';
}
export class InputError extends GenericError {
}
export function errorMessage(error) {
    return error instanceof Error ? error.message : typeof error === 'string' ? error : JSON.stringify(error);
}
export function silentFail(noThrow) {
    return ['true', 'yes'].includes(noThrow.toLowerCase());
}
export function doDebug(options, ...values) {
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
export async function sleep(interval = 1000) {
    return new Promise((resolve) => setTimeout(resolve, interval));
}
export const errorMessage_MissingAppCredentialsKeys = 'Missing appId, installationId, or privateKey in AppCredentials.';