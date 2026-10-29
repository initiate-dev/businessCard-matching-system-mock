import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { css, cx } from '@emotion/css'
import { useData } from '../context/DataContext'
import type { Profile, Role } from '../types'
import { formatDateTime } from '../lib/util'
import { Modal } from '../components/Modal'
import { alertError, alertInfo, btn, btnPrimary, btnSmall, chip, field, input, muted, page, pageHeader, row, table, tableMiddle, tableWrap } from '../styles/ui'

const EMPTY_FORM = { email: '', name: '', department: '', role: 'member' as Role }

export function UsersPage() {
  const { db, me, createUser, reissuePassword, setUserActive, notify } = useData()
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)
  const [issued, setIssued] = useState<{ email: string; password: string } | null>(null)
  const [deactivating, setDeactivating] = useState<{ user: Profile; handoverTo: string } | null>(null)

  if (me?.role !== 'admin') return <Navigate to="/matches" replace />

  const ownedCount = (uid: string) => db.people.filter((p) => p.ownerId === uid && !p.deletedAt).length

  return (
    <div className={page}>
      <div className={pageHeader}>
        <h1>ユーザー管理</h1>
        <button className={btnPrimary} onClick={() => { setForm(EMPTY_FORM); setError(null); setAdding(true) }}>利用者を追加</button>
      </div>
      <p className={muted}>新規登録は閉じています。利用者はここから追加します（本番は Edge Function admin-users）。初期パスワードは初回ログインで変更が必要です。</p>


      <div className={tableWrap}>
        <table className={cx(table, tableMiddle)}>
          <thead><tr><th>名前</th><th>メール</th><th>部署</th><th>権限</th><th>状態</th><th>名刺</th><th>作成</th><th /></tr></thead>
          <tbody>
            {db.profiles.map((u) => (
              <tr key={u.id}>
                <td>{u.name}{u.id === me.id && <span className={muted}>（自分）</span>}</td>
                <td>{u.email}</td>
                <td>{u.department ?? <span className={muted}>不明</span>}</td>
                <td>{u.role === 'admin' ? 'admin' : '一般'}</td>
                <td>
                  {!u.active ? <span className={chip}>無効</span> : u.mustChangePassword ? <span className={chip}>初回変更待ち</span> : <span className={chip}>有効</span>}
                </td>
                <td>{ownedCount(u.id)}</td>
                <td className={muted}>{formatDateTime(u.createdAt)}</td>
                <td>
                  {u.id !== me.id && (
                    <div className={row} style={{ flexWrap: 'nowrap' }}>
                      {u.active && <button className={cx(btn, btnSmall)} onClick={async () => {
                        const r = await reissuePassword(u.id)
                        if (r.error) notify(r.error)
                        else setIssued({ email: u.email, password: r.password! })
                      }}>パスワード再発行</button>}
                      {u.active
                        ? <button className={cx(btn, btnSmall)} onClick={() => setDeactivating({ user: u, handoverTo: me.id })}>無効にする</button>
                        : <button className={cx(btn, btnSmall)} onClick={async () => { await setUserActive(u.id, true, null); notify('有効にしました') }}>有効に戻す</button>}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {adding && (
        <Modal
          title="利用者を追加"
          onClose={() => setAdding(false)}
          footer={<>
            <button className={btn} onClick={() => setAdding(false)}>キャンセル</button>
            <button className={btnPrimary} type="submit" form="add-user-form">追加して初期パスワードを発行</button>
          </>}
        >
          {error && <div className={alertError}>{error}</div>}
          <form id="add-user-form" className={css`display: flex; flex-direction: column; gap: 12px;`} onSubmit={async (e) => {
            e.preventDefault()
            const r = await createUser({ email: form.email, name: form.name, department: form.department || null, role: form.role })
            setError(r.error)
            if (r.password) { setAdding(false); setIssued({ email: form.email, password: r.password }) }
          }}>
            <label className={field}><span>メールアドレス *</span><input className={input} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required autoFocus /></label>
            <label className={field}><span>名前</span><input className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label className={field}><span>部署</span><input className={input} value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></label>
            <label className={field}>
              <span>権限</span>
              <select className={input} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
                <option value="member">一般</option>
                <option value="admin">admin（モックのみ。本番の昇格は SQL から）</option>
              </select>
            </label>
          </form>
        </Modal>
      )}

      {issued && (
        <Modal title="初期パスワード" onClose={() => setIssued(null)} footer={<button className={btnPrimary} onClick={() => setIssued(null)}>閉じる</button>}>
          <div className={alertInfo}>この画面を閉じると二度と表示されません。本人に安全な方法で伝えてください。</div>
          <div>メール: <strong>{issued.email}</strong></div>
          <div>初期パスワード: <code style={{ fontSize: 18 }}>{issued.password}</code></div>
          <div><button className={btn} onClick={() => navigator.clipboard.writeText(issued.password).then(() => notify('コピーしました'))}>コピー</button></div>
        </Modal>
      )}

      {deactivating && (
        <Modal
          title={`${deactivating.user.name} を無効にする`}
          onClose={() => setDeactivating(null)}
          footer={<>
            <button className={btn} onClick={() => setDeactivating(null)}>キャンセル</button>
            <button className={btnPrimary} onClick={async () => {
              const err = await setUserActive(deactivating.user.id, false, deactivating.handoverTo || null)
              setDeactivating(null)
              notify(err ?? '無効にしました')
            }}>無効にする</button>
          </>}
        >
          <p>ログインできなくなります。この人が持ち主の名刺 {ownedCount(deactivating.user.id)} 件と担当中の紹介を引き継ぐ人を選んでください。</p>
          <label className={field}>
            <span>引き継ぎ先</span>
            <select className={input} value={deactivating.handoverTo} onChange={(e) => setDeactivating({ ...deactivating, handoverTo: e.target.value })}>
              {db.profiles.filter((p) => p.active && p.id !== deactivating.user.id).map((p) => <option key={p.id} value={p.id}>{p.name}（{p.department ?? '部署不明'}）</option>)}
            </select>
          </label>
        </Modal>
      )}
    </div>
  )
}
