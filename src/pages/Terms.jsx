import React, { useState } from 'react'
import { Shield, FileText, Music, Newspaper, AlertTriangle, Mail, ChevronDown, ChevronUp } from 'lucide-react'

const SECTIONS = [
  {
    id: 'acceptance',
    title: '1. Acceptance of Terms',
    content: `By accessing or using Tunez9ja Entertainment ("the Platform", "we", "us", or "our") at any of our web properties, you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not use the Platform.

These Terms apply to all visitors, users, artists, bloggers, and others who access or use the Platform. We reserve the right to update these Terms at any time. Continued use of the Platform after changes constitutes acceptance of the new Terms.

Tunez9ja Entertainment was registered in 2021 and operates as a Nigerian entertainment platform under the laws of the Federal Republic of Nigeria.`
  },
  {
    id: 'content-ownership',
    title: '2. Content Ownership & Licensing',
    content: `ARTIST-UPLOADED MUSIC:
Artists retain full ownership of all music, recordings, lyrics, and associated artwork they upload to the Platform. By uploading content, artists grant Tunez9ja Entertainment a non-exclusive, royalty-free, worldwide license to:
• Display, stream, and promote the content on the Platform
• Create thumbnails and previews for promotional purposes
• Share content on Tunez9ja's official social media channels

This license does not transfer ownership. Artists may request removal of their content at any time by contacting us.

BLOGGER-SUBMITTED CONTENT:
Bloggers retain ownership of original articles, reviews, and opinion pieces they submit. By submitting content, bloggers grant Tunez9ja Entertainment a non-exclusive license to publish, display, and distribute the content on the Platform and associated social channels.

TUNEZ9JA ORIGINAL CONTENT:
All original content created by Tunez9ja Entertainment — including the platform design, logo, branding, editorial content, and website code — is owned exclusively by Tunez9ja Entertainment and is protected by copyright law. Unauthorized reproduction is prohibited.`
  },
  {
    id: 'copyright-policy',
    title: '3. Copyright & DMCA Policy',
    content: `Tunez9ja Entertainment respects intellectual property rights and expects all users to do the same.

PROHIBITED CONTENT:
• Music, recordings, or compositions owned by third parties without proper licensing
• Samples or interpolations without clearance
• Cover artwork, photographs, or visual content you do not own
• Blog posts that reproduce substantial portions of copyrighted text
• Lyrics, sheet music, or other copyrighted written works

WHAT HAPPENS TO INFRINGING CONTENT:
All content submitted to Tunez9ja is reviewed by our admin team before publication. Content that appears to infringe on third-party copyrights will be rejected. Published content reported for infringement will be removed promptly.

REPEAT INFRINGERS:
Users who repeatedly submit infringing content will have their accounts suspended or permanently banned.

DMCA TAKEDOWN NOTICES:
If you believe content on Tunez9ja infringes your copyright, please submit a DMCA takedown notice to:

Email: dmca@tunez9ja.com
Subject: DMCA Takedown Request

Your notice must include:
1. Your name and contact information
2. Identification of the copyrighted work claimed to be infringed
3. Identification of the infringing material and its location on our platform
4. A statement that you have a good faith belief the use is not authorized
5. A statement under penalty of perjury that the information is accurate
6. Your physical or electronic signature

We will respond to valid DMCA notices within 5 business days.`
  },
  {
    id: 'user-conduct',
    title: '4. User Conduct',
    content: `All users of Tunez9ja Entertainment agree NOT to:

• Upload content that infringes on any copyright, trademark, or intellectual property right
• Submit plagiarized blog posts or articles
• Impersonate other artists, bloggers, or public figures
• Upload malicious files, viruses, or harmful code
• Use the platform to distribute spam or unsolicited promotions
• Attempt to gain unauthorized access to other accounts or platform systems
• Harass, threaten, or abuse other users
• Upload content that is defamatory, obscene, or violates Nigerian law

Tunez9ja reserves the right to remove any content and suspend any account that violates these rules, without prior notice.`
  },
  {
    id: 'content-review',
    title: '5. Content Review Process',
    content: `All music tracks and blog posts submitted to Tunez9ja Entertainment go through an admin review process before being published publicly.

BY SUBMITTING CONTENT, YOU CONFIRM:
• You are the original creator or have obtained all necessary rights and licenses
• Your content does not infringe on any third-party intellectual property
• You have the right to grant Tunez9ja the license described in Section 2
• Your content complies with all applicable Nigerian and international laws
• You accept full legal responsibility for the content you submit

REVIEW TIMEFRAME:
Content is typically reviewed within 24–72 hours. You will receive a notification when your content is approved or rejected. Rejected content includes feedback to help you resubmit compliant material.`
  },
  {
    id: 'privacy',
    title: '6. Privacy & Data',
    content: `WHAT WE COLLECT:
• Account information: name, email address, role (artist/blogger)
• Content you upload: music tracks, cover art, blog posts
• Usage data: plays, views, login times (for platform analytics)
• Device information: browser type, IP address (for security)

HOW WE USE IT:
• To operate and improve the Platform
• To notify you about your content review status
• To send platform updates and announcements (you may opt out)
• To detect and prevent fraud or abuse

HOW WE STORE IT:
Your data is stored securely using Supabase (PostgreSQL database with row-level security). We do not sell your personal data to third parties.

YOUR RIGHTS:
• Request a copy of your data
• Request deletion of your account and data
• Correct inaccurate information in your profile

To exercise these rights, contact: privacy@tunez9ja.com

DATA RETENTION:
We retain account data for as long as your account is active. Deleted accounts are purged within 30 days.`
  },
  {
    id: 'liability',
    title: '7. Limitation of Liability',
    content: `Tunez9ja Entertainment provides the Platform "as is" without warranties of any kind. We are not liable for:

• Copyright infringement by users who falsely claim ownership of uploaded content
• Loss of data, revenue, or profits arising from use of the Platform
• Interruptions in service due to technical issues or maintenance
• Third-party links or content referenced on the Platform

Users are solely responsible for the content they submit and the legal consequences of any copyright infringement they commit.

The maximum liability of Tunez9ja Entertainment for any claim shall not exceed the amount paid by the user to the Platform in the 12 months preceding the claim (which for free accounts is zero).`
  },
  {
    id: 'governing-law',
    title: '8. Governing Law',
    content: `These Terms are governed by and construed in accordance with the laws of the Federal Republic of Nigeria. Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of Nigerian courts.

If any provision of these Terms is found to be unenforceable, the remaining provisions shall continue in full force and effect.`
  },
  {
    id: 'contact',
    title: '9. Contact Information',
    content: `For questions about these Terms, contact us:

Tunez9ja Entertainment
Email: legal@tunez9ja.com
DMCA Notices: dmca@tunez9ja.com
Privacy Requests: privacy@tunez9ja.com
General Inquiries: info@tunez9ja.com

Website: tunez9ja.com

Last Updated: June 2026
Effective Date: January 2021`
  },
]

