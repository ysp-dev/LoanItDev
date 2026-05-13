function initBulkColResize() {
    const table = document.querySelector('.bulk-grid');
    if (!table || table.dataset.resizeInit) return;
    table.dataset.resizeInit = '1';
    table.querySelectorAll('thead th').forEach(th => {
        if (parseInt(th.getAttribute('colspan') || '1') > 1) return;
        const handle = document.createElement('div');
        handle.className = 'bulk-col-resizer';
        th.appendChild(handle);
        handle.addEventListener('mousedown', e => {
            const startX = e.pageX;
            const startW = th.offsetWidth;
            handle.classList.add('resizing');
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            const onMove = e => {
                const w = Math.max(28, startW + e.pageX - startX);
                th.style.width = w + 'px';
                th.style.minWidth = w + 'px';
            };
            const onUp = () => {
                handle.classList.remove('resizing');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
            e.preventDefault();
        });
    });
}

const BULK_MAX = 20;
let bulkGridInited = false;
let bulkRidSeq = 0;   // 행 고유 ID 시퀀스
let bulkRids  = [];   // 현재 활성 행 ID 목록

const TEAM_OPTIONS = ['여신심사팀','여신업무팀','여신관리팀','상품/신용평가팀','외환팀','PPR팀']
    .map(t => `<option value="${t}">${t}</option>`).join('');

function makeBulkRow(rid) {
    const tr = document.createElement('tr');
    tr.id = `bulk-tr-${rid}`;
    const phaseCols = [1,2,3,4,5].map(p =>
        `<td><input type="text" id="bg-p${p}n-${rid}" placeholder="${PH_NAMES[p-1]}" maxlength="30"></td>
         <td><input type="date" id="bg-p${p}s-${rid}" value="" min="2000-01-01" max="2099-12-31" autocomplete="off"></td>
         <td><input type="date" id="bg-p${p}e-${rid}" value="" min="2000-01-01" max="2099-12-31" autocomplete="off"></td>
         <td><input type="text" id="bg-p${p}d-${rid}" placeholder="설명" maxlength="100"></td>`
    ).join('');
    tr.innerHTML = `
        <td class="row-chk col-fix-1"><input type="checkbox" class="bulk-chk" data-rid="${rid}" onchange="onBulkChkChange(this)"></td>
        <td class="row-num col-fix-2" id="bulk-rnum-${rid}"></td>
        <td class="col-fix-3"><input type="text" id="bg-name-${rid}" placeholder="프로젝트명" maxlength="60"></td>
        <td><select id="bg-team-${rid}"><option value="">팀 선택</option>${TEAM_OPTIONS}</select></td>
        <td><input type="text" id="bg-part-${rid}" placeholder="파트명" maxlength="30"></td>
        <td><input type="text" id="bg-pm-${rid}" placeholder="담당자" maxlength="20"></td>
        <td><input type="text" id="bg-client-${rid}" placeholder="의뢰부서" maxlength="40"></td>
        <td><input type="date" id="bg-open-${rid}" value="" min="2000-01-01" max="2099-12-31" autocomplete="off"></td>
        <td><input type="text" id="bg-tags-${rid}" placeholder="긴급,신규…" maxlength="80" title="${PRESET_TAGS.map(t=>t.label).join(', ')} — 쉼표로 구분"></td>
        ${phaseCols}`;
    tr.querySelectorAll('input[type="date"]').forEach(el => { el.value = ''; el.defaultValue = ''; });
    return tr;
}

function updateBulkMeta() {
    bulkRids.forEach((rid, idx) => {
        const el = document.getElementById(`bulk-rnum-${rid}`);
        if (el) el.textContent = idx + 1;
    });
    const el = document.getElementById('bulk-row-count');
    if (el) el.textContent = `${bulkRids.length} / ${BULK_MAX}`;
}

function initBulkGrid() {
    if (bulkGridInited) return;
    bulkGridInited = true;
    bulkRids = [];
    document.getElementById('bulk-tbody').innerHTML = '';
    addBulkRow();
}

function addBulkRow() {
    if (bulkRids.length >= BULK_MAX) { showMsg(`최대 ${BULK_MAX}건까지 추가 가능합니다.`); return; }
    bulkRidSeq++;
    const rid = bulkRidSeq;
    document.getElementById('bulk-tbody').appendChild(makeBulkRow(rid));
    bulkRids.push(rid);
    updateBulkMeta();
}

function deleteBulkRows() {
    const checked = [...document.querySelectorAll('.bulk-chk:checked')];
    if (!checked.length) { showMsg('삭제할 행을 체크해 주세요.'); return; }
    checked.forEach(chk => {
        const rid = parseInt(chk.dataset.rid);
        const tr = document.getElementById(`bulk-tr-${rid}`);
        if (tr) tr.remove();
        bulkRids = bulkRids.filter(r => r !== rid);
    });
    const allChk = document.getElementById('bulk-chk-all');
    if (allChk) allChk.checked = false;
    updateBulkMeta();
}

function onBulkChkChange(chk) {
    const rid = parseInt(chk.dataset.rid);
    const tr = document.getElementById(`bulk-tr-${rid}`);
    if (tr) tr.classList.toggle('row-checked', chk.checked);
    // 전체 체크박스 상태 동기화
    const all = [...document.querySelectorAll('.bulk-chk')];
    const allChk = document.getElementById('bulk-chk-all');
    if (allChk) allChk.checked = all.length > 0 && all.every(c => c.checked);
}

function toggleAllBulkChk(checked) {
    document.querySelectorAll('.bulk-chk').forEach(chk => {
        chk.checked = checked;
        onBulkChkChange(chk);
    });
}

function clearBulkGrid() {
    if (!confirm('일괄 입력 내용을 초기화하시겠습니까?\n(빈 1행만 남습니다)')) return;
    bulkRids = [];
    document.getElementById('bulk-tbody').innerHTML = '';
    const allChk = document.getElementById('bulk-chk-all');
    if (allChk) allChk.checked = false;
    const ep = document.getElementById('bulk-error-panel');
    if (ep) ep.style.display = 'none';
    addBulkRow();
}

function saveBulk() {
    if (bulkRids.length === 0) { showMsg('등록할 데이터가 없습니다. 행을 추가해 주세요.'); return; }
    const checkedRids = [...document.querySelectorAll('.bulk-chk:checked')].map(el => parseInt(el.dataset.rid));
    if (checkedRids.length === 0) { showMsg('등록할 행을 체크해 주세요.'); return; }
    let saved = 0, errors = [];
    for (const r of checkedRids) {
        const rowNum = bulkRids.indexOf(r) + 1;
        const name = (document.getElementById(`bg-name-${r}`)?.value || '').trim();
        if (!name) { errors.push(`${rowNum}행: 프로젝트명이 입력되지 않았습니다.`); continue; }
        const team = document.getElementById(`bg-team-${r}`)?.value || '';
        const part = (document.getElementById(`bg-part-${r}`)?.value || '').trim();
        const pm   = (document.getElementById(`bg-pm-${r}`)?.value || '').trim();
        const client = (document.getElementById(`bg-client-${r}`)?.value || '').trim();
        const openVal = document.getElementById(`bg-open-${r}`)?.value || '';
        if (!team)    { errors.push(`${rowNum}행 [${name}]: 담당팀을 선택해 주세요.`); continue; }
        if (!part)    { errors.push(`${rowNum}행 [${name}]: 담당파트를 입력해 주세요.`); continue; }
        if (!pm)      { errors.push(`${rowNum}행 [${name}]: 담당자가 입력되지 않았습니다.`); continue; }
        if (!openVal) { errors.push(`${rowNum}행 [${name}]: 적용예정일이 입력되지 않았습니다.`); continue; }
        const phaseDetails = [];
        for (let p = 1; p <= 5; p++) {
            const pn = (document.getElementById(`bg-p${p}n-${r}`)?.value || '').trim();
            const ps = document.getElementById(`bg-p${p}s-${r}`)?.value || '';
            const pe = document.getElementById(`bg-p${p}e-${r}`)?.value || '';
            const pd = (document.getElementById(`bg-p${p}d-${r}`)?.value || '').trim();
            if (pn && ps && pe) {
                const colors = ['var(--phase-1)','var(--phase-2)','var(--phase-3)','var(--phase-4)','var(--phase-5)'];
                phaseDetails.push({ name: `${p}단계:${pn}`, start: ps, end: pe, color: colors[p-1], desc: pd });
            }
        }
        if (phaseDetails.length === 0) { errors.push(`${rowNum}행 [${name}]: 단계 정보가 없습니다. (단계명·시작일·종료일 모두 필요)`); continue; }
        const isDup = AppState.projects.some(pr => pr.name === name);
        if (isDup) { errors.push(`${rowNum}행 [${name}]: 동일한 프로젝트명이 이미 등록되어 있습니다.`); continue; }
        const tagStr = (document.getElementById(`bg-tags-${r}`)?.value || '');
        const tags = tagStr.split(',').map(s => s.trim()).reduce((acc, label) => {
            const t = PRESET_TAGS.find(t => t.label === label || t.id === label);
            if (t && !acc.includes(t.id)) acc.push(t.id);
            return acc;
        }, []);
        AppState.projects.push({ id: Date.now() + r, team, part, pm, clientDept: client, name, open: openVal, phaseDetails, tags });
        saved++;
    }
    if (saved > 0) { saveToStorage(); renderDashboard(); }
    const errPanel = document.getElementById('bulk-error-panel');
    if (errors.length > 0) {
        if (errPanel) {
            errPanel.style.display = 'block';
            errPanel.innerHTML = `<div class="bulk-err-title">⚠️ 등록 실패 ${errors.length}건</div>${errors.map(e => `<div class="bulk-err-item">${e}</div>`).join('')}`;
            errPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        showMsg(saved > 0 ? `${saved}건 등록 완료 (${errors.length}건 실패)` : `등록 실패 ${errors.length}건`, saved > 0 ? '' : 'error');
    } else {
        if (errPanel) errPanel.style.display = 'none';
        showMsg(saved > 0 ? `${saved}건 등록 완료` : '등록 가능한 행이 없습니다.');
    }
}

function downloadBulkTemplate() {
    const bom = '﻿';
    const header = '프로젝트명,담당팀,담당파트,담당자,의뢰부서,적용예정일,태그,1단계,1시작,1종료,1설명,2단계,2시작,2종료,2설명,3단계,3시작,3종료,3설명,4단계,4시작,4종료,4설명,5단계,5시작,5종료,5설명';
    const rows = [
        '여신심사 업무시스템 고도화,여신심사팀,개인여신심사,홍길동,개인여신부,2026-11-30,자체개선,분석/설계,2026-01-02,2026-03-31,현행 시스템 분석 및 요건 정의,개발,2026-04-01,2026-08-31,신규 기능 개발 및 API 연동,통합테스트,2026-09-01,2026-10-15,전 모듈 통합 테스트,안정화,2026-10-16,2026-11-30,운영 이관 및 안정화,,,,',
        '여신업무 처리 자동화,여신업무팀,여신계약,이순신,기업여신부,2026-10-31,신규,요건정의,2026-01-15,2026-03-14,업무 자동화 범위 및 요건 정의,개발,2026-03-15,2026-07-31,자동화 모듈 개발 및 단위 테스트,검증,2026-08-01,2026-10-31,파일럿 운영 및 검증,,,,,,,,',
        '여신관리 모니터링 시스템 구축,여신관리팀,여신담보,강감찬,여신관리부,2026-12-31,법령,현황분석,2026-02-01,2026-03-31,현행 모니터링 체계 분석,설계,2026-04-01,2026-06-30,신규 모니터링 아키텍처 설계,개발,2026-07-01,2026-10-31,대시보드 및 알림 기능 개발,오픈준비,2026-11-01,2026-12-31,안정화 및 운영 이관,,,,',
        '신용평가 모델 고도화,상품/신용평가팀,상품관리,장보고,신용평가부,2026-09-30,자체개선,요건정의,2026-01-15,2026-02-28,평가 모델 요건 및 데이터 정의,모델개발,2026-03-01,2026-06-30,ML 모델 학습 및 검증,파일럿,2026-07-01,2026-08-31,파일럿 운영 및 성능 평가,운영이관,2026-09-01,2026-09-30,운영계 배포 및 모니터링,,,,',
        '외환거래 플랫폼 재구축,외환팀,외국환,을지문덕,외환영업부,2026-10-31,,현황분석,2026-02-01,2026-03-15,현행 플랫폼 분석 및 아키텍처 수립,설계,2026-03-16,2026-05-31,신규 플랫폼 설계,개발,2026-06-01,2026-09-15,플랫폼 개발 및 연동,검수,2026-09-16,2026-10-31,QA 및 오픈 준비,,,,',
        'PPR 보고체계 전산화,PPR팀,이미지플랫폼,유관순,기획부,2026-12-31,예정,요건정의,2026-03-01,2026-04-30,보고 양식 및 데이터 요건 정의,설계/개발,2026-05-01,2026-09-30,보고 화면 및 배치 개발,테스트,2026-10-01,2026-11-15,사용자 수용 테스트,오픈준비,2026-11-16,2026-12-31,데이터 검증 및 오픈 준비,,,'
    ];
    const csv = bom + header + '\n' + rows.join('\n') + '\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'si_project_bulk_template.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    showMsg('템플릿 파일 내보내기 완료.\n다운로드 폴더에서 확인하세요.');
}

function importBulkCSV(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        // 그리드 완전 초기화 (플래그 우회)
        bulkRids = []; bulkRidSeq = 0;
        document.getElementById('bulk-tbody').innerHTML = '';
        const lines = e.target.result.replace(/\r/g, '').split('\n').filter(l => l.trim());
        const startRow = lines[0].includes('프로젝트명') ? 1 : 0;
        let count = 0;
        for (let i = startRow; i < lines.length; i++) {
            const cols = parseCSVLine(lines[i]);
            if (!cols[0] || !cols[0].trim()) continue;
            if (bulkRids.length >= BULK_MAX) break;
            addBulkRow();
            const rid = bulkRids[bulkRids.length - 1];

            const set     = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
            const setDate = (id, v) => { const el = document.getElementById(id); if (el) el.value = normalizeDate(v || ''); };
            set(`bg-name-${rid}`, cols[0]); set(`bg-team-${rid}`, cols[1]);
            set(`bg-part-${rid}`, cols[2]); set(`bg-pm-${rid}`, cols[3]);
            set(`bg-client-${rid}`, cols[4]); setDate(`bg-open-${rid}`, cols[5]);
            set(`bg-tags-${rid}`, cols[6]);
            for (let p = 0; p < 5; p++) {
                const base = 7 + p * 4;
                set(`bg-p${p+1}n-${rid}`, cols[base]); setDate(`bg-p${p+1}s-${rid}`, cols[base+1]);
                setDate(`bg-p${p+1}e-${rid}`, cols[base+2]); set(`bg-p${p+1}d-${rid}`, cols[base+3]);
            }
            count++;
        }
        showMsg(`${count}행 가져오기 완료`);
    };
    reader.readAsText(file, 'UTF-8');
    event.target.value = '';
}

