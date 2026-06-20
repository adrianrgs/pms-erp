ALTER TABLE reservas ADD COLUMN localizador VARCHAR(20);

-- Generate localizador for existing reservations
UPDATE reservas SET localizador = 'L-' || UPPER(SUBSTRING(id::text, 1, 8)) WHERE localizador IS NULL;

-- Make it not null after populating
ALTER TABLE reservas ALTER COLUMN localizador SET NOT NULL;
