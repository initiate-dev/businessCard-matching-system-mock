import { useState } from 'react'
import { css } from '@emotion/css'
import { useData } from '../context/DataContext'
import { alertError, alertInfo, authWrap, btnPrimary, card, field, input } from '../styles/ui'

export function LoginPage() {
  const { login } = useData()
  const [email, setEmail] = useState('dev@example.com')
  const [password, setPassword] = useState('password')
  const [error, setError] = useState<string | null>(null)

  return (
    <div className={authWrap}>
      <div className={card}>
        <h1 className={css`font-size: var(--fs-xl);`}>名刺マッチング</h1>
        <p className={css`margin: 0; color: var(--c-muted);`}>社内向け。新規登録はできません。利用者は管理者が追加します。</p>
        {error && <div className={alertError}>{error}</div>}
        <form onSubmit={async (e) => { e.preventDefault(); setError(await login(email, password)) }}>
          <label className={field}><span>メールアドレス</span><input className={input} type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          <label className={field}><span>パスワード</span><input className={input} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
          <button className={btnPrimary} type="submit">ログイン</button>
        </form>
        <div className={alertInfo}>
          <div><strong>モック用アカウント</strong>（パスワードはすべて password）</div>
          <div>dev@example.com … admin</div>
          <div>member-a@example.com … 一般（営業部）</div>
          <div>member-b@example.com … 一般・初回パスワード変更あり</div>
          <div>member-c@example.com … 一般（開発部）</div>
        </div>
      </div>
    </div>
  )
}
