-- Crear tabla de alertas
CREATE TABLE IF NOT EXISTS alertas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    posada_id UUID NOT NULL REFERENCES posadas(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    mensaje TEXT NOT NULL,
    leida BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE alertas ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Dueños pueden ver sus alertas" ON alertas
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM perfiles
            WHERE perfiles.id = auth.uid() AND perfiles.posada_id = alertas.posada_id
        )
    );

CREATE POLICY "Dueños pueden actualizar sus alertas" ON alertas
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM perfiles
            WHERE perfiles.id = auth.uid() AND perfiles.posada_id = alertas.posada_id
        )
    );

-- Insert policy (System / RPC / Agentes can insert indirectly, but let's allow service role or authenticated users to insert if needed)
CREATE POLICY "Agentes pueden crear alertas" ON alertas
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated'
    );
