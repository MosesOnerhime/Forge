import { notFound } from 'next/navigation'
import { Nav } from '@/components/nav'
import { RoutineTemplatePreview } from '@/components/routine-template-preview'

export default function TemplateDesignPreview() {
  if (process.env.NODE_ENV !== 'development') notFound()
  return <div className="shell">
    <aside className="sidebar"><div className="brand">FORGE<span>.</span></div><Nav activePath="/workouts" /></aside>
    <main className="main"><RoutineTemplatePreview /></main>
    <Nav mobile activePath="/workouts" />
  </div>
}
