import math, random, base64, io
import numpy as np
from PIL import Image, ImageFilter
random.seed(5); np.random.seed(5)
W,H=1800,1000; CX,CY=900,500; LW=380
rot=lambda p:(W-p[0],H-p[1])
# ── 지역 (반쪽 + 돌린 대칭) : 이름, 레벨, 색
R=[ # x,y, 이름, 레벨, 색(RGB 0-1), 보스번호
 (150,140,'먼지 들판','Lv 1–3',(.22,.42,.25),None),
 (150,860,'먼지 들판','Lv 1–3',(.22,.42,.25),None),
 (700,110,'고철 언덕','Lv 1–3',(.36,.33,.26),None),
 (250,500,'떠도는 바위숲','Lv 3–5',(.27,.3,.34),None),
 (500,150,'유성 낙하지','Lv 3–5',(.4,.27,.2),None),
 (480,880,'안개 늪','Lv 3–5',(.13,.36,.38),None),
 (430,310,'얼음 성운 지대','Lv 6–8',(.32,.5,.62),1),
 (390,690,'용암 균열대','Lv 6–8',(.55,.22,.1),2),
 (480,500,'블랙홀 협곡','Lv 5–7',(.45,.3,.16),None),
 (665,360,'결정 협곡','Lv 8–10',(.25,.45,.7),3),
 (640,710,'함선 묘지','Lv 8–10',(.35,.24,.24),4),
 (880,215,'폭풍 고원','Lv 8–10',(.25,.3,.55),5),
]
seeds=R+[(W-x,H-y,n,l,c,b) for x,y,n,l,c,b in R]
# 가운데
CEN=(CX,CY)
# 땅 그림 (지역 색 + 경계는 바위 능선)
sc=2
w,h=W//sc,H//sc
yy,xx=np.mgrid[0:h,0:w].astype(np.float32)*sc
def noise(s,f):
    rng=np.random.RandomState(s); g=rng.rand(int(h*f)+2,int(w*f)+2).astype(np.float32)
    im=Image.fromarray((g*255).astype(np.uint8)).resize((w,h),Image.BICUBIC); return np.asarray(im).astype(np.float32)/255
