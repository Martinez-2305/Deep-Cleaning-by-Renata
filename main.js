// Menu button, before/after sliders, and the quote form: validation, real
// submission to the configured endpoint, and honest success/error states. Also
// pre-selects the service when a service card's "Get a quote" link is used, and
// hides the mobile action bar while the hero buttons, quote form or footer are on screen.
(function () {
  'use strict';

  // Interface text for the page's language, rendered by build.js from src/_i18n/<lang>.json.
  var T = {};
  try { T = JSON.parse(document.getElementById('i18n').textContent); } catch (e) { /* page without strings */ }
  function msg(key, vars) {
    return (T[key] || key).replace(/\{(\w+)\}/g, function (m, k) { return vars && k in vars ? vars[k] : m; });
  }

  // Menu button (below 1024px): rolls the nav down from the header. Closes on
  // Escape, on choosing a link, on a click outside, and when widening to desktop.
  var toggle = document.querySelector('.menu-toggle');
  var menu = document.getElementById('site-menu');
  if (toggle && menu) {
    var setMenu = function (open, returnFocus) {
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      menu.classList.toggle('is-open', open);
      document.body.classList.toggle('menu-open', open);
      if (!open && returnFocus) toggle.focus();
    };
    toggle.addEventListener('click', function () { setMenu(toggle.getAttribute('aria-expanded') !== 'true'); });
    // In-page links: roll the menu up first, then scroll. Scrolling while the
    // header is still collapsing makes the browser abandon the smooth scroll.
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    menu.addEventListener('click', function (e) {
      var a = e.target.closest('a');
      if (!a || !menu.classList.contains('is-open')) return;
      var hash = a.hash, target = hash && a.pathname === location.pathname && document.getElementById(hash.slice(1));
      setMenu(false);
      if (!target) return;
      e.preventDefault();
      setTimeout(function () {
        if (location.hash !== hash) location.hash = hash;
        else target.scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth' });
      }, reduced.matches ? 0 : 360);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) setMenu(false, true);
    });
    document.addEventListener('click', function (e) {
      if (menu.classList.contains('is-open') && !e.target.closest('.site-header')) setMenu(false);
    });
    var desktop = window.matchMedia('(min-width: 1024px)');
    var onChange = function () { if (desktop.matches) setMenu(false); };
    if (desktop.addEventListener) desktop.addEventListener('change', onChange); else desktop.addListener(onChange);
  }

  // Before/after comparison: the range input sets how much of the "before" layer shows.
  Array.prototype.forEach.call(document.querySelectorAll('.ba'), function (ba) {
    var range = ba.querySelector('.ba-range');
    if (!range) return;
    var update = function () {
      ba.style.setProperty('--pos', range.value + '%');
      range.setAttribute('aria-valuetext', msg('sliderValue', { before: range.value, after: 100 - range.value }));
    };
    range.addEventListener('input', update);
    update();
  });

  // Hide the mobile action bar while the hero buttons, the form or the footer are on
  // screen, so it never duplicates the hero CTAs or covers the form.
  var bar = document.getElementById('mobile-bar');
  if (bar && 'IntersectionObserver' in window) {
    var visible = new Set();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) visible.add(en.target); else visible.delete(en.target); });
      var hide = visible.size > 0;
      bar.classList.toggle('is-hidden', hide);
      // inert also takes the hidden bar's buttons out of the keyboard order straight away.
      bar.inert = hide;
      if (hide) bar.setAttribute('aria-hidden', 'true'); else bar.removeAttribute('aria-hidden');
    });
    [document.querySelector('.hero .actions'), document.getElementById('quote'), document.querySelector('.site-footer')].forEach(function (el) { if (el) io.observe(el); });
  }

  var form = document.getElementById('quote-form');
  var statusBox = document.getElementById('form-status');
  if (!form) return;
  form.noValidate = true; // JS takes over; without JS the browser validates natively

  var submitBtn = form.querySelector('button[type="submit"]');
  var submitLabel = submitBtn.textContent;
  var POSTCODE = /^[A-Z]{1,2}[0-9][A-Z0-9]?\s*[0-9][A-Z]{2}$/i;
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Real contact routes only (links still pointing at #quote are placeholders).
  var contactLinks = (function () {
    var find = function (sel) { return document.querySelector('.quote-intro ' + sel); };
    var link = function (a) { return '<a href="' + esc(a.getAttribute('href')) + '">' + esc(a.textContent.trim()) + '</a>'; };
    var parts = [];
    var wa = find('a[href^="https://wa.me/"]'), phone = find('a[href^="tel:"]'), email = find('a[href^="mailto:"]');
    if (wa) parts.push(msg('waPrefix') + link(wa).replace(/>[^<]*</, '>' + esc(msg('waText')) + '<'));
    if (phone) parts.push(msg('callPrefix') + link(phone));
    if (email) parts.push(msg('emailPrefix') + link(email));
    if (!parts.length) return msg('contactFallback');
    var last = parts.pop();
    return parts.length ? parts.join(', ') + msg('or') + last : last;
  })();

  // Each rule returns an error message, or '' when valid.
  var rules = [
    { el: 'f-name', check: function () { return val('name') ? '' : msg('name'); } },
    {
      el: 'f-contact', focus: 'f-phone',
      check: function () {
        var phone = val('phone'), email = val('email');
        if (!phone && !email) return msg('contactMissing');
        if (email && !EMAIL.test(email)) return msg('emailInvalid');
        if (phone && phone.replace(/[^0-9]/g, '').length < 10) return msg('phoneShort');
        return '';
      }
    },
    {
      el: 'f-postcode',
      check: function () {
        var pc = val('postcode');
        if (!pc) return msg('postcodeMissing');
        return POSTCODE.test(pc) ? '' : msg('postcodeInvalid');
      }
    },
    { el: 'f-service', check: function () { return val('service') ? '' : msg('service'); } },
    {
      el: 'f-details',
      check: function () { return val('details').length >= 10 ? '' : msg('details'); }
    }
  ];

  // Photos go by WhatsApp. If ticked, the thank-you message gets a button that opens a chat
  // with Renata, pre-filled with a copy of the enquiry (WhatsApp links can carry text, not files).
  var photosWa = document.getElementById('f-photos-wa');
  var waLink = document.querySelector('.quote-intro a[href^="https://wa.me/"]');

  function enquiryCopy() {
    var lines = [msg('waIntro'), ''];
    // waFields is "name=Name|phone=Phone|…": form field name = short label for the chat.
    msg('waFields').split('|').forEach(function (pair) {
      var parts = pair.split('='), value = val(parts[0]);
      if (value) lines.push(parts[1] + ': ' + value);
    });
    return lines.join('\n');
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function val(name) { return (form.elements[name].value || '').trim(); }

  function setError(rule, message) {
    var el = document.getElementById(rule.el);
    var err = document.getElementById(rule.el + '-error');
    var targets = rule.el === 'f-contact'
      ? [document.getElementById('f-phone'), document.getElementById('f-email')]
      : [el];
    err.textContent = message;
    err.hidden = !message;
    targets.forEach(function (t) {
      var ids = (t.getAttribute('aria-describedby') || '').split(' ').filter(function (id) { return id && id !== err.id; });
      if (message) { t.setAttribute('aria-invalid', 'true'); ids.push(err.id); }
      else t.removeAttribute('aria-invalid');
      if (rule.el === 'f-contact') ids = ids.filter(function (id) { return id !== 'f-contact-hint'; }).concat('f-contact-hint');
      if (ids.length) t.setAttribute('aria-describedby', ids.join(' ')); else t.removeAttribute('aria-describedby');
    });
  }

  function validate() {
    var first = null;
    rules.forEach(function (rule) {
      var msg = rule.check();
      setError(rule, msg);
      if (msg && !first) first = rule;
    });
    return first;
  }

  // Re-check a field once the visitor has moved on from it (and live after a failed submit).
  var attempted = false;
  rules.forEach(function (rule) {
    var box = document.getElementById(rule.el);
    box.addEventListener('focusout', function (e) {
      if (!box.contains(e.relatedTarget) && (attempted || e.target.value)) setError(rule, rule.check());
    });
    box.addEventListener('change', function () {
      if (attempted) setError(rule, rule.check());
    });
  });

  function showStatus(kind, html) {
    statusBox.className = 'form-status is-' + kind;
    statusBox.innerHTML = html;
    statusBox.hidden = false;
    statusBox.focus();
  }

  function setBusy(busy) {
    submitBtn.disabled = busy;
    submitBtn.textContent = busy ? msg('sending') : submitLabel;
    form.setAttribute('aria-busy', busy ? 'true' : 'false');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    attempted = true;
    statusBox.hidden = true;

    var invalid = validate();
    if (invalid) {
      document.getElementById(invalid.focus || invalid.el).focus();
      return;
    }

    var endpoint = form.getAttribute('data-endpoint');
    if (!endpoint) {
      showStatus('error', msg('notConnected', { contact: contactLinks }));
      return;
    }

    setBusy(true);
    var controller = 'AbortController' in window ? new AbortController() : null;
    var timer = controller && setTimeout(function () { controller.abort(); }, 60000);

    // Ticked "send photos on WhatsApp": prepare the chat link now, with a copy of the enquiry.
    var waHref = photosWa && photosWa.checked && waLink
      ? waLink.getAttribute('href').split('?')[0] + '?text=' + encodeURIComponent(enquiryCopy())
      : '';

    fetch(endpoint, {
      method: 'POST',
      body: new FormData(form),
      headers: { Accept: 'application/json' },
      signal: controller ? controller.signal : undefined
    })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        form.hidden = true;
        if (waHref) {
          showStatus('success', msg('successWa') +
            '<p class="form-status-action"><a class="btn btn-primary btn-lg" href="' + esc(waHref) + '" target="_blank" rel="noopener">' +
            '<svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z"/></svg>' +
            esc(msg('waButton')) + '</a></p>');
        } else {
          showStatus('success', msg('success', { contact: contactLinks }));
        }
      })
      .catch(function () {
        setBusy(false);
        showStatus('error', msg('failed', { label: esc(submitLabel), contact: contactLinks }));
      })
      .then(function () { if (timer) clearTimeout(timer); });
  });

  // Service card "Get a quote" links pre-select that service.
  document.addEventListener('click', function (e) {
    var link = e.target.closest && e.target.closest('a[data-service]');
    if (!link) return;
    var option = form.querySelector('option[data-service="' + link.getAttribute('data-service') + '"]');
    if (option) {
      option.selected = true;
      document.getElementById('f-service').dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
})();
