# Amigo Secreto

App en React (Vite + TypeScript) para el celular: cada uno entra con su correo y un código de 4 dígitos, escribe su carta con 3 opciones de regalo y, después del sorteo, ve las 3 opciones de su amigo secreto antes de abrir el regalo y ver su nombre.

- `src/Participante.tsx`: entrar, mi carta y mi amigo secreto.
- `src/Admin.tsx`: panel en `#/admin` con correos, códigos, cartas y sorteo.
- `src/Decoracion.tsx`: pascuero, nieve, luces y confeti.
- `src/supabase.ts`: conexión y tipos.
- `supabase.sql`: base de datos y funciones (se corre una vez en Supabase).
- `.github/workflows/deploy.yml`: compila y publica en GitHub Pages en cada push a `main`.

## Desarrollo

```bash
npm install
npm run dev
```

## Publicación

En GitHub, **Settings → Pages → Source: GitHub Actions**. Cada `git push` a `main` publica solo.

- Participantes: `https://rodrigomirandax2.github.io/amigo-secreto/`
- Administrador: `https://rodrigomirandax2.github.io/amigo-secreto/#/admin`

## Seguridad

Las tablas están cerradas. La app sólo llama funciones que piden correo + código (o la clave de admin) y devuelven lo de esa persona. Ni el administrador ve el resultado del sorteo. En `supabase.sql` va `CAMBIA-ESTA-CLAVE`: la clave real se pone sólo al correrlo en Supabase, nunca en el repo.
