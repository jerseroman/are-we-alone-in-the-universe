function setPressedState(el, active) {
  if (!el) return;
  el.classList.toggle('active', active);
  el.setAttribute('aria-pressed', active ? 'true' : 'false');
}


function initAccessibilityHelpers() {
  const tooltip = byId('copy-tooltip');
  if (tooltip) {
    tooltip.setAttribute('role', 'status');
    tooltip.setAttribute('aria-live', 'polite');
  }

  const shareLabels = {
    'share-twitter': 'Share on X',
    'share-reddit': 'Share on Reddit',
    'share-facebook': 'Share on Facebook',
    'share-linkedin': 'Share on LinkedIn',
    'share-whatsapp': 'Share on WhatsApp',
    'share-email': 'Share by email'
  };

  Object.entries(shareLabels).forEach(([id, label]) => {
    const el = byId(id);
    if (el && !el.getAttribute('aria-label')) el.setAttribute('aria-label', label);
  });

  document.querySelectorAll('button').forEach(button => {
    const label = button.textContent.replace(/\s+/g, ' ').trim();
    if (label && !button.getAttribute('aria-label')) button.setAttribute('aria-label', label);
  });
}
window.initAccessibilityHelpers = initAccessibilityHelpers;
