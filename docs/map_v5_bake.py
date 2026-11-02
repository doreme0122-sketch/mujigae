# 맵 5안 → 게임용 지역 지도 그림 (900x500): R = 지역 번호×20 (가운데 240), G = 지역 경계(바위 능선) 세기, B = 큰길
import re, numpy as np
from PIL import Image, ImageDraw, ImageFilter
src=open('map_skeleton_v5.py').read()
exec(src[:src.index('img=Image.fromarray')])
ids=np.where(inC, 12, near % 12).astype(np.uint8)                       # 0..11 지역 종류, 12 가운데
edgeM=np.clip(np.maximum(edge, ring),0,1)
road=Image.new('L',(w,h),0); d=ImageDraw.Draw(road)
ROADS=eval(re.search(r'ROADS=(\[.*?\])\nfor P in ROADS', src, re.S).group(1))
def bez(pts,n=24):
    out=[]
    for i in range(len(pts)-1):
        p0=pts[max(0,i-1)];p1=pts[i];p2=pts[i+1];p3=pts[min(len(pts)-1,i+2)]
        c1=(p1[0]+(p2[0]-p0[0])/6,p1[1]+(p2[1]-p0[1])/6); c2=(p2[0]-(p3[0]-p1[0])/6,p2[1]-(p3[1]-p1[1])/6)
        for k in range(n):
            t=k/n; a=(1-t)**3; b=3*(1-t)**2*t; c=3*(1-t)*t*t; e=t**3
            out.append((a*p1[0]+b*c1[0]+c*c2[0]+e*p2[0], a*p1[1]+b*c1[1]+c*c2[1]+e*p2[1]))
    out.append(pts[-1]); return out
for P in ROADS:
    for Q in [P,[rot(p) for p in P]]:
        pts=[(x/sc,y/sc) for x,y in bez(Q)]; d.line(pts,fill=255,width=7,joint='curve')
road=np.asarray(road.filter(ImageFilter.GaussianBlur(1.6))).astype(np.float32)/255
edgeM=edgeM*(1-np.clip(road*1.6,0,1))                                   # 큰길이 지나는 곳은 능선이 열림 (길로만 넘음)
img=np.stack([ids*20, (edgeM*255).astype(np.uint8), (road*255).astype(np.uint8)],-1).astype(np.uint8)
Image.fromarray(img,'RGB').save('../assets/map/v5.png')
print(img.shape, np.bincount(ids.ravel()))