nx=(noise(1,.03)-.5)*90+(noise(2,.09)-.5)*30; ny=(noise(3,.03)-.5)*90+(noise(4,.09)-.5)*30
X=xx+nx; Y=yy+ny
D=np.stack([np.hypot(X-s[0],Y-s[1]) for s in seeds])
idx=np.argsort(D,0); d1=np.take_along_axis(D,idx[:1],0)[0]; d2=np.take_along_axis(D,idx[1:2],0)[0]; near=idx[0]
cen=((X-CX)/245)**2+((Y-CY)/175)**2
col=np.zeros((h,w,3),np.float32)
cols=np.array([s[4] for s in seeds],np.float32)
col=cols[near]*.55
tex=noise(7,.25)*.5+noise(8,.6)*.5
col*= (.75+.5*tex)[...,None]
edge=np.clip(1-(d2-d1)/22,0,1)                    # 지역 경계 = 바위 능선
inC=cen<1
col[inC]=np.array([.4,.13,.13])*(.75+.5*tex[inC])[...,None]
ring=np.clip(1-np.abs(cen-1)/.09,0,1)
rock=np.maximum(edge,ring)
rocktex=(noise(9,.35)>.42).astype(np.float32)*.6+.4
rc=np.array([.36,.37,.41])*rocktex[...,None]
col=col*(1-rock[...,None]*.92)+rc*rock[...,None]*.92
# 바깥 테두리
border=(xx<40)|(xx>W-40)|(yy<40)|(yy>H-40)
col[border]=np.array([.03,.035,.05])
img=Image.fromarray((np.clip(col,0,1)*255).astype(np.uint8)).resize((W,H),Image.BICUBIC).filter(ImageFilter.GaussianBlur(.8))
buf=io.BytesIO(); img.save(buf,'PNG'); b64=base64.b64encode(buf.getvalue()).decode()
S=[]; add=S.append
add(f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="{W+LW}" height="{H}" viewBox="0 0 {W+LW} {H}"><defs><filter id="glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><filter id="soft"><feGaussianBlur stdDeviation="10"/></filter><filter id="sh"><feDropShadow dx="0" dy="1" stdDeviation="1.6" flood-color="#000" flood-opacity=".9"/></filter></defs>')
add(f'<rect width="{W+LW}" height="{H}" fill="#07090f"/><image x="0" y="0" width="{W}" height="{H}" href="data:image/png;base64,{b64}"/>')
def T(x,y,s,size=15,col='#e8ecf4',w=500,anchor='middle'):
    add(f'<text x="{x:.0f}" y="{y:.0f}" fill="{col}" font-size="{size}" font-weight="{w}" text-anchor="{anchor}" filter="url(#sh)" font-family="Noto Sans KR, sans-serif">{s}</text>')
def smooth(pts):
    d=f'M{pts[0][0]:.1f},{pts[0][1]:.1f}'
    for i in range(len(pts)-1):
        p0=pts[max(0,i-1)];p1=pts[i];p2=pts[i+1];p3=pts[min(len(pts)-1,i+2)]
        c1=(p1[0]+(p2[0]-p0[0])/6,p1[1]+(p2[1]-p0[1])/6); c2=(p2[0]-(p3[0]-p1[0])/6,p2[1]-(p3[1]-p1[1])/6)
        d+=f' C{c1[0]:.1f},{c1[1]:.1f} {c2[0]:.1f},{c2[1]:.1f} {p2[0]:.1f},{p2[1]:.1f}'
    return d
def sym(pts): return [pts,[rot(p) for p in pts]]
# ── 길 (마을 길처럼 이어진 큰길 · 오솔길) ──
ROADS=[ [(150,140),(260,250),(320,400),(300,500)], [(150,860),(260,750),(320,600),(300,500)],
 [(300,500),(420,500),(560,470),(690,440)], [(700,110),(620,200),(560,240)], [(560,240),(430,310)],[(560,240),(665,330),(700,410)],
 [(300,500),(390,620),(390,690)], [(390,690),(520,760),(640,710),(720,600)], [(150,860),(320,900),(480,880),(600,820)],
 [(700,110),(820,160),(880,215),(830,330)], [(150,140),(330,120),(500,150),(620,140)] ]
for P in ROADS:
    for Q in sym(P):
        add(f'<path d="{smooth(Q)}" fill="none" stroke="#1b1610" stroke-width="12" stroke-linecap="round" opacity=".55"/><path d="{smooth(Q)}" fill="none" stroke="#d8c58e" stroke-width="5" stroke-linecap="round" stroke-dasharray="1 0" opacity=".85"/>')
FOG=[[(250,500),(160,500),(70,500)],[(480,880),(560,960)],[(430,310),(470,180),(560,240)]]
for P in FOG:
    for Q in sym(P): add(f'<path d="{smooth(Q)}" fill="none" stroke="#5fe0d8" stroke-width="4" stroke-dasharray="2 8" stroke-linecap="round"/>')
# ── 지역 장식·몬스터 (지역마다 그 지역다운 것) ──
def at(x,y,f):
    for p in [(x,y),rot((x,y))]: f(*p)
def mobs(x,y,c='#86d96f',n=3):
    at(x,y,lambda px,py:[add(f'<circle cx="{px+random.uniform(-9,9):.0f}" cy="{py+random.uniform(-7,7):.0f}" r="4" fill="{c}"/>') for _ in range(n)])
def camp(x,y,c='#e9bd4c'): at(x,y,lambda px,py:add(f'<circle cx="{px}" cy="{py}" r="10" fill="{c}" stroke="#fff3c4" stroke-width="2"/>'))
def boss(x,y,n): at(x,y,lambda px,py:add(f'<circle cx="{px}" cy="{py}" r="22" fill="#7a1f3a" stroke="#ff6f9a" stroke-width="3" filter="url(#glow)"/><text x="{px}" y="{py+6}" fill="#fff" font-size="16" font-weight="700" text-anchor="middle" font-family="Noto Sans KR">{n}</text>'))
def post(x,y): at(x,y,lambda px,py:add(f'<g filter="url(#glow)"><path d="M{px-14},{py+10} L{px},{py-14} L{px+14},{py+10} Z" fill="#0d2a33" stroke="#6fe0ff" stroke-width="2.5"/><circle cx="{px}" cy="{py+2}" r="4" fill="#6fe0ff"/></g>'))
def cave(x,y): at(x,y,lambda px,py:add(f'<path d="M{px-14},{py+9} Q{px},{py-20} {px+14},{py+9} Z" fill="#000" stroke="#c9a0ff" stroke-width="2.5" filter="url(#glow)"/>'))
def chest(x,y): at(x,y,lambda px,py:add(f'<rect x="{px-9}" y="{py-7}" width="18" height="13" rx="3" fill="#ffd34a" stroke="#fff3b0" stroke-width="2"/>'))
def wh(x,y,n): at(x,y,lambda px,py:add(f'<circle cx="{px}" cy="{py}" r="16" fill="#2a1a4a" stroke="#c48bff" stroke-width="4"/><text x="{px}" y="{py+5}" fill="#ecd6ff" font-size="14" font-weight="700" text-anchor="middle" font-family="Noto Sans KR">{n}</text>'))
def tower(x,y): at(x,y,lambda px,py:add(f'<polygon points="{px},{py-13} {px+11},{py+8} {px-11},{py+8}" fill="#b9ff4a" filter="url(#glow)"/>'))
def spawn(x,y): at(x,y,lambda px,py:add(f'<circle cx="{px}" cy="{py}" r="28" fill="#163a28" stroke="#b9ff4a" stroke-width="3"/><circle cx="{px}" cy="{py}" r="9" fill="#b9ff4a" filter="url(#glow)"/>'))
def ward(x,y): at(x,y,lambda px,py:add(f'<circle cx="{px}" cy="{py}" r="34" fill="#6fe0ff" fill-opacity=".07" stroke="#6fe0ff" stroke-width="1.5" stroke-dasharray="4 5"/><g filter="url(#glow)"><polygon points="{px},{py-15} {px+9},{py} {px},{py+15} {px-9},{py}" fill="#0d2a33" stroke="#9ff0ff" stroke-width="2.5"/><circle cx="{px}" cy="{py}" r="3.5" fill="#d8fbff"/></g>'))
BUSHC={'dust':'#4d6b3a','fog':'#2f7a73','ice':'#4a6f8f','lava':'#6a3a2a','crys':'#4a4f8f','hull':'#5a4a44','storm':'#44507a','rock':'#4a5058','center':'#5a2f3a','meteor':'#5e4a33'}
def regcol(px,py):
    j=min(h-1,max(0,int(py/sc))); i=min(w-1,max(0,int(px/sc)))
    if inC[j,i]: c=np.array([.4,.13,.13])
    else: c=cols[near[j,i]]
    c=np.clip(c*1.35+.05,0,1); return '#%02x%02x%02x'%tuple(int(v*255) for v in c)
def bush(x,y,k='dust',r=26):
    def f(px,py):
        c=regcol(px,py); blobs=''.join(f'<circle cx="{px+random.uniform(-r*.55,r*.55):.0f}" cy="{py+random.uniform(-r*.35,r*.35):.0f}" r="{random.uniform(r*.42,r*.62):.0f}"/>' for _ in range(5))
        add(f'<g fill="{c}" fill-opacity=".9" stroke="#0a0c10" stroke-width="2.5">{blobs}</g><g fill="none" stroke="#c9ffb0" stroke-opacity=".35" stroke-width="1.2" stroke-dasharray="2 4"><ellipse cx="{px}" cy="{py}" rx="{r*1.05:.0f}" ry="{r*.75:.0f}"/></g>')
    at(x,y,f)
def deco(x,y,kind):
    if kind=='ice': at(x,y,lambda px,py:add(f'<polygon points="{px},{py-12} {px+6},{py} {px},{py+8} {px-6},{py}" fill="#cfefff" opacity=".85"/>'))
    if kind=='crys': at(x,y,lambda px,py:add(f'<polygon points="{px},{py-15} {px+7},{py} {px},{py+10} {px-7},{py}" fill="#7cc4f0" stroke="#d8f1ff" stroke-width="1"/>'))
    if kind=='lava': at(x,y,lambda px,py:add(f'<path d="M{px-30},{py+6} Q{px-10},{py-10} {px+5},{py+4} T{px+32},{py-4}" stroke="#ff6a20" stroke-width="4" fill="none" filter="url(#glow)"/>'))
    if kind=='hull': at(x,y,lambda px,py:add(f'<g transform="translate({px},{py}) rotate({random.randint(0,180)})"><path d="M-30,0 L-10,-7 L30,-2 L30,2 L-10,7 Z" fill="#262426" stroke="#ff7a3a" stroke-width="1.5"/></g>'))
    if kind=='storm': at(x,y,lambda px,py:add(f'<path d="M{px-5},{py-13} L{px+4},{py-2} L{px-3},{py} L{px+6},{py+13}" fill="none" stroke="#cfe6ff" stroke-width="3" filter="url(#glow)"/>'))
    if kind=='meteor': at(x,y,lambda px,py:add(f'<circle cx="{px}" cy="{py}" r="9" fill="#2a1d16" stroke="#ff9a50" stroke-width="2"/><path d="M{px-7},{py-7} L{px-22},{py-22}" stroke="#ffb070" stroke-width="2" opacity=".7"/>'))
    if kind=='fog': at(x,y,lambda px,py:add(f'<ellipse cx="{px}" cy="{py}" rx="36" ry="22" fill="#4fd0c8" opacity=".28" filter="url(#soft)"/>'))
    if kind=='bh': at(x,y,lambda px,py:add(f'<circle cx="{px}" cy="{py}" r="40" fill="#ff9a40" opacity=".35" filter="url(#soft)"/><circle cx="{px}" cy="{py}" r="15" fill="#000" stroke="#ffc27a" stroke-width="3"/>'))
    if kind=='rockpile': at(x,y,lambda px,py:[add(f'<circle cx="{px+random.uniform(-14,14):.0f}" cy="{py+random.uniform(-10,10):.0f}" r="{random.uniform(6,11):.0f}" fill="#5c6068" stroke="#2b2d33" stroke-width="1.5"/>') for _ in range(4)])
# 시작
for p in [(150,140),(150,860),(700,110)]: spawn(*p)
# 먼지 들판: 약한 몬스터 많이
for p in [(240,200),(110,260),(250,300),(240,800),(110,740),(250,700),(600,160),(780,120),(720,200),(330,200),(340,800)]: mobs(*p)
# 떠도는 바위숲
for p in [(200,450),(260,560),(330,470),(190,560),(300,430),(220,520)]: deco(*p,'rockpile')
for p in [(240,470),(280,540)]: camp(*p)
# 유성 낙하지
for p in [(470,110),(540,170),(450,190),(520,90)]: deco(*p,'meteor')
camp(500,140); chest(560,110)
# 안개 늪
for p in [(440,860),(520,900),(470,930),(560,850)]: deco(*p,'fog')
camp(480,880,'#7fe6dd'); camp(540,920,'#7fe6dd'); cave(420,930)
# 얼음 성운 지대
for p in [(380,270),(470,330),(400,360),(470,260),(360,320)]: deco(*p,'ice')
camp(370,350,'#bfeaff'); camp(480,290,'#bfeaff'); boss(430,305,1)
# 용암 균열대
for p in [(350,660),(420,720),(380,760),(330,720)]: deco(*p,'lava')
camp(330,650,'#ff9a5a'); camp(450,660,'#ff9a5a'); boss(395,700,2)
# 블랙홀 협곡
deco(480,500,'bh')
# 결정 협곡
for p in [(620,320),(700,330),(640,410),(720,390),(600,370),(690,290)]: deco(*p,'crys')
camp(610,400,'#9fd6ff'); boss(665,360,3); cave(720,300)
# 함선 묘지
for p in [(590,660),(680,680),(610,760),(700,750),(560,720)]: deco(*p,'hull')
camp(580,690,'#ffb08a'); camp(700,700,'#ffb08a'); boss(640,715,4)
# 폭풍 고원
for p in [(840,190),(920,240),(870,170),(940,200)]: deco(*p,'storm')
camp(830,250,'#c8d8ff'); boss(885,220,5)
# 수풀: 길목 · 정글 입구 · 보스 둘레 · 가운데 가는 길 (들어가면 바깥에서 안 보임)
random.seed(11)
for p,k in [((205,385),'rock'),((345,560),'rock'),((180,640),'fog'),((365,420),'ice'),((455,420),'rock'),((520,330),'crys'),((395,220),'meteor'),((610,270),'crys'),((735,250),'storm'),((760,380),'center'),
            ((560,560),'center'),((470,610),'lava'),((520,690),'hull'),((700,560),'center'),((790,470),'center'),((760,640),'hull'),((430,790),'fog'),((610,890),'fog'),((650,180),'storm'),((850,360),'center'),
            ((300,330),'dust'),((300,670),'dust'),((420,140),'meteor'),((560,960),'fog'),((250,420),'rock'),((840,600),'center')]: bush(*p,k)
# 와드 (등대 대신): 10초 지키면 내 것 · 둘레 시야 · 5초 순간이동
# 색깔 지역마다 와드 하나 → 차지하면 그 지역의 모든 수풀·안개가 보임
for p in [(215,245),(190,780),(690,185),(300,500),(400,128),(560,830),(365,250),(200,690),(525,545),(690,440),(700,640),(830,330)]: ward(*p)
# 웜홀, 보물
wh(70,500,'A'); wh(620,60,'B'); wh(300,940,'C')
chest(60,560); chest(760,600); chest(330,600)
# 가운데: 무너진 중심부
add(f'<path d="{smooth([(780,500),(840,440),(900,500),(960,560),(1020,500),(960,440),(900,500),(840,560),(780,500)])}" fill="none" stroke="#ff5a3a" stroke-width="3" stroke-dasharray="10 8"/>')
add('<circle cx="960" cy="440" r="24" fill="#ff3a2a" filter="url(#glow)"/>')
for p in [(820,460),(980,540),(880,420),(920,580)]: add(f'<circle cx="{p[0]}" cy="{p[1]}" r="10" fill="#5c5052" stroke="#2b2d33" stroke-width="2"/>')
# 지역 이름 + 레벨
lvcol={'Lv 1–3':'#b9ff4a','Lv 3–5':'#e3ef7a','Lv 5–7':'#ffd27a','Lv 6–8':'#ffb36a','Lv 8–10':'#ff8a6a'}
for x,y,n,l,c,b in seeds:
    oy=-34 if b else -28
    if n in ('먼지 들판','고철 언덕'): oy=46 if y<500 else -42
    T(x,y+oy,n,16,'#f2f4f8',600); T(x,y+oy+17,l,12,lvcol[l],600)
T(CX,CY-6,'무너진 중심부',20,'#ffd6cc',700); T(CX,CY+14,'Lv 10+ · 기체끼리 싸움 · 필드 보스',13,'#ffb4a4',600)
T(60,70,'맵 뼈대 5안 · 오픈월드 · 수풀과 와드',22,'#b9ff4a',700,'start')
# 범례
X=W+22; Y=50
items=[('spawn','시작 기지 (먼지 들판)'),('mob','약한 몬스터 무리'),('camp','지역 몬스터 캠프 (지역 색)'),('boss','중간 보스 (지역의 주인)'),('ward','와드 (색깔 지역마다 하나)'),('bush','수풀 (지역 색 · 들어가면 안 보임)'),('cave','숨은 동굴 (짧은 던전)'),('chest','보물'),('wh','웜홀 (같은 글자끼리)'),('road','큰길'),('fog','안개 뒷길'),('ridge','지역 경계 = 바위 능선 (길로만 넘음)')]
for i,(k,n) in enumerate(items):
    y=Y+i*31; x=X+16
    if k=='spawn': add(f'<circle cx="{x}" cy="{y}" r="11" fill="#163a28" stroke="#b9ff4a" stroke-width="2.5"/>')
    if k=='mob': [add(f'<circle cx="{x-8+j*8}" cy="{y}" r="4" fill="#86d96f"/>') for j in range(3)]
    if k=='camp': add(f'<circle cx="{x}" cy="{y}" r="9" fill="#e9bd4c" stroke="#fff3c4" stroke-width="2"/>')
    if k=='boss': add(f'<circle cx="{x}" cy="{y}" r="11" fill="#7a1f3a" stroke="#ff6f9a" stroke-width="2.5"/>')
    if k=='ward': add(f'<polygon points="{x},{y-12} {x+8},{y} {x},{y+12} {x-8},{y}" fill="#0d2a33" stroke="#9ff0ff" stroke-width="2"/>')
    if k=='bush': add(f'<g fill="#4d6b3a" stroke="#0a0c10" stroke-width="2"><circle cx="{x-6}" cy="{y}" r="8"/><circle cx="{x+5}" cy="{y-2}" r="9"/><circle cx="{x+2}" cy="{y+4}" r="7"/></g>')
    if k=='cave': add(f'<path d="M{x-11},{y+7} Q{x},{y-16} {x+11},{y+7} Z" fill="#000" stroke="#c9a0ff" stroke-width="2"/>')
    if k=='chest': add(f'<rect x="{x-9}" y="{y-7}" width="18" height="13" rx="3" fill="#ffd34a"/>')
    if k=='tower': add(f'<polygon points="{x},{y-11} {x+10},{y+7} {x-10},{y+7}" fill="#b9ff4a"/>')
    if k=='wh': add(f'<circle cx="{x}" cy="{y}" r="10" fill="#2a1a4a" stroke="#c48bff" stroke-width="3"/>')
    if k=='road': add(f'<line x1="{x-16}" y1="{y}" x2="{x+18}" y2="{y}" stroke="#d8c58e" stroke-width="5" stroke-linecap="round"/>')
    if k=='fog': add(f'<line x1="{x-16}" y1="{y}" x2="{x+18}" y2="{y}" stroke="#5fe0d8" stroke-width="4" stroke-dasharray="2 7" stroke-linecap="round"/>')
    if k=='ridge': add(f'<rect x="{x-16}" y="{y-5}" width="34" height="10" rx="5" fill="#5c5f66"/>')
    T(X+46,y+5,n,14,'#d3d9ea',400,'start')
y0=Y+len(items)*31+16
T(X,y0,'성장 흐름',15,'#b9ff4a',700,'start')
for i,s in enumerate(['① 먼지 들판에서 시작 (Lv 1–3)','② 이웃 지역 사냥 · 와드 차지해 길 넓힘','③ 지역의 주인(중간 보스) 잡고 스킬','④ 숨은 동굴·보물·웜홀로 더 강하게','⑤ 무너진 중심부에서 기체끼리 결판']):
    T(X,y0+26+i*24,s,13,'#d8e6c8',400,'start')
y1=y0+26+5*24+22
T(X,y1,'중간 보스 (반대편에 같은 것 = 열)',14,'#ff9ab8',600,'start')
for i,s in enumerate(['1 얼음 성운 · 얼려서 느리게','2 용암 균열 · 불붙는 탄','3 결정 협곡 · 반사하는 보스','4 함선 묘지 · 포탑 보스','5 폭풍 고원 · 순간이동 보스']):
    T(X,y1+22+i*21,s,13,'#e6c9d2',400,'start')
y2=y1+22+5*21+18
T(X,y2,'와드 규칙',14,'#9ff0ff',600,'start')
for i,s2 in enumerate(['· 원 안에서 10초 버티면 내 와드 (밖에 나가면 끊김)','· 원 안에 적과 같이 있으면 차지 멈춤','· 차지하면 그 색깔 지역의 모든 수풀·안개가 보임','· 내 와드로 순간이동 5초 (맞으면 끊김)','· 적이 차지하기 시작하면 알림 → 5초 만에 지키러 감','· 와드 24개 (색깔 지역마다 하나, 가운데는 없음)']):
    T(X,y2+20+i*19,s2,12,'#cfeef4',400,'start')
add('</svg>'); open('sk5.svg','w').write('\n'.join(S))
print('ok')
