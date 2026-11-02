# 맵 6안 → 게임용 지역 지도 그림 (500x500): R = 지역 번호×12, G = 바위 능선 세기, B = 큰길(1) · 샛길(.5) · 보스 옆 샛길(.5)
# 지역 번호: 0 앞마당 · 1–5 정글 · 6–10 중간 보스 · 11–15 보물 땅 · 16 무너진 중심부 · 17 소행성 잔해(모서리, 못 지나감)
import json, numpy as np
from PIL import Image, ImageDraw, ImageFilter
src=open('map_skeleton_v6c.py').read()
exec(src[:src.index('img=Image.fromarray')])
kind_id={'yard':lambda k:0,'jun':lambda k:1+k%5,'boss':lambda k:6+k%5,'tre':lambda k:11+k%5}
idmap=np.array([kind_id[s[5]](s[6]) for s in seeds],np.uint8)
ids=idmap[near]; ids=np.where(inC,16,ids); ids=np.where(debris>.5,17,ids).astype(np.uint8)
rd=Image.new('L',(w,h),0); d=ImageDraw.Draw(rd)
for P in RADIAL+RING: d.line([(x/sc,y/sc) for x,y in P],fill=255,width=6,joint='curve')
sp=Image.new('L',(w,h),0); d2=ImageDraw.Draw(sp)
for P in SIDE+AGGRO+SNEAK: d2.line([(x/sc,y/sc) for x,y in P],fill=255,width=3,joint='curve')
rd=np.asarray(rd.filter(ImageFilter.GaussianBlur(1.3))).astype(np.float32)/255
sp=np.asarray(sp.filter(ImageFilter.GaussianBlur(1.))).astype(np.float32)/255
B=np.maximum(rd, sp*.5)
G=np.clip(rock*(ids<17),0,1)
img=np.stack([ids*12,(G*255).astype(np.uint8),(B*255).astype(np.uint8)],-1).astype(np.uint8)
Image.fromarray(img,'RGB').save('../assets/map/v6.png')
lab=[dict(x=round(s[0],1),y=round(s[1],1),n=s[2],l=s[3],k=s[5]) for s in seeds if s[5]!='yard']
spawns=[[round(c,1) for c in pol(372,a)] for a in ANG]
json.dump(dict(W=W,H=H,labels=lab,spawns=spawns),open('../assets/map/v6.json','w'),ensure_ascii=False)
print(img.shape,np.bincount(ids.ravel()))
