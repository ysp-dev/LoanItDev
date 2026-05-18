// IE 감지: Trident(IE11) 또는 MSIE(IE10 이하)
if (!!window.MSInputMethodContext && !!document.documentMode ||
    navigator.userAgent.indexOf('MSIE') !== -1 ||
    navigator.userAgent.indexOf('Trident') !== -1) {
    document.getElementById('ie-overlay').classList.add('show');
    document.body.style.overflow = 'hidden';
    // Edge 자동 실행 후 IE 창 닫기 (3초 카운트다운)
    var countdown = 3;
    var countEl = document.getElementById('ie-countdown');
    if (countEl) countEl.textContent = countdown;
    var timer = setInterval(function() {
        countdown--;
        if (countEl) countEl.textContent = countdown;
        if (countdown <= 0) {
            clearInterval(timer);
            window.open('microsoft-edge:' + location.href, '_blank');
            setTimeout(function() { window.close(); }, 500);
        }
    }, 1000);
}
