import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ChevronRight } from 'lucide-react'
import { img } from '@/data/media'
import { SmartImage } from './SmartImage'
import { SolarParticles } from './SolarParticles'

interface PageHeroProps {
  title: string
  intro?: ReactNode
  /** Breadcrumb label; defaults to the title */
  crumb?: string
  image?: string
  children?: ReactNode
}

/** Photo banner with breadcrumb used at the top of every inner page. */
export function PageHero({ title, intro, crumb, image = img('roofRows', 2000), children }: PageHeroProps) {
  return (
    <section className="relative isolate overflow-hidden bg-navy-900">
      <SmartImage src={image} alt="" priority className="absolute inset-0 -z-10 size-full" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-navy-900/90 via-navy-900/70 to-navy-900/40" aria-hidden />
      <SolarParticles rays />
      <div className="container-site relative py-16 md:py-24">
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5 text-sm text-snow-300">
            <li><Link to="/" className="hover:text-sun-300">Home</Link></li>
            <li aria-hidden><ChevronRight className="size-3.5" /></li>
            <li aria-current="page" className="text-snow-50">{crumb ?? title}</li>
          </ol>
        </nav>
        <h1 className="mt-4 max-w-3xl text-4xl text-snow-50 md:text-[3.3rem]">{title}</h1>
        {intro && <p className="mt-4 max-w-2xl text-lg leading-relaxed text-snow-200">{intro}</p>}
        {children && <div className="mt-7">{children}</div>}
      </div>
    </section>
  )
}
