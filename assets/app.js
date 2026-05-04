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

    headings.forEach((h, i) => {
      if (!h.id) h.id = slugify(h.textContent, 'h-' + i);

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
  async function loadMarkdown(filePath) {
    try {
      welcome.classList.add('hidden');
      docArticle.classList.add('hidden');
      errorBox.classList.add('hidden');
      loader.classList.remove('hidden');

      const res = await fetch(filePath, { cache: 'no-cache' });
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
      window.scrollTo({ top: 0, behavior: 'instant' });
      closeMenu();
    } catch (err) {
      loader.classList.add('hidden');
      errorBox.classList.remove('hidden');
      errorBox.textContent = err.message || '載入失敗';
      console.error(err);
    }
  }

  // ===== 路由 =====
  function navigateTo(filePath, push, replace) {
    loadMarkdown(filePath);
    if (push || replace) {
      const target = SITE_ROOT_PATH + encodeURI(mdToHtml(filePath));
      const current = location.pathname + location.search;
      if (current !== target) {
        const state = { file: filePath };
        if (replace) history.replaceState(state, '', target);
        else history.pushState(state, '', target);
      }
    }
  }

  function showWelcome() {
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

  function parseHash() {
    if (!location.hash || location.hash.length < 2) return null;
    try {
      const raw = location.hash.slice(1);
      const filePart = raw.split('|')[0];
      return decodeURIComponent(filePart);
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

  function parseRoute() {
    return parsePathname() || parseHash();
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
    const file = parseRoute();
    if (file) navigateTo(file, false);
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
  const initialFile = parseRoute();
  if (initialFile) navigateTo(initialFile, false, true);
  else showWelcome();
})();
