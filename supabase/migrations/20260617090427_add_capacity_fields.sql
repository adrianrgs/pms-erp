ALTER TABLE categorias_habitacion RENAME COLUMN capacidad_max_pax TO capacidad_max_adultos;
ALTER TABLE categorias_habitacion ADD COLUMN capacidad_max_ninos INTEGER NOT NULL DEFAULT 0;
