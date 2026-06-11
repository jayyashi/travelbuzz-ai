'use client';
import { Link } from '../lib/router';
import { usePageMeta } from '../hooks/usePageMeta';
import { AppFooter } from '../components/AppFooter';
import { BLOG_POSTS } from '../data/blogPosts';
import { PublicHeader } from '../components/PublicHeader';

export function Blog() {
    usePageMeta(
        'Blog — TravelBuzz.ai | Travel Agent Tips & AI Travel Guides',
        'Expert guides for travel agents — AI itinerary building, WhatsApp automation, group expense splitting, and more. Stay ahead with TravelBuzz.ai.'
    );

    return (
        <div style={{ minHeight: '100vh', background: '#050a18', color: '#fff' }}>
            <PublicHeader />

            <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '60px 20px 100px' }}>
                {/* Hero */}
                <div style={{ marginBottom: '56px' }}>
                    <div style={{ display: 'inline-block', background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '20px', padding: '5px 14px', fontSize: '0.78rem', fontWeight: 700, color: '#D4AF37', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '18px' }}>
                        TravelBuzz Blog
                    </div>
                    <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 800, margin: '0 0 16px', lineHeight: 1.2 }}>
                        Guides for Modern Travel Agents
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1.05rem', maxWidth: '560px', lineHeight: 1.7, margin: 0 }}>
                        AI tools, WhatsApp automation, client experience tips — everything you need to run a more efficient, more profitable travel agency.
                    </p>
                </div>

                {/* Featured post */}
                <Link to={`/blog/${BLOG_POSTS[0].slug}`} style={{ textDecoration: 'none', display: 'block', marginBottom: '48px' }}>
                    <div style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.08), rgba(108,99,255,0.08))', border: '1px solid rgba(212,175,55,0.2)', borderRadius: '20px', padding: '40px', display: 'grid', gridTemplateColumns: '1fr auto', gap: '32px', alignItems: 'center', transition: 'border-color 0.2s' }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(212,175,55,0.45)')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(212,175,55,0.2)')}
                    >
                        <div>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap' }}>
                                <span style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37', fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Featured</span>
                                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>{BLOG_POSTS[0].category}</span>
                                <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem' }}>·</span>
                                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>{BLOG_POSTS[0].readTime}</span>
                            </div>
                            <h2 style={{ fontSize: 'clamp(1.2rem, 3vw, 1.75rem)', fontWeight: 800, color: '#fff', margin: '0 0 12px', lineHeight: 1.3 }}>{BLOG_POSTS[0].title}</h2>
                            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.95rem', lineHeight: 1.7, margin: '0 0 20px' }}>{BLOG_POSTS[0].excerpt}</p>
                            <span style={{ color: '#D4AF37', fontSize: '0.88rem', fontWeight: 700 }}>Read article →</span>
                        </div>
                        <div style={{ fontSize: '80px', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100px', height: '100px', background: 'rgba(255,255,255,0.04)', borderRadius: '20px', flexShrink: 0 }}>
                            {BLOG_POSTS[0].coverEmoji}
                        </div>
                    </div>
                </Link>

                {/* Post grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                    {BLOG_POSTS.slice(1).map(post => (
                        <Link key={post.slug} to={`/blog/${post.slug}`} style={{ textDecoration: 'none' }}>
                            <article style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '28px', height: '100%', display: 'flex', flexDirection: 'column', gap: '14px', transition: 'border-color 0.2s, background 0.2s', cursor: 'pointer' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,175,55,0.3)'; (e.currentTarget as HTMLElement).style.background = 'rgba(212,175,55,0.04)'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
                            >
                                <div style={{ fontSize: '36px', lineHeight: 1 }}>{post.coverEmoji}</div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <span style={{ color: '#D4AF37', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{post.category}</span>
                                    <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.7rem' }}>·</span>
                                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem' }}>{post.readTime}</span>
                                </div>
                                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.4 }}>{post.title}</h2>
                                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem', lineHeight: 1.65, margin: 0, flex: 1 }}>{post.excerpt}</p>
                                <span style={{ color: '#D4AF37', fontSize: '0.82rem', fontWeight: 600 }}>Read →</span>
                            </article>
                        </Link>
                    ))}
                </div>
            </main>

            <AppFooter />
        </div>
    );
}
