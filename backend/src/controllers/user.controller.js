const { executeQuery } = require('../utils/db.utils');
const bcrypt = require('bcrypt');

// GetAll
exports.getAllUsers = async (req, res) => {
    const users = await executeQuery('SELECT id, nombre, apellido, email, rol_id, estado_id, created_at FROM usuarios', [], res);
    if (users) res.json(users);
};

// GetOne
exports.getUserById = async (req, res) => {
    const users = await executeQuery('SELECT id, nombre, apellido, email, rol_id, estado_id, created_at FROM usuarios WHERE id = ?', [req.params.id], res);
    if (!users) return;
    if (users.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(users[0]);
};

// Create
exports.createUser = async (req, res) => {
    const { nombre, apellido, email, password, rol_id, cliente_id } = req.body;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await executeQuery(
        'INSERT INTO usuarios (nombre, apellido, email, password, cliente_id, rol_id, estado_id) VALUES (?, ?, ?, ?, ?, ?, 1)',
        [nombre, apellido, email, hashedPassword, cliente_id, rol_id],
        res
    );
    if (result) res.status(201).json({ id: result.insertId, message: 'Usuario creado' });
};

// Update
exports.updateUser = async (req, res) => {
    const { nombre, apellido, email, rol_id, estado_id } = req.body;
    const result = await executeQuery(
        'UPDATE usuarios SET nombre = ?, apellido = ?, email = ?, rol_id = ?, estado_id = ? WHERE id = ?',
        [nombre, apellido, email, rol_id, estado_id, req.params.id],
        res
    );
    if (result) res.json({ message: 'Usuario actualizado' });
};

// Delete
exports.deleteUser = async (req, res) => {
    const result = await executeQuery('UPDATE usuarios SET estado_id = 2 WHERE id = ?', [req.params.id], res);
    if (result) res.json({ message: 'Usuario desactivado' });
};
