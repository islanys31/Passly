CREATE TABLE IF NOT EXISTS equipos (
    id INT(11) NOT NULL AUTO_INCREMENT,
    usuario_id INT(11) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    tipo VARCHAR(50) DEFAULT 'General',
    serial VARCHAR(100) DEFAULT NULL,
    estado_id INT(11) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY usuario_id (usuario_id),
    KEY estado_id (estado_id),
    CONSTRAINT fk_equipos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id),
    CONSTRAINT fk_equipos_estado FOREIGN KEY (estado_id) REFERENCES estados (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
