import { useState } from 'react';
import Button from '../components/Button.jsx';
import { Panel } from '../components/Card.jsx';
import { LoadingRetry } from '../components/LoadingSpinner.jsx';
import api from '../api/client.js';
import { useDelayedAsync } from '../hooks/useDelayedAsync.js';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loadingAction, setLoadingAction] = useState(false);

  async function loadNotifications() {
    const { data } = await api.get('/notifications');
    setNotifications(data);
  }

  const { loading, error, onRetry } = useDelayedAsync(loadNotifications, [], {
    errorMessage: 'Failed to load notifications',
  });

  async function markAsRead(id) {
    setLoadingAction(true);
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
    } finally {
      setLoadingAction(false);
    }
  }

  async function markAllAsRead() {
    setLoadingAction(true);
    try {
      await api.patch('/notifications/mark-all-read');
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    } finally {
      setLoadingAction(false);
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="page-stack">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Notifications {unreadCount > 0 && <span style={{ fontSize: '1rem', background: 'var(--color-primary)', color: 'white', padding: '2px 8px', borderRadius: '12px' }}>{unreadCount}</span>}</h1>
        {unreadCount > 0 && (
          <Button onClick={markAllAsRead} disabled={loadingAction} className="btn-secondary">
            Mark all as read
          </Button>
        )}
      </div>

      <Panel>
        <LoadingRetry loading={loading} error={error} onRetry={onRetry}>
          {notifications.length === 0 ? (
            <p className="empty-state">No notifications to display.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {notifications.map(notif => (
                <div 
                  key={notif.id} 
                  style={{ 
                    padding: '16px', 
                    border: '1px solid var(--color-border)', 
                    borderRadius: '8px',
                    background: notif.is_read ? 'transparent' : 'var(--color-muted)',
                    opacity: notif.is_read ? 0.8 : 1,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start'
                  }}
                >
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem' }}>{notif.title}</h3>
                    <p style={{ margin: '0 0 8px 0', color: 'var(--color-text)' }}>{notif.message}</p>
                    <small style={{ color: 'var(--color-text)' }}>{new Date(notif.created_at).toLocaleString()}</small>
                  </div>
                  {!notif.is_read && (
                    <button 
                      onClick={() => markAsRead(notif.id)} 
                      disabled={loadingAction}
                      style={{ 
                        background: 'transparent', 
                        border: '1px solid var(--color-primary)', 
                        color: 'var(--color-primary)', 
                        padding: '4px 8px', 
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Mark read
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </LoadingRetry>
      </Panel>
    </div>
  );
}
