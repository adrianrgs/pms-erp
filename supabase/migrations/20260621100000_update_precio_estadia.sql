-- Actualizar la función calcular_precio_estadia para soportar la modalidad de tarifa

-- Primero, eliminamos la función anterior ya que cambiamos la firma (parámetros)
DROP FUNCTION IF EXISTS calcular_precio_estadia(UUID, UUID, DATE, DATE, INTEGER, INTEGER);

-- Creamos la nueva versión
CREATE OR REPLACE FUNCTION calcular_precio_estadia(
    p_posada_id UUID,
    p_categoria_id UUID,
    p_check_in DATE,
    p_check_out DATE,
    p_adultos INTEGER DEFAULT 2,
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
            CASE 
                WHEN tpt.modalidad_tarifa = 'por_persona' THEN
                    tpt.tarifa_base * (p_adultos + p_ninos)
                ELSE
                    tpt.tarifa_base + (GREATEST(0, p_adultos - cat.capacidad_base_pax) * tpt.tarifa_adulto_extra) + (p_ninos * tpt.tarifa_nino)
            END AS tarifa_diaria
        FROM fechas_estadia f
        LEFT JOIN temporadas t ON f.fecha <@ t.periodo AND t.posada_id = p_posada_id
        LEFT JOIN tarifas_por_temporada tpt ON tpt.temporada_id = t.id AND tpt.categoria_id = p_categoria_id
        LEFT JOIN categorias_habitacion cat ON cat.id = p_categoria_id
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
