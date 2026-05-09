function cascadePhases(proj, fromIdx) {
    const phases = proj.phaseDetails;
    for (let i = fromIdx + 1; i < phases.length; i++) {
        const prev  = phases[i - 1];
        const curr  = phases[i];
        const durMs = parseDate(curr.end) - parseDate(curr.start);
        const ns    = new Date(parseDate(prev.end));
        ns.setDate(ns.getDate() + 1);
        curr.start = dateToStr(ns);
        curr.end   = dateToStr(new Date(ns.getTime() + durMs));
    }
}

// 현단계 이전 모든 단계를 연쇄 이동 (기간 유지)
function cascadePhasesBackward(proj, fromIdx) {
    const phases = proj.phaseDetails;
    for (let i = fromIdx - 1; i >= 0; i--) {
        const next  = phases[i + 1];
        const curr  = phases[i];
        const durMs = parseDate(curr.end) - parseDate(curr.start);
        const ne    = new Date(parseDate(next.start));
        ne.setDate(ne.getDate() - 1);
        curr.end = dateToStr(ne);
        if (i > 0) {
            // 1단계(i=0) 외에는 시작일도 함께 이동
            curr.start = dateToStr(new Date(ne.getTime() - durMs));
        }
        // 1단계(i=0) 시작일은 고정 — end만 조정
    }
}

// 날짜 문자열 'YYYY-MM-DD' → 'YYYY.MM.DD' 포맷
function validateSingleDate(el) {
    // DD까지 완전히 입력된 경우에만 검증 (YYYY-MM-DD = 10자)
    if (!el.value || el.value.length < 10) return;
    const parts = el.value.split('-');
    if (parts.length < 3 || parts[2].length < 2) return;
    const yearPart = parts[0];
    if (yearPart && yearPart.length > 4) {
        el.value = "";
        el.focus();
        showMsg('연도는 4자리(예: 2026)로 입력해 주세요.', 'warn');
        return;
    }
    syncDateWraps();
}

/* 단계 간 순서 검증 디바운스 타이머 (DD 두 자리 입력 여유 확보) */
const _phaseValidateTimers = {};
function validatePhaseFlow(index, type) {
    const currentEl = document.getElementById(`ph-${type}-${index}`);
    if (!currentEl) return;

    /* ① 포맷·연도 범위 검증은 즉시 실행 */
    validateSingleDate(currentEl);

    /* ② 단계 간 순서 검증은 700ms 뒤 실행 (두 번째 DD 자리 입력 대기) */
    const key = `${index}-${type}`;
    clearTimeout(_phaseValidateTimers[key]);
    _phaseValidateTimers[key] = setTimeout(() => {
        if (!currentEl.value || currentEl.value.length < 10) return;
        const currentVal = new Date(currentEl.value);
        if (isNaN(currentVal.getTime())) return;

        if (type === 'start') {
            const endEl = document.getElementById(`ph-end-${index}`);
            if (endEl && endEl.value && currentVal > new Date(endEl.value)) {
                showMsg(`${index}단계: 시작일이 종료일보다 늦을 수 없습니다.`, 'warn');
                currentEl.value = ''; syncDateWraps(); return;
            }
            if (index > 1) {
                const prevEndEl = document.getElementById(`ph-end-${index - 1}`);
                if (prevEndEl && prevEndEl.value && currentVal < new Date(prevEndEl.value)) {
                    showMsg(`${index}단계: 시작일이 이전 단계 종료일(${prevEndEl.value})보다 빠릅니다.`, 'warn');
                    currentEl.value = '';
                }
            }
        } else {
            const startEl = document.getElementById(`ph-start-${index}`);
            if (startEl && startEl.value && currentVal < new Date(startEl.value)) {
                showMsg(`${index}단계: 종료일이 시작일보다 빠를 수 없습니다.`, 'warn');
                currentEl.value = '';
            }
        }
        syncDateWraps();
    }, 700);
}

const PH_NAMES = ['분석/설계', '개발', '단위테스트', '통합테스트', '이행'];

// 단계별 컬러 (간트 단계 색상과 동일 계열)
const PH_COLORS = ['#FFE48F','#FFD347','#FFC000','#FAB12E','#F9A307'];
const PH_TEXT   = '#433100';

