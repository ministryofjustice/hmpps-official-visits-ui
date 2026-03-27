// Focus the page alert (if present) on initial page load to improve accessibility.
// Behavior requirements:
// - If a .moj-alert[role="alert"] exists on page load, make it focusable but not tabbable (tabindex=-1)
// - Move keyboard focus to the alert and ensure the page scrolls to it, overriding default hash scrolling
// - Only run this behavior on the initial load (not on subsequent user hash navigation)

;(function () {
  function focusAlertOnLoad() {
    var alertEl = document.querySelector('.moj-alert[role="alert"]')
    if (!alertEl) return

    // Ensure the alert is focusable but not in the tab order
    try {
      alertEl.setAttribute('tabindex', '-1')
    } catch (e) {
      // ignore
    }

    // Ensure appropriate live region if not already present
    if (!alertEl.hasAttribute('aria-live')) {
      // For role="alert", rely on the default assertive politeness.
      // For other alerts, default to a polite live region.
      var role = alertEl.getAttribute('role')
      if (role !== 'alert') {
        alertEl.setAttribute('aria-live', 'polite')
      }
    }

    // Function that scrolls to and focuses the alert. Run twice with delays to
    // reliably override browser hash scrolling behavior on different browsers.
    var focusAndScroll = function () {
      try {
        alertEl.scrollIntoView({ behavior: 'auto', block: 'start' })
      } catch (e) {
        // Fallback for older browsers
        var top = alertEl.getBoundingClientRect().top + window.pageYOffset
        window.scrollTo(0, top)
      }

      try {
        // Focus without causing additional scroll (we've already scrolled)
        alertEl.focus({ preventScroll: true })
      } catch (e) {
        // Some browsers don't support options; fallback
        alertEl.focus()
      }
    }

    // Schedule the focus/scroll to run after DOMContentLoaded so it overrides any
    // earlier hash-based scrolling. Run twice with small delays to be robust.
    setTimeout(focusAndScroll, 50)
    setTimeout(focusAndScroll, 250)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', focusAlertOnLoad)
  } else {
    // If the script was loaded after DOMContentLoaded
    setTimeout(focusAlertOnLoad, 0)
  }
})()
