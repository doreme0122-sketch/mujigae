# 설계도 검사: 땅끼리 실제로 지나갈 수 있는 연결을 프로그램으로 셈
import numpy as np, math, sys
sys.path.insert(0,'.')
src=open('map_skeleton_v6c.py').read(); exec(src[:src.index('img=Image.fromarray')])
from scipy import ndimage as ndi
from PIL import Image
pas=~(wall|(L==41))
print('막힌 큰 주머니(300칸 이상):',SEALED_BIG)
# 땅 조각 수
bad=[v for v in np.unique(L[L<41]) if ndi.label(L==v)[1]!=1]; print('여러 조각인 땅:',bad)
# 연결: 이웃 땅 쌍마다, 두 땅의 지나갈 수 있는 칸끼리 맞닿은 곳 수(=문 개수)
def doors(a,b):                                                       # 두 땅의 지나갈 수 있는 칸이 직접 맞닿은 자리 → 가까운 것(30칸 안)은 한 문으로 묶어 셈
    A=pas&(L==a); Bm=pas&(L==b); st=np.array([[0,1,0],[1,1,1],[0,1,0]],bool)
    C=(A&ndi.binary_dilation(Bm,st))|(Bm&ndi.binary_dilation(A,st))
    lab,n=ndi.label(C); cs=[np.argwhere(lab==c).mean(0)*sc for c in range(1,n+1)]; g=[]
    for c in cs:
        if not any(np.hypot(*(c-q))<30 for q in g): g.append(c)
    return len(g)
name=lambda v: 'cen' if v==40 else f"{seeds[v][5]}{seeds[v][6]}"
print('보물 땅 문:')
okAll=True
for k in range(10):
    t=30+k; nbs=set(np.unique(L[ndi.binary_dilation(L==t,iterations=WALLW*2+2)]))-{t,41}
    res={name(o):doors(t,o) for o in nbs}; want={f'yard{k}',f'yard{(k+1)%10}',f'jun{k}'}
    got={n for n,c in res.items() if c>0}; ok=got==want and all(res[n]==1 for n in want); okAll&=ok
    print(f'  보물{k}:',res,'OK' if ok else '★확인')
print('보물 땅 모두 정상' if okAll else '보물 땅 문제 있음')
# 기지에서 물 붓기: 갈 수 있는 땅
plab,_=ndi.label(pas); SPs=[(int(pol(372,a)[1]/sc),int(pol(372,a)[0]/sc)) for a in ANG]
reach=np.isin(plab,[plab[y,x] for y,x in SPs]); print('갈 수 있는데 기지에서 못 닿는 칸:',int((pas&~reach&(L<41)).sum()))
img=np.zeros((h,w,3),np.uint8); img[...]=(cols[np.minimum(L,39)]*255*1.3).clip(0,255).astype(np.uint8); img[L==40]=[110,40,40]; img[L==41]=[15,15,18]
img[wall&(L<41)]=[235,235,235]; img[pas&~reach&(L<41)]=[255,0,255]
Image.fromarray(img).resize((1000,1000),Image.NEAREST).save(sys.argv[1])
