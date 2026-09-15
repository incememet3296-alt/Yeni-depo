interface StatusMessageProps {
  type: 'info' | 'warning' | 'error' | 'success'
  title: string
  message?: string
  action?: { label: string; onClick: () => void }
}

export function StatusMessage({ type, title, message, action }: StatusMessageProps) {
  return (
    <div className={`status-message status-${type}`} role="alert">
      <div className="status-icon" aria-hidden="true">
        {type === 'error' && '⚠'}
        {type === 'warning' && '⚠'}
        {type === 'info' && 'ℹ'}
        {type === 'success' && '✓'}
      </div>
      <div className="status-body">
        <strong>{title}</strong>
        {message && <p>{message}</p>}
        {action && (
          <button className="status-action" onClick={action.onClick}>
            {action.label}
          </button>
        )}
      </div>
    </div>
  )
}
