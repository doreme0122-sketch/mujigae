# 맵 뼈대 6안(고침) — 10명 개인전 · 정사각형. 보물 땅 10곳(이웃 두 기지 사이 바깥) · 경계는 덩어리 능선 + 샛길 · 보스 지역만 막고 입구 둘 · 모서리는 소행성 잔해(못 지나감)
import math, random, base64, io
import numpy as np
from PIL import Image, ImageFilter
random.seed(6); np.random.seed(6)
W=H=1000; CX=CY=500; LW=430
def pol(r,a): return (CX+r*math.cos(a), CY+r*math.sin(a))
A0=-math.pi/2; ANG=[A0+k*2*math.pi/10 for k in range(10)]; MID=[a+math.pi/10 for a in ANG]
YARD=('먼지 들판','Lv 1–3',(.22,.42,.25))
JUN=[('떠도는 바위숲',(.27,.3,.34)),('유성 낙하지',(.4,.27,.2)),('안개 늪',(.13,.36,.38)),('블랙홀 협곡',(.45,.3,.16)),('고철 언덕',(.36,.33,.26))]
BOSS=[('얼음 성운',(.32,.5,.62),'얼려서 느리게'),('용암 균열',(.55,.22,.1),'불붙는 탄'),('결정 협곡',(.25,.45,.7),'반사하는 보스'),('함선 묘지',(.35,.24,.24),'포탑 보스'),('폭풍 고원',(.25,.3,.55),'순간이동 보스')]
TRE=[('보물 동굴',(.5,.42,.15)),('웜홀 정원',(.35,.2,.5)),('고대 금고',(.45,.38,.2)),('별빛 광산',(.22,.3,.45)),('숨은 동굴',(.3,.22,.4))]
seeds=[]   # x,y,이름,레벨,색,종류,번호
for k,a in enumerate(ANG): x,y=pol(410,a); seeds.append((x,y,YARD[0],YARD[1],YARD[2],'yard',k))
for k,a in enumerate(MID): x,y=pol(330,a); n,c=JUN[k%5]; seeds.append((x,y,n,'Lv 3–7',c,'jun',k))
for k,a in enumerate(ANG): x,y=pol(232,a); n,c,_=BOSS[k%5]; seeds.append((x,y,n,'Lv 8–10',c,'boss',k))
for k,a in enumerate(MID): x,y=pol(436,a); n,c=TRE[k%5]; seeds.append((x,y,n,'보물 땅',c,'tre',k))
def arcp(r,a0,a1,n=40): return [pol(r,a0+(a1-a0)*i/n) for i in range(n+1)]
RADIAL=[[pol(372,a),pol(300,a),pol(232,a),pol(168,a)] for a in ANG]
RING=[arcp(300,ANG[k]+.02,ANG[k]+2*math.pi/10-.02,12) for k in range(10)]
SIDE=[]                                                             # 샛길: 이웃 앞마당끼리 · 앞마당→보물 땅 · 보물 땅→정글 · 정글→보스 옆구리 없음(보스는 막힘)
for k in range(10):
    a=ANG[k]; m=MID[k]; a2=ANG[(k+1)%10]
    SIDE.append(arcp(405,a+.12,a2-.12,10))                          # 이웃 앞마당끼리 (보물 땅 앞을 지남)
    SIDE.append([pol(400,m),pol(430,m)])                            # 보물 땅 입구
    SIDE.append([pol(372,a+.16),pol(330,a+.3),pol(300,a+.36)])       # 앞마당 → 정글 (큰길 말고 굽은 샛길)
AGGRO=[[pol(300,a+.2),pol(268,a+.17),pol(232,a+.16),pol(196,a+.15),pol(165,a+.12)] for a in ANG]   # 보스 옆 샛길: 보스가 알아채는 범위 안을 지남
sc=2; w=h=W//sc
yy,xx=np.mgrid[0:h,0:w].astype(np.float32)*sc
def noise(s,f):
    rng=np.random.RandomState(s); g=rng.rand(int(h*f)+2,int(w*f)+2).astype(np.float32)
    im=Image.fromarray((g*255).astype(np.uint8)).resize((w,h),Image.BICUBIC); return np.asarray(im).astype(np.float32)/255
