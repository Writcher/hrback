export type appError = {
    type: 'validation' | 'database' | 'not_found' | 'unauthorized' | 'forbidden' | 'conflict' | 'unknown' | 'backend';
    message: string;
    context?: Record<string, any>;
    originalError?: Error;
};
export function isAppError(error: unknown): error is appError {
    return error !== null &&
        typeof error === 'object' &&
        'type' in error &&
        'message' in error;
};