export class GenericError extends Error {
  runConclusion = 'unknown';
}

export class InputError extends GenericError {}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : typeof error === 'string' ? error : JSON.stringify(error);
}

export function silentFail(noThrow: string): boolean {
  return ['true', 'yes'].includes(noThrow.toLowerCase());
}

export async function sleep(interval = 1000): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, interval));
}

export const errorMessage_MissingAppCredentialsKeys = 'Missing appId, installationId, or privateKey in AppCredentials.';
