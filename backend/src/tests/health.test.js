const request = require('supertest');
const app = require('../app');

describe('API Health Check', () => {
    it('should return welcome message from /api', async () => {
        const res = await request(app).get('/api');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('status', 'running');
    });

    it('should return 404 for unknown routes', async () => {
        const res = await request(app).get('/api/unknown-route');
        expect(res.statusCode).toEqual(404);
        expect(res.body).toHaveProperty('success', false);
    });
});
