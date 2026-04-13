/**
 * Utility for standardizing API responses
 */

/**
 * Send a successful JSON response
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Success message
 * @param {Object|Array} [data=null] - Payload data
 * @param {Object} [meta=null] - Pagination or extra metadata
 */
export const successResponse = (res, statusCode, message, data = null, meta = null) => {
    const response = {
        success: true,
        message,
    };

    if (data !== null) response.data = data;
    if (meta !== null) response.meta = meta;

    return res.status(statusCode).json(response);
};

/**
 * Send an error JSON response
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {Array|Object} [errors=null] - Detailed error list (e.g., validation errors)
 */
export const errorResponse = (res, statusCode, message, errors = null) => {
    const response = {
        success: false,
        message,
    };

    if (errors !== null) response.errors = errors;

    return res.status(statusCode).json(response);
};

// Create the object that matches what your controller expects
const apiResponse = {
    success: (res, message, data, meta) => successResponse(res, 200, message, data, meta),
    notFound: (res, message) => errorResponse(res, 404, message),
    error: (res, message, statusCode = 500, errors = null) => errorResponse(res, statusCode, message, errors)
};

export default apiResponse;