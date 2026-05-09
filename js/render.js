function buildBarAreaHtml(p) {
    const now = new Date();
    const todayPos = now.getFullYear() === CURRENT_YEAR ? getDatePos(now) : null;
    const openDateObj = parseDate(p.open);
    const isFutureOpen = openDateObj.getFullYear() > CURRENT_YEAR;
    const endPos = isFutureOpen ? 100 : getDatePos(p.open);
    const bars = p.phaseDetails.map((pd, idx) => {
        const pdStartDate = parseDate(pd.start);
        const pdEndDate   = parseDate(pd.end);
        if (pdStartDate.getFullYear() > CURRENT_YEAR) return '';
        const startX = getDatePos(pd.start);
        const naturalEnd = getDatePos(pd.end);
        const endsNextYear = pdEndDate.getFullYear() > CURRENT_YEAR;
        const endX = endsNextYear ? 100 : naturalEnd;
        const widthX = Math.max(0.3, endX - startX);
        const safeDesc = (pd.desc||'')
            .replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\r?\n/g,'\\n')
            .replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        const pdEnd = new Date(pdEndDate); pdEnd.setHours(23,59,59);
        const phaseState = now > pdEnd ? 'phase-done' : (now >= pdStartDate ? 'phase-active' : '');
        const continuesCls = endsNextYear ? ' phase-continues' : '';
        const barLabel = pd.name.split(':')[1] || pd.name;
        const safeBarDesc = (pd.desc||'').replace(/"/g,'&quot;').replace(/\r?\n/g,' ');
        return `<div class="phase-bar ${idx===0?'first-phase':''} ${phaseState}${continuesCls}" data-pname="${barLabel.replace(/"/g,'&quot;')}" data-start="${pd.start}" data-end="${pd.end}" data-desc="${safeBarDesc}" data-proj-id="${p.id}" data-phase-idx="${idx}" style="left:${startX}%;width:${widthX}%;background-color:${resolveColor(pd.color)};background-image:linear-gradient(to bottom,rgba(255,255,255,0.30) 0%,rgba(255,255,255,0.06) 50%,rgba(0,0,0,0.08) 100%);">${barLabel}</div>`;
    }).join('');
    const gridLines = Array.from({length:12},(_,mi)=>{
        const now2=new Date();
        const isCur=now2.getFullYear()===CURRENT_YEAR&&now2.getMonth()===mi;
        return `<div class="grid-line${isCur?' current-month-bar':''}"></div>`;
    }).join('');
    const todayHtml = todayPos!==null
        ? `<div class="past-overlay" style="width:${todayPos}%;"></div><div class="today-line" style="left:${todayPos}%;"></div>` : '';
    return gridLines + todayHtml + bars +
        `<div class="milestone" style="left:${isFutureOpen?'calc(100% + 8px)':endPos+'%'};"><span class="open-beacon"><span class="open-beacon-ring"></span><span class="open-beacon-ring"></span><span class="open-beacon-dot"></span></span>${formatOpenTag(p.open)}</div>`;
}

function renderSingleGanttRow(projId) {
    const proj = projects.find(p => p.id === projId);
    if (!proj) return;
    const row = document.querySelector(`.gantt-row[data-proj-id="${projId}"]`);
    if (!row) return;
    const barArea = row.querySelector('.bar-area');
    if (!barArea) return;
    barArea.innerHTML = buildBarAreaHtml(proj);
}

