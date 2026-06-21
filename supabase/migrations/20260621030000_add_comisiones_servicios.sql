-- Añadir columnas para comisiones en servicios

ALTER TABLE servicios 
ADD COLUMN comisionable BOOLEAN DEFAULT false,
ADD COLUMN porcentaje_comision NUMERIC(5, 2) DEFAULT 0;
