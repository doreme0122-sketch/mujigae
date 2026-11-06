/* 크로나크 — 2스테이지 보스 (사용자 모델 + 사용자 효과 코드)
   · 모양·효과는 받은 그대로. 바꾼 건 '그리는 횟수'뿐 (사용자 2026-11-03: 단순화해서 최소한으로)
   · 왜 줄이나: 효과 코드가 장갑 조각마다 재질을 따로 만들어, 보스 하나에 한 장면 약 500번 그림 → 휴대폰에서 프레임이 무너짐
   · 어떻게: ① 움직이는 조각(터빈·불꽃·충격파 등)은 그대로 둠 — 매 장면 따로 움직여야 하니까
             ② 가만히 있는 조각은 같은 재질끼리 한 덩어리로 합침 (보스 몸에 붙은 채 같이 움직이므로 겉모습 같음)
             ③ 무늬 크기가 조각마다 따로 맞춰져 있던 재질(장갑 타일)은 조각 크기만큼 나눠 같은 무늬 크기로 모아 합침
             ④ 숨겨 둔 조각(원본에서 효과로 대신한 부분)은 아예 뺌
             ⑤ 장갑 무늬 크기·흐르는 빛의 색·빠르기처럼 조각마다 다른 값은 점마다 새겨 넣어 한 재질로
             ⑥ 빛 알갱이는 전부 한 묶음: 원래 알갱이는 안 보이게 남겨 효과 코드가 계속 움직이게 하고, 매 장면 자리·색·밝기만 옮겨 그림
   · 결과: 한 장면에 그리는 횟수 약 495번 → 약 75번, 삼각형 수·겉모습은 그대로
   · 재질 효과(무늬·빛 새어 나옴·흐르는 에너지)는 모두 재질 쪽 계산이라 합쳐도 그대로 돎 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { enhanceChron } from './chronfx.js?v=11061503';
import { slim, countDraws } from './slim.js?v=11061503';

export async function makeChronarch(url = './assets/bosses/chronarch.glb', opt = {}) {
  const g = await new GLTFLoader().loadAsync(url), root = g.scene;
  const fx = enhanceChron(THREE, root, opt);
  const before = countDraws(root);
  slim(root, fx);
  const after = countDraws(root);
  return { root, fx, update: t => fx.update(t), stats: { before, after } };
}

