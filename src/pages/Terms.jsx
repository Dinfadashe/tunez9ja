import React, { useState } from 'react'
import { Shield, FileText, Music, Newspaper, AlertTriangle, Mail, ChevronDown, ChevronUp, Coins } from 'lucide-react'

const SECTIONS = [
  {
    id: 'acceptance',
    title: '1. Acceptance of Terms',
    content: `By accessing or using Tunez9ja Entertainment ("the Platform", "we", "us", or "our") at any of our web properties, you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not use the Platform.

These Terms apply to all visitors, users, artists, bloggers, editors, and admins who access or use the Platform. We reserve the right to update these Terms at any time. Continued use of the Platform after changes constitutes acceptance of the new Terms.

You must be at least 13 years old to create an account. If you are between 13 and 18, you should review these Terms — particularly Section 7 on TUNEZ tokens and payments — with a parent or guardian.

Tunez9ja Entertainment was registered in 2021 and operates as a Nigerian entertainment platform under the laws of the Federal Republic of Nigeria, under Web3.0 Alliance Ltd (RC: 7919874).`
  },
  {
    id: 'content-ownership',
    title: '2. Content Ownership & Licensing',
    content: `ARTIST-UPLOADED MUSIC AND VIDEOS:
Artists retain full ownership of all music, recordings, lyrics, videos, and associated artwork they upload to the Platform. By uploading content, artists grant Tunez9ja Entertainment a non-exclusive, royalty-free, worldwide license to:
• Display, stream, and promote the content on the Platform
• Create thumbnails and previews for promotional purposes
• Share content on Tunez9ja's official social media channels

This license does not transfer ownership. Artists may request removal of their content at any time by contacting us.

BLOGGER-SUBMITTED CONTENT:
Bloggers retain ownership of original articles, reviews, and opinion pieces they submit. By submitting content, bloggers grant Tunez9ja Entertainment a non-exclusive license to publish, display, and distribute the content on the Platform and associated social channels.

TUNEZ9JA ORIGINAL CONTENT:
All original content created by Tunez9ja Entertainment — including the platform design, logo, branding, editorial content, the AI DJ system, and website code — is owned exclusively by Tunez9ja Entertainment / Web3.0 Alliance Ltd and is protected by copyright law. Unauthorized reproduction is prohibited.`
  },
  {
    id: 'copyright-policy',
    title: '3. Copyright Policy',
    content: `Tunez9ja Entertainment respects intellectual property rights and expects all users to do the same. We aim to operate in line with the Nigerian Copyright Act, including its provisions on online service provider takedown procedures.

PROHIBITED CONTENT:
• Music, recordings, or compositions owned by third parties without proper licensing
• Samples or interpolations without clearance
• Cover artwork, photographs, or visual content you do not own
• Blog posts that reproduce substantial portions of copyrighted text
• Lyrics, sheet music, or other copyrighted written works

WHAT HAPPENS TO INFRINGING CONTENT:
All content submitted to Tunez9ja is reviewed by an editor or admin before publication. Content that appears to infringe on third-party copyrights will be rejected. Published content reported for infringement will be removed promptly upon review.

REPEAT INFRINGERS:
Users who repeatedly submit infringing content will have their accounts suspended or permanently banned, and will forfeit any pending TUNEZ earnings tied to the removed content.

COPYRIGHT TAKEDOWN NOTICES:
If you believe content on Tunez9ja infringes your copyright, please submit a takedown notice to:

Email: dmca@tunez9ja.com
Subject: Copyright Takedown Request

Your notice must include:
1. Your name and contact information
2. Identification of the copyrighted work claimed to be infringed
3. Identification of the infringing material and its location on our platform
4. A statement that you have a good faith belief the use is not authorized
5. A statement under penalty of perjury that the information is accurate
6. Your physical or electronic signature

We will respond to valid takedown notices within 5 business days.`
  },
  {
    id: 'user-conduct',
    title: '4. User Conduct',
    content: `All users of Tunez9ja Entertainment agree NOT to:

• Upload content that infringes on any copyright, trademark, or intellectual property right
• Submit plagiarized blog posts or articles
• Impersonate other artists, bloggers, editors, admins, or public figures
• Upload malicious files, viruses, or harmful code
• Use the platform to distribute spam or unsolicited promotions
• Attempt to gain unauthorized access to other accounts or platform systems
• Harass, threaten, or abuse other users
• Upload content that is defamatory, obscene, or violates Nigerian law
• Manipulate streams, views, follows, or TUNEZ earnings through bots, scripts, or fraudulent activity
• Submit a false or fraudulent verification (KYC) application, including using someone else's identity document
• Attempt to reverse-engineer, exploit, or abuse the TUNEZ token economy or payment system

Tunez9ja reserves the right to remove any content, freeze any TUNEZ balance suspected of fraudulent acquisition, and suspend any account that violates these rules, without prior notice.`
  },
  {
    id: 'content-review',
    title: '5. Content Review Process',
    content: `All music tracks, videos, and blog posts submitted to Tunez9ja Entertainment go through an editorial review process before being published publicly. Reviews are conducted by editors (community members approved for this role) and admins.

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
    id: 'verification',
    title: '6. Identity Verification (Blue Tick)',
    content: `Artists and bloggers meeting certain platform-activity thresholds may apply for verified ("blue tick") status, which carries a higher TUNEZ earn-rate multiplier and priority placement.

VERIFICATION REQUIRES:
• Payment of a non-refundable verification processing fee (currently ₦2,000), charged via Paystack
• Submission of your legal name and a photo or scan of a valid government-issued identity document
• Submission of links to your existing public social media presence, where applicable

HOW YOUR ID DOCUMENT IS HANDLED:
Your identity document is stored in a private, access-restricted location and is only viewable by you and the admin reviewing your application, via a temporary link that expires after a few minutes. It is never made public. See our Privacy Policy, Section 4, for full detail.

WE MAY REJECT A VERIFICATION APPLICATION if the submitted ID appears altered, does not match the legal name provided, or if we reasonably suspect fraud. Repeated fraudulent applications will result in account suspension. The verification fee is non-refundable regardless of approval outcome, as it covers the cost of manual review.`
  },
  {
    id: 'tunez-tokens',
    title: '7. TUNEZ Tokens, Purchases & Payments',
    content: `WHAT TUNEZ IS:
TUNEZ is an in-platform digital credit used to unlock premium content and reward engagement on Tunez9ja. TUNEZ is a utility credit for use within the Platform. It is not legal tender, not a deposit, not a security, and not an investment product. TUNEZ has no value or use outside the Tunez9ja platform, and we do not promise or guarantee that it ever will.

We are reviewing the regulatory treatment of TUNEZ on an ongoing basis as our use of it evolves, including any future plans for blockchain migration or peer-to-peer transfer described in our public whitepaper. Nothing in our whitepaper or marketing material should be read as a guarantee of future value, convertibility, or legal status.

EARNING TUNEZ:
You may earn TUNEZ by streaming approved music, reading approved blog posts, watching approved videos, reacting to content, commenting, logging in daily, and referring new users, subject to daily caps and cooldowns described in-app, which may change at any time.

PURCHASING TUNEZ:
You may purchase TUNEZ with Naira via Paystack, a licensed Nigerian payment service provider. All payments are processed directly by Paystack — we do not receive, see, or store your card number, expiry date, or CVV. We only receive confirmation of a successful or failed transaction and a transaction reference.

Prices for TUNEZ packages are displayed in Naira at the time of purchase and are inclusive of any applicable taxes unless stated otherwise.

SPENDING TUNEZ:
TUNEZ may be spent to unlock premium tracks, articles, and videos set by their creators. Once spent, TUNEZ used to unlock content is non-refundable, as the content becomes immediately and permanently accessible to you.

REFUNDS:
• TUNEZ purchases are refundable only where required by Nigerian consumer protection law, where a payment was made in error, or where a technical fault prevented TUNEZ from being credited to your account after a successful payment.
• To request a refund, email billing@tunez9ja.com with your Paystack transaction reference within 14 days of the purchase. We will investigate and respond within 10 business days.
• TUNEZ earned through engagement (not purchased) has no cash value and is not refundable, transferable, or exchangeable for Naira.
• The verification fee described in Section 6 is non-refundable.

CREATOR EARNINGS:
Artists, bloggers, and editors may earn TUNEZ when their content is unlocked by other users, according to the revenue split described in our public whitepaper (currently: 70% to the creator, 15% to the platform, 15% to the editor who approved the content). These percentages and the underlying mechanics may change with notice. As of this version of these Terms, TUNEZ earned by creators remains an in-platform credit; any future cash payout mechanism will be governed by additional terms presented to you before you opt in, and will be designed to comply with applicable Nigerian financial regulation at that time.

HALVING / RATE CHANGES:
Earn rates for TUNEZ reduce over time as the platform grows (the "halving system" described in our whitepaper). We may adjust earn rates, daily caps, package prices, and the token economy generally at our discretion, with reasonable notice for material changes.`
  },
  {
    id: 'liability',
    title: '8. Limitation of Liability',
    content: `Tunez9ja Entertainment provides the Platform "as is" without warranties of any kind. We are not liable for:

• Copyright infringement by users who falsely claim ownership of uploaded content
• Loss of data, revenue, profits, or TUNEZ balance arising from use of the Platform, except where caused by our gross negligence or willful misconduct
• Interruptions in service due to technical issues, maintenance, or third-party provider outages (including Supabase, Netlify, or Paystack)
• Third-party links or content referenced on the Platform
• Any future change in the legal or regulatory treatment of TUNEZ tokens

Users are solely responsible for the content they submit and the legal consequences of any copyright infringement they commit.

Nothing in these Terms excludes or limits liability that cannot lawfully be excluded or limited under Nigerian law, including liability for fraud or for death or personal injury caused by our negligence.

Subject to the above, the maximum aggregate liability of Tunez9ja Entertainment for any claim shall not exceed the total amount you paid to the Platform via Paystack in the 12 months preceding the claim (which for accounts that have never made a purchase is zero).`
  },
  {
    id: 'governing-law',
    title: '9. Governing Law',
    content: `These Terms are governed by and construed in accordance with the laws of the Federal Republic of Nigeria. Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of Nigerian courts.

If any provision of these Terms is found to be unenforceable, the remaining provisions shall continue in full force and effect.`
  },
  {
    id: 'privacy-reference',
    title: '10. Privacy',
    content: `Our collection, use, and protection of your personal data — including account information, content, TUNEZ transaction history, and identity verification documents — is governed by our separate Privacy Policy, which forms part of these Terms by reference. Please read it at /privacy.`
  },
  {
    id: 'contact',
    title: '11. Contact Information',
    content: `For questions about these Terms, contact us:

Tunez9ja Entertainment / Web3.0 Alliance Ltd
General legal questions: legal@tunez9ja.com
Copyright notices: dmca@tunez9ja.com
Privacy requests: privacy@tunez9ja.com
Billing & refund requests: billing@tunez9ja.com
General inquiries: info@tunez9ja.com

Website: tunez9ja.netlify.app

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
            <a href="mailto:billing@tunez9ja.com" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--red)' }}>
              <Coins size={14} /> billing@tunez9ja.com
            </a>
          </div>
        </div>
      </div>

      <div className="container section" style={{ maxWidth: 860 }}>
        {/* Quick summary */}
        <div className="grid-3" style={{ marginBottom: 40 }}>
          {[
            { icon: <Music size={20} color="var(--red)" />, title: 'Artists own their music', desc: 'You keep full ownership. We just display it.' },
            { icon: <Newspaper size={20} color="#00b4dc" />, title: 'Bloggers own their words', desc: 'Original articles belong to you.' },
            { icon: <Coins size={20} color="#ffb400" />, title: 'TUNEZ is a utility credit', desc: 'Not money, not an investment — see Section 7.' },
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
              If you believe any content on Tunez9ja infringes your copyright, contact our copyright team immediately. We take all reports seriously and respond within 5 business days.
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
