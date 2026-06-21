create table public.servicios (
  id uuid primary key default gen_random_uuid(),
  posada_id uuid not null references public.posadas(id) on delete cascade,
  nombre text not null,
  descripcion text,
  precio numeric not null,
  tipo text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.servicios enable row level security;

GRANT ALL ON public.servicios TO authenticated;
GRANT ALL ON public.servicios TO anon;
GRANT ALL ON public.servicios TO service_role;

create policy "Los usuarios pueden ver los servicios de su posada"
  on public.servicios for select
  using (
    exists (
      select 1 from public.perfiles p
      where p.posada_id = servicios.posada_id and p.id = auth.uid()
    )
  );

create policy "Los usuarios pueden insertar servicios en su posada"
  on public.servicios for insert
  with check (
    exists (
      select 1 from public.perfiles p
      where p.posada_id = servicios.posada_id and p.id = auth.uid()
    )
  );

create policy "Los usuarios pueden actualizar servicios de su posada"
  on public.servicios for update
  using (
    exists (
      select 1 from public.perfiles p
      where p.posada_id = servicios.posada_id and p.id = auth.uid()
    )
  );

create policy "Los usuarios pueden eliminar servicios de su posada"
  on public.servicios for delete
  using (
    exists (
      select 1 from public.perfiles p
      where p.posada_id = servicios.posada_id and p.id = auth.uid()
    )
  );

-- Permitir a las agencias ver los servicios (si es necesario)
create policy "Agencias pueden ver servicios"
  on public.servicios for select
  using (true); -- O ajustar con la relación correspondiente

-- Modificar tabla reservas para almacenar servicios contratados
alter table public.reservas 
add column servicios_adicionales jsonb default '[]'::jsonb;
