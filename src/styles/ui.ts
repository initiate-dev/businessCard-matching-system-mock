// 共通の見た目（@emotion/css）
import { css, cx } from '@emotion/css'

export { css, cx }

export const page = css`
  display: flex;
  flex-direction: column;
  gap: var(--gap);
  max-width: var(--content-max);
`

export const pageHeader = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  h1 {
    font-size: var(--fs-xl);
  }
`

export const card = css`
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  padding: 16px;
  box-shadow: var(--shadow);
  min-width: 0;
  h2 {
    font-size: var(--fs-lg);
    margin-bottom: 12px;
  }
`

export const row = css`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

export const grid2 = css`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--gap);
  @media (max-width: 900px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

export const btn = css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 36px;
  padding: 6px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--c-border);
  background: var(--c-surface);
  cursor: pointer;
  white-space: nowrap;
  text-decoration: none !important;
  color: var(--c-text);
  &:hover:not(:disabled) {
    background: var(--c-surface-2);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

export const btnPrimary = cx(
  btn,
  css`
    background: var(--c-primary);
    border-color: var(--c-primary);
    color: var(--c-on-primary);
    &:hover:not(:disabled) {
      background: var(--c-primary);
      filter: brightness(1.08);
    }
  `,
)

export const btnDanger = cx(
  btn,
  css`
    color: var(--c-danger);
    border-color: var(--c-danger);
    &:hover:not(:disabled) {
      background: var(--c-danger-weak);
    }
  `,
)

export const btnSmall = css`
  min-height: 28px;
  padding: 2px 10px;
  font-size: var(--fs-sm);
`

export const input = css`
  width: 100%;
  min-height: 36px;
  padding: 6px 10px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  background: var(--c-surface);
  &:focus {
    outline: 2px solid var(--c-primary-weak);
    border-color: var(--c-primary);
  }
`

export const textarea = cx(
  input,
  css`
    min-height: 80px;
    resize: vertical;
  `,
)

export const field = css`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  > span:first-child {
    font-size: var(--fs-sm);
    color: var(--c-muted);
    font-weight: 600;
  }
`

export const formGrid = css`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  @media (max-width: 600px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

export const muted = css`
  color: var(--c-muted);
  font-size: var(--fs-sm);
`

export const unknown = css`
  color: var(--c-muted);
  font-style: italic;
`

/** 表は横スクロール */
export const tableWrap = css`
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  background: var(--c-surface);
`

export const table = css`
  width: 100%;
  min-width: 640px;
  th,
  td {
    padding: 8px 12px;
    border-bottom: 1px solid var(--c-border);
    text-align: left;
    vertical-align: top;
  }
  th {
    font-size: var(--fs-sm);
    color: var(--c-muted);
    background: var(--c-surface-2);
    white-space: nowrap;
  }
  tr:last-child td {
    border-bottom: none;
  }
`

export const chip = css`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 8px;
  border-radius: 999px;
  font-size: var(--fs-sm);
  background: var(--c-surface-2);
  border: 1px solid var(--c-border);
  white-space: nowrap;
`

export const dl = css`
  display: grid;
  grid-template-columns: 8em minmax(0, 1fr);
  gap: 6px 12px;
  margin: 0;
  dt {
    color: var(--c-muted);
    font-size: var(--fs-sm);
    padding-top: 2px;
  }
  dd {
    margin: 0;
    overflow-wrap: anywhere;
  }
`

export const alertError = css`
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  background: var(--c-danger-weak);
  color: var(--c-danger);
`

export const alertWarn = css`
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  background: var(--c-warn-weak);
  color: var(--c-warn);
`

export const alertInfo = css`
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  background: var(--c-primary-weak);
  color: var(--c-primary);
`

/** ログイン・初回パスワード変更の中央寄せ */
export const authWrap = css`
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 16px;
  > div {
    width: min(400px, 100%);
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  form {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
`

/** 名刺カードを並べるグリッド */
export const personGrid = css`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--gap);
`

/** 画面内の切り替えタブ（設定画面の下線タブと見分けやすいボタン型） */
export const pillTabs = css`
  display: flex;
  min-width: 0;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 2px;
`
export const pillTab = css`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: 1px solid var(--c-border);
  border-radius: 999px;
  background: var(--c-surface);
  cursor: pointer;
  white-space: nowrap;
  color: var(--c-text);
  span {
    font-size: var(--fs-sm);
    color: var(--c-muted);
  }
`
export const pillTabActive = css`
  background: var(--c-primary);
  border-color: var(--c-primary);
  color: var(--c-on-primary);
  font-weight: 700;
  span {
    color: var(--c-on-primary);
    opacity: 0.85;
  }
`

/** 画面の切り替えタブ（下線型。設定・名刺の登録で使う） */
export const tabBar = css`
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--c-border);
  overflow-x: auto;
`
export const tabBtn = css`
  padding: 8px 16px;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  background: none;
  cursor: pointer;
  white-space: nowrap;
  color: var(--c-muted);
`
export const tabActive = css`
  border-bottom-color: var(--c-primary);
  color: var(--c-primary);
  font-weight: 700;
`

/** 表のセルを縦方向に中央ぞろえにする（table と一緒に使う） */
export const tableMiddle = css`
  td,
  th {
    vertical-align: middle;
  }
`
