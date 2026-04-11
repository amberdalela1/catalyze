import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import Header from '../components/ui/Header';
import TextInput from '../components/ui/TextInput';
import Button from '../components/ui/Button';
import Card, { CardBody } from '../components/ui/Card';
import { MediaUploader } from '../components/ui/MediaCollage';
import { LightbulbIcon, BookIcon, MegaphoneIcon } from '../components/ui/Icons';

const POST_TYPES = [
  { value: 'tip', label: 'Tip', icon: <LightbulbIcon size={16} />, description: 'Share a helpful tip' },
  { value: 'experience', label: 'Experience', icon: <BookIcon size={16} />, description: 'Share a story or lesson learned' },
  { value: 'announcement', label: 'Announcement', icon: <MegaphoneIcon size={16} />, description: 'Announce something new' },
];

export default function CreatePostPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState('tip');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const post = await api.post<{ id: number; orgId: number }>('/posts', { title, content, type });

      // Upload media if any
      if (mediaFiles.length > 0) {
        const formData = new FormData();
        formData.append('orgId', String(post.orgId));
        formData.append('postId', String(post.id));
        mediaFiles.forEach((f) => formData.append('files', f));
        await api.upload('/media/upload', formData);
      }

      navigate('/feed', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Header title="Create Post" showBack />

      <div style={{ padding: 'var(--space-4)' }}>
        <Card>
          <CardBody>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div>
                <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-gray-700)', display: 'block', marginBottom: 'var(--space-2)' }}>
                  Post Type
                </label>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  {POST_TYPES.map((pt) => (
                    <button
                      key={pt.value}
                      type="button"
                      onClick={() => setType(pt.value)}
                      style={{
                        flex: 1,
                        padding: 'var(--space-3)',
                        borderRadius: 'var(--radius-lg)',
                        border: type === pt.value ? '2px solid var(--color-primary)' : '1.5px solid var(--color-gray-200)',
                        backgroundColor: type === pt.value ? 'var(--color-primary-50)' : 'var(--color-white)',
                        textAlign: 'center',
                        fontSize: 'var(--font-size-sm)',
                        fontWeight: 'var(--font-weight-medium)',
                        color: type === pt.value ? 'var(--color-primary)' : 'var(--color-gray-600)',
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>{pt.icon} {pt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <TextInput
                label="Title"
                placeholder="What's your post about?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />

              <div>
                <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-gray-700)', display: 'block', marginBottom: 'var(--space-1)' }}>
                  Content
                </label>
                <textarea
                  placeholder="Share your thoughts, tips, or experiences..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                  rows={8}
                  style={{
                    width: '100%',
                    padding: 'var(--space-3) var(--space-4)',
                    fontSize: 'var(--font-size-base)',
                    border: '1.5px solid var(--color-gray-300)',
                    borderRadius: 'var(--radius-lg)',
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    lineHeight: '1.5',
                  }}
                />
              </div>

              <MediaUploader
                files={mediaFiles}
                onFilesChange={setMediaFiles}
                label="Photos & Videos"
              />

              {error && (
                <p style={{ color: 'var(--color-error)', fontSize: 'var(--font-size-sm)' }}>{error}</p>
              )}

              <Button type="submit" fullWidth disabled={loading}>
                {loading ? 'Publishing...' : 'Publish Post'}
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
