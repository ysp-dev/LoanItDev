function switchView(view, isEdit = false) {
    if(view === 'dashboard') {
        const dv = document.getElementById('dashboardView');
        dv.style.display = 'block';
        dv.classList.remove('view-fade'); void dv.offsetWidth; dv.classList.add('view-fade');
        document.getElementById('adminView').style.display = 'none';
        document.getElementById('tabDash').classList.add('active');
        document.getElementById('tabAdmin').classList.remove('active');
        currentFilter = '전체';
        currentSearch = '';
        const si = document.getElementById('search-input'); if (si) si.value = '';
        renderDashboard();
    } else {
        document.getElementById('dashboardView').style.display = 'none';
        const av = document.getElementById('adminView');
        av.style.display = 'block';
        av.classList.remove('view-fade'); void av.offsetWidth; av.classList.add('view-fade');
        setTimeout(initBulkColResize, 50);
        document.getElementById('tabDash').classList.remove('active');
        document.getElementById('tabAdmin').classList.add('active');
        window.scrollTo({ top: 0, behavior: 'instant' });
        
        if (!isEdit) {
            editingProjectId = null;
            // 단계 입력 영역 완전히 비우고 재생성 → 잔여값 없이 깨끗하게 초기화
            document.getElementById('phase-inputs-container').innerHTML = '';
        }
        initPhaseInputs();

        if (!isEdit) {
            resetForm(true);
            document.getElementById('in-open').value = '';
            document.getElementById('form-title').innerText = "신규 프로젝트 등록";
            document.getElementById('btn-submit').innerText = "등록 및 로드맵 반영";
            document.getElementById('btn-delete').style.display = 'none';
            document.getElementById('btn-top-sep').classList.remove('visible');
            document.getElementById('btn-top-reset').innerText = '전체 항목 초기화';
            const badge = document.getElementById('form-mode-badge');
            badge.style.display = 'none'; badge.innerText = '';
            syncDateWraps();
        }
        // 단건 탭으로 기본 이동
        switchAdminTab('single');
    }
}

function switchAdminTab(tab) {
    document.getElementById('adminSingle').style.display = tab === 'single' ? 'block' : 'none';
    document.getElementById('adminBulk').style.display  = tab === 'bulk'   ? 'block' : 'none';
    document.getElementById('adminTabSingle').classList.toggle('active', tab === 'single');
    document.getElementById('adminTabBulk').classList.toggle('active', tab === 'bulk');
    if (tab === 'bulk') {
        bulkGridInited = false; initBulkGrid();
        const ep = document.getElementById('bulk-error-panel');
        if (ep) ep.style.display = 'none';
    }
}

function updateLiveClock() {
    const now = new Date();
    const years = now.getFullYear();
    const months = String(now.getMonth() + 1).padStart(2, '0');
    const dates = String(now.getDate()).padStart(2, '0');
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const day = dayNames[now.getDay()];
    
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    document.getElementById('live-date').innerText = `${years}년 ${months}월 ${dates}일 (${day}요일)`;
    document.getElementById('live-time').innerText = `${hours}:${minutes}`;
}

let _ganttDragged = false;

function setSearch(val) { currentSearch = val.trim(); renderDashboard(); }

function toggleCompact() {
    compactView = !compactView;
    const btn = document.getElementById('btn-compact');
    if (btn) btn.classList.toggle('active', compactView);
    const gc = document.getElementById('gantt-rows');
    if (gc) gc.classList.toggle('gantt-compact', compactView);
}

function onListChkChange() {
    const all = document.querySelectorAll('.list-row-chk');
    const checked = document.querySelectorAll('.list-row-chk:checked');
    const allChk = document.getElementById('list-chk-all');
    if (allChk) allChk.checked = all.length > 0 && checked.length === all.length;
    _updateDeleteBtn();
}

function onCardChkChange(el) {
    const card = el.closest('.project-card');
    if (card) card.classList.toggle('card-checked', el.checked);
    _updateDeleteBtn();
}

function _updateDeleteBtn() {
    const listChecked = document.querySelectorAll('.list-row-chk:checked').length;
    const cardChecked = document.querySelectorAll('.card-row-chk:checked').length;
    const total = listChecked + cardChecked;
    const btn = document.getElementById('btn-delete-selected');
    if (btn) {
        btn.style.display = total > 0 ? '' : 'none';
        btn.textContent = total > 0 ? `선택 삭제 (${total}건)` : '선택 삭제';
    }
}

