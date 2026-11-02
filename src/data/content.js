/* 임시 데이터 — 나중에 보스처럼 설정 파일로 뺀다 */

/* ───────── 챕터 ─────────
   한 챕터 = 별자리 하나 = 스테이지 10개.
   5번째는 엘리트(중간보스), 10번째는 보스. */
export const CHAPTERS = [
  { no:1, name:'비행자리',  latin:'VOLANS',   hue:'#6c9bff' },
  { no:2, name:'반사자리',  latin:'SPECULUM', hue:'#5cf28f' },
  { no:3, name:'폭풍자리',  latin:'PROCELLA', hue:'#ff9f43' },
  { no:4, name:'중력자리',  latin:'GRAVIS',   hue:'#c56cff' },
  { no:5, name:'프리즘자리',latin:'PRISMA',   hue:'#ffe066' }
];

export const STAGES_PER_CH = 10;

/* 별자리 모양 — 챕터마다 다른 손그림 좌표 (0~1) */
const SHAPES = [
  // 1 비행자리 — 날개를 펴고 솟구치는 새
  [[.06,.64],[.19,.51],[.32,.41],[.45,.34],[.57,.31],
   [.69,.37],[.80,.47],[.89,.60],[.74,.68],[.55,.73]],
  // 2 반사자리 — 꺾이며 되튀는 빛
  [[.05,.30],[.16,.60],[.27,.32],[.38,.62],[.49,.34],
   [.60,.64],[.71,.36],[.82,.66],[.93,.42],[.61,.16]],
  // 3 폭풍자리 — 감겨 들어가는 소용돌이
  [[.93,.45],[.79,.23],[.53,.15],[.28,.25],[.17,.48],
   [.28,.70],[.51,.78],[.68,.68],[.68,.49],[.51,.45]],
  // 4 중력자리 — 서로를 도는 두 덩이
  [[.09,.49],[.19,.29],[.35,.22],[.48,.39],[.53,.56],
   [.65,.73],[.81,.71],[.93,.52],[.85,.31],[.68,.28]],
  // 5 프리즘자리 — 갈라지는 삼각 빛
  [[.13,.72],[.25,.51],[.37,.30],[.52,.15],[.64,.31],
   [.77,.51],[.90,.72],[.67,.72],[.43,.72],[.51,.49]]
];

/* 챕터마다 하늘에 놓인 자리·기울기·크기가 다르다 (줄 세우지 않는다) */
const CH_PLACE = [
  { x:0.035, y:0.300, rot:-0.11, sc:1.00 },
  { x:0.225, y:0.055, rot: 0.21, sc:0.86 },
  { x:0.385, y:0.520, rot:-0.28, sc:1.14 },
  { x:0.620, y:0.095, rot: 0.34, sc:0.93 },
  { x:0.800, y:0.455, rot:-0.07, sc:1.08 }
];
export const SKY = { w: 4200, h: 1700 };
const CH_W = 760, CH_H = 520;

/* 별의 밝기 — 실제 별자리처럼 고르지 않게 */
const MAG = [1.00,0.74,1.18,0.82,1.42,0.88,1.10,0.78,1.22,1.85];

export const STAGES = [];
CHAPTERS.forEach((ch, ci) => {
  const pl = CH_PLACE[ci];
  const cos = Math.cos(pl.rot), sin = Math.sin(pl.rot);
  SHAPES[ci].forEach(([lx, ly], si) => {
    const no = ci*STAGES_PER_CH + si + 1;
    const boss = si === STAGES_PER_CH - 1;
    const mid  = si === 4;
    // 가운데를 축으로 돌리고 크기를 바꾼다
    const dx = (lx - .5)*CH_W*pl.sc, dy = (ly - .5)*CH_H*pl.sc;
    const rx = dx*cos - dy*sin, ry = dx*sin + dy*cos;
    STAGES.push({
      no, ch: ch.no, idx: si, boss, mid,
      mag: boss ? MAG[9] : mid ? MAG[4] : MAG[si],
      view: ['top','side','front'][(no-1) % 3],
      name: boss ? `${ch.name} 수호자` : mid ? `엘리트 ${ch.no}` : `${ch.no}-${si+1}`,
      x: Math.round(pl.x*SKY.w + CH_W/2 + rx),
      y: Math.round(pl.y*SKY.h + CH_H/2 + ry)
    });
  });
});

export const chapterBox = no => {
  const s = STAGES.filter(st => st.ch === no);
  return {
    x1: Math.min(...s.map(p=>p.x)), x2: Math.max(...s.map(p=>p.x)),
    y1: Math.min(...s.map(p=>p.y)), y2: Math.max(...s.map(p=>p.y))
  };
};

