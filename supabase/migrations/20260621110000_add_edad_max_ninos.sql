-- Añadir edad_max_ninos a posadas
ALTER TABLE posadas
ADD COLUMN edad_max_ninos INTEGER DEFAULT 12;
