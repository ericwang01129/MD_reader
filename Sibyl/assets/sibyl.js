/* ============================================================
   Sibyl 繁中版 — 目次（outliner）自動產生 + 滾動高亮 + 複製鈕
   沿用原作 .outliner-list / .outliner-item / .outliner-text 樣式，
   行為由本檔提供（原作以 data-heading-index 驅動，此處改以標題即時建立）。
   ============================================================ */
(function () {
  'use strict';

  var PAD = { H1: 2, H2: 14, H3: 26, H4: 38, H5: 44, H6: 50 };
  var LEVELS = 'h1, h2, h3, h4';

  function buildOutliner() {
    var box = document.getElementById('sibylOutliner');
    var content = document.querySelector('.sibyl-content');
    if (!box || !content) return;
    var heads = content.querySelectorAll(LEVELS);
    var items = [];
    heads.forEach(function (h, i) {
      var txt = h.textContent.replace(/^[▮✦\s　]+/, '').trim();
      if (!txt) return;
      if (!h.id) h.id = 'sec-' + i;
      var item = document.createElement('div');
      item.className = 'outliner-item';
      item.setAttribute('data-level', h.tagName.charAt(1));
      item.style.paddingLeft = (PAD[h.tagName] || 2) + 'px';
      var span = document.createElement('span');
      span.className = 'outliner-text';
      span.textContent = txt;
      item.appendChild(span);
      item.addEventListener('click', function () {
        var y = h.getBoundingClientRect().top + window.scrollY - 12;
        window.scrollTo({ top: y, behavior: 'smooth' });
        closeToc();
      });
      box.appendChild(item);
      items.push({ el: item, head: h });
    });

    if (!items.length) return;

    function spy() {
      var pos = window.scrollY + 90;
      var cur = items[0];
      items.forEach(function (it) {
        if (it.head.getBoundingClientRect().top + window.scrollY <= pos) cur = it;
      });
      items.forEach(function (it) {
        it.el.classList.toggle('outliner-item-current', it === cur);
      });
    }
    window.addEventListener('scroll', spy, { passive: true });
    window.addEventListener('resize', spy);
    spy();
  }

  function closeToc() {
    var t = document.getElementById('sibylToc');
    if (t) t.classList.remove('open');
  }

  function initToggle() {
    var btn = document.getElementById('tocToggle');
    var toc = document.getElementById('sibylToc');
    if (btn && toc) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        toc.classList.toggle('open');
      });
    }
    document.addEventListener('click', function (e) {
      if (toc && toc.classList.contains('open') &&
          !toc.contains(e.target) && e.target !== btn) {
        toc.classList.remove('open');
      }
    });
  }

  /* 可複製文字塊（HO 用，沿用原作 .copy-paragraph-btn / .copy-callout-btn） */
  function blockText(host) {
    var el = host.querySelector('.copy-text-block') || host.querySelector('.callout-content');
    if (!el) return '';
    var html = el.innerHTML.replace(/<br\s*\/?>/gi, '\n');
    var tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent.replace(/ /g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  }
  function flash(btn) {
    btn.classList.add('copied');
    setTimeout(function () { btn.classList.remove('copied'); }, 1200);
  }
  function initCopy() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.copy-paragraph-btn, .copy-callout-btn, .copy-btn');
      if (!btn) return;
      var host = btn.closest('.content-element') || btn.parentElement;
      if (!host) return;
      var text = blockText(host);
      if (!text) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { flash(btn); });
      } else {
        var ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); flash(btn); } catch (err) {}
        document.body.removeChild(ta);
      }
    });
  }

  /* 文本內事件連結（.scenario-event-link）：跳轉至同頁 data-event-target-id 對應元素 */
  function initEventLinks() {
    function go(link) {
      var id = link.getAttribute('data-event-target-id');
      if (!id) return;
      var target = document.getElementById(id);
      if (!target) return;
      var y = target.getBoundingClientRect().top + window.scrollY - 12;
      window.scrollTo({ top: y, behavior: 'smooth' });
      target.classList.add('event-flash');
      setTimeout(function () { target.classList.remove('event-flash'); }, 1600);
    }
    document.addEventListener('click', function (e) {
      var link = e.target.closest && e.target.closest('.scenario-event-link');
      if (!link) return;
      e.preventDefault();
      go(link);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var link = e.target.closest && e.target.closest('.scenario-event-link');
      if (!link) return;
      e.preventDefault();
      go(link);
    });
  }

  function init() {
    buildOutliner();
    initToggle();
    initCopy();
    initEventLinks();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
