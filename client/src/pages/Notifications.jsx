import { useState } from 'react';
import Button from '../components/Button.jsx';
import { Panel } from '../components/Card.jsx';
import { LoadingRetry } from '../components/LoadingSpinner.jsx';
import api from '../api/client.js';
import { useDelayedAsync } from '../hooks/useDelayedAsync.js';

const TYPE_ICON = {
  deposit:        '💰',
  password_reset: '🔐',
  loan:           '📋',
  security:       '🔒',
  info:           'ℹ️',
};

function NotificationItem({ notif, onMarkRead, loading }) {
  const icon = TYPE_ICON[notif.type] || TYPE_ICON.info;
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: '8px 12px',
        alignItems: 'start',
        padding: '14px 16px',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--line)',
        background: notif.is_read ? 'transparent' : 'var(--primary-light)',
        borderLeftWidth: notif.is_read ? '1px' : '3px',
        borderLeftColor: notif.is_read ? 'var(--line)' : 'var(--primary)',
      }}
    >
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '1.3rem', lineHeight: 1, flexShrink: 0 }}>{icon}</span>
        <div>
          <p style={{ margin: '0 0 4px 0', fontWeight: notif.is_read ? 500 : 700, fontSize: '0.95rem' }}>
            {notif.title}
          </p>
          <p style={{ margin: '0 0 6px 0', fontSize: '0.875rem', color: 'var(--muted)', lineHeight: 1.5 }}>
            {notif.message}
          </p>
          <small style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>
            {new Date(notif.created_at).toLocaleString()}
          </small>
        </div>
      </div>
      {!notif.is_read && (
        <button
          onClick={() => onMarkRead(notif.id)}
          disabled={loading}
          style={{
            background: 'transparent',
            border: '1px solid var(--primary)',
            color: 'var(--primary)',
            padding: '4px 10px',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            fontSize: '0.8rem',
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          Mark read
        </button>
      )}
    </div>
  );
}

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);

  async function loadNotifications() {
    const { data } = await api.get('/notifications');
    setNotifications(data);
  }

  const { loading, error, onRetry } = useDelayedAsync(loadNotifications, [], {
    errorMessage: 'Failed to load notifications',
  });

  async function markAsRead(id) {
    setActionLoading(true);
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    } finally {
      setActionLoading(false);
    }
  }

  async function markAllAsRead() {
    setActionLoading(true);
    try {
      await api.patch('/notifications/mark-all-read');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } finally {
      setActionLoading(false);
    }
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="page-stack">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ margin: 0 }}>
          Notifications
          {unreadCount > 0 && (
            <span style={{ marginLeft: '10px', fontSize: '0.85rem', background: 'var(--primary)', color: 'white', padding: '2px 10px', borderRadius: '99px', verticalAlign: 'middle' }}>
              {unreadCount} unread
            </span>
          )}
        </h1>
        {unreadCount > 0 && (
          <Button onClick={markAllAsRead} disabled={actionLoading} className="btn btn-secondary" id="mark-all-read-btn">
            Mark all as read
          </Button>
        )}
      </div>

      <Panel>
        <LoadingRetry loading={loading} error={error} onRetry={onRetry}>
          {notifications.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--muted)', padding: '40px 0', fontSize: '0.95rem' }}>
              🔔 You have no notifications yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {notifications.map((notif) => (
                <NotificationItem
                  key={notif.id}
                  notif={notif}
                  onMarkRead={markAsRead}
                  loading={actionLoading}
                />
              ))}
            </div>
          )}
        </LoadingRetry>
      </Panel>
    </div>
  );
}
