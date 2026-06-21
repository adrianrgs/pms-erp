-- Añadir edad_max_infantes a posadas
ALTER TABLE posadas
ADD COLUMN edad_max_infantes INTEGER DEFAULT 3;
