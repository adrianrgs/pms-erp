-- Añadir campo comprobante_url a la tabla de reservas
ALTER TABLE reservas ADD COLUMN IF NOT EXISTS comprobante_url TEXT;
