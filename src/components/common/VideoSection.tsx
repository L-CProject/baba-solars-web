import { useState } from 'react'
import { Play } from 'lucide-react'
import { LinkButton } from '@/components/ui'
import { SmartImage } from './SmartImage'

/** Extract a YouTube video id from watch, share, shorts or embed links. */
export function youTubeId(url: string): string | null {
  const m = url.trim().match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/)
  return m ? m[1] : null
}

/**
 * "Watch our recent installation" section. Loads YouTube only after a tap
 * (faster page, no third-party cookies until needed). Without a video URL it
 * shows a photo and a link to the gallery.
 */
export function VideoSection({ videoUrl, poster }: { videoUrl: string; poster: string }) {
  const id = youTubeId(videoUrl)
  const [playing, setPlaying] = useState(false)

  return (
    <div className="relative aspect-video overflow-hidden rounded-panel bg-navy-800 shadow-lift">
      {id && playing ? (
        <iframe
          className="absolute inset-0 size-full"
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
          title="Baba Solars installation video"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      ) : (
        <>
          <SmartImage src={id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : poster} alt="" className="absolute inset-0 size-full" />
          <div className="absolute inset-0 bg-navy-900/45" aria-hidden />
          <div className="absolute inset-0 grid place-items-center p-6 text-center">
            {id ? (
              <button
                onClick={() => setPlaying(true)}
                className="group grid size-20 place-items-center rounded-full bg-sun-400 text-navy-900 shadow-lift transition-transform hover:scale-105 md:size-24"
                aria-label="Play installation video"
              >
                <Play className="ml-1 size-8 fill-current" />
              </button>
            ) : (
              <div>
                <p className="mx-auto max-w-sm text-lg text-snow-50">See photos from our recent roof installations.</p>
                <LinkButton to="/gallery" variant="accent" className="mt-4">Open the gallery</LinkButton>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
