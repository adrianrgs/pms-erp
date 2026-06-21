-- Añadir columnas para nueva lógica de tarifas

ALTER TABLE tarifas_por_temporada 
ADD COLUMN modalidad_tarifa VARCHAR(50) DEFAULT 'por_habitacion' CHECK (modalidad_tarifa IN ('por_persona', 'por_habitacion')),
ADD COLUMN plan_alimentacion VARCHAR(50) DEFAULT 'RO' CHECK (plan_alimentacion IN ('RO', 'BB', 'AI')),
ADD COLUMN comisionable BOOLEAN DEFAULT false,
ADD COLUMN porcentaje_comision NUMERIC(5, 2) DEFAULT 0;
