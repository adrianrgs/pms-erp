-- Actualizar la función calcular_precio_estadia para devolver JSONB con el desglose

DROP FUNCTION IF EXISTS calcular_precio_estadia(UUID, UUID, DATE, DATE, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION calcular_precio_estadia(
    p_posada_id UUID,
    p_categoria_id UUID,
    p_check_in DATE,
    p_check_out DATE,
    p_adultos INTEGER DEFAULT 2,
    p_ninos INTEGER DEFAULT 0
) RETURNS JSONB AS $$
DECLARE
    v_precio_total NUMERIC := 0;
    v_base_total NUMERIC := 0;
    v_adultos_extra_total NUMERIC := 0;
    v_ninos_total NUMERIC := 0;
    v_dias_sin_tarifa INTEGER := 0;
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
            tpt.modalidad_tarifa,
            CASE 
                WHEN tpt.modalidad_tarifa = 'por_persona' THEN tpt.tarifa_base * p_adultos
                ELSE tpt.tarifa_base
            END AS base_diaria,
            CASE 
                WHEN tpt.modalidad_tarifa = 'por_persona' THEN 0
                ELSE GREATEST(0, p_adultos - cat.capacidad_base_pax) * tpt.tarifa_adulto_extra
            END AS adultos_extra_diaria,
            CASE 
                WHEN tpt.modalidad_tarifa = 'por_persona' THEN COALESCE(tpt.tarifa_nino, 0) * p_ninos
                ELSE p_ninos * COALESCE(tpt.tarifa_nino, 0)
            END AS ninos_diaria
        FROM fechas_estadia f
        LEFT JOIN temporadas t ON f.fecha <@ t.periodo AND t.posada_id = p_posada_id
        LEFT JOIN tarifas_por_temporada tpt ON tpt.temporada_id = t.id AND tpt.categoria_id = p_categoria_id
        LEFT JOIN categorias_habitacion cat ON cat.id = p_categoria_id
    )
    SELECT 
        SUM(base_diaria + adultos_extra_diaria + ninos_diaria),
        SUM(base_diaria),
        SUM(adultos_extra_diaria),
        SUM(ninos_diaria),
        COUNT(CASE WHEN base_diaria IS NULL THEN 1 END)
    INTO 
        v_precio_total, 
        v_base_total,
        v_adultos_extra_total,
        v_ninos_total,
        v_dias_sin_tarifa
    FROM tarifas_aplicables;

    IF v_dias_sin_tarifa > 0 THEN
         RAISE EXCEPTION 'Faltan tarifas configuradas para % noche(s) dentro del periodo de estadía solicitado.', v_dias_sin_tarifa;
    END IF;

    RETURN jsonb_build_object(
        'total', COALESCE(v_precio_total, 0),
        'desglose', jsonb_build_object(
            'base', COALESCE(v_base_total, 0),
            'adultos_extra', COALESCE(v_adultos_extra_total, 0),
            'ninos', COALESCE(v_ninos_total, 0)
        )
    );
END;
$$ LANGUAGE plpgsql STABLE;
