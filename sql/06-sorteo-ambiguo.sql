-- Corrige "column reference \"i\" is ambiguous" al hacer el sorteo.
-- Pegar en Supabase > SQL Editor > Run. No borra datos.

create or replace function _sortear_grupo(p_ids int[])
returns void language plpgsql security definer set search_path = public as $$
declare
  v_rec int[];
  v_ok boolean;
  v_intento int := 0;
  i int;
begin
  if coalesce(array_length(p_ids, 1), 0) < 2 then
    raise exception 'Grupo demasiado chico para sortear';
  end if;
  loop
    v_intento := v_intento + 1;
    if v_intento > 20000 then
      raise exception 'No se encontró un sorteo válido sin repetir familia';
    end if;
    select array_agg(x order by random()) into v_rec from unnest(p_ids) x;
    v_ok := true;
    for i in 1 .. array_length(p_ids, 1) loop
      if (select familia from participantes where id = p_ids[i])
       = (select familia from participantes where id = v_rec[i]) then
        v_ok := false;
        exit;
      end if;
    end loop;
    exit when v_ok;
  end loop;
  insert into asignaciones (da, recibe)
  select p_ids[g.k], v_rec[g.k] from generate_subscripts(p_ids, 1) as g(k);
end $$;

revoke execute on function _sortear_grupo(int[]) from public, anon, authenticated;
