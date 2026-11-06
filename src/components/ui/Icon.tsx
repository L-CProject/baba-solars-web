import {
  Award, BatteryCharging, CalendarCheck, Drone, Sparkles, Headset, Users, Building2, ClipboardCheck, Droplets, Factory, FileText, Gauge, House, Leaf, PlugZap, ShieldCheck, Sun, Wrench, Zap,
  type LucideIcon,
} from 'lucide-react'
import type { IconName } from '@/types'

/** Maps serialisable icon names (stored in mock data / DB) to components. */
export const ICONS: Record<IconName, LucideIcon> = {
  sun: Sun, home: House, building: Building2, factory: Factory, battery: BatteryCharging, droplets: Droplets,
  wrench: Wrench, shield: ShieldCheck, clipboard: ClipboardCheck, gauge: Gauge, plug: PlugZap, leaf: Leaf, file: FileText, zap: Zap, award: Award, users: Users, headset: Headset,
  drone: Drone, calendar: CalendarCheck, sparkles: Sparkles,
}

export const ICON_OPTIONS = (Object.keys(ICONS) as IconName[]).map((k) => ({ value: k, label: k }))

export function Icon({ name, className }: { name: IconName; className?: string }) {
  const Cmp = ICONS[name] ?? Sun
  return <Cmp className={className} aria-hidden />
}

export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.6-.92-2.2-.24-.58-.48-.5-.67-.5h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.08.15.2 2.1 3.2 5.08 4.48.71.31 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.5h-.01a9.4 9.4 0 0 1-4.8-1.31l-.34-.2-3.56.93.95-3.47-.22-.36a9.4 9.4 0 0 1-1.44-5.01c0-5.2 4.23-9.43 9.44-9.43a9.38 9.38 0 0 1 9.42 9.44c0 5.2-4.23 9.42-9.44 9.42m8.03-17.45A11.3 11.3 0 0 0 12.05.72C5.79.72.7 5.8.7 12.07c0 2 .52 3.95 1.52 5.67L.6 23.62l6.01-1.58a11.3 11.3 0 0 0 5.43 1.38h.01c6.26 0 11.35-5.09 11.35-11.35 0-3.03-1.18-5.88-3.32-8.02" />
    </svg>
  )
}
