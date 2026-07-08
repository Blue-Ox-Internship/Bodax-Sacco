import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client.js';

export default function NotificationCenter() {
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    async function fetchUnread() {
      try {
        const { data } = await api.get('/notifications');
        if (mounted) {
          const unread = data.filter(n => !n.is_read).length;
          setUnreadCount(unread);
        }
      } catch (err) {
        console.error('Failed to fetch notifications', err);
      }
    }

    fetchUnread();
    
    // Poll every 60 seconds
    const intervalId = setInterval(fetchUnread, 60000);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, []);

  return (
    <div 
      className="notification-center" 
      onClick={() => navigate('/notifications')}
      style={{ cursor: 'pointer', position: 'relative', display: 'inline-flex', alignItems: 'center', marginRight: '1rem' }}
    >
      <Bell size={24} style={{ color: 'var(--color-text)' }} />
      {unreadCount > 0 && (
        <span style={{
          position: 'absolute',
          top: '-5px',
          right: '-5px',
          background: 'var(--color-danger)',
          color: 'white',
          borderRadius: '50%',
          padding: '2px 6px',
          fontSize: '0.75rem',
          fontWeight: 'bold',
        }}>
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </div>
  );
}
