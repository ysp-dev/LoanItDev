const CURRENT_YEAR = new Date().getFullYear();
const YEAR_START = new Date(`${CURRENT_YEAR}-01-01`).getTime();
const YEAR_END   = new Date(`${CURRENT_YEAR}-12-31`).getTime();
const YEAR_DURATION = YEAR_END - YEAR_START;
const LS_KEY = `si_projects_${CURRENT_YEAR}`;

let editingProjectId = null;
let compactView = false;
let listSortCol = null, listSortDir = 1;
const LIST_COLS = [
    {key:'no',      label:'No',        sortFn:null},
    {key:'name',    label:'프로젝트명',     sortFn:(a,b)=>a.name.localeCompare(b.name,'ko')},
    {key:'team',    label:'팀명',       sortFn:(a,b)=>a.team.localeCompare(b.team,'ko')},
    {key:'part',    label:'담당파트',    sortFn:(a,b)=>(a.part||'').localeCompare(b.part||'','ko')},
    {key:'pm',      label:'담당자',      sortFn:(a,b)=>a.pm.localeCompare(b.pm,'ko')},
    {key:'client',  label:'의뢰부서',   sortFn:(a,b)=>(a.clientDept||'').localeCompare(b.clientDept||'','ko')},
    {key:'period',  label:'개발기간',   sortFn:null},
    {key:'duration',label:'총개발기간', sortFn:null},
    {key:'dday',    label:'D-Day',      sortFn:(a,b)=>new Date(a.open)-new Date(b.open)},
    {key:'open',    label:'적용예정일',  sortFn:(a,b)=>new Date(a.open)-new Date(b.open)},
    {key:'phase',   label:'현재단계',   sortFn:null},
];
let listColVisible = Object.fromEntries(LIST_COLS.map(c=>[c.key,true]));

// YYYY-MM-DD 문자열을 로컬 자정 기준으로 파싱 (UTC 파싱 시 한국 시간 오전 9시 오프셋 문제 방지)
