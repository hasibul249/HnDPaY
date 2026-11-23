(() => {
  const cap = window.Capacitor, isN = !!(cap && cap.isNativePlatform && cap.isNativePlatform());
  const H = isN ? (cap.Plugins.HndNative || cap.registerPlugin('HndNative')) : null;
  const cfg = window.HND || {};
  const isDark = () => S.th === 'Dark' || (S.th === 'System' && matchMedia('(prefers-color-scheme: dark)').matches);
  const bars = () => { H && H.setBars({ dark: isDark() }).catch(() => {}); };

  /* ---- remember state between launches ---- */
  const KEYS = ['u', 'em', 'bal', 'th', 'hide', 'pro', 'fz', 'sv', 'ct', 'sd'];
  const save = () => { try { localStorage.hnd = JSON.stringify(Object.fromEntries(KEYS.map(k => [k, S[k]]))); } catch (e) {} };
  setInterval(save, 1500); addEventListener('pagehide', save);
  document.addEventListener('visibilitychange', save);

  /* ---- theme -> system bars ---- */
  const th = A.theme; A.theme = (v, t) => { th(v, t); bars(); };
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', bars);
  bars();

  /* ---- haptics, no context menu ---- */
  document.addEventListener('click', e => { if (H && e.target.closest('button,[data-a]')) H.tick().catch(() => {}); }, true);
  document.addEventListener('contextmenu', e => e.preventDefault());

  /* ---- Android back button ---- */
  window.hndBack = () => {
    const ov = $('.ov'); if (ov) return ov.click();
    if (S.st.length) return back();
    if (S.cur !== 'home') return go('home');
    H && H.exit();
  };

  /* ---- balance count-up ---- */
  new MutationObserver(() => {
    const b = $('#bv'); if (!b || b.dataset.c || S.hide || !S.bal) return;
    b.dataset.c = 1; const to = S.bal, t0 = performance.now();
    (function f(t) { const p = Math.min((t - t0) / 800, 1); b.firstChild.textContent = f2(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(f); })(t0);
  }).observe(app, { childList: true, subtree: true });

  /* ---- in-app updater (GitHub Releases) ---- */
  const cmp = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0) ? 1 : -1; return 0; };
  const row2 = R.settings;
  R.settings = () => row2().replace('<button class="b lo"', row('info', 'Check for updates', H ? 'v' + (cfg.ver || '') : '', 'upd') + '<button class="b lo"');
  A.upd = () => check(true);

  function sheetUpd(v, notes, apk) {
    const ov = document.createElement('div'); ov.className = 'ov';
    ov.innerHTML = `<div class="sh"><div class="gp"></div><div class="upd"><div class="lg2">${LOGO(52)}</div><h4>Update available · v${v}</h4><p></p><div class="pbar" hidden><i></i></div><small id="ust" hidden></small><div class="two"><button class="b" data-x>Later</button><button class="b p" data-go>Update now</button></div></div></div>`;
    $('p', ov).textContent = (notes || 'Bug fixes and improvements.').slice(0, 300);
    app.appendChild(ov);
    const close = () => { ov.style.opacity = 0; setTimeout(() => ov.remove(), 200); };
    ov.onclick = async e => {
      if (e.target === ov || e.target.closest('[data-x]')) { sessionStorage.skip = v; return close(); }
      if (!e.target.closest('[data-go]')) return;
      const bar = $('.pbar', ov), fill = $('i', bar), st = $('#ust', ov), go = e.target.closest('[data-go]');
      bar.hidden = st.hidden = false; go.disabled = true; st.textContent = 'Starting download…';
      H.addListener('progress', o => { fill.style.width = o.pct + '%'; st.textContent = `Downloading… ${o.pct}%`; });
      H.addListener('done', () => { st.textContent = 'Opening installer…'; setTimeout(close, 800); });
      H.addListener('failed', () => { st.textContent = 'Download failed. Try again.'; go.disabled = false; });
      try {
        const r = await H.install({ url: apk.browser_download_url });
        if (r.status === 'permission') { st.textContent = 'Allow installs for HnDPaY, then tap Update again.'; go.disabled = false; }
      } catch (err) { st.textContent = 'Could not start update.'; go.disabled = false; }
    };
  }

  async function check(manual) {
    if (!H || !cfg.repo || cfg.repo.startsWith('__')) return manual && toast('Updates are not configured');
    try {
      const info = await H.getInfo(); cfg.ver = info.version;
      const r = await fetch(`https://api.github.com/repos/${cfg.repo}/releases/latest`, { headers: { Accept: 'application/vnd.github+json' } });
      if (!r.ok) return manual && toast('Could not check for updates');
      const j = await r.json(), v = (j.tag_name || '').replace(/^v/, ''), apk = (j.assets || []).find(a => /\.apk$/i.test(a.name));
      if (!apk || cmp(v, info.version) <= 0) return manual && toast('You are up to date');
      if (!manual && sessionStorage.skip === v) return;
      sheetUpd(v, j.body, apk);
    } catch (e) { manual && toast('No connection'); }
  }

  /* ---- launch ---- */
  if (H) H.getInfo().then(i => { cfg.ver = i.version; }).catch(() => {});
  splash();
  setTimeout(() => check(false), 2200);
})();
