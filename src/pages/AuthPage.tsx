import { FormEvent, useState } from 'react'
import { Button } from '../components/UI/Button'
import { supabase } from '../lib/supabase'

interface AuthPageProps { onNavigate: (path: string) => void }

export function AuthPage({ onNavigate }: AuthPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [register, setRegister] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!supabase) { setMessage('Supabase bağlantısı yapılandırılmamış.'); return }
    setBusy(true)
    setMessage(null)
    try {
      if (register) {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password })
        if (error) throw error
        setMessage(data.session ? 'Hesabınız oluşturuldu.' : 'Kayıt başarılı. E-posta doğrulamasını tamamlayın.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
        onNavigate('/animals')
      }
    } catch (reason: unknown) {
      setMessage(reason instanceof Error ? reason.message : 'Kimlik doğrulama başarısız.')
    } finally {
      setBusy(false)
    }
  }

  return <div className="profile-page">
    <div className="profile-header"><div className="profile-avatar" aria-hidden="true">🐾</div><h1>{register ? 'Hesap Oluştur' : 'Giriş Yap'}</h1><p>Kendi sanal hayvanınızı hesabınıza bağlayın.</p></div>
    <form onSubmit={submit} style={{ display: 'grid', gap: 12, maxWidth: 420, margin: '0 auto' }}>
      <label>E-posta<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required /></label>
      <label>Şifre<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete={register ? 'new-password' : 'current-password'} minLength={6} required /></label>
      <Button type="submit" disabled={busy}>{busy ? 'Bekleyin…' : register ? 'Kayıt Ol' : 'Giriş Yap'}</Button>
      {message && <p className="status-message info">{message}</p>}
    </form>
    <Button variant="ghost" onClick={() => setRegister((value) => !value)}>{register ? 'Zaten hesabım var' : 'Yeni hesap oluştur'}</Button>
  </div>
}
