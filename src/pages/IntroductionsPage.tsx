import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { IntroPreviewModal } from '../components/IntroPreviewModal'
import { css, cx } from '@emotion/css'
import { useData } from '../context/DataContext'
import { CONSENT_LABEL, INTRO_STATUSES, INTRO_STATUS_LABEL, type IntroStatus } from '../types'
import { formatDateTime } from '../lib/util'
import { normalizeText } from '../lib/normalize'
import { StatusBadge } from '../components/Badges'
import { btn, btnSmall, card, chip, input, muted, page, pageHeader, row, table, tableMiddle, tableWrap } from '../styles/ui'

export function IntroductionsPage() {
  const { db, me, profilesById } = useData()
  const [status, setStatus] = useState<IntroStatus | 'active' | 'all'>('all')
  const [mine, setMine] = useState(false)
  const [q, setQ] = useState('')
  const [params, setParams] = useSearchParams()
  const editingIntro = db.introductions.find((i) => i.id === params.get('edit'))
  const openEdit = (id: string) => setParams({ edit: id })

  const counts = useMemo(() => {
    const m = new Map<IntroStatus, number>()
    for (const i of db.introductions) m.set(i.status, (m.get(i.status) ?? 0) + 1)
    return m
  }, [db.introductions])

  const list = useMemo(() => {
    const key = normalizeText(q)
    return db.introductions
      .filter((i) => status === 'all' || (status === 'active' ? !['won', 'declined'].includes(i.status) : i.status === status))
      .filter((i) => !mine || i.assigneeId === me?.id)
      .filter((i) => !key || normalizeText(i.providerName + i.seekerName).includes(key))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id))
  }, [db.introductions, status, mine, q, me])

  const alive = (pid: string) => db.people.some((p) => p.id === pid && !p.deletedAt)

  return (
    <div className={page}>
      <div className={pageHeader}><h1>紹介管理</h1></div>

      <div className={row}>
        <button className={cx(btn, btnSmall)} style={status === 'all' ? { borderColor: 'var(--c-primary)', color: 'var(--c-primary)' } : undefined} onClick={() => setStatus('all')}>すべて</button>
        <button className={cx(btn, btnSmall)} style={status === 'active' ? { borderColor: 'var(--c-primary)', color: 'var(--c-primary)' } : undefined} onClick={() => setStatus('active')}>進行中</button>
        {INTRO_STATUSES.map((s) => (
          <button key={s} className={cx(btn, btnSmall)} style={status === s ? { borderColor: 'var(--c-primary)', color: 'var(--c-primary)' } : undefined} onClick={() => setStatus(s)}>
            {INTRO_STATUS_LABEL[s]} {counts.get(s) ?? 0}
          </button>
        ))}
      </div>

      <div className={cx(card, row)}>
        <input className={input} style={{ flex: '1 1 220px' }} placeholder="氏名で絞り込み" value={q} onChange={(e) => setQ(e.target.value)} />
        <label className={row}><input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} />自分が担当</label>
        <span className={muted}>{list.length} 件</span>
      </div>

      <div className={tableWrap}>
        <table className={cx(table, tableMiddle)}>
          <thead><tr><th>ステータス</th><th>求める側</th><th>提供側</th><th>同意（求める側／提供側）</th><th>担当</th><th>作成時のマッチ率</th><th>更新</th><th /></tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={8} className={muted}>該当する紹介はありません。</td></tr>}
            {list.map((i) => (
              <tr key={i.id}>
                <td><button className={css`border: none; background: none; padding: 0; cursor: pointer;`} onClick={() => openEdit(i.id)} title="編集"><StatusBadge status={i.status} /></button></td>
                <td>{alive(i.seekerId) ? <Link to={`/people/${i.seekerId}`}>{i.seekerName}</Link> : <>{i.seekerName} <span className={chip}>削除済み</span></>}</td>
                <td>{alive(i.providerId) ? <Link to={`/people/${i.providerId}`}>{i.providerName}</Link> : <>{i.providerName} <span className={chip}>削除済み</span></>}</td>
                <td>{CONSENT_LABEL[i.seekerConsent]}／{CONSENT_LABEL[i.providerConsent]}</td>
                <td>{i.assigneeId ? profilesById.get(i.assigneeId)?.name ?? '不明' : '未設定'}</td>
                <td>{i.scoreAtCreation ?? '不明'}</td>
                <td className={muted}>{formatDateTime(i.updatedAt)}</td>
                <td><button className={cx(btn, btnSmall)} onClick={() => openEdit(i.id)}>編集</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editingIntro && <IntroPreviewModal mode="edit" intro={editingIntro} onClose={() => setParams({})} />}
    </div>
  )
}