export default function TermsPage() {
  const [openSections, setOpenSections] = useState(['acceptance'])

  const toggle = (id) => {
    setOpenSections(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  const expandAll = () => setOpenSections(SECTIONS.map(s => s.id))
  const collapseAll = () => setOpenSections([])

  return (
    <div style={{ minHeight: '80vh' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(180deg, #0a0d1a 0%, var(--bg-deep) 100%)', padding: '60px 0 40px', borderBottom: '1px solid var(--border)' }}>
        <div className="container" style={{ maxWidth: 860 }}>
          <div className="section-label"><Shield size={12} style={{ display: 'inline', marginRight: 6 }} />Legal</div>
          <h1 className="page-title">Terms of Service</h1>
          <p style={{ color: 'var(--grey-300)', marginTop: 12, fontSize: 15 }}>
            Last updated June 2026 · Effective since January 2021
          </p>
          <div style={{ display: 'flex', gap: 16, marginTop: 20, flexWrap: 'wrap' }}>
            <a href="mailto:legal@tunez9ja.com" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--red)' }}>
              <Mail size={14} /> legal@tunez9ja.com
            </a>
            <a href="mailto:dmca@tunez9ja.com" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--red)' }}>
              <AlertTriangle size={14} /> dmca@tunez9ja.com
            </a>
          </div>
        </div>
      </div>

      <div className="container section" style={{ maxWidth: 860 }}>
        {/* Quick summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 40 }}>
          {[
            { icon: <Music size={20} color="var(--red)" />, title: 'Artists own their music', desc: 'You keep full ownership. We just display it.' },
            { icon: <Newspaper size={20} color="#00b4dc" />, title: 'Bloggers own their words', desc: 'Original articles belong to you.' },
            { icon: <Shield size={20} color="#00c864" />, title: 'Zero tolerance for theft', desc: 'Infringing content is removed immediately.' },
          ].map(item => (
            <div key={item.title} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
              <div style={{ marginBottom: 10 }}>{item.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{item.title}</div>
              <div style={{ fontSize: 13, color: 'var(--grey-300)' }}>{item.desc}</div>
            </div>
          ))}
        </div>

        {/* Expand/collapse controls */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <button className="btn btn-ghost" onClick={expandAll} style={{ fontSize: 13 }}>Expand all</button>
          <button className="btn btn-ghost" onClick={collapseAll} style={{ fontSize: 13 }}>Collapse all</button>
        </div>

        {/* Accordion sections */}
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

        {/* DMCA box */}
        <div style={{ background: 'var(--red-glow)', border: '1px solid var(--border-red)', borderRadius: 12, padding: 28, marginTop: 40, display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          <AlertTriangle size={28} color="var(--red)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 24, marginBottom: 8 }}>Report Copyright Infringement</h3>
            <p style={{ color: 'var(--grey-300)', fontSize: 14, lineHeight: 1.7, marginBottom: 16 }}>
              If you believe any content on Tunez9ja infringes your copyright, contact our DMCA team immediately. We take all reports seriously and respond within 5 business days.
            </p>
            <a href="mailto:dmca@tunez9ja.com" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Mail size={15} /> dmca@tunez9ja.com
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
