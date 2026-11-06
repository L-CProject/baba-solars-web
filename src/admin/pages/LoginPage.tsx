import { LoginScreen } from '../components/LoginScreen'

/** Admin panel sign-in (admin, sales and editor accounts). */
export default function LoginPage() {
  return (
    <LoginScreen
      portal="admin"
      isAllowed={(role) => role !== 'owner'}
      copy={{
        seoTitle: 'Admin sign in',
        heading: 'Sign in',
        subheading: 'Admin panel',
        tagline: <>Clean energy,<br /><span className="text-sun-300">managed simply.</span></>,
      }}
    />
  )
}
