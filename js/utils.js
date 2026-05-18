function parseDate(str) {
    if (!str) return null;
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
}

function dateToStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// 현단계 이후 모든 단계를 연쇄 이동 (기간 유지)
function fmtD(str) {
    if (!str) return '';
    const p = str.split('-');
    return `${p[0]}.${p[1]}.${p[2]}`;
}

// D-Day 계산 → { text, cls }
function calcDDay(openStr, now) {
    // 양쪽 모두 로컬 자정으로 정규화해 시간대 오프셋 오류 방지
    const today = new Date(now); today.setHours(0, 0, 0, 0);
    const diff = Math.round((parseDate(openStr) - today) / MS_PER_DAY);
    if (diff > 0)      return { text: `D-${diff}`,           cls: diff <= 7 ? 'dday-urgent' : diff <= 30 ? 'dday-warn' : 'dday-normal' };
    if (diff === 0)    return { text: 'D-Day',               cls: 'dday-today' };
    return             { text: `D+${Math.abs(diff)}`,        cls: 'dday-past' };
}

// 현재 단계 문자열 계산
function calcCurPhase(p, now) {
    if (!p.phaseDetails?.length) return '-';
    const ap = p.phaseDetails.find(pd => {
        const s = parseDate(pd.start), e = parseDate(pd.end);
        e.setHours(23, 59, 59);
        return now >= s && now <= e;
    });
    if (ap) return (ap.name.split(':')[1] || ap.name).trim();
    const fst = parseDate(p.phaseDetails[0].start);
    const openDt = parseDate(p.open); openDt.setHours(23, 59, 59);
    if (now < fst) return '착수 준비중';
    if (now > openDt) return '개발 완료';
    const next = p.phaseDetails.find(pd => parseDate(pd.start) > now);
    return next ? (next.name.split(':')[1] || next.name).trim() + ' 준비중' : '오픈 준비중';
}

// 총 개발기간 계산 → { periodStart, periodEnd, durStr }
function calcDuration(p) {
    const empty = { periodStart: '-', periodEnd: '-', durStr: '-' };
    if (!p.phaseDetails?.length) return empty;
    const ss = p.phaseDetails.map(d => parseDate(d.start)).filter(d => d && !isNaN(d));
    const ee = p.phaseDetails.map(d => parseDate(d.end)).filter(d => d && !isNaN(d));
    if (!ss.length || !ee.length) return empty;
    const e0 = new Date(Math.min(...ss));
    const phaseEnd = new Date(Math.max(...ee));
    const openDate = parseDate(p.open);
    const e1 = openDate > phaseEnd ? openDate : phaseEnd;
    const mo = (e1.getFullYear() - e0.getFullYear()) * 12 + (e1.getMonth() - e0.getMonth()) + 1;
    return {
        periodStart: fmtD(dateToStr(e0)),
        periodEnd:   fmtD(dateToStr(e1)),
        durStr:      `${mo}개월`
    };
}

// 숫자 콤마 포매팅
function fmtComma(el, decimal) {
    const sel = el.selectionStart;
    const oldLen = el.value.length;
    let cur = el.value.replace(/,/g, '');
    if (decimal) {
        cur = cur.replace(/[^0-9.]/g, '');
        const dot = cur.indexOf('.');
        if (dot !== -1) cur = cur.slice(0, dot + 1) + cur.slice(dot + 1).replace(/\./g, '');
    } else {
        cur = cur.replace(/[^0-9]/g, '');
    }
    const parts = cur.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    el.value = parts.join('.');
    // 콤마 추가/제거로 달라진 길이만큼 커서 위치 보정
    const diff = el.value.length - oldLen;
    const pos = Math.max(0, sel + diff);
    el.setSelectionRange(pos, pos);
}
function rawNum(val) { return val.replace(/,/g, ''); }

// 날짜 wrapper ph-show 동기화
function syncDateWraps() {
    document.querySelectorAll('.date-wrap input[type="date"]').forEach(function(el) {
        var wrap = el.parentElement;
        if (wrap && wrap.classList.contains('date-wrap')) {
            wrap.classList.toggle('ph-show', !el.value);
        }
    });
}
const _colorCache = new Map();

function clearColorCache() { _colorCache.clear(); }

