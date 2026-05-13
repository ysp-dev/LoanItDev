// ── 실시간 협업: Socket.IO 클라이언트 ───────────────────

const _lockedProjects = new Map(); // projId → { sessionId, userName }

// 브라우저 탭 단위 세션 ID (새로고침해도 유지)
const _mySessionId = (() => {
    let id = sessionStorage.getItem('si-session-id');
    if (!id) {
        id = Date.now().toString(36) + Math.random().toString(36).slice(2);
        sessionStorage.setItem('si-session-id', id);
    }
    return id;
})();

let _socket = null;

function _initSocket() {
    if (typeof io === 'undefined') {
        console.warn('[Socket] socket.io 클라이언트 로드 실패 — 오프라인 모드');
        return;
    }
    try {
        _socket = io({ reconnectionDelay: 2000, reconnectionAttempts: 10 });

        _socket.on('connect', () => {
            // socketId를 lock 정보에 포함시켜 disconnect 시 서버가 자동 해제할 수 있게 함
            _socket._mySocketId = _socket.id;
        });

        // 다른 사용자가 저장한 데이터를 즉시 반영
        _socket.on('projects_updated', ({ year, projects }) => {
            if (year !== AppState.currentYear) return; // 다른 연도는 무시
            if (!Array.isArray(projects)) return;
            if (JSON.stringify(projects) === JSON.stringify(AppState.projects)) return;
            AppState.projects = projects;
            renderDashboard();
            showMsg('다른 사용자가 데이터를 업데이트했습니다.');
        });

        // 접속 시 현재 잠금 상태 수신
        _socket.on('lock_sync', (locks) => {
            _lockedProjects.clear();
            (locks || []).forEach(({ projId, sessionId, userName }) => {
                if (sessionId !== _mySessionId) _lockedProjects.set(projId, { sessionId, userName });
            });
            _applyLockBadges();
        });

        // 다른 사용자가 편집 시작
        _socket.on('project_locked', ({ projId, sessionId, userName }) => {
            if (sessionId === _mySessionId) return;
            _lockedProjects.set(projId, { sessionId, userName });
            _applyLockBadges();
        });

        // 편집 완료/취소
        _socket.on('project_unlocked', ({ projId }) => {
            _lockedProjects.delete(projId);
            _applyLockBadges();
        });

    } catch (e) {
        console.warn('[Socket] 초기화 실패:', e);
    }
}

// renderDashboard 이후 잠금 배지 DOM 적용
function _applyLockBadges() {
    document.querySelectorAll('[data-proj-id]').forEach(el => {
        const projId = parseInt(el.dataset.projId);
        const lock = _lockedProjects.get(projId);
        let badge = el.querySelector('.lock-badge');
        if (lock) {
            if (!badge) {
                badge = document.createElement('div');
                badge.className = 'lock-badge';
                el.appendChild(badge);
            }
            badge.textContent = `✏ ${lock.userName} 편집 중`;
        } else {
            badge?.remove();
        }
    });
}

// renderDashboard를 래핑해 렌더 후 항상 배지 적용
(function () {
    const _orig = window.renderDashboard;
    if (typeof _orig === 'function') {
        window.renderDashboard = function (...args) {
            _orig.apply(this, args);
            _applyLockBadges();
        };
    }
})();

// ── 공개 API ─────────────────────────────────────────

function isProjectLocked(projId) {
    return _lockedProjects.has(projId);
}

function lockProject(projId, userName) {
    if (!_socket?.connected) return;
    _socket.emit('lock_project', {
        projId,
        sessionId: _mySessionId,
        socketId:  _socket.id,
        userName:  userName || '다른 사용자',
    });
}

function unlockProject(projId) {
    if (!_socket?.connected || projId == null) return;
    _socket.emit('unlock_project', { projId, sessionId: _mySessionId });
}

// 페이지 종료/새로고침 시 내 잠금 해제
window.addEventListener('beforeunload', () => {
    if (AppState.editingProjectId != null) unlockProject(AppState.editingProjectId);
});
