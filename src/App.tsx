import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import {
  Cake,
  ChevronDown,
  ChevronRight,
  Cross,
  Heart,
  Lock,
  LogOut,
  MapPin,
  Search,
  ShieldCheck,
  Users
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { familyData, type Person } from '@/data/familyData'
import { getAllowedEmails, isSupabaseConfigured, supabase } from '@/lib/supabase'

type PeopleById = Record<string, Person>

type PersonAvatarProps = {
  person: Person
}

type PersonCardProps = {
  person: Person
  peopleById: PeopleById
  isHighlighted: boolean
  onSelect: (person: Person) => void
}

type GenerationRow = {
  depth: number
  people: Person[]
}

type ConnectorLine = {
  x1: number
  y1: number
  x2: number
  y2: number
}

type DetailsPanelProps = {
  person: Person | null
  peopleById: PeopleById
  onClose: () => void
}

type AuthGateProps = {
  onAuthorized: (user: User) => void
}

const allowedEmails = getAllowedEmails()

function getPersonInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function buildPeopleMap(people: Person[]) {
  return people.reduce<PeopleById>((map, person) => {
    map[person.id] = person
    return map
  }, {})
}

function isAllowedUser(user: User | null) {
  const email = user?.email?.toLowerCase()
  if (!email) return false
  if (allowedEmails.length === 0) return false
  return allowedEmails.includes(email)
}

function PersonAvatar({ person }: PersonAvatarProps) {
  if (person.photo) {
    return (
      <img
        src={person.photo}
        alt={person.name}
        className="h-14 w-14 rounded-2xl object-cover ring-2 ring-white shadow-sm"
      />
    )
  }

  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-sm font-bold text-white shadow-sm">
      {getPersonInitials(person.name)}
    </div>
  )
}

