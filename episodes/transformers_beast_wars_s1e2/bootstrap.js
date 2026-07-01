import { registerAll } from 'dula-assets';
import { registerCharacter, registerScene } from 'dula-engine';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import { DaHou } from './characters/DaHou.js';
import { BaoBao } from './characters/BaoBao.js';
import { LongZong } from './characters/LongZong.js';
import { ChengZhua } from './characters/ChengZhua.js';
import { XiaoWeng } from './characters/XiaoWeng.js';

import { SpaceChaseScene } from './scenes/SpaceChaseScene.js';
import { PrehistoricJungleScene } from './scenes/PrehistoricJungleScene.js';
import { VolcanoBaseScene } from './scenes/VolcanoBaseScene.js';

registerAll();

registerCharacter('DaHou', DaHou);
registerCharacter('BaoBao', BaoBao);
registerCharacter('LongZong', LongZong);
registerCharacter('ChengZhua', ChengZhua);
registerCharacter('XiaoWeng', XiaoWeng);

// ─────────────────────────────────────────────────────────────────────────────
// 预加载 CC0 GLB 资产（Kenney Space/Nature Kit）
// ─────────────────────────────────────────────────────────────────────────────

const ASSET_BASE = '/episode/assets/models';

const SHIP_MODELS = [
  `${ASSET_BASE}/maximal_ship.gltf`,
  `${ASSET_BASE}/predacon_ship.gltf`,
];

const SCENERY_MODELS = [
  `${ASSET_BASE}/crater_large.glb`,
  `${ASSET_BASE}/meteor_half.glb`,
  `${ASSET_BASE}/ground_grass.glb`,
  `${ASSET_BASE}/tree_default.glb`,
  `${ASSET_BASE}/tree_cone.glb`,
  `${ASSET_BASE}/tree_blocks.glb`,
  `${ASSET_BASE}/rock_largeA.glb`,
  `${ASSET_BASE}/rock_largeB.glb`,
  `${ASSET_BASE}/rock_smallA.glb`,
  `${ASSET_BASE}/rock_tallA.glb`,
];

function cloneModel(name) {
  const source = window.__transformerAssets?.[name];
  if (!source) {
    console.warn(`[bootstrap] Asset not preloaded: ${name}`);
    return new THREE.Group();
  }
  return source.clone();
}

async function preloadAssets() {
  const loader = new GLTFLoader();
  const allUrls = [...SHIP_MODELS, ...SCENERY_MODELS];
  const names = allUrls.map((url) => url.split('/').pop().replace(/\.glb$/, '').replace(/\.gltf$/, ''));

  const results = await Promise.all(
    allUrls.map((url) => loader.loadAsync(url).catch((err) => {
      console.error(`[bootstrap] Failed to load ${url}:`, err);
      return null;
    }))
  );

  window.__transformerAssets = {};
  for (let i = 0; i < names.length; i++) {
    if (results[i]) {
      window.__transformerAssets[names[i]] = results[i].scene;
    }
  }
}

await preloadAssets();

export function getAsset(name) {
  return window.__transformerAssets?.[name];
}

export function cloneAsset(name) {
  return cloneModel(name);
}

registerScene('SpaceChaseScene', SpaceChaseScene);
registerScene('PrehistoricJungleScene', PrehistoricJungleScene);
registerScene('VolcanoBaseScene', VolcanoBaseScene);
