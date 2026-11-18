import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Fondo } from './Decoracion'
import Participante from './Participante'
import Admin from './Admin'
import './estilos.css'

// El panel vive en #/admin para no necesitar router ni 404.html en GitHub Pages.
function App() {
  const [hash, setHash] = useState(location.hash)
  useEffect(() => {
    const alCambiar = () => setHash(location.hash)
    window.addEventListener('hashchange', alCambiar)
    return () => window.removeEventListener('hashchange', alCambiar)
  }, [])
  return (
    <>
      <Fondo />
      {hash === '#/admin' ? <Admin /> : <Participante />}
    </>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
