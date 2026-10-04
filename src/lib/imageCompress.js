// src/lib/imageCompress.js
// Shrinks photos before upload. Phone photos are often 4000px / 3–5MB but are
// shown at 48–1200px; every visitor would download the full file. Smaller
// covers also stay under WhatsApp's ~600KB limit for link-preview images.
//
//  • Scales so the longest side is at most maxDim (keeps aspect ratio)
//  • JPEG/WebP/HEIC-decoded → JPEG; PNG stays PNG (may have transparency)
//  • Animated GIFs and anything the browser can't decode are left as-is
//  • Never returns a file larger than the original

export async function compressImage(file, { maxDim = 1600, quality = 0.85 } = {}) {
  try {
    if (!file || !file.type?.startsWith('image/')) return file
    if (file.type === 'image/gif' || file.type === 'image/svg+xml') return file

    const bitmap = await createBitmap(file)
    const { width: w, height: h } = bitmap
    const scale = Math.min(1, maxDim / Math.max(w, h))
    // Already small enough in both pixels and bytes — keep the original
    if (scale === 1 && file.size <= 400 * 1024) { bitmap.close?.(); return file }

    const canvas = document.createElement('canvas')
    canvas.width = Math.round(w * scale)
    canvas.height = Math.round(h * scale)
    const ctx = canvas.getContext('2d')
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close?.()

    const outType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
    const blob = await new Promise(res => canvas.toBlob(res, outType, quality))
    if (!blob || blob.size >= file.size) return file

    const ext = outType === 'image/png' ? 'png' : 'jpg'
    const name = (file.name || 'image').replace(/\.[^.]+$/, '') + '.' + ext
    return new File([blob], name, { type: outType, lastModified: Date.now() })
  } catch {
    return file   // never block an upload because compression failed
  }
}

// createImageBitmap respects EXIF rotation (so phone photos aren't sideways);
// fall back to an <img> where it isn't available.
async function createBitmap(file) {
  if ('createImageBitmap' in window) {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }) } catch { /* fall through */ }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    await img.decode()
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** File extension that matches a (possibly compressed) file's type. */
export function extFor(file) {
  return ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' })[file?.type]
    || (file?.name?.split('.').pop() || 'jpg').toLowerCase()
}
