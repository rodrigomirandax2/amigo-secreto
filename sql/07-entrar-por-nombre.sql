-- Entrar eligiendo tu nombre en vez de escribir el correo.
-- La lista pública sólo trae nombres de quienes ya tienen correo: nunca los correos.
-- Pegar en Supabase > SQL Editor > Run. No borra datos.

create or replace function nombres()
returns json language sql security definer set search_path = public as $$
  select coalesce(json_agg(json_build_object(
      'id', id, 'nombre', nombre, 'descripcion', descripcion, 'familia', familia, 'es_nino', es_nino)
      order by familia, id), '[]'::json)
    from participantes
   where correo is not null;
$$;

-- Con el código correcto devuelve el correo, y la app sigue entrando como siempre.
create or replace function correo_por_codigo(p_id int, p_codigo text)
returns text language plpgsql security definer set search_path = public as $$
declare v_correo text;
begin
  select correo into v_correo from participantes where id = p_id and codigo = trim(p_codigo);
  if v_correo is null then raise exception 'Código incorrecto'; end if;
  return v_correo;
end $$;

revoke execute on function nombres() from public, authenticated;
revoke execute on function correo_por_codigo(int, text) from public, authenticated;
grant execute on function nombres() to anon;
grant execute on function correo_por_codigo(int, text) to anon;
