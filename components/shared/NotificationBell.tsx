'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NotificationItem {
  id: string
  message: string
  is_read: boolean
  order_id: string | null
  created_at: string
}

interface NotificationBellProps {
  role: 'customer' | 'workshop' | 'internal'
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'Baru saja'
  if (min < 60) return `${min} menit yang lalu`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} jam yang lalu`
  const day = Math.floor(hr / 24)
  return `${day} hari yang lalu`
}

export function NotificationBell({ role }: NotificationBellProps) {
  const router = useRouter()
  const [items, setItems] = useState<NotificationItem[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = useCallback(async (markAllRead = false) => {
    try {
      const res = await fetch(`/api/notifications${markAllRead ? '?markAllRead=true' : ''}`, {
        cache: 'no-store',
      })
      if (!res.ok) return
      const data = (await res.json()) as { notifications: NotificationItem[]; unreadCount: number }
      setItems(data.notifications)
      setUnread(data.unreadCount)
    } catch {
      // network hiccup — keep previous state
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
    const id = setInterval(() => fetchNotifications(), 30000)
    return () => clearInterval(id)
  }, [fetchNotifications])

  // Close dropdown on outside click.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const orderBase = role === 'internal' ? '/internal/orders' : role === 'workshop' ? '/workshop/orders' : '/orders'

  function handleItemClick(item: NotificationItem) {
    setOpen(false)
    if (item.order_id) router.push(`${orderBase}/${item.order_id}`)
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-1 text-white/50 hover:text-white transition-colors"
        aria-label="Notifikasi"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full right-0 mb-2 w-80 max-h-96 overflow-y-auto rounded-lg border border-border bg-white shadow-md z-50">
          <div className="flex items-center justify-between border-b border-border px-3 py-2 sticky top-0 bg-white">
            <span className="text-sm font-medium text-text-primary">Notifikasi</span>
            <button
              onClick={() => fetchNotifications(true)}
              className="text-xs text-navy-700 hover:underline"
            >
              Tandai semua dibaca
            </button>
          </div>

          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-text-muted">Tidak ada notifikasi</p>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => handleItemClick(item)}
                    className={cn(
                      'w-full text-left px-3 py-2.5 hover:bg-surface-secondary transition-colors',
                      !item.is_read && 'bg-navy-50'
                    )}
                  >
                    <p className="text-sm text-text-primary leading-snug">{item.message}</p>
                    <p className="text-xs text-text-muted mt-1">{relativeTime(item.created_at)}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
