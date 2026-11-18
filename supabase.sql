-- Amigo Secreto: tablas, funciones seguras y sorteo.
-- Pegar entero en Supabase > SQL Editor > New query > Run.
-- ANTES de correrlo: cambiar 'CAMBIA-ESTA-CLAVE' (más abajo) por tu clave de administrador.
-- Se puede volver a correr: borra y recrea todo (se pierden cartas y sorteo).

create extension if not exists pgcrypto with schema extensions;

drop table if exists asignaciones cascade;
drop table if exists participantes cascade;
drop table if exists config cascade;

create table config (
  id            int primary key default 1 check (id = 1),
  clave_admin   text not null,
  monto         text,
  fecha         text,
  sorteo_hecho  boolean not null default false
);

create table participantes (
  id           serial primary key,
  nombre       text not null,
  descripcion  text not null default '',
  familia      int  not null,
  es_nino      boolean not null default false,
  correo       text unique,
  codigo       text not null default lpad(floor(random() * 10000)::int::text, 4, '0'),
  opcion1      text,
  opcion2      text,
  opcion3      text,
  mensaje      text,
  actualizado  timestamptz
);

create table asignaciones (
  da      int primary key references participantes(id) on delete cascade,
  recibe  int not null unique references participantes(id) on delete cascade
);

-- Nadie lee las tablas directo: sólo a través de las funciones de abajo.
alter table config        enable row level security;
alter table participantes enable row level security;
alter table asignaciones  enable row level security;
revoke all on config, participantes, asignaciones from anon, authenticated;

insert into config (clave_admin, monto, fecha)
values (extensions.crypt('CAMBIA-ESTA-CLAVE', extensions.gen_salt('bf')), '', '');

insert into participantes (nombre, descripcion, familia, es_nino) values
  ('Rodrigo',            'papá de Isabella Miranda',       1, false),
  ('Camila',             'mamá de Isabella Miranda',       1, false),
  ('Isabella Miranda',   '',                               1, true),
  ('Alejandro',          'papá de Isabella Jaramillo',     2, false),
  ('Cristina',           'mamá de Isabella Jaramillo',     2, false),
  ('Isabella Jaramillo', '',                               2, true),
  ('Peter',              'papá de Emma',                   3, false),
  ('Leslie',             'mamá de Emma',                   3, false),
  ('Emma',               '',                               3, true),
  ('Diego',              'papá de Maxi',                   4, false),
  ('Carla',              'mamá de Maxi',                   4, false),
  ('Maxi',               '',                               4, true),
  ('Boris',              'papá de Benja',                  5, false),
  ('Magda',              'mamá de Benja',                  5, false),
  ('Benja',              '',                               5, true),
  ('Jorge',              'papá de Fran y Jorgito',         6, false),
  ('Waleska',            'mamá de Fran y Jorgito',         6, false),
  ('Fran',               '',                               6, true),
  ('Jorgito',            '',                               6, true);

-- ---------- Funciones internas ----------

create or replace function _participante(p_correo text, p_codigo text)
returns participantes language sql security definer set search_path = public as $$
  select * from participantes
   where correo = lower(trim(p_correo)) and codigo = trim(p_codigo);
$$;

create or replace function _es_admin(p_clave text)
returns boolean language sql security definer set search_path = public, extensions as $$
  select exists (select 1 from config where clave_admin = crypt(p_clave, clave_admin));
$$;

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
  select p_ids[i], v_rec[i] from generate_subscripts(p_ids, 1) i;
end $$;

-- ---------- Funciones para participantes ----------

create or replace function entrar(p_correo text, p_codigo text)
returns json language plpgsql security definer set search_path = public as $$
declare p participantes; c config;
begin
  p := _participante(p_correo, p_codigo);
  if p.id is null then raise exception 'Correo o código incorrecto'; end if;
  select * into c from config;
  return json_build_object(
    'nombre', p.nombre, 'descripcion', p.descripcion,
    'opcion1', p.opcion1, 'opcion2', p.opcion2, 'opcion3', p.opcion3,
    'mensaje', p.mensaje,
    'monto', c.monto, 'fecha', c.fecha, 'sorteo_hecho', c.sorteo_hecho);
