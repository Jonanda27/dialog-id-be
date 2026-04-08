import { errorResponse } from '../utils/apiResponse.js';

/**
 * Global Error Handling Middleware
 */
export const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';
    let errors = null;

    // Log error stack to console if in development mode
    if (process.env.NODE_ENV === 'development') {
        console.error(`[ERROR] ${err.name}: ${err.message}`);
        console.error(err.stack);
    }

    // 1. Handle Zod Validation Errors
    if (err.name === 'ZodError') {
        statusCode = 400;
        message = 'Validation Error';
        errors = err.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message
        }));
    }

    // 2. Handle Sequelize Database Errors
    if (err.name === 'SequelizeUniqueConstraintError') {
        statusCode = 409; // Conflict
        message = 'Duplicate data found';
        errors = err.errors.map((e) => ({
            field: e.path,
            message: e.message
        }));
    }

    if (err.name === 'SequelizeValidationError') {
        statusCode = 400;
        message = 'Database Validation Error';
        errors = err.errors.map((e) => ({
            field: e.path,
            message: e.message
        }));
    }

    // 3. Handle JWT Errors
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid Token';
    }

    if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token Expired';
    }

    // Fallback to standard error response
    return errorResponse(res, statusCode, message, errors);
};