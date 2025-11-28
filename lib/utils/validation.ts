import { appError } from "../types/error";
import { createValidationError } from "./error";

export type ValidationRule<T> = {
    field: keyof T;
    required?: boolean;
    type?: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'file';
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: RegExp;
    custom?: (value: any) => boolean | string;
    // File-specific validations
    maxFileSize?: number; // in bytes
    allowedMimeTypes?: string[];
};

export type ValidationResult<T> =
    | { valid: true; data: T }
    | { valid: false; error: appError };

export function validateData<T extends Record<string, any>>(
    data: any,
    rules: ValidationRule<T>[]

): ValidationResult<T> {

    if (!data || typeof data !== 'object') {
        return {
            valid: false,
            error: createValidationError('Invalid request body')
        };
    };

    for (const rule of rules) {
        const field = String(rule.field);
        const value = data[field];

        // Check required
        if (rule.required && (value === undefined || value === null || value === '')) {
            return {
                valid: false,
                error: createValidationError(`${field} is required`, field)
            };
        };

        // Skip other validations if not required and empty
        if (!rule.required && (value === undefined || value === null)) {
            continue;
        };

        // Check type
        if (rule.type) {
            let actualType: string;
            
            if (Array.isArray(value)) {
                actualType = 'array';
            } else if (value instanceof File) {
                actualType = 'file';
            } else {
                actualType = typeof value;
            }
            
            if (actualType !== rule.type) {
                return {
                    valid: false,
                    error: createValidationError(
                        `${field} must be of type ${rule.type}`,
                        field,
                        value
                    )
                };
            };
        };

        // String validations
        if (typeof value === 'string') {
            if (rule.minLength && value.length < rule.minLength) {
                return {
                    valid: false,
                    error: createValidationError(
                        `${field} must be at least ${rule.minLength} characters`,
                        field
                    )
                };
            };
            if (rule.maxLength && value.length > rule.maxLength) {
                return {
                    valid: false,
                    error: createValidationError(
                        `${field} must be at most ${rule.maxLength} characters`,
                        field
                    )
                };
            };
            if (rule.pattern && !rule.pattern.test(value)) {
                return {
                    valid: false,
                    error: createValidationError(
                        `${field} has invalid format`,
                        field
                    )
                };
            };
        };

        // Number validations
        if (typeof value === 'number') {
            if (rule.min !== undefined && value < rule.min) {
                return {
                    valid: false,
                    error: createValidationError(
                        `${field} must be at least ${rule.min}`,
                        field
                    )
                };
            };
            if (rule.max !== undefined && value > rule.max) {
                return {
                    valid: false,
                    error: createValidationError(
                        `${field} must be at most ${rule.max}`,
                        field
                    )
                };
            };
        };

        // File validations
        if (value instanceof File) {
            if (rule.maxFileSize && value.size > rule.maxFileSize) {
                return {
                    valid: false,
                    error: createValidationError(
                        `${field} file size must be at most ${rule.maxFileSize} bytes`,
                        field
                    )
                };
            };
            if (rule.allowedMimeTypes && !rule.allowedMimeTypes.includes(value.type)) {
                return {
                    valid: false,
                    error: createValidationError(
                        `${field} file type must be one of: ${rule.allowedMimeTypes.join(', ')}`,
                        field
                    )
                };
            };
        };

        // Custom validation
        if (rule.custom) {
            const result = rule.custom(value);
            if (result !== true) {
                return {
                    valid: false,
                    error: createValidationError(
                        typeof result === 'string' ? result : `${field} is invalid`,
                        field
                    )
                };
            };
        };
    };

    return { valid: true, data: data as T };
};