import { css, cx } from '@emotion/css'
import type { IntroStatus, Tag } from '../types'
import { INTRO_STATUS_LABEL, TAG_CATEGORY_LABEL } from '../types'
import type { MatchResultKind } from '../lib/match'
import { MATCH_RESULT_LABEL } from '../lib/match'
import { chip } from '../styles/ui'

const STATUS_COLOR: Record<IntroStatus, [string, string]> = {
  candidate: ['var(--c-surface-2)', 'var(--c-muted)'],
  proposing: ['var(--c-warn-weak)', 'var(--c-warn)'],
  introduced: ['var(--c-primary-weak)', 'var(--c-primary)'],
  negotiating: ['#efe7fc', '#6b3fc4'],
  won: ['var(--c-success-weak)', 'var(--c-success)'],
  declined: ['var(--c-danger-weak)', 'var(--c-danger)'],
}

export function StatusBadge({ status }: { status: IntroStatus }) {
  const [bg, fg] = STATUS_COLOR[status]
  return <span className={cx(chip, css`background: ${bg}; color: ${fg}; border-color: transparent; font-weight: 600;`)}>{INTRO_STATUS_LABEL[status]}</span>
}

const RESULT_COLOR: Record<MatchResultKind, [string, string]> = {
  match: ['var(--c-success-weak)', 'var(--c-success)'],
  partial: ['var(--c-warn-weak)', 'var(--c-warn)'],
  miss: ['var(--c-surface-2)', 'var(--c-muted)'],
  unknown: ['var(--c-surface-2)', 'var(--c-muted)'],
}

export function ResultBadge({ result }: { result: MatchResultKind }) {
  const [bg, fg] = RESULT_COLOR[result]
  return <span className={cx(chip, css`background: ${bg}; color: ${fg}; border-color: transparent;`)}>{MATCH_RESULT_LABEL[result]}</span>
}

export function ScoreBadge({ score }: { score: number }) {
  const color = score >= 75 ? 'var(--c-success)' : score >= 50 ? 'var(--c-primary)' : score >= 30 ? 'var(--c-warn)' : 'var(--c-muted)'
  return (
    <span className={css`display: inline-flex; flex-direction: column; align-items: center; min-width: 52px;`}>
      <strong className={css`font-size: 20px; line-height: 1; color: ${color};`}>{score}</strong>
      <span className={css`font-size: 10px; color: var(--c-muted);`}>マッチ率</span>
    </span>
  )
}

export function TagChip({ tag, suffix, onRemove }: { tag: Tag | undefined; suffix?: string; onRemove?: () => void }) {
  if (!tag) return <span className={chip}>（削除されたタグ）</span>
  return (
    <span className={chip} title={`${TAG_CATEGORY_LABEL[tag.category]}${tag.aliases.length ? ` / 別名: ${tag.aliases.join('、')}` : ''}`}>
      {tag.name}
      {suffix && <span className={css`color: var(--c-muted);`}>{suffix}</span>}
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={`${tag.name} を外す`} className={css`border: none; background: none; cursor: pointer; padding: 0 0 0 2px; color: var(--c-muted);`}>×</button>
      )}
    </span>
  )
}
