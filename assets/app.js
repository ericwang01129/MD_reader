/* ============================================================
   MD Reader · Markdown 載入 + HackMD 風格 TOC + 相對路徑解析
   ============================================================ */

(function () {
  'use strict';

  if (typeof marked !== 'undefined') {
    marked.setOptions({
      gfm: true,
      breaks: true,
      headerIds: true,
      mangle: false
    });
  }

  // ===== DOM 引用 =====
  const sidebar = document.getElementById('sidebar');
  const floatingMenu = document.getElementById('floatingMenu');
  const welcome = document.getElementById('welcome');
  const docArticle = document.getElementById('document');
  const docContent = document.getElementById('docContent');
  const loader = document.getElementById('loader');
  const errorBox = document.getElementById('error');
  const backToTop = document.getElementById('backToTop');
  const tocContainer = document.getElementById('toc');
  const brandHome = document.getElementById('brandHome');
  const quickLinks = document.querySelectorAll('a[data-file]');

  let scrollObserver = null;
  let currentFile = null;

  // ===== 站台根 URL（捕獲於頁面進入時，replaceState 後仍可用） =====
  const SITE_ROOT_HREF = new URL('.', document.baseURI).href;
  const SITE_ROOT_PATH = new URL('.', document.baseURI).pathname;

  function mdToHtml(p) { return p.replace(/\.md$/i, '.html'); }
  function htmlToMd(p) { return p.replace(/\.html$/i, '.md'); }

  // ===== 受密碼保護的檔案（完整劇本＋各系列譯名表） =====
  // 以「檔名」比對，避免不同來源（hash／pathname／data-file）的路徑編碼差異。
  // PL 向、HO 秘匿不在此清單，玩家無須密碼即可閱覽。
  function nfc(s) {
    s = String(s == null ? '' : s);
    return s.normalize ? s.normalize('NFC') : s;
  }
  const PROTECTED_BASENAMES = new Set([
    'criminals_grave_marker_完整劇本.md',
    'subekishi_完整劇本.md',
    'subekishi_NPC詳細資料.md',
    '暴く深淵_完整劇本.md',
    'decamahoro_zh-TW.md',
    '02_VAMP_KP_完整劇本.md',
    'Till_tomorrow_mates_zh-TW.md',
    '匿された神託と天使の腑分け_完整劇本.md',
    'Call_of_Etranger_zh-TW.md',
    '黎明心声のアリアライト_完整劇本.md',
    '忘却犯_完整劇本.md',
    '完整劇本.md',
    'to_change_zh-TW.md',
    'to_change_stories_zh-TW.md',
    // 譯名表（各系列）
    'criminals_grave_marker_譯名對照表.md',
    'subekishi_譯名對照表.md',
    'Sibyl_譯名對照表.md',
    '暴く深淵_譯名對照表.md',
    '01_VAMP_PL_譯名對照表.md',
    'DX3_譯名對照表.md',
    'glossary_zh-TW.md',
    '譯名對照表.md'
  ].map(nfc));
  function baseName(p) {
    if (!p) return '';
    let s = String(p).split(/[?#]/)[0].replace(/\/+$/, '');
    const i = s.lastIndexOf('/');
    return i >= 0 ? s.slice(i + 1) : s;
  }
  function isProtectedFile(filePath) {
    let p = filePath;
    try { p = decodeURIComponent(filePath); } catch (e) { /* 用原值 */ }
    return PROTECTED_BASENAMES.has(nfc(baseName(p)));
  }
  function authReady() { return typeof window.MDAuth !== 'undefined'; }

  // ===== <title> 與 <meta description> =====
  const DEFAULT_TITLE = document.title;
  const DEFAULT_DESC = (document.querySelector('meta[name="description"]') || {}).content || '';

  function setMeta(name, value, attr) {
    attr = attr || 'name';
    let el = document.querySelector('meta[' + attr + '="' + name + '"]');
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, name);
      document.head.appendChild(el);
    }
    el.setAttribute('content', value);
  }

  function applyMeta(title, desc) {
    document.title = title;
    setMeta('description', desc);
    setMeta('og:title', title, 'property');
    setMeta('og:description', desc, 'property');
  }

  function extractTitleAndPreview(md) {
    const lines = md.split(/\r?\n/);
    let inFrontMatter = false;
    let inFence = false;
    let title = '';
    const previewParts = [];

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const line = raw.trim();

      if (i === 0 && line === '---') { inFrontMatter = true; continue; }
      if (inFrontMatter) { if (line === '---') inFrontMatter = false; continue; }

      if (/^```/.test(line)) { inFence = !inFence; continue; }
      if (inFence) continue;

      if (!title) {
        const h1 = line.match(/^#\s+(.+?)\s*#*\s*$/);
        if (h1) { title = h1[1].trim(); continue; }
      }

      if (!line || /^#{1,6}\s/.test(line) || /^[->|*_=]{3,}$/.test(line)) continue;

      const cleaned = line
        .replace(/^>\s*/, '')
        .replace(/^[-*+]\s+/, '')
        .replace(/^\d+\.\s+/, '')
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/[*_`~]+/g, '')
        .trim();

      if (cleaned) previewParts.push(cleaned);
      if (previewParts.join(' ').length >= 120) break;
    }

    let preview = previewParts.join(' ').replace(/\s+/g, ' ').trim();
    if (preview.length > 160) preview = preview.slice(0, 157) + '…';
    return { title: title || DEFAULT_TITLE, preview: preview || DEFAULT_DESC };
  }

  // ===== 行動版選單 =====
  function closeMenu() {
    sidebar.classList.remove('open');
    floatingMenu.classList.remove('open');
    document.body.classList.remove('menu-open');
  }
  function toggleMenu() {
    const willOpen = !sidebar.classList.contains('open');
    sidebar.classList.toggle('open', willOpen);
    floatingMenu.classList.toggle('open', willOpen);
    document.body.classList.toggle('menu-open', willOpen);
  }
  floatingMenu.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMenu();
  });
  document.addEventListener('click', (e) => {
    if (sidebar.classList.contains('open') &&
        !sidebar.contains(e.target) &&
        !floatingMenu.contains(e.target)) {
      closeMenu();
    }
  });

  // ===== 相對路徑解析(相對於 MD 檔所在目錄) =====
  function resolveRelative(rawUrl, mdFilePath) {
    if (!rawUrl) return rawUrl;
    if (/^(?:[a-z]+:|\/\/|\/|#|mailto:|data:)/i.test(rawUrl)) return rawUrl;
    try {
      const base = new URL(mdFilePath, SITE_ROOT_HREF);
      return new URL(rawUrl, base).href;
    } catch (e) {
      return rawUrl;
    }
  }

  function rewriteRelativeUrls(filePath) {
    docContent.querySelectorAll('img[src]').forEach(img => {
      img.src = resolveRelative(img.getAttribute('src'), filePath);
    });
    docContent.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href');
      if (!href || href.startsWith('#')) return;
      // 若連結指向 .md 檔,改為使用本 reader 的 hash 路由
      if (/\.md(?:[?#]|$)/i.test(href) &&
          !/^(?:[a-z]+:|\/\/)/i.test(href)) {
        try {
          const base = new URL(filePath, SITE_ROOT_HREF);
          const resolved = new URL(href, base);
          let relPath = resolved.pathname;
          if (relPath.startsWith(SITE_ROOT_PATH)) {
            relPath = relPath.slice(SITE_ROOT_PATH.length);
          }
          relPath = decodeURIComponent(relPath);
          a.href = SITE_ROOT_PATH + encodeURI(mdToHtml(relPath));
          a.dataset.mdLink = relPath;
          return;
        } catch (e) { /* fallthrough */ }
      }
      a.href = resolveRelative(href, filePath);
    });

    // 內部 .md 連結改為觸發 navigateTo
    docContent.querySelectorAll('a[data-md-link]').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo(a.dataset.mdLink, true);
      });
    });
  }

  // ===== TOC 生成 =====
  function slugify(text, fallback) {
    const s = (text || '').trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w一-鿿\-]/g, '')
      .toLowerCase();
    return s || fallback;
  }

  function buildTOC() {
    if (scrollObserver) {
      scrollObserver.disconnect();
      scrollObserver = null;
    }

    const headings = docContent.querySelectorAll('h1, h2, h3, h4');
    if (!headings.length) {
      tocContainer.innerHTML = '<p class="toc-empty">本文件無標題</p>';
      return;
    }

    const list = document.createElement('ul');
    list.className = 'toc-list';

    // 確保每個 heading 的 id 在文件內唯一；若 marked／slugify 因相同標題文字
    // 產生重複 id，於後續同名標題加上 -2、-3… 後綴。否則 TOC 點擊第二次以後
    // 出現的同名標題時，document.getElementById() 永遠回傳第一個元素，造成
    // 跳到第一次出現位置的 bug。
    const usedIds = new Set();
    headings.forEach((h, i) => {
      const base = h.id || slugify(h.textContent, 'h-' + i) || ('h-' + i);
      let id = base;
      let n = 2;
      while (usedIds.has(id)) {
        id = base + '-' + n;
        n++;
      }
      if (h.id !== id) h.id = id;
      usedIds.add(id);
    });

    headings.forEach((h, i) => {
      const li = document.createElement('li');
      li.className = 'toc-item toc-' + h.tagName.toLowerCase();

      const a = document.createElement('a');
      a.href = '#';
      a.dataset.target = h.id;
      a.textContent = h.textContent.replace(/^[\s#·*]+/, '').trim();
      a.title = a.textContent;

      a.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.getElementById(h.id);
        if (target) {
          const top = target.getBoundingClientRect().top + window.scrollY - 24;
          window.scrollTo({ top, behavior: 'smooth' });
        }
        closeMenu();
        list.querySelectorAll('a.active').forEach(x => x.classList.remove('active'));
        a.classList.add('active');
      });

      li.appendChild(a);
      list.appendChild(li);
    });

    tocContainer.innerHTML = '';
    tocContainer.appendChild(list);

    // ===== Scroll-spy =====
    const tocLinks = list.querySelectorAll('a');
    const linksByTarget = {};
    tocLinks.forEach(a => { linksByTarget[a.dataset.target] = a; });

    const visibleSet = new Set();
    scrollObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) visibleSet.add(entry.target.id);
        else visibleSet.delete(entry.target.id);
      });
      let activeId = null;
      let minTop = Infinity;
      visibleSet.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const top = el.getBoundingClientRect().top;
        if (top < minTop) { minTop = top; activeId = id; }
      });
      if (activeId) {
        tocLinks.forEach(a => a.classList.remove('active'));
        if (linksByTarget[activeId]) {
          linksByTarget[activeId].classList.add('active');
          const link = linksByTarget[activeId];
          const sb = sidebar.querySelector('.sidebar-inner');
          if (sb) {
            const linkRect = link.getBoundingClientRect();
            const sbRect = sb.getBoundingClientRect();
            if (linkRect.top < sbRect.top + 60 || linkRect.bottom > sbRect.bottom - 60) {
              link.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
          }
        }
      }
    }, {
      rootMargin: '-24px 0px -70% 0px',
      threshold: 0
    });

    headings.forEach(h => scrollObserver.observe(h));
  }

  // ===== Markdown 載入 =====
  async function loadMarkdown(filePath, anchor) {
    // 完整劇本需通過密碼門檻；通過後重新載入同一檔案。
    if (isProtectedFile(filePath) && authReady() && !window.MDAuth.isAuthed()) {
      window.MDAuth.require(function () { loadMarkdown(filePath, anchor); });
      return;
    }
    try {
      welcome.classList.add('hidden');
      docArticle.classList.add('hidden');
      errorBox.classList.add('hidden');
      loader.classList.remove('hidden');

      // 永遠以 SITE_ROOT_HREF 為基底解析 fetch URL，避免 history.replaceState
      // 把 URL 換到 .html 子目錄後，下一次 fetch 出現雙重前綴
      const fetchUrl = new URL(filePath, SITE_ROOT_HREF).href;
      const res = await fetch(fetchUrl, { cache: 'no-cache' });
      if (!res.ok) {
        throw new Error('找不到檔案:' + filePath + ' (HTTP ' + res.status + ')');
      }
      const md = await res.text();

      const rawHtml = marked.parse(md);
      const safeHtml = (typeof DOMPurify !== 'undefined')
        ? DOMPurify.sanitize(rawHtml, { ADD_ATTR: ['target', 'class', 'id'] })
        : rawHtml;

      docContent.innerHTML = safeHtml;
      currentFile = filePath;

      const meta = extractTitleAndPreview(md);
      applyMeta(meta.title + ' · MD Reader', meta.preview);

      rewriteRelativeUrls(filePath);
      buildTOC();

      document.body.classList.add('reading');

      loader.classList.add('hidden');
      docArticle.classList.remove('hidden');

      // 若指定了 anchor 就捲到對應 heading；否則回到頂端
      if (anchor) {
        requestAnimationFrame(() => {
          const target = document.getElementById(anchor);
          if (target) {
            const top = target.getBoundingClientRect().top + window.scrollY - 24;
            window.scrollTo({ top, behavior: 'instant' });
          } else {
            window.scrollTo({ top: 0, behavior: 'instant' });
          }
        });
      } else {
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
      closeMenu();
    } catch (err) {
      loader.classList.add('hidden');
      errorBox.classList.remove('hidden');
      errorBox.textContent = err.message || '載入失敗';
      console.error(err);
    }
  }

  // ===== 路由 =====
  function navigateTo(filePath, push, replace, anchor) {
    loadMarkdown(filePath, anchor);
    if (push || replace) {
      let target = SITE_ROOT_PATH + encodeURI(mdToHtml(filePath));
      if (anchor) target += '#' + encodeURI(anchor);
      const current = location.pathname + location.search + location.hash;
      if (current !== target) {
        const state = { file: filePath, anchor: anchor || null };
        if (replace) history.replaceState(state, '', target);
        else history.pushState(state, '', target);
      }
    }
  }

  function showWelcome() {
    // 目錄頁（首頁）需通過密碼門檻；通過後重新顯示。
    if (authReady() && !window.MDAuth.isAuthed()) {
      window.MDAuth.require(showWelcome);
      return;
    }
    if (scrollObserver) { scrollObserver.disconnect(); scrollObserver = null; }
    currentFile = null;
    docArticle.classList.add('hidden');
    loader.classList.add('hidden');
    errorBox.classList.add('hidden');
    welcome.classList.remove('hidden');
    tocContainer.innerHTML = '<p class="toc-empty">尚未選擇文件</p>';

    applyMeta(DEFAULT_TITLE, DEFAULT_DESC);

    document.body.classList.remove('reading');
    closeMenu();
  }

  // 解析 hash 為 { file, anchor }；hash 內容支援 `path|anchor` 或單純的 `anchor`
  // 由呼叫端依 pathname 是否已給出 file 來決定如何詮釋 hash
  function parseHashRaw() {
    if (!location.hash || location.hash.length < 2) return null;
    try {
      return decodeURIComponent(location.hash.slice(1));
    } catch (e) {
      return null;
    }
  }

  // 從目前 pathname 推導要載入的 .md（用於使用者直接打開 .html stub 時）
  function parsePathname() {
    let p = location.pathname;
    if (p.startsWith(SITE_ROOT_PATH)) p = p.slice(SITE_ROOT_PATH.length);
    if (!p) return null;
    if (/(^|\/)index\.html$/i.test(p)) return null;
    if (!/\.html$/i.test(p)) return null;
    try {
      return decodeURIComponent(htmlToMd(p));
    } catch (e) {
      return null;
    }
  }

  // 回傳 { file, anchor } 或 null
  // 路由規則：
  //   1. 若 pathname 是 *.html（非 index.html）→ file 由 pathname 決定，hash 視為 anchor
  //   2. 若 pathname 是 index.html / 站根 → 從 hash 取得 file（以 `|` 分隔可選的 anchor）
  function parseRoute() {
    const pathFile = parsePathname();
    const hashRaw = parseHashRaw();
    if (pathFile) {
      return { file: pathFile, anchor: hashRaw || null };
    }
    if (hashRaw) {
      const parts = hashRaw.split('|');
      return { file: parts[0], anchor: parts[1] || null };
    }
    return null;
  }

  // ===== 事件綁定 =====
  function goHome(e) {
    if (e) e.preventDefault();
    history.pushState({}, '', SITE_ROOT_PATH);
    showWelcome();
  }
  brandHome.addEventListener('click', goHome);

  quickLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const file = link.dataset.file;
      if (file) navigateTo(file, true);
    });
  });

  window.addEventListener('popstate', () => {
    const route = parseRoute();
    if (route) navigateTo(route.file, false, false, route.anchor);
    else showWelcome();
  });

  window.addEventListener('scroll', () => {
    if (window.scrollY > 400) backToTop.classList.add('show');
    else backToTop.classList.remove('show');
  });
  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ===== 啟動 =====
  const initialRoute = parseRoute();
  if (initialRoute) navigateTo(initialRoute.file, false, true, initialRoute.anchor);
  else showWelcome();
})();
