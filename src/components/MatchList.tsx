import { useState } from 'react'
import { Link } from 'react-router-dom'
import { css, cx } from '@emotion/css'
import type { Person } from '../types'
import { IMPORTANCE_LABEL } from '../types'
import type { MatchResult, MatchResultKind } from '../lib/match'
import { useData } from '../context/DataContext'
import { ResultBadge, ScoreBadge } from './Badges'
import { IntroPreviewModal } from './IntroPreviewModal'
import { btn, btnSmall, muted, row } from '../styles/ui'

const item = css`
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--c-surface);
`

const breakdownList = css`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: var(--fs-sm);
  li {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
  }
`

export function MatchSummary({ r }: { r: MatchResult }) {
  return (
    <span className={muted}>
      一致 {r.matchCount}・部分一致 {r.partialCount}・不一致 {r.missCount}
      {r.requiredTotal > 0 && <>／必須 {r.requiredMet}/{r.requiredTotal} 充足</>}
    </span>
  )
}

const needChip = css`
  display: inline-flex;
  align-items: center;
  padding: 1px 8px;
  border-radius: 999px;
  font-size: var(--fs-sm);
  white-space: nowrap;
  border: 1px solid transparent;
`
const needHit = css`
  background: var(--c-success-weak);
  color: var(--c-success);
  border-color: var(--c-success);
`
const needPartial = css`
  background: var(--c-yellow-weak);
  color: var(--c-yellow);
  border-color: var(--c-yellow-line);
`
const needMiss = css`
  background: var(--c-danger-weak);
  color: var(--c-danger);
  border-color: var(--c-danger);
`
/** 相手の会社の値が未登録で判定できない */
const needUnknown = css`
  background: var(--c-surface-2);
  color: var(--c-muted);
  border-color: var(--c-border);
`
const NEED_CHIP_COLOR: Record<MatchResultKind, string> = { match: needHit, partial: needPartial, miss: needMiss, unknown: needUnknown }

/** 色の見本（一致・部分一致・不一致をそれぞれの色で書く） */
export function NeedLegend() {
  return (
    <span className={row} style={{ gap: 4, display: 'inline-flex', flexWrap: 'nowrap' }}>
      <span className={cx(needChip, needHit)}>一致</span>
      <span className={cx(needChip, needPartial)}>部分一致</span>
      <span className={cx(needChip, needMiss)}>不一致</span>
    </span>
  )
}

/** 求める側の課題・希望を並べるだけの表示。一致は緑、部分一致は黄、不一致は赤、不明はグレー */
export function NeedChips({ r }: { r: MatchResult }) {
  return (
    <div className={row} style={{ gap: 4 }}>
      {r.breakdown.map((b) => (
        <span key={b.needId} className={cx(needChip, NEED_CHIP_COLOR[b.result])} title={`${b.label}（${IMPORTANCE_LABEL[b.importance]}）: ${b.result === 'match' ? '一致' : b.result === 'partial' ? '部分一致' : b.result === 'unknown' ? '不明' : '不一致'}`}>
          {b.tagName}
        </span>
      ))}
    </div>
  )
}

export function Breakdown({ r }: { r: MatchResult }) {
  return (
    <ul className={breakdownList}>
      {r.breakdown.map((b, i) => (
        <li key={i}>
          <ResultBadge result={b.result} />
          <span>{b.label}</span>
          <span className={muted}>（{IMPORTANCE_LABEL[b.importance]}）</span>
          {b.reason && b.result !== 'match' && <span className={muted}>根拠: {b.reason}</span>}
        </li>
      ))}
    </ul>
  )
}

/**
 * マッチ候補の一覧。direction は相手側が提供側か求める側か。
 */
export function MatchList({ results, direction, peopleById, emptyText }: {
  results: MatchResult[]
  direction: 'provider' | 'seeker'
  peopleById: Map<string, Person>
  emptyText: string
}) {
  const { db } = useData()
  // 「紹介候補にする」で開く確認モーダル
  const [preview, setPreview] = useState<{ providerId: string; seekerId: string } | null>(null)
  // 「紹介を見る」で開く編集モーダル
  const [editingId, setEditingId] = useState<string | null>(null)
  const editingIntro = editingId ? db.introductions.find((i) => i.id === editingId) : undefined
  const [openId, setOpenId] = useState<string | null>(null)
  const [limit, setLimit] = useState(10)
  const companyName = (p: Person) => db.companies.find((c) => c.id === p.companyId)?.name ?? '会社不明'

  if (results.length === 0) return <p className={muted}>{emptyText}</p>

  const existing = (r: MatchResult) => db.introductions.find((i) => i.providerId === r.providerId && i.seekerId === r.seekerId && i.status !== 'declined')

  return (
    <div className={css`display: flex; flex-direction: column; gap: 8px;`}>
      {results.slice(0, limit).map((r) => {
        const other = peopleById.get(direction === 'provider' ? r.providerId : r.seekerId)
        if (!other) return null
        const key = `${r.providerId}:${r.seekerId}`
        const intro = existing(r)
        return (
          <div key={key} className={item}>
            <div className={cx(row, css`justify-content: space-between; flex-wrap: nowrap; align-items: flex-start;`)}>
              <div className={row} style={{ flexWrap: 'nowrap', minWidth: 0 }}>
                <ScoreBadge score={r.score} />
                <div style={{ minWidth: 0 }}>
                  <Link to={`/people/${other.id}`}><strong>{other.name}</strong></Link>
                  <div className={muted}>{companyName(other)}{other.title && ` / ${other.title}`}</div>
                  <MatchSummary r={r} />
                </div>
              </div>
              <div className={row} style={{ justifyContent: 'flex-end' }}>
                <button className={cx(btn, btnSmall)} onClick={() => setOpenId(openId === key ? null : key)}>{openId === key ? '内訳を閉じる' : '内訳'}</button>
                {intro ? (
                  <button className={cx(btn, btnSmall)} onClick={() => setEditingId(intro.id)}>紹介を見る</button>
                ) : (
                  <button className={cx(btn, btnSmall)} onClick={() => setPreview({ providerId: r.providerId, seekerId: r.seekerId })}>紹介候補にする</button>
                )}
              </div>
            </div>
            {openId === key && <Breakdown r={r} />}
          </div>
        )
      })}
      {results.length > limit && <button className={btn} onClick={() => setLimit(limit + 10)}>さらに表示（残り {results.length - limit} 件）</button>}
      {preview && <IntroPreviewModal mode="create" providerId={preview.providerId} seekerId={preview.seekerId} onClose={() => setPreview(null)} />}
      {editingIntro && <IntroPreviewModal mode="edit" intro={editingIntro} onClose={() => setEditingId(null)} />}
    </div>
  )
}
