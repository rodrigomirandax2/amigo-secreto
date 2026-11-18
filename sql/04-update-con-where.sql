-- Supabase no deja hacer UPDATE ni DELETE sin WHERE ("UPDATE requires a WHERE clause").
-- Corrige las funciones del administrador. Pegar en Supabase > SQL Editor > Run. No borra datos.

create or replace function admin_guardar_config(p_clave text, p_monto text, p_fecha text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not _es_admin(p_clave) then raise exception 'Clave incorrecta'; end if;
  update config set monto = trim(p_monto), fecha = trim(p_fecha) where id = 1;
end $$;

-- p_ninos_con_ninos: true = niños sólo entre niños y adultos sólo entre adultos.
-- No devuelve el resultado: ni el administrador ve quién le regala a quién.
create or replace function admin_sortear(p_clave text, p_ninos_con_ninos boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not _es_admin(p_clave) then raise exception 'Clave incorrecta'; end if;
  delete from asignaciones where true;
  if p_ninos_con_ninos then
    perform _sortear_grupo((select array_agg(id order by id) from participantes where es_nino));
    perform _sortear_grupo((select array_agg(id order by id) from participantes where not es_nino));
  else
    perform _sortear_grupo((select array_agg(id order by id) from participantes));
  end if;
  update config set sorteo_hecho = true where id = 1;
end $$;

create or replace function admin_anular_sorteo(p_clave text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not _es_admin(p_clave) then raise exception 'Clave incorrecta'; end if;
  delete from asignaciones where true;
  update config set sorteo_hecho = false where id = 1;
end $$;
