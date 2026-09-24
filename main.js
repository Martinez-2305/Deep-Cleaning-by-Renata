// Quote form: validation, real submission to the configured endpoint, and
// honest success/error states. Also pre-selects the service when a
// "Get a quote for this clean" link is used, and hides the mobile action bar
// while the quote form or footer is on screen.
(function () {
  'use strict';

  var form = document.getElementById('quote-form');
  var statusBox = document.getElementById('form-status');
  if (!form) return;
  form.noValidate = true; // JS takes over; without JS the browser validates natively

  var submitBtn = form.querySelector('button[type="submit"]');
  var submitLabel = submitBtn.textContent;
  var POSTCODE = /^[A-Z]{1,2}[0-9][A-Z0-9]?\s*[0-9][A-Z]{2}$/i;
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  var contactLinks = (function () {
    var phone = document.querySelector('.contact-list a[href^="tel:"]');
    var email = document.querySelector('.contact-list a[href^="mailto:"]');
    var link = function (a) { return '<a href="' + esc(a.getAttribute('href')) + '">' + esc(a.textContent) + '</a>'; };
    var parts = [];
    if (phone) parts.push('call ' + link(phone));
    if (email) parts.push('email ' + link(email));
    return parts.length ? parts.join(' or ') : 'contact us directly';
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
    {
      el: 'f-type', focus: 'f-type',
      check: function () { return form.querySelector('input[name="cleaning_type"]:checked') ? '' : 'Choose the type of clean, or “Not sure yet”.'; }
    },
    {
      el: 'f-details',
      check: function () { return val('details').length >= 10 ? '' : 'Tell us a little about the property and the job.'; }
    }
  ];

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
    box.addEventListener('change', function () { if (attempted) setError(rule, rule.check()); });
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
      document.getElementById(invalid.focus || invalid.el).focus();
      if (invalid.focus === 'f-type') form.querySelector('input[name="cleaning_type"]').focus();
      return;
    }

    var endpoint = form.getAttribute('data-endpoint');
    if (!endpoint) {
      showStatus('error',
        '<h3>This form isn’t connected yet</h3><p>Your enquiry has <strong>not</strong> been sent. Please ' +
        contactLinks + ' instead — what you’ve typed is still in the form.</p>');
      return;
    }

    setBusy(true);
    var controller = 'AbortController' in window ? new AbortController() : null;
    var timer = controller && setTimeout(function () { controller.abort(); }, 15000);

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
          '<h3>Thank you — your enquiry has been sent</h3><p>We’ll reply using the contact details you gave to confirm the scope and quote. If it’s urgent, ' +
          contactLinks + '.</p>');
      })
      .catch(function () {
        setBusy(false);
        showStatus('error',
          '<h3>Your enquiry didn’t send</h3><p>Nothing has been lost — check your connection and press “Send enquiry” again, or ' +
          contactLinks + '.</p>');
      })
      .then(function () { if (timer) clearTimeout(timer); });
  });

  // "Get a quote for this clean" links pre-select that service.
  document.addEventListener('click', function (e) {
    var link = e.target.closest && e.target.closest('a[data-service]');
    if (!link) return;
    var radio = form.querySelector('input[data-service="' + link.getAttribute('data-service') + '"]');
    if (radio) radio.checked = true;
  });

  // Hide the mobile action bar when the form or footer is visible, so it never covers them.
  var bar = document.getElementById('mobile-bar');
  if (bar && 'IntersectionObserver' in window) {
    var visible = new Set();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) visible.add(en.target); else visible.delete(en.target); });
      var hide = visible.size > 0;
      bar.classList.toggle('is-hidden', hide);
      bar.setAttribute('aria-hidden', hide ? 'true' : 'false');
    });
    [document.getElementById('quote'), document.querySelector('.site-footer')].forEach(function (el) { if (el) io.observe(el); });
  }
})();
