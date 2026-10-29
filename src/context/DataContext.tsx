// モックのデータ層。本番では Supabase のビュー（v_*）から読み、RPC / Edge Function で書く。
// モックでは DB の代わりにブラウザの localStorage に全体を置いている。
// 操作は「画面の状態を先に更新してから裏で書く」流れを再現している（失敗時はエラー表示＋読み直し）。
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import type {
  Company, Consent, EmailTemplate, ID, PeopleView, Introduction, IntroStatus, MockDb, Person, Profile, Role, Tag, TagCategory, UserPreferences,
} from '../types'
import { DB_VERSION, createSeedDb } from '../mock/seed'
import { canSee, generatePassword, newId, nowIso } from '../lib/util'
import { normalizeText } from '../lib/normalize'
import { defaultTemplates } from '../lib/mailTemplate'

const DB_KEY = 'bmc-mock-db'
const SESSION_KEY = 'bmc-mock-session'

function loadDb(): MockDb {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) {
      const db = JSON.parse(raw) as MockDb
      if (db.version === DB_VERSION) return db
    }
  } catch { /* 読めなければ初期データ */ }
  return createSeedDb()
}

function saveDb(db: MockDb) {
  try { localStorage.setItem(DB_KEY, JSON.stringify(db)) } catch { /* 容量超過などは無視（モック） */ }
}

function loadSession(): ID | null {
  try { return sessionStorage.getItem(SESSION_KEY) } catch { return null }
}

/** サーバーへの書き込みのふり */
const remote = (ms = 250) => new Promise<void>((r) => setTimeout(r, ms))

export type PersonInput = Omit<Person, 'createdBy' | 'updatedBy' | 'createdAt' | 'updatedAt' | 'deletedAt'>

export interface CompanyInput {
  id?: ID
  name: string
}

interface DataContextValue {
  db: MockDb
  me: Profile | null
  myPrefs: UserPreferences | null
  /** 見える・削除されていない名刺（本番のビュー v_people に当たる） */
  people: Person[]
  profilesById: Map<ID, Profile>
  busy: boolean
  error: string | null
  notice: string | null
  clearMessages: () => void
  notify: (msg: string) => void
  // 認証
  login: (email: string, password: string) => Promise<string | null>
  logout: () => void
  changePassword: (current: string | null, next: string) => Promise<string | null>
  // ユーザー管理（admin のみ）
  createUser: (input: { email: string; name: string; department: string | null; role: Role }) => Promise<{ error: string | null; password?: string }>
  reissuePassword: (userId: ID) => Promise<{ error: string | null; password?: string }>
  setUserActive: (userId: ID, active: boolean, handoverTo: ID | null) => Promise<string | null>
  // 設定
  updateMyName: (name: string) => Promise<void>
  updatePreferences: (patch: { emailTemplates?: EmailTemplate[]; minMatchScore?: number; peopleView?: PeopleView }) => Promise<void>
  // タグ
  addTag: (input: { name: string; category: TagCategory; aliases: string[] }) => Promise<Tag | string>
  updateTag: (tag: Tag) => Promise<string | null>
  mergeTag: (sourceId: ID, targetId: ID) => Promise<void>
  deleteTag: (id: ID) => Promise<string | null>
  tagUsage: (id: ID) => number
  // 会社
  saveCompany: (c: Company) => Promise<void>
  ensureCompany: (name: string) => Company
  // 人
  savePerson: (input: PersonInput, newCompanyName?: string | null) => Promise<Person>
  deletePerson: (id: ID) => Promise<void>
  mergePeople: (keepId: ID, dropId: ID) => Promise<void>
  importPeople: (rows: (PersonInput & { companyName: string | null })[]) => Promise<number>
  // 紹介
  createIntroduction: (providerId: ID, seekerId: ID, score: number | null, opts?: { status?: IntroStatus; providerConsent?: Consent; seekerConsent?: Consent; memo?: string | null }) => Promise<Introduction | string>
  changeIntroStatus: (id: ID, to: IntroStatus, note: string | null) => Promise<void>
  updateIntroduction: (id: ID, patch: { assigneeId?: ID | null; memo?: string | null; providerConsent?: Consent; seekerConsent?: Consent }) => Promise<void>
  resetDb: () => void
}

