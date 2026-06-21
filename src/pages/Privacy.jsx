import React, { useState } from 'react'
import { Lock, Eye, Database, Trash2, Mail, ChevronDown, ChevronUp, Shield } from 'lucide-react'

const SECTIONS = [
  {
    id: 'overview',
    title: '1. Overview',
    content: `Tunez9ja Entertainment ("we", "us", "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, store, and protect your personal information when you use our platform.

By using Tunez9ja, you agree to the collection and use of information in accordance with this policy. This policy applies to all users including visitors, artists, and bloggers.

If you have questions about this policy, contact us at privacy@tunez9ja.com.`
  },
  {
    id: 'data-collected',
    title: '2. Data We Collect',
    content: `ACCOUNT INFORMATION (when you register):
• Full name or stage name
• Email address
• Role (artist or blogger)
• Bio, genre, and other optional profile details
• Encrypted password (we never store plain-text passwords)

CONTENT YOU UPLOAD:
• Music tracks and associated metadata (title, genre, duration, description, tags)
• Cover artwork images
• Blog posts including title, content, category, and tags

USAGE DATA (automatically collected):
• Play counts on your music tracks
• View counts on your blog posts
• Login timestamps
• IP address (hashed for security, not stored in plain text)

DEVICE INFORMATION:
• Browser type and version
• Operating system
• Referring URL

We do NOT collect:
• Payment information (no payments are processed on this platform)
• Social security numbers or national ID numbers
• Precise GPS location`
  },
  {
    id: 'how-we-use',
    title: '3. How We Use Your Data',
    content: `We use your data exclusively to:

OPERATE THE PLATFORM:
• Create and manage your account
• Display your music and blog content to the public
• Process content review and approval workflows
• Send notifications about your content status (approved/rejected)

IMPROVE THE PLATFORM:
• Analyse which content is popular (play counts, views)
• Identify and fix technical issues
• Develop new features based on usage patterns

SECURITY:
• Detect and prevent fraudulent activity
• Enforce our Terms of Service
• Protect against unauthorized access

COMMUNICATION:
• Notify you when your content is reviewed
• Send important platform updates
• Respond to your support requests

We do NOT use your data to:
• Sell to third-party advertisers
• Build advertising profiles
• Send unsolicited marketing emails
• Share with data brokers`
  },
  {
    id: 'storage-security',
    title: '4. Data Storage & Security',
    content: `WHERE YOUR DATA IS STORED:
All data is stored using Supabase, a secure cloud database platform. Your data is stored on servers in the European Union (or the region you selected during platform setup).

HOW WE PROTECT IT:
• All data is encrypted in transit using HTTPS/TLS
• Database access is protected by Row Level Security (RLS) — users can only see their own data
• Passwords are hashed using industry-standard bcrypt encryption
• API keys and secrets are never exposed to the client
• Admin access to the database requires authentication

HOW LONG WE KEEP IT:
• Active account data: retained as long as your account exists
• Deleted account data: purged within 30 days of account deletion
• Usage logs (play counts, views): retained for 12 months
• Admin action logs: retained for 24 months for compliance

BREACH NOTIFICATION:
In the event of a data breach that affects your personal information, we will notify you by email within 72 hours of becoming aware of the breach.`
  },
  {
    id: 'sharing',
    title: '5. Data Sharing',
    content: `We do not sell, trade, or rent your personal information to anyone.

WHEN WE MAY SHARE DATA:
• With service providers who help operate the Platform (e.g. Supabase for database hosting, Netlify for web hosting) — these providers are contractually bound to protect your data
• When required by Nigerian law or a valid court order
• To protect the rights, property, or safety of Tunez9ja, our users, or the public

PUBLIC INFORMATION:
The following information is visible publicly on the Platform:
• Your name/stage name
• Your profile bio and genre
• Your approved music tracks and blog posts
• Your play counts and view counts

Private information (email address, IP address, account settings) is never shown publicly.`
  },
  {
    id: 'your-rights',
    title: '6. Your Rights',
    content: `You have the following rights regarding your personal data:

ACCESS:
You may request a full export of all personal data we hold about you. Email privacy@tunez9ja.com with subject "Data Access Request".

CORRECTION:
You can update your name, bio, and genre directly in your Profile settings at any time.

DELETION:
You may request deletion of your account and all associated data. Email privacy@tunez9ja.com with subject "Account Deletion Request". We will process your request within 30 days. Note: approved content that has been publicly published may remain visible for up to 7 days after deletion while caches clear.

OBJECTION:
You may object to certain uses of your data. Contact us and we will review your request.

PORTABILITY:
You may request a machine-readable copy of your data in JSON or CSV format.

To exercise any of these rights, contact: privacy@tunez9ja.com`
  },
  {
    id: 'cookies',
    title: '7. Cookies & Local Storage',
    content: `Tunez9ja uses minimal cookies and browser storage:

WHAT WE USE:
• Authentication session token (required for login — expires when you sign out)
• User preferences (optional, stored in browser local storage)

WHAT WE DO NOT USE:
• Third-party tracking cookies
• Advertising cookies
• Analytics cookies that track you across other websites
• Google Analytics or Facebook Pixel

You can clear cookies and local storage at any time through your browser settings. Clearing them will sign you out of the Platform.`
  },
  {
    id: 'children',
    title: '8. Children\'s Privacy',
    content: `Tunez9ja Entertainment is not directed to children under the age of 13. We do not knowingly collect personal information from children under 13.

If you are a parent or guardian and believe your child has provided us with personal information, please contact us at privacy@tunez9ja.com and we will delete the information promptly.

Users between the ages of 13 and 18 should review this policy with a parent or guardian before using the Platform.`
  },
  {
    id: 'changes',
    title: '9. Changes to This Policy',
    content: `We may update this Privacy Policy from time to time. When we make significant changes, we will:
• Update the "Last Updated" date at the top of this page
• Send a notification to all registered users via email
• Display a notice on the Platform for 30 days

Your continued use of the Platform after changes are posted constitutes acceptance of the updated policy.

If you do not agree with the updated policy, you may delete your account by contacting privacy@tunez9ja.com.`
  },
  {
    id: 'contact-privacy',
    title: '10. Contact Us',
    content: `For any privacy-related questions, requests, or concerns:

Privacy Officer
Tunez9ja Entertainment
Email: privacy@tunez9ja.com
Response time: Within 5 business days

For DMCA copyright notices: dmca@tunez9ja.com
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 40 }}>
          {[
            { icon: <Eye size={20} color="var(--red)" />,      title: 'No ad tracking',      desc: 'We never track you for advertising purposes.' },
            { icon: <Database size={20} color="#7b4fff" />,    title: 'Secure storage',       desc: 'All data encrypted with row-level security.' },
            { icon: <Trash2 size={20} color="#00c864" />,      title: 'Right to delete',      desc: 'Request full account and data deletion anytime.' },
          ].map(item => (
            <div key={item.title} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
              <div style={{ marginBottom: 10 }}>{item.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{item.title}</div>
              <div style={{ fontSize: 13, color: 'var(--grey-300)' }}>{item.desc}</div>
            </div>
          ))}
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
