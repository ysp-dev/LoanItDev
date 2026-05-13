// ── 서버 API + localStorage 저장/불러오기 ────────────────────────
function apiUrl() { return `/api/projects/${AppState.currentYear}`; }

async function saveToStorage() {
    try {
        await fetch(apiUrl(), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(AppState.projects)
        });
    } catch(e) {
        console.warn('서버 저장 실패:', e);
    }
    try {
        localStorage.setItem(lsKey(), JSON.stringify(AppState.projects));
        localStorage.setItem(lsKey() + '_meta', JSON.stringify({
            savedAt: new Date().toISOString(),
            count: AppState.projects.length
        }));
    } catch(e) {}
    updateSavedInfo();
}

async function loadFromStorage() {
    try {
        const res = await fetch(apiUrl());
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
                // ID 기준 중복 제거
                const seen = new Set();
                return data.filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true; });
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
            if (Array.isArray(parsed)) return parsed;
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
