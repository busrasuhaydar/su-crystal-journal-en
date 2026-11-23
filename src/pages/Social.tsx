import { PageHead } from '../components/Shell';
import { PostList } from '../components/PostList';
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useEditors } from '../components/Editors';
import { usePosts } from '../lib/data';

export default function SocialPage() {
  const posts = usePosts();
  const [params, setParams] = useSearchParams();
  const { openPost } = useEditors();
  const target = params.get('content');
  useEffect(() => {
    const p = target && posts.data?.find((x) => x.id === target);
    if (p) { openPost(p); setParams({}, { replace: true }); }
  }, [target, posts.data, openPost, setParams]);
  return (
    <>
      <PageHead title="Social Media" />
      <p className="small muted" style={{ margin: 0 }}>Content created from projects is here too. Each piece of content is a single record; the same record appears in the calendar, the journal page and the project’s own tab.</p>
      <section className="glass panel"><PostList posts={posts.data ?? []} loading={posts.isLoading} /></section>
    </>
  );
}
