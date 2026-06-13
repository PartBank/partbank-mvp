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
  sidebar?: boolean
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'Just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  return `${day}d ago`
}

export function NotificationBell({ role, sidebar = false }: NotificationBellProps) {
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

  async function handleItemClick(item: NotificationItem) {
    setOpen(false)
    if (!item.is_read) {
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n)))
      setUnread((prev) => Math.max(0, prev - 1))
      fetch(`/api/notifications?markId=${item.id}`, { cache: 'no-store' }).catch(() => {})
    }
    if (item.order_id) router.push(`${orderBase}/${item.order_id}`)
  }

  return (
    <div className="relative" ref={containerRef}>
      {sidebar ? (
        /* Sidebar full-width row trigger */
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-2.5 px-3 py-2 rounded-md text-text-secondary hover:bg-surface-secondary hover:text-text-primary transition-colors text-xs font-medium"
        >
          <Bell className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">Notifications</span>
          {unread > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-semibold text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      ) : (
        /* Compact icon-only trigger */
        <button
          onClick={() => setOpen((v) => !v)}
          className="relative p-1 text-white/50 hover:text-white transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      )}

      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-80 max-h-[70vh] overflow-y-auto rounded-xl border border-border bg-white shadow-lg z-50">
          <div className="flex items-center justify-between border-b border-border px-4 py-3 sticky top-0 bg-white rounded-t-xl">
            <span className="text-sm font-semibold text-text-primary">Notifications</span>
            <button
              onClick={() => fetchNotifications(true)}
              className="text-xs text-navy-700 hover:underline"
            >
              Mark all read
            </button>
          </div>

          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-text-muted">No notifications yet</p>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => handleItemClick(item)}
                    className={cn(
                      'w-full text-left px-4 py-3 hover:bg-surface-secondary transition-colors',
                      !item.is_read && 'bg-navy-50'
                    )}
                  >
                    {!item.is_read && (
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-navy-700 mr-2 mb-0.5 align-middle" />
                    )}
                    <p className="inline text-sm text-text-primary leading-snug">{item.message}</p>
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
