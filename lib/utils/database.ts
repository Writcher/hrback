import { isAppError } from "../types/error";
import { createDatabaseError, createNotFoundError, logError } from "./error";
import { db } from "@vercel/postgres";

const client = db;

export async function executeQuery<T = any>(
    operation: string,
    queryFn: () => Promise<T>,
    context?: Record<string, any>,
    transaction?: boolean
): Promise<T> {
    try {
        if (transaction) {
            await client.query('BEGIN');
        };

        const response = await queryFn();

        if (transaction) {
            await client.query('COMMIT');
        };

        return response;
    } catch (error) {
        if (transaction) {
            await client.query('ROLLBACK');
        };

        if (isAppError(error)) {
            throw error;
        };
        
        logError('error', operation, error, context);
        throw createDatabaseError(operation, context || {}, error instanceof Error ? error : undefined);
    };
};

export function checkRowsAffected(
    result: { rowCount: number | null },
    resource: string,
    identifier?: Record<string, any>
): void {
    if (!result.rowCount || result.rowCount === 0) {
        throw createNotFoundError(resource, identifier);
    };
};

