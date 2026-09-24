// Before/after sliders, and the quote form: validation, real submission to the
// configured endpoint, and honest success/error states. Also pre-selects the
// service when a service card's "Get a quote" link is used, and hides the
// mobile action bar while the hero buttons, quote form or footer are on screen.
(function () {
  'use strict';

  // Before/after comparison: the range input sets how much of the "before" layer shows.
  Array.prototype.forEach.call(document.querySelectorAll('.ba'), function (ba) {
    var range = ba.querySelector('.ba-range');
    if (!range) return;
    var update = function () {
      ba.style.setProperty('--pos', range.value + '%');
      range.setAttribute('aria-valuetext', range.value + '% before, ' + (100 - range.value) + '% after');
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
      bar.setAttribute('aria-hidden', hide ? 'true' : 'false');
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
  var MAX_PHOTOS = 5;
  var MAX_BYTES = 20 * 1024 * 1024;

  // Real contact routes only (links still pointing at #quote are placeholders).
  var contactLinks = (function () {
    var find = function (sel) { return document.querySelector('.quote-intro ' + sel); };
    var link = function (a) { return '<a href="' + esc(a.getAttribute('href')) + '">' + esc(a.textContent.trim()) + '</a>'; };
    var parts = [];
    var wa = find('a[href^="https://wa.me/"]'), phone = find('a[href^="tel:"]'), email = find('a[href^="mailto:"]');
    if (wa) parts.push('message ' + link(wa).replace(/>[^<]*</, '>on WhatsApp<'));
    if (phone) parts.push('call ' + link(phone));
    if (email) parts.push('email ' + link(email));
    return parts.length ? parts.join(', ').replace(/, ([^,]*)$/, ' or $1') : 'contact us directly';
  })();

  // Each rule returns an error message, or '' when valid.
  var rules = [
    { el: 'f-name', check: function () { return val('name') ? '' : 'Enter your name.'; } },
    {
      el: 'f-contact', focus: 'f-phone',
      check: function () {
        var phone = val('phone'), email = val('email');
        if (!phone && !email) return 'Enter a phone number or an email address so we can reply.';
        if (email && !EMAIL.test(email)) return 'Enter an email address like name@example.co.uk.';
        if (phone && phone.replace(/[^0-9]/g, '').length < 10) return 'Enter a phone number with at least 10 digits.';
        return '';
      }
    },
    {
      el: 'f-postcode',
      check: function () {
        var pc = val('postcode');
        if (!pc) return 'Enter the postcode of the property.';
        return POSTCODE.test(pc) ? '' : 'Enter a full UK postcode, for example SW1A 1AA.';
      }
    },
    { el: 'f-property', check: function () { return val('property_type') ? '' : 'Choose the type of property.'; } },
    { el: 'f-size', check: function () { return val('property_size') ? '' : 'Choose the size of the property.'; } },
    {
      el: 'f-type', focus: 'f-type',
      check: function () { return form.querySelector('input[name="service"]:checked') ? '' : 'Choose the service you need, or “Not sure yet”.'; }
    },
    {
      el: 'f-details',
      check: function () { return val('details').length >= 10 ? '' : 'Tell us a little about the property’s condition and the job.'; }
    }
  ];

  var photos = document.getElementById('f-photos');
  if (photos) {
    rules.push({
      el: 'f-photos',
      check: function () {
        var files = Array.prototype.slice.call(photos.files || []);
        if (files.length > MAX_PHOTOS) return 'Choose up to ' + MAX_PHOTOS + ' photos.';
        if (files.some(function (f) { return !/^image\//.test(f.type); })) return 'Photos must be image files, such as JPEG or PNG.';
        var total = files.reduce(function (sum, f) { return sum + f.size; }, 0);
        if (total > MAX_BYTES) return 'Those photos add up to ' + (total / 1048576).toFixed(1) + ' MB. Choose fewer, up to 20 MB in total.';
        return '';
      }
    });
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
      if (attempted || rule.el === 'f-photos') setError(rule, rule.check());
    });
  });

  // Earliest allowed preferred date is today.
  var date = document.getElementById('f-date');
  if (date) {
    var d = new Date();
    date.min = [d.getFullYear(), ('0' + (d.getMonth() + 1)).slice(-2), ('0' + d.getDate()).slice(-2)].join('-');
  }

  function showStatus(kind, html) {
    statusBox.className = 'form-status is-' + kind;
    statusBox.innerHTML = html;
    statusBox.hidden = false;
    statusBox.focus();
  }

  function setBusy(busy) {
    submitBtn.disabled = busy;
    submitBtn.textContent = busy ? 'Sending…' : submitLabel;
    form.setAttribute('aria-busy', busy ? 'true' : 'false');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    attempted = true;
    statusBox.hidden = true;

    var invalid = validate();
    if (invalid) {
      if (invalid.focus === 'f-type') form.querySelector('input[name="service"]').focus();
      else document.getElementById(invalid.focus || invalid.el).focus();
      return;
    }

    var endpoint = form.getAttribute('data-endpoint');
    if (!endpoint) {
      showStatus('error',
        '<h3>This form isn’t connected yet</h3><p>Your enquiry has <strong>not</strong> been sent. Please ' +
        contactLinks + ' instead. What you’ve typed is still in the form.</p>');
      return;
    }

    setBusy(true);
    var controller = 'AbortController' in window ? new AbortController() : null;
    var timer = controller && setTimeout(function () { controller.abort(); }, 60000);

    fetch(endpoint, {
      method: 'POST',
      body: new FormData(form),
      headers: { Accept: 'application/json' },
      signal: controller ? controller.signal : undefined
    })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        form.hidden = true;
        showStatus('success',
          '<h3>Thank you, your enquiry has been sent</h3><p>We’ll reply using the contact details you gave to confirm the scope and quote. If it’s urgent, ' +
          contactLinks + '.</p>');
      })
      .catch(function () {
        setBusy(false);
        showStatus('error',
          '<h3>Your enquiry didn’t send</h3><p>Nothing has been lost. Check your connection and press “' + esc(submitLabel) + '” again, or ' +
          contactLinks + '.</p>');
      })
      .then(function () { if (timer) clearTimeout(timer); });
  });

  // Service card "Get a quote" links pre-select that service.
  document.addEventListener('click', function (e) {
    var link = e.target.closest && e.target.closest('a[data-service]');
    if (!link) return;
    var radio = form.querySelector('input[data-service="' + link.getAttribute('data-service') + '"]');
    if (radio) radio.checked = true;
  });
})();
