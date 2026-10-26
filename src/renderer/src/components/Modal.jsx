import { createPortal } from 'react-dom'

export default function Modal({ children, className = '' }) {
  return createPortal(
    <dialog className={`modal modal-open ${className}`}>
      {children}
    </dialog>,
    document.body
  )
}
