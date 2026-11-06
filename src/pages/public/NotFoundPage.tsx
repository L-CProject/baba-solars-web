import { useSeo } from '@/hooks/useSeo'
import { LinkButton } from '@/components/ui'

export default function NotFoundPage() {
  useSeo({ title: 'Page not found', noIndex: true })
  return (
    <section className="container-site grid min-h-[60vh] place-items-center py-20 text-center">
      <div>
        <p className="font-display text-7xl text-ice-300">404</p>
        <h1 className="mt-4 text-3xl">This page doesn't exist</h1>
        <p className="mt-3 text-muted">The link may be old, or the page has moved.</p>
        <div className="mt-7 flex justify-center gap-3">
          <LinkButton to="/">Go to home</LinkButton>
          <LinkButton to="/contact" variant="secondary">Contact us</LinkButton>
        </div>
      </div>
    </section>
  )
}
