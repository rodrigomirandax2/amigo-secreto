-- Deja la base como antes de la prueba. Pegar en Supabase > SQL Editor > Run.
-- Borra: el sorteo, las cartas escritas con tus correos de prueba y los correos +alias.
-- No toca los correos ni las cartas de nadie más.

delete from asignaciones where true;
update config set sorteo_hecho = false where id = 1;

update participantes
   set opcion1 = null, opcion2 = null, opcion3 = null, mensaje = null, actualizado = null
 where correo like 'r.miranda.oct%@gmail.com';

-- Los +alias eran sólo para probar: se quitan (tu correo real en Rodrigo se mantiene).
update participantes set correo = null where correo like 'r.miranda.oct+%@gmail.com';

-- Revisión: debería mostrar sorteo_hecho = false y ninguna carta de prueba.
select p.nombre, p.correo, p.opcion1 is not null as tiene_carta, c.sorteo_hecho
  from participantes p, config c
 order by p.familia, p.id;
