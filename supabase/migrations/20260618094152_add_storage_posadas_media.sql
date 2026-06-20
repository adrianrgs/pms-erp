-- Crear bucket posadas-media si no existe
INSERT INTO storage.buckets (id, name, public) 
VALUES ('posadas-media', 'posadas-media', true)
ON CONFLICT (id) DO NOTHING;

-- Crear políticas para el bucket
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'posadas-media' );

CREATE POLICY "Authenticated users can upload media" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK ( bucket_id = 'posadas-media' );

CREATE POLICY "Authenticated users can update media" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING ( bucket_id = 'posadas-media' );

CREATE POLICY "Authenticated users can delete media" 
ON storage.objects FOR DELETE 
TO authenticated 
USING ( bucket_id = 'posadas-media' );
