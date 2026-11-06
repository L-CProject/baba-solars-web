import { StringListEditor } from './ListEditor'

/** String list editor bound to plain state (not a draft path). */
export function DraftStringListPlain({ label, value, onChange, noun, max = 20, hint }: { label: string; value: string[]; onChange: (v: string[]) => void; noun: string; max?: number; hint?: string }) {
  return <StringListEditor label={label} noun={noun} hint={hint} max={max} value={value} onChange={onChange} errors={{}} />
}