nx=(noise(1,.035)-.5)*60+(noise(2,.1)-.5)*20; ny=(noise(3,.035)-.5)*60+(noise(4,.1)-.5)*20
X=xx+nx; Y=yy+ny
D=np.stack([np.hypot(X-s[0],Y-s[1])*(1.2 if s[5]=='tre' else 1.) for s in seeds])
idx=np.argsort(D,0); d1=np.take_along_axis(D,idx[:1],0)[0]; d2=np.take_along_axis(D,idx[1:2],0)[0]; near=idx[0]
cen=np.hypot(X-CX,Y-CY)/165                                    # 무너진 중심부: 넓게
cols=np.array([s[4] for s in seeds],np.float32); col=cols[near]*.55
tex=noise(7,.25)*.5+noise(8,.6)*.5; col*=(.75+.5*tex)[...,None]
edge=np.clip(1-(d2-d1)/16,0,1); inC=cen<1
second=idx[1]; kinds=np.array([s[5] for s in seeds])
bossB=(kinds[near]=='boss')|(kinds[second]=='boss')
frag=(noise(21,.06)*.7+noise(22,.16)*.3)>.47                      # 능선 덩어리 (사이사이 틈)
frag2=(noise(25,.07)*.7+noise(26,.18)*.3)>.47                    # 보스 지역 바깥(정글·앞마당 쪽)만 반쯤 두른 벽
kn=kinds[near]; k2=kinds[second]
bossOut=((kn=='boss')&(k2!='boss'))|((k2=='boss')&(kn!='boss'))    # 보스 ↔ 보스 아닌 곳
bossSide=(kn=='boss')&(k2=='boss')                                  # 보스 구역끼리 옆쪽 → 다른 곳처럼 덩어리만
nearC=np.hypot(X-CX,Y-CY)<205                                       # 중심부 쪽 경계 → 활짝
fill=((noise(27,.05)*.7+noise(28,.14)*.3)>.2).astype(np.float32)     # 경계는 대부분(약 80%) 이어진 벽
wallK=fill.copy()
wallK=np.where(bossSide,frag.astype(np.float32),wallK)             # 보스 구역끼리 옆쪽은 덩어리만
wallK=np.where(nearC,0.,wallK)
edge=edge*wallK
from PIL import ImageDraw
op=Image.new('L',(w,h),0); od=ImageDraw.Draw(op)
def opn(pts,wd):
    od.line([(x/sc,y/sc) for x,y in pts],fill=255,width=wd,joint='curve')
OPEN=[]
col[inC]=np.array([.4,.13,.13])*(.75+.5*tex[inC])[...,None]
ring=np.clip(1-np.abs(cen-1)/.1,0,1)
for P in RADIAL+RING: opn(P,9)
for P in SIDE: opn(P,5)
for P in AGGRO: opn(P,5)
SNEAK=[]                                                            # 몰래 지나가는 좁은 틈 (지역마다 한두 개, 직접 놓음)
for k in range(10):
    a=ANG[k]; m=MID[k]
    SNEAK.append([pol(335,a-.24),pol(395,a-.2)])                    # 앞마당 ↔ 정글 (큰길 반대쪽)
    SNEAK.append([pol(392,m+.13),pol(440,m+.15)])                   # 앞마당 ↔ 보물 땅 (다른 쪽)
    SNEAK.append([pol(285,m-.02),pol(250,a+.42)])                   # 정글 ↔ 보스 구역 (샛길 말고 하나 더)
for P in SNEAK: opn(P,4)
openM=np.asarray(op.filter(ImageFilter.GaussianBlur(1.2))).astype(np.float32)/255
edge=edge*(1-np.clip(openM*1.8,0,1)); ring=ring*0                    # 중심부 둘레 벽 없음
rock=np.maximum(edge,ring)
debris=np.clip((np.hypot(X-CX,Y-CY)-478)/22,0,1)*(.6+.4*noise(23,.2))   # 모서리 = 소행성 잔해

