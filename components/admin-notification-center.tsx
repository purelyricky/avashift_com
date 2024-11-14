'use client';

import { useState, useEffect } from 'react';
import { 
  Bell, 
  CheckCircle,
  AlertTriangle,
  UserMinus,
  UserPlus,
  MessageSquare,
  Clock,
  Trash2 
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getAllNotifications, type DatabaseNotification, type NotificationSource } from '@/lib/actions/notification.actions';

interface AdminNotificationCenterProps {
  userId: string;
}

interface Notification extends DatabaseNotification {
  id: string;
  read: boolean;
}

// Map notification types to specific icons
const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'cancellation':
      return UserMinus;
    case 'filler':
      return UserPlus;
    case 'comment':
      return MessageSquare;
    case 'attendance':
      return Clock;
    default:
      return AlertTriangle;
  }
};

export default function AdminNotificationCenter({ userId }: AdminNotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const formatTimeAgo = (timestamp: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(timestamp).getTime()) / 1000);
    
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  const fetchNotifications = async () => {
    try {
      const dbNotifications = await getAllNotifications(userId);
      const formattedNotifications = dbNotifications.map(notif => ({
        ...notif,
        id: notif.requestId || notif.feedbackId || notif.attendanceId || Math.random().toString(),
        read: false
      }));
      setNotifications(formattedNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [userId]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIconColor = (source: NotificationSource) => {
    switch (source) {
      case 'client': return 'text-purple-500';
      case 'student': return 'text-indigo-500';
      case 'shift_leader': return 'text-teal-500';
      default: return 'text-gray-500';
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const deleteNotification = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  if (loading) {
    return <div className="mt-2 text-sm text-gray-500 text-center">Loading notifications...</div>;
  }

  return (
    <TooltipProvider>
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="header-2">Notifications</h2>
          <div className="relative">
            <Bell className="w-6 h-6 text-gray-600" />
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-2 -right-2 px-2 py-1 text-xs bg-red-500 text-white"
              >
                {unreadCount}
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-2">
          {notifications.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">No new notifications</p>
          ) : (
            notifications
              .sort((a, b) => {
                if (a.read !== b.read) return a.read ? 1 : -1;
                return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
              })
              .map((notification) => {
                const NotificationIcon = getNotificationIcon(notification.type);
                return (
                  <div
                    key={notification.id}
                    className={`bg-white rounded-lg shadow-sm p-3 flex items-center space-x-3 text-sm ${
                      notification.read ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex-shrink-0">
                      <NotificationIcon className={`w-5 h-5 ${getIconColor(notification.source)}`} />
                    </div>
                    <div className="flex-grow min-w-0">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className="font-medium truncate text-sm cursor-default">
                            {notification.message}
                          </p>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-sm break-words">
                          <p>{notification.message}</p>
                        </TooltipContent>
                      </Tooltip>
                      <p className="text-xs text-gray-500">
                        {formatTimeAgo(notification.timestamp)}
                      </p>
                    </div>
                    <div className="flex-shrink-0 space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="px-1.5 h-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => markAsRead(notification.id)}
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span className="sr-only">
                          {notification.read ? 'Read' : 'Mark as Read'}
                        </span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="px-1.5 h-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => deleteNotification(notification.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}