end $$;

create or replace function guardar_carta(p_correo text, p_codigo text,
  p_opcion1 text, p_opcion2 text, p_opcion3 text, p_mensaje text)
returns void language plpgsql security definer set search_path = public as $$
declare p participantes;
begin
  p := _participante(p_correo, p_codigo);
  if p.id is null then raise exception 'Correo o código incorrecto'; end if;
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

create or replace function mi_amigo(p_correo text, p_codigo text)
returns json language plpgsql security definer set search_path = public as $$
declare p participantes; a participantes;
begin
  p := _participante(p_correo, p_codigo);
  if p.id is null then raise exception 'Correo o código incorrecto'; end if;
  if p.opcion1 is null then raise exception 'Primero escribe tu carta'; end if;
  select x.* into a from asignaciones s join participantes x on x.id = s.recibe where s.da = p.id;
  if a.id is null then return null; end if;
  return json_build_object(
    'nombre', a.nombre, 'descripcion', a.descripcion,
    'opcion1', a.opcion1, 'opcion2', a.opcion2, 'opcion3', a.opcion3,
    'mensaje', a.mensaje);
end $$;

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

-- ---------- Funciones de administrador ----------

create or replace function admin_listar(p_clave text)
returns json language plpgsql security definer set search_path = public as $$
begin
  if not _es_admin(p_clave) then raise exception 'Clave incorrecta'; end if;
  return json_build_object(
    'config', (select json_build_object('monto', monto, 'fecha', fecha, 'sorteo_hecho', sorteo_hecho) from config),
    'participantes', (select json_agg(json_build_object(
        'id', id, 'nombre', nombre, 'descripcion', descripcion, 'familia', familia,
        'es_nino', es_nino, 'correo', correo, 'codigo', codigo,
        'opcion1', opcion1, 'opcion2', opcion2, 'opcion3', opcion3,
        'mensaje', mensaje, 'actualizado', actualizado) order by familia, id)
      from participantes));
end $$;

create or replace function admin_guardar_correo(p_clave text, p_id int, p_correo text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not _es_admin(p_clave) then raise exception 'Clave incorrecta'; end if;
  update participantes set correo = nullif(lower(trim(p_correo)), '') where id = p_id;
end $$;

create or replace function admin_guardar_config(p_clave text, p_monto text, p_fecha text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not _es_admin(p_clave) then raise exception 'Clave incorrecta'; end if;
  update config set monto = trim(p_monto), fecha = trim(p_fecha);
end $$;

-- p_ninos_con_ninos: true = niños sólo entre niños y adultos sólo entre adultos.
-- No devuelve el resultado: ni el administrador ve quién le regala a quién.
create or replace function admin_sortear(p_clave text, p_ninos_con_ninos boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not _es_admin(p_clave) then raise exception 'Clave incorrecta'; end if;
  delete from asignaciones;
  if p_ninos_con_ninos then
    perform _sortear_grupo((select array_agg(id order by id) from participantes where es_nino));
    perform _sortear_grupo((select array_agg(id order by id) from participantes where not es_nino));
  else
    perform _sortear_grupo((select array_agg(id order by id) from participantes));
  end if;
  update config set sorteo_hecho = true;
end $$;

create or replace function admin_anular_sorteo(p_clave text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not _es_admin(p_clave) then raise exception 'Clave incorrecta'; end if;
  delete from asignaciones;
  update config set sorteo_hecho = false;
end $$;

-- Sólo las funciones públicas quedan accesibles desde la página.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function entrar(text, text)                                 to anon;
grant execute on function guardar_carta(text, text, text, text, text, text) to anon;
grant execute on function mi_amigo(text, text)                               to anon;
grant execute on function cartas(text, text)                                 to anon;
grant execute on function admin_listar(text)                                 to anon;
grant execute on function admin_guardar_correo(text, int, text)              to anon;
grant execute on function admin_guardar_config(text, text, text)             to anon;
grant execute on function admin_sortear(text, boolean)                       to anon;
grant execute on function admin_anular_sorteo(text)                          to anon;
