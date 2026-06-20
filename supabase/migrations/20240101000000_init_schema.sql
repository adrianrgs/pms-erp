-- Habilitar extensión btree_gist para restricciones de exclusión de fechas
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 1. Posadas (Tenants Principales)
CREATE TABLE posadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  politicas TEXT,
  amenidades JSONB,
  moneda_base VARCHAR(3) DEFAULT 'USD' CHECK (moneda_base IN ('USD', 'EUR', 'VES')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Perfiles (Usuarios del sistema ligados a Auth)
CREATE TABLE perfiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  posada_id UUID REFERENCES posadas(id) ON DELETE CASCADE, -- Nullable para administradores del ERP Mayorista
  rol VARCHAR(50) NOT NULL CHECK (rol IN ('pms_admin', 'pms_staff', 'erp_admin', 'erp_agent')),
  nombre_completo VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Categorías de Habitaciones
CREATE TABLE categorias_habitacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  posada_id UUID NOT NULL REFERENCES posadas(id) ON DELETE CASCADE,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  capacidad_base_pax INTEGER NOT NULL DEFAULT 2,
  capacidad_max_pax INTEGER NOT NULL DEFAULT 2,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(posada_id, nombre)
);

-- 4. Habitaciones (Inventario Físico)
CREATE TABLE habitaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  posada_id UUID NOT NULL REFERENCES posadas(id) ON DELETE CASCADE,
  categoria_id UUID NOT NULL REFERENCES categorias_habitacion(id) ON DELETE CASCADE,
  numero_habitacion VARCHAR(50) NOT NULL,
  estado VARCHAR(50) DEFAULT 'disponible',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(posada_id, numero_habitacion)
);

-- 5. Temporadas (Lógica de Fechas)
CREATE TABLE temporadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  posada_id UUID NOT NULL REFERENCES posadas(id) ON DELETE CASCADE,
  nombre VARCHAR(100) NOT NULL,
  periodo DATERANGE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- [CRÍTICO] Restricción de exclusión para evitar solapamiento de temporadas en una misma posada
  CONSTRAINT sin_solapamiento_temporadas EXCLUDE USING gist (
    posada_id WITH =,
    periodo WITH &&
  )
);

-- 6. Tarifas por Temporada
CREATE TABLE tarifas_por_temporada (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  temporada_id UUID NOT NULL REFERENCES temporadas(id) ON DELETE CASCADE,
  categoria_id UUID NOT NULL REFERENCES categorias_habitacion(id) ON DELETE CASCADE,
  moneda VARCHAR(3) DEFAULT 'USD' CHECK (moneda IN ('USD', 'EUR', 'VES')),
  tarifa_base NUMERIC(10, 2) NOT NULL,
  tarifa_adulto_extra NUMERIC(10, 2) NOT NULL DEFAULT 0,
  tarifa_nino NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(temporada_id, categoria_id)
);

-- 7. Reservas
CREATE TABLE reservas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  posada_id UUID NOT NULL REFERENCES posadas(id) ON DELETE CASCADE,
  habitacion_id UUID REFERENCES habitaciones(id), -- Puede ser NULL hasta el momento del check-in
  categoria_id UUID NOT NULL REFERENCES categorias_habitacion(id),
  origen VARCHAR(50) NOT NULL CHECK (origen IN ('directa', 'erp_b2b')),
  estado VARCHAR(50) NOT NULL CHECK (estado IN ('pre-reserva', 'confirmada', 'check-in', 'check-out', 'cancelada')),
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  adultos INTEGER NOT NULL,
  ninos INTEGER NOT NULL DEFAULT 0,
  moneda VARCHAR(3) NOT NULL CHECK (moneda IN ('USD', 'EUR', 'VES')),
  monto_total NUMERIC(10, 2) NOT NULL,
  pagado NUMERIC(10, 2) DEFAULT 0,
  cliente_info JSONB NOT NULL,
  creada_por UUID REFERENCES perfiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_fechas_reserva CHECK (check_out > check_in)
);

-- Motor de Tarifas por Temporadas (Función RPC)
CREATE OR REPLACE FUNCTION calcular_precio_estadia(
    p_posada_id UUID,
    p_categoria_id UUID,
    p_check_in DATE,
    p_check_out DATE,
    p_adultos_extra INTEGER DEFAULT 0,
    p_ninos INTEGER DEFAULT 0
) RETURNS NUMERIC AS $$
DECLARE
    v_precio_total NUMERIC;
    v_dias_sin_tarifa INTEGER;
BEGIN
    IF p_check_out <= p_check_in THEN
        RAISE EXCEPTION 'La fecha de check-out debe ser mayor a la fecha de check-in';
    END IF;

    WITH fechas_estadia AS (
        SELECT generate_series(p_check_in, p_check_out - integer '1', '1 day')::DATE AS fecha
    ),
    tarifas_aplicables AS (
        SELECT 
            f.fecha,
            (tpt.tarifa_base + (p_adultos_extra * tpt.tarifa_adulto_extra) + (p_ninos * tpt.tarifa_nino)) AS tarifa_diaria
        FROM fechas_estadia f
        LEFT JOIN temporadas t ON f.fecha <@ t.periodo AND t.posada_id = p_posada_id
        LEFT JOIN tarifas_por_temporada tpt ON tpt.temporada_id = t.id AND tpt.categoria_id = p_categoria_id
    )
    SELECT 
        SUM(tarifa_diaria),
        COUNT(CASE WHEN tarifa_diaria IS NULL THEN 1 END)
    INTO 
        v_precio_total, 
        v_dias_sin_tarifa
    FROM tarifas_aplicables;

    IF v_dias_sin_tarifa > 0 THEN
         RAISE EXCEPTION 'Faltan tarifas configuradas para % noche(s) dentro del periodo de estadía solicitado.', v_dias_sin_tarifa;
    END IF;

    RETURN v_precio_total;
END;
$$ LANGUAGE plpgsql STABLE;
