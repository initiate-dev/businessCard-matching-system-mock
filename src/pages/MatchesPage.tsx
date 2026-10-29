import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { css, cx } from '@emotion/css'
import { useData } from '../context/DataContext'
import { buildMatchContext, findAllMatches, IMPORTANCE_WEIGHT, REQUIRED_MISS_FACTOR, type MatchResult } from '../lib/match'
import { normalizeText } from '../lib/normalize'
import { NeedChips, NeedLegend } from '../components/MatchList'
import { ScoreBadge } from '../components/Badges'
import { IntroPreviewModal } from '../components/IntroPreviewModal'
import { btn, btnSmall, card, input, muted, page, pageHeader, row, table, tableWrap } from '../styles/ui'

export function MatchesPage() {
  const { db, people, myPrefs } = useData()
  // 「紹介候補にする」で開く確認モーダル
  const [preview, setPreview] = useState<{ providerId: string; seekerId: string } | null>(null)
  // 「紹介を見る」で開く編集モーダル
  const [editingId, setEditingId] = useState<string | null>(null)
  const editingIntro = editingId ? db.introductions.find((i) => i.id === editingId) : undefined
  const [minScore, setMinScore] = useState(myPrefs?.minMatchScore ?? 30)
  const [q, setQ] = useState('')
  const [requiredOnly, setRequiredOnly] = useState(false)
  const [hideIntroduced, setHideIntroduced] = useState(true)
  const [limit, setLimit] = useState(50)

  const ctx = useMemo(() => buildMatchContext(db.tags, db.companies, db.introductions), [db.tags, db.companies, db.introductions])
  const all = useMemo(() => findAllMatches(people, ctx), [people, ctx])
  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people])
  const companyName = (pid: string) => { const p = peopleById.get(pid); return db.companies.find((c) => c.id === p?.companyId)?.name ?? '会社不明' }
  const introFor = (r: MatchResult) => db.introductions.find((i) => i.providerId === r.providerId && i.seekerId === r.seekerId && i.status !== 'declined')

  const key = normalizeText(q)
  const filtered = all.filter((r) => {
      if (r.score < minScore) return false
      if (requiredOnly && r.requiredMet < r.requiredTotal) return false
      if (hideIntroduced && introFor(r)) return false
      if (!key) return true
      const names = [r.providerId, r.seekerId].flatMap((id) => [peopleById.get(id)?.name ?? '', companyName(id)])
      return names.some((n) => normalizeText(n).includes(key)) || r.breakdown.some((b) => normalizeText(b.label).includes(key))
  })

  return (
    <div className={page}>
      <div className={pageHeader}><h1>マッチング</h1></div>

      <div className={cx(card, row)}>
        <input className={input} style={{ flex: '1 1 220px' }} placeholder="氏名・会社・タグで絞り込み" value={q} onChange={(e) => setQ(e.target.value)} />
        <label className={row}>マッチ率
          <input className={input} style={{ width: 80 }} type="number" min={0} max={100} value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} />以上
        </label>
        <label className={row}><input type="checkbox" checked={requiredOnly} onChange={(e) => setRequiredOnly(e.target.checked)} />必須をすべて満たす</label>
        <label className={row}><input type="checkbox" checked={hideIntroduced} onChange={(e) => setHideIntroduced(e.target.checked)} />紹介中・済みを隠す</label>
        <span className={muted}>{filtered.length} 件</span>
      </div>

      <div className={tableWrap}>
        <table className={table}>
          <thead><tr><th>マッチ率</th><th>求める側（課題・希望）</th><th /><th>提供側（得意領域）</th><th><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>求める側の課題・希望<NeedLegend /></div></th><th /></tr></thead>
          <tbody>
            {filtered.slice(0, limit).map((r) => {
              const key = `${r.providerId}:${r.seekerId}`
              const intro = introFor(r)
              return (
                <tr key={key}>
                  <td><ScoreBadge score={r.score} /></td>
                  <td><Link to={`/people/${r.seekerId}`}>{peopleById.get(r.seekerId)?.name}</Link><div className={muted}>{companyName(r.seekerId)}</div></td>
                  <td className={muted}>←</td>
                  <td><Link to={`/people/${r.providerId}`}>{peopleById.get(r.providerId)?.name}</Link><div className={muted}>{companyName(r.providerId)}</div></td>
                  <td><NeedChips r={r} /></td>
                  <td style={{ verticalAlign: 'middle' }}>
                    {intro ? <button className={cx(btn, btnSmall)} onClick={() => setEditingId(intro.id)}>紹介を見る</button> : (
                      <button className={cx(btn, btnSmall)} onClick={() => setPreview({ providerId: r.providerId, seekerId: r.seekerId })}>紹介候補にする</button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {filtered.length > limit && <button className={btn} onClick={() => setLimit(limit + 50)}>さらに表示</button>}
      {preview && <IntroPreviewModal mode="create" providerId={preview.providerId} seekerId={preview.seekerId} onClose={() => setPreview(null)} />}
      {editingIntro && <IntroPreviewModal mode="edit" intro={editingIntro} onClose={() => setEditingId(null)} />}

      <section className={card}>
        <h2>マッチ率の計算方法</h2>
        <ul className={css`margin: 0; padding-left: 1.2em;`}>
          <li>求める側の「課題・希望」タグごとに、提供側の「事業内容・得意領域」（会社の分も含む）を見ます。同じタグ＝一致（1 点）、タグ名・別名の一部が重なる／記述に出てくる＝部分一致（0.5 点）。</li>
          <li>比較は大文字小文字・空白・記号・全角半角をそろえ、タグ辞書の別名も使います。</li>
          <li>業種・地域のタグは、相手の会社の業種・地域でも判定します。相手の会社の値が未登録なら「不明」（0.5 点）。</li>
          <li>重みは 必須 {IMPORTANCE_WEIGHT.required} / 希望 {IMPORTANCE_WEIGHT.preferred} / どちらでも {IMPORTANCE_WEIGHT.any}。必須の項目が不一致なら {REQUIRED_MISS_FACTOR} 倍。</li>
          <li>除外: 本人どうし・同じ会社どうし・見送り済みの組み合わせ・削除済みの人。地域以外のタグが 1 つも合わない組み合わせは出しません（地域が同じだけでは紹介しません）。</li>
        </ul>
      </section>
    </div>
  )
}
