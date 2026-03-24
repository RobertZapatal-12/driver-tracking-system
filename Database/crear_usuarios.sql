-- =====================================================
-- Script SQL para crear usuarios de prueba en TransFleet
-- Ejecutar en SQL Server Management Studio
-- =====================================================

-- Limpiar usuarios anteriores si existen (opcional)
-- DELETE FROM users WHERE email IN ('admin@transfleet.com', 'gerente@transfleet.com', 'operario@transfleet.com');

-- Crear usuarios de prueba
INSERT INTO users (nombre, email, contrasena, role, creado_desde)
VALUES 
    ('Admin Usuario', 'admin@transfleet.com', 'admin123', 'admin', GETDATE()),
    ('Gerente Operaciones', 'gerente@transfleet.com', 'gerente123', 'manager', GETDATE()),
    ('Operario Sistema', 'operario@transfleet.com', 'operario123', 'operator', GETDATE());

-- Verificar que se crearon correctamente
SELECT * FROM users WHERE email IN ('admin@transfleet.com', 'gerente@transfleet.com', 'operario@transfleet.com');