function initPhaseInputs() {
    const container = document.getElementById('phase-inputs-container');
    if (container.children.length > 0) return;
    container.innerHTML = '';
    for(let i=1; i<=5; i++) {
        const req = i === 1 ? ' req' : '';
        const optTxt = i >= 2 ? '<span style="font-size:0.6rem;color:#94a3b8;font-weight:500;margin-left:4px;">(선택)</span>' : '';
        container.innerHTML += `
            <div class="phase-block" style="border-left-color:${PH_COLORS[i-1]};">
                <div class="phase-block-header">
                    <span class="phase-num-badge" style="background:${PH_COLORS[i-1]};color:${PH_TEXT};">${i}단계</span>
                    <span style="font-size:0.72rem;color:#94a3b8;font-weight:600;">단계명 · 일정 · 추진내용${optTxt}</span>
                </div>
                <div class="phase-block-body">
                    <div class="form-group${req}"><label>단계명</label><input type="text" id="ph-name-${i}" placeholder="예: ${PH_NAMES[i-1]}"></div>
                    <div class="form-group${req}"><label>시작일</label><div class="date-wrap ph-show"><input type="date" id="ph-start-${i}" min="2000-01-01" max="2099-12-31" onchange="validatePhaseFlow(${i}, 'start')"></div></div>
                    <div class="form-group${req}"><label>종료일</label><div class="date-wrap ph-show"><input type="date" id="ph-end-${i}" min="2000-01-01" max="2099-12-31" onchange="validatePhaseFlow(${i}, 'end')"></div></div>
                    <div class="form-group${req}"><label>상세 추진 내용</label><textarea id="ph-desc-${i}" rows="2" placeholder="추진 내용을 요약하세요"></textarea></div>
                </div>
            </div>
        `;
    }
}

let _currentStep = 1;
function goStep(n) {
    const total = 3;
    _currentStep = Math.max(1, Math.min(total, n));
    document.querySelectorAll('.stepper-panel').forEach((panel, i) => {
        panel.classList.toggle('active', i + 1 === _currentStep);
    });
    document.querySelectorAll('.stepper-step').forEach((step, i) => {
        const num = i + 1;
        step.classList.toggle('active', num === _currentStep);
        step.classList.toggle('done', num < _currentStep);
    });
    document.querySelectorAll('.stepper-line').forEach((line, i) => {
        line.classList.toggle('done', i + 1 < _currentStep);
    });
}

function _markInvalid(el, msg) {
    el.classList.remove('field-invalid');
    void el.offsetWidth; // reflow to restart animation
    el.classList.add('field-invalid');
    setTimeout(() => el.classList.remove('field-invalid'), 400);
    el.focus();
    showMsg(msg, 'warn');
}

function validateStep(n) {
    if (n === 1) {
        const checks = [
            { id: 'in-name',        msg: '프로젝트명을 입력해 주세요.' },
            { id: 'in-team',        msg: '담당 팀을 선택해 주세요.' },
            { id: 'in-part',        msg: '담당 파트를 입력해 주세요.' },
            { id: 'in-pm',          msg: '담당자를 입력해 주세요.' },
            { id: 'in-client-dept', msg: '의뢰부서명을 입력해 주세요.' },
            { id: 'in-open',        msg: '적용예정일을 입력해 주세요.' },
        ];
        for (const { id, msg } of checks) {
            const el = document.getElementById(id);
            if (!el.value.trim()) { _markInvalid(el, msg); return false; }
        }
    }
    if (n === 2) {
        const checks = [
            { id: 'ph-name-1',  msg: '1단계 단계명을 입력해 주세요.' },
            { id: 'ph-start-1', msg: '1단계 시작일을 입력해 주세요.' },
            { id: 'ph-end-1',   msg: '1단계 종료일을 입력해 주세요.' },
        ];
        for (const { id, msg } of checks) {
            const el = document.getElementById(id);
            if (!el || !el.value.trim()) { if (el) _markInvalid(el, msg); else showMsg(msg, 'warn'); return false; }
        }
    }
    return true;
}

function handleResetOrCancel() {
    if (editingProjectId) {
        cancelEdit();
    } else {
        resetForm();
    }
}

