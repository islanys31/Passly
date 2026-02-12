const request = require('supertest');
const app = require('../app');
const { pool: db } = require('../config/db');
const jwt = require('jsonwebtoken');

jest.mock('../config/db', () => ({
    pool: {
        query: jest.fn()
    }
}));

describe('Stats Endpoint', () => {
    let token;
    const TEST_SECRET = 'passly_super_test_secret_key';

    beforeAll(() => {
        // Forzar el secreto para el middleware
        process.env.JWT_SECRET = TEST_SECRET;
        process.env.JWT_EXPIRES_IN = '1h';

        // Generar un token válido para las pruebas
        token = jwt.sign({ id: 1, rol_id: 1 }, TEST_SECRET);
    });

    it('should return 403 if not authenticated', async () => {
        const res = await request(app).get('/api/stats');
        expect(res.statusCode).toEqual(403);
    });

    it('should return real stats when authenticated', async () => {
        // Mockear las 3 consultas de stats
        db.query.mockResolvedValueOnce([[{ total: 10 }]]); // Usuarios
        db.query.mockResolvedValueOnce([[{ total: 5 }]]); // Accesos
        db.query.mockResolvedValueOnce([[{ total: 15 }]]); // Dispositivos

        const res = await request(app)
            .get('/api/stats')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toBe(true);
        expect(res.body.stats).toEqual({
            usuariosActivos: 10,
            accesosHoy: 5,
            dispositivosActivos: 15,
            alertas: 0
        });
    });
});