function renderDashboard() {
    const q = currentSearch.toLowerCase();
    const filtered = (currentFilter === '전체' ? projects : projects.filter(p => p.team === currentFilter))
        .filter(p => !q || [p.name, p.pm, p.team, p.part||'', p.clientDept||'',
            ...(p.phaseDetails||[]).map(pd => pd.name||'')
        ].some(v => v.toLowerCase().includes(q)))
        .slice().sort((a, b) => new Date(a.open) - new Date(b.open));

    const gc = document.getElementById('gantt-rows');
    if (gc) gc.classList.toggle('gantt-compact', compactView);
    const now = new Date();
    const todayMidnight = new Date(now); todayMidnight.setHours(0,0,0,0);

    const statCount   = filtered.length;
    const statOngoing = filtered.filter(p => new Date(p.open) > todayMidnight).length;
    const statDone    = filtered.filter(p => new Date(p.open) <= todayMidnight).length;
    const statEarly   = filtered.filter(p => { const d = new Date(p.open); return d.getFullYear() === CURRENT_YEAR && d.getMonth() < 6; }).length;
    document.getElementById('detail-count').innerText = `총 ${statCount.toLocaleString()}건`;
    _countUp('stat-count',     statCount,   v => `${Math.round(v).toLocaleString()}건`, statCount   === 0 ? '#94a3b8' : '');
    _countUp('stat-ongoing',   statOngoing, v => `${Math.round(v).toLocaleString()}건`, statOngoing === 0 ? '#94a3b8' : 'var(--blue)');
    _countUp('stat-done',      statDone,    v => `${Math.round(v).toLocaleString()}건`, statDone    === 0 ? '#94a3b8' : 'var(--emerald)');
    _countUp('stat-early-open', statEarly,  v => `${Math.round(v).toLocaleString()}건`, statEarly   === 0 ? '#94a3b8' : 'var(--emerald)');

    const todayPos = now.getFullYear() === CURRENT_YEAR ? getDatePos(now) : null;
    // 월별 셀 + 주간 눈금 생성
    let monthHtml = Array.from({length: 12}, (_, i) => {
        const daysInMonth = new Date(CURRENT_YEAR, i + 1, 0).getDate();
        // 주간 눈금: 7일 간격으로 tick 위치 계산 (월 내 비율)
        const ticks = [];
        for (let d = 7; d < daysInMonth; d += 7) {
            const pct = (d / daysInMonth * 100).toFixed(2);
            const isMid = Math.abs(d - Math.round(daysInMonth / 2)) <= 3; // 중간 주(2주차)는 약간 진하게
            ticks.push(`<div class="week-tick${isMid ? ' mid' : ''}" style="left:${pct}%"></div>`);
        }
        const isCurrentMonth = now.getFullYear() === CURRENT_YEAR && now.getMonth() === i;
        return `<div class="month-cell${isCurrentMonth ? ' current-month-col' : ''}"><span class="month-label">${i+1}월</span><div class="week-ticks">${ticks.join('')}</div></div>`;
    }).join('');
    if (todayPos !== null) monthHtml += `<div class="today-line" style="left: ${todayPos}%;"><div class="today-dot"></div></div>`;
    document.getElementById('month-header').innerHTML = monthHtml;

    const emptyHtml = (msg) => `<div class="empty-state">
        <div class="empty-state-icon"></div>
        <div class="empty-state-title">${msg}</div>
        <div class="empty-state-desc">필터 조건을 변경하거나 검색어를 확인해 주세요.</div>
        <button class="empty-state-btn" onclick="setFilter('전체');document.getElementById('search-input').value='';setSearch('');">전체 보기로 돌아가기</button>
    </div>`;

    if (!filtered.length) {
        const msg = currentSearch ? `'${currentSearch}' 검색 결과가 없습니다` : `${currentFilter} 팀의 프로젝트가 없습니다`;
        document.getElementById('gantt-rows').innerHTML = emptyHtml(msg);
        document.getElementById('card-grid').innerHTML = emptyHtml(msg);
        if (currentView === 'list') document.getElementById('list-view').innerHTML = emptyHtml(msg);
        return;
    }

    const ganttHtml = filtered.map((p, rowIdx) => {
        const styles = getStyleSet(p.team);
        // 오픈일이 올해 이후 연도이면 차트 끝(100%)에 깃발 표시
        const openDateObj = parseDate(p.open);
        const isFutureOpen = openDateObj.getFullYear() > CURRENT_YEAR;
        const endPos = isFutureOpen ? 100 : getDatePos(p.open);
        const bars = p.phaseDetails.map((pd, idx) => {
            const pdStartDate = parseDate(pd.start);
            const pdEndDate   = parseDate(pd.end);
            // 단계 시작일이 올해보다 미래이면 차트에 표시 안 함
            if (pdStartDate.getFullYear() > CURRENT_YEAR) return '';
            const startX = getDatePos(pd.start);
            const nextPd = p.phaseDetails[idx + 1];
            const naturalEnd = getDatePos(pd.end);
            // 단계 종료일이 올해를 넘어가면 차트 끝에서 자름
            const endsNextYear = pdEndDate.getFullYear() > CURRENT_YEAR;
            const nextStart = (nextPd && parseDate(nextPd.start).getFullYear() <= CURRENT_YEAR) ? getDatePos(nextPd.start) : null;
            const endX = endsNextYear ? 100 : naturalEnd;
            const widthX = Math.max(0.3, endX - startX);
            const widthStyle = `${widthX}%`;
            const safeDesc = pd.desc
                .replace(/\\/g, '\\\\')
                .replace(/'/g, "\\'")
                .replace(/\r?\n/g, '\\n')
                .replace(/&/g, '&amp;')
                .replace(/"/g, '&quot;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
            const pdStart = pdStartDate;
            const pdEnd   = new Date(pdEndDate); pdEnd.setHours(23,59,59);
            const phaseState = now > pdEnd ? 'phase-done' : (now >= pdStart ? 'phase-active' : '');
            const continuesCls = endsNextYear ? ' phase-continues' : '';
            const barLabel = pd.name.split(':')[1] || pd.name;
            const safeBarLabel = barLabel.replace(/"/g, '&quot;');
            const safeBarDesc = (pd.desc || '').replace(/"/g, '&quot;').replace(/\r?\n/g, ' ');
            return `<div class="phase-bar ${idx === 0 ? 'first-phase' : ''} ${phaseState}${continuesCls}" data-pname="${safeBarLabel}" data-start="${pd.start}" data-end="${pd.end}" data-desc="${safeBarDesc}" data-proj-id="${p.id}" data-phase-idx="${idx}" style="left: ${startX}%; width: ${widthStyle}; background-color: ${resolveColor(pd.color)}; background-image: linear-gradient(to bottom, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0.06) 50%, rgba(0,0,0,0.08) 100%);">${barLabel}</div>`;
        }).join('');

        return `<div class="gantt-row" data-team="${p.team}" data-proj-id="${p.id}" style="animation:fadeSlideLeft 0.38s ${rowIdx * 40}ms ease both;">
            <div class="project-info">
                <span class="team-tag ${styles.light}" style="font-size:9px; padding:1px 4px;">${p.team}</span>
                <div class="project-name">${p.name}</div>
                <div class="project-meta">
                    <span class="project-meta-sep">·</span>
                    ${p.part ? `<span class="pm-val">${p.part}</span><span class="project-meta-sep">·</span>` : ''}
                    <span>담당자 <span class="pm-val">${p.pm}</span></span>
                </div>
            </div>
            <div class="bar-area">
                ${Array.from({length: 12}, (_, mi) => { const isCur = now.getFullYear() === CURRENT_YEAR && now.getMonth() === mi; return `<div class="grid-line${isCur ? ' current-month-bar' : ''}"></div>`; }).join('')}
                ${todayPos !== null ? `<div class="past-overlay" style="width: ${todayPos}%;"></div><div class="today-line" style="left: ${todayPos}%;"></div>` : ''}
                ${bars}
                <div class="milestone" style="left:${isFutureOpen ? 'calc(100% + 8px)' : endPos + '%'};"><span class="open-beacon"><span class="open-beacon-ring"></span><span class="open-beacon-ring"></span><span class="open-beacon-dot"></span></span>${formatOpenTag(p.open)}</div>
            </div>
        </div>`;
    }).join('');

    const cardHtml = filtered.map((p, cardIdx) => {
        const styles = getStyleSet(p.team);
        const openDate = new Date(p.open);

        /* ── 단계 상태 판별 ── */
        let activePhase = p.phaseDetails.find(pd => {
            const s = parseDate(pd.start); const e = parseDate(pd.end); e.setHours(23,59,59);
            return now >= s && now <= e;
        });
        // gap 구간이면 다음 단계를 표시용으로 사용
        let displayPhase = activePhase;
        let isGap = false;
        if (!displayPhase && now >= parseDate(p.phaseDetails[0]?.start) && now < openDate) {
            displayPhase = p.phaseDetails.find(pd => parseDate(pd.start) > now);
            if (displayPhase) isGap = true;
        }

        /* ── 상태 뱃지 (시맨틱 컬러) ── */
        let statusBg, statusFg, statusTxt;
        if (activePhase) {
            statusBg='#dbeafe'; statusFg='#1d4ed8';   // 진행중 → 파랑
            statusTxt = (activePhase.name.split(':')[1]||activePhase.name).trim() + ' 진행중';
        } else if (now < parseDate(p.phaseDetails[0]?.start)) {
            statusBg='#f1f5f9'; statusFg='#64748b'; statusTxt='착수 준비중';  // 회색
        } else if (now >= openDate) {
            statusBg='#d1fae5'; statusFg='#065f46'; statusTxt='개발 완료';    // 초록
        } else if (isGap && displayPhase) {
            statusBg='#ede9fe'; statusFg='#5b21b6';
            statusTxt = (displayPhase.name.split(':')[1]||displayPhase.name).trim() + ' 준비중'; // 보라
        } else {
            statusBg='#ede9fe'; statusFg='#5b21b6'; statusTxt='오픈 준비중';  // 보라
        }

        /* ── D-Day 계산 ── */
        const openD = new Date(p.open);
        const diffDays = Math.round((openD - now) / 86400000);
        let ddayText, ddayColor, ddayBg;
        if (diffDays > 0) {
            ddayText = `D-${diffDays}`;
            ddayColor = diffDays <= 7 ? '#dc2626' : diffDays <= 30 ? '#d97706' : '#475569';
            ddayBg    = diffDays <= 7 ? '#fff1f2' : diffDays <= 30 ? '#fff7ed' : '#f1f5f9';
        } else if (diffDays === 0) {
            ddayText = 'D-Day'; ddayColor = '#dc2626'; ddayBg = '#fee2e2';
        } else {
            ddayText = `D+${Math.abs(diffDays)}`; ddayColor = '#94a3b8'; ddayBg = '#f1f5f9';
        }

        /* ── 현재/다음 단계 행 ── */
        const shownPhase = displayPhase;
        const shownDesc = shownPhase
            ? shownPhase.desc.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\r?\n/g,'<br>') : '';
        const shownLabel = isGap ? '예정' : '단계';

        const phaseSection = shownPhase ? `
            <hr class="card-divider">
            <div class="card-phase-row">
                <span class="card-phase-name">${(shownPhase.name.split(':')[1]||shownPhase.name).trim()}</span><span style="font-size:0.62rem;color:#94a3b8;font-weight:600;margin:0 5px 0 0;">${shownLabel}</span>
                <span class="card-phase-date">${fmtD(shownPhase.start)} ~ ${fmtD(shownPhase.end)}</span>
            </div>
            ${shownDesc ? `<div class="card-phase-desc" style="margin-top:4px;">${shownDesc}</div>` : ''}` : '';

        /* ── 총 개발기간 계산 ── */
        let totalMonthsStr = '-';
        let _earliest = null, _latest = null;
        if (p.phaseDetails && p.phaseDetails.length > 0) {
            const starts = p.phaseDetails.map(pd => parseDate(pd.start)).filter(d => !isNaN(d));
            const ends   = p.phaseDetails.map(pd => parseDate(pd.end)).filter(d => !isNaN(d));
            if (starts.length && ends.length) {
                _earliest = new Date(Math.min(...starts));
                const phaseLatest = new Date(Math.max(...ends));
                const openDate = new Date(p.open);
                _latest = openDate > phaseLatest ? openDate : phaseLatest;
                const months = (_latest.getFullYear() - _earliest.getFullYear()) * 12 + (_latest.getMonth() - _earliest.getMonth()) + 1;
                totalMonthsStr = `${months}개월`;
            }
        }
        const periodLine = (() => {
            if (!_earliest || !_latest) return '';
            return `<div style="margin-top:3px;font-size:0.68rem;color:#94a3b8;font-weight:500;display:flex;align-items:center;gap:5px;flex-wrap:wrap;"><span style="font-size:0.6rem;font-weight:700;background:#e2e8f0;color:#64748b;padding:1px 5px;border-radius:3px;white-space:nowrap;">총 개발기간</span>${fmtD(_earliest.toISOString().slice(0,10))} ~ ${fmtD(_latest.toISOString().slice(0,10))}<span style="font-size:0.6rem;font-weight:700;background:#dbeafe;color:#1d4ed8;padding:1px 6px;border-radius:3px;white-space:nowrap;">${totalMonthsStr}</span></div>`;
        })();

        /* ── 담당 정보 ── */
        const clientRow = p.clientDept
            ? `<span class="card-meta-item"><span class="card-meta-label" style="background:#e2e8f0;color:#475569;">의뢰부서</span><span class="card-meta-value">${hl(p.clientDept, q)}</span></span>` : '';

        const ambientRgba = hexToRgba(statusBg, 0.09);
        return `<div class="project-card" style="border-left-color:${styles.hex};background:linear-gradient(150deg,${ambientRgba} 0%,white 38%);animation:cardFadeIn 0.35s ease forwards;animation-delay:${cardIdx * 50}ms" ondblclick="editProject(${p.id})">
            <div class="card-chk-wrap">
                <input type="checkbox" class="card-row-chk" data-id="${p.id}" onchange="onCardChkChange(this)" title="선택">
            </div>

            <!-- ① 헤더: 팀 + D-Day + 상태 -->
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
                <span class="team-tag ${styles.light}">${hl(p.team, q)}</span>
                <div style="display:flex;align-items:center;gap:4px;">
                    <span class="dday-badge" style="background:${ddayBg};color:${ddayColor};">${ddayText}</span>
                    <span class="status-tag" style="background:${statusBg};color:${statusFg};">${statusTxt}</span>
                </div>
            </div>

            <!-- ② 프로젝트명 -->
            <div style="font-weight:900;font-size:0.95rem;color:var(--text-main);line-height:1.3;">${hl(p.name, q)}</div>
            ${periodLine}

            <!-- ③ 현재 단계 (활성 시만 표시) -->
            ${phaseSection}

            <!-- ④ 담당 정보 -->
            <hr class="card-divider">
            <div class="card-meta-row">
                <span class="card-meta-item">
                    <span class="card-meta-label" style="background:#e2e8f0;color:#475569;">파트</span>
                    <span class="card-meta-value">${p.part ? hl(p.part, q) : hl(p.team, q)}</span>
                </span>
                <span class="card-meta-item">
                    <span class="card-meta-label" style="background:#e2e8f0;color:#475569;">담당자</span>
                    <span class="card-meta-value">${hl(p.pm, q)}</span>
                </span>
                ${clientRow}
            </div>

            <!-- ⑤ 핵심 지표: 적용예정일 -->
            <div class="card-footer-metrics" style="margin-top:7px;grid-template-columns:1fr;">
                <div class="card-metric open">
                    <div class="card-metric-label">적용예정일</div>
                    <div class="card-metric-value">${fmtD(p.open)}</div>
                </div>
            </div>


        </div>`;
    }).join('');

    // DOM 쓰기를 단일 rAF 프레임에 일괄 처리 → 끊김 없는 트랜지션
    requestAnimationFrame(() => {
        document.getElementById('gantt-rows').innerHTML = ganttHtml;
        document.getElementById('card-grid').innerHTML = cardHtml;
        if (currentView === 'list') renderListView(filtered, now);
        // 레이아웃 완료 후 두 번째 프레임에서 측정해야 offsetWidth가 정확함
        requestAnimationFrame(autoFitBarFonts);
    });
}

/* ── 목록뷰 렌더 ── */
function renderListView(filtered, now) {
    const q = currentSearch.toLowerCase();
    if (!filtered.length) {
        document.getElementById('list-view').innerHTML = '<div class="list-no-data">조회된 프로젝트가 없습니다. 검색어 또는 필터 조건을 확인해 주세요.</div>';
        return;
    }

    // 정렬 적용
    let sorted = filtered.slice();
    if (listSortCol) {
        const col = LIST_COLS.find(c => c.key === listSortCol);
        if (col?.sortFn) sorted.sort((a,b) => listSortDir * col.sortFn(a, b));
    }

    const rows = sorted.map((p, idx) => {
        // D-Day
        const { text: ddayTxt, cls: ddayCls } = calcDDay(p.open, now);
        const diff = Math.round((new Date(p.open) - now) / 86400000);

        // 오픈일 클래스
        const openCls = diff < 0 ? 'open-past' : diff <= 30 ? 'open-soon' : 'open-future';

        // 총 개발기간
        const { periodStart, periodEnd, durStr } = calcDuration(p);

        // 현재 단계
        const curPhase = calcCurPhase(p, now);

        // 컬럼 가시성에 따라 td 생성
        const v = listColVisible;
        const td = (key, html) => v[key] ? `<td>${html}</td>` : '';
        return `<tr ondblclick="editProject(${p.id})" title="더블클릭하여 수정">
            <td style="text-align:center;"><input type="checkbox" class="list-row-chk" data-id="${p.id}" onchange="onListChkChange()" style="cursor:pointer;width:14px;height:14px;accent-color:#ef4444;"></td>
            ${td('no',`<span class="list-no-num">${idx+1}</span>`)}
            ${td('name',`<span class="list-td-name">${hl(p.name, q)}</span>`)}
            ${td('team',`<span class="list-team-tag">${hl(p.team, q)}</span>`)}
            ${td('part',p.part ? hl(p.part, q) : '<span style="color:#BBBBBB;">—</span>')}
            ${td('pm',hl(p.pm, q))}
            ${td('client',hl(p.clientDept||'', q))}
            ${td('period',`<span class="list-period">${periodStart} ~ ${periodEnd}</span>`)}
            ${td('duration',`<span class="list-duration">${durStr}</span>`)}
            ${td('dday',`<span class="dday-badge ${ddayCls}">${ddayTxt}</span>`)}
            ${td('open',`<span class="dday-badge ${openCls}">${fmtD(p.open)}</span>`)}
            ${td('phase',`<span class="list-phase">${curPhase}</span>`)}
        </tr>`;
    }).join('');

    // 헤더 생성
    const sortClass = key => {
        if (listSortCol !== key) return '';
        return listSortDir === 1 ? ' asc' : ' desc';
    };
    const th = (key, label, sortable=true) => {
        if (!listColVisible[key]) return '';
        const col = LIST_COLS.find(c=>c.key===key);
        const canSort = sortable && col?.sortFn;
        return canSort
            ? `<th class="list-th-sort${sortClass(key)}" onclick="sortListBy('${key}')">${label}</th>`
            : `<th>${label}</th>`;
    };

    document.getElementById('list-view').innerHTML = `
        <table class="list-table">
            <thead><tr>
                <th style="width:32px;"><input type="checkbox" id="list-chk-all" onchange="toggleAllListChk(this.checked)" style="cursor:pointer;width:14px;height:14px;accent-color:#ef4444;"></th>
                ${th('no','No',false)}
                ${th('name','프로젝트명')}
                ${th('team','팀명')}
                ${th('part','담당파트')}
                ${th('pm','담당자')}
                ${th('client','의뢰부서')}
                ${th('period','개발기간(시작~종료)',false)}
                ${th('duration','총개발기간',false)}
                ${th('dday','D-Day')}
                ${th('open','적용예정일')}
                ${th('phase','현재단계',false)}
            </tr></thead>
            <tbody>${rows}</tbody>
        </table>`;

}

function drawDepLines() { /* 의존성 라인 비활성화 */ }

function sortListBy(key) {
    if (listSortCol === key) listSortDir *= -1;
    else { listSortCol = key; listSortDir = 1; }
    renderDashboard();
}

function toggleColPanel() {
    const panel = document.getElementById('col-panel');
    const wrap  = document.getElementById('col-panel-wrap');
    if (panel.classList.contains('open')) {
        panel.classList.remove('open');
        return;
    }
    // 체크박스 목록 생성 (No 제외)
    panel.innerHTML = LIST_COLS.filter(c=>c.key!=='no').map(c=>`
        <label>
            <input type="checkbox" ${listColVisible[c.key]?'checked':''} onchange="toggleListCol('${c.key}',this.checked)">
            ${c.label}
        </label>`).join('');
    panel.classList.add('open');
    // 외부 클릭 시 닫기
    setTimeout(()=>{
        const close = e=>{ if(!wrap.contains(e.target)){ panel.classList.remove('open'); document.removeEventListener('click',close); }};
        document.addEventListener('click', close);
    }, 0);
}

function toggleListCol(key, visible) {
    listColVisible[key] = visible;
    renderDashboard();
}

/* ── 엑셀 내보내기 (SpreadsheetML) ── */
function autoFitBarFonts() {
    document.querySelectorAll('.phase-bar').forEach(bar => {
        const w = bar.offsetWidth;
        if (w <= 0) return;
        if (w < 16) {
            bar.style.fontSize = '0';
            bar.style.padding = '0';
        } else if (w < 28) {
            bar.style.fontSize = '0.44rem';
            bar.style.padding = '0 2px';
        } else if (w < 45) {
            bar.style.fontSize = '0.52rem';
            bar.style.padding = '0 4px';
        } else if (w < 70) {
            bar.style.fontSize = '0.6rem';
            bar.style.padding = '';
        } else if (w < 95) {
            bar.style.fontSize = '0.72rem';
            bar.style.padding = '';
        } else {
            bar.style.fontSize = '';
            bar.style.padding = '';
        }
    });
}

// ── 일괄 등록 그리드 ────────────────────────────
