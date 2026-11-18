-- Árbol de cartas: cualquier participante que ya escribió la suya puede leer las de todos.
-- No revela el sorteo: sólo nombres y cartas. Pegar en Supabase > SQL Editor > Run. No borra datos.

create or replace function cartas(p_correo text, p_codigo text)
returns json language plpgsql security definer set search_path = public as $$
declare p participantes;
begin
  p := _participante(p_correo, p_codigo);
  if p.id is null then raise exception 'Correo o código incorrecto'; end if;
  if p.opcion1 is null then raise exception 'Primero escribe tu carta'; end if;
  return (select json_agg(json_build_object(
      'id', id, 'nombre', nombre, 'descripcion', descripcion, 'familia', familia, 'es_nino', es_nino,
      'opcion1', opcion1, 'opcion2', opcion2, 'opcion3', opcion3, 'mensaje', mensaje) order by familia, id)
    from participantes);
end $$;

revoke execute on function cartas(text, text) from public, authenticated;
grant execute on function cartas(text, text) to anon;
