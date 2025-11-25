import React, { useState } from 'react';

// Types pour les notifications
type NotificationType = 'message' | 'alert' | 'info' | 'course_update' | 'progress' | 'certificate' | 'reminder' | 'question' | 'review' | 'milestone';
type Priority = 'high' | 'normal' | 'low';
type FilterType = 'all' | 'unread' | 'read';
type SortType = 'date' | 'priority';

interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority: Priority;
  courseId?: string;
  courseName?: string;
  actionUrl?: string;
  metadata?: {
    progress?: number;
    studentCount?: number;
    rating?: number;
  };
}

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: 1,
      type: 'message',
      title: 'Nouveau message',
      message: 'Jean Dupont vous a envoyé un message',
      timestamp: '2024-01-20T10:30:00',
      read: false,
      priority: 'normal'
    },
    {
      id: 2,
      type: 'alert',
      title: 'Alerte système',
      message: 'Maintenance planifiée ce soir à 22h',
      timestamp: '2024-01-20T09:15:00',
      read: false,
      priority: 'high'
    },
    {
      id: 3,
      type: 'info',
      title: 'Mise à jour disponible',
      message: 'Une nouvelle version est disponible',
      timestamp: '2024-01-19T14:20:00',
      read: true,
      priority: 'low'
    }
  ]);

  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('date');

  // Fonctions de gestion
  const markAsRead = (id: number) => {
    setNotifications(notifications.map(notif =>
      notif.id === id ? { ...notif, read: true } : notif
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(notif => ({ ...notif, read: true })));
  };

  const deleteNotification = (id: number) => {
    setNotifications(notifications.filter(notif => notif.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  // Filtrage et tri
  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'unread') return !notif.read;
    if (filter === 'read') return notif.read;
    return true;
  });

  const sortedNotifications = [...filteredNotifications].sort((a, b) => {
    if (sortBy === 'date') {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    }
    const priorityOrder: Record<Priority, number> = { high: 3, normal: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'À l\'instant';
    if (diffInHours < 24) return `Il y a ${diffInHours}h`;
    return date.toLocaleDateString('fr-FR');
  };

  const getPriorityColor = (priority: Priority): string => {
    switch(priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-300';
      case 'normal': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getTypeIcon = (type: NotificationType): string => {
    switch(type) {
      case 'message': return '💬';
      case 'alert': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📢';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 text-blue-600">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
                <p className="text-sm text-gray-600">
                  {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'Tout est lu'}
                </p>
              </div>
            </div>
            
            {/* Badge de compteur */}
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-red-500 text-white font-bold">
                {unreadCount}
              </span>
            )}
          </div>

          {/* Actions principales */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              Tout marquer comme lu
            </button>
            
            <button
              onClick={clearAll}
              disabled={notifications.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
              Tout supprimer
            </button>
          </div>
        </div>

        {/* Filtres et Tri */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
            </svg>
            <span className="font-semibold text-gray-700">Filtres</span>
          </div>
          
          <div className="flex flex-wrap gap-4">
            {/* Filtre par statut */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  filter === 'all' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Toutes ({notifications.length})
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  filter === 'unread' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Non lues ({unreadCount})
              </button>
              <button
                onClick={() => setFilter('read')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  filter === 'read' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Lues ({notifications.length - unreadCount})
              </button>
            </div>

            {/* Tri */}
            <div className="flex gap-2 ml-auto">
              <span className="text-sm text-gray-600 self-center">Trier par:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortType)}
                className="px-3 py-1 border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="date">Date</option>
                <option value="priority">Priorité</option>
              </select>
            </div>
          </div>
        </div>

        {/* Liste des notifications */}
        <div className="space-y-3">
          {sortedNotifications.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              <p className="text-gray-500 text-lg">Aucune notification</p>
            </div>
          ) : (
            sortedNotifications.map(notif => (
              <div
                key={notif.id}
                className={`bg-white rounded-lg shadow-sm p-4 transition-all hover:shadow-md ${
                  !notif.read ? 'border-l-4 border-blue-600' : 'border-l-4 border-transparent'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Icône */}
                  <div className="text-2xl flex-shrink-0">
                    {getTypeIcon(notif.type)}
                  </div>

                  {/* Contenu */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className={`font-semibold ${!notif.read ? 'text-gray-900' : 'text-gray-600'}`}>
                        {notif.title}
                      </h3>
                      
                      {/* Badge de priorité */}
                      <span className={`px-2 py-1 text-xs rounded-full border ${getPriorityColor(notif.priority)}`}>
                        {notif.priority === 'high' ? 'Urgent' : notif.priority === 'normal' ? 'Normal' : 'Faible'}
                      </span>
                    </div>

                    <p className={`text-sm mb-2 ${!notif.read ? 'text-gray-700' : 'text-gray-500'}`}>
                      {notif.message}
                    </p>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(notif.timestamp)}
                      </span>

                      {/* Actions */}
                      <div className="flex gap-2">
                        {!notif.read && (
                          <button
                            onClick={() => markAsRead(notif.id)}
                            className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="Marquer comme lu"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                            Marquer lu
                          </button>
                        )}
                        
                        <button
                          onClick={() => deleteNotification(notif.id)}
                          className="flex items-center gap-1 px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Supprimer"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                          Supprimer
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;