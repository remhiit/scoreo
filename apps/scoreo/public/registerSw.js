var isDev = location.hostname === 'localhost' || location.hostname === '127.0.0.1'
if ('serviceWorker' in navigator) {
  if (isDev) {
    navigator.serviceWorker.getRegistrations().then(function (regs) {
      regs.forEach(function (r) {
        r.unregister()
      })
    })
  } else {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js')
    })
  }
}
