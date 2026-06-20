-- Add descripcion, servicios and fotos to habitaciones table
ALTER TABLE habitaciones 
ADD COLUMN IF NOT EXISTS descripcion text,
ADD COLUMN IF NOT EXISTS servicios jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS fotos jsonb DEFAULT '[]'::jsonb;
