import type { ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  ariaLabel?: string
}

export function Modal({ open, onClose, children, ariaLabel }: ModalProps) {
  if (!open) return null

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={ariaLabel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Kapat">
          ✕
        </button>
        {children}
      </div>
    </div>
  )
}
