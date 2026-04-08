const userController = require('../controllers/user.controller');
const { pool: db } = require('../config/db');
const bcrypt = require('bcrypt');
const emailService = require('../services/email.service');
const { logAction } = require('../utils/logger');
const { getPagination, paginatedResponse } = require('../utils/pagination');
const { invalidateUserCache } = require('../middlewares/authMiddleware');

jest.mock('../config/db', () => ({
    pool: { query: jest.fn() }
}));

jest.mock('bcrypt', () => ({
    genSalt: jest.fn().mockResolvedValue('salt'),
    hash: jest.fn().mockResolvedValue('hashed_password'),
    compare: jest.fn()
}));

jest.mock('../utils/logger', () => ({
    logAction: jest.fn()
}));

jest.mock('../services/email.service', () => ({
    sendWelcomeEmail: jest.fn().mockResolvedValue(true)
}));

jest.mock('../utils/pagination', () => ({
    getPagination: jest.fn().mockReturnValue({ page: 1, limit: 10, offset: 0 }),
    paginatedResponse: jest.fn().mockReturnValue({ ok: true })
}));

jest.mock('../middlewares/authMiddleware', () => ({
    invalidateUserCache: jest.fn(),
    authenticateJWT: jest.fn((req, res, next) => next()),
    authorizeRoles: jest.fn(() => (req, res, next) => next())
}));

jest.mock('../config/socket', () => ({
    getIO: jest.fn().mockReturnValue({ emit: jest.fn() })
}));

describe('User Controller Tests', () => {
    let mockReq, mockRes;

    beforeEach(() => {
        mockReq = {
            user: { id: 1, cliente_id: 1 },
            query: {},
            body: {},
            params: {},
            ip: '127.0.0.1'
        };
        mockRes = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
        };
        jest.clearAllMocks();
    });

    test('getAllUsers should return paginated list', async () => {
        db.query.mockResolvedValueOnce([[{ total: 10 }]]); // count
        db.query.mockResolvedValueOnce([[{ id: 1, nombre: 'A' }]]); // data
        
        await userController.getAllUsers(mockReq, mockRes);
        expect(db.query).toHaveBeenCalledTimes(2);
        expect(mockRes.json).toHaveBeenCalled();
    });

    test('createUser should reject duplicate email', async () => {
        mockReq.body = { nombre: 'Test', apellido: 'Test', email: 'test@t.com', password: '123', rol_id: 1 };
        db.query.mockResolvedValueOnce([[{ id: 1 }]]); // email exists

        await userController.createUser(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ ok: false, error: 'El correo electrónico ya está registrado en el sistema' });
    });

    test('createUser should create and send email', async () => {
        mockReq.body = { nombre: 'Test', apellido: 'Test', email: 'new@t.com', password: '123', rol_id: 1 };
        db.query.mockResolvedValueOnce([[]]); // email not exists
        db.query.mockResolvedValueOnce([{ insertId: 5 }]); // insert

        await userController.createUser(mockReq, mockRes);
        expect(bcrypt.hash).toHaveBeenCalled();
        expect(db.query).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO usuarios'),
            ['Test', 'Test', 'new@t.com', 'hashed_password', 1, 1]
        );
        expect(emailService.sendWelcomeEmail).toHaveBeenCalledWith('new@t.com', 'Test');
        expect(mockRes.status).toHaveBeenCalledWith(201);
        expect(mockRes.json).toHaveBeenCalledWith({ ok: true, id: 5 });
    });

    test('updateUser should reject if tenantId mismatch', async () => {
        mockReq.params.id = 2;
        mockReq.body = { nombre: 'U', apellido: 'U', email: 'u@u.com', rol_id: 2, estado_id: 1 };
        db.query.mockResolvedValueOnce([[{ cliente_id: 99 }]]); // Diff tenant

        await userController.updateUser(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    test('deleteUser should update estado_id and invalidate cache', async () => {
        mockReq.params.id = 3;
        db.query.mockResolvedValueOnce([[{ cliente_id: 1 }]]); // Same tenant
        db.query.mockResolvedValueOnce([{}]); // update

        await userController.deleteUser(mockReq, mockRes);
        expect(db.query).toHaveBeenCalledWith('UPDATE usuarios SET estado_id = 2 WHERE id = ?', [3]);
        expect(invalidateUserCache).toHaveBeenCalledWith(3);
        expect(mockRes.json).toHaveBeenCalledWith({ ok: true });
    });
});
