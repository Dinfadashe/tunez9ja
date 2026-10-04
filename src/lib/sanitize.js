// src/lib/sanitize.js
// Single place where user-written HTML (blog posts, rich-text editor content)
// is cleaned before it touches the DOM. DOMPurify strips scripts, event
// handlers (onerror, onload…), javascript:/data: URLs and other XSS vectors.
import DOMPurify from 'dompurify'

const CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'hr', 'div', 'span', 'blockquote', 'pre', 'code',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'sub', 'sup', 'mark', 'small',
    'ul', 'ol', 'li', 'a', 'img', 'figure', 'figcaption',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'iframe', 'video', 'source',   // embeds — iframes restricted to YouTube below
  ],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'target', 'rel', 'width', 'height', 'style', 'colspan', 'rowspan', 'loading',
    'allow', 'allowfullscreen', 'frameborder', 'controls', 'poster', 'type', 'referrerpolicy'],
  ALLOW_DATA_ATTR: false,
  ADD_ATTR: ['sandbox'],
  ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|\/|#)/i,
}

const YOUTUBE_EMBED = /^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com)\/embed\/[\w-]{11}(\?[\w=&;%-]*)?$/i

let hooked = false
function ensureHooks() {
  if (hooked) return
  hooked = true
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    // Only YouTube embeds may be iframes; anything else is removed entirely
    if (node.tagName === 'IFRAME') {
      const src = node.getAttribute('src') || ''
      if (!YOUTUBE_EMBED.test(src)) { node.remove(); return }
      node.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation allow-popups')
      node.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin')
    }
    if ((node.tagName === 'VIDEO' || node.tagName === 'SOURCE') && node.getAttribute('src')
        && !/^https:\/\//i.test(node.getAttribute('src'))) {
      node.removeAttribute('src')
    }
    // Links open safely in a new tab
    if (node.tagName === 'A' && node.getAttribute('href')) {
      node.setAttribute('target', '_blank')
      node.setAttribute('rel', 'noopener noreferrer nofollow')
    }
    if (node.tagName === 'IMG') node.setAttribute('loading', 'lazy')
    // Strip CSS that can be abused (url(), expression(), position tricks)
    const style = node.getAttribute && node.getAttribute('style')
    if (style && /url\s*\(|expression|javascript:|position\s*:\s*fixed/i.test(style)) {
      node.removeAttribute('style')
    }
  })
}

export function sanitizeHTML(html) {
  if (!html) return ''
  ensureHooks()
  return DOMPurify.sanitize(String(html), CONFIG)
}

/** Plain-text excerpt from HTML (for cards, previews). */
export function htmlToText(html) {
  if (!html) return ''
  const div = document.createElement('div')
  div.innerHTML = sanitizeHTML(html)
  return (div.textContent || '').replace(/\s+/g, ' ').trim()
}

/** Only allow http(s) links — blocks javascript:, data:, vbscript: hrefs. */
export function safeUrl(url) {
  try {
    const u = new URL(String(url || ''), window.location.origin)
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : undefined
  } catch { return undefined }
}
