import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import Card, { CardBody, CardHeader, CardFooter } from '../components/ui/Card';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import { LoadingCenter } from '../components/ui/Loading';
import styles from './FeedPage.module.css';

interface Recommendation {
  id: number;
  name: string;
  mission: string;
  category: string;
  logoUrl?: string;
  reason: string;
}

interface Post {
  id: number;
  title: string;
  content: string;
  type: string;
  createdAt: string;
  author: { name: string; avatarUrl?: string };
  organization: { name: string };
  _count?: { reactions: number };
}

export default function FeedPage() {
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFeed() {
      try {
        const [recsData, postsData] = await Promise.all([
          api.get<Recommendation[]>('/feed/recommendations').catch(() => []),
          api.get<Post[]>('/feed/posts').catch(() => []),
        ]);
        setRecommendations(recsData);
        setPosts(postsData);
      } finally {
        setLoading(false);
      }
    }
    loadFeed();
  }, []);

  if (loading) return <LoadingCenter size="lg" />;

  return (
    <div className={styles.page}>
      <div className={styles.feedHeader}>
        <span className={styles.brand}>Catalyze</span>
        <button className={styles.newPostBtn} onClick={() => navigate('/create-post')}>
          +
        </button>
      </div>

      {/* AI Recommendations */}
      {recommendations.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Recommended for You</h2>
          <div className={styles.recommendationsScroll}>
            {recommendations.map((rec) => (
              <Card
                key={rec.id}
                className={styles.recCard}
                clickable
                onClick={() => navigate(`/org/${rec.id}`)}
              >
                <CardBody>
                  <Badge>{rec.category}</Badge>
                  <p className={styles.orgName}>{rec.name}</p>
                  <p className={styles.orgMission}>{rec.mission}</p>
                  <p className={styles.recReason}>✨ {rec.reason}</p>
                </CardBody>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Posts Feed */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Latest from Your Network</h2>
        {posts.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📢</div>
            <h3 className={styles.emptyTitle}>No posts yet</h3>
            <p className={styles.emptyText}>
              Connect with other organizations to see their tips and experiences here.
            </p>
          </div>
        ) : (
          posts.map((post) => (
            <Card key={post.id} className={styles.postCard}>
              <CardHeader>
                <div className={styles.postHeader}>
                  <Avatar name={post.author.name} src={post.author.avatarUrl} size="sm" />
                  <div>
                    <p className={styles.postAuthor}>{post.author.name}</p>
                    <p className={styles.postTime}>
                      {post.organization.name} · {new Date(post.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardBody>
                <Badge variant={post.type === 'tip' ? 'success' : post.type === 'experience' ? 'primary' : 'neutral'}>
                  {post.type}
                </Badge>
                <h3 className={styles.postTitle}>{post.title}</h3>
                <p className={styles.postContent}>{post.content}</p>
              </CardBody>
              <CardFooter>
                <div className={styles.postActions}>
                  <button className={styles.postAction}>
                    ❤️ {post._count?.reactions || 0}
                  </button>
                </div>
              </CardFooter>
            </Card>
          ))
        )}
      </section>
    </div>
  );
}
