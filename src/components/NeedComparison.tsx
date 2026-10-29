import type { ReactNode } from 'react'
import { css, cx } from '@emotion/css'
import type { ID, Need, Person, Tag } from '../types'
import { IMPORTANCE_LABEL } from '../types'
import { summarize, type BreakdownItem, type MatchResultKind } from '../lib/match'
import { ResultBadge, ScoreBadge, TagChip } from './Badges'
import { muted, row } from '../styles/ui'

// 求める側（左）と提供側（右）を 1 枚のカードにまとめる。
// 上段に 2 人の情報、その下に「課題・希望」と「提供側の該当」を 1 行ずつ並べる。
// 1 つのグリッドに左右のセルを交互に置くので、行ごとに左右の高さがそろう。
const box = css`
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  overflow: hidden;
`
const grid = css`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
`
const cell = css`
  padding: 10px 16px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  justify-content: center;
  border-top: 1px solid var(--c-border);
  &:nth-child(odd) {
    border-right: 1px solid var(--c-border);
  }
`
/** 最上段（2 人の情報）は上線なし */
const topCell = css`
  border-top: none;
  padding-top: 16px;
  padding-bottom: 14px;
  justify-content: flex-start;
  h2 {
    font-size: var(--fs-lg);
    margin-bottom: 8px;
  }
`
/**
 * 求める側の課題・希望（左側）に判定の色を付けて、どれが満たされているか一目でわかるようにする。
 * 色はマッチ候補の一覧の札と同じ（一致: 緑 / 部分一致: 黄 / 不一致: 赤 / 不明: グレー）
 */
const NEED_BG: Record<MatchResultKind, string> = {
  match: css`background: var(--c-success-weak); box-shadow: inset 4px 0 0 var(--c-success);`,
  partial: css`background: var(--c-yellow-weak); box-shadow: inset 4px 0 0 var(--c-yellow-line);`,
  miss: css`background: var(--c-danger-weak); box-shadow: inset 4px 0 0 var(--c-danger);`,
  unknown: css`background: var(--c-surface-2); box-shadow: inset 4px 0 0 var(--c-border);`,
}
const fullRow = css`
  grid-column: 1 / -1;
  border-right: none !important;
`

export function NeedComparison({ seekerHead, providerHead, seeker, provider, breakdown, tagsById, scoreAtCreation, hideCreationScore = false }: {
  /** 左上（求める側の情報） */
  seekerHead: ReactNode
  /** 右上（提供側の情報） */
  providerHead: ReactNode
  seeker: Person | undefined
  provider: Person | undefined
  /** 名刺が削除されていて比べられないときは null */
  breakdown: BreakdownItem[] | null
  tagsById: Map<ID, Tag>
  scoreAtCreation: number | null
  /** まだ登録前（作成時のマッチ率がない）なら true */
  hideCreationScore?: boolean
}) {
  const s = breakdown ? summarize(breakdown) : null
  const needsById = new Map<ID, Need>((seeker?.needs ?? []).map((n) => [n.id, n]))
  // 判定に使われなかった提供側のタグ（そのほかの得意領域）
  const used = new Set((breakdown ?? []).flatMap((b) => b.matchedTagIds))
  const others = (provider?.offering.tagIds ?? []).filter((id) => !used.has(id))

  return (
    <section className={box} aria-label="求める側と提供側の比較">
      <div className={grid}>
        {/* 上段: 2 人の情報。件数は左、マッチ率と一致の件数は右に添える */}
        <div className={cx(cell, topCell)}>
          {seekerHead}
          {seeker?.needsNote && (
            <div className={css`margin-top: 4px; padding: 8px 10px; background: var(--c-surface-2); border-radius: var(--radius-sm); white-space: pre-wrap; font-size: var(--fs-sm);`}>
              <span className={muted}>課題の詳細</span>
              <div>{seeker.needsNote}</div>
            </div>
          )}
          {breakdown && <span className={muted}>課題・希望 {breakdown.length} 件（下に重要度の高い順）</span>}
        </div>
        <div className={cx(cell, topCell)}>
          <div className={row} style={{ justifyContent: 'space-between', flexWrap: 'nowrap', alignItems: 'flex-start' }}>
            <div style={{ minWidth: 0, flex: 1 }}>{providerHead}</div>
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              {s && <ScoreBadge score={s.score} />}
              {!hideCreationScore && <div className={muted} style={{ fontSize: 10 }}>作成時 {scoreAtCreation ?? '不明'}</div>}
            </div>
          </div>
          {s && (
            <span className={muted}>
              一致 {s.matchCount}・部分一致 {s.partialCount}・不一致 {s.missCount}
              {s.requiredTotal > 0 && <>／必須 {s.requiredMet}/{s.requiredTotal} 充足</>}
            </span>
          )}
        </div>

        {/* 比べられないとき */}
        {!breakdown && (
          <div className={cx(cell, fullRow)}>
            <span className={muted}>どちらかの名刺が削除されているため、比べられません。</span>
          </div>
        )}
        {breakdown && breakdown.length === 0 && (
          <div className={cx(cell, fullRow)}>
            <span className={muted}>求める側に課題・希望のタグが登録されていません。名刺の編集から追加すると、提供側のどれが該当するかがここに出ます。</span>
          </div>
        )}

        {/* 1 行 = 課題・希望 1 つ */}
        {breakdown?.map((b) => {
          const n = needsById.get(b.needId)
          return [
            <div key={`${b.needId}-l`} className={cx(cell, NEED_BG[b.result])}>
              <div className={row} style={{ gap: 6 }}>
                <TagChip tag={tagsById.get(n?.tagId ?? '')} />
                <span className={muted}>{b.label.split('「')[0]}</span>
                <strong style={{ fontSize: 'var(--fs-sm)', color: b.importance === 'required' ? 'var(--c-danger)' : 'var(--c-muted)' }}>{IMPORTANCE_LABEL[b.importance]}</strong>
              </div>
              {(n?.dueDate || n?.note) && <span className={muted}>{n.dueDate && `期限 ${n.dueDate}`}{n.dueDate && n.note && ' ・ '}{n.note}</span>}
            </div>,
            <div key={`${b.needId}-r`} className={cell}>
              <div className={row} style={{ gap: 6 }}>
                <ResultBadge result={b.result} />
                {b.matchedTagIds.length > 0
                  ? b.matchedTagIds.map((id) => <TagChip key={id} tag={tagsById.get(id)} />)
                  : b.reason
                    ? <span>{b.reason}</span>
                    : <span className={muted}>該当なし</span>}
              </div>
            </div>,
          ]
        })}

        {/* 判定に使われなかった提供側の得意領域 */}
        {breakdown && breakdown.length > 0 && others.length > 0 && (
          <>
            <div className={cell} />
            <div className={cell}>
              <span className={muted}>そのほかの得意領域</span>
              <div className={row} style={{ gap: 4 }}>
                {others.map((id) => <TagChip key={id} tag={tagsById.get(id)} />)}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
