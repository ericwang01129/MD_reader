/* ============================================================
   MD Reader · 簡易密碼門檻（版權保護用）
   ------------------------------------------------------------
   注意：此為「明碼」前端密碼，僅作為阻擋隨手存取的輕量門檻，
   並非真正的安全機制（任何人檢視原始碼即可看到密碼）。
   通過後記錄於 localStorage，同一瀏覽器（同源）之各分頁／各頁共用，
   因此於 index 解鎖後，於新分頁開啟的完整劇本不會再次詢問。
   ============================================================ */
(function () {
  'use strict';

  var PASSWORD = 'ericwang';            // 固定密碼（明碼）
  var STORAGE_KEY = 'mdreader_auth_v1'; // 與各頁面 inline 守衛共用

  function isAuthed() {
    try { return localStorage.getItem(STORAGE_KEY) === '1'; }
    catch (e) { return false; }
  }
  function setAuthed() {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch (e) {}
  }

  function injectStyles() {
    if (document.getElementById('mdAuthStyles')) return;
    var css = [
      '#mdAuthGate{position:fixed;inset:0;z-index:2147483647;display:flex;',
      'align-items:center;justify-content:center;padding:1.5rem;box-sizing:border-box;',
      'background:#101013;background:linear-gradient(160deg,#1f2024,#101013);',
      'font-family:"Noto Sans TC",system-ui,-apple-system,sans-serif;}',
      '#mdAuthGate *{box-sizing:border-box;}',
      '#mdAuthGate .md-auth-card{width:100%;max-width:360px;background:#fff;',
      'border-radius:14px;padding:2rem 1.75rem;box-shadow:0 20px 60px rgba(0,0,0,.45);',
      'text-align:center;}',
      '#mdAuthGate .md-auth-title{margin:0 0 .5rem;font-size:1.35rem;color:#1a1a1a;font-weight:700;}',
      '#mdAuthGate .md-auth-desc{margin:0 0 1.25rem;font-size:.9rem;line-height:1.6;color:#666;}',
      '#mdAuthGate .md-auth-input{width:100%;padding:.7rem .85rem;font-size:1rem;',
      'border:1px solid #d2d2d7;border-radius:8px;outline:none;transition:border-color .15s;}',
      '#mdAuthGate .md-auth-input:focus{border-color:#4a6cf7;}',
      '#mdAuthGate .md-auth-btn{width:100%;margin-top:.85rem;padding:.7rem;font-size:1rem;',
      'font-weight:600;color:#fff;background:#4a6cf7;border:none;border-radius:8px;',
      'cursor:pointer;transition:background .15s;}',
      '#mdAuthGate .md-auth-btn:hover{background:#3a5be0;}',
      '#mdAuthGate .md-auth-error{margin:.85rem 0 0;font-size:.82rem;color:#e0264c;}'
    ].join('');
    var style = document.createElement('style');
    style.id = 'mdAuthStyles';
    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);
  }

  function buildGate(onSuccess) {
    if (document.getElementById('mdAuthGate')) return;
    injectStyles();

    var overlay = document.createElement('div');
    overlay.id = 'mdAuthGate';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    var card = document.createElement('form');
    card.className = 'md-auth-card';

    var title = document.createElement('h1');
    title.className = 'md-auth-title';
    title.textContent = '需要密碼';

    var desc = document.createElement('p');
    desc.className = 'md-auth-desc';
    desc.textContent = '此內容受版權保護，請輸入密碼後閱覽。';

    var input = document.createElement('input');
    input.type = 'password';
    input.className = 'md-auth-input';
    input.placeholder = '請輸入密碼';
    input.autocomplete = 'current-password';
    input.setAttribute('aria-label', '密碼');

    var btn = document.createElement('button');
    btn.type = 'submit';
    btn.className = 'md-auth-btn';
    btn.textContent = '進入';

    var err = document.createElement('p');
    err.className = 'md-auth-error';
    err.textContent = '密碼錯誤，請再試一次。';
    err.style.visibility = 'hidden';

    card.appendChild(title);
    card.appendChild(desc);
    card.appendChild(input);
    card.appendChild(btn);
    card.appendChild(err);
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    var prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';

    function close() {
      document.documentElement.style.overflow = prevOverflow;
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }

    card.addEventListener('submit', function (e) {
      e.preventDefault();
      if (input.value === PASSWORD) {
        setAuthed();
        close();
        if (typeof onSuccess === 'function') onSuccess();
      } else {
        err.style.visibility = 'visible';
        input.value = '';
        input.focus();
      }
    });

    setTimeout(function () { input.focus(); }, 30);
  }

  // 公開 API：若已驗證 → 直接執行 onSuccess；否則顯示密碼門檻，
  // 驗證成功後才執行 onSuccess。回傳目前是否已驗證。
  function require(onSuccess) {
    if (isAuthed()) {
      if (typeof onSuccess === 'function') onSuccess();
      return true;
    }
    function show() { buildGate(onSuccess); }
    if (document.body) show();
    else document.addEventListener('DOMContentLoaded', show);
    return false;
  }

  window.MDAuth = { isAuthed: isAuthed, require: require };
})();
