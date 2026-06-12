import type { ReactNode } from 'react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Banner — desktop only. The 1:1 image has built-in margin, so a
          full-bleed object-cover only trims the safe-zone, never the content. */}
      <div className="relative hidden lg:block lg:w-1/2 xl:w-[55%] bg-navy-950">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/login-banner.png"
          alt="PartBank — Engineering parts back into motion"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
      </div>

      {/* Form side */}
      <div className="flex w-full flex-col bg-white lg:w-1/2 xl:w-[45%]">
        {/* Mobile logo header (banner is hidden on small screens) */}
        <div className="flex items-center gap-2 p-6 lg:hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="PartBank" className="h-8 w-8 object-contain" />
          <span className="text-navy-900 font-semibold text-lg tracking-tight">PartBank</span>
        </div>

        <div className="flex flex-1 items-center justify-center px-4 pb-16 lg:py-12">
          {children}
        </div>
      </div>
    </div>
  )
}
