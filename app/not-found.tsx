import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-white overflow-hidden">
      {/* Watermark 404 */}
      <span
        aria-hidden
        className="pointer-events-none select-none absolute inset-0 flex items-center justify-center text-[28vw] font-black text-navy-950/[0.03] leading-none"
      >
        404
      </span>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-6 text-center px-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-light.svg" alt="PartBank" className="h-10 w-10 block" />
          <span className="text-sm font-semibold tracking-widest text-navy-900 uppercase">
            PartBank
          </span>
        </div>

        {/* Divider */}
        <div className="w-px h-10 bg-border" />

        {/* Message */}
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-text-primary tracking-tight">
            Page not found
          </h1>
          <p className="text-sm text-text-muted max-w-xs leading-relaxed">
            This page doesn't exist or has been moved.
          </p>
        </div>

        {/* CTA */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2 text-sm font-medium text-text-primary hover:bg-surface-secondary transition-colors"
        >
          ← Go home
        </Link>
      </div>
    </div>
  )
}
