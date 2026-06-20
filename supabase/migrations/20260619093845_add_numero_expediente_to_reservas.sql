-- Añadir campo numero_expediente a la tabla de reservas
ALTER TABLE reservas ADD COLUMN IF NOT EXISTS numero_expediente TEXT;