function resolveColor(color) {
    if (!color || !color.startsWith('var(')) return color;
    const cached = _colorCache.get(color);
    if (cached !== undefined) return cached;
    const varName = color.match(/var\(\s*(--[^)]+)\s*\)/)?.[1];
    if (!varName) return color;
    const resolved = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    const result = resolved || color;
    _colorCache.set(color, result);
    return result;
}

function hexToRgba(hex, alpha) {
    if (!hex || !hex.startsWith('#') || hex.length < 7) return `rgba(0,0,0,${alpha})`;
    const r = parseInt(hex.slice(1,3), 16);
    const g = parseInt(hex.slice(3,5), 16);
    const b = parseInt(hex.slice(5,7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

function getDatePos(dateInput) {
    const d = typeof dateInput === 'string' ? parseDate(dateInput) : dateInput;
    const month = d.getMonth();
    const day = d.getDate();
    const daysInMonth = new Date(d.getFullYear(), month + 1, 0).getDate();
    const pos = ((month + (day - 1) / daysInMonth) / 12) * 100;
    return Math.max(0, Math.min(100, pos));
}

function getStyleSet(team) {
    const sets = {
        '여신심사팀':    { main: 'color-team-a', light: 'color-team-a-light', hex: '#F46600', darkHex: '#FF7A1A' },
        '여신업무팀':    { main: 'color-team-b', light: 'color-team-b-light', hex: '#FD9C26', darkHex: '#FFB347' },
        '여신관리팀':    { main: 'color-team-c', light: 'color-team-c-light', hex: '#FFBC00', darkHex: '#FFD338' },
        '상품/신용평가팀': { main: 'color-team-d', light: 'color-team-d-light', hex: '#0EA573', darkHex: '#34D399' },
        '외환팀':        { main: 'color-team-e', light: 'color-team-e-light', hex: '#0066FF', darkHex: '#6699FF' },
        'PPR팀':         { main: 'color-team-f', light: 'color-team-f-light', hex: '#7C3AED', darkHex: '#A78BFA' }
    };
    return sets[team] || { main: '', light: '', hex: '#888888', darkHex: '#AAAAAA' };
}

function formatOpenTag(openStr) {
    const date = parseDate(openStr);
    const yy = String(date.getFullYear()).slice(-2);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `<div>${yy}/${mm}/${dd}</div><div style="font-size:9px; opacity:0.8;">OPEN</div>`;
}

function parseCSVLine(line) {
    const result = []; let cur = '', inQ = false;
    for (const c of line) {
        if (c === '"') inQ = !inQ;
        else if (c === ',' && !inQ) { result.push(cur.trim()); cur = ''; }
        else cur += c;
    }
    result.push(cur.trim());
    return result;
}

/* CSV 날짜 포맷 정규화: input[type=date]는 YYYY-MM-DD 만 허용 */
function normalizeDate(str) {
    if (!str) return '';
    str = str.trim().replace(/\s/g, '');
    // YYYY-MM-DD 또는 YYYY-M-D
    let m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
    // YYYY/MM/DD 또는 YYYY/M/D
    m = str.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
    if (m) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
    // YYYY.MM.DD 또는 YYYY.M.D
    m = str.match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})$/);
    if (m) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
    // MM/DD/YYYY (Excel 미국식)
    m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) return `${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;
    // DD-MM-YYYY
    m = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
    return str; // 그 외 원본 반환
}

const PROJECT_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidProjectDate(str) {
    str = String(str || '');
    if (!PROJECT_DATE_RE.test(str)) return false;
    const [y, m, d] = str.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

function validateProjectSchedule(project, options = {}) {
    const errors = [];
    const warnings = [];
    const addError = (message, phaseIndex = null, field = null) => errors.push({ message, phaseIndex, field });
    const addWarning = (message, field = null) => warnings.push({ message, field });
    const open = String(project?.open || '');

    if (!isValidProjectDate(open)) {
        addError('적용예정일 형식이 올바르지 않습니다.', null, 'open');
    }

    if (!Array.isArray(project?.phaseDetails)) {
        addError('단계 일정 정보가 올바르지 않습니다.');
        return { valid: false, errors, warnings, phaseDetails: [] };
    }

    const phaseDetails = [];
    let previousEnd = null;
    for (let idx = 0; idx < project.phaseDetails.length; idx++) {
        const raw = project.phaseDetails[idx];
        const phaseNo = Number.isFinite(Number(raw?.phaseNo)) ? Number(raw.phaseNo) : idx + 1;
        const label = `${phaseNo}단계`;
        if (!raw || typeof raw !== 'object') {
            addError(`${label}: 단계 정보가 올바르지 않습니다.`, idx);
            continue;
        }

        const rawName = String(raw.name || '').trim();
        const start = String(raw.start || '');
        const end = String(raw.end || '');
        const hasAny = rawName || start || end;
        const hasAll = rawName && start && end;

        if (!hasAny) continue;
        if (!hasAll) {
            const missing = [];
            if (!rawName) missing.push('단계 이름');
            if (!start) missing.push('시작일');
            if (!end) missing.push('종료일');
            const field = !rawName ? 'name' : (!start ? 'start' : 'end');
            addError(`${label}: ${missing.join(', ')}을(를) 입력해 주세요.`, idx, field);
            continue;
        }
        if (!isValidProjectDate(start)) {
            addError(`${label}: 시작일 형식이 올바르지 않습니다.`, idx, 'start');
            continue;
        }
        if (!isValidProjectDate(end)) {
            addError(`${label}: 종료일 형식이 올바르지 않습니다.`, idx, 'end');
            continue;
        }
        if (start > end) {
            addError(`${label}: 시작일(${start})이 종료일(${end})보다 늦습니다.`, idx, 'start');
            continue;
        }
        if (previousEnd && start < previousEnd) {
            addError(`${label} 시작일(${start})이 이전 단계 종료일(${previousEnd})보다 이전입니다.`, idx, 'start');
            continue;
        }

        const name = typeof options.phaseNameFormatter === 'function'
            ? options.phaseNameFormatter(rawName, idx, raw)
            : rawName;
        phaseDetails.push({
            ...raw,
            name,
            start,
            end,
            color: String(raw.color || `var(--phase-${phaseNo})`),
            desc: String(raw.desc || '')
        });
        previousEnd = end;
    }

    if (phaseDetails.length === 0) {
        addError('최소 1개 이상의 단계 일정을 입력해 주세요.', 0, 'name');
    }

    const lastEnd = phaseDetails.at(-1)?.end;
    if (isValidProjectDate(open) && lastEnd && open < lastEnd) {
        addWarning(`적용예정일(${open})이 마지막 단계 종료일(${lastEnd})보다 이전입니다.`, 'open');
    }

    return { valid: errors.length === 0, errors, warnings, phaseDetails };
}

/* ⑤ 통계 count-up */
/* ⑧ HTML 이스케이프 */
function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

/* ⑨ 검색어 하이라이트 helper */
function hl(str, q) {
    const safe = escapeHtml(str);
    if (!q) return safe;
    const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    return safe.replace(re, m => `<span class="search-hl">${m}</span>`);
}

function _countUp(id, target, fmt, color) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.color = color ?? '';
    const prev = parseFloat(el.dataset.prev || 0);
    el.dataset.prev = target;
    if (prev === target) { el.innerText = fmt(target); return; }
    const dur = 500, start = performance.now(), from = prev;
    const step = ts => {
        const p = Math.min((ts - start) / dur, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        el.innerText = fmt(from + (target - from) * ease);
        if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
}

/* ⑦ 목록뷰 테이블 헤더 스크롤 shadow */
(function() {
    const lv = document.getElementById('list-view');
    if (lv) lv.addEventListener('scroll', () => lv.classList.toggle('scrolled', lv.scrollTop > 2));
})();


// 로컬호스트 관리자 전용 알림 시스템
const _IS_LOCALHOST = ['localhost', '127.0.0.1', '::1'].includes(location.hostname);
const _notifHistory = [];
let _notifUnread = 0;

function _initAdminUI() {
    if (!_IS_LOCALHOST) return;

    // 상단 배너
    const banner = document.createElement('div');
    banner.id = 'admin-action-banner';
    banner.innerHTML = '<span class="admin-banner-icon">🔔</span><span class="admin-banner-text"></span><button class="admin-banner-close" onclick="this.closest(\'#admin-action-banner\').classList.remove(\'visible\')">닫기</button>';
    document.body.appendChild(banner);

    // 알림 벨 버튼 (nav-tabs에 삽입)
    const bell = document.createElement('div');
    bell.id = 'admin-notif-bell';
    bell.innerHTML = '<button class="admin-bell-btn" onclick="toggleAdminNotif()" title="관리자 알림 이력">🔔<span class="admin-bell-badge" id="admin-bell-badge" style="display:none">0</span></button>';
    const navSep = document.querySelector('.nav-tabs .nav-sep');
    if (navSep) navSep.parentNode.insertBefore(bell, navSep);

    // 알림 패널
    const panel = document.createElement('div');
    panel.id = 'admin-notif-panel';
    panel.innerHTML = `
        <div class="anp-header">
            <span class="anp-title">관리자 알림 이력</span>
            <button class="anp-read-all" onclick="markAllAdminNotif()">전체 읽음</button>
            <button class="anp-close" onclick="toggleAdminNotif()">✕</button>
        </div>
        <div class="anp-list" id="admin-notif-list"><div class="anp-empty">알림이 없습니다.</div></div>`;
    document.body.appendChild(panel);

    // 패널 외부 클릭 시 닫기
    document.addEventListener('click', e => {
        if (!e.target.closest('#admin-notif-panel') && !e.target.closest('#admin-notif-bell'))
            panel.classList.remove('open');
    });
}

function _addNotification(text) {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
    _notifHistory.unshift({ text, time, read: false });
    _notifUnread++;

    const badge = document.getElementById('admin-bell-badge');
    if (badge) { badge.textContent = _notifUnread > 99 ? '99+' : _notifUnread; badge.style.display = ''; }

    const list = document.getElementById('admin-notif-list');
    if (list) {
        list.innerHTML = _notifHistory.map((n, i) =>
            `<div class="anp-item${n.read ? ' read' : ''}" onclick="readAdminNotif(${i})">
                <span class="anp-item-dot"></span>
                <span class="anp-item-text">${escapeHtml(n.text)}</span>
                <span class="anp-item-time">${escapeHtml(n.time)}</span>
            </div>`
        ).join('');
    }
}

function toggleAdminNotif() {
    const panel = document.getElementById('admin-notif-panel');
    if (panel) panel.classList.toggle('open');
}

function readAdminNotif(idx) {
    if (_notifHistory[idx] && !_notifHistory[idx].read) {
        _notifHistory[idx].read = true;
        _notifUnread = Math.max(0, _notifUnread - 1);
        const badge = document.getElementById('admin-bell-badge');
        if (badge) {
            if (_notifUnread === 0) badge.style.display = 'none';
            else badge.textContent = _notifUnread > 99 ? '99+' : _notifUnread;
        }
        document.querySelectorAll('.anp-item')[idx]?.classList.add('read');
    }
}

function markAllAdminNotif() {
    _notifHistory.forEach(n => n.read = true);
    _notifUnread = 0;
    const badge = document.getElementById('admin-bell-badge');
    if (badge) badge.style.display = 'none';
    document.querySelectorAll('.anp-item').forEach(el => el.classList.add('read'));
}

function showAdminBanner(text) {
    if (!_IS_LOCALHOST) return;
    _addNotification(text);
    const el = document.getElementById('admin-action-banner');
    if (!el) return;
    el.querySelector('.admin-banner-text').textContent = '[관리자] ' + text;
    clearTimeout(el._t);
    el.classList.add('visible');
    el._t = setTimeout(() => el.classList.remove('visible'), 5000);
}

document.addEventListener('DOMContentLoaded', _initAdminUI);

function showMsg(text, type) {
    const el = document.getElementById('msgBox');
    if (!el) return;
    el.innerText = text;
    el.className = '';
    if (type) el.classList.add('msg-' + type);
    el.style.display = 'block';
    el.classList.add('msg-show');
    clearTimeout(el._t);
    el._t = setTimeout(() => {
        el.classList.remove('msg-show');
        el.classList.add('msg-hide');
        setTimeout(() => { el.style.display = 'none'; el.className = ''; }, 220);
    }, 3000);
}
