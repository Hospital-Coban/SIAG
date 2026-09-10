import { useCallback, useRef, useState } from 'react'

export function useToast() {
  const [toast, setToast] = useState(null)
  const timer = useRef(null)

  const mostrar = useCallback((mensaje, tipo = 'success') => {
    setToast({ mensaje, tipo })
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setToast(null), 4000)
  }, [])

  return [toast, mostrar, () => setToast(null)]
}
