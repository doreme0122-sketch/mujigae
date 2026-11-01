/* 아군 기체 설정 데이터 — 기체·스타일·도색을 늘릴 때 코드는 고치지 않고 여기만 고친다.
   조립 규칙
   - 모델 파일 고르기: 스타일에 도색별 파일이 있으면 그것(3번), 없으면 도색의 파일, 없으면 기체 기본 파일.
     도색의 src = 그 도색이 빌려 쓰는 다른 도색의 파일(다이아몬드는 기준 도색 무늬를 씀).
   - 스타일 = 부품 고르기: model.slotTag(부품 자리 이름)·model.choiceTag(번호)가 붙은 부품 중
     style.parts[자리] 번호와 다른 것은 뺀다. parts에 없는 자리(공통 몸통)는 늘 남는다.
   - 도색 종류(kind)
     original : 파일 재질 그대로
     skinset  : 받은 도색 자료(재질 번호별 색·그림)로 바꿈 — 1번
     diamond  : 공용 다이아몬드 블록 (motif = 무늬를 빌려 올 도색, line = 원래 색 그대로 둘 라인 부품)
   - fx(덧입힘): film(얇은 무지개 막 공용 블록) · foil(2번 받은 홀로그램 반사) · opal(1번 받은 오팔 반사) */

const A = 'assets/ships/';

/* 공용 다이아몬드 규칙 (2026-10-31 확정): 넓은 면은 무슨 색이든 다이아, 기체별 고유 라인 부품만 원래 색 */
const DIA = (motif, extra = {}) => ({ id: 'dia', name: '다이아몬드', kind: 'diamond', src: motif, ...extra });

