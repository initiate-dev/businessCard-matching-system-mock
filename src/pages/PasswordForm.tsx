import { useState } from 'react'
import { css } from '@emotion/css'
import { useData } from '../context/DataContext'
import { alertError, alertWarn, authWrap, btn, btnPrimary, card, field, input } from '../styles/ui'

/**
 * パスワード変更フォーム。forced のときは初回ログイン時の強制変更（現在のパスワードは聞かない）。
 * formId を渡すと送信ボタンを出さない（モーダルの下部ボタンから form 属性で送信する）。
 */
export function PasswordForm({ forced, onDone, formId }: { forced: boolean; onDone?: () => void; formId?: string }) {
  const { changePassword } = useData()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)

  return (
    <form
      id={formId}
      className={css`display: flex; flex-direction: column; gap: 12px;`}
      onSubmit={async (e) => {
        e.preventDefault()
        if (next !== confirm) { setError('確認用のパスワードが一致しません'); return }
        const err = await changePassword(forced ? null : current, next)
        setError(err)
        if (!err) { setCurrent(''); setNext(''); setConfirm(''); onDone?.() }
      }}
    >
      {error && <div className={alertError}>{error}</div>}
      {!forced && <label className={field}><span>現在のパスワード</span><input className={input} type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required /></label>}
      <label className={field}><span>新しいパスワード（8 文字以上）</span><input className={input} type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required minLength={8} /></label>
      <label className={field}><span>新しいパスワード（確認）</span><input className={input} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></label>
      {!formId && <button className={btnPrimary} type="submit">パスワードを変更</button>}
    </form>
  )
}

export function ForceChangePasswordPage() {
  const { me, logout } = useData()
  return (
    <div className={authWrap}>
      <div className={card}>
        <h1 className={css`font-size: var(--fs-xl);`}>パスワードの変更</h1>
        <div className={alertWarn}>{me?.name} さん、初回ログインのためパスワードを変更してください。変更するまで他の画面は使えません。</div>
        <PasswordForm forced />
        <button className={btn} onClick={logout}>ログアウト</button>
      </div>
    </div>
  )
}