function cancelEdit() {
    editingProjectId = null;
    switchView('dashboard');
}

function resetForm(silent = false) {
    document.getElementById('in-name').value = '';
    document.getElementById('in-team').value = '';
    document.getElementById('in-part').value = '';
    document.getElementById('in-pm').value = '';
    document.getElementById('in-client-dept').value = '';
    document.getElementById('in-open').value = '';
    for(let i=1; i<=5; i++) {
        if(document.getElementById(`ph-name-${i}`)) {
            document.getElementById(`ph-name-${i}`).value = '';
            document.getElementById(`ph-start-${i}`).value = '';
            document.getElementById(`ph-end-${i}`).value = '';
            document.getElementById(`ph-desc-${i}`).value = '';
        }
    }
    syncDateWraps();
    goStep(1);
    if(!silent) showMsg('모든 항목이 초기화되었습니다.');
}

function deleteProject() {
    if (!editingProjectId) return;
    const p = projects.find(item => item.id === editingProjectId);
    if (!p) return;
    if (!confirm(`'${p.name}' 프로젝트를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;
    projects = projects.filter(item => item.id !== editingProjectId);
    saveToStorage();
    editingProjectId = null;
    switchView('dashboard');
    renderDashboard();
    showMsg(`'${p.name}' 프로젝트가 삭제되었습니다.`);
}

function editProject(id) {
    const p = projects.find(item => item.id === id);
    if (!p) return;
    editingProjectId = id;
    switchView('admin', true);
    resetForm(true);

    document.getElementById('form-title').innerText = p.name;
    const badge = document.getElementById('form-mode-badge');
    badge.style.display = 'inline-block'; badge.innerText = '수정 모드';
    document.getElementById('btn-submit').innerText = "수정 내용 등록";
    document.getElementById('btn-delete').style.display = 'inline-block';
    document.getElementById('btn-top-sep').classList.add('visible');
    document.getElementById('btn-top-reset').innerText = '수정 취소';

    document.getElementById('in-name').value = p.name;
    document.getElementById('in-team').value = p.team;
    document.getElementById('in-part').value = p.part || '';
    document.getElementById('in-pm').value = p.pm;
    document.getElementById('in-client-dept').value = p.clientDept || '';
    document.getElementById('in-open').value = p.open;

    p.phaseDetails.forEach((pd, idx) => {
        const i = idx + 1;
        document.getElementById(`ph-name-${i}`).value = pd.name.split(':')[1] || pd.name;
        document.getElementById(`ph-start-${i}`).value = pd.start;
        document.getElementById(`ph-end-${i}`).value = pd.end;
        document.getElementById(`ph-desc-${i}`).value = pd.desc;
    });
    syncDateWraps();
}

function saveNewProject() {
    const name = document.getElementById('in-name').value.trim();
    const team = document.getElementById('in-team').value;
    const part = document.getElementById('in-part').value.trim();
    const pm = document.getElementById('in-pm').value.trim();
    const clientDept = document.getElementById('in-client-dept').value.trim();
    const openVal = document.getElementById('in-open').value;

    // ── 1. 필수 항목 체크 (폼 순서 기준) ───────────
    if (!name)       { showMsg('프로젝트명을 입력해 주세요.', 'warn');       document.getElementById('in-name').focus();        return; }
    if (!team)       { showMsg('담당 팀을 선택해 주세요.', 'warn');           document.getElementById('in-team').focus();        return; }
    if (!part)       { showMsg('담당 파트를 입력해 주세요.', 'warn');          document.getElementById('in-part').focus();        return; }
    if (!pm)         { showMsg('담당자를 입력해 주세요.', 'warn');             document.getElementById('in-pm').focus();          return; }
    if (!clientDept) { showMsg('의뢰부서명을 입력해 주세요.', 'warn');         document.getElementById('in-client-dept').focus(); return; }

    // ── 2. 적용예정일 체크 ──────────────────────────
    if (!openVal) { showMsg('적용예정일을 입력해 주세요.', 'warn'); document.getElementById('in-open').focus(); return; }
    const openDateObj = new Date(openVal);
    const todayMidnight = new Date(); todayMidnight.setHours(0,0,0,0);
    if (openDateObj < todayMidnight) { showMsg('적용예정일이 오늘 이전입니다.\n오픈 예정일을 확인해 주세요.', 'warn'); document.getElementById('in-open').focus(); return; }

    // ── 5. 중복 프로젝트명 체크 ─────────────────────
    const isDuplicate = projects.some(p => p.name === name && p.id !== editingProjectId);
    if (isDuplicate) {
        showMsg(`'${name}' 프로젝트가 이미 존재합니다.\n다른 프로젝트명을 사용해 주세요.`, 'warn');
        document.getElementById('in-name').focus(); return;
    }

    // ── 6. 단계별 일정 수집 및 부분 입력 체크 ────────
    const phaseDetails = [];
    for (let i = 1; i <= 5; i++) {
        const pName  = document.getElementById(`ph-name-${i}`).value.trim();
        const pStart = document.getElementById(`ph-start-${i}`).value;
        const pEnd   = document.getElementById(`ph-end-${i}`).value;
        const pDesc  = document.getElementById(`ph-desc-${i}`).value.trim();

        const hasAny = pName || pStart || pEnd;
        const hasAll = pName && pStart && pEnd;

        if (hasAny && !hasAll) {
            const missing = [];
            if (!pName)  missing.push('단계 이름');
            if (!pStart) missing.push('시작일');
            if (!pEnd)   missing.push('종료일');
            showMsg(`${i}단계: ${missing.join(', ')}을(를) 입력해 주세요.\n(일부만 입력된 단계는 등록할 수 없습니다.)`, 'warn');
            document.getElementById(`ph-name-${i}`).focus(); return;
        }

        if (hasAll) {
            if (pStart > pEnd) {
                showMsg(`${i}단계: 시작일(${pStart})이 종료일(${pEnd})보다 늦습니다.\n날짜를 확인해 주세요.`, 'warn');
                document.getElementById(`ph-start-${i}`).focus(); return;
            }
            if (phaseDetails.length > 0 && pStart < phaseDetails[phaseDetails.length-1].end) {
                showMsg(`${i}단계 시작일(${pStart})이 이전 단계 종료일(${phaseDetails[phaseDetails.length-1].end})보다 이전입니다.\n단계 일정은 순서대로 입력해 주세요.`, 'warn');
                document.getElementById(`ph-start-${i}`).focus(); return;
            }
            phaseDetails.push({
                name: `${i}단계:${pName}`,
                start: pStart,
                end: pEnd,
                color: `var(--phase-${i})`,
                desc: pDesc
            });
        }
    }

    if (phaseDetails.length === 0) {
        showMsg('최소 1개 이상의 단계 일정을 입력해 주세요.\n(단계 이름 + 시작일 + 종료일 모두 필요)', 'warn');
        document.getElementById('ph-name-1').focus(); return;
    }

    // ── 7. 오픈일 vs 마지막 단계 종료일 비교 ─────────
    const lastPhaseEnd = phaseDetails[phaseDetails.length - 1].end;
    if (openVal < lastPhaseEnd) {
        const confirmProceed = confirm(
            `[!] 적용예정일(${openVal})이\n마지막 단계 종료일(${lastPhaseEnd})보다 이전입니다.\n\n그대로 등록하시겠습니까?`
        );
        if (!confirmProceed) { document.getElementById('in-open').focus(); return; }
    }

    // ── 8. 저장 처리 ────────────────────────────────
    const projectData = { id: editingProjectId || Date.now(), team, part, pm, clientDept, name, open: openVal, phaseDetails };

    if (editingProjectId) {
        const index = projects.findIndex(p => p.id === editingProjectId);
        projects[index] = projectData;
    } else {
        projects.push(projectData);
    }

    saveToStorage();
    showMsg(editingProjectId ? `'${name}' 프로젝트가 수정되었습니다.` : `'${name}' 프로젝트가 등록되었습니다.`);
    editingProjectId = null;
    renderDashboard();
    switchView('dashboard');
}

// CSS 변수(var(--xxx))를 실제 값으로 변환 — 인라인 스타일에서 var()가 해석 안 되는 환경(모바일 PDF 등) 대응
// 캐시 없음: 다크/라이트 테마 전환 시 변수 값이 달라지므로 매번 getComputedStyle로 최신값을 읽음
