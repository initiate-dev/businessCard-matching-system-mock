import { css, keyframes } from '@emotion/css'

const spin = keyframes`to { transform: rotate(360deg); }`

const overlay = css`
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: var(--c-overlay);
  display: grid;
  place-items: center;
`
const spinner = css`
  width: 44px;
  height: 44px;
  border: 4px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`

/** 処理中は画面全体を暗くしてぐるぐるを出す */
export function LoadingOverlay({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <div className={overlay} role="status" aria-live="polite" aria-label="処理中">
      <div className={spinner} />
    </div>
  )
}
