import { useEffect } from 'react'

type Props = {
  title: string
  description: string
  image?: string
  noindex?: boolean
}

const upsert = (selector: string, create: () => HTMLElement, apply: (el: HTMLElement) => void) => {
  let el = document.head.querySelector<HTMLElement>(selector)
  if (!el) {
    el = create()
    document.head.appendChild(el)
  }
  apply(el)
}

const setMeta = (key: string, content: string, attr: 'name' | 'property' = 'name') => {
  upsert(`meta[${attr}="${key}"]`, () => {
    const meta = document.createElement('meta')
    meta.setAttribute(attr, key)
    return meta
  }, el => el.setAttribute('content', content))
}

export default function PageMeta({ title, description, image = '/og-image.jpg', noindex = false }: Props) {
  useEffect(() => {
    document.title = title
    setMeta('description', description)
    setMeta('og:title', title, 'property')
    setMeta('og:description', description, 'property')
    setMeta('og:type', 'website', 'property')
    setMeta('og:url', window.location.href, 'property')
    setMeta('og:image', new URL(image, window.location.origin).href, 'property')
    setMeta('twitter:card', 'summary_large_image')
    setMeta('twitter:title', title)
    setMeta('twitter:description', description)
    setMeta('twitter:image', new URL(image, window.location.origin).href)
    setMeta('robots', noindex ? 'noindex, nofollow' : 'index, follow')

    upsert('link[rel="canonical"]', () => {
      const link = document.createElement('link')
      link.rel = 'canonical'
      return link
    }, el => el.setAttribute('href', window.location.href))
  }, [title, description, image, noindex])

  return null
}
