'use client';

import { useEffect, useState } from 'react';
import Icon from './icons';
import { I18N, PRODUCTS, CHAN, ST, AUTHORS, POSTS, VARIANTS, GEN } from './data';

const ACTIVE = 'var(--color-accent-100)', ACTIVE_C = 'var(--color-accent-800)', IDLE_C = 'var(--color-neutral-700)';
const CHAN_NAME = { FB: 'Facebook', IG: 'Instagram', TT: 'TikTok' };
const STATUSES = ['idea', 'draft', 'review', 'approved', 'published'];
const DASH = 2 * Math.PI * 27;
const arc = (v) => `${(v / 100) * DASH} ${DASH}`;
const scoreColor = (v) => v == null ? 'var(--color-neutral-500)' : v >= 90 ? 'var(--color-accent-2-700)' : v >= 80 ? 'var(--color-accent-700)' : 'var(--color-neutral-700)';

// pill (filter chip / tone / channel / tab). `on` decides accent fill.
function Pill({ on, onClick, children, pad = '5px 12px', fontSize = 12 }) {
  return (
    <button onClick={onClick} style={{
      border: `1px solid ${on ? 'var(--color-accent)' : 'var(--color-divider)'}`, cursor: 'pointer',
      padding: pad, borderRadius: 999, fontSize, fontWeight: 600,
      background: on ? 'var(--color-accent)' : 'var(--color-neutral-100)',
      color: on ? 'var(--color-bg)' : 'var(--color-neutral-800)',
    }}>{children}</button>
  );
}

function ChanChip({ c, w = 26, h = 20, r = 7, fs = 9.5 }) {
  return <span style={{ width: w, height: h, borderRadius: r, background: c.bg, color: c.fg, display: 'grid', placeItems: 'center', fontSize: fs, fontWeight: 700 }}>{c.tag}</span>;
}

function Donut({ score, size = 66, fontSize = 17 }) {
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <svg width={size} height={size} viewBox="0 0 66 66">
        <circle cx="33" cy="33" r="27" fill="none" stroke="var(--color-neutral-200)" strokeWidth="7" />
        <circle cx="33" cy="33" r="27" fill="none" stroke="var(--color-accent-2-500)" strokeWidth="7" strokeLinecap="round" strokeDasharray={arc(score)} transform="rotate(-90 33 33)" />
      </svg>
      <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize, fontWeight: 700 }}>{score}</span>
    </div>
  );
}

const Logo = ({ box = 42, radius = 14, icon = 22, font = 22 }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: box > 34 ? 10 : 9 }}>
    <div style={{ width: box, height: box, borderRadius: radius, background: 'var(--color-accent)', display: 'grid', placeItems: 'center', flex: 'none' }}>
      <Icon name="pen" size={icon} stroke="var(--color-bg)" />
    </div>
    <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: font }}>de <span style={{ color: 'var(--color-accent)' }}>Writer</span></div>
  </div>
);

