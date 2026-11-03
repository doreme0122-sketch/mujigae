# 맵 6안 → 게임용 지역 지도 그림 (500x500): R = 지역 번호×12, G = 바위 능선 세기, B = 큰길(1) · 샛길(.5) · 보스 옆 샛길(.5)
# 지역 번호: 0 앞마당 · 1–5 정글 · 6–10 중간 보스 · 11–15 보물 땅 · 16 무너진 중심부 · 17 소행성 잔해(모서리, 못 지나감)
import json, numpy as np
from PIL import Image, ImageDraw, ImageFilter
src=open('map_skeleton_v6c.py').read()
exec(src[:src.index('img=Image.fromarray')])
kind_id={'yard':lambda k:0,'jun':lambda k:1+k%5,'boss':lambda k:6+k%5,'tre':lambda k:11+k%5}
idmap=np.array([kind_id[s[5]](s[6]) for s in seeds],np.uint8)
ids=np.where(L<40,idmap[np.minimum(L,39)],np.where(L==40,16,17)).astype(np.uint8)   # 조각 정리된 땅
rd=Image.new('L',(w,h),0); d=ImageDraw.Draw(rd)
for P in RADIAL+RING: d.line([(x/sc,y/sc) for x,y in P],fill=255,width=6,joint='curve')
sp=Image.new('L',(w,h),0); d2=ImageDraw.Draw(sp)
for P in SIDE+TDOOR+AGGRO+SNEAK: d2.line([(x/sc,y/sc) for x,y in P],fill=255,width=3,joint='curve')
rd=np.asarray(rd.filter(ImageFilter.GaussianBlur(1.3))).astype(np.float32)/255
sp=np.asarray(sp.filter(ImageFilter.GaussianBlur(1.))).astype(np.float32)/255
B=np.maximum(rd, sp*.5)
G=np.where(wall&(ids<17),1.,0.)                 # 막힘 = 1, 지나감 = 0 (중간값 없음 → 화면과 게임이 똑같이 판정)
img=np.stack([ids*12,(G*255).astype(np.uint8),(B*255).astype(np.uint8)],-1).astype(np.uint8)
Image.fromarray(img,'RGB').save('../assets/map/v6.png')
lab=[dict(x=round(s[0],1),y=round(s[1],1),n=s[2],l=s[3],k=s[5]) for s in seeds if s[5]!='yard']
spawns=[[round(c,1) for c in pol(440,a)] for a in ANG]   # 태어나는 곳: 맨 바깥쪽(벽에서 10m 띄움, 열 곳 모두 가운데서 같은 거리)
NAMES=[YARD[0]]+[j[0] for j in JUN]+[b[0] for b in BOSS]+[t[0] for t in TRE]+['무너진 중심부','소행성 잔해']
json.dump(dict(W=W,H=H,labels=lab,spawns=spawns,gates=GATES,names=NAMES),open('../assets/map/v6.json','w'),ensure_ascii=False)
print(img.shape,np.bincount(ids.ravel()))
