const DEFAULT_PROJECTS = [
    { id: 1, team: '외환팀', pm: '홍길동', name: '인니중간지주 시스템 구축', open: '2027-01-01', phaseDetails: [
        { name: '1단계:선정', start: '2026-01-01', end: '2026-03-31', color: 'var(--phase-1)', desc: '현지 계열사 결산 체계 분석 및 데이터 연계 설계' },
        { name: '2단계:분석', start: '2026-04-01', end: '2026-07-31', color: 'var(--phase-2)', desc: '중간지주 재무제표 산출 로직 설계 및 요건 반영' },
        { name: '3단계:개발', start: '2026-08-01', end: '2026-11-30', color: 'var(--phase-3)', desc: '연결 결산시스템 구축 및 생성 모듈 개발' },
        { name: '4단계:테스트', start: '2026-12-01', end: '2026-12-31', color: 'var(--phase-4)', desc: '단위/통합 테스트 및 현지 금융기관 연계 검증' }
    ]},
    { id: 2, team: 'PPR팀', pm: '성춘향', name: '보이스피싱 피해예측 고도화', open: '2026-12-15', phaseDetails: [
        { name: '1단계:분석', start: '2026-05-01', end: '2026-06-30', color: 'var(--phase-1)', desc: '의심 거래 패턴 분석 및 이상 거래 탐지 룰 설계' },
        { name: '2단계:구현', start: '2026-07-01', end: '2026-09-30', color: 'var(--phase-2)', desc: '실시간 수집 인프라 및 머신러닝 모델 연동' },
        { name: '3단계:테스트', start: '2026-10-01', end: '2026-11-30', color: 'var(--phase-3)', desc: '과거 데이터 기반 탐지율 검증 및 보안 점검' },
        { name: '4단계:안정화', start: '2026-12-01', end: '2026-12-31', color: 'var(--phase-4)', desc: '관제 시스템 오픈 및 24시간 장애 대응' }
    ]},
    { id: 3, team: '여신심사팀', pm: '이몽룡', name: '개인여신 플랫폼 재구축', open: '2026-10-06', phaseDetails: [
        { name: '1단계:설계', start: '2026-01-01', end: '2026-02-28', color: 'var(--phase-1)', desc: '차세대 코어뱅킹 기반 상세 설계 및 아키텍처 수립' },
        { name: '2단계:개발', start: '2026-03-01', end: '2026-06-30', color: 'var(--phase-2)', desc: '비대면 여신 심사 로직 구현 및 모듈 개발' },
        { name: '3단계:테스트', start: '2026-07-01', end: '2026-09-30', color: 'var(--phase-3)', desc: '전사 성능 테스트 및 데이터 최종 이행' },
        { name: '4단계:안정화', start: '2026-10-01', end: '2026-10-31', color: 'var(--phase-4)', desc: '오픈 및 사후 관리 시스템 가동' }
    ]}
];

// ── 서버 API + localStorage 저장/불러오기 ────────────────────────
const API_URL = '/api/projects';

async function saveToStorage() {
    // localStorage 즉시 캐시
    try {
        localStorage.setItem(LS_KEY, JSON.stringify(projects));
        localStorage.setItem(LS_KEY + '_meta', JSON.stringify({
            savedAt: new Date().toISOString(),
            count: projects.length
        }));
    } catch(e) {}
    updateSavedInfo();
    // 서버 저장 (백그라운드)
    try {
        await fetch(API_URL, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(projects)
        });
    } catch(e) {
        console.warn('서버 저장 실패 (localStorage에는 저장됨):', e);
    }
}

async function loadFromStorage() {
    // 서버에서 먼저 시도
    try {
        const res = await fetch(API_URL);
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) return data;
        }
    } catch(e) {
        console.warn('서버 연결 실패, 로컬 캐시 사용:', e);
    }
    // 폴백: localStorage
    try {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed;
        }
    } catch(e) {}
    return null;
}

// 시작 시 서버 → localStorage → 빈 배열 순으로 로드
let projects = [];

async function initData() {
    projects = await loadFromStorage() || [];
    renderDashboard();
    updateSavedInfo();
}

let currentFilter = '전체';
let currentSearch = '';
let currentView   = 'card';
const teams = ['전체', '여신심사팀', '여신업무팀', '여신관리팀', '상품/신용평가팀', '외환팀', 'PPR팀'];
