/*
 * TrackLin.es embed widget (TL-494).
 *
 * Drop one of these on your own site:
 *   <script src="https://tracklin.es/embed.js" data-roadmap="ROADMAP_ID"></script>
 *   <script src="https://tracklin.es/embed.js" data-request="REQUEST_TOKEN"></script>
 *
 * It renders the public roadmap, or the request form, where the tag sits (or into the element named
 * by data-target). It calls the TrackLin.es API from your page, so your origin must be added to the
 * organisation's allowed embed origins first (Settings → Embedding) — otherwise the browser blocks it.
 *
 * Classic script, no dependencies. The render helpers are also exported for tests; nothing touches the
 * DOM unless it's actually running in a browser.
 */
(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // apiBaseFrom turns the widget's own script URL into the API base, so the widget talks to the site it
  // was served from (https://tracklin.es/embed.js → https://tracklin.es/api). A data-base overrides it.
  function apiBaseFrom(src) {
    try {
      return new URL(src).origin + '/api';
    } catch (_e) {
      return '/api';
    }
  }

  var STATUS_LABEL = { not_started: 'Not started', in_progress: 'In progress', done: 'Done' };

  // renderRoadmap builds the roadmap's HTML from the public API shape. All text is escaped: it's remote
  // data dropped into someone else's page.
  function renderRoadmap(data) {
    var items = (data && data.items) || [];
    var head =
      '<h2 class="tl-embed-title">' + esc(data && data.title) + '</h2>' +
      (data && data.description ? '<p class="tl-embed-desc">' + esc(data.description) + '</p>' : '');
    if (!items.length) {
      return '<div class="tl-embed-roadmap">' + head + '<p class="tl-embed-muted">Nothing on the roadmap yet.</p></div>';
    }
    var rows = items
      .map(function (it) {
        var status = it.status || it.manual_status || 'not_started';
        var p = it.progress;
        var meta = [];
        if (it.target_date) meta.push(esc(it.target_date));
        if (p && p.total) meta.push(p.done + '/' + p.total + ' done');
        return (
          '<li class="tl-embed-item tl-embed-' + esc(status) + '">' +
          '<div class="tl-embed-item-head">' +
          '<span class="tl-embed-dot"></span>' +
          '<span class="tl-embed-item-title">' + esc(it.title) + '</span>' +
          '<span class="tl-embed-badge">' + esc(STATUS_LABEL[status] || status) + '</span>' +
          '</div>' +
          // what the item is, as the roadmap page says it: a title alone ("Your data") rarely explains itself
          (it.description ? '<p class="tl-embed-item-desc">' + esc(it.description) + '</p>' : '') +
          (meta.length ? '<div class="tl-embed-meta">' + esc(meta.join(' · ')) + '</div>' : '') +
          '</li>'
        );
      })
      .join('');
    return '<div class="tl-embed-roadmap">' + head + '<ul class="tl-embed-list">' + rows + '</ul></div>';
  }

  // renderForm builds the request form. It's a normal <form>; the bootstrap wires submission.
  function renderForm() {
    return (
      '<form class="tl-embed-form" novalidate>' +
      '<fieldset class="tl-embed-types"><legend>What is it?</legend>' +
      '<label><input type="radio" name="type" value="bug" checked> Bug report</label>' +
      '<label><input type="radio" name="type" value="feature"> Feature request</label>' +
      '</fieldset>' +
      '<label class="tl-embed-field"><span>Title</span>' +
      '<input type="text" name="title" maxlength="200" required></label>' +
      '<label class="tl-embed-field"><span>Details <em>(optional)</em></span>' +
      '<textarea name="details" maxlength="5000" rows="5"></textarea></label>' +
      '<label class="tl-embed-field"><span>How can we reach you? <em>(optional)</em></span>' +
      '<input type="text" name="contact" maxlength="200" autocomplete="email"></label>' +
      // honeypot: hidden from people; a bot that fills it is dropped
      '<div class="tl-embed-hp" aria-hidden="true"><label>Website<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>' +
      '<p class="tl-embed-msg" role="alert"></p>' +
      '<button type="submit" class="tl-embed-btn">Send request</button>' +
      '</form>'
    );
  }

  function submitError(status) {
    if (status === 400) return 'Please add a title and choose bug or feature.';
    if (status === 404) return 'This form isn’t taking requests any more.';
    if (status === 429) return 'You’ve sent a few requests already. Please try again in an hour.';
    return 'Couldn’t send your request. Please try again.';
  }

  var CSS =
    '.tl-embed{font:14px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111;max-width:640px}' +
    '.tl-embed *{box-sizing:border-box}' +
    '.tl-embed-title{font-size:1.25rem;font-weight:700;margin:0 0 .25rem}' +
    '.tl-embed-desc{margin:0 0 1rem;color:#555}' +
    '.tl-embed-muted{color:#777}' +
    '.tl-embed-list{list-style:none;margin:0;padding:0;display:grid;gap:.5rem}' +
    '.tl-embed-item{border:1px solid #e5e7eb;border-radius:.5rem;padding:.6rem .75rem}' +
    '.tl-embed-item-head{display:flex;align-items:center;gap:.5rem}' +
    '.tl-embed-item-title{font-weight:600;flex:1 1 auto}' +
    '.tl-embed-dot{width:.6rem;height:.6rem;border-radius:50%;background:#cbd5e1;flex:none}' +
    '.tl-embed-in_progress .tl-embed-dot{background:#f59e0b}.tl-embed-done .tl-embed-dot{background:#16a34a}' +
    '.tl-embed-badge{font-size:.75rem;color:#555;border:1px solid #e5e7eb;border-radius:999px;padding:.05rem .5rem}' +
    '.tl-embed-item-desc{margin:.25rem 0 0 1.1rem;color:#555;white-space:pre-line}' +
    '.tl-embed-meta{color:#777;font-size:.8rem;margin-top:.25rem}' +
    '.tl-embed-form{display:grid;gap:.75rem}' +
    '.tl-embed-field{display:grid;gap:.25rem;font-weight:500}' +
    '.tl-embed-field input,.tl-embed-field textarea{font:inherit;padding:.4rem .5rem;border:1px solid #cbd5e1;border-radius:.4rem;width:100%}' +
    '.tl-embed-types{border:0;padding:0;margin:0;display:flex;gap:1rem;font-weight:500}.tl-embed-types legend{padding:0;margin-bottom:.25rem}' +
    '.tl-embed-hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}' +
    '.tl-embed-btn{font:inherit;font-weight:600;background:#111;color:#fff;border:0;border-radius:.4rem;padding:.5rem .9rem;cursor:pointer;justify-self:start}' +
    '.tl-embed-btn[disabled]{opacity:.6;cursor:default}' +
    '.tl-embed-msg{margin:0;color:#b91c1c;min-height:1px}.tl-embed-msg.tl-embed-ok{color:#166534}';

  function injectCSS(doc) {
    if (doc.getElementById('tl-embed-css')) return;
    var style = doc.createElement('style');
    style.id = 'tl-embed-css';
    style.textContent = CSS;
    doc.head.appendChild(style);
  }

  function fail(el, text) {
    el.innerHTML = '<p class="tl-embed-muted">' + esc(text) + '</p>';
  }

  // withKey adds the embed key (data-key) as ?embed=, so the backend can attribute the hit for stats.
  function withKey(url, key) {
    if (!key) return url;
    return url + (url.indexOf('?') >= 0 ? '&' : '?') + 'embed=' + encodeURIComponent(key);
  }

  function mountRoadmap(el, base, id, key) {
    fetch(withKey(base + '/roadmaps/' + encodeURIComponent(id), key), { headers: { Accept: 'application/json' } })
      .then(function (r) {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then(function (data) {
        el.innerHTML = renderRoadmap(data);
      })
      .catch(function () {
        fail(el, 'Couldn’t load this roadmap.');
      });
  }

  function mountForm(el, base, token, key) {
    el.innerHTML = renderForm();
    var form = el.querySelector('form');
    var msg = form.querySelector('.tl-embed-msg');
    var btn = form.querySelector('.tl-embed-btn');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = new FormData(form);
      var title = String(data.get('title') || '').trim();
      msg.className = 'tl-embed-msg';
      if (!title) {
        msg.textContent = 'Please add a title.';
        return;
      }
      btn.disabled = true;
      fetch(withKey(base + '/intake/' + encodeURIComponent(token), key), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: data.get('type') || 'bug',
          title: title,
          details: String(data.get('details') || '').trim(),
          contact: String(data.get('contact') || '').trim(),
          website: String(data.get('website') || ''),
        }),
      })
        .then(function (r) {
          if (!r.ok && r.status !== 202) throw new Error(String(r.status));
          el.innerHTML = '<p class="tl-embed-msg tl-embed-ok" role="status">Thanks — we’ve got your request.</p>';
        })
        .catch(function (err) {
          btn.disabled = false;
          msg.textContent = submitError(Number(err && err.message));
        });
    });
  }

  function boot(script) {
    var doc = script.ownerDocument || document;
    var roadmap = script.getAttribute('data-roadmap');
    var token = script.getAttribute('data-request');
    if (!roadmap && !token) return;
    var base = script.getAttribute('data-base') || apiBaseFrom(script.src);
    var key = script.getAttribute('data-key') || '';
    var target = script.getAttribute('data-target');
    var el = target ? doc.querySelector(target) : null;
    if (!el) {
      el = doc.createElement('div');
      script.parentNode.insertBefore(el, script.nextSibling);
    }
    el.className = (el.className ? el.className + ' ' : '') + 'tl-embed';
    injectCSS(doc);
    if (roadmap) mountRoadmap(el, base, roadmap, key);
    else mountForm(el, base, token, key);
  }

  if (typeof document !== 'undefined' && document.currentScript) {
    boot(document.currentScript);
  }

  // Exported for tests (classic browsers ignore this; module is undefined there).
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { esc: esc, apiBaseFrom: apiBaseFrom, withKey: withKey, renderRoadmap: renderRoadmap, renderForm: renderForm, submitError: submitError };
  }
})();
