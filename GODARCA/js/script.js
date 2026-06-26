// コピーボックス共通機能（ページ内複数対応）
(function(){
  // copy 関連
  function copyText(text){
    if(navigator.clipboard && navigator.clipboard.writeText){
      return navigator.clipboard.writeText(text);
    }
    // フォールバック（古いブラウザ）
    return new Promise((resolve, reject) => {
      const ta = document.createElement('textarea');
      ta.value = text;
      // ページに見えないようにする
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        document.body.removeChild(ta);
        resolve();
      } catch (err) {
        document.body.removeChild(ta);
        reject(err);
      }
    });
  }

  // UI フィードバック表示
  function showFeedback(container, msg='コピーしました！'){
    const fb = container.querySelector('.copy-feedback');
    if(!fb) return;
    fb.textContent = msg;
    fb.classList.remove('show'); // reset
    // フレームを挟んで class を付与（アニメ用）
    requestAnimationFrame(()=> {
      fb.classList.add('show');
    });
    // 3秒後に消す（アニメ終了に合わせる）
    setTimeout(()=> fb.classList.remove('show'), 2500);
  }

  // イベントバインド
  document.addEventListener('click', (e) => {
    const cpBtn = e.target.closest('.copy-btn');
    if(cpBtn){
      const targetId = cpBtn.dataset.target;
      const container = document.getElementById(targetId);
      if(!container) return;
      const contentEl = container.querySelector('.copy-content');
      const text = contentEl ? contentEl.innerText : '';
      copyText(text).then(()=> {
		  showFeedback(container, 'Copy completed');
	  }).catch(()=> {
		  showFeedback(container, 'Copy failed');
	  });
      return;
    }

  });

  // キーボードコピーサポート（Ctrl/Cmd+C when focused on content）
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
      const focused = document.activeElement;
      const container = focused ? focused.closest('.copy-box') : null;
      if(container){
        const contentEl = container.querySelector('.copy-content');
        if(contentEl){
          e.preventDefault();
          copyText(contentEl.innerText).then(()=> showFeedback(container, 'コピーしました！'));
        }
      }
    }
  });
})();

function allcheck( tf ) {
   var ElementsCount = document.round.elements.length; // チェックボックスの数
   for( i=0 ; i<ElementsCount ; i++ ) {
      document.round.elements[i].checked = tf; // ON・OFFを切り替え
   }
}
