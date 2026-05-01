/* ============================================================
   デカマホロ Reader · Markdown 載入與渲染
   ============================================================ */

(function () {
  'use strict';

  // 設定 marked
  if (typeof marked !== 'undefined') {
    marked.setOptions({
      gfm: true,
      breaks: true,
      headerIds: true,
      mangle: false
    });
  }

  const sidebar = document.getElementById('sidebar');
  const menuToggle = document.getElementById('menuToggle');
  const welcome = document.getElementById('welcome');
  const docArticle = document.getElementById('document');
  const docContent = document.getElementById('docContent');
  const loader = document.getElementById('loader');
  const errorBox = document.getElementById('error');
  const backToTop = document.getElementById('backToTop');
  const navLinks = document.querySelectorAll('a[data-file]');

  // ========== 行動版選單 ==========
  function closeMenu() {
    sidebar.classList.remove('open');
    menuToggle.classList.remove('open');
    document.body.classList.remove('menu-open');
  }
  function toggleMenu() {
    const willOpen = !sidebar.classList.contains('open');
    sidebar.classList.toggle('open', willOpen);
    menuToggle.classList.toggle('open', willOpen);
    document.body.classList.toggle('menu-open', willOpen);
  }
  menuToggle.addEventListener('click', toggleMenu);

  // 點擊遮罩關閉
  document.addEventListener('click', (e) => {
    if (sidebar.classList.contains('open') &&
        !sidebar.contains(e.target) &&
        !menuToggle.contains(e.target)) {
      closeMenu();
    }
  });

  // ========== 載入 Markdown ==========
  async function loadMarkdown(filePath) {
    try {
      // 顯示 loader
      welcome.classList.add('hidden');
      docArticle.classList.add('hidden');
      errorBox.classList.add('hidden');
      loader.classList.remove('hidden');

      const res = await fetch(filePath, { cache: 'no-cache' });
      if (!res.ok) {
        throw new Error('找不到檔案：' + filePath + ' (HTTP ' + res.status + ')');
      }
      const md = await res.text();

      const rawHtml = marked.parse(md);
      const safeHtml = (typeof DOMPurify !== 'undefined')
        ? DOMPurify.sanitize(rawHtml, { ADD_ATTR: ['target'] })
        : rawHtml;

      docContent.innerHTML = safeHtml;
      loader.classList.add('hidden');
      docArticle.classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      closeMenu();
    } catch (err) {
      loader.classList.add('hidden');
      errorBox.classList.remove('hidden');
      errorBox.textContent = '⚠️ ' + (err.message || '載入失敗');
      console.error(err);
    }
  }

  // ========== 標示目前選中項 ==========
  function setActive(filePath) {
    navLinks.forEach(a => {
      if (a.dataset.file === filePath) a.classList.add('active');
      else a.classList.remove('active');
    });
  }

  // ========== 路由：使用 hash 紀錄當前文件 ==========
  function navigateTo(filePath, push) {
    setActive(filePath);
    loadMarkdown(filePath);
    if (push) {
      const hash = '#' + encodeURIComponent(filePath);
      if (location.hash !== hash) history.pushState({ file: filePath }, '', hash);
    }
  }

  // 點擊事件綁定
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const file = link.dataset.file;
      if (file) navigateTo(file, true);
    });
  });

  // 處理瀏覽器前進／後退
  window.addEventListener('popstate', () => {
    const file = parseHash();
    if (file) navigateTo(file, false);
    else showWelcome();
  });

  function parseHash() {
    if (!location.hash || location.hash.length < 2) return null;
    try {
      return decodeURIComponent(location.hash.slice(1));
    } catch (e) {
      return null;
    }
  }

  function showWelcome() {
    setActive(null);
    docArticle.classList.add('hidden');
    loader.classList.add('hidden');
    errorBox.classList.add('hidden');
    welcome.classList.remove('hidden');
  }

  // ========== 回到頂端 ==========
  window.addEventListener('scroll', () => {
    if (window.scrollY > 400) backToTop.classList.add('show');
    else backToTop.classList.remove('show');
  });

  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ========== 啟動 ==========
  const initialFile = parseHash();
  if (initialFile) {
    navigateTo(initialFile, false);
  } else {
    showWelcome();
  }
})();
