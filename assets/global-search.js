// ===== 全ページ横断検索（Ctrl+K / Cmd+K） =====
// 候補者・企業・提案求人（パイプライン）を横断して検索し、該当ページへ遷移する。
// 各ページ側で先に作成済みの Supabase クライアント（`sb`）をそのまま利用する。
(function () {
  var BASE = {
    candidates: 'https://k-aikawa-ai-torch.github.io/ai-torch-company-search/candidates.html',
    companies: 'https://k-aikawa-ai-torch.github.io/ai-torch-company-search/companies.html',
    pipeline: 'https://k-aikawa-ai-torch.github.io/ai-torch-company-search/pipeline.html',
  };

  var overlay = null, inputEl = null, resultsEl = null, debounceTimer = null, searchSeq = 0;

  function esc(s) {
    return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  }

  function ensureOverlay() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.id = 'global-search-overlay';
    overlay.innerHTML =
      '<div id="global-search-box">' +
        '<input type="text" id="global-search-input" placeholder="候補者名・企業名・求人名で検索…（Escで閉じる）" autocomplete="off">' +
        '<div id="global-search-results"><div class="gs-empty">候補者・企業・提案求人を横断して検索できます</div></div>' +
      '</div>';
    document.body.appendChild(overlay);
    inputEl = document.getElementById('global-search-input');
    resultsEl = document.getElementById('global-search-results');

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) window.closeGlobalSearch();
    });
    inputEl.addEventListener('input', function () {
      clearTimeout(debounceTimer);
      var q = inputEl.value.trim();
      if (!q) {
        resultsEl.innerHTML = '<div class="gs-empty">候補者・企業・提案求人を横断して検索できます</div>';
        return;
      }
      resultsEl.innerHTML = '<div class="gs-empty">検索中…</div>';
      debounceTimer = setTimeout(function () { runSearch(q); }, 250);
    });
  }

  async function runSearch(q) {
    var mySeq = ++searchSeq;
    if (typeof sb === 'undefined' || !sb) {
      resultsEl.innerHTML = '<div class="gs-empty">検索機能を初期化できませんでした</div>';
      return;
    }
    try {
      var results = await Promise.all([
        sb.from('candidates').select('id,name,current_company,phase').ilike('name', '%' + q + '%').is('deleted_at', null).limit(6),
        sb.from('companies').select('id,name,industry').ilike('name', '%' + q + '%').limit(6),
        sb.from('pipeline').select('id,job_name,candidates(name),companies(name)').ilike('job_name', '%' + q + '%').limit(6),
      ]);
      if (mySeq !== searchSeq) return; // 入力が変わっていたら古い結果は破棄
      renderResults(q, (results[0].data || []), (results[1].data || []), (results[2].data || []));
    } catch (e) {
      if (mySeq !== searchSeq) return;
      resultsEl.innerHTML = '<div class="gs-empty">検索中にエラーが発生しました</div>';
    }
  }

  function renderResults(q, candidates, companies, pipelines) {
    if (!candidates.length && !companies.length && !pipelines.length) {
      resultsEl.innerHTML = '<div class="gs-empty">「' + esc(q) + '」に一致する結果が見つかりませんでした</div>';
      return;
    }
    var html = '';
    if (candidates.length) {
      html += '<div class="gs-group-title">👤 候補者</div>';
      candidates.forEach(function (c) {
        var sub = [c.current_company, c.phase].filter(Boolean).join(' ・ ');
        html += '<div class="gs-item" onclick="window.__gsGo(\'' + BASE.candidates + '?id=' + encodeURIComponent(c.id) + '\')">' +
          '<span class="gs-item-title">' + esc(c.name || '(名前未設定)') + '</span>' +
          (sub ? '<span class="gs-item-sub">' + esc(sub) + '</span>' : '') +
          '</div>';
      });
    }
    if (companies.length) {
      html += '<div class="gs-group-title">🏢 企業</div>';
      companies.forEach(function (co) {
        html += '<div class="gs-item" onclick="window.__gsGo(\'' + BASE.companies + '?q=' + encodeURIComponent(co.name || '') + '\')">' +
          '<span class="gs-item-title">' + esc(co.name || '(企業名未設定)') + '</span>' +
          (co.industry ? '<span class="gs-item-sub">' + esc(co.industry) + '</span>' : '') +
          '</div>';
      });
    }
    if (pipelines.length) {
      html += '<div class="gs-group-title">🅿️ 提案求人</div>';
      pipelines.forEach(function (p) {
        var companyName = p.companies ? p.companies.name : '';
        var candidateName = p.candidates ? p.candidates.name : '';
        var sub = [companyName, candidateName].filter(Boolean).join(' ・ ');
        html += '<div class="gs-item" onclick="window.__gsGo(\'' + BASE.pipeline + '?id=' + encodeURIComponent(p.id) + '\')">' +
          '<span class="gs-item-title">' + esc(p.job_name || '(求人名未設定)') + '</span>' +
          (sub ? '<span class="gs-item-sub">' + esc(sub) + '</span>' : '') +
          '</div>';
      });
    }
    resultsEl.innerHTML = html;
  }

  window.__gsGo = function (url) {
    window.location.href = url;
  };

  window.openGlobalSearch = function () {
    ensureOverlay();
    overlay.classList.add('open');
    inputEl.value = '';
    resultsEl.innerHTML = '<div class="gs-empty">候補者・企業・提案求人を横断して検索できます</div>';
    setTimeout(function () { inputEl.focus(); }, 0);
  };

  window.closeGlobalSearch = function () {
    if (overlay) overlay.classList.remove('open');
  };

  document.addEventListener('keydown', function (e) {
    var isSearchOpen = overlay && overlay.classList.contains('open');
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      window.openGlobalSearch();
    } else if (e.key === 'Escape' && isSearchOpen) {
      e.stopPropagation();
      window.closeGlobalSearch();
    }
  });
})();
