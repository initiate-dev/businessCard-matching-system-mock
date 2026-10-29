// ナビゲーション用の単色アイコン（線画）。色は文字色（currentColor）に合わせる。
import type { ReactNode } from 'react'

export type IconName = 'card' | 'building' | 'link' | 'handshake' | 'users' | 'settings' | 'menu' | 'grid' | 'list'

const PATHS: Record<IconName, ReactNode> = {
  // 名刺
  card: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <circle cx="8" cy="11" r="2" />
      <path d="M5 16c.6-1.5 1.8-2.2 3-2.2s2.4.7 3 2.2" />
      <path d="M14 10h5M14 14h3" />
    </>
  ),
  // 会社
  building: (
    <>
      <rect x="4" y="3" width="12" height="18" rx="1" />
      <path d="M16 9h3a1 1 0 0 1 1 1v11" />
      <path d="M8 7h1M11 7h1M8 11h1M11 11h1M8 15h1M11 15h1" />
      <path d="M9 21v-3h2v3" />
    </>
  ),
  // マッチ候補
  link: (
    <>
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
      <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
    </>
  ),
  // 紹介
  handshake: (
    <>
      <path d="M2 11l4-4 4 2 2-1 4 0 6 4" />
      <path d="M2 11l5 5 2-1 2 2 2-1 2 2 3-2 4-4" />
      <path d="M10 9l-2 3 1.5 1L12 11l3 3" />
    </>
  ),
  // ユーザー管理
  users: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c.8-3.2 3.2-5 6-5s5.2 1.8 6 5" />
      <path d="M16 5.2a3 3 0 0 1 0 5.6M18 15.4c1.4.8 2.5 2.4 3 4.6" />
    </>
  ),
  // 設定
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </>
  ),
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  // カード表示
  grid: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1" />
      <rect x="13" y="4" width="7" height="7" rx="1" />
      <rect x="4" y="13" width="7" height="7" rx="1" />
      <rect x="13" y="13" width="7" height="7" rx="1" />
    </>
  ),
  // リスト表示
  list: (
    <>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01" strokeWidth={2.6} />
    </>
  ),
}

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={{ flexShrink: 0, display: 'block' }}
    >
      {PATHS[name]}
    </svg>
  )
}
