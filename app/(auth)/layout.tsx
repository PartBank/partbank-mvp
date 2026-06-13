import type { ReactNode } from 'react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Banner — desktop only */}
      <div className="relative hidden lg:block lg:w-1/2 xl:w-[55%] shrink-0 bg-navy-950">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/login-banner.png"
          alt="PartBank — Engineering parts back into motion"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
      </div>

      {/* Form side — scrolls independently */}
      <div className="flex w-full flex-col bg-surface-secondary lg:w-1/2 xl:w-[45%] overflow-y-auto">
        <div className="flex flex-1 items-center justify-center px-4 py-12">
          {children}
        </div>
      </div>
    </div>
  )
}
