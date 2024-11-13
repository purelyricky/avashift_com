'use client'

import { useState, useMemo } from 'react'
import { Bell, X, CheckCircle, UserPlus, FileText, Clock, Trash2, AlertTriangle, MessageSquare, Mail } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type NotificationSource = 'client' | 'student' | 'shift_leader'

type Notification = {
  id: number
  type: 'cancellation' | 'replacement' | 'notes' | 'late'
  message: string
  time: string
  read: boolean
  source: NotificationSource
}

const iconOptions = [AlertTriangle, MessageSquare, Mail, Clock, FileText, UserPlus]

export default function AdminNotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([
    { id: 1, type: 'cancellation', message: 'Shift cancelled for tomorrow', time: '5m', read: false, source: 'client' },
    { id: 2, type: 'replacement', message: 'John Doe will cover the shift', time: '10m', read: false, source: 'shift_leader' },
    { id: 3, type: 'notes', message: 'New notes from shift leader', time: '1h', read: false, source: 'shift_leader' },
    { id: 4, type: 'late', message: 'Late arrival reported', time: '2h', read: false, source: 'student' },
    { id: 5, type: 'notes', message: 'Client feedback received', time: '3h', read: false, source: 'client' },
  ])

  const unreadCount = notifications.filter(n => !n.read).length

  const getRandomIcon = useMemo(() => {
    const iconMap = new Map<number, React.ElementType>()
    return (id: number) => {
      if (!iconMap.has(id)) {
        const RandomIcon = iconOptions[Math.floor(Math.random() * iconOptions.length)]
        iconMap.set(id, RandomIcon)
      }
      return iconMap.get(id)!
    }
  }, [])

  const getIconColor = (source: NotificationSource) => {
    switch (source) {
      case 'client': return 'text-purple-500'
      case 'student': return 'text-indigo-500'
      case 'shift_leader': return 'text-teal-500'
    }
  }

  const markAsRead = (id: number) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const deleteNotification = (id: number) => {
    setNotifications(notifications.filter(n => n.id !== id))
  }

  return (
    <div className="mt-6 flex flex-1 flex-col gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Admin Notifications</h2>
        <div className="relative">
          <Bell className="w-6 h-6" />
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -top-2 -right-2 px-2 py-1 text-xs bg-red-500 text-white">
              {unreadCount}
            </Badge>
          )}
        </div>
      </div>

      <div className='space-y-2'>
        {notifications.map((notification) => {
          const Icon = getRandomIcon(notification.id)
          return (
            <div key={notification.id} className={`bg-white rounded-lg shadow-sm p-3 flex items-center space-x-3 text-sm ${notification.read ? 'opacity-60' : ''}`}>
              <div className="flex-shrink-0">
                <Icon className={`w-6 h-6 ${getIconColor(notification.source)}`} />
              </div>
              <div className="flex-grow min-w-0">
                <p className="font-medium truncate">{notification.message}</p>
                <p className="text-xs text-gray-500">{notification.time}</p>
              </div>
              <div className="flex-shrink-0 space-x-1">
                <Button variant="ghost" size="sm" className="px-2 h-8 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => markAsRead(notification.id)}>
                  <CheckCircle className="w-4 h-4" />
                  <span className="sr-only">{notification.read ? 'Read' : 'Mark as Read'}</span>
                </Button>
                <Button variant="ghost" size="sm" className="px-2 h-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => deleteNotification(notification.id)}>
                  <Trash2 className="w-4 h-4" />
                  <span className="sr-only">Delete</span>
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}