rocktex=(noise(9,.35)>.42).astype(np.float32)*.6+.4
col=col*(1-rock[...,None]*.92)+np.array([.36,.37,.41])*rocktex[...,None]*rock[...,None]*.92
dc=np.array([.1,.09,.1])*(.5+noise(24,.5)[...,None]); col=col*(1-debris[...,None])+dc*debris[...,None]
border=(xx<24)|(xx>W-24)|(yy<24)|(yy>H-24); col[border]=np.array([.03,.035,.05])
img=Image.fromarray((np.clip(col,0,1)*255).astype(np.uint8)).resize((W,H),Image.BICUBIC).filter(ImageFilter.GaussianBlur(.8))
buf=io.BytesIO(); img.save(buf,'PNG'); b64=base64.b64encode(buf.getvalue()).decode()
S=[]; add=S.append
add(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W+LW}" height="{H}" viewBox="0 0 {W+LW} {H}"><defs><filter id="glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><filter id="soft"><feGaussianBlur stdDeviation="9"/></filter><filter id="sh"><feDropShadow dx="0" dy="1" stdDeviation="1.6" flood-color="#000" flood-opacity=".9"/></filter></defs>')
add(f'<rect width="{W+LW}" height="{H}" fill="#07090f"/><image x="0" y="0" width="{W}" height="{H}" href="data:image/png;base64,{b64}"/>')
def T(x,y,s,size=13,col='#e8ecf4',wt=500,anchor='middle'):
    add(f'<text x="{x:.0f}" y="{y:.0f}" fill="{col}" font-size="{size}" font-weight="{wt}" text-anchor="{anchor}" filter="url(#sh)" font-family="Noto Sans KR, sans-serif">{s}</text>')
def path(pts,stroke,wd,op=1,dash=None):
    d='M'+' L'.join(f'{x:.1f},{y:.1f}' for x,y in pts)
    add(f'<path d="{d}" fill="none" stroke="{stroke}" stroke-width="{wd}" stroke-linecap="round" stroke-linejoin="round" opacity="{op}"'+(f' stroke-dasharray="{dash}"' if dash else '')+'/>')
def road(pts): path(pts,'#1b1610',11,.55); path(pts,'#d8c58e',4.5,.85)
# 큰길 · 샛길
for P in RADIAL+RING: road(P)
for P in SIDE: path(P,'#5fe0d8',3.2,.9,'2 6')
for P in AGGRO: path(P,'#ff7a5a',3.2,.95,'2 6')
for P in SNEAK: path(P,'#d6b3ff',2.6,.9,'1 5')
random.seed(11)
def bushc(px,py):
    j=min(h-1,max(0,int(py/sc))); i=min(w-1,max(0,int(px/sc)))
    c=np.array([.4,.13,.13]) if inC[j,i] else cols[near[j,i]]
    c=np.clip(c*1.35+.05,0,1); return '#%02x%02x%02x'%tuple(int(v*255) for v in c)
def bush(px,py,r=20):
    c=bushc(px,py); bl=''.join(f'<circle cx="{px+random.uniform(-r*.55,r*.55):.0f}" cy="{py+random.uniform(-r*.35,r*.35):.0f}" r="{random.uniform(r*.42,r*.62):.0f}"/>' for _ in range(5))
    add(f'<g fill="{c}" stroke="#0a0c10" stroke-width="2.2">{bl}</g><ellipse cx="{px}" cy="{py}" rx="{r*1.05:.0f}" ry="{r*.75:.0f}" fill="none" stroke="#c9ffb0" stroke-opacity=".35" stroke-width="1.1" stroke-dasharray="2 4"/>')