const Ctx = createContext<DataContextValue | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const [db, setDbState] = useState<MockDb>(loadDb)
  const dbRef = useRef(db)
  const [sessionUserId, setSessionUserId] = useState<ID | null>(loadSession)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  /** 画面を先に更新し、裏で保存する */
  const commit = useCallback(async (fn: (draft: MockDb) => void) => {
    const next = structuredClone(dbRef.current)
    fn(next)
    dbRef.current = next
    setDbState(next)
    try {
      await remote()
      saveDb(next)
    } catch (e) {
      setError(`保存に失敗しました: ${String(e)}`)
      const reloaded = loadDb()
      dbRef.current = reloaded
      setDbState(reloaded)
    }
  }, [])

  /** 画面全体を暗くして待つ処理 */
  const withOverlay = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    setBusy(true)
    try { return await fn() } finally { setBusy(false) }
  }, [])

  const profilesById = useMemo(() => new Map(db.profiles.map((p) => [p.id, p])), [db.profiles])
  const me = sessionUserId ? (profilesById.get(sessionUserId) ?? null) : null
  const activeMe = me?.active ? me : null
  const myPrefs = activeMe ? (db.preferences.find((p) => p.userId === activeMe.id) ?? null) : null

  const people = useMemo(
    () => (activeMe ? db.people.filter((p) => !p.deletedAt && canSee(p, activeMe, profilesById)) : []),
    [db.people, activeMe, profilesById],
  )

  const requireMe = () => {
    if (!activeMe) throw new Error('ログインしていません')
    return activeMe
  }

  const value: DataContextValue = {
    db, me: activeMe, myPrefs, people, profilesById, busy, error, notice,
    clearMessages: () => { setError(null); setNotice(null) },
    notify: (msg) => setNotice(msg),

    login: (email, password) => withOverlay(async () => {
      await remote(500)
      const p = dbRef.current.profiles.find((x) => x.email.toLowerCase() === email.trim().toLowerCase())
      if (!p || dbRef.current.passwords[p.id] !== password) return 'メールアドレスかパスワードが違います'
      if (!p.active) return 'このアカウントは無効になっています'
      try { sessionStorage.setItem(SESSION_KEY, p.id) } catch { /* 無視 */ }
      setSessionUserId(p.id)
      return null
    }),

    logout: () => {
      try { sessionStorage.removeItem(SESSION_KEY) } catch { /* 無視 */ }
      setSessionUserId(null)
    },

    changePassword: (current, next) => withOverlay(async () => {
      const u = requireMe()
      await remote(400)
      // 初回変更以外は現在のパスワードを確かめる（本番は Edge Function）
      if (!u.mustChangePassword && dbRef.current.passwords[u.id] !== current) return '現在のパスワードが違います'
      if (next.length < 8) return 'パスワードは 8 文字以上にしてください'
      if (next === dbRef.current.passwords[u.id]) return '今と同じパスワードは使えません'
      await commit((d) => {
        d.passwords[u.id] = next
        d.profiles.find((p) => p.id === u.id)!.mustChangePassword = false
      })
      return null
    }),

    createUser: (input) => withOverlay(async () => {
      const u = requireMe()
      if (u.role !== 'admin') return { error: '権限がありません' }
      await remote(400)
      const email = input.email.trim().toLowerCase()
      if (!/^[^@\s]+@[^@\s]+$/.test(email)) return { error: 'メールアドレスの形式が正しくありません' }
      if (dbRef.current.profiles.some((p) => p.email.toLowerCase() === email)) return { error: 'このメールアドレスは登録済みです' }
      const id = newId('u')
      const password = generatePassword()
      await commit((d) => {
        d.profiles.push({ id, email, name: input.name.trim() || email, role: input.role, department: input.department, mustChangePassword: true, active: true, createdAt: nowIso() })
        d.passwords[id] = password
        d.preferences.push({ userId: id, emailTemplates: defaultTemplates(), minMatchScore: 30 })
      })
      return { error: null, password }
    }),

    reissuePassword: (userId) => withOverlay(async () => {
      const u = requireMe()
      if (u.role !== 'admin') return { error: '権限がありません' }
      if (userId === u.id) return { error: '自分のパスワードは設定画面から変更してください' }
      await remote(400)
      const password = generatePassword()
      await commit((d) => {
        d.passwords[userId] = password
        d.profiles.find((p) => p.id === userId)!.mustChangePassword = true
      })
      return { error: null, password }
    }),

    setUserActive: (userId, active, handoverTo) => withOverlay(async () => {
      const u = requireMe()
      if (u.role !== 'admin') return '権限がありません'
      if (userId === u.id) return '自分は無効にできません'
      await remote(400)
      await commit((d) => {
        d.profiles.find((p) => p.id === userId)!.active = active
        if (!active && handoverTo) {
          for (const p of d.people) if (p.ownerId === userId) { p.ownerId = handoverTo; p.updatedBy = u.id; p.updatedAt = nowIso() }
          for (const i of d.introductions) if (i.assigneeId === userId) i.assigneeId = handoverTo
        }
      })
      return null
    }),

    updateMyName: async (name) => {
      const u = requireMe()
      await commit((d) => { d.profiles.find((p) => p.id === u.id)!.name = name.trim() || u.name })
    },

    updatePreferences: async (patch) => {
      const u = requireMe()
      await commit((d) => {
        const pref = d.preferences.find((p) => p.userId === u.id)
        if (pref) Object.assign(pref, patch)
        else d.preferences.push({ userId: u.id, emailTemplates: defaultTemplates(), minMatchScore: 30, ...patch })
      })
    },

    addTag: async (input) => {
      const key = normalizeText(input.name)
      if (!key) return 'タグ名を入れてください'
      const clash = dbRef.current.tags.find((t) => [t.name, ...t.aliases].some((n) => normalizeText(n) === key))
      if (clash) return `「${clash.name}」と同じです（正規名か別名）`
      const tag: Tag = { id: newId('t'), name: input.name.trim(), category: input.category, aliases: input.aliases }
      await commit((d) => { d.tags.push(tag) })
      return tag
    },

    updateTag: async (tag) => {
      const keys = [tag.name, ...tag.aliases].map(normalizeText).filter(Boolean)
      if (new Set(keys).size !== keys.length) return '正規名と別名に同じものがあります'
      const clash = dbRef.current.tags.find((t) => t.id !== tag.id && [t.name, ...t.aliases].some((n) => keys.includes(normalizeText(n))))
      if (clash) return `「${clash.name}」と重なる名前があります。統合を使ってください`
      await commit((d) => { Object.assign(d.tags.find((t) => t.id === tag.id)!, tag) })
      return null
    },

    mergeTag: (sourceId, targetId) => withOverlay(async () => {
      await commit((d) => {
        const src = d.tags.find((t) => t.id === sourceId)!
        const dst = d.tags.find((t) => t.id === targetId)!
        dst.aliases = [...new Set([...dst.aliases, src.name, ...src.aliases])]
        const swapIds = (ids: ID[]) => [...new Set(ids.map((i) => (i === sourceId ? targetId : i)))]
        const swapNeeds = <N extends { tagId: ID }>(ns: N[]) => {
          const seen = new Set<ID>()
          return ns.map((n) => (n.tagId === sourceId ? { ...n, tagId: targetId } : n)).filter((n) => (seen.has(n.tagId) ? false : (seen.add(n.tagId), true)))
        }
        for (const p of d.people) {
          p.offering.tagIds = swapIds(p.offering.tagIds)
          p.needs = swapNeeds(p.needs)
        }
        for (const c of d.companies) {
          if (c.industryTagId === sourceId) c.industryTagId = targetId
          if (c.regionTagId === sourceId) c.regionTagId = targetId
        }
        d.tags = d.tags.filter((t) => t.id !== sourceId)
      })
    }),

    deleteTag: async (id) => {
      if (value.tagUsage(id) > 0) return '使われているタグは削除できません。統合を使ってください'
      await commit((d) => { d.tags = d.tags.filter((t) => t.id !== id) })
      return null
    },

    tagUsage: (id) => {
      const d = dbRef.current
      let n = 0
      for (const p of d.people) {
        if (p.deletedAt) continue
        if (p.offering.tagIds.includes(id)) n++
        n += p.needs.filter((x) => x.tagId === id).length
      }
      for (const c of d.companies) {
        if (c.industryTagId === id || c.regionTagId === id) n++
      }
      return n
    },

    saveCompany: async (c) => {
      await commit((d) => {
        const i = d.companies.findIndex((x) => x.id === c.id)
        if (i >= 0) d.companies[i] = c
        else d.companies.push(c)
      })
    },

    ensureCompany: (name) => {
      const key = normalizeText(name)
      const found = dbRef.current.companies.find((c) => normalizeText(c.name) === key)
      if (found) return found
      return { id: newId('c'), name: name.trim(), industryTagId: null, size: null, regionTagId: null, address: null }
    },

    // 人＋（必要なら）会社を 1 回で保存する。本番は RPC save_person で 1 トランザクション
    savePerson: async (input, newCompanyName) => {
      const u = requireMe()
      const now = nowIso()
      let saved!: Person
      await commit((d) => {
        let companyId = input.companyId
        if (newCompanyName && newCompanyName.trim()) {
          const c = value.ensureCompany(newCompanyName)
          // 新しく作る会社の所在地は名刺の住所を使う
          if (!d.companies.some((x) => x.id === c.id)) d.companies.push({ ...c, address: input.address })
          companyId = c.id
        }
        const i = d.people.findIndex((p) => p.id === input.id)
        if (i >= 0) {
          saved = { ...d.people[i], ...input, companyId, updatedBy: u.id, updatedAt: now }
          d.people[i] = saved
        } else {
          saved = { ...input, companyId, createdBy: u.id, updatedBy: u.id, createdAt: now, updatedAt: now, deletedAt: null }
          d.people.push(saved)
        }
      })
      return saved
    },

    deletePerson: (id) => withOverlay(async () => {
      const u = requireMe()
      await commit((d) => {
        const p = d.people.find((x) => x.id === id)!
        p.deletedAt = nowIso()
        p.updatedBy = u.id
      })
    }),

    // 重複した名刺を 1 つにまとめる。drop 側の空でない値・タグを keep 側に寄せ、drop は論理削除
    mergePeople: (keepId, dropId) => withOverlay(async () => {
      const u = requireMe()
      await commit((d) => {
        const keep = d.people.find((p) => p.id === keepId)!
        const drop = d.people.find((p) => p.id === dropId)!
        const fill = ['kana', 'companyId', 'department', 'title', 'email', 'phone', 'address', 'url', 'cardFrontUrl', 'cardBackUrl', 'exchangedOn', 'exchangedAt', 'referrer'] as const
        for (const k of fill) if (keep[k] === null && drop[k] !== null) (keep as unknown as Record<string, unknown>)[k] = drop[k]
        keep.memo = [keep.memo, drop.memo].filter(Boolean).join('\n') || null
        keep.offering.tagIds = [...new Set([...keep.offering.tagIds, ...drop.offering.tagIds])]
        keep.offering.description = [keep.offering.description, drop.offering.description].filter(Boolean).join('\n') || null
        for (const n of drop.needs) if (!keep.needs.some((x) => x.tagId === n.tagId)) keep.needs.push(n)
        keep.needsNote = [keep.needsNote, drop.needsNote].filter(Boolean).join('\n') || null
        keep.updatedBy = u.id
        keep.updatedAt = nowIso()
        drop.deletedAt = nowIso()
        for (const i of d.introductions) {
          if (i.providerId === dropId) { i.providerId = keepId; i.providerName = keep.name }
          if (i.seekerId === dropId) { i.seekerId = keepId; i.seekerName = keep.name }
        }
      })
    }),

    importPeople: (rows) => withOverlay(async () => {
      const u = requireMe()
      await remote(600)
      const now = nowIso()
      await commit((d) => {
        for (const r of rows) {
          const { companyName, ...rest } = r
          let companyId: ID | null = null
          if (companyName) {
            const key = normalizeText(companyName)
            let c = d.companies.find((x) => normalizeText(x.name) === key)
            if (!c) {
              c = { id: newId('c'), name: companyName.trim(), industryTagId: null, size: null, regionTagId: null, address: rest.address }
              d.companies.push(c)
            }
            companyId = c.id
          }
          d.people.push({ ...rest, companyId, createdBy: u.id, updatedBy: u.id, createdAt: now, updatedAt: now, deletedAt: null })
        }
      })
      return rows.length
    }),

    createIntroduction: async (providerId, seekerId, score, opts = {}) => {
      const u = requireMe()
      // 見送り以外で同じ組み合わせは 1 件まで（本番は部分ユニーク制約）
      const dup = dbRef.current.introductions.find((i) => i.providerId === providerId && i.seekerId === seekerId && i.status !== 'declined')
      if (dup) return 'この組み合わせの紹介はすでにあります'
      const prov = dbRef.current.people.find((p) => p.id === providerId)!
      const seek = dbRef.current.people.find((p) => p.id === seekerId)!
      const now = nowIso()
      const intro: Introduction = {
        id: newId('i'), providerId, seekerId, providerName: prov.name, seekerName: seek.name, status: opts.status ?? 'candidate',
        history: [{ id: newId('h'), from: null, to: opts.status ?? 'candidate', changedBy: u.id, changedAt: now, note: null }],
        assigneeId: u.id, providerConsent: opts.providerConsent ?? 'unknown', seekerConsent: opts.seekerConsent ?? 'unknown', scoreAtCreation: score, memo: opts.memo ?? null,
        createdBy: u.id, createdAt: now, updatedAt: now,
      }
      await commit((d) => { d.introductions.push(intro) })
      return intro
    },

    changeIntroStatus: async (id, to, note) => {
      const u = requireMe()
      const target = dbRef.current.introductions.find((x) => x.id === id)!
      if (to !== 'declined' && target.status === 'declined') {
        const dup = dbRef.current.introductions.find((i) => i.id !== id && i.providerId === target.providerId && i.seekerId === target.seekerId && i.status !== 'declined')
        if (dup) { setError('この組み合わせの紹介はほかにもあるため戻せません'); return }
      }
      await commit((d) => {
        const i = d.introductions.find((x) => x.id === id)!
        if (i.status === to) return
        const now = nowIso()
        i.history.push({ id: newId('h'), from: i.status, to, changedBy: u.id, changedAt: now, note })
        i.status = to
        i.updatedAt = now
      })
    },

    updateIntroduction: async (id, patch) => {
      await commit((d) => {
        const i = d.introductions.find((x) => x.id === id)!
        Object.assign(i, patch)
        i.updatedAt = nowIso()
      })
    },

    resetDb: () => {
      const fresh = createSeedDb()
      dbRef.current = fresh
      setDbState(fresh)
      saveDb(fresh)
      try { sessionStorage.removeItem(SESSION_KEY) } catch { /* 無視 */ }
      setSessionUserId(null)
    },
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react/only-export-components
export function useData(): DataContextValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('DataProvider の中で使ってください')
  return v
}
