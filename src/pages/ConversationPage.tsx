import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import Header from '../components/ui/Header';
import Badge from '../components/ui/Badge';
import { LoadingCenter } from '../components/ui/Loading';
import HandshakeIcon from '../components/ui/HandshakeIcon';
import { WarningIcon } from '../components/ui/Icons';

interface MessageItem {
  id: number;
  senderOrgId: number;
  receiverOrgId: number;
  content: string;
  readAt: string | null;
  createdAt: string;
}

interface ConversationData {
  otherOrg: {
    id: number;
    name: string;
    logoUrl?: string;
    category: string;
  };
  isConnected: boolean;
  messages: MessageItem[];
  sentCount: number;
  maxMessages: number | null;
}

export default function ConversationPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<ConversationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get<ConversationData>(`/messages/conversation/${orgId}`)
      .then(setData)
      .catch(() => navigate('/inbox', { replace: true }))
      .finally(() => setLoading(false));
  }, [orgId, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data?.messages.length]);

  const handleSend = async () => {
    if (!newMessage.trim() || !data || sending) return;
    setSending(true);
    try {
      const msg = await api.post<MessageItem>('/messages', {
        receiverOrgId: Number(orgId),
        content: newMessage.trim(),
      });
      setData({
        ...data,
        messages: [...data.messages, msg],
        sentCount: data.sentCount + 1,
      });
      setNewMessage('');
    } catch {
      /* error handled by api service */
    } finally {
      setSending(false);
    }
  };

  if (loading) return <LoadingCenter size="lg" />;
  if (!data) return null;

  const canSend = data.isConnected || data.sentCount < (data.maxMessages ?? Infinity);
  const remaining = data.maxMessages !== null ? data.maxMessages - data.sentCount : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Header
        title={data.otherOrg.name}
        showBack
        actions={
          <Badge>{data.isConnected ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><HandshakeIcon size={14} /> Connected</span> : 'Not Connected'}</Badge>
        }
      />

      {/* Messages area */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: 'var(--space-4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-2)',
      }}>
        {data.messages.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--color-gray-400)', padding: 'var(--space-8)' }}>
            Start the conversation!
          </p>
        )}
        {data.messages.map(msg => {
          const isMine = msg.senderOrgId !== Number(orgId);
          return (
            <div
              key={msg.id}
              style={{
                alignSelf: isMine ? 'flex-end' : 'flex-start',
                maxWidth: '75%',
              }}
            >
              <div style={{
                background: isMine ? 'var(--color-primary)' : 'var(--color-gray-100)',
                color: isMine ? '#fff' : 'var(--color-gray-900)',
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: '16px',
                borderBottomRightRadius: isMine ? '4px' : '16px',
                borderBottomLeftRadius: isMine ? '16px' : '4px',
                fontSize: 'var(--font-size-sm)',
                lineHeight: '1.5',
                wordBreak: 'break-word',
              }}>
                {msg.content}
              </div>
              <p style={{
                fontSize: '10px',
                color: 'var(--color-gray-400)',
                marginTop: '2px',
                textAlign: isMine ? 'right' : 'left',
              }}>
                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Limit warning */}
      {!data.isConnected && remaining !== null && remaining <= 1 && remaining > 0 && (
        <div style={{
          textAlign: 'center',
          padding: 'var(--space-2) var(--space-4)',
          background: 'var(--color-warning-light, #fff8e1)',
          fontSize: 'var(--font-size-xs)',
          color: 'var(--color-gray-600)',
        }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><WarningIcon size={14} /> {remaining} message{remaining === 1 ? '' : 's'} remaining</span> — connect to send unlimited messages
        </div>
      )}

      {/* Input area */}
      <div style={{
        display: 'flex',
        gap: 'var(--space-2)',
        padding: 'var(--space-3) var(--space-4)',
        paddingBottom: 'calc(var(--safe-area-bottom, 0px) + var(--space-3))',
        borderTop: '1px solid var(--color-gray-200)',
        background: 'var(--color-background, #fff)',
      }}>
        {canSend ? (
          <>
            <input
              type="text"
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Type a message..."
              maxLength={2000}
              style={{
                flex: 1,
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: '999px',
                border: '1px solid var(--color-gray-300)',
                fontSize: 'var(--font-size-sm)',
                outline: 'none',
              }}
            />
            <button
              onClick={handleSend}
              disabled={!newMessage.trim() || sending}
              style={{
                background: 'var(--color-primary)',
                color: '#fff',
                border: 'none',
                borderRadius: '999px',
                padding: 'var(--space-2) var(--space-3)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-semibold)',
                cursor: 'pointer',
                opacity: !newMessage.trim() || sending ? 0.5 : 1,
              }}
            >
              {sending ? '...' : 'Send'}
            </button>
          </>
        ) : (
          <p style={{
            flex: 1,
            textAlign: 'center',
            color: 'var(--color-gray-500)',
            fontSize: 'var(--font-size-sm)',
            padding: 'var(--space-2)',
          }}>
            Message limit reached — connect with this org to continue
          </p>
        )}
      </div>
    </div>
  );
}