function toggleAllListChk(checked) {
    document.querySelectorAll('.list-row-chk').forEach(c => c.checked = checked);
    onListChkChange();
}

function deleteSelected() {
    const listIds = [...document.querySelectorAll('.list-row-chk:checked')].map(c => parseInt(c.dataset.id));
    const cardIds = [...document.querySelectorAll('.card-row-chk:checked')].map(c => parseInt(c.dataset.id));
    const ids = [...new Set([...listIds, ...cardIds])];
    if (!ids.length) return;
    if (!confirm(`선택한 ${ids.length}건의 프로젝트를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;
    projects = projects.filter(p => !ids.includes(p.id));
    saveToStorage();
    renderDashboard();
    showMsg(`${ids.length}건의 프로젝트가 삭제되었습니다.`);
    const btn = document.getElementById('btn-delete-selected');
    if (btn) btn.style.display = 'none';
}
function setView(mode) {
    currentView = mode;
    document.getElementById('btn-view-card').classList.toggle('active', mode === 'card');
    document.getElementById('btn-view-list').classList.toggle('active', mode === 'list');
    document.getElementById('card-grid').style.display  = mode === 'card' ? '' : 'none';
    document.getElementById('list-view').style.display  = mode === 'list' ? '' : 'none';
    const isList = mode === 'list';
    const colWrap = document.getElementById('col-panel-wrap');
    if (!isList) { if (colWrap) colWrap.style.display = 'none'; }
    else { if (colWrap) colWrap.style.display = ''; }
    // 카드뷰로 전환 시 선택 초기화
    if (!isList) {
        document.querySelectorAll('.card-row-chk').forEach(c => { c.checked = false; });
        document.querySelectorAll('.project-card').forEach(c => c.classList.remove('card-checked'));
        _updateDeleteBtn();
    }
    renderDashboard();
}

// 드래그 후 해당 프로젝트 행의 bar-area만 갱신 (전체 리렌더 없이)
function setFilter(team) { currentFilter = team; document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.team === team)); renderDashboard(); }

// ── Cmd+K 커맨드 팔레트 ──────────────────────────────
let _cmdSelIdx = -1;

function openCmdPal() {
    const ov = document.getElementById('cmdPalOverlay');
    if (!ov) return;
    ov.classList.add('open');
    const inp = document.getElementById('cmdPalInput');
    if (inp) { inp.value = ''; inp.focus(); }
    _cmdSelIdx = -1;
    updateCmdPal();
}

function closeCmdPal() {
    const ov = document.getElementById('cmdPalOverlay');
    if (ov) ov.classList.remove('open');
}

function updateCmdPal() {
    const q = (document.getElementById('cmdPalInput')?.value || '').toLowerCase().trim();
    const res = document.getElementById('cmdPalResults');
    if (!res) return;

    const matched = !q
        ? projects.slice(0, 8)
        : projects.filter(p =>
            p.name.toLowerCase().includes(q) ||
            p.pm.toLowerCase().includes(q) ||
            p.team.toLowerCase().includes(q)
          ).slice(0, 10);

    if (!matched.length) {
        res.innerHTML = `<div class="cmdpal-empty">검색 결과가 없습니다</div>`;
        _cmdSelIdx = -1; return;
    }

    const teamStyleMap = { '여신심사팀':'color-team-a', '여신업무팀':'color-team-b', '여신관리팀':'color-team-c', '상품/신용평가팀':'color-team-d', '외환팀':'color-team-e', 'PPR팀':'color-team-f' };
    res.innerHTML = `<div class="cmdpal-section-label">${q ? '검색 결과' : '전체 프로젝트'}</div>` +
        matched.map((p, i) => {
            const styles = getStyleSet(p.team);
            return `<div class="cmdpal-item${i === _cmdSelIdx ? ' selected' : ''}" data-idx="${i}" onclick="cmdPalSelect(${i})" onmouseover="_cmdSelIdx=${i};renderCmdPalSel()">
                <div class="cmdpal-item-icon" style="background:${statusBgForPalette(p)};color:${statusFgForPalette(p)};">${p.team.slice(0,2)}</div>
                <div><div class="cmdpal-item-name">${p.name}</div><div class="cmdpal-item-meta">${p.team} · 담당자 ${p.pm} · D-${Math.max(0,Math.round((new Date(p.open)-new Date())/86400000))}</div></div>
            </div>`;
        }).join('');
    _cmdSelIdx = -1;
}

function statusBgForPalette(p) {
    const now = new Date(); now.setHours(0,0,0,0);
    const openDate = new Date(p.open); openDate.setHours(23,59,59);
    const ap = p.phaseDetails?.find(pd => { const s=parseDate(pd.start),e=parseDate(pd.end); e.setHours(23,59,59); return now>=s&&now<=e; });
    if (ap) return '#dbeafe';
    if (now >= openDate) return '#d1fae5';
    if (p.phaseDetails?.length && now < parseDate(p.phaseDetails[0].start)) return '#f1f5f9';
    return '#ede9fe';
}
function statusFgForPalette(p) {
    const now = new Date(); now.setHours(0,0,0,0);
    const openDate = new Date(p.open); openDate.setHours(23,59,59);
    const ap = p.phaseDetails?.find(pd => { const s=parseDate(pd.start),e=parseDate(pd.end); e.setHours(23,59,59); return now>=s&&now<=e; });
    if (ap) return '#1d4ed8';
    if (now >= openDate) return '#065f46';
    if (p.phaseDetails?.length && now < parseDate(p.phaseDetails[0].start)) return '#64748b';
    return '#5b21b6';
}

function renderCmdPalSel() {
    document.querySelectorAll('.cmdpal-item').forEach((el, i) => el.classList.toggle('selected', i === _cmdSelIdx));
}

function cmdPalSelect(idx) {
    const q = (document.getElementById('cmdPalInput')?.value || '').toLowerCase().trim();
    const matched = !q ? projects.slice(0,8) : projects.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.pm.toLowerCase().includes(q) || p.team.toLowerCase().includes(q)).slice(0,10);
    if (matched[idx]) { closeCmdPal(); editProject(matched[idx].id); }
}

function cmdPalKeyDown(e) {
    const res = document.getElementById('cmdPalResults');
    const items = res?.querySelectorAll('.cmdpal-item') || [];
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        _cmdSelIdx = Math.min(_cmdSelIdx + 1, items.length - 1);
        renderCmdPalSel();
        items[_cmdSelIdx]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        _cmdSelIdx = Math.max(_cmdSelIdx - 1, 0);
        renderCmdPalSel();
        items[_cmdSelIdx]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
        if (_cmdSelIdx >= 0) cmdPalSelect(_cmdSelIdx);
        else if (items.length === 1) cmdPalSelect(0);
    } else if (e.key === 'Escape') {
        closeCmdPal();
    }
}

document.addEventListener('keydown', function(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const ov = document.getElementById('cmdPalOverlay');
        if (ov?.classList.contains('open')) closeCmdPal(); else openCmdPal();
    }
});

function updateSavedInfo() {
    const el = document.getElementById('io-last-saved');
    if (!el) return;
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) { el.innerText = '- 저장 데이터 없음'; return; }
    try {
        const meta = localStorage.getItem(LS_KEY + '_meta');
        if (meta) {
            const { savedAt, count } = JSON.parse(meta);
            const d = new Date(savedAt);
            const fmt = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
            el.innerText = `- ${count}건 · 마지막 저장: ${fmt}`;
        } else {
            const parsed = JSON.parse(raw);
            el.innerText = `- ${parsed.length}건 저장됨`;
        }
    } catch(e) { el.innerText = '- 저장 데이터 있음'; }
}

// ── 내보내기 ──────────────────────────────────────
function exportProjects() {
    if (projects.length === 0) { showMsg('내보낼 프로젝트가 없습니다.', 'warn'); return; }
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
    const payload = {
        exportedAt: now.toISOString(),
        exportedBy: 'SI Dashboard 2026',
        version: '1.0',
        count: projects.length,
        projects: projects
    };
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob(['﻿' + json], { type: 'application/json;charset=utf-8' }); // BOM 포함 → 윈도우 메모장 한글 깨짐 방지
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `si_projects_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showMsg(`${projects.length}개 프로젝트 내보내기 완료.\n다운로드 폴더에서 확인하세요.`);
}

// ── 가져오기 공통 처리 (isMerge: false=덮어쓰기, true=병합) ──
function handleImportFile(e, isMerge) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith('.json')) {
        showMsg('JSON 파일(.json)만 가져올 수 있습니다.', 'warn');
        e.target.value = ''; return;
    }
    const reader = new FileReader();
    reader.onload = function(ev) {
        try {
            // BOM 제거 후 파싱
            const text = ev.target.result.replace(/^﻿/, '');
            const raw = JSON.parse(text);

            // 배열 직접 또는 {projects:[]} 형식 모두 허용
            const incoming = Array.isArray(raw) ? raw : (Array.isArray(raw.projects) ? raw.projects : null);
            if (!incoming) {
                showMsg('올바른 형식의 파일이 아닙니다.\n내보내기로 생성된 JSON만 지원됩니다.', 'error');
                e.target.value = ''; return;
            }

            // 필수 필드 검증
            const invalid = incoming.filter(p => !p.name || !p.team || !Array.isArray(p.phaseDetails) || p.phaseDetails.length === 0);
            if (invalid.length > 0) {
                showMsg(`데이터 손상 ${invalid.length}건 — 필수 필드 누락\n(${invalid.map(p => p.name || '(이름없음)').slice(0,3).join(', ')}${invalid.length > 3 ? '...' : ''})`, 'error');
                e.target.value = ''; return;
            }

            if (isMerge) {
                // 병합: 기존 프로젝트명 기준으로 중복 제외
                const existingNames = new Set(projects.map(p => p.name));
                const toAdd = incoming.filter(p => !existingNames.has(p.name));
                const skipped = incoming.length - toAdd.length;
                if (toAdd.length === 0) {
                    showMsg(`신규 프로젝트 없음 — ${skipped}개 모두 이미 존재하는 프로젝트명`, 'warn');
                    e.target.value = ''; return;
                }
                const msg = `[병합 가져오기]\n\n신규 추가: ${toAdd.length}개\n중복 제외: ${skipped}개${skipped > 0 ? '\n  -> ' + incoming.filter(p => existingNames.has(p.name)).map(p => p.name).join(', ') : ''}\n\n계속하시겠습니까?`;
                if (!confirm(msg)) { e.target.value = ''; return; }
                // ID 충돌 방지: 신규 ID 재발급
                toAdd.forEach(p => { p.id = Date.now() + Math.random(); });
                projects = [...projects, ...toAdd];
            } else {
                // 덮어쓰기
                const exportedAt = raw.exportedAt ? new Date(raw.exportedAt).toLocaleString('ko-KR') : '알 수 없음';
                const msg = `[가져오기 - 덮어쓰기]\n\n파일 내 프로젝트: ${incoming.length}개\n내보낸 시각: ${exportedAt}\n\n[!] 현재 데이터(${projects.length}개)가 모두 교체됩니다.\n계속하시겠습니까?`;
                if (!confirm(msg)) { e.target.value = ''; return; }
                projects = incoming;
            }

            saveToStorage();
            currentFilter = '전체';
            renderDashboard();
            showMsg(`${isMerge ? '병합' : '가져오기'} 완료 — 현재 ${projects.length}개 프로젝트`);
        } catch(err) {
            showMsg('파일 읽기 오류 — 올바른 JSON 파일인지 확인해 주세요.', 'error');
            console.error('[가져오기 오류]', err.message);
        }
        e.target.value = ''; // 동일 파일 재선택 가능하도록 초기화
    };
    reader.readAsText(file, 'utf-8');
}

function resetAllData() {
    if (!confirm('[!] 저장된 모든 프로젝트 데이터를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.')) return;
    localStorage.removeItem(LS_KEY);
    localStorage.removeItem(LS_KEY + '_meta');
    projects = [];
    currentFilter = '전체';
    renderDashboard();
    switchView('dashboard');
    showMsg('모든 데이터가 삭제되었습니다.');
}
function toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const next = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('si-theme', next);
    const lbl = document.getElementById('theme-toggle-label');
    if (lbl) lbl.innerText = next === 'dark' ? '라이트모드' : '다크모드';
    // 막대 인라인 색상이 CSS 변수값이므로 테마 전환 시 재렌더링 필요
    renderDashboard();
}

(function() {
    const t = localStorage.getItem('si-theme') || 'light';
    document.documentElement.setAttribute('data-theme', t);
    const lbl = document.getElementById('theme-toggle-label');
    if (lbl) lbl.innerText = t === 'dark' ? '라이트모드' : '다크모드';
})();
