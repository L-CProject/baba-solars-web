import { ApiError } from '@/services/errors'

/** Image types the admin upload box accepts (the server checks the bytes again). */
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp'
/** Largest original photo accepted in the browser (it is resized before upload; the server limit applies to the result). */
export const IMAGE_MAX_SOURCE_MB = 10

/** Why a chosen file cannot be uploaded ('' = fine). Checks type, extension, emptiness and size. */
export function imageFileProblem(file: File): string {
  const typeOk = (IMAGE_TYPES as readonly string[]).includes(file.type.toLowerCase())
  const extOk = /\.(jpe?g|png|webp)$/i.test(file.name)
  if (!typeOk || !extOk) return 'This file type is not supported. Choose a JPG, JPEG, PNG or WebP image.'
  if (file.size === 0) return 'This file is empty. Choose another image.'
  if (file.size > IMAGE_MAX_SOURCE_MB * 1024 * 1024) return `This image is ${(file.size / 1024 / 1024).toFixed(1)} MB. Images must be ${IMAGE_MAX_SOURCE_MB} MB or smaller.`
  return ''
}

/**
 * Downscale + re-encode an image in the browser before upload (WebP where supported, else JPEG;
 * small PNGs stay PNG to keep logo transparency). Keeps uploads small on slow mobile connections.
 */
export async function compressImage(file: File, maxSize = 1600): Promise<Blob> {
  const problem = imageFileProblem(file)
  if (problem) throw new ApiError(problem, { code: file.size > IMAGE_MAX_SOURCE_MB * 1024 * 1024 ? 'payload_too_large' : 'validation' })
  const bitmap = await createImageBitmap(file).catch(() => null)
  if (!bitmap) throw new ApiError('This file is not a readable image.', { code: 'validation' })
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close?.()
  const toBlob = (type: string, q: number) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, q))
  const webp = await toBlob('image/webp', 0.8)
  if (webp && webp.type === 'image/webp') return webp
  const keepPng = file.type === 'image/png' && canvas.width * canvas.height <= 800 * 800
  const out = await toBlob(keepPng ? 'image/png' : 'image/jpeg', 0.82)
  if (!out) throw new ApiError('This image could not be processed.', { code: 'validation' })
  return out
}