export default function Page() {
  const [s, set] = useState({
    lang: 'vi', screen: 'login', view: 'list', product: 'sunrise', filter: 'all', query: '',
    edIdea: '', edKw: '', edTone: 'friendly', edLen: 'med', edChans: { FB: true, IG: true, TT: false },
    generating: false, hasDraft: false, edTitle: '', edBody: '', edMeta: '', edScore: 84,
    dTab: 'FB', dStatus: null, dToastMsg: '',
    voiceTone: 'friendly', isMobile: false,
  });
  const patch = (o) => set((p) => ({ ...p, ...o }));

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 760px)');
    const onMq = () => patch({ isMobile: mq.matches });
    mq.addEventListener('change', onMq);
    onMq();
    return () => mq.removeEventListener('change', onMq);
  }, []);

  const go = (screen) => { patch({ screen, dToastMsg: '' }); window.scrollTo(0, 0); };

  const { lang, screen, view, isMobile } = s;
  const t = I18N[lang];
  const isDesktop = !isMobile;
  const product = PRODUCTS.find((p) => p.id === s.product) || PRODUCTS[0];

  const nav = [
    { key: 'dash', icon: 'dashboard', label: t.nav_dash, go: () => go('dash') },
    { key: 'posts', icon: 'file', label: t.nav_posts, go: () => go('posts') },
    { key: 'editor', icon: 'sparkles', label: t.nav_new, go: () => go('editor') },
    { key: 'settings', icon: 'settings', label: t.nav_settings, go: () => go('settings') },
  ];
  const navOn = (k) => screen === k || (k === 'posts' && screen === 'detail');

  const chanChip = (c) => CHAN[c];
  const mkPost = (p) => {
    const st = ST[p.status], av = AUTHORS[p.author];
    return {
      ...p, score: p.score == null ? '—' : p.score, stLabel: t.status[p.status], stBg: st.bg, stFg: st.fg,
      scoreColor: scoreColor(p.score), avatar: av[0], avBg: av[1], avFg: av[2],
      chans: p.chans.map(chanChip), open: () => patch({ screen: 'detail', dStatus: null, dToastMsg: '' }),
    };
  };

  const q = s.query.toLowerCase();
  const prodPosts = POSTS.filter((p) => p.product === product.id);
  const filtered = prodPosts.filter((p) => (s.filter === 'all' || p.status === s.filter) && (!q || p.title.toLowerCase().includes(q) || p.excerpt.toLowerCase().includes(q)));
  const filters = [{ key: 'all', label: t.filter_all, count: prodPosts.length }, ...STATUSES.map((k) => ({ key: k, label: t.status[k], count: prodPosts.filter((p) => p.status === k).length }))];
  const kanban = STATUSES.map((k) => ({ label: t.status[k], color: ST[k].color, count: filtered.filter((p) => p.status === k).length, items: filtered.filter((p) => p.status === k).map(mkPost) }));

  const toneList = [{ key: 'friendly', label: t.tone_friendly }, { key: 'pro', label: t.tone_pro }, { key: 'fun', label: t.tone_fun }];
  const lenList = [{ key: 'short', label: t.len_short }, { key: 'med', label: t.len_med }, { key: 'long', label: t.len_long }];

  const dPostRaw = POSTS.find((p) => p.id === 2);
  const dStatus = s.dStatus ?? dPostRaw.status;
  const dPost = { ...mkPost({ ...dPostRaw, status: dStatus }), meta: dPostRaw.meta };

  const chanCounts = { FB: prodPosts.filter((p) => p.chans.includes('FB')).length, IG: prodPosts.filter((p) => p.chans.includes('IG')).length, TT: prodPosts.filter((p) => p.chans.includes('TT')).length };
  const maxChan = Math.max(1, ...Object.values(chanCounts));
  const weeklyData = product.id === 'sunrise' ? [3, 5, 4, 6] : [2, 4, 3, 5];

  const stats = [
    { label: t.stat_month, value: prodPosts.length + 13, color: 'var(--color-text)', trend: '+18%', trendColor: 'var(--color-accent-2-700)' },
    { label: t.stat_pending, value: prodPosts.filter((p) => p.status === 'review').length, color: 'var(--color-accent-700)', trend: lang === 'vi' ? 'cần bạn duyệt' : 'needs your review', trendColor: 'var(--color-neutral-600)' },
    { label: t.stat_pub, value: prodPosts.filter((p) => p.status === 'published').length + 10, color: 'var(--color-text)', trend: '+3', trendColor: 'var(--color-accent-2-700)' },
    { label: t.stat_score, value: 87, color: 'var(--color-accent-2-700)', trend: '+2.4', trendColor: 'var(--color-accent-2-700)' },
  ];
  const weekly = weeklyData.map((v, i) => ({ h: (v / 6) * 100, label: (lang === 'vi' ? 'T' : 'W') + (i + 1), color: i === weeklyData.length - 1 ? 'var(--color-accent)' : 'var(--color-accent-300)' }));
  const chanStats = Object.entries(chanCounts).filter(([, n]) => n > 0).map(([k, n]) => ({ ...CHAN[k], n, w: (n / maxChan) * 100, barColor: k === 'FB' ? 'var(--color-accent-2-500)' : k === 'IG' ? 'var(--color-accent-500)' : 'var(--color-neutral-500)' }));
  const activity = product.id === 'sunrise' ? [
    { text: lang === 'vi' ? 'AI tạo nháp “Combo phòng + spa tháng 8”' : 'AI drafted “August room + spa combo”', when: '16/07', color: 'var(--color-accent)' },
    { text: lang === 'vi' ? 'Minh Anh gửi duyệt “Top 5 trải nghiệm spa”' : 'Minh Anh submitted “Top 5 spa experiences”', when: '15/07', color: 'var(--color-accent-600)' },
    { text: lang === 'vi' ? 'Mai Lan duyệt “Buffet hải sản tối thứ 6”' : 'Mai Lan approved “Friday seafood buffet”', when: '14/07', color: 'var(--color-accent-2-600)' },
    { text: lang === 'vi' ? 'Đã đăng “Ưu đãi hè 2026” lên FB, IG' : 'Published “Summer 2026 deal” to FB, IG', when: '12/07', color: 'var(--color-accent-2-700)' },
  ] : [
    { text: lang === 'vi' ? 'AI tạo nháp “Vi nhựa trong nước uống”' : 'AI drafted “Microplastics in water”', when: '16/07', color: 'var(--color-accent)' },
    { text: lang === 'vi' ? 'Thu Trang gửi duyệt “Phân loại rác tại nguồn”' : 'Thu Trang submitted “Sorting waste at source”', when: '15/07', color: 'var(--color-accent-600)' },
    { text: lang === 'vi' ? 'Huy Phạm duyệt “Ngày hội tái chế 26/07”' : 'Huy Phạm approved “Recycling day Jul 26”', when: '13/07', color: 'var(--color-accent-2-600)' },
    { text: lang === 'vi' ? 'Đã đăng “Một triệu cây xanh — quý 2”' : 'Published “One million trees — Q2”', when: '10/07', color: 'var(--color-accent-2-700)' },
  ];

  const generate = () => {
    if (s.generating) return;
    patch({ generating: true, hasDraft: false });
    setTimeout(() => patch({ generating: false, hasDraft: true, edTitle: GEN.title, edBody: GEN.body, edMeta: GEN.meta, edScore: 84 }), 1500);
  };
  const boostSeo = () => patch({ edScore: Math.min(96, s.edScore + 4), edMeta: GEN.meta });
  const submitReview = () => { go('detail'); patch({ dStatus: 'review' }); };
  const approvePost = () => patch({ dStatus: 'approved', dToastMsg: t.dt_approved_msg });
  const requestEdit = () => patch({ dStatus: 'draft', dToastMsg: t.dt_request_msg });

  const dBreakdown = [{ label: t.sc_seo, v: 90 }, { label: t.sc_engage, v: 85 }, { label: t.sc_brand, v: 92 }, { label: t.sc_read, v: 88 }].map((x) => ({ ...x, color: x.v >= 90 ? 'var(--color-accent-2-500)' : 'var(--color-accent-400)' }));
  const dActivity = [
    { text: lang === 'vi' ? 'AI tạo bản nháp từ ý tưởng của Minh Anh' : 'AI drafted from Minh Anh’s idea', when: '14/07', color: 'var(--color-accent)' },
    { text: lang === 'vi' ? 'Minh Anh biên tập và thêm biến thể TikTok' : 'Minh Anh edited, added TikTok variant', when: '15/07', color: 'var(--color-accent-600)' },
    { text: lang === 'vi' ? 'Gửi duyệt tới Mai Lan' : 'Submitted to Mai Lan for review', when: '15/07', color: 'var(--color-accent-700)' },
  ];
  const prompts = [
    { name: lang === 'vi' ? 'Bài khuyến mãi (FB + IG)' : 'Promo post (FB + IG)', desc: lang === 'vi' ? 'Hook → lợi ích → điều kiện → CTA đặt ngay' : 'Hook → benefits → terms → booking CTA' },
    { name: lang === 'vi' ? 'Kịch bản TikTok 30s' : '30s TikTok script', desc: lang === 'vi' ? '4 cảnh, chữ trên màn hình, CTA link bio' : '4 scenes, on-screen text, link-in-bio CTA' },
    { name: lang === 'vi' ? 'Bài giáo dục / chia sẻ' : 'Educational post', desc: lang === 'vi' ? 'Vấn đề → 3-5 điều nên làm → nguồn tham khảo' : 'Problem → 3-5 tips → sources' },
  ];
  const team = [
    { name: 'Mai Lan', email: 'lan@studio.vn', role: lang === 'vi' ? 'Trưởng nhóm' : 'Lead', avatar: 'ML', bg: 'var(--color-accent-2-300)', fg: 'var(--color-accent-2-900)' },
    { name: 'Minh Anh', email: 'anh@studio.vn', role: lang === 'vi' ? 'Biên tập' : 'Editor', avatar: 'MA', bg: 'var(--color-accent-300)', fg: 'var(--color-accent-900)' },
    { name: 'Thu Trang', email: 'trang@studio.vn', role: 'Content', avatar: 'TT', bg: 'var(--color-neutral-300)', fg: 'var(--color-neutral-900)' },
    { name: 'Huy Phạm', email: 'huy@studio.vn', role: lang === 'vi' ? 'Cộng tác' : 'Contributor', avatar: 'HP', bg: 'var(--color-accent-200)', fg: 'var(--color-accent-800)' },
  ];

  const langToggle = (fontSize, pad) => (
    <div style={{ display: 'flex', gap: 4 }}>
      {[['vi', 'VI'], ['en', 'EN']].map(([k, txt]) => (
        <button key={k} onClick={() => patch({ lang: k })} style={{
          border: 'none', cursor: 'pointer', fontSize, fontWeight: 600, padding: pad, borderRadius: 999,
          background: lang === k ? 'var(--color-accent)' : 'var(--color-neutral-200)',
          color: lang === k ? 'var(--color-bg)' : 'var(--color-neutral-700)',
        }}>{txt}</button>
      ))}
    </div>
  );

  // ── Login ──────────────────────────────────────────────────────────────
  if (screen === 'login') {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20, position: 'relative', overflow: 'hidden', background: 'var(--color-bg)', color: 'var(--color-text)', fontFamily: 'var(--font-body)' }}>
        <div style={{ position: 'absolute', width: 420, height: 420, borderRadius: '50%', background: 'var(--color-accent-200)', opacity: .5, top: -160, right: -120 }} />
        <div style={{ position: 'absolute', width: 320, height: 320, borderRadius: '50%', background: 'var(--color-accent-2-200)', opacity: .55, bottom: -140, left: -100 }} />
        <div style={{ position: 'absolute', top: 18, right: 22 }}>{langToggle(12, '5px 12px')}</div>
        <div className="elev-lg" style={{ width: 'min(380px,100%)', background: 'var(--color-neutral-100)', borderRadius: 32, padding: '34px 30px', position: 'relative', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ marginBottom: 4 }}><Logo /></div>
          <div>
            <h3 style={{ fontSize: 22, margin: '0 0 4px' }}>{t.lg_welcome}</h3>
            <p className="text-muted" style={{ margin: 0, fontSize: 13 }}>{t.lg_sub}</p>
          </div>
          <div className="field"><label>{t.lg_email}</label><input className="input" type="email" placeholder="lan@studio.vn" /></div>
          <div className="field"><label>{t.lg_pass}</label><input className="input" type="password" placeholder="••••••••" /></div>
          <button className="btn btn-primary btn-block" onClick={() => go('posts')} style={{ minHeight: 42, fontSize: 15 }}>{t.lg_btn}</button>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <a href="#" onClick={(e) => e.preventDefault()} style={{ fontSize: 12.5 }}>{t.lg_forgot}</a>
            <span className="text-muted" style={{ fontSize: 12 }}>de Writer · 2026</span>
          </div>
          <hr className="hr" style={{ margin: '2px 0' }} />
          <button className="btn btn-secondary btn-block" onClick={() => go('posts')} style={{ marginTop: 0 }}>
            <Icon name="globe" size={15} />{t.lg_google}
          </button>
          <p className="text-muted" style={{ margin: 0, fontSize: 12, textAlign: 'center' }}>{t.lg_note}</p>
        </div>
      </div>
    );
  }

  // ── App shell ──────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--color-bg)', color: 'var(--color-text)', fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.5 }}>
      {isDesktop && (
        <aside style={{ width: 230, flex: 'none', display: 'flex', flexDirection: 'column', gap: 8, padding: '20px 14px', borderRight: '1px solid var(--color-divider)', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>
          <div style={{ padding: '2px 8px 14px' }}><Logo box={34} radius={12} icon={18} font={19} /></div>
          <div style={{ padding: '0 4px' }}>
            <div className="text-muted" style={{ fontSize: 10.5, letterSpacing: '.09em', textTransform: 'uppercase', marginBottom: 6, paddingLeft: 6 }}>{t.product_label}</div>
            {PRODUCTS.map((p) => {
              const on = p.id === product.id;
              return (
                <button key={p.id} onClick={() => patch({ product: p.id, filter: 'all' })} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, border: `1px solid ${on ? 'var(--color-divider)' : 'transparent'}`, background: on ? 'var(--color-neutral-100)' : 'transparent', borderRadius: 16, padding: '8px 10px', cursor: 'pointer', textAlign: 'left', marginBottom: 6 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: p.color, flex: 'none' }} />
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontWeight: 700, fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                    <span className="text-muted" style={{ display: 'block', fontSize: 10.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.desc[lang]}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 6 }}>
            {nav.map((n) => (
              <button key={n.key} onClick={n.go} style={{ display: 'flex', alignItems: 'center', gap: 10, border: 'none', cursor: 'pointer', fontSize: 13.5, fontWeight: 600, padding: '9px 12px', borderRadius: 999, textAlign: 'left', background: navOn(n.key) ? ACTIVE : 'transparent', color: navOn(n.key) ? ACTIVE_C : IDLE_C }}>
                <Icon name={n.icon} /> {n.label}
              </button>
            ))}
          </nav>
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ padding: '0 6px' }}>{langToggle(11.5, '4px 11px')}</div>
            <button onClick={() => go('login')} style={{ display: 'flex', alignItems: 'center', gap: 10, border: 'none', background: 'var(--color-surface)', cursor: 'pointer', borderRadius: 18, padding: '9px 10px', textAlign: 'left' }}>
              <span style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-accent-2-300)', color: 'var(--color-accent-2-900)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 12.5, flex: 'none' }}>ML</span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontWeight: 700, fontSize: 12.5 }}>Mai Lan</span>
                <span className="text-muted" style={{ display: 'block', fontSize: 10.5 }}>{t.role_editor} · {t.nav_logout}</span>
              </span>
            </button>
          </div>
        </aside>
      )}

      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {isMobile && (
          <div style={{ position: 'sticky', top: 0, zIndex: 30, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'color-mix(in srgb, var(--color-bg) 88%, transparent)', backdropFilter: 'blur(8px)' }}>
            <Logo box={30} radius={10} icon={16} font={17} />
            <span style={{ marginRight: 'auto' }} />
            <button onClick={() => { const i = PRODUCTS.findIndex((p) => p.id === product.id); patch({ product: PRODUCTS[(i + 1) % PRODUCTS.length].id, filter: 'all' }); }} style={{ display: 'flex', alignItems: 'center', gap: 7, border: '1px solid var(--color-divider)', background: 'var(--color-neutral-100)', borderRadius: 999, padding: '5px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700, maxWidth: 150 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: product.color, flex: 'none' }} />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.short}</span>
              <Icon name="chevron" size={13} style={{ flex: 'none' }} />
            </button>
          </div>
        )}

        <div style={{ flex: 1, padding: isMobile ? '16px 16px 110px' : '26px 30px 40px', maxWidth: 1160, width: '100%', margin: '0 auto' }}>

          {screen === 'dash' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
                <h2 style={{ fontSize: 26, margin: 0 }}>{t.dash_title}</h2>
                <span className="text-muted" style={{ fontSize: 12.5 }}>{product.name} · {t.dash_period}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 14 }}>
                {stats.map((st2, i) => (
                  <div key={i} className="card" style={{ gap: 2, padding: '16px 18px' }}>
                    <span className="text-muted" style={{ fontSize: 11.5 }}>{st2.label}</span>
                    <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 28, color: st2.color }}>{st2.value}</span>
                    <span style={{ fontSize: 11, color: st2.trendColor }}>{st2.trend}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 12 }}>
                <div className="card" style={{ padding: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><span className="card-title">{t.chart_title}</span><span className="text-muted" style={{ fontSize: 11 }}>{t.chart_unit}</span></div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 120, paddingTop: 8 }}>
                    {weekly.map((b, i) => (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, height: '100%', justifyContent: 'flex-end' }}>
                        <div style={{ width: '100%', maxWidth: 34, borderRadius: '8px 8px 4px 4px', background: b.color, height: `${b.h}%` }} />
                        <span className="text-muted" style={{ fontSize: 10 }}>{b.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="card" style={{ padding: 18 }}>
                    <span className="card-title">{t.chan_title}</span>
                    {chanStats.map((c, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 30, height: 22, borderRadius: 8, background: c.bg, color: c.fg, display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700, flex: 'none' }}>{c.tag}</span>
                        <div style={{ flex: 1, height: 8, borderRadius: 999, background: 'var(--color-neutral-200)', overflow: 'hidden' }}><div style={{ height: '100%', borderRadius: 999, background: c.barColor, width: `${c.w}%` }} /></div>
                        <span style={{ fontSize: 12, fontWeight: 700, width: 22, textAlign: 'right' }}>{c.n}</span>
                      </div>
                    ))}
                  </div>
                  <div className="card" style={{ padding: 18, gap: 10 }}>
                    <span className="card-title">{t.act_title}</span>
                    {activity.map((a, i) => (
                      <div key={i} style={{ display: 'flex', gap: 9, fontSize: 12.5, alignItems: 'baseline' }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: a.color, flex: 'none', position: 'relative', top: -1 }} />
                        <span style={{ flex: 1, minWidth: 0 }}>{a.text}</span>
                        <span className="text-muted" style={{ fontSize: 11, flex: 'none' }}>{a.when}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {screen === 'posts' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
                <h2 style={{ fontSize: 26, margin: 0, marginRight: 'auto' }}>{t.posts_title}</h2>
                <div style={{ position: 'relative', flex: 1, minWidth: 170, maxWidth: 280 }}>
                  <Icon name="search" size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: .5 }} />
                  <input className="input" style={{ paddingLeft: 34, minHeight: 38 }} placeholder={t.search_ph} value={s.query} onChange={(e) => patch({ query: e.target.value })} />
                </div>
                <div className="seg" style={{ borderRadius: 999 }}>
                  <button onClick={() => patch({ view: 'list' })} style={{ border: 'none', cursor: 'pointer', padding: '8px 14px', fontSize: 12.5, fontWeight: 600, background: view === 'list' ? 'var(--color-accent)' : 'transparent', color: view === 'list' ? 'var(--color-bg)' : 'var(--color-neutral-700)' }}>{t.view_list}</button>
                  <button onClick={() => patch({ view: 'kanban' })} style={{ border: 'none', cursor: 'pointer', padding: '8px 14px', fontSize: 12.5, fontWeight: 600, borderLeft: '1px solid var(--color-divider)', background: view === 'kanban' ? 'var(--color-accent)' : 'transparent', color: view === 'kanban' ? 'var(--color-bg)' : 'var(--color-neutral-700)' }}>{t.view_kanban}</button>
                </div>
                <button className="btn btn-primary" onClick={() => go('editor')} style={{ minHeight: 38 }}><Icon name="plus" size={15} />{t.new_post}</button>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                {filters.map((f) => (
                  <Pill key={f.key} on={s.filter === f.key} onClick={() => patch({ filter: f.key })} pad="5px 13px">
                    {f.label} <span style={{ opacity: .65 }}>{f.count}</span>
                  </Pill>
                ))}
              </div>

              {view === 'list' && (
                <div className="card" style={{ padding: '6px 4px', overflowX: 'auto' }}>
                  <table className="table" style={{ minWidth: 640 }}>
                    <thead><tr><th style={{ width: '38%' }}>{t.col_title}</th><th>{t.col_status}</th><th>{t.col_channels}</th><th>{t.col_score}</th><th>{t.col_date}</th><th>{t.col_author}</th></tr></thead>
                    <tbody>
                      {filtered.map(mkPost).map((p) => (
                        <tr key={p.id} onClick={p.open} style={{ cursor: 'pointer' }}>
                          <td><div style={{ fontWeight: 700, fontSize: 13.5 }}>{p.title}</div><div className="text-muted" style={{ fontSize: 11.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 340 }}>{p.excerpt}</div></td>
                          <td><span className="tag" style={{ background: p.stBg, color: p.stFg, whiteSpace: 'nowrap' }}>{p.stLabel}</span></td>
                          <td><div style={{ display: 'flex', gap: 4 }}>{p.chans.map((c, i) => <ChanChip key={i} c={c} />)}</div></td>
                          <td><span style={{ fontWeight: 700, color: p.scoreColor }}>{p.score}</span></td>
                          <td className="text-muted" style={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>{p.date}</td>
                          <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}><span style={{ width: 22, height: 22, borderRadius: '50%', background: p.avBg, color: p.avFg, display: 'grid', placeItems: 'center', fontSize: 9.5, fontWeight: 700 }}>{p.avatar}</span>{p.author}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {view === 'kanban' && (
                <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, alignItems: 'flex-start' }}>
                  {kanban.map((col, ci) => (
                    <div key={ci} style={{ width: 240, flex: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '2px 6px' }}><span style={{ width: 9, height: 9, borderRadius: '50%', background: col.color }} /><span style={{ fontWeight: 700, fontSize: 12.5 }}>{col.label}</span><span className="text-muted" style={{ fontSize: 11.5 }}>{col.count}</span></div>
                      {col.items.map((p) => (
                        <div key={p.id} className="card elev-sm" onClick={p.open} style={{ padding: '13px 14px', gap: 7, cursor: 'pointer', borderRadius: 18 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.35 }}>{p.title}</div>
                          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            {p.chans.map((c, i) => <ChanChip key={i} c={c} w={24} h={18} r={6} fs={9} />)}
                            <span style={{ marginLeft: 'auto', fontSize: 11.5, fontWeight: 700, color: p.scoreColor }}>{p.score}</span>
                          </div>
                          <div className="card-meta"><span style={{ width: 18, height: 18, borderRadius: '50%', background: p.avBg, color: p.avFg, display: 'grid', placeItems: 'center', fontSize: 8.5, fontWeight: 700 }}>{p.avatar}</span>{p.author} · {p.date}</div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {screen === 'editor' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: 26, margin: 0, marginRight: 'auto' }}>{t.ed_title}</h2>
                <button className="btn btn-secondary" onClick={() => go('posts')}>{t.ed_save}</button>
                <button className="btn btn-primary" onClick={submitReview}>{t.ed_submit}</button>
              </div>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div className="card" style={{ flex: 1, minWidth: 270, maxWidth: 360, padding: 20, gap: 13 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon name="sparkles" size={17} stroke="var(--color-accent)" />
                    <span className="card-title" style={{ fontSize: 16 }}>{t.ed_panel}</span>
                  </div>
                  <div className="field"><label>{t.ed_idea}</label><textarea className="input" style={{ minHeight: 74, borderRadius: 18 }} placeholder={t.ed_idea_ph} value={s.edIdea} onChange={(e) => patch({ edIdea: e.target.value })} /></div>
                  <div className="field"><label>{t.ed_kw}</label><input className="input" placeholder={t.ed_kw_ph} value={s.edKw} onChange={(e) => patch({ edKw: e.target.value })} /></div>
                  <div className="field"><label>{t.ed_tone}</label>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>{toneList.map((o) => <Pill key={o.key} on={s.edTone === o.key} onClick={() => patch({ edTone: o.key })}>{o.label}</Pill>)}</div>
                  </div>
                  <div className="field"><label>{t.ed_channels}</label>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>{product.channels.map((c) => <Pill key={c} on={s.edChans[c]} onClick={() => patch({ edChans: { ...s.edChans, [c]: !s.edChans[c] } })}>{CHAN_NAME[c]}</Pill>)}</div>
                  </div>
                  <div className="field"><label>{t.ed_len}</label>
                    <div style={{ display: 'flex', gap: 5 }}>{lenList.map((o) => <Pill key={o.key} on={s.edLen === o.key} onClick={() => patch({ edLen: o.key })}>{o.label}</Pill>)}</div>
                  </div>
                  <button className="btn btn-primary btn-block" onClick={generate} style={{ minHeight: 42, fontSize: 14.5 }}>{s.generating ? t.ed_generating : t.ed_generate}</button>
                  <p className="text-muted" style={{ margin: 0, fontSize: 11.5 }}>{t.ed_hint}</p>
                </div>

                <div style={{ flex: 2, minWidth: 300, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {!s.hasDraft && (
                    <div style={{ border: '1.5px dashed var(--color-neutral-400)', borderRadius: 28, padding: '44px 26px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--color-accent-100)', display: 'grid', placeItems: 'center', animation: s.generating ? 'dwpulse 1.1s ease-in-out infinite' : 'none' }}>
                        <Icon name="sparkles" size={24} stroke="var(--color-accent)" />
                      </div>
                      <p className="text-muted" style={{ margin: 0, fontSize: 13, maxWidth: 340 }}>{s.generating ? t.ed_working : t.ed_empty}</p>
                    </div>
                  )}
                  {s.hasDraft && (
                    <>
                      <div className="card" style={{ padding: 20, gap: 13 }}>
                        <div className="field"><label>{t.ed_title_label}</label><input className="input" style={{ fontWeight: 700, fontSize: 15 }} value={s.edTitle} onChange={(e) => patch({ edTitle: e.target.value })} /></div>
                        <div>
                          <div className="text-muted" style={{ fontSize: 12, marginBottom: 5 }}>{t.ed_suggest}</div>
                          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                            {GEN.sugg.map((x, i) => <button key={i} onClick={() => patch({ edTitle: x })} className="tag tag-accent" style={{ border: 'none', cursor: 'pointer', fontSize: 11.5, padding: '5px 12px' }}>{x}</button>)}
                          </div>
                        </div>
                        <div className="field"><label>{t.ed_body}</label><textarea className="input" style={{ minHeight: 190, borderRadius: 20, lineHeight: 1.6, fontSize: 13.5 }} value={s.edBody} onChange={(e) => patch({ edBody: e.target.value })} /></div>
                        <div className="field"><label>{t.ed_meta} <span className="text-muted">· {s.edMeta.length}/160</span></label><textarea className="input" style={{ minHeight: 56, borderRadius: 18, fontSize: 12.5 }} value={s.edMeta} onChange={(e) => patch({ edMeta: e.target.value })} /></div>
                      </div>
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <div className="card" style={{ flex: 1, minWidth: 230, padding: 18, gap: 10 }}>
                          <span className="card-title" style={{ fontSize: 15 }}>{t.ed_score}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <Donut score={s.edScore} />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>
                              {[t.ck_seo, t.ck_len, t.ck_dup].map((txt, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12 }}><span style={{ color: 'var(--color-accent-2-700)', display: 'flex' }}><Icon name="check" size={13} /></span>{txt}</div>
                              ))}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button className="btn btn-secondary" onClick={generate} style={{ fontSize: 12.5, padding: '6px 14px' }}>{t.ed_rewrite}</button>
                            <button className="btn btn-secondary" onClick={boostSeo} style={{ fontSize: 12.5, padding: '6px 14px' }}>{t.ed_seo}</button>
                          </div>
                        </div>
                        <div className="card" style={{ flex: 1, minWidth: 230, padding: 18, gap: 10 }}>
                          <span className="card-title" style={{ fontSize: 15 }}>{t.ed_img}</span>
                          <div style={{ border: '1.5px dashed var(--color-neutral-400)', borderRadius: 20, height: 110, display: 'grid', placeItems: 'center' }}>
                            <Icon name="image" size={26} stroke="var(--color-neutral-500)" />
                          </div>
                          <button className="btn btn-ghost" style={{ fontSize: 12.5, alignSelf: 'flex-start' }}><Icon name="sparkles" size={14} />{t.ed_img_btn}</button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {screen === 'detail' && (
            <div>
              <button className="btn btn-ghost" onClick={() => go('posts')} style={{ marginBottom: 8, fontSize: 13 }}><Icon name="back" size={15} />{t.dt_back}</button>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                <div style={{ flex: 1, minWidth: 240 }}>
                  <h2 style={{ fontSize: 24, margin: '0 0 6px' }}>{dPost.title}</h2>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className="tag" style={{ background: dPost.stBg, color: dPost.stFg }}>{dPost.stLabel}</span>
                    <span className="text-muted" style={{ fontSize: 12 }}>{product.name} · {dPost.author} · {dPost.date}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn btn-secondary" onClick={requestEdit}>{t.dt_request}</button>
                  <button className="btn btn-primary" onClick={approvePost}><Icon name="check" size={15} />{t.dt_approve}</button>
                </div>
              </div>
              {s.dToastMsg && <div className="tag tag-accent-2" style={{ marginBottom: 12, padding: '8px 16px', fontSize: 12.5 }}>{s.dToastMsg}</div>}
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div style={{ flex: 2, minWidth: 300, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="card" style={{ padding: 20, gap: 12 }}>
                    <span className="card-title" style={{ fontSize: 15 }}>{t.dt_variants}</span>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {dPostRaw.chans.map((c) => <Pill key={c} on={s.dTab === c} onClick={() => patch({ dTab: c })} pad="6px 15px" fontSize={12.5}>{CHAN_NAME[c]}</Pill>)}
                    </div>
                    <div style={{ background: 'var(--color-neutral-100)', borderRadius: 20, padding: 18, fontSize: 13.5, lineHeight: 1.65, whiteSpace: 'pre-line' }}>{VARIANTS[s.dTab]}</div>
                    <div className="field"><label>{t.dt_meta}</label><div style={{ fontSize: 12.5, background: 'var(--color-neutral-100)', borderRadius: 16, padding: '10px 14px' }}>{dPost.meta}</div></div>
                  </div>
                  <div className="card" style={{ padding: 20, gap: 10 }}>
                    <span className="card-title" style={{ fontSize: 15 }}>{t.dt_activity}</span>
                    {dActivity.map((a, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, fontSize: 12.5, alignItems: 'baseline' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: a.color, flex: 'none' }} />
                        <span style={{ flex: 1 }}>{a.text}</span>
                        <span className="text-muted" style={{ fontSize: 11 }}>{a.when}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 250, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="card" style={{ padding: 18, gap: 12 }}>
                    <span className="card-title" style={{ fontSize: 15 }}>{t.dt_breakdown}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Donut score={dPostRaw.score} size={72} />
                      <span className="text-muted" style={{ fontSize: 12 }}>{t.dt_score_note}</span>
                    </div>
                    {dBreakdown.map((x, i) => (
                      <div key={i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}><span>{x.label}</span><span style={{ fontWeight: 700 }}>{x.v}</span></div>
                        <div style={{ height: 7, borderRadius: 999, background: 'var(--color-neutral-200)', overflow: 'hidden' }}><div style={{ height: '100%', borderRadius: 999, background: x.color, width: `${x.v}%` }} /></div>
                      </div>
                    ))}
                  </div>
                  <div className="card" style={{ padding: 18, gap: 8 }}>
                    <span className="card-title" style={{ fontSize: 15 }}>{t.dt_dup}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <span style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--color-accent-2-200)', display: 'grid', placeItems: 'center', flex: 'none' }}><Icon name="check" size={15} stroke="var(--color-accent-2-800)" /></span>
                      <div><div style={{ fontWeight: 700, fontSize: 13 }}>{t.dt_dup_ok}</div><div className="text-muted" style={{ fontSize: 11.5 }}>{t.dt_dup_note}</div></div>
                    </div>
                  </div>
                  <div className="card" style={{ padding: 18, gap: 8 }}>
                    <span className="card-title" style={{ fontSize: 15 }}>{t.dt_schedule}</span>
                    <div className="field"><label>{t.dt_schedule_when}</label><input className="input" defaultValue="18/07/2026 · 09:00" /></div>
                    <div style={{ display: 'flex', gap: 4 }}>{dPost.chans.map((c, i) => <ChanChip key={i} c={c} w={28} h={21} />)}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {screen === 'settings' && (
            <div>
              <h2 style={{ fontSize: 26, margin: '0 0 16px' }}>{t.st_title}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 760 }}>
                <div className="card" style={{ padding: 20, gap: 10 }}>
                  <span className="card-title" style={{ fontSize: 16 }}>{t.st_lang}</span>
                  <div style={{ display: 'flex', gap: 5 }}>
                    {[['vi', 'Tiếng Việt'], ['en', 'English']].map(([k, txt]) => (
                      <button key={k} onClick={() => patch({ lang: k })} style={{ border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, padding: '7px 18px', borderRadius: 999, background: lang === k ? 'var(--color-accent)' : 'var(--color-neutral-200)', color: lang === k ? 'var(--color-bg)' : 'var(--color-neutral-700)' }}>{txt}</button>
                    ))}
                  </div>
                </div>
                <div className="card" style={{ padding: 20, gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}><span className="card-title" style={{ fontSize: 16, marginRight: 'auto' }}>{t.st_products}</span><button className="btn btn-ghost" style={{ fontSize: 12.5 }}>+ {t.st_add_product}</button></div>
                  {PRODUCTS.map((p) => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--color-neutral-100)', borderRadius: 18, padding: '12px 16px', flexWrap: 'wrap' }}>
                      <span style={{ width: 12, height: 12, borderRadius: '50%', background: p.color, flex: 'none' }} />
                      <div style={{ flex: 1, minWidth: 150 }}><div style={{ fontWeight: 700, fontSize: 13.5 }}>{p.name}</div><div className="text-muted" style={{ fontSize: 11.5 }}>{p.desc[lang]}</div></div>
                      <div style={{ display: 'flex', gap: 4 }}>{p.channels.map((c) => <ChanChip key={c} c={CHAN[c]} w={28} h={21} />)}</div>
                    </div>
                  ))}
                </div>
                <div className="card" style={{ padding: 20, gap: 13 }}>
                  <span className="card-title" style={{ fontSize: 16 }}>{t.st_voice} · {product.name}</span>
                  <div className="field"><label>{t.ed_tone}</label>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>{toneList.map((o) => <Pill key={o.key} on={s.voiceTone === o.key} onClick={() => patch({ voiceTone: o.key })}>{o.label}</Pill>)}</div>
                  </div>
                  <div className="field"><label>{t.st_voice_kw}</label><input className="input" defaultValue={product.voiceKw} key={product.id + 'kw'} /></div>
                  <div className="field"><label>{t.st_voice_ban}</label><input className="input" defaultValue={product.voiceBan} key={product.id + 'ban'} /></div>
                  <div className="field"><label>{t.st_voice_sample}</label><textarea className="input" style={{ minHeight: 64, borderRadius: 18, fontSize: 12.5 }} defaultValue={product.voiceSample} key={product.id + 'sample'} /></div>
                </div>
                <div className="card" style={{ padding: 20, gap: 10 }}>
                  <span className="card-title" style={{ fontSize: 16 }}>{t.st_prompts}</span>
                  {prompts.map((p, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--color-neutral-100)', borderRadius: 18, padding: '11px 16px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 700, fontSize: 13 }}>{p.name}</div><div className="text-muted" style={{ fontSize: 11.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.desc}</div></div>
                      <button className="btn btn-secondary" onClick={() => go('editor')} style={{ fontSize: 12, padding: '5px 14px', flex: 'none' }}>{t.st_use}</button>
                    </div>
                  ))}
                </div>
                <div className="card" style={{ padding: 20, gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}><span className="card-title" style={{ fontSize: 16, marginRight: 'auto' }}>{t.st_team}</span><button className="btn btn-ghost" style={{ fontSize: 12.5 }}>+ {t.st_invite}</button></div>
                  {team.map((m, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 30, height: 30, borderRadius: '50%', background: m.bg, color: m.fg, display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700, flex: 'none' }}>{m.avatar}</span>
                      <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 700, fontSize: 13 }}>{m.name}</div><div className="text-muted" style={{ fontSize: 11.5 }}>{m.email}</div></div>
                      <span className="tag tag-neutral" style={{ fontSize: 11 }}>{m.role}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>

        {isMobile && (
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40, display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '8px 8px calc(8px + env(safe-area-inset-bottom))', background: 'var(--color-neutral-100)', borderTop: '1px solid var(--color-divider)' }}>
            {[['dash', 'dashboard', t.nav_dash], ['posts', 'file', t.nav_posts]].map(([k, ic, label]) => (
              <button key={k} onClick={() => go(k)} style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, fontSize: 10, fontWeight: 600, color: navOn(k) ? 'var(--color-accent)' : 'var(--color-neutral-600)', minWidth: 56, padding: 4 }}>
                <Icon name={ic} size={21} />{label}
              </button>
            ))}
            <button onClick={() => go('editor')} style={{ border: 'none', cursor: 'pointer', width: 52, height: 52, borderRadius: '50%', background: 'var(--color-accent)', color: 'var(--color-bg)', display: 'grid', placeItems: 'center', marginTop: -22, boxShadow: 'var(--shadow-md)' }}>
              <Icon name="plus" size={24} />
            </button>
            <button onClick={() => go('settings')} style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, fontSize: 10, fontWeight: 600, color: navOn('settings') ? 'var(--color-accent)' : 'var(--color-neutral-600)', minWidth: 56, padding: 4 }}>
              <Icon name="settings" size={21} />{t.nav_settings}
            </button>
            <button onClick={() => go('login')} style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, fontSize: 10, fontWeight: 600, color: 'var(--color-neutral-600)', minWidth: 56, padding: 4 }}>
              <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--color-accent-2-300)', color: 'var(--color-accent-2-900)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 9 }}>ML</span>
              Mai Lan
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
