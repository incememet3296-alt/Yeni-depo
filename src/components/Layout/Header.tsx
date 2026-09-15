interface HeaderProps {
  title: string
  showBack?: boolean
  onBack?: () => void
}

export function Header({ title, showBack, onBack }: HeaderProps) {
  return (
    <header className="app-header">
      {showBack && (
        <button className="header-back" onClick={onBack} aria-label="Geri">
          ←
        </button>
      )}
      <h1 className="header-title">{title}</h1>
    </header>
  )
}
