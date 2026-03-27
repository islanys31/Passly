const clientController = require('../controllers/client.controller');
const { pool: db } = require('../config/db');

jest.mock('../config/db', () => ({
    pool: { query: jest.fn() }
}));

jest.mock('../utils/logger', () => ({
    logAction: jest.fn()
}));

jest.mock('../utils/pagination', () => ({
    getPaginationParams: jest.fn().mockReturnValue({
        limit: 10,
        offset: 0,
        searchFilter: '',
        searchParams: []
    })
}));

describe('Client Controller', () => {
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

    test('getAll should return paginated clients', async () => {
        db.query
            .mockResolvedValueOnce([[{ total: 5 }]]) // count query
            .mockResolvedValueOnce([[{ id: 1, nombre: 'Empresa A' }]]); // data query

        await clientController.getAll(mockReq, mockRes);

        expect(db.query).toHaveBeenCalledTimes(2);
        expect(mockRes.json).toHaveBeenCalledWith({
            data: [{ id: 1, nombre: 'Empresa A' }],
            pagination: { total: 5, page: 1, limit: 10 }
        });
    });

    test('create should validate nombre', async () => {
        await clientController.create(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'El nombre del cliente es requerido' });
    });

    test('create should insert new client', async () => {
        mockReq.body = { nombre: 'Nueva Empresa', email: 'test@empresa.com' };
        db.query.mockResolvedValueOnce([{ insertId: 2 }]);

        await clientController.create(mockReq, mockRes);

        expect(db.query).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO clientes'),
            ['Nueva Empresa', null, 'test@empresa.com', null]
        );
        expect(mockRes.status).toHaveBeenCalledWith(201);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, id: 2 }));
    });

    test('update should modify client', async () => {
        mockReq.params.id = 2;
        mockReq.body = { nombre: 'Updated Nombre', telefono: '123' };
        db.query.mockResolvedValueOnce([{}]);

        await clientController.update(mockReq, mockRes);

        expect(db.query).toHaveBeenCalledWith(
            expect.stringContaining('UPDATE clientes SET'),
            ['Updated Nombre', '123', undefined, undefined, 2]
        );
        expect(mockRes.json).toHaveBeenCalledWith({ success: true, message: 'Cliente actualizado correctamente' });
    });

    test('deactivate should prevent deactivating default client', async () => {
        mockReq.params.id = 1;
        await clientController.deactivate(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'No se puede desactivar el cliente central de Passly' });
    });

    test('deactivate should update estado_id to 2', async () => {
        mockReq.params.id = 2;
        db.query.mockResolvedValueOnce([{}]);

        await clientController.deactivate(mockReq, mockRes);

        expect(db.query).toHaveBeenCalledWith(
            'UPDATE clientes SET estado_id = 2 WHERE id = ?',
            [2]
        );
        expect(mockRes.json).toHaveBeenCalledWith({ success: true, message: 'Cliente desactivado' });
    });
});
