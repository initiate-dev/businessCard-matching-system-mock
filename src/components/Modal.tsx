import { useEffect, type ReactNode } from 'react'
import { css } from '@emotion/css'
import { btn, btnDanger, btnPrimary, row } from '../styles/ui'

const backdrop = css`
  position: fixed;
  inset: 0;
  z-index: 900;
  background: var(--c-overlay);
  display: grid;
  place-items: center;
  padding: 16px;
`
const box = css`
  width: min(640px, 100%);
  max-height: calc(100dvh - 32px);
  overflow: auto;
  background: var(--c-surface);
  border-radius: var(--radius);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  h2 {
    font-size: var(--fs-lg);
  }
  /* 中身が長いときは中身を縮めず、モーダル全体をスクロールさせる */
  > * {
    flex-shrink: 0;
  }
`

export function Modal({ title, children, onClose, footer, wide }: { title: string; children: ReactNode; onClose: () => void; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className={backdrop} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className={box} style={wide ? { width: 'min(860px, 100%)' } : undefined} role="dialog" aria-modal="true" aria-label={title}>
        <h2>{title}</h2>
        {children}
        {footer && <div className={row} style={{ justifyContent: 'flex-end' }}>{footer}</div>}
      </div>
    </div>
  )
}

/** 共通の確認モーダル */
export function ConfirmModal({ title, message, confirmLabel = 'OK', danger, onConfirm, onCancel }: {
  title: string
  message: ReactNode
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      footer={
        <>
          <button className={btn} onClick={onCancel}>キャンセル</button>
          <button className={danger ? btnDanger : btnPrimary} onClick={onConfirm}>{confirmLabel}</button>
        </>
      }
    >
      <div>{message}</div>
    </Modal>
  )
}
