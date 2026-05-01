/* ============================================================
   デカマホロ Reader · Markdown 載入 + HackMD 風格 TOC
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
  const fileSelect = document.getElementById('fileSelect');
  const brandHome = document.getElementById('brandHome');
  const backHome = document.getElementById('backHome');
  const quickLinks = document.querySelectorAll('a[data-file]');

  let scrollObserver = null;
  let currentFile = null;

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
      a.textContent = h.textContent.replace(/^[\s✦◆#·*]+/, '').trim();
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

      buildTOC();
      fileSelect.value = filePath;

      // 切換到「閱讀模式」:隱藏 topbar
      document.body.classList.add('reading');

      loader.classList.add('hidden');
      docArticle.classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'instant' });
      closeMenu();
    } catch (err) {
      loader.classList.add('hidden');
      errorBox.classList.remove('hidden');
      errorBox.textContent = '⚠️ ' + (err.message || '載入失敗');
      console.error(err);
    }
  }

  // ===== 路由 =====
  function navigateTo(filePath, push) {
    loadMarkdown(filePath);
    if (push) {
      const hash = '#' + encodeURIComponent(filePath);
      if (location.hash !== hash) history.pushState({ file: filePath }, '', hash);
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
    fileSelect.value = '';

    // 退出「閱讀模式」:顯示 topbar
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

  // ===== 事件綁定 =====
  fileSelect.addEventListener('change', (e) => {
    const file = e.target.value;
    if (file) navigateTo(file, true);
    else {
      history.pushState({}, '', location.pathname + location.search);
      showWelcome();
    }
  });

  function goHome(e) {
    if (e) e.preventDefault();
    history.pushState({}, '', location.pathname + location.search);
    showWelcome();
  }
  brandHome.addEventListener('click', goHome);
  backHome.addEventListener('click', goHome);

  quickLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const file = link.dataset.file;
      if (file) navigateTo(file, true);
    });
  });

  window.addEventListener('popstate', () => {
    const file = parseHash();
    if (file) navigateTo(file, false);
    else showWelcome();
  });

  // 回到頂端
  window.addEventListener('scroll', () => {
    if (window.scrollY > 400) backToTop.classList.add('show');
    else backToTop.classList.remove('show');
  });
  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ===== 啟動 =====
  const initialFile = parseHash();
  if (initialFile) navigateTo(initialFile, false);
  else showWelcome();
})();
