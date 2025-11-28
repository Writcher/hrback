import { NextResponse } from "next/server";
import { appError, isAppError } from "../types/error";

//creates

export function createValidationError(
    message: string,
    field?: string,
    value?: any
): appError {
    return {
        type: 'validation',
        message,
        context: { field, value }
    };
};

export function createDatabaseError(
    operation: string,
    context: Record<string, any>,
    originalError?: Error
): appError {
    return {
        type: 'database',
        message: `Database operation failed: ${operation}`,
        context,
        originalError
    };
};

export function createBackEndError(
    operation: string,
): appError {
    return {
        type: 'backend',
        message: `Backend operation failed: ${operation}`
    };
};

export function createNotFoundError(
    resource: string,
    identifier?: Record<string, any>
): appError {
    return {
        type: 'not_found',
        message: `${resource} not found`,
        context: identifier
    };
};

export function createUnauthorizedError(message = 'Unauthorized'): appError {
    return {
        type: 'unauthorized',
        message
    };
};

export function createForbiddenError(message = 'Forbidden'): appError {
    return {
        type: 'forbidden',
        message
    };
};

export function createConflictError(
    message: string,
    context?: Record<string, any>
): appError {
    return {
        type: 'conflict',
        message,
        context
    };
};

//log

type LogLevel = 'error' | 'warn' | 'info';

export function logError(
    level: LogLevel,
    operation: string,
    error: unknown,
    context?: Record<string, any>
) {
    const logData = {
        operation,
        timestamp: new Date().toISOString(),
        ...context
    };

    if (isAppError(error)) {
        console[level](`[${level.toUpperCase()}] ${operation}:`, {
            ...logData,
            type: error.type,
            message: error.message,
            context: error.context,
            originalError: error.originalError?.message,
            stack: error.originalError?.stack
        });
    } else if (error instanceof Error) {
        console[level](`[${level.toUpperCase()}] ${operation}:`, {
            ...logData,
            message: error.message,
            stack: error.stack
        });
    } else {
        console[level](`[${level.toUpperCase()}] ${operation}:`, {
            ...logData,
            error: String(error)
        });
    };
};

//handlers

type ErrorResponse = {
    error: string;
    field?: string;
    [key: string]: any;
};

const ERROR_MESSAGES: Record<appError['type'], string> = {
    validation: 'Datos inválidos',
    database: 'Error en la base de datos',
    not_found: 'Recurso no encontrado',
    unauthorized: 'No autorizado',
    forbidden: 'Acceso denegado',
    conflict: 'Conflicto con el estado actual',
    unknown: 'Error interno del servidor',
    backend: 'Error en la logica de negocio'
};

const STATUS_CODES: Record<appError['type'], number> = {
    validation: 400,
    database: 500,
    not_found: 404,
    unauthorized: 401,
    forbidden: 403,
    conflict: 409,
    unknown: 500,
    backend: 500
};

export function handleApiError(
    error: unknown,
    operation: string
): NextResponse<ErrorResponse> {
    // Handle AppError
    if (isAppError(error)) {
        const logLevel = error.type === 'validation' ? 'warn' : 'error';
        logError(logLevel, operation, error);

        const statusCode = STATUS_CODES[error.type];
        const response: ErrorResponse = {
            error: ERROR_MESSAGES[error.type]
        };

        // Add field info for validation errors
        if (error.type === 'validation' && error.context?.field) {
            response.field = error.context.field;
        }

        return NextResponse.json(response, { status: statusCode });
    }

    // Handle SyntaxError (invalid JSON)
    if (error instanceof SyntaxError) {
        logError('warn', operation, error);
        return NextResponse.json(
            { error: 'Formato de datos inválido' },
            { status: 400 }
        );
    }

    // Handle unexpected errors
    logError('error', operation, error);
    return NextResponse.json(
        { error: ERROR_MESSAGES.unknown },
        { status: 500 }
    );
};