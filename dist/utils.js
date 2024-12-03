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
export async function sleep(interval = 1000) {
    return new Promise((resolve) => setTimeout(resolve, interval));
}
export const errorMessage_MissingAppCredentialsKeys = 'Missing appId, installationId, or privateKey in AppCredentials.';
