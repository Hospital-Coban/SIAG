import { createPortal } from 'react-dom'

export default function Modal({ children, className = '' }) {
  return createPortal(
    <dialog aria-modal="true" className={`modal modal-open p-2 sm:p-4
      [&_.modal-box]:min-w-0 [&_.modal-box]:rounded-2xl [&_.modal-box]:bg-base-200
      [&_.modal-box]:text-base-content [&_.modal-box]:p-5 sm:[&_.modal-box]:p-7
      [&_.modal-box]:shadow-xl [&_.modal-box]:ring-1 [&_.modal-box]:ring-base-content/10
      [&_.modal-box>h3]:mb-2 [&_.modal-box>h3]:text-xl [&_.modal-box>h3]:font-semibold
      [&_.form-control]:gap-2 [&_.label-text]:text-sm [&_.label-text]:font-medium
      [&_.input]:min-w-0 [&_.input]:bg-base-100 [&_.input]:shadow-none
      [&_.select]:min-w-0 [&_.select]:bg-base-100 [&_.select]:shadow-none
      [&_.textarea]:min-w-0 [&_.textarea]:bg-base-100 [&_.textarea]:shadow-none
      [&_.input:read-only]:bg-base-200
      [&_.modal-action]:mt-6 [&_.modal-action]:border-t [&_.modal-action]:border-base-content/10
      [&_.modal-action]:bg-base-200 [&_.modal-action]:pt-4
      [&_.modal-action]:flex-wrap [&_.modal-action]:gap-2
      max-sm:[&_.modal-action]:flex-col-reverse max-sm:[&_.modal-action>.btn]:w-full
      [&_.form-control>.input]:w-full [&_.form-control>.select]:w-full
      [&_.form-control>.textarea]:w-full ${className}`}>
      {children}
    </dialog>,
    document.body
  )
}
