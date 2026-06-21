-- Migración: Campos para el Motor de Reservas Público y Landing Page (Multi-Tenant White-label)

-- Identificador amigable para URLs públicas (ej: /booking/posada-el-faro)
ALTER TABLE posadas
  ADD COLUMN IF NOT EXISTS slug VARCHAR(100) UNIQUE;

-- Control de enrutamiento multi-tenant:
-- true  → la posada ya tiene web propia, solo se renderiza el <BookingEngine/>
-- false → se renderiza la <FullLandingPage/> completa (default)
ALTER TABLE posadas
  ADD COLUMN IF NOT EXISTS tiene_landing_propia BOOLEAN NOT NULL DEFAULT false;

-- White-label: colores de marca en formato HEX (ej: '#2563eb')
ALTER TABLE posadas
  ADD COLUMN IF NOT EXISTS color_primario VARCHAR(7) DEFAULT '#2563eb';

ALTER TABLE posadas
  ADD COLUMN IF NOT EXISTS color_secundario VARCHAR(7) DEFAULT '#7c3aed';

-- White-label: identidad visual
ALTER TABLE posadas
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Landing page: imagen de fondo del Hero (URL pública de Supabase Storage)
ALTER TABLE posadas
  ADD COLUMN IF NOT EXISTS hero_image_url TEXT;

-- Landing page: galería de fotos (array de URLs públicas)
ALTER TABLE posadas
  ADD COLUMN IF NOT EXISTS galeria_urls TEXT[] DEFAULT '{}';

-- Índice para búsquedas rápidas por slug (endpoint público de alta frecuencia)
CREATE INDEX IF NOT EXISTS idx_posadas_slug ON posadas (slug);

-- Actualizar storage policy para permitir lectura pública del bucket posadas-media
-- (El bucket ya fue creado en migración anterior 20260618094152)
DO $$
BEGIN
  -- Permitir lectura anónima de imágenes de posadas (hero, galería, logo)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects'
      AND schemaname = 'storage'
      AND policyname = 'posadas_media_public_read'
  ) THEN
    CREATE POLICY "posadas_media_public_read"
      ON storage.objects FOR SELECT
      TO anon, authenticated
      USING (bucket_id = 'posadas-media');
  END IF;
END;
$$;
