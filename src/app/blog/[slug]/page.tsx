import { Suspense } from 'react';
import type { Metadata } from 'next';
import { BLOG_POSTS } from '@/data/blogPosts';
import { BlogPost } from '@/views/BlogPost';

export async function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) return { title: 'Blog | TravelBuzz.ai' };
  return {
    title: `${post.title} — TravelBuzz.ai`,
    description: post.metaDescription,
    openGraph: { title: post.title, description: post.metaDescription, type: 'article' },
    twitter: { card: 'summary_large_image', title: post.title, description: post.metaDescription },
  };
}

export default function Page() { return <Suspense><BlogPost /></Suspense>; }
