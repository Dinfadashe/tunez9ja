import React from 'react'

// 🔵 Blue tick — milestone verified (earned through streams/views + KYC)
// ✅ Green tick — admin manually verified
export default function VerificationBadge({ verifiedType, isVerified, size = 16 }) {
  if (!isVerified && !verifiedType) return null

  if (verifiedType === 'milestone') {
    return (
      <span title="Verified Creator — earned through milestone achievement and KYC" style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="12" fill="#1DA1F2" />
          <path d="M6.5 12.5l3.5 3.5 7.5-7.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    )
  }

  // Default: admin green tick
  if (isVerified) {
    return (
      <span title="Verified by Tunez9ja Admin" style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="12" fill="#00c864" />
          <path d="M6.5 12.5l3.5 3.5 7.5-7.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    )
  }

  return null
}
