// 연도는 AppState.currentYear 로 관리 — 아래는 초기값 참조용
const _INIT_YEAR = new Date().getFullYear();

function lsKey() { return `si_projects_${AppState.currentYear}`; }

const PRESET_TAGS = [
    { id: 'urgent',     label: '긴급',    bg: '#fee2e2', fg: '#b91c1c' },
    { id: 'regulatory', label: '법령',     bg: '#dbeafe', fg: '#1d4ed8' },
    { id: 'upgrade',    label: '자체개선', bg: '#ede9fe', fg: '#6d28d9' },
    { id: 'new',        label: '신규',     bg: '#dcfce7', fg: '#166534' },
    { id: 'maint',      label: '유지보수', bg: '#f1f5f9', fg: '#475569' },
    { id: 'planned',    label: '예정',     bg: '#fef9c3', fg: '#854d0e' },
];
const MS_PER_DAY    = 86400000;
const MIN_BAR_WIDTH = 0.3;

const LIST_COLS = [
    { key: 'no',       label: 'No',           sortFn: null },
    { key: 'name',     label: '프로젝트명',    sortFn: (a,b) => a.name.localeCompare(b.name,'ko') },
    { key: 'team',     label: '팀명',          sortFn: (a,b) => a.team.localeCompare(b.team,'ko') },
    { key: 'part',     label: '담당파트',      sortFn: (a,b) => (a.part||'').localeCompare(b.part||'','ko') },
    { key: 'pm',       label: '담당자',        sortFn: (a,b) => a.pm.localeCompare(b.pm,'ko') },
    { key: 'client',   label: '의뢰부서',      sortFn: (a,b) => (a.clientDept||'').localeCompare(b.clientDept||'','ko') },
    { key: 'period',   label: '개발기간',      sortFn: null },
    { key: 'duration', label: '총개발기간',    sortFn: null },
    { key: 'dday',     label: 'D-Day',         sortFn: (a,b) => new Date(a.open) - new Date(b.open) },
    { key: 'open',     label: '적용예정일',    sortFn: (a,b) => new Date(a.open) - new Date(b.open) },
    { key: 'phase',    label: '현재단계',      sortFn: null },
    { key: 'tags',     label: '태그',          sortFn: null },
];

const AppState = {
    projects:        [],
    currentYear:     _INIT_YEAR,
    currentFilter:   '전체',
    currentSearch:   '',
    currentView:     'card',
    currentScreen:   'dashboard',
    currentTagFilter: null,
    editingProjectId: null,
    dataVersion:     null,
    density:         'normal',
    listSortCol:     null,
    listSortDir:     1,
    listColVisible:  Object.fromEntries(LIST_COLS.map(c => [c.key, true])),
    formDirty:       false,
    commandHistory:  [],
};

// YYYY-MM-DD 문자열을 로컬 자정 기준으로 파싱 (UTC 파싱 시 한국 시간 오전 9시 오프셋 문제 방지)
