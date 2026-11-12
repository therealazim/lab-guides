export default function LupicLogo({ light = false }: { light?: boolean }) {
  const primary = light ? '#FFFFFF' : '#0B2B57'
  const secondary = light ? 'rgba(255,255,255,0.72)' : '#5C667A'
  return (
    <span className="flex items-center gap-2.5">
      <span className="relative flex h-11 w-11 flex-shrink-0 items-center justify-center">
        <svg viewBox="0 0 48 48" className="h-11 w-11" aria-hidden="true">
          <circle cx="24" cy="24" r="21" fill="none" stroke={primary} strokeWidth="1.6" opacity="0.9" />
          <ellipse cx="24" cy="24" rx="9" ry="21" fill="none" stroke={primary} strokeWidth="1.4" opacity="0.7" />
          <ellipse cx="24" cy="24" rx="21" ry="9" fill="none" stroke={primary} strokeWidth="1.4" opacity="0.7" />
          <path d="M4 17c6 4 34 4 40 0" fill="none" stroke={primary} strokeWidth="1.2" opacity="0.45" />
          <path d="M4 31c6-4 34-4 40 0" fill="none" stroke={primary} strokeWidth="1.2" opacity="0.45" />
          <circle cx="24" cy="24" r="4.2" fill="#F2685A" />
        </svg>
      </span>
      <span className="flex min-w-0 flex-col leading-none">
        <span className="text-[26px] font-extrabold tracking-[-0.02em]" style={{ color: primary }}>
          LUPIC
        </span>
        <span className="mt-1 text-[8.5px] font-medium leading-[1.35]" style={{ color: secondary }}>
          Leading University Project for
          <br />
          International Cooperation
        </span>
      </span>
    </span>
  )
}