def ward(px,py): add(f'<circle cx="{px:.0f}" cy="{py:.0f}" r="24" fill="#6fe0ff" fill-opacity=".07" stroke="#6fe0ff" stroke-width="1.3" stroke-dasharray="4 5"/><g filter="url(#glow)"><polygon points="{px:.0f},{py-12:.0f} {px+7:.0f},{py:.0f} {px:.0f},{py+12:.0f} {px-7:.0f},{py:.0f}" fill="#0d2a33" stroke="#9ff0ff" stroke-width="2.2"/><circle cx="{px:.0f}" cy="{py:.0f}" r="3" fill="#d8fbff"/></g>')
def spawn(px,py,n): add(f'<circle cx="{px:.0f}" cy="{py:.0f}" r="20" fill="#163a28" stroke="#b9ff4a" stroke-width="3"/><circle cx="{px:.0f}" cy="{py:.0f}" r="7" fill="#b9ff4a" filter="url(#glow)"/><text x="{px:.0f}" y="{py+4:.0f}" fill="#163a28" font-size="9" font-weight="800" text-anchor="middle" font-family="Noto Sans KR">{n}</text>')
def mobs(px,py,c='#86d96f',n=3): [add(f'<circle cx="{px+random.uniform(-8,8):.0f}" cy="{py+random.uniform(-6,6):.0f}" r="3.5" fill="{c}"/>') for _ in range(n)]
def camp(px,py,c='#e9bd4c'): add(f'<circle cx="{px:.0f}" cy="{py:.0f}" r="8" fill="{c}" stroke="#fff3c4" stroke-width="1.8"/>')
def boss(px,py,n): add(f'<circle cx="{px:.0f}" cy="{py:.0f}" r="17" fill="#7a1f3a" stroke="#ff6f9a" stroke-width="3" filter="url(#glow)"/><text x="{px:.0f}" y="{py+5:.0f}" fill="#fff" font-size="14" font-weight="700" text-anchor="middle" font-family="Noto Sans KR">{n}</text>')
def cave(px,py): add(f'<path d="M{px-12:.0f},{py+8:.0f} Q{px:.0f},{py-18:.0f} {px+12:.0f},{py+8:.0f} Z" fill="#000" stroke="#c9a0ff" stroke-width="2.3" filter="url(#glow)"/>')
def chest(px,py): add(f'<rect x="{px-8:.0f}" y="{py-6:.0f}" width="16" height="12" rx="3" fill="#ffd34a" stroke="#fff3b0" stroke-width="1.8"/>')
def wh(px,py,n): add(f'<circle cx="{px:.0f}" cy="{py:.0f}" r="14" fill="#2a1a4a" stroke="#c48bff" stroke-width="3.5"/><text x="{px:.0f}" y="{py+5:.0f}" fill="#ecd6ff" font-size="13" font-weight="700" text-anchor="middle" font-family="Noto Sans KR">{n}</text>')
# 수풀 (길목 · 정글 입구 · 보스 둘레 · 중심부 가는 길)
for k in range(10):
    a=ANG[k]; m=MID[k]
    for r,da in [(300,.19),(300,-.19),(268,.25),(200,-.2)]: bush(*pol(r,a+da))
    for r,da in [(345,.0),(300,.0),(250,.05)]: bush(*pol(r,m+da))