export const VIEW_LABEL = { top:'탑뷰', side:'사이드뷰', front:'프론트뷰' };

/* ───────── 기체 ─────────
   지금은 모델이 들어온 것만 둔다. 챕터가 늘면 여기에 줄을 더한다. */
export const SHIPS = [
  { id:'hawk',  group:'basic', name:'호크', grade:'N', color:'#6c9bff',
    desc:'처음부터 타는 기체', skills:['guide','spread','barrier','blink'] },

  { id:'s1a',   group:'chapter', ch:1, name:'스피어 A',    grade:'R',   color:'#4dd8ff',
    desc:'1챕터 일반 기체 · 가볍고 빠르다',   skills:['spread','dash','orbit','blink'] },
  { id:'s1b',   group:'chapter', ch:1, name:'스피어 B',    grade:'R',   color:'#5cf28f',
    desc:'1챕터 일반 기체 · 튼튼하다',       skills:['beam','field','barrier','gravity'] },
  { id:'s1c',   group:'chapter', ch:1, name:'스피어 C',    grade:'SR',  color:'#ff9f43',
    desc:'1챕터 일반 기체 · 기본탄이 강하다', skills:['beam','spread','dash','summon'] },
  { id:'s1e',   group:'chapter', ch:1, name:'스피어 엘리트', grade:'SR', color:'#c56cff',
    desc:'1챕터 엘리트 · 스킬이 빨리 찬다',   skills:['guide','orbit','blink','field'] },
  { id:'s1boss',group:'chapter', ch:1, name:'스피어 기함',  grade:'SSR', color:'#e2364f',
    desc:'1챕터 수호자 · 묵직하고 단단하다',  skills:['gravity','beam','field','summon'] }
];

/* 스킨 — 성능은 그대로, 보이는 모습만 바뀐다 (무지개코인) */
export const SKINS = [
  { id:'sk_base',  base:'*',      name:'기본',   color:null },
  { id:'sk_neon',  base:'hawk',   name:'네온',   color:'#4dd8ff' },
  { id:'sk_frost', base:'hawk',   name:'서리',   color:'#a8e7ff' },
  { id:'sk_tide',  base:'s1a',    name:'파도',   color:'#4df0ff' },
  { id:'sk_leaf',  base:'s1b',    name:'새싹',   color:'#9cff8f' },
  { id:'sk_ash',   base:'s1c',    name:'잿빛',   color:'#ffd7a0' },
  { id:'sk_dusk',  base:'s1e',    name:'노을',   color:'#ff8bd0' },
  { id:'sk_void',  base:'s1boss', name:'공허',   color:'#ff7a90' }
];

/* ───────── 스킬 ───────── */
/* type — 쓰는 방법
   tap  즉발형   : 한 번 탭
   dir  방향형   : 누른 채 돌려 방향을 정하고 떼기
   zone 범위형   : 누른 채 끌어 범위 원을 놓고 떼기
   hold 홀드형   : 누르고 있는 동안 나가고, 돌려서 방향을 바꾸고, 떼면 멈춤 */
export const TYPE_NAME = { tap:'즉발형', dir:'방향형', zone:'범위 조준형', hold:'홀드형' };

export const SKILLS = [
  { id:'guide',   from:'basic', name:'유도탄',   icon:'◈', type:'tap',  desc:'적을 따라가는 탄' },
  { id:'spread',  from:'basic', name:'확산',     icon:'✸', type:'dir',  desc:'부채꼴로 흩뿌린다' },
  { id:'barrier', from:'basic', name:'반사판',   icon:'◣', type:'dir',  desc:'잠깐 세워두는 벽' },
  { id:'blink',   from:'basic', name:'순간이동', icon:'⇥', type:'dir',  desc:'앞으로 한 번에 건너뛴다' },

  { id:'beam',    from:1, name:'빔',     icon:'▮', type:'hold', desc:'누르는 동안 뻗는 굵은 줄기' },
  { id:'field',   from:1, name:'범위장', icon:'◎', type:'zone', desc:'닿는 것을 밀어낸다' },
  { id:'dash',    from:2, name:'가속',   icon:'➤', type:'dir',  desc:'잠깐 아주 빨라진다' },
  { id:'orbit',   from:3, name:'궤도',   icon:'◌', type:'tap',  desc:'주위를 도는 탄' },
  { id:'gravity', from:4, name:'중력',   icon:'◉', type:'zone', desc:'탄을 한곳으로 끌어모은다' },
  { id:'summon',  from:5, name:'소환',   icon:'❖', type:'tap',  desc:'작은 기체를 부른다' }
];
