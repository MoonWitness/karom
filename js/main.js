/* ============================================================
   轻音少女 K-ON! 资料站 — 渲染与交互
   依赖 js/data.js（window.KON）
   ============================================================ */
(function () {
  'use strict';
  document.documentElement.classList.replace('no-js', 'js');

  var D = window.KON;
  if (!D) return;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* ---------- 顶部导航：高亮 + 阴影 ---------- */
  var nav = $('#siteNav');
  var navLinks = $$('.nav-links a');
  var secs = $$('section[id]').map(function (s) { return { el: s, id: s.id, top: 0 }; });
  function measure() {
    secs.forEach(function (s) { s.top = s.el.getBoundingClientRect().top + window.pageYOffset; });
  }
  measure();
  window.addEventListener('resize', measure);
  function onScroll() {
    var pos = window.pageYOffset + 150;
    var cur = secs.length ? secs[0].id : '';
    for (var i = 0; i < secs.length; i++) {
      if (secs[i].el.getBoundingClientRect().top + window.pageYOffset <= pos) cur = secs[i].id;
    }
    navLinks.forEach(function (a) {
      a.classList.toggle('is-active', a.getAttribute('href') === '#' + cur);
    });
    nav.classList.toggle('scrolled', window.pageYOffset > 10);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- 滚动显现 ---------- */
  var reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('visible'); io.unobserve(en.target); }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('visible'); });
  }

  /* ---------- 背景图自动加载 ---------- */
  function probe(src, ok) {
    var im = new Image();
    im.onload = function () { ok(src); };
    im.onerror = function () { ok(null); };
    im.src = src;
  }
  function firstExisting(bases, ok) {
    (function tryNext(i) {
      if (i >= bases.length) { ok(null); return; }
      probe(bases[i], function (s) { s ? ok(s) : tryNext(i + 1); });
    })(0);
  }
  var hero = $('.hero');
  firstExisting(['images/bg/hero.png', 'images/bg/hero.jpg'], function (src) {
    if (src) {
      hero.classList.add('has-img');
      hero.style.setProperty('--hero-img', 'url("' + src + '")');
      var bg = $('.hero-bg');
      if (bg) bg.style.backgroundImage = 'url("' + src + '")';
    }
  });

  /* ---------- 01 资料卡 ---------- */
  var dataGrid = $('#dataGrid');
  if (dataGrid && D.data) {
    dataGrid.innerHTML = D.data.map(function (card) {
      return '<article class="data-card" style="--dc:' + card.color + '; --dc-deep:' + card.deep + '">' +
        '<h3>' + card.tag + '</h3><dl>' +
        card.rows.map(function (r) {
          return '<div><dt>' + r[0] + '</dt><dd>' + r[1] + '</dd></div>';
        }).join('') +
        '</dl></article>';
    }).join('');
  }

  /* ---------- 02 剧情 ---------- */
  var storyNote = $('#storyNote');
  if (storyNote) storyNote.textContent = D.episodeNote || '';

  function renderStory(arc) {
    var list = $('#storyList');
    if (!list) return;
    var eps = (D.episodes || []).filter(function (e) { return e.arc === arc; });
    var seasons = [1, 2];
    var out = '';
    seasons.forEach(function (sn) {
      var rows = eps.filter(function (e) { return e.season === sn; });
      if (!rows.length) return;
      var accent = sn === 1 ? '#C96A84' : '#5B6C8E';
      out += '<h4 class="ep-season s' + sn + '">Season ' + sn +
        (sn === 1 ? ' ・ けいおん!（第一季）' : ' ・ けいおん!!（第二季）') + '</h4>';
      rows.forEach(function (e) {
        out += '<article class="ep-row" style="--ec:' + accent + '">' +
          '<div class="ep-line">' +
            '<span class="ep-no">EP ' + (sn === 1 ? e.num : String(e.num).padStart(2, '0')) + '</span>' +
            '<h5 class="ep-title">' + e.title + '</h5>' +
            (e.jp ? '<span class="ep-jp">' + e.jp + '</span>' : '') +
          '</div>' +
          '<p class="ep-text">' + e.text + '</p>' +
          (e.highlight ? '<p class="ep-hit">' + e.highlight + '</p>' : '') +
        '</article>';
      });
    });
    list.innerHTML = out || '<p class="js-wait">该分段暂时没有内容。</p>';
  }

  var tabs = $('#storyTabs');
  if (tabs && $('#storyList')) {
    renderStory('pre');
    $$('.story-tab', tabs).forEach(function (b) {
      b.addEventListener('click', function () {
        $$('.story-tab', tabs).forEach(function (x) { x.classList.remove('is-active'); });
        b.classList.add('is-active');
        renderStory(b.dataset.arc);
      });
    });
  }

  /* ---------- 03 人物 ---------- */
  var FALLBACK_CHAR = { yui: '唯', mio: '澪', ritsu: '律', mugi: '紬', azusa: '梓', ui: '忧', sawako: '佐', nodoka: '和', jun: '纯', zasshiki: '路' };
  var charArt = $('#mainChars');
  var subBox = $('#subChars');
  var imgNote = $('#charImgNote');

  function artHTML(slug, cls, smChar) {
    return '<span class="art-slot" data-slug="' + slug + '">' +
      '<img alt="" hidden><span class="art-fallback">' + (smChar || '♪') + '</span></span>';
  }
  function fillArt(slot) {
    var slug = slot.dataset.slug;
    var img = $('img', slot);
    if (!img) return;
    firstExisting([
      'images/characters/' + slug + '.png',
      'images/characters/' + slug + '.jpg'
    ], function (src) {
      if (src) { img.src = src; img.hidden = false; $('.art-fallback', slot).hidden = true; }
    });
  }

  function openCharModal(c) {
    if ($('.modal-backdrop')) return;
    var backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.innerHTML =
      '<div class="modal-card" style="--cc:' + c.color + '; --cc-deep:' + c.deep + '">' +
        '<div class="mc-head"><h3>' + c.name + '</h3><p>' + c.role + ' ・ ' + c.romaji + '</p></div>' +
        '<div class="mc-body">' +
          '<p class="m-line">' + c.line + '</p>' +
          '<p>' + c.detail + '</p>' +
        '</div>' +
        '<button type="button" class="mc-close">关 闭</button>' +
      '</div>';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', function (ev) { if (ev.target === backdrop) close(); });
    $('.mc-close', backdrop).addEventListener('click', close);
    function close() { backdrop.remove(); window.removeEventListener('keydown', onKey); }
    function onKey(ev) { if (ev.key === 'Escape') close(); }
    window.addEventListener('keydown', onKey);
    $('.mc-close', backdrop).focus();
  }

  if (charArt && D.characters) {
    var mains = D.characters.main || [];
    charArt.innerHTML = mains.map(function (c) {
      return '<article class="char-panel" data-slug="' + c.slug + '" style="--cc:' + c.color + '; --cc-deep:' + c.deep + '">' +
        '<div class="char-art" style="--cc:' + c.color + '">' + artHTML(c.slug, 'char-art', FALLBACK_CHAR[c.slug] || '♪') + '</div>' +
        '<div class="char-main">' +
          '<h4 class="c-name">' + c.name + ' <span class="c-romaji">' + c.romaji + '</span></h4>' +
          '<p class="c-role">' + c.role + '</p>' +
          '<p class="c-line">' + c.line + '</p>' +
          '<ul class="char-tags">' + (c.tags || []).map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul>' +
          '<p class="c-short">' + c.short + '</p>' +
          '<button type="button" class="c-btn-ghost c-open">详细档案 ></button>' +
        '</div>' +
      '</article>';
    }).join('');
    var subs = D.characters.sub || [];
    if (subBox) {
      subBox.innerHTML = subs.map(function (c) {
        return '<button type="button" class="sub-char" data-slug="' + c.slug + '" style="--cc:' + c.color + '; --cc-deep:' + c.deep + '">' +
          '<span class="art-sm" style="--cc:' + c.color + '">' + artHTML(c.slug, 'art-sm', FALLBACK_CHAR[c.slug] || '♪') + '</span>' +
          '<span><span class="sc-name">' + c.name + '</span><br><span class="sc-role">' + c.role + '</span></span>' +
        '</button>';
      }).join('');
    }
    // 图位自动读取 + 点击展开
    var bySlug = {};
    mains.concat(subs).forEach(function (c) { bySlug[c.slug] = c; });
    $$('.art-slot').forEach(fillArt);
    charArt.addEventListener('click', onOpen);
    if (subBox) subBox.addEventListener('click', onOpen);
    function onOpen(ev) {
      var el = ev.target.closest('[data-slug]');
      var c = el && bySlug[el.dataset.slug];
      if (c) openCharModal(c);
    }
  }
  if (imgNote) {
    imgNote.innerHTML = '角色图片图位：<code>images/characters/yui.png</code> <code>mio.png</code> <code>ritsu.png</code> <code>mugi.png</code> <code>azusa.png</code>（配角 <code>ui / sawako / nodoka / jun / zasshiki</code>）。放入后刷新即自动显示；没有图时显示原创色块占位。';
  }

  /* ---------- 04 歌曲 ---------- */
  var songList = $('#songList');
  if (songList && D.songs) {
    var KIND_CLASS = { OP: 'sk-op', ED: 'sk-ed', '剧场版': 'sk-movie', '剧中歌': 'sk-live' };
    function renderSongs(kind) {
      songList.innerHTML = (D.songs || []).filter(function (s) { return kind === '全部' || s.kind === kind; })
        .map(function (s) {
          return '<article class="song-row">' +
            '<span class="sk ' + (KIND_CLASS[s.kind] || '') + '">' + s.kind + '</span>' +
            '<div class="s-main"><div class="s-title">' + s.title + '</div>' +
            '<div class="s-note">' + (s.note || '') + '</div></div>' +
            '<div class="s-meta"><b>' + s.owner + '</b><span>' + s.where + '</span></div>' +
          '</article>';
        }).join('') || '<p class="js-wait">没有该分类的歌曲。</p>';
    }
    renderSongs('全部');
    var filters = $('#songFilters');
    $$('.sf-btn', filters).forEach(function (b) {
      b.addEventListener('click', function () {
        $$('.sf-btn', filters).forEach(function (x) { x.classList.remove('is-active'); });
        b.classList.add('is-active');
        renderSongs(b.dataset.kind);
      });
    });
  }

  /* ---------- 05 测验 ---------- */
  var quizForm = $('#quizForm');
  if (quizForm && D.quiz) {
    quizForm.innerHTML = (D.quiz || []).map(function (q, i) {
      var lvClass = q.level === '老粉硬核' ? 'vet' : 'new';
      return '<fieldset class="q-item">' +
        '<div class="q-head"><span class="q-no">Q' + (i + 1) + '</span>' +
        '<span class="q-lv ' + lvClass + '">' + q.level + '</span></div>' +
        '<p class="q-text">' + q.q + '</p>' +
        '<div class="q-opts">' +
        q.opts.map(function (o, j) {
          return '<label><input type="radio" name="q' + (i + 1) + '" value="' + j + '"><span>' + o + '</span></label>';
        }).join('') +
        '</div></fieldset>';
    }).join('') +
      '<button type="submit" class="btn btn-primary quiz-submit">交卷，看看我的等级</button>';
  }

  var resultBox = $('#quizResult');
  var resultLabel = $('#resultLabel');
  var resultTitle = $('#resultTitle');
  var resultReview = $('#resultReview');

  var TIERS = [
    { min: 10, name: '放学后茶会·元老', col: '#C96A84', msg: '不用说了，你连 Zasshiki 出现几次都数过吧。' },
    { min: 8, name: '资深的茶友', col: '#5B6C8E', msg: '那些年一起喝过的茶，你全都记得。' },
    { min: 6, name: '会心一笑的熟客', col: '#E8864E', msg: '大部分梗你都能接住，就差一题封神。' },
    { min: 4, name: '常来的新面孔', col: '#A67C1E', msg: '欢迎入坑！下面解析里都是温暖的回忆点。' },
    { min: 0, name: '刚走到部室门口', col: '#7A6A8E', msg: '没关系——推开门，第一杯茶请你喝。' }
  ];

  if (quizForm && resultBox) {
    quizForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = new FormData(quizForm);
      var picked = [];
      var allAnswered = true;
      (D.quiz || []).forEach(function (q, i) {
        var v = data.get('q' + (i + 1));
        if (v === null) allAnswered = false;
        picked.push(v === null ? -1 : parseInt(v, 10));
      });
      if (!allAnswered) {
        alert('还有几题没选哦～全部答完再看等级吧。');
        return;
      }
      var right = 0;
      picked.forEach(function (p, i) { if (p === D.quiz[i].ans) right += 1; });
      var tier = TIERS.filter(function (t) { return right >= t.min; })[0];
      resultTitle.textContent = tier.name;
      resultTitle.style.setProperty('--rc', tier.col);
      resultLabel.textContent = '你的等级';
      var score = $('#quizResult .result-score');
      if (!score) {
        var p = document.createElement('p');
        p.className = 'result-score';
        resultTitle.after(p);
        score = p;
      }
      score.textContent = right + ' / ' + D.quiz.length + ' 　' + tier.msg;

      resultReview.innerHTML = (D.quiz || []).map(function (q, i) {
        var isOk = picked[i] === q.ans;
        return '<li class="' + (isOk ? 'ok' : 'bad') + '"><span class="rt">' + (isOk ? '对' : '错') + '</span>' +
          '<span class="rq">Q' + (i + 1) + ' ' + q.q + '</span><br>' +
          (isOk ? '' : '你的答案：' + (q.opts[picked[i]] || '未选') + '　→　正确答案：' + q.opts[q.ans] + '<br>') +
          '解析：' + q.note + '</li>';
      }).join('');

      quizForm.hidden = true;
      resultBox.hidden = false;
      if (!reduceMotion) resultBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    var retry = $('.quiz-retry');
    if (retry) retry.addEventListener('click', function () {
      resultBox.hidden = true;
      quizForm.hidden = false;
      quizForm.reset();
      if (!reduceMotion) {
        window.scrollTo({ top: quizForm.getBoundingClientRect().top + window.pageYOffset - 100, behavior: 'smooth' });
      }
    });
  }
})();
