const request = require('supertest');
const app = require('../app');
const { pool: db } = require('../config/db');

// Mockear el DB Pool
jest.mock('../config/db', () => ({
    pool: {
        query: jest.fn()
    }
}));

describe('Auth Endpoints', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/auth/login', () => {
        it('should return 400 if email or password missing', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'test@passly.com' });

            expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty('errors');
        });

        it('should return 401 for invalid credentials (user not found)', async () => {
            db.query.mockResolvedValueOnce([[]]); // Usuario no existe

            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'nonexistent@test.com', password: 'Password123!' });

            expect(res.statusCode).toEqual(401);
            expect(res.body.error).toBe('Credenciales inválidas');
        });
    });

    describe('POST /api/auth/register', () => {
        it('should validate password complexity', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    nombre: 'Test',
                    apellido: 'User',
                    email: 'test@passly.com',
                    password: '123' // Demasiado corta y simple
                });

            expect(res.statusCode).toEqual(400);
            expect(res.body.errors[0].message).toContain('contraseña debe tener al menos 8 caracteres');
        });
    });
});
