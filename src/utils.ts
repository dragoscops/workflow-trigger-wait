import {Options} from './options';

export class GenericError extends Error {
  runConclusion = 'unknown';
}

export class InputError extends GenericError {}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : JSON.stringify(error);
}

export function silentFail(noThrow: string): boolean {
  return ['true', 'yes'].includes(noThrow.toLowerCase());
}

export function doDebug(options: Options, ...values: unknown[]) {
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

export async function sleep(interval = 1000): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, interval));
}