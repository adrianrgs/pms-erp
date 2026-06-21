-- Migración: Campos para el Configurador de Landing Page
-- Almacena toda la personalización visual de la FullLandingPage en un JSONB.

ALTER TABLE posadas
  ADD COLUMN IF NOT EXISTS landing_settings JSONB DEFAULT '{}'::jsonb;

-- Comentario descriptivo del esquema esperado:
-- {
--   "hero": {
--     "titulo": "¡Bienvenidos a Posada El Faro!",
--     "subtitulo": "Una experiencia única frente al mar"
--   },
--   "secciones": {
--     "mostrar_amenidades": true,
--     "mostrar_galeria": true,
--     "mostrar_testimonios": false,
--     "mostrar_mapa": false
--   },
--   "amenidades_custom": [
--     { "id": "uuid", "icono": "wifi", "nombre": "WiFi Gratis" },
--     { "id": "uuid", "icono": "coffee", "nombre": "Desayuno incluido" }
--   ]
-- }

COMMENT ON COLUMN posadas.landing_settings IS
  'Configuración completa de la Landing Page pública: hero text, secciones visibles, amenidades personalizadas.';
