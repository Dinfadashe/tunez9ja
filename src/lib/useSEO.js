// ════════════════════════════════════════════════════════════════
// TUNEZ9JA useSEO — dynamic head management without react-helmet
//
// Directly mutates document.title and <meta> tags in <head>.
// No external dependencies, zero bundle cost, works with
// Googlebot's JavaScript rendering (Chromium-based, waits up to
// 5 seconds for JS to run before indexing the final DOM).
//
// Usage:
//   useSEO({
//     title: 'Blaqbonez — Street Sounds | Tunez9ja',
//     description: 'Stream Street Sounds by Blaqbonez on Tunez9ja.',
//     image: 'https://…/cover.jpg',
//     imageWidth: 800, imageHeight: 800,
//     url: 'https://tunez9ja.netlify.app/?track=abc123',
//     type: 'music.song',
//     jsonLd: { '@context': 'https://schema.org', '@type': 'MusicRecording', … },
//   })
// ════════════════════════════════════════════════════════════════

import { useEffect } from 'react'

const BASE_URL = 'https://tunez9ja.netlify.app'
const DEFAULT_IMAGE = `${BASE_URL}/og-default.jpg`
const SITE_NAME = 'Tunez9ja'
const TWITTER_HANDLE = '@Tunez9ja'

function setMeta(property, content, useProperty = false) {
  if (!content) return
  const attr = useProperty ? 'property' : 'name'
  let el = document.querySelector(`meta[${attr}="${property}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, property)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setLink(rel, href) {
  if (!href) return
  let el = document.querySelector(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

function setJsonLd(data) {
  let el = document.querySelector('script[data-tunez-jsonld]')
  if (!el) {
    el = document.createElement('script')
    el.setAttribute('type', 'application/ld+json')
    el.setAttribute('data-tunez-jsonld', '1')
    document.head.appendChild(el)
  }
  el.textContent = JSON.stringify(data)
}

export function useSEO({
  title,
  description,
  image,
  imageWidth = 1200,
  imageHeight = 630,
  url,
  type = 'website',
  jsonLd,
  noindex = false,
} = {}) {
  useEffect(() => {
    const pageTitle = title
      ? (title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`)
      : `${SITE_NAME} — Stream Music. Earn Rewards. Anywhere.`
    const pageDesc = description || 'Stream Afrobeats, Highlife, Street Pop and more. Earn TUNEZ tokens for every stream, read, and reaction. The music platform where everyone gets paid.'
    const pageImage = image || DEFAULT_IMAGE
    const pageUrl = url || window.location.href

    // Basic
    document.title = pageTitle
    setMeta('description', pageDesc)
    setMeta('robots', noindex ? 'noindex, nofollow' : 'index, follow')

    // Canonical
    setLink('canonical', pageUrl)

    // Open Graph
    setMeta('og:title',       pageTitle,  true)
    setMeta('og:description', pageDesc,   true)
    setMeta('og:image',       pageImage,  true)
    setMeta('og:image:width', String(imageWidth),  true)
    setMeta('og:image:height', String(imageHeight), true)
    setMeta('og:image:alt',   pageTitle,  true)
    setMeta('og:url',         pageUrl,    true)
    setMeta('og:type',        type,       true)
    setMeta('og:site_name',   SITE_NAME,  true)
    setMeta('og:locale',      'en_NG',    true)

    // Twitter / X
    setMeta('twitter:card',        'summary_large_image')
    setMeta('twitter:site',        TWITTER_HANDLE)
    setMeta('twitter:title',       pageTitle)
    setMeta('twitter:description', pageDesc)
    setMeta('twitter:image',       pageImage)

    // JSON-LD structured data
    if (jsonLd) {
      setJsonLd(jsonLd)
    }
  }, [title, description, image, url, type, noindex, jsonLd])
}

// ── Pre-built JSON-LD builders for common content types ───────

export const BASE_URL_EXPORT = BASE_URL

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Tunez9ja Entertainment',
    alternateName: 'Tunez9ja',
    url: BASE_URL,
    logo: `${BASE_URL}/logo.png`,
    description: 'Global music streaming and entertainment platform — built in Jos, Nigeria. Stream Afrobeats, Hip-Hop, Highlife and more. Earn TUNEZ tokens, discover new artists.',
    foundingDate: '2021',
    areaServed: { '@type': 'Place', name: 'Worldwide' },
    sameAs: ['https://t.me/Tunez9ja'],
    contactPoint: { '@type': 'ContactPoint', contactType: 'customer service', email: 'info@tunez9ja.com', availableLanguage: 'English' },
  }
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: BASE_URL,
    description: 'Stream Afrobeats, Hip-Hop, Highlife, Amapiano and more. Earn TUNEZ tokens for every stream, comment and reaction. The music platform where everyone gets paid.',
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${BASE_URL}/?page=search&q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  }
}

export function musicTrackJsonLd(track) {
  if (!track) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'MusicRecording',
    name: track.title,
    description: track.description || `Stream ${track.title} on Tunez9ja`,
    image: track.cover_url || `${BASE_URL}/logo.png`,
    duration: track.duration ? `PT${track.duration.replace(':', 'M')}S` : undefined,
    genre: track.genre,
    byArtist: track.profiles?.name ? {
      '@type': 'MusicGroup',
      name: track.profiles.name,
    } : undefined,
    url: `${BASE_URL}/?track=${track.id}`,
    inLanguage: track?.language || 'en',
  }
}

export function blogPostJsonLd(post) {
  if (!post) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt || post.title,
    image: post.cover_url ? [post.cover_url] : [`${BASE_URL}/logo.png`],
    datePublished: post.published_at || post.created_at,
    dateModified: post.updated_at || post.published_at || post.created_at,
    author: post.profiles?.name ? {
      '@type': 'Person',
      name: post.profiles.name,
    } : { '@type': 'Organization', name: SITE_NAME },
    publisher: {
      '@type': 'Organization',
      name: 'Tunez9ja Entertainment',
      logo: { '@type': 'ImageObject', url: `${BASE_URL}/logo.png` },
    },
    url: `${BASE_URL}/?post=${post.id}`,
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${BASE_URL}/?post=${post.id}` },
  }
}

export function breadcrumbJsonLd(items) {
  // items: [{ name, url }, ...]
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  }
}