export const SHIPS = [
  {
    id: 1, grade: 0, gems: 0, name: '선봉 01', en: 'VANGUARD 01',
    model: { file: A + '01/BASE_01_R45_LIBRARY.glb', slotTag: 'r28_slot', choiceTag: 'r28_choice' },
    engines: { match: 'Nozzle' },                                               /* 엔진 빛 자리: 이 이름의 부품 뒤끝 */
    styles: [
      { id: 1, name: '시그니처',     parts: { wing: 1, tail: 1, engine: 1, weapon: 1 } },
      { id: 2, name: '듀얼 세이버',  parts: { wing: 2, tail: 2, engine: 2, weapon: 2 } },
      { id: 3, name: '크로스 전진익', parts: { wing: 3, tail: 3, engine: 3, weapon: 3 } }
    ],
    skins: A + '01/skins/',
    paints: [
      { id: 'ruby',   name: '루비 골드',   kind: 'original' },
      { id: 'onyx',   name: '오닉스 골드', kind: 'skinset', set: 'onyx' },
      { id: 'petrol', name: '페트롤 그린', kind: 'skinset', set: 'petrol' },
      { id: 'prism',  name: '오팔 프리즘', kind: 'skinset', set: 'prism', fx: { type: 'opal', skip: 'canopy|core|cyan|violet|intake|black' } },
      DIA('ruby', { body: [.53, .02, .12], line: 'gold|champagne' })          /* 1번 라인: 샴페인 골드 */
    ]
  },
  {
    id: 2, grade: 1, gems: 5, name: '백조 02', en: 'SWAN 02',
    model: { file: A + '02/R18_LIBRARY_AURUM.glb', slotTag: 'r17_slot', choiceTag: 'r17_choice' },
    engines: { match: 'Thruster.*(Exhaust_Core|Hollow_Housing)' },
    /* 2026-10-31: 스타일 2·3의 꼬리날개와 뒷날개를 서로 바꿈 */
    styles: [
      { id: 1, name: '시그니처',    parts: { wing: 0, rear: 0, tail: 0, engine: 0 } },
      { id: 2, name: '트리플 페더', parts: { wing: 1, rear: 2, tail: 2, engine: 1 } },
      { id: 3, name: '그랜드 델타', parts: { wing: 2, rear: 1, tail: 1, engine: 2 } }
    ],
    paints: [
      { id: 'AURUM',    name: '아우룸',   kind: 'original' },
      { id: 'OBSIDIAN', name: '옵시디언', kind: 'original', file: A + '02/R18_LIBRARY_OBSIDIAN.glb' },
      { id: 'CRIMSON',  name: '크림슨',   kind: 'original', file: A + '02/R18_LIBRARY_CRIMSON.glb' },
      { id: 'CRYSTAL',  name: '프리즘 홀로그램', kind: 'original', file: A + '02/R18_LIBRARY_CRYSTAL.glb', fx: { type: 'foil' } },
      DIA('AURUM', { line: 'champagne' })                                      /* 2번 라인: 샴페인 티타늄 */
    ]
  },
  {
    id: 3, grade: 0, gems: 10, name: '창 03', en: 'LANCE 03',
    engines: { at: [[0, -.05, .47], [-.07, -.05, .45], [.07, -.05, .45]] },   /* 기체 크기 대비 자리 (가운데·좌우) */
    /* 스타일마다 파일이 따로 있음 (A/B/C) */
    styles: [
      { id: 1, name: '원형', files: { lime: A + '03/A_lime.glb', comic: A + '03/A_comic.glb', military: A + '03/A_military.glb', gold_prism: A + '03/A_gold_prism.glb' } },
      { id: 2, name: '쌍익', files: { lime: A + '03/B_lime.glb', comic: A + '03/B_comic.glb', military: A + '03/B_military.glb', gold_prism: A + '03/B_gold_prism.glb' } },
      { id: 3, name: '델타', files: { lime: A + '03/C_lime.glb', comic: A + '03/C_comic.glb', military: A + '03/C_military.glb', gold_prism: A + '03/C_gold_prism.glb' } }
    ],
    paints: [
      { id: 'lime',     name: '라임', kind: 'original' },
      { id: 'comic',    name: '만화', kind: 'original' },
      { id: 'military', name: '국방', kind: 'original' },
      /* 골드 프리즘 (2026-10-31 확정): 짙고 맑은 노란 금 + 반사색이 바뀌는 무지개 막 + 막 자체의 은은한 빛, 진한 띠/금 띠가 번갈아 흐름 */
      { id: 'gold_prism', name: '골드 프리즘', kind: 'original', fx: {
          type: 'film', skip: 'dome|canopy|glass',
          recolor: { color: [1.0, .70, .24], ref: .4085, gamma: .55, min: .32 },   /* 원래 밝기 단계 유지, 금색만 맞춤 (ref = 원래 몸통 금 밝기) */
          surface: { metalness: 1, roughness: .07, envMapIntensity: 1.5, clearcoat: 1, clearcoatRoughness: .03, iridescence: 0 },
          film: { mode: 'reflect', freq: 2.2, angle: 2.4, front: .16, side: .75, band: true, mix: .55, glow: [.03, .16], sharpen: 1.4, flow: .05 },
          split: { width: .09, power: 24, gain: 2.4 }, saturate: 1.12 } },
      DIA('lime', { body: [.73, .81, .13], line: '_edge|_groove' })           /* 3번 라인: 보라 테두리·연보라 홈 */
    ]
  },
  {
    id: 4, grade: 0, gems: 15, name: '04', en: 'FIGHTER 04',   /* 등급: 일반 (2026-10-31 확정) */
    model: { file: A + '04/neon-black.glb' },
    engines: { match: 'exhaust_exit_collar|recessed_inner_nozzle_frame' },                                   /* 몸통-날개 이음부 정리한 모델 (2026-10-31) */
    styles: [ { id: 1, name: '스타일 A' } ],
    paints: [
      { id: 'neon-black',  name: '네온 블랙',   kind: 'original' },
      { id: 'racing-red',  name: '레이싱 레드', kind: 'original', file: A + '04/racing-red.glb' },
      { id: 'royal-white', name: '로열 화이트', kind: 'original', file: A + '04/royal-white.glb' },
      /* 블루 프리즘 (2026-10-31 확정): 네온 블랙의 어두운 색 전체 → 맑은 깊은 파랑 금속 + 무지개 막, 라인·숫자·은빛 판은 그대로 */
      { id: 'blue', name: '블루 프리즘', kind: 'original', src: 'neon-black', fx: {
          type: 'film', only: 'textured|INNER', frame: { match: 'EDGE|FRAME|FASTENER', color: '#7fa3d6' },
          mask: { lo: .025, hi: .06, color: [.02, .11, .42], grain: .12 },          /* 그림의 어두운 색 = 프리즘 바탕 */
          surface: { metalness: .92, roughness: .09, clearcoat: 1, clearcoatRoughness: .05, envMapIntensity: 1.25 },
          film: { mode: 'tint', freq: 1.0, angle: 2.2, front: .16, side: .62, flow: .04 },
          split: { width: .06, power: 40, gain: 1.1 } } },
      DIA('neon-black')                                                          /* 4번 라인: 도색 그림 안 분홍·하늘색 */
    ]
  }
];

export const shipById = id => SHIPS.find(s => s.id === id);
