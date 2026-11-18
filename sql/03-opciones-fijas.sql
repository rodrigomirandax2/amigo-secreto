-- Una vez enviada la carta, las 3 opciones quedan fijas: sólo se puede cambiar el mensaje.
-- Pegar en Supabase > SQL Editor > Run. No borra datos.

create or replace function guardar_carta(p_correo text, p_codigo text,
  p_opcion1 text, p_opcion2 text, p_opcion3 text, p_mensaje text)
returns void language plpgsql security definer set search_path = public as $$
declare p participantes;
begin
  p := _participante(p_correo, p_codigo);
  if p.id is null then raise exception 'Correo o código incorrecto'; end if;
  -- Ya enviada: las 3 opciones quedan fijas y sólo cambia el mensaje.
  if p.opcion1 is not null then
    update participantes set mensaje = left(trim(p_mensaje), 1000), actualizado = now() where id = p.id;
    return;
  end if;
  if coalesce(trim(p_opcion1), '') = '' or coalesce(trim(p_opcion2), '') = ''
     or coalesce(trim(p_opcion3), '') = '' then
    raise exception 'Escribe las 3 opciones de regalo';
  end if;
  update participantes
     set opcion1 = left(trim(p_opcion1), 200), opcion2 = left(trim(p_opcion2), 200),
         opcion3 = left(trim(p_opcion3), 200), mensaje = left(trim(p_mensaje), 1000),
         actualizado = now()
   where id = p.id;
end $$;
