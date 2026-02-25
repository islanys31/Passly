/**
 * @file pagination.js
 * @description Helper centralizado para paginación de listados.
 * Estandariza los parámetros `page` y `limit` en todos los endpoints de listado.
 */

/**
 * Extrae y valida los parámetros de paginación del query string.
 * @param {object} query - req.query de Express
 * @param {number} defaultLimit - Límite de registros por defecto
 * @param {number} maxLimit - Límite máximo permitido (evita abusos)
 * @returns {{ page, limit, offset }}
 */
function getPagination(query, defaultLimit = 20, maxLimit = 100) {
    let page = parseInt(query.page, 10) || 1;
    let limit = parseInt(query.limit, 10) || defaultLimit;

    if (page < 1) page = 1;
    if (limit < 1) limit = defaultLimit;
    if (limit > maxLimit) limit = maxLimit;

    const offset = (page - 1) * limit;
    return { page, limit, offset };
}

/**
 * Construye el objeto de respuesta paginada estándar de la API.
 * @param {Array}  data  - Registros de la página actual
 * @param {number} total - Total de registros sin paginar
 * @param {number} page  - Página actual
 * @param {number} limit - Registros por página
 */
function paginatedResponse(data, total, page, limit) {
    const safeLimit = limit < 1 ? 20 : limit;
    const totalPages = Math.ceil(total / safeLimit);

    return {
        ok: true,
        data,
        pagination: {
            total,
            page,
            limit: safeLimit,
            totalPages: totalPages || 1, // Bug 7: Evitar NaN o división rara
            hasNext: page * safeLimit < total,
            hasPrev: page > 1
        }
    };
}

module.exports = { getPagination, paginatedResponse };
