'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { House, Barbell, ForkKnife, ChartLineUp, Notebook, GearSix, DotsThree, ClockCounterClockwise } from '@phosphor-icons/react'

const links = [
  { href: '/today', label: 'Today', icon: House },
  { href: '/workouts', label: 'Workout', icon: Barbell },
  { href: '/nutrition', label: 'Nutrition', icon: ForkKnife },
  { href: '/progress', label: 'Progress', icon: ChartLineUp },
  { href: '/journal', label: 'Journal', icon: Notebook },
  { href: '/settings', label: 'Settings', icon: GearSix },
]

const moreLinks = [
  { href: '/workouts#history', label: 'History', icon: ClockCounterClockwise },
  { href: '/journal', label: 'Journal', icon: Notebook },
  { href: '/workouts/routine', label: 'Routine', icon: Barbell },
  { href: '/settings', label: 'Settings', icon: GearSix },
]

export function Nav({ mobile = false, activePath }: { mobile?: boolean; activePath?: string }) {
  const route = usePathname()
  const pathname = activePath ?? route
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const moreRef = useRef<HTMLButtonElement>(null)
  const firstRef = useRef<HTMLAnchorElement>(null)
  const moreActive = pathname.startsWith('/journal') || pathname.startsWith('/settings') || pathname.startsWith('/workouts/routine')

  useEffect(() => {
    if (!open) return
    firstRef.current?.focus()
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') { setOpen(false); moreRef.current?.focus() }
    }
    function closeOutside(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', closeOnEscape)
    document.addEventListener('pointerdown', closeOutside)
    return () => { document.removeEventListener('keydown', closeOnEscape); document.removeEventListener('pointerdown', closeOutside) }
  }, [open])

  if (!mobile) return <nav aria-label="Main navigation">{links.map(({ href, label, icon: Icon }) => <Link className={`nav-link ${pathname.startsWith(href) ? 'active' : ''}`} href={href} key={href} aria-current={pathname.startsWith(href) ? 'page' : undefined}><Icon size={20} weight={pathname.startsWith(href) ? 'fill' : 'regular'} /><span>{label}</span></Link>)}</nav>

  return <div ref={rootRef}>
    <nav aria-label="Main navigation" className="bottom-nav">
      {links.slice(0, 4).map(({ href, label, icon: Icon }) => {
        const selected = pathname.startsWith(href) && !(href === '/workouts' && pathname.startsWith('/workouts/routine'))
        return <Link className={`nav-link ${selected ? 'active' : ''}`} href={href} key={href} aria-current={selected ? 'page' : undefined} onClick={() => setOpen(false)}><Icon size={23} weight={selected ? 'fill' : 'regular'} /><span>{label}</span></Link>
      })}
      <button ref={moreRef} className={`nav-link more-trigger ${moreActive || open ? 'active' : ''}`} type="button" aria-expanded={open} aria-controls="mobile-more" onClick={() => setOpen(value => !value)}><DotsThree size={23} weight={moreActive || open ? 'bold' : 'regular'} /><span>More</span></button>
    </nav>
    {open && <nav id="mobile-more" className="mobile-more" aria-label="More navigation">
      {moreLinks.map(({ href, label, icon: Icon }, index) => <Link ref={index === 0 ? firstRef : undefined} key={label} href={href} onClick={() => setOpen(false)}><Icon size={20} /><span>{label}</span></Link>)}
    </nav>}
  </div>
}
