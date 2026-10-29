import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { css, cx } from '@emotion/css'
import { useData } from '../context/DataContext'
import { Icon, type IconName } from './Icons'
import { alertError, alertInfo, btn, btnSmall } from '../styles/ui'

interface NavItem { to: string; label: string; icon: IconName; adminOnly?: boolean; bottom?: boolean }

const NAV: NavItem[] = [
  { to: '/matches', label: 'マッチング', icon: 'link', bottom: true },
  { to: '/introductions', label: '紹介管理', icon: 'handshake', bottom: true },
  { to: '/people', label: '名刺一覧', icon: 'card', bottom: true },
  { to: '/companies', label: '会社一覧', icon: 'building' },
  { to: '/users', label: 'ユーザー管理', icon: 'users', adminOnly: true },
  { to: '/settings', label: '設定', icon: 'settings', bottom: true },
]

const shell = css`
  display: grid;
  grid-template-columns: var(--sidebar-width) minmax(0, 1fr);
  min-height: 100dvh;
  @media (max-width: 900px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const sidebar = css`
  background: var(--c-sidebar);
  color: var(--c-sidebar-text);
  padding: 16px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  position: sticky;
  top: 0;
  height: 100dvh;
  overflow-y: auto;
  @media (max-width: 900px) {
    position: fixed;
    z-index: 800;
    left: 0;
    top: 0;
    width: min(280px, 85vw);
    transform: translateX(-100%);
    transition: transform 0.2s;
  }
`
const sidebarOpen = css`
  @media (max-width: 900px) {
    transform: translateX(0);
    box-shadow: 4px 0 24px rgba(0, 0, 0, 0.3);
  }
`
const scrim = css`
  display: none;
  @media (max-width: 900px) {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 790;
    background: var(--c-overlay);
  }
`

const brand = css`
  font-weight: 700;
  color: #fff;
  padding: 4px 10px 14px;
  font-size: 15px;
`

const navLink = css`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  color: var(--c-sidebar-text);
  text-decoration: none !important;
  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }
  &.active {
    background: rgba(255, 255, 255, 0.14);
    color: #fff;
    font-weight: 600;
  }
`

const topbar = css`
  display: none;
  @media (max-width: 900px) {
    display: flex;
    align-items: center;
    gap: 10px;
    height: var(--topbar-height);
    padding: 0 var(--gutter);
    background: var(--c-surface);
    border-bottom: 1px solid var(--c-border);
    position: sticky;
    top: 0;
    z-index: 100;
  }
`

const main = css`
  padding: var(--gutter);
  min-width: 0;
  @media (max-width: 600px) {
    padding-bottom: calc(var(--bottomnav-height) + var(--gutter) + env(safe-area-inset-bottom));
  }
`

const bottomNav = css`
  display: none;
  @media (max-width: 600px) {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 100;
    height: calc(var(--bottomnav-height) + env(safe-area-inset-bottom));
    padding-bottom: env(safe-area-inset-bottom);
    background: var(--c-surface);
    border-top: 1px solid var(--c-border);
    a,
    button {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      font-size: 11px;
      color: var(--c-muted);
      border: none;
      background: none;
      text-decoration: none !important;
    }
    a.active {
      color: var(--c-primary);
      font-weight: 700;
    }
  }
`

const userBox = css`
  margin-top: auto;
  padding: 12px 10px 4px;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  font-size: var(--fs-sm);
`

const toast = css`
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 950;
  max-width: min(420px, calc(100vw - 32px));
  display: flex;
  gap: 8px;
  align-items: flex-start;
  box-shadow: var(--shadow);
  @media (max-width: 600px) {
    bottom: calc(var(--bottomnav-height) + 12px);
  }
`

export function Layout() {
  const { me, logout, error, notice, clearMessages } = useData()
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => {
    if (!notice) return
    const t = setTimeout(clearMessages, 4000)
    return () => clearTimeout(t)
  }, [notice, clearMessages])

  const items = NAV.filter((n) => !n.adminOnly || me?.role === 'admin')

  return (
    <div className={shell}>
      <nav className={cx(sidebar, menuOpen && sidebarOpen)} aria-label="メニュー">
        <div className={brand}>名刺マッチング <span className={css`font-weight: 400; opacity: 0.6; font-size: 11px;`}>モック</span></div>
        {items.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/people'} className={navLink} onClick={() => setMenuOpen(false)}>
            <Icon name={n.icon} />{n.label}
          </NavLink>
        ))}
        <div className={userBox}>
          <div className={css`color: #fff;`}>{me?.name}</div>
          <div className={css`opacity: 0.7; overflow-wrap: anywhere;`}>{me?.email}{me?.role === 'admin' && '（admin）'}</div>
          <button className={cx(btn, btnSmall)} style={{ marginTop: 8 }} onClick={logout}>ログアウト</button>
        </div>
      </nav>
      {menuOpen && <div className={scrim} onClick={() => setMenuOpen(false)} />}

      <div className={css`min-width: 0;`}>
        <header className={topbar}>
          <button className={cx(btn, btnSmall)} onClick={() => setMenuOpen(true)} aria-label="メニューを開く"><Icon name="menu" size={16} /> メニュー</button>
          <strong>名刺マッチング</strong>
        </header>
        <main className={main}>
          <Outlet />
        </main>
      </div>

      <nav className={bottomNav} aria-label="下部ナビゲーション">
        {items.filter((n) => n.bottom).map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/people'}>
            <Icon name={n.icon} size={20} /><span>{n.label.replace('一覧', '').replace('管理', '')}</span>
          </NavLink>
        ))}
        <button onClick={() => setMenuOpen(true)}><Icon name="menu" size={20} /><span>メニュー</span></button>
      </nav>

      {(error || notice) && (
        <div className={cx(toast, error ? alertError : alertInfo)} role="alert">
          <span>{error ?? notice}</span>
          <button className={css`border: none; background: none; cursor: pointer; color: inherit;`} onClick={clearMessages} aria-label="閉じる">×</button>
        </div>
      )}
    </div>
  )
}
