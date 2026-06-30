import React, { useState } from 'react'
import { Lock, Eye, Database, Trash2, Mail, ChevronDown, ChevronUp, Shield, AlertTriangle } from 'lucide-react'

const SECTIONS = [
  {
    id: 'overview',
    title: '1. Overview',
    content: `Tunez9ja Entertainment ("we", "us", "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, store, and protect your personal information when you use our platform, including the website, mobile-installable app (PWA), TUNEZ token wallet, and payment features.

By using Tunez9ja, you agree to the collection and use of information in accordance with this policy. This policy applies to all users including visitors, listeners, artists, bloggers, editors, and admins.

This policy is written to be accurate to what the Platform actually does at the time of publication. If a feature changes how we handle data, we will update this page and the "Last Updated" date.

If you have questions about this policy, contact us at privacy@tunez9ja.com.`
  },
  {
    id: 'data-collected',
    title: '2. Data We Collect',
    content: `ACCOUNT INFORMATION (when you register):
• Full name or stage name
• Email address
• Password (hashed — we never store or see your plain-text password)
• Role (user, artist, blogger, or editor)
• Bio, genre, and other optional profile details
• Profile photo, if uploaded

CONTENT YOU CREATE OR UPLOAD:
• Music tracks and associated metadata (title, genre, duration, description, tags)
• Cover artwork and video thumbnails
• Blog posts including title, content, category, and tags
• Comments and reactions you post on other users' content
• Playlists you create

SOCIAL / RELATIONSHIP DATA:
• Who you follow and who follows you
• Referral relationships (who referred you, who you referred) if you used a referral link
• Notification history (e.g. "X followed you", "Your track was approved")

FINANCIAL / TRANSACTIONAL DATA:
• TUNEZ token balance and full transaction history (earned, spent, purchased)
• Records of TUNEZ purchases made via Paystack, including the amount paid and the Paystack transaction reference
• We do NOT store your card number, CVV, or full payment card details — these are entered directly into Paystack's own secure payment page and never touch our servers. We only receive a transaction reference and status (success/failure) from Paystack.

IDENTITY VERIFICATION DATA (artists and bloggers seeking the verified badge only):
• Legal name
• A photo or scan of a government-issued ID document
• Social media links submitted as part of the verification application
This category of data is sensitive personal information. See Section 4 for how it is specifically protected.

USAGE DATA (automatically collected):
• Play counts on your music tracks, view counts on your blog posts and videos
• Login timestamps and session activity
• Pages visited within the Platform

DEVICE INFORMATION:
• Browser type and version
• Operating system
• IP address (used for security and fraud prevention; not published or sold)

We do NOT collect:
• Your card number, expiry date, or CVV (handled entirely by Paystack)
• National Identification Number (NIN) or Bank Verification Number (BVN), unless a future feature explicitly requests this with your separate consent
• Precise GPS location`
  },
  {
    id: 'how-we-use',
    title: '3. How We Use Your Data',
    content: `We use your data to:

OPERATE THE PLATFORM:
• Create and manage your account
• Display your music, videos, and blog content to the public once approved
• Process content review and approval workflows
• Process TUNEZ purchases, earnings, and spending
• Maintain the follower/following relationships you create
• Send notifications about content status, new followers, and TUNEZ activity

VERIFY IDENTITY (artists and bloggers applying for the verified badge):
• Confirm the legal name and identity document match the applicant
• Prevent impersonation of real artists or public figures
• Comply with our internal anti-fraud review process

IMPROVE THE PLATFORM:
• Analyse which content is popular (play counts, views) in aggregate
• Identify and fix technical issues
• Develop new features based on usage patterns

SECURITY:
• Detect and prevent fraudulent activity, including payment fraud
• Enforce our Terms of Service
• Protect against unauthorized access

COMMUNICATION:
• Notify you when your content is reviewed or your verification status changes
• Send important platform updates
• Respond to your support requests

We do NOT use your data to:
• Sell it to third-party advertisers or data brokers
• Build advertising profiles for use outside the Platform
• Send unsolicited marketing emails`
  },
  {
    id: 'storage-security',
    title: '4. Data Storage & Security',
    content: `WHERE YOUR DATA IS STORED:
All data is stored using Supabase, a cloud database and storage platform. Payment processing is handled by Paystack, a CBN-licensed Nigerian payment service provider — we never see or store your card details.

HOW WE PROTECT IT:
• All data is encrypted in transit using HTTPS/TLS
• Database access is protected by Row Level Security (RLS) — users can only see their own private data
• Passwords are hashed and never stored in plain text
• API keys and secrets are never exposed to the client/browser
• Admin access to the database requires authentication and role verification

IDENTITY VERIFICATION DOCUMENTS — EXTRA PROTECTION:
Government ID documents submitted for artist/blogger verification are stored in a PRIVATE storage bucket, not a publicly accessible one. They can only be viewed via a temporary, time-limited link (valid for 5 minutes) generated at the moment you or an authorized admin requests to view it. These links are never stored, logged, or shared. Only you and platform admins reviewing your application can access your ID document — it is never public and never indexed by search engines.

HOW LONG WE KEEP IT:
• Active account data: retained as long as your account exists
• Deleted account data: purged within 30 days of account deletion
• Identity verification documents: deleted within 90 days of either approval or rejection of your verification application, whichever comes first
• Usage logs (play counts, views): retained for 12 months
• Financial/transaction records: retained for 6 years where required for tax, audit, or dispute-resolution purposes under Nigerian law
• Admin action logs: retained for 24 months for compliance

BREACH NOTIFICATION:
In the event of a data breach that affects your personal information, we will notify affected users by email and will notify the Nigeria Data Protection Commission (NDPC) where required, within the timeframes set out in the Nigeria Data Protection Act 2023.`
  },
  {
    id: 'sharing',
    title: '5. Data Sharing',
    content: `We do not sell, trade, or rent your personal information to anyone.

WHO WE SHARE DATA WITH:
• Supabase — database and file storage hosting
• Netlify — website hosting and content delivery
• Paystack — payment processing for TUNEZ purchases (Paystack receives only what is needed to process your payment: your email, the amount, and a transaction reference)
These providers are contractually bound to protect your data and only process it on our instructions.

We may also share data:
• When required by Nigerian law, a valid court order, or a lawful request from a regulator such as the NDPC
• To protect the rights, property, or safety of Tunez9ja, our users, or the public
• In connection with a merger, acquisition, or sale of assets, with notice to affected users

PUBLIC INFORMATION:
The following is visible publicly to anyone using the Platform:
• Your name/stage name, profile photo, bio, genre, and role
• Your approved music, videos, and blog posts
• Your play counts and view counts
• Your follower and following counts, and the public list of who follows you / who you follow
• Whether you hold the verified badge

NEVER PUBLIC:
• Your email address, password, IP address, account settings
• Your TUNEZ transaction history or balance (visible only to you)
• Your identity verification documents and legal name submitted for verification (visible only to you and reviewing admins)`
  },
  {
    id: 'your-rights',
    title: '6. Your Rights',
    content: `Under the Nigeria Data Protection Act 2023 and this policy, you have the following rights:

ACCESS:
You may request a full export of all personal data we hold about you. Email privacy@tunez9ja.com with subject "Data Access Request".

CORRECTION:
You can update your name, bio, genre, and profile photo directly in your Profile settings at any time.

DELETION:
You may request deletion of your account and all associated personal data. Email privacy@tunez9ja.com with subject "Account Deletion Request". We will process your request within 30 days. Note: approved public content (tracks, posts, videos) may remain visible for up to 7 days after deletion while caches clear, and financial transaction records may be retained longer where Nigerian tax/audit law requires it (see Section 4).

OBJECTION & RESTRICTION:
You may object to certain uses of your data, or ask us to restrict processing while a dispute is resolved. Contact us and we will review your request.

PORTABILITY:
You may request a machine-readable copy of your data in JSON or CSV format.

WITHDRAW CONSENT:
Where we rely on your consent (for example, the optional follow/social features), you may withdraw that consent at any time without affecting the lawfulness of processing carried out before withdrawal.

To exercise any of these rights, contact: privacy@tunez9ja.com. We aim to respond within 5 business days and resolve requests within 30 days as required by law.`
  },
  {
    id: 'cookies',
    title: '7. Cookies & Local Storage',
    content: `Tunez9ja uses minimal cookies and browser storage:

WHAT WE USE:
• Authentication session token (required for login — expires when you sign out)
• User preferences such as theme (dark/light mode), stored in browser local storage
• A referral code, temporarily stored in your browser if you arrived via a referral link, so the right person is credited when you sign up

WHAT WE DO NOT USE:
• Third-party advertising cookies
• Cross-site tracking cookies
• Any analytics or tracking service not disclosed in this policy

You can clear cookies and local storage at any time through your browser settings. Clearing them will sign you out of the Platform and may remove saved preferences.`
  },
  {
    id: 'children',
    title: '8. Children\'s Privacy',
    content: `Tunez9ja Entertainment is not directed to children under the age of 13, and our Terms of Service require users to be at least 13 years old to create an account. We do not knowingly collect personal information from children under 13.

If you are a parent or guardian and believe your child under 13 has provided us with personal information, please contact us at privacy@tunez9ja.com and we will investigate and delete the information promptly.

Users between the ages of 13 and 18 should review this policy with a parent or guardian before using the Platform, particularly before making any TUNEZ purchase.`
  },
  {
    id: 'changes',
    title: '9. Changes to This Policy',
    content: `We may update this Privacy Policy from time to time as the Platform changes. When we make significant changes, we will:
• Update the "Last Updated" date at the top of this page
• Send a notification to all registered users via email or in-app notification
• Display a notice on the Platform for 30 days

Your continued use of the Platform after changes are posted constitutes acceptance of the updated policy.

If you do not agree with the updated policy, you may delete your account by contacting privacy@tunez9ja.com.`
  },
  {
    id: 'contact-privacy',
    title: '10. Contact Us',
    content: `For any privacy-related questions, requests, or concerns:

Privacy Officer
Tunez9ja Entertainment / Web3.0 Alliance Ltd
Email: privacy@tunez9ja.com
Response time: Within 5 business days

For DMCA / copyright notices: dmca@tunez9ja.com
For general inquiries: info@tunez9ja.com

Last Updated: June 2026
Effective Date: January 2021`
  },
]

