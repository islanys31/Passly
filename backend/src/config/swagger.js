const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const options = {
    definition: {
        openapi: '3.0.0',
        info: { title: 'Passly API', version: '1.0.0' },
    },
    apis: ['./src/routes/*.js'],
};
const swaggerDocs = swaggerJsdoc(options);
module.exports = { swaggerUi, swaggerDocs };
