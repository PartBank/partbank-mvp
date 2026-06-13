import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Mark-all-read shortcut.
  if (request.nextUrl.searchParams.get('markAllRead') === 'true') {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
  }

  // Mark a single notification as read.
  const markId = request.nextUrl.searchParams.get('markId')
  if (markId) {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', markId)
      .eq('user_id', user.id)
  }

  const { data: notifications } = await supabase
    .from('notifications')
    .select('id, message, is_read, order_id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  const unreadCount = (notifications ?? []).filter((n) => !n.is_read).length

  return NextResponse.json({ notifications: notifications ?? [], unreadCount })
}