for k in range(12): bush(*pol(85+55*(k%2),k*math.pi/6+.2),17)
for m in MID: bush(*pol(448,m+.08),15); bush(*pol(425,m-.07),14)
# 몬스터 · 보스 · 장치
for k,a in enumerate(ANG):
    for r,da in [(430,.1),(430,-.1),(395,.17),(395,-.17)]: mobs(*pol(r,a+da))
    x,y=pol(232,a); add(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="52" fill="#ff5a5a" fill-opacity=".06" stroke="#ff7a5a" stroke-width="1.4" stroke-dasharray="5 5"/>'); boss(x,y,k%5+1)
    camp(*pol(255,a-.13),'#ff9ab8'); camp(*pol(215,a-.15),'#ff9ab8')
for k,m in enumerate(MID):
    camp(*pol(330,m+.06)); camp(*pol(355,m-.05)); mobs(*pol(310,m-.08),'#c6e06f')
for k,m in enumerate(MID):
    chest(*pol(445,m-.02)); cave(*pol(452,m+.045)) if k%5 in (0,4) else None
    x,y=pol(455,m-.075); wh(x,y,'ABCDE'[k%5])
# 와드: 색깔 지역마다 하나 (가운데 없음)
for s in seeds:
    x,y=s[0],s[1]
    if s[5]=='yard': continue                                       # 앞마당은 와드 없음 (제안)
    elif s[5]=='jun': x,y=pol(325,MID[s[6]]-.13)
    elif s[5]=='boss': x,y=pol(262,ANG[s[6]]-.2)
    else: x,y=pol(418,MID[s[6]]+.1)
    ward(x,y)
# 기지 10곳
for k,a in enumerate(ANG): spawn(*pol(372,a),k+1)
# 가운데: 벽 없는 넓은 벌판 · 무너진 잔해 기둥 · 수풀 · 필드 보스가 크게 돌아다님
random.seed(31)
for i in range(22):
    r=random.uniform(40,150); t=random.uniform(0,6.283); x,y=pol(r,t); rr=random.uniform(6,12)
    add(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{rr:.0f}" fill="#4a4448" stroke="#1a1618" stroke-width="2"/>')
add(f'<path d="{"M"+" L".join(f"{CX+95*math.cos(t)*(1+.15*math.sin(3*t)):.0f},{CY+95*math.sin(t)*(1+.15*math.sin(3*t)):.0f}" for t in [i*6.283/60 for i in range(61)])}" fill="none" stroke="#ff5a3a" stroke-width="2.5" stroke-dasharray="8 7" opacity=".9"/>')
add(f'<circle cx="{CX+60}" cy="{CY-70}" r="20" fill="#ff3a2a" filter="url(#glow)"/>')
# 이름표
for x,y,n,l,c,kind,k in seeds:
    if kind=='yard': continue
    lv={'Lv 3–7':'#ffd27a','Lv 8–10':'#ff8a6a','보물 땅':'#ffe08a'}[l]
    oy=-20 if kind!='boss' else -26
    if kind=='tre': oy=-22
    T(x,y+oy,n,12,'#f2f4f8',600); T(x,y+oy+13,l,10,lv,600)
T(CX,CY-4,'무너진 중심부 (넓게 열림)',15,'#ffd6cc',700); T(CX,CY+13,'Lv 10+ · 필드 보스가 크게 돌아다님',11,'#ffb4a4',600)
T(W+24,40,'맵 뼈대 6안 (다시) · 10명 개인전 · 정사각형',19,'#b9ff4a',700,'start')
# 범례
X=W+24; Y=78
items=[('spawn','시작 기지 10곳 (가운데에서 같은 거리)'),('mob','앞마당 약한 몬스터 (먼지 들판 Lv1–3)'),('camp','정글 몬스터 캠프 (Lv3–7)'),('boss','중간 보스 10곳 (5종류 × 2, 마주 보는 곳 같음)'),('ward','와드 (앞마당 빼고 색깔 지역마다 하나 · 30개)'),('bush','수풀 (지역 색 · 들어가면 안 보임)'),('cave','숨은 동굴'),('chest','보물'),('wh','웜홀 (마주 보는 보물 땅끼리, 같은 글자)'),('road','큰길 (기지 → 중심부 · 정글 고리 길)'),('fog','샛길 (좁고 굽음 · 몰래 넘어감)'),('aggro','보스 옆 샛길 (보스 공격을 피하거나 반사하며 지남)'),('sneak','몰래 지나가는 좁은 틈'),('ridge','바위 능선 = 벽 (대부분 막힘 · 이동기로 넘음)')]
for i,(k,n) in enumerate(items):
    y=Y+i*27; x=X+14
    if k=='spawn': add(f'<circle cx="{x}" cy="{y}" r="10" fill="#163a28" stroke="#b9ff4a" stroke-width="2.5"/>')
    if k=='mob': [add(f'<circle cx="{x-8+j*8}" cy="{y}" r="3.5" fill="#86d96f"/>') for j in range(3)]
    if k=='camp': add(f'<circle cx="{x}" cy="{y}" r="8" fill="#e9bd4c" stroke="#fff3c4" stroke-width="1.8"/>')
    if k=='boss': add(f'<circle cx="{x}" cy="{y}" r="10" fill="#7a1f3a" stroke="#ff6f9a" stroke-width="2.5"/>')
    if k=='ward': add(f'<polygon points="{x},{y-11} {x+7},{y} {x},{y+11} {x-7},{y}" fill="#0d2a33" stroke="#9ff0ff" stroke-width="2"/>')
    if k=='bush': add(f'<g fill="#4d6b3a" stroke="#0a0c10" stroke-width="2"><circle cx="{x-6}" cy="{y}" r="7"/><circle cx="{x+5}" cy="{y-2}" r="8"/></g>')
    if k=='cave': add(f'<path d="M{x-10},{y+7} Q{x},{y-15} {x+10},{y+7} Z" fill="#000" stroke="#c9a0ff" stroke-width="2"/>')
    if k=='chest': add(f'<rect x="{x-8}" y="{y-6}" width="16" height="12" rx="3" fill="#ffd34a"/>')
    if k=='wh': add(f'<circle cx="{x}" cy="{y}" r="9" fill="#2a1a4a" stroke="#c48bff" stroke-width="3"/>')
    if k=='road': add(f'<line x1="{x-14}" y1="{y}" x2="{x+16}" y2="{y}" stroke="#d8c58e" stroke-width="4.5" stroke-linecap="round"/>')
    if k=='fog': add(f'<line x1="{x-14}" y1="{y}" x2="{x+16}" y2="{y}" stroke="#5fe0d8" stroke-width="4" stroke-dasharray="2 7" stroke-linecap="round"/>')
    if k=='aggro': add(f'<line x1="{x-14}" y1="{y}" x2="{x+16}" y2="{y}" stroke="#ff7a5a" stroke-width="3.5" stroke-dasharray="2 6" stroke-linecap="round"/>')
    if k=='sneak': add(f'<line x1="{x-14}" y1="{y}" x2="{x+16}" y2="{y}" stroke="#d6b3ff" stroke-width="3" stroke-dasharray="1 5" stroke-linecap="round"/>')
    if k=='ridge': add(f'<rect x="{x-14}" y="{y-5}" width="30" height="10" rx="5" fill="#5c5f66"/>')
    T(X+42,y+5,n,13,'#d3d9ea',400,'start')
y0=Y+len(items)*27+12
T(X,y0,'고리 구조 (바깥 → 안)',14,'#b9ff4a',700,'start')
for i,s in enumerate(['① 기지 앞마당 · 먼지 들판 Lv1–3 (기지마다 하나)','② 이웃 두 기지 사이 정글 Lv3–7 (이웃과 처음 부딪힘)','③ 중간 보스 10곳 Lv8–10 · 벽 반쯤 · 입구 서너 개','④ 무너진 중심부 Lv10+ · 벽 없이 넓게 · 잔해·수풀 사이 결판','⑤ 보물 땅 10곳 · 이웃 두 기지 사이 바깥 (양옆에 하나씩)']):
    T(X,y0+22+i*21,s,12,'#d8e6c8',400,'start')
y1=y0+22+5*21+16
T(X,y1,'정글 5종류 × 2 / 중간 보스 5종류 × 2',13,'#ffd27a',600,'start')
T(X,y1+20,'정글: 바위숲 · 유성 낙하지 · 안개 늪 · 블랙홀 협곡 · 고철 언덕',11,'#e6dcc0',400,'start'); T(X,y1+36,'보물 땅: 보물 동굴 · 웜홀 정원 · 고대 금고 · 별빛 광산 · 숨은 동굴',11,'#ffe08a',400,'start')
for i,(n,c,d) in enumerate(BOSS): T(X,y1+56+i*19,f'{i+1} {n} · {d}',12,'#e6c9d2',400,'start')
y2=y1+56+5*19+14
T(X,y2,'이동 · 와드 규칙',13,'#9ff0ff',600,'start')
for i,s2 in enumerate(['· 이동기·순간이동은 얇은 능선을 건너뜀 (모서리 잔해는 못 넘음)','· 원 안에서 10초 버티면 내 것 (밖에 나가면 끊김, 적과 같이 있으면 멈춤)','· 차지하면 그 색깔 지역의 모든 수풀·안개가 보임','· 내 와드로 순간이동 5초 (맞으면 끊김)','· 적이 차지하기 시작하면 알림']):
    T(X,y2+19+i*18,s2,11,'#cfeef4',400,'start')
add('</svg>'); open('sk6c.svg','w').write('\n'.join(S)); print('ok')