function PersonCard({ person, peopleById, isHighlighted, onSelect }: PersonCardProps) {
  const spouses = person.spouseIds.map((id) => peopleById[id]).filter(Boolean)
  const hasSpouses = spouses.length > 0

  return (
    <Card
      onClick={() => onSelect(person)}
      className={`${hasSpouses ? 'w-[38rem]' : 'w-72'} max-w-full cursor-pointer border bg-white/90 shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${
        isHighlighted ? 'border-slate-900 ring-4 ring-slate-200' : 'border-slate-200'
      }`}
    >
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-stretch">
          <div className="min-w-0 flex-1 rounded-2xl border border-slate-100 bg-white/80 p-3">
            <div className="flex gap-3">
              <PersonAvatar person={person} />
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-base font-bold text-slate-950">{person.name}</h3>
                <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                  <Cake className="h-3.5 w-3.5" />
                  <span>{person.birthDate ?? 'Unknown'}</span>
                </div>
                <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                  <Cross className="h-3.5 w-3.5" />
                  <span>{person.deathDate ?? 'Present'}</span>
                </div>
                {person.location ? (
                  <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                    <MapPin className="h-3.5 w-3.5" />
                    <span className="truncate">{person.location}</span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {hasSpouses ? (
            <div className="min-w-0 flex-1 rounded-2xl border border-rose-100 bg-rose-50/90 p-3 text-xs text-rose-900 shadow-sm">
              <div className="flex items-center gap-1 font-semibold text-rose-800">
                <Heart className="h-3.5 w-3.5" />
                Spouse
              </div>
              <div className="mt-3 space-y-3">
                {spouses.map((spouse) => (
                  <div
                    key={spouse.id}
                    className="rounded-2xl border border-rose-200/80 bg-white/80 p-3 shadow-sm"
                    onClick={(event) => {
                      event.stopPropagation()
                      onSelect(spouse)
                    }}
                  >
                    <div className="flex gap-3">
                      <PersonAvatar person={spouse} />
                      <div className="min-w-0 flex-1">
                        <h4 className="truncate text-sm font-bold text-slate-950">{spouse.name}</h4>
                        <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                          <Cake className="h-3.5 w-3.5" />
                          <span>{spouse.birthDate ?? 'Unknown'}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                          <Cross className="h-3.5 w-3.5" />
                          <span>{spouse.deathDate ?? 'Present'}</span>
                        </div>
                        {spouse.location ? (
                          <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                            <MapPin className="h-3.5 w-3.5" />
                            <span className="truncate">{spouse.location}</span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

function buildVisibleGenerationRows(
  rootId: string,
  peopleById: PeopleById,
  collapsedIds: string[]
): GenerationRow[] {
  const rows = new Map<number, Person[]>()

  const visit = (personId: string, depth: number) => {
    const person = peopleById[personId]
    if (!person) return

    const row = rows.get(depth) ?? []
    row.push(person)
    rows.set(depth, row)

    if (collapsedIds.includes(person.id)) return

    for (const childId of person.childIds) {
      visit(childId, depth + 1)
    }
  }

  visit(rootId, 0)

  return Array.from(rows.entries())
    .sort(([a], [b]) => a - b)
    .map(([depth, people]) => ({ depth, people }))
}

function DetailsPanel({ person, peopleById, onClose }: DetailsPanelProps) {
  if (!person) return null

  const spouses = person.spouseIds.map((id) => peopleById[id]).filter(Boolean)
  const children = person.childIds.map((id) => peopleById[id]).filter(Boolean)

  return (
    <aside className="fixed bottom-5 right-5 z-20 w-[min(92vw,380px)] rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
      <div className="flex items-start gap-4">
        <PersonAvatar person={person} />
        <div className="flex-1">
          <h2 className="text-xl font-bold text-slate-950">{person.name}</h2>
          <div className="mt-2 space-y-1 text-sm text-slate-500">
            <p className="flex items-center gap-2">
              <Cake className="h-4 w-4" />
              <span>{person.birthDate ?? 'Unknown'}</span>
            </p>
            <p className="flex items-center gap-2">
              <Cross className="h-4 w-4" />
              <span>{person.deathDate ?? 'Present'}</span>
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>

      <div className="mt-5 space-y-4 text-sm">
        {person.location ? (
          <div>
            <p className="font-semibold text-slate-900">Location</p>
            <p className="text-slate-600">{person.location}</p>
          </div>
        ) : null}

        {spouses.length > 0 ? (
          <div>
            <p className="font-semibold text-slate-900">Spouse</p>
            <p className="text-slate-600">{spouses.map((spouse) => spouse.name).join(', ')}</p>
          </div>
        ) : null}

        {children.length > 0 ? (
          <div>
            <p className="font-semibold text-slate-900">Children</p>
            <p className="text-slate-600">{children.map((child) => child.name).join(', ')}</p>
          </div>
        ) : null}

        {person.notes ? (
          <div>
            <p className="font-semibold text-slate-900">Notes</p>
            <p className="text-slate-600">{person.notes}</p>
          </div>
        ) : null}
      </div>
    </aside>
  )
}

function countGenerations(rootId: string, peopleById: PeopleById): number {
  const root = peopleById[rootId]
  if (!root) return 0
  if (root.childIds.length === 0) return 1

  return 1 + Math.max(...root.childIds.map((childId) => countGenerations(childId, peopleById)))
}

function ConfigRequired() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,#f8fafc,#e2e8f0_45%,#cbd5e1)] px-5 text-slate-900">
      <Card className="w-full max-w-2xl border bg-white/90 shadow-xl">
        <CardContent className="p-8">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-7 w-7 text-slate-900" />
            <h1 className="text-2xl font-black text-slate-950">Supabase Setup Needed</h1>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            Add your Supabase credentials and approved family emails before this site can be accessed.
          </p>
          <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
            <p>
              Required env vars: <code className="rounded bg-slate-100 px-1 py-0.5">VITE_SUPABASE_URL</code>,{' '}
              <code className="rounded bg-slate-100 px-1 py-0.5">VITE_SUPABASE_ANON_KEY</code>, and{' '}
              <code className="rounded bg-slate-100 px-1 py-0.5">VITE_ALLOWED_EMAILS</code>.
            </p>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}

function AuthGate({ onAuthorized }: AuthGateProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  if (!supabase) return <ConfigRequired />

  const supabaseClient = supabase

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setMessage('')

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    const user = data.user
    if (!isAllowedUser(user)) {
      await supabaseClient.auth.signOut()
      setMessage('This account is not on the approved family access list.')
      setLoading(false)
      return
    }

    if (user) onAuthorized(user)
    setLoading(false)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,#f8fafc,#e2e8f0_45%,#cbd5e1)] px-5 py-10 text-slate-900">
      <Card className="w-full max-w-md border bg-white/90 shadow-xl">
        <CardContent className="p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl bg-slate-900 p-3 text-white">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Private access</p>
              <h1 className="text-2xl font-black text-slate-950">{familyData.familyName}</h1>
            </div>
          </div>

          <p className="mb-6 text-sm leading-6 text-slate-600">
            Sign in with an approved family account to access the tree.
          </p>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-200"
                placeholder="you@example.com"
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-200"
                placeholder="Your password"
                required
              />
            </label>

            {message ? <p className="text-sm text-rose-700">{message}</p> : null}

            <Button className="w-full rounded-2xl" type="submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-xs leading-5 text-slate-600">
            Allowed accounts are controlled through{' '}
            <code className="rounded bg-slate-100 px-1 py-0.5">VITE_ALLOWED_EMAILS</code>.
          </div>
        </CardContent>
      </Card>
    </main>
  )
}

function FamilyTreeApp({ user }: { user: User }) {
  const [query, setQuery] = useState('')
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)
  const [collapsedIds, setCollapsedIds] = useState<string[]>([])
  const [connectorLines, setConnectorLines] = useState<ConnectorLine[]>([])
  const [overlaySize, setOverlaySize] = useState({ width: 0, height: 0 })
  const treeContentRef = useRef<HTMLDivElement | null>(null)
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const supabaseClient = supabase

  const peopleById = useMemo(() => buildPeopleMap(familyData.people), [])
  const totalPeople = familyData.people.length
  const totalGenerations = countGenerations(familyData.rootId, peopleById)
  const generationRows = useMemo(
    () => buildVisibleGenerationRows(familyData.rootId, peopleById, collapsedIds),
    [peopleById, collapsedIds]
  )
  const visibleIds = useMemo(
    () => new Set(generationRows.flatMap((row) => row.people.map((person) => person.id))),
    [generationRows]
  )

  useEffect(() => {
    const container = treeContentRef.current
    if (!container) return

    let frame = 0

    const updateLines = () => {
      frame = 0

      const containerRect = container.getBoundingClientRect()
      const lines: ConnectorLine[] = []

      for (const row of generationRows) {
        for (const parent of row.people) {
          if (collapsedIds.includes(parent.id)) continue

          const parentElement = cardRefs.current[parent.id]
          const childElements = parent.childIds
            .filter((childId) => visibleIds.has(childId))
            .map((childId) => cardRefs.current[childId])
            .filter((element): element is HTMLDivElement => Boolean(element))

          if (!parentElement || childElements.length === 0) continue

          const parentRect = parentElement.getBoundingClientRect()
          const parentX = parentRect.left - containerRect.left + parentRect.width / 2
          const parentBottom = parentRect.bottom - containerRect.top

          const childPoints = childElements.map((childElement) => {
            const childRect = childElement.getBoundingClientRect()
            return {
              x: childRect.left - containerRect.left + childRect.width / 2,
              top: childRect.top - containerRect.top
            }
          })

          if (childPoints.length === 1) {
            lines.push({
              x1: parentX,
              y1: parentBottom,
              x2: childPoints[0].x,
              y2: childPoints[0].top
            })
            continue
          }

          const minChildTop = Math.min(...childPoints.map((point) => point.top))
          const railY = Math.max(parentBottom + 24, minChildTop - 24)
          const minChildX = Math.min(...childPoints.map((point) => point.x))
          const maxChildX = Math.max(...childPoints.map((point) => point.x))
          const groupCenterX = (minChildX + maxChildX) / 2

          if (Math.abs(groupCenterX - parentX) <= 4) {
            lines.push({
              x1: parentX,
              y1: parentBottom,
              x2: parentX,
              y2: railY
            })
          } else {
            const elbowY = parentBottom + Math.max(18, (railY - parentBottom) / 2)

            lines.push({
              x1: parentX,
              y1: parentBottom,
              x2: parentX,
              y2: elbowY
            })
            lines.push({
              x1: parentX,
              y1: elbowY,
              x2: groupCenterX,
              y2: elbowY
            })
            lines.push({
              x1: groupCenterX,
              y1: elbowY,
              x2: groupCenterX,
              y2: railY
            })
          }

          lines.push({
            x1: minChildX,
            y1: railY,
            x2: maxChildX,
            y2: railY
          })

          for (const childPoint of childPoints) {
            lines.push({
              x1: childPoint.x,
              y1: railY,
              x2: childPoint.x,
              y2: childPoint.top
            })
          }
        }
      }

      setOverlaySize({
        width: container.scrollWidth,
        height: container.scrollHeight
      })
      setConnectorLines(lines)
    }

    const scheduleUpdate = () => {
      if (frame) cancelAnimationFrame(frame)
      frame = requestAnimationFrame(updateLines)
    }

    scheduleUpdate()

    const resizeObserver = new ResizeObserver(scheduleUpdate)
    resizeObserver.observe(container)

    for (const element of Object.values(cardRefs.current)) {
      if (element) resizeObserver.observe(element)
    }

    window.addEventListener('resize', scheduleUpdate)

    return () => {
      if (frame) cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      window.removeEventListener('resize', scheduleUpdate)
    }
  }, [generationRows, collapsedIds, visibleIds])

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f8fafc,#e2e8f0_45%,#cbd5e1)] text-slate-900">
      <section className="mx-auto max-w-7xl px-5 py-8">
        <header className="mb-8 flex flex-col justify-between gap-5 rounded-3xl border border-white/70 bg-white/70 p-6 shadow-sm backdrop-blur md:flex-row md:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
              <Users className="h-3.5 w-3.5" />
              JSON-powered family tree
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
              {familyData.familyName}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
              Signed in as <span className="font-semibold">{user.email}</span>. This is the temporary
              protected version while the data still lives in the frontend.
            </p>
          </div>

          <div className="flex flex-col items-stretch gap-3 md:items-end">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="text-2xl font-black">{totalPeople}</p>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">People</p>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="text-2xl font-black">{totalGenerations}</p>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Generations</p>
              </div>
            </div>

            <Button
              variant="outline"
              className="rounded-2xl bg-white"
              onClick={() => {
                void supabaseClient?.auth.signOut()
              }}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </header>

        <div className="mb-6 flex flex-col gap-3 rounded-3xl border border-white/70 bg-white/70 p-4 shadow-sm backdrop-blur md:flex-row md:items-center md:justify-between">
          <label className="relative block w-full md:max-w-md">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search family member..."
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-200"
            />
          </label>

          <div className="flex gap-2">
            <Button variant="outline" className="rounded-2xl bg-white" onClick={() => setCollapsedIds([])}>
              Expand all
            </Button>
            <Button
              variant="outline"
              className="rounded-2xl bg-white"
              onClick={() => setCollapsedIds(familyData.people.map((person) => person.id))}
            >
              Collapse all
            </Button>
          </div>
        </div>
      </section>

      <section className="px-5 pb-8">
        <div className="overflow-auto rounded-3xl border border-white/70 bg-white/60 p-6 shadow-sm backdrop-blur md:px-8 md:py-10">
          <div ref={treeContentRef} className="relative min-w-max space-y-10 pb-6">
            <svg
              className="pointer-events-none absolute inset-0 z-0 overflow-visible"
              width={overlaySize.width}
              height={overlaySize.height}
              viewBox={`0 0 ${overlaySize.width} ${overlaySize.height}`}
              aria-hidden="true"
            >
              {connectorLines.map((line, index) => (
                <line
                  key={`${line.x1}-${line.y1}-${line.x2}-${line.y2}-${index}`}
                  x1={line.x1}
                  y1={line.y1}
                  x2={line.x2}
                  y2={line.y2}
                  stroke="#94a3b8"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              ))}
            </svg>

            {generationRows.map((row) => (
              <div key={row.depth} className="relative z-10">
                <div className="flex flex-wrap items-start justify-center gap-8">
                  {row.people.map((person) => {
                    const hasChildren = person.childIds.length > 0
                    const isCollapsed = collapsedIds.includes(person.id)
                    const matchesSearch = query && person.name.toLowerCase().includes(query.toLowerCase())

                    return (
                      <div
                        key={person.id}
                        className="relative"
                        ref={(element) => {
                          cardRefs.current[person.id] = element
                        }}
                      >
                        <div className="relative">
                          {hasChildren ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() =>
                                setCollapsedIds((current) =>
                                  current.includes(person.id)
                                    ? current.filter((id) => id !== person.id)
                                    : [...current, person.id]
                                )
                              }
                              className="absolute -left-12 top-4 h-9 w-9 rounded-xl bg-white"
                              aria-label={isCollapsed ? 'Expand branch' : 'Collapse branch'}
                            >
                              {isCollapsed ? (
                                <ChevronRight className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          ) : null}
                          <PersonCard
                            person={person}
                            peopleById={peopleById}
                            isHighlighted={Boolean(matchesSearch)}
                            onSelect={setSelectedPerson}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <DetailsPanel person={selectedPerson} peopleById={peopleById} onClose={() => setSelectedPerson(null)} />
    </main>
  )
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    const supabaseClient = supabase
    let active = true

    const bootstrap = async () => {
      const {
        data: { session: initialSession }
      } = await supabaseClient.auth.getSession()

      if (!active) return

      if (initialSession?.user && !isAllowedUser(initialSession.user)) {
        await supabaseClient.auth.signOut()
        if (active) {
          setSession(null)
          setAuthError('This account is not on the approved family access list.')
        }
      } else {
        setSession(initialSession)
      }

      setLoading(false)
    }

    void bootstrap()

    const {
      data: { subscription }
    } = supabaseClient.auth.onAuthStateChange((_event, nextSession) => {
      const nextUser = nextSession?.user ?? null

      if (nextUser && !isAllowedUser(nextUser)) {
        setAuthError('This account is not on the approved family access list.')
        setSession(null)
        setTimeout(() => {
          void supabaseClient.auth.signOut()
        }, 0)
        return
      }

      setAuthError('')
      setSession(nextSession)
      setLoading(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,#f8fafc,#e2e8f0_45%,#cbd5e1)] text-slate-900">
        <div className="rounded-2xl bg-white/80 px-6 py-4 text-sm font-medium shadow-sm">Loading access...</div>
      </main>
    )
  }

  if (!session?.user) {
    return (
      <>
        <AuthGate onAuthorized={() => setAuthError('')} />
        {authError ? (
          <div className="fixed inset-x-0 bottom-5 z-30 mx-auto w-[min(92vw,32rem)] rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-lg">
            {authError}
          </div>
        ) : null}
      </>
    )
  }

  return <FamilyTreeApp user={session.user} />
}
