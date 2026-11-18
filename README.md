# Amigo Secreto

Página para el celular: cada uno entra con su correo y un código de 4 dígitos, escribe su carta con 3 opciones de regalo y, después del sorteo, ve las 3 opciones de su amigo secreto antes de revelar su nombre.

- `index.html`: la página de los participantes.
- `admin.html`: correos, códigos, cartas y sorteo (con clave).
- `supabase.sql`: base de datos y funciones.
- `config.js`: URL y clave pública de Supabase.

## Puesta en marcha

1. **Supabase**: crear un proyecto en supabase.com (gratis).
2. En `supabase.sql`, cambiar `CAMBIA-ESTA-CLAVE` por tu clave de administrador. Pegar el archivo en **SQL Editor** y correrlo.
3. En **Project Settings → API** copiar la *Project URL* y la clave *anon public* a `config.js`.
4. Subir a GitHub: `git add . && git commit -m "Amigo secreto" && git push`.
5. En GitHub: **Settings → Pages → Deploy from a branch → main / (root)**.
6. Abrir `https://rodrigomirandax2.github.io/amigo-secreto/admin.html`, cargar los correos y usar **Copiar invitación** para mandarle a cada uno su link y código por WhatsApp.
7. Cuando todos tengan carta (o cuando quieras), **Hacer sorteo**.

## Seguridad

Las tablas están cerradas. La página sólo llama funciones que piden correo + código (o la clave de admin) y devuelven lo de esa persona. Ni el administrador ve el resultado del sorteo.

Ojo: `supabase.sql` lleva la clave de admin en texto plano antes de correrlo. Después de correrlo, vuelve a dejar `CAMBIA-ESTA-CLAVE` antes de subir el archivo a GitHub.
