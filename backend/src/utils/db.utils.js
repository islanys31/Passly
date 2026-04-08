const { pool: db } = require('../config/db');

/**
 * Utility to execute DB queries with consistent error handling
 * @param {string} sql 
 * @param {array} params 
 * @param {object} res - Express response object
 */
const executeQuery = async (sql, params, res) => {
    try {
        const [result] = await db.query(sql, params);
        return result;
    } catch (error) {
        console.error('Database Error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal Database Error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
        return null;
    }
};

module.exports = { executeQuery };
