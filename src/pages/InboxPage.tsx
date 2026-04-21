import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import Header from '../components/ui/Header';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import Card, { CardBody } from '../components/ui/Card';
import { LoadingCenter } from '../components/ui/Loading';
import MessageBubbleIcon from '../components/ui/MessageBubbleIcon';
import HandshakeIcon from '../components/ui/HandshakeIcon';

interface ConversationSummary {
  otherOrgId: number;
  otherOrg: {
    id: number;
    name: string;
    category: string;
    logoUrl?: string;
    city?: string;
    state?: string;
  };
  isConnected: boolean;
  lastMessage: {
    id: number;
    content: string;
    senderOrgId: number;
    createdAt: string;
  };
  unreadCount: number;
}

export default function InboxPage() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadInbox = async (showLoader = false) => {
      if (showLoader) setLoading(true);
      try {
        const inbox = await api.get<ConversationSummary[]>(`/messages/inbox?ts=${Date.now()}`);
        if (isMounted) {
          setConversations(inbox);
        }
      } catch {
        // no-op: keep current UI state
      } finally {
        if (showLoader && isMounted) {
          setLoading(false);
        }
      }
    };

    loadInbox(true);
    const intervalId = window.setInterval(() => {
      void loadInbox(false);
    }, 8000);

    const handleVisibilityRefresh = () => {
      if (document.visibilityState === 'visible') {
        void loadInbox(false);
      }
    };

    window.addEventListener('focus', handleVisibilityRefresh);
    document.addEventListener('visibilitychange', handleVisibilityRefresh);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleVisibilityRefresh);
      document.removeEventListener('visibilitychange', handleVisibilityRefresh);
    };
  }, []);

  if (loading) return <LoadingCenter size="lg" />;

  return (
    <div>
      <Header title="Messages" />

      <div style={{ padding: 'var(--space-4)' }}>
        {conversations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-12) var(--space-4)', color: 'var(--color-gray-500)' }}>
            <div style={{ marginBottom: 'var(--space-2)', color: 'var(--color-gray-400)' }}><MessageBubbleIcon size={40} /></div>
            <p style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-1)' }}>
              No messages yet
            </p>
            <p style={{ fontSize: 'var(--font-size-sm)' }}>
              Visit an organization's profile to start a conversation.
            </p>
          </div>
        ) : (
          conversations.map(conv => (
            <Card
              key={conv.otherOrgId}
              style={{ marginBottom: 'var(--space-3)', cursor: 'pointer' }}
              onClick={() => navigate(`/messages/${conv.otherOrgId}`)}
            >
              <CardBody>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <Avatar name={conv.otherOrg.name} src={conv.otherOrg.logoUrl} size="md" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
                      <h3 style={{
                        fontWeight: 'var(--font-weight-semibold)',
                        fontSize: 'var(--font-size-base)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {conv.otherOrg.name}
                      </h3>
                      <Badge>{conv.isConnected ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><HandshakeIcon size={14} /> Connected</span> : 'Not Connected'}</Badge>
                    </div>
                    <p style={{
                      fontSize: 'var(--font-size-sm)',
                      color: conv.unreadCount > 0 ? 'var(--color-gray-900)' : 'var(--color-gray-500)',
                      fontWeight: conv.unreadCount > 0 ? 'var(--font-weight-semibold)' : 'var(--font-weight-normal)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {conv.lastMessage.content}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-400)', marginBottom: 'var(--space-1)' }}>
                      {new Date(conv.lastMessage.createdAt).toLocaleDateString()}
                    </p>
                    {conv.unreadCount > 0 && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'var(--color-primary)',
                        color: '#fff',
                        borderRadius: '999px',
                        fontSize: 'var(--font-size-xs)',
                        fontWeight: 'var(--font-weight-bold)',
                        minWidth: '20px',
                        height: '20px',
                        padding: '0 6px',
                      }}>
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
