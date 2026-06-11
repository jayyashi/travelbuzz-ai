'use client';
import { useParams, Link, Navigate } from '../lib/router';
import { usePageMeta } from '../hooks/usePageMeta';
import { AppFooter } from '../components/AppFooter';
import { BLOG_POSTS } from '../data/blogPosts';
import { PublicHeader } from '../components/PublicHeader';

export function BlogPost() {
    const { slug } = useParams<{ slug: string }>();
    const post = BLOG_POSTS.find(p => p.slug === slug);

    usePageMeta(
        post ? `${post.title} — TravelBuzz.ai` : 'Blog — TravelBuzz.ai',
        post?.metaDescription
    );

    if (!post) return <Navigate to="/blog" replace />;

    const related = BLOG_POSTS.filter(p => p.slug !== slug).slice(0, 2);

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: post.title,
        description: post.metaDescription,
        author: { '@type': 'Organization', name: 'TravelBuzz.ai', url: 'https://travelbuzz.ai' },
        publisher: { '@type': 'Organization', name: 'TravelBuzz.ai', logo: { '@type': 'ImageObject', url: 'https://travelbuzz.ai/icon-512.png' } },
        datePublished: post.date,
        dateModified: post.date,
        mainEntityOfPage: { '@type': 'WebPage', '@id': `https://travelbuzz.ai/blog/${post.slug}` },
        keywords: post.keywords.join(', '),
    };

    return (
        <div style={{ minHeight: '100vh', background: '#050a18', color: '#fff' }}>
            {/* JSON-LD */}
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

            <PublicHeader />

            <main style={{ maxWidth: '760px', margin: '0 auto', padding: '48px 20px 80px' }}>
                {/* Breadcrumb */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '32px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)' }}>
                    <Link to="/blog" style={{ color: '#D4AF37', textDecoration: 'none', fontWeight: 600 }}>Blog</Link>
                    <span>›</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.category}</span>
                </div>

                {/* Article header */}
                <div style={{ marginBottom: '40px' }}>
                    <div style={{ fontSize: '52px', marginBottom: '20px' }}>{post.coverEmoji}</div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
                        <span style={{ background: 'rgba(212,175,55,0.12)', color: '#D4AF37', fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{post.category}</span>
                        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.78rem' }}>{post.readTime}</span>
                        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.78rem' }}>·</span>
                        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.78rem' }}>{new Date(post.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </div>
                    <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 800, lineHeight: 1.2, margin: '0 0 20px', color: '#fff' }}>{post.title}</h1>
                    <p style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, margin: 0, borderLeft: '3px solid rgba(212,175,55,0.5)', paddingLeft: '16px' }}>{post.excerpt}</p>
                </div>

                {/* Divider */}
                <div style={{ height: '1px', background: 'linear-gradient(90deg, rgba(212,175,55,0.3), transparent)', marginBottom: '40px' }} />

                {/* Article body */}
                <div
                    className="blog-content"
                    dangerouslySetInnerHTML={{ __html: post.content }}
                    style={{ fontSize: '1rem', lineHeight: 1.85, color: 'rgba(255,255,255,0.78)' }}
                />

                {/* CTA */}
                <div style={{ marginTop: '56px', padding: '36px', background: 'linear-gradient(135deg, rgba(212,175,55,0.08), rgba(108,99,255,0.08))', border: '1px solid rgba(212,175,55,0.2)', borderRadius: '20px', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '12px' }}>✨</div>
                    <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 10px' }}>Try TravelBuzz.ai Free</h3>
                    <p style={{ color: 'rgba(255,255,255,0.5)', margin: '0 0 24px', fontSize: '0.9rem', lineHeight: 1.6 }}>AI itineraries, WhatsApp alerts, shareable trip links — everything in one platform for travel agents.</p>
                    <Link to="/signup" style={{ display: 'inline-block', background: 'linear-gradient(135deg,#D4AF37,#c9a227)', color: '#000', fontWeight: 700, padding: '12px 32px', borderRadius: '12px', textDecoration: 'none', fontSize: '0.95rem' }}>
                        Get Started Free →
                    </Link>
                </div>

                {/* Related posts */}
                {related.length > 0 && (
                    <div style={{ marginTop: '56px' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '20px' }}>More Articles</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                            {related.map(r => (
                                <Link key={r.slug} to={`/blog/${r.slug}`} style={{ textDecoration: 'none' }}>
                                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '20px', display: 'flex', gap: '14px', alignItems: 'flex-start', transition: 'border-color 0.2s' }}
                                        onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(212,175,55,0.3)')}
                                        onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
                                    >
                                        <span style={{ fontSize: '28px', flexShrink: 0 }}>{r.coverEmoji}</span>
                                        <div>
                                            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff', lineHeight: 1.4, marginBottom: '6px' }}>{r.title}</div>
                                            <span style={{ color: '#D4AF37', fontSize: '0.78rem', fontWeight: 600 }}>Read →</span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            <AppFooter />

            <style>{`
                .blog-content h2 { font-size: 1.4rem; font-weight: 800; color: #fff; margin: 2rem 0 1rem; line-height: 1.3; }
                .blog-content h3 { font-size: 1.1rem; font-weight: 700; color: rgba(255,255,255,0.9); margin: 1.5rem 0 0.75rem; }
                .blog-content p { margin: 0 0 1.2rem; }
                .blog-content ul, .blog-content ol { margin: 0 0 1.2rem 1.5rem; display: flex; flex-direction: column; gap: 6px; }
                .blog-content li { color: rgba(255,255,255,0.75); }
                .blog-content strong { color: #fff; font-weight: 700; }
                .blog-content a { color: #D4AF37; text-decoration: underline; }
            `}</style>
        </div>
    );
}
