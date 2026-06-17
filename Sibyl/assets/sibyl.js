/* Sibyl 繁中版 — 可複製文字塊的「複製」按鈕
   每個 .copy-block 內含一段 .copy-text-block 文本與一個 .copy-btn。 */
(function () {
  'use strict';
  function textOf(block) {
    var el = block.querySelector('.copy-text-block');
    if (!el) return '';
    // 將 <br> 轉為換行後取純文字
    var html = el.innerHTML.replace(/<br\s*\/?>/gi, '\n');
    var tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent.replace(/\n{3,}/g, '\n\n').trim();
  }
  function flash(btn) {
    var old = btn.textContent;
    btn.textContent = '已複製 ✓';
    btn.classList.add('copied');
    setTimeout(function () {
      btn.textContent = old;
      btn.classList.remove('copied');
    }, 1400);
  }
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.copy-btn');
    if (!btn) return;
    var block = btn.closest('.copy-block');
    if (!block) return;
    var text = textOf(block);
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
})();
