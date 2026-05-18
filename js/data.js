// ── 서버 API + localStorage 저장/불러오기 ────────────────────────
function apiUrl() { return `/api/projects/${AppState.currentYear}`; }

function _versionHeader() {
    return AppState.dataVersion ? { 'If-Match': AppState.dataVersion } : {};
}

function _normalizeProjectList(projects) {
    return (Array.isArray(projects) ? projects : [])
        .filter(p => p && typeof p === 'object')
        .map((p, idx) => {
            const id = Number.isFinite(Number(p.id)) ? Number(p.id) : Date.now() + idx + Math.random();
            const phaseDetails = Array.isArray(p.phaseDetails) ? p.phaseDetails
                .filter(pd => pd && typeof pd === 'object')
                .map(pd => ({
                    name: String(pd.name || ''),
                    start: String(pd.start || ''),
                    end: String(pd.end || ''),
                    color: String(pd.color || ''),
                    desc: String(pd.desc || '')
                })) : [];
            return {
                ...p,
                id,
                name: String(p.name || ''),
                team: String(p.team || ''),
                part: String(p.part || ''),
                pm: String(p.pm || ''),
                clientDept: String(p.clientDept || ''),
                open: String(p.open || ''),
                phaseDetails,
                tags: Array.isArray(p.tags) ? p.tags.map(String) : [],
                deps: Array.isArray(p.deps) ? p.deps.map(Number).filter(Number.isFinite) : []
            };
        });
}

async function saveToStorage(deletedIds = [], actionLabel = '', projects = AppState.projects, options = {}) {
    const normalizedProjects = _normalizeProjectList(projects);
    const payload = {
        projects: normalizedProjects,
        deleted_ids: deletedIds,
        action_label: actionLabel
    };
    if (options.replaceYear) payload.replace_year = true;
    try {
        const res = await fetch(apiUrl(), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ..._versionHeader() },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            let msg = `서버 저장 실패 (${res.status})`;
            try {
                const body = await res.json();
                if (body?.error) msg = body.error;
            } catch(e) {}
            if (res.status === 409) {
                msg = '다른 사용자가 먼저 저장했습니다. 새로고침 후 다시 시도해 주세요.';
            }
            if (typeof showMsg === 'function') showMsg(msg, 'error');
            return false;
        }
        AppState.dataVersion = res.headers.get('ETag') || AppState.dataVersion;
        if (projects === AppState.projects) AppState.projects = normalizedProjects;
    } catch(e) {
        console.warn('서버 저장 실패:', e);
        if (typeof showMsg === 'function') showMsg('서버에 연결할 수 없어 저장하지 못했습니다.', 'error');
        return false;
    }
    try {
        localStorage.setItem(lsKey(), JSON.stringify(normalizedProjects));
        localStorage.setItem(lsKey() + '_meta', JSON.stringify({
            savedAt: new Date().toISOString(),
            count: normalizedProjects.length
        }));
    } catch(e) {}
    updateSavedInfo();
    return true;
}

async function loadFromStorage() {
    try {
        const res = await fetch(apiUrl());
        if (res.ok) {
            AppState.dataVersion = res.headers.get('ETag') || AppState.dataVersion;
            const data = await res.json();
            if (Array.isArray(data)) {
                // ID 기준 중복 제거
                const seen = new Set();
                return _normalizeProjectList(data)
                    .filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true; });
            }
        }
    } catch(e) {
        console.warn('서버 연결 실패, 로컬 캐시 사용:', e);
    }
    // 서버 미응답 시에만 로컬스토리지 사용
    try {
        const raw = localStorage.getItem(lsKey());
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return _normalizeProjectList(parsed);
        }
    } catch(e) {}
    return [];
}

async function initData() {
    AppState.projects = await loadFromStorage();
    renderDashboard();
    updateSavedInfo();
}

const teams = ['전체', '여신심사팀', '여신업무팀', '여신관리팀', '상품/신용평가팀', '외환팀', 'PPR팀'];