export default function PrivacyPage() {
  const [openSections, setOpenSections] = useState(['overview'])

  const toggle = (id) => {
    setOpenSections(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  return (
    <div style={{ minHeight: '80vh' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(180deg, #0a0f1a 0%, var(--bg-deep) 100%)', padding: '60px 0 40px', borderBottom: '1px solid var(--border)' }}>
        <div className="container" style={{ maxWidth: 860 }}>
          <div className="section-label"><Lock size={12} style={{ display: 'inline', marginRight: 6 }} />Legal</div>
          <h1 className="page-title">Privacy Policy</h1>
          <p style={{ color: 'var(--grey-300)', marginTop: 12, fontSize: 15 }}>
            Last updated June 2026 · We respect your data and your privacy.
          </p>
          <a href="mailto:privacy@tunez9ja.com" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--red)', marginTop: 16 }}>
            <Mail size={14} /> privacy@tunez9ja.com
          </a>
        </div>
      </div>

      <div className="container section" style={{ maxWidth: 860 }}>
        {/* Quick summary */}
        <div className="grid-3" style={{ marginBottom: 40 }}>
          {[
            { icon: <Eye size={20} color="var(--red)" />,      title: 'No ad tracking',      desc: 'We never track you for advertising purposes.' },
            { icon: <Database size={20} color="#7b4fff" />,    title: 'Secure storage',       desc: 'Data encrypted with row-level security; ID documents are private and only accessible via short-lived signed links.' },
            { icon: <Trash2 size={20} color="#00c864" />,      title: 'Right to delete',      desc: 'Request full account and data deletion anytime.' },
          ].map(item => (
            <div key={item.title} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
              <div style={{ marginBottom: 10 }}>{item.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{item.title}</div>
              <div style={{ fontSize: 13, color: 'var(--grey-300)' }}>{item.desc}</div>
            </div>
          ))}
        </div>

        {/* Not legal advice note */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: 'rgba(255,180,0,0.08)', border: '1px solid rgba(255,180,0,0.25)', borderRadius: 10, padding: 16, marginBottom: 32 }}>
          <AlertTriangle size={18} color="#ffb400" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 12.5, color: 'var(--grey-300)', lineHeight: 1.7 }}>
            This policy describes our actual data practices to the best of our knowledge. It does not constitute legal advice to you, and Tunez9ja Entertainment / Web3.0 Alliance Ltd reviews this policy periodically with qualified counsel to ensure ongoing compliance with the Nigeria Data Protection Act 2023.
          </p>
        </div>

        {/* Expand/collapse */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <button className="btn btn-ghost" onClick={() => setOpenSections(SECTIONS.map(s => s.id))} style={{ fontSize: 13 }}>Expand all</button>
          <button className="btn btn-ghost" onClick={() => setOpenSections([])} style={{ fontSize: 13 }}>Collapse all</button>
        </div>

        {/* Accordion */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SECTIONS.map(section => {
            const isOpen = openSections.includes(section.id)
            return (
              <div key={section.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                <button
                  onClick={() => toggle(section.id)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', background: 'none', border: 'none', color: 'var(--white)', cursor: 'pointer', textAlign: 'left', gap: 12 }}
                >
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{section.title}</span>
                  {isOpen ? <ChevronUp size={18} color="var(--grey-500)" /> : <ChevronDown size={18} color="var(--grey-500)" />}
                </button>
                {isOpen && (
                  <div style={{ padding: '0 24px 24px', fontSize: 14, color: 'var(--grey-300)', lineHeight: 1.9, whiteSpace: 'pre-line' }}>
                    {section.content}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Contact box */}
        <div style={{ background: 'rgba(123,79,255,0.08)', border: '1px solid rgba(123,79,255,0.25)', borderRadius: 12, padding: 28, marginTop: 40, display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          <Shield size={28} color="#7b4fff" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 24, marginBottom: 8 }}>Your Data, Your Rights</h3>
            <p style={{ color: 'var(--grey-300)', fontSize: 14, lineHeight: 1.7, marginBottom: 16 }}>
              Request access to, correction of, or deletion of your personal data at any time. We respond to all privacy requests within 5 business days.
            </p>
            <a href="mailto:privacy@tunez9ja.com" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Mail size={15} /> privacy@tunez9ja.com
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
