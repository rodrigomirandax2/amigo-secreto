-- Si a quien te tocó todavía no escribe su carta, no se revela su nombre.
-- Pegar en Supabase > SQL Editor > Run. No borra datos. Incluye lo del 01 (carta propia obligatoria).

create or replace function mi_amigo(p_correo text, p_codigo text)
returns json language plpgsql security definer set search_path = public as $$
declare p participantes; a participantes;
begin
  p := _participante(p_correo, p_codigo);
  if p.id is null then raise exception 'Correo o código incorrecto'; end if;
  if p.opcion1 is null then raise exception 'Primero escribe tu carta'; end if;
  select x.* into a from asignaciones s join participantes x on x.id = s.recibe where s.da = p.id;
  if a.id is null then return null; end if;
  -- Sin carta de tu amigo, todavía no se revela quién es.
  if a.opcion1 is null then
    return json_build_object('nombre', null, 'descripcion', null,
      'opcion1', null, 'opcion2', null, 'opcion3', null, 'mensaje', null);
  end if;
  return json_build_object(
    'nombre', a.nombre, 'descripcion', a.descripcion,
    'opcion1', a.opcion1, 'opcion2', a.opcion2, 'opcion3', a.opcion3,
    'mensaje', a.mensaje);
end $$;
