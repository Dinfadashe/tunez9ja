// src/lib/paystack.js
// Loads Paystack's checkout script only when a payment screen needs it,
// instead of on every page (it used to delay the whole app's first render).

const SRC = 'https://js.paystack.co/v1/inline.js'
let loading = null

export function loadPaystack() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'))
  if (window.PaystackPop) return Promise.resolve(window.PaystackPop)
  if (loading) return loading
  loading = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = SRC
    s.async = true
    s.onload = () => (window.PaystackPop ? resolve(window.PaystackPop) : reject(new Error('Paystack failed to initialise')))
    s.onerror = () => { loading = null; s.remove(); reject(new Error('Could not load Paystack')) }
    document.head.appendChild(s)
  })
  return loading
}
