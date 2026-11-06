import { LoginScreen } from '@/admin/components/LoginScreen'

/** Owner portal sign-in — a separate page and session from the admin panel. */
export default function OwnerLoginPage() {
  return (
    <LoginScreen
      portal="owner"
      isAllowed={(role) => role === 'owner'}
      copy={{
        seoTitle: 'Owner sign in',
        heading: 'Owner sign in',
        subheading: 'Lead monitoring portal',
        tagline: <>Every lead,<br /><span className="text-sun-300">at a glance.</span></>,
      }}
    />
  )
}
