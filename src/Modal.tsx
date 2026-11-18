import { useEffect, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'

/** Hoja que sube desde abajo, con velo detrás. Esc o tocar fuera la cierran. */
export default function Modal({ abierto, onCerrar, etiqueta, children }: {
  abierto: boolean
  onCerrar: () => void
  etiqueta: string
  children: ReactNode
}) {
  useEffect(() => {
    if (!abierto) return
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar() }
    window.addEventListener('keydown', tecla)
    const previo = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', tecla); document.body.style.overflow = previo }
  }, [abierto, onCerrar])

  return (
    <AnimatePresence>
      {abierto && (
        <>
          <motion.div className="velo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onCerrar} />
          <motion.div
            className="hoja modal"
            role="dialog"
            aria-modal="true"
            aria-label={etiqueta}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', bounce: 0.18, duration: 0.45 }}
          >
            <div className="hoja-agarre" />
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
