ALTER TABLE public.servicios
ADD COLUMN tipo_cobro VARCHAR(50) DEFAULT 'Precio Global / Tarifa Única',
ADD COLUMN estado VARCHAR(20) DEFAULT 'activo',
ADD COLUMN imagen_url TEXT;
