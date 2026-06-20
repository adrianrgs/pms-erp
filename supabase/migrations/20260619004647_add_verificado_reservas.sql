-- Añadir campo pago_verificado a la tabla de reservas
ALTER TABLE reservas ADD COLUMN IF NOT EXISTS pago_verificado BOOLEAN DEFAULT false;
