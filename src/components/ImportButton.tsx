import { useEffect, useRef, useState } from 'react'
import { css, cx } from '@emotion/css'
import { buildTemplateCsv, downloadBlob } from '../lib/csv'
import { btn } from '../styles/ui'

const group = css`
  position: relative;
  display: inline-flex;
`
const main = css`
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
`
const toggle = css`
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  border-left: none;
  padding: 6px 10px;
  font-size: 11px;
`
const menu = css`
  position: absolute;
  z-index: 60;
  top: calc(100% + 4px);
  right: 0;
  min-width: 220px;
  margin: 0;
  padding: 4px 0;
  list-style: none;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow);
  button {
    width: 100%;
    text-align: left;
    padding: 8px 14px;
    border: none;
    background: none;
    cursor: pointer;
    white-space: nowrap;
  }
  button:hover {
    background: var(--c-surface-2);
  }
`

/** 「CSV インポート」＋ ▽（テンプレートのダウンロード）の分割ボタン */
export function ImportButton({ onImport }: { onImport: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // 外側をクリック・Esc で閉じる
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  return (
    <div className={group} ref={ref}>
      <button type="button" className={cx(btn, main)} onClick={onImport}>CSV インポート</button>
      <button type="button" className={cx(btn, toggle)} aria-label="CSV インポートのその他の操作" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>▽</button>
      {open && (
        <ul className={menu} role="menu">
          <li role="none">
            <button type="button" role="menuitem" onClick={() => { downloadBlob(buildTemplateCsv(), '名刺取り込みテンプレート.csv'); setOpen(false) }}>
              テンプレートをダウンロード
            </button>
          </li>
        </ul>
      )}
    </div>
  )
}
