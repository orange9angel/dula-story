import * as THREE from 'three';
import { SceneBase } from 'dula-engine';

function toonMaterial(color, options = {}) {
  const { roughness, metalness, ...toonOptions } = options;
  if (roughness !== undefined || metalness !== undefined) {
    return new THREE.MeshStandardMaterial({
      color,
      roughness: roughness ?? 0.75,
      metalness: metalness ?? 0,
      ...toonOptions,
    });
  }
  return new THREE.MeshToonMaterial({ color, ...toonOptions });
}

function addBox(parent, name, size, position, material, options = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), material);
  mesh.name = name;
  mesh.position.copy(position);
  mesh.castShadow = options.castShadow ?? true;
  mesh.receiveShadow = options.receiveShadow ?? false;
  parent.add(mesh);
  return mesh;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function easeOutCubic(value) {
  const t = clamp01(value);
  return 1 - (1 - t) ** 3;
}

function easeInOutSine(value) {
  return -(Math.cos(Math.PI * clamp01(value)) - 1) / 2;
}

function characterByName(scene, name) {
  return scene.characters.find((character) => character?.name === name) || null;
}

/** A bright, readable midnight kitchen designed around a circular chase lane. */
export class CartoonKitchenScene extends SceneBase {
  constructor() {
    super('CartoonKitchenScene');
    this.toneContext = 'comedy';
    this.layout = {
      groundY: 0.02,
      bounds: { xMin: -7.5, xMax: 7.5, zMin: -5.4, zMax: 5.4 },
      anchors: {
        tomStart: new THREE.Vector3(-4.2, 0.02, 2.0),
        jerryStart: new THREE.Vector3(5.4, 0.02, -4.9),
        islandFrontLeft: new THREE.Vector3(-2.5, 0.02, 1.2),
        islandFrontRight: new THREE.Vector3(2.5, 0.02, 1.2),
        fridge: new THREE.Vector3(-5.4, 0.02, -3.2),
        sink: new THREE.Vector3(0.8, 0.02, -3.6),
        mouseHole: new THREE.Vector3(5.4, 0.02, -4.9),
        cheese: new THREE.Vector3(0.2, 1.52, -0.65),
      },
    };
    this.island = null;
    this.fridge = null;
    this.sink = null;
    this.mouseHole = null;
    this.cheese = null;
    this.cake = null;
    this.cloche = null;
    this.cakeSlices = [];
    this.utensilRack = null;
    this.utensils = [];
    this.cups = [];
    this.mixingBowl = null;
    this.kitchenTimer = null;
    this.dishStack = null;
    this.crumbs = [];
    this.cakeSplat = null;
    this.splatCrumbs = [];
    this._crashPieces = [];
    this._storyEvents = new Map();
    this._storyState = {
      jerryEntered: false,
      cherryTaken: false,
      cakeSplatted: false,
      crashed: false,
    };
    this._sceneTime = 0;

    this._cakeState = 'onStand';
    this._cakePath = {
      stand: new THREE.Vector3(0.12, 1.63, -0.65),
      pushed: new THREE.Vector3(0.1, 0.58, 0.75),
      bounced: new THREE.Vector3(-1.0, 0.58, 1.05),
      rolled: new THREE.Vector3(0.75, 0.58, 1.15),
    };
    this._cakeStartPos = this._cakePath.stand.clone();
  }

  build() {
    super.build();
    this.scene.background = new THREE.Color(0x243546);
    this.scene.fog = new THREE.Fog(0x243546, 13, 28);

    for (const light of this.lights) {
      if (light.isAmbientLight) {
        light.color.setHex(0xbcd4ee);
        light.intensity = 0.68;
      } else if (light.isDirectionalLight) {
        light.color.setHex(0xffd9ad);
        light.intensity = 1.15;
        light.position.set(4, 8, 5);
      }
    }

    const moonFill = new THREE.DirectionalLight(0x91b9ff, 0.75);
    moonFill.position.set(-6, 5, -2);
    moonFill.castShadow = true;
    this.scene.add(moonFill);
    this.lights.push(moonFill);

    const islandLight = new THREE.PointLight(0xffd89a, 2.4, 11, 1.6);
    islandLight.position.set(0, 4.3, 0.2);
    islandLight.castShadow = true;
    this.scene.add(islandLight);
    this.lights.push(islandLight);

    this._buildRoomShell();
    this._buildBackCounterAndSink();
    this._buildFridge();
    this._buildIslandAndCheese();
    this._buildStoryProps();
    this._buildMouseHole();
    this._buildKitchenDetails();
    this._registerObstacles();

    this.scene.userData.layoutName = 'midnight-kitchen-v1';
    return this.scene;
  }

  getAnchor(name) {
    const value = this.layout.anchors[name];
    return value ? value.clone() : null;
  }

  getSceneGeometry() {
    return {
      groundY: this.layout.groundY,
      bounds: { ...this.layout.bounds },
      anchors: Object.fromEntries(
        Object.entries(this.layout.anchors).map(([name, value]) => [name, value.clone()]),
      ),
    };
  }

  addCharacter(character) {
    super.addCharacter(character);
    if (character?.name === 'Jerry' && !this._storyState.jerryEntered) {
      character.mesh.visible = false;
    }
  }

  _beginStoryEvent(name, duration, data = {}) {
    const context = this._storyEventContext;
    const event = {
      start: Number.isFinite(context?.startTime) ? context.startTime : this._sceneTime,
      duration,
      data,
    };
    this._storyEvents.set(name, event);
    return event;
  }

  _storyProgress(name, time) {
    const event = this._storyEvents.get(name);
    if (!event || time < event.start) return null;
    return clamp01((time - event.start) / Math.max(0.001, event.duration));
  }

  _storyEventTime() {
    return Number.isFinite(this._storyEventContext?.currentTime)
      ? this._storyEventContext.currentTime
      : this._sceneTime;
  }

  _placeCherryOnCake() {
    if (!this.cherry || !this.cake) return;
    if (this.cherry.parent !== this.cake) this.cake.add(this.cherry);
    this.cherry.visible = true;
    this.cherry.position.set(0.02, 0.32, 0.02);
    this.cherry.rotation.set(0, 0, 0);
    this.cherry.scale.setScalar(1);
  }

  _placeCherryOnJerry() {
    const jerry = characterByName(this, 'Jerry');
    if (!this.cherry || !jerry?.rightWrist) return;
    if (this.cherry.parent !== jerry.rightWrist) {
      this.scene.updateMatrixWorld(true);
      jerry.rightWrist.attach(this.cherry);
    }
    this.cherry.visible = true;
    this.cherry.position.set(0, -0.075, 0.055);
    this.cherry.rotation.set(0, 0, -0.25);
    this.cherry.scale.setScalar(0.9);
  }

  _resetCakeSplat() {
    if (this.cakeSplat) {
      if (this.cakeSplat.parent !== this.scene) this.scene.add(this.cakeSplat);
      this.cakeSplat.visible = false;
      this.cakeSplat.position.set(0, 0, 0);
      this.cakeSplat.rotation.set(0, 0, 0);
      this.cakeSplat.scale.setScalar(0.05);
    }
    for (const crumb of this.splatCrumbs) {
      crumb.visible = false;
      crumb.position.set(0, 0, 0);
      crumb.rotation.set(0, 0, 0);
    }
  }

  revealCake() {
    this._beginStoryEvent('revealCake', 1.15);
  }

  jerryEntrance() {
    this._storyState.jerryEntered = true;
    const jerry = characterByName(this, 'Jerry');
    const start = jerry?.mesh?.position.clone() || this.layout.anchors.jerryStart.clone();
    const end = new THREE.Vector3(1.5, 0.02, 1.1);
    const event = this._beginStoryEvent('jerryEntrance', 0.9, {
      start,
      end,
      completed: false,
    });
    if (!jerry?.mesh) return;

    jerry.mesh.visible = true;
    if (this._storyEventTime() >= event.start + event.duration) {
      jerry.mesh.position.copy(end);
      jerry.mesh.scale.setScalar(1);
      event.data.completed = true;
    } else {
      jerry.mesh.scale.setScalar(0.65);
    }
  }

  cakePushJerry() {
    this._cakeState = 'pushed';
    if (this.cake) {
      this.cake.visible = true;
      this.cake.scale.setScalar(1);
    }
    this._beginStoryEvent('cakePushJerry', 1.35, {
      start: this._cakePath.stand.clone(),
      end: this._cakePath.pushed.clone(),
    });
  }

  cakeBounce() {
    this._cakeState = 'bouncing';
    this._beginStoryEvent('cakeBounce', 1.45, {
      start: this._cakePath.pushed.clone(),
      end: this._cakePath.bounced.clone(),
    });
  }

  cakeRoll() {
    this._cakeState = 'rolling';
    this._beginStoryEvent('cakeRoll', 1.55, {
      start: this._cakePath.bounced.clone(),
      end: this._cakePath.rolled.clone(),
    });
  }

  cakeToTom() {
    this._cakeState = 'flyingToTom';
    this._beginStoryEvent('cakeToTom', 3.75, {
      start: this._cakePath.rolled.clone(),
    });
  }

  cakeSplatTom() {
    this._cakeState = 'splat';
    this._storyState.cakeSplatted = true;
    if (this.cake) this.cake.visible = false;

    const tom = characterByName(this, 'Tom');
    if (tom?.headGroup && this.cakeSplat) {
      this.scene.updateMatrixWorld(true);
      tom.headGroup.attach(this.cakeSplat);
      this.cakeSplat.position.set(0, -0.12, 0.47);
      this.cakeSplat.rotation.set(0, 0, 0);
      this.cakeSplat.scale.setScalar(0.05);
      this.cakeSplat.visible = true;
    }

    const bursts = this.splatCrumbs.map((crumb, index) => {
      crumb.visible = true;
      return {
        object: crumb,
        offset: new THREE.Vector3(
          Math.cos(index * 1.7) * (0.35 + index * 0.035),
          0,
          Math.sin(index * 1.7) * (0.3 + index * 0.025),
        ),
      };
    });
    this._beginStoryEvent('cakeSplatTom', 0.9, { bursts });
  }

  dishesCrash() {
    this._storyState.crashed = true;
    this.scene.updateMatrixWorld(true);

    const objects = [...this.dishes, ...this.cups, this.fryingPan].filter(Boolean);
    const pieces = objects.map((object, index) => {
      const angle = -1.2 + index * 0.58;
      const distance = 0.9 + (index % 4) * 0.25;
      const isPlate = this.dishes.includes(object);
      const isCup = this.cups.includes(object);
      const landingY = isPlate ? 0.055 : (isCup ? 0.21 : 0.10);
      return {
        object,
        parent: object.parent,
        start: object.position.clone(),
        startRotation: object.rotation.clone(),
        angle,
        distance,
        landingY,
        arc: 0.75 + (index % 3) * 0.18,
        spinX: (index + 1) * 1.1,
        spinZ: (index % 2 === 0 ? 1 : -1) * (2.4 + index * 0.25),
        endRotation: new THREE.Euler(
          0,
          angle * 0.45,
          isCup ? (index % 2 === 0 ? 0.28 : -0.28) : 0,
        ),
      };
    });
    this._crashPieces = pieces;
    this._beginStoryEvent('dishesCrash', 1.5, { pieces });
  }

  jerryTakesCherry() {
    this._storyState.cherryTaken = true;
    this._beginStoryEvent('jerryTakesCherry', 0.35);
    this._placeCherryOnJerry();
  }

  _updateLegacyUnused(time, delta) {
    super.update(time, delta);
    this._sceneTime = time;

    const reveal = this._storyProgress('revealCake', time);
    if (reveal !== null && this.cloche) {
      const p = easeOutCubic(reveal);
      this.cloche.position.set(0.12 - p * 1.05, 1.46 + p * 1.35, -0.65);
      this.cloche.rotation.z = -p * 0.5;
      this.cloche.visible = reveal < 1;
    }

    const entrance = this._storyProgress('jerryEntrance', time);
    const jerry = characterByName(this, 'Jerry');
    if (entrance !== null && jerry?.mesh) {
      const bounce = 1 + Math.sin(entrance * Math.PI) * 0.22;
      const scale = Math.min(1, easeOutCubic(entrance) * 1.12) * bounce;
      jerry.mesh.scale.setScalar(Math.max(0.01, scale));
      if (entrance >= 1) jerry.mesh.scale.setScalar(1);
    }

    const offer = this._storyProgress('offerCrumb', time);
    if (offer !== null && this.crumbs[0]) {
      this.crumbs[0].position.y = 0.11 + Math.sin(offer * Math.PI) * 0.34;
    }

    const utensilOne = this._storyProgress('utensilThreatOne', time);
    if (utensilOne !== null && this.utensils[0]) {
      const utensil = this.utensils[0];
      const base = utensil.userData.basePosition;
      utensil.position.set(base.x - utensilOne * 0.28, base.y - utensilOne * 0.42, base.z + utensilOne * 0.18);
      utensil.rotation.z = Math.sin(utensilOne * Math.PI) * 0.82;
    }

    const utensilTwo = this._storyProgress('utensilThreatTwo', time);
    if (utensilTwo !== null && this.cups[0]) {
      const cup = this.cups[0];
      const base = cup.userData.basePosition;
      cup.position.set(base.x - utensilTwo * 0.22, base.y + Math.sin(utensilTwo * Math.PI) * 0.12, base.z + utensilTwo * 0.12);
      cup.rotation.z = Math.sin(utensilTwo * Math.PI) * 0.72;
    }

    const rack = this._storyProgress('rattleRack', time);
    if (rack !== null && this.utensilRack) {
      const fade = 1 - rack * 0.72;
      this.utensilRack.rotation.z = Math.sin(rack * Math.PI * 13) * 0.075 * fade;
      for (let index = 0; index < this.utensils.length; index++) {
        this.utensils[index].rotation.z = Math.sin(rack * Math.PI * 16 + index) * 0.22 * fade;
      }
    }

    if (jerry?.mesh && this.carriedSlices) {
      const base = jerry.mesh.position;
      if (this._storyState.firstSliceTaken && this.carriedSlices[0]) {
        this.carriedSlices[0].position.set(base.x + 0.32, base.y + 0.62, base.z + 0.22);
        this.carriedSlices[0].rotation.y = time * 0.8;
      }
      if (this._storyState.secondSliceTaken && this.carriedSlices[1]) {
        this.carriedSlices[1].position.set(base.x - 0.28, base.y + 0.55, base.z + 0.20);
        this.carriedSlices[1].rotation.y = -time * 0.65;
      }
    }

    const trap = this._storyProgress('bowlTrap', time);
    const trapEvent = this._storyEvents.get('bowlTrap');
    if (trap !== null && trapEvent && this.mixingBowl) {
      const p = easeInOutSine(trap);
      const start = this.mixingBowl.userData.basePosition;
      const target = trapEvent.data.target;
      this.mixingBowl.position.lerpVectors(start, target, p);
      this.mixingBowl.position.y += Math.sin(p * Math.PI) * 0.65;
      this.mixingBowl.rotation.z = p * Math.PI;
    }

    const crawl = this._storyProgress('bowlCrawl', time);
    if (crawl !== null && this.mixingBowl) {
      const trapTarget = this._storyEvents.get('bowlTrap')?.data.target || new THREE.Vector3(1.1, 0.48, 0.9);
      this.mixingBowl.position.set(
        trapTarget.x + easeInOutSine(crawl) * 1.55,
        trapTarget.y + Math.abs(Math.sin(crawl * Math.PI * 9)) * 0.055,
        trapTarget.z + Math.sin(crawl * Math.PI) * 0.22,
      );
      this.mixingBowl.rotation.set(0, Math.sin(crawl * Math.PI * 5) * 0.16, Math.PI + Math.sin(crawl * Math.PI * 9) * 0.08);
    }

    const restack = this._storyProgress('restackDishes', time);
    if (restack !== null && this.dishStack) {
      const fade = 1 - restack * 0.7;
      this.dishStack.rotation.z = Math.sin(restack * Math.PI * 12) * 0.13 * fade;
      for (let index = 0; index < this.dishes.length; index++) {
        const dish = this.dishes[index];
        dish.position.x = Math.sin(restack * Math.PI * 10 + index * 0.8) * 0.055 * fade;
        dish.position.y = dish.userData.basePosition.y + Math.abs(Math.sin(restack * Math.PI * 8 + index)) * 0.035 * fade;
      }
    }

    const escape = this._storyProgress('timerEscape', time);
    const escapeEvent = this._storyEvents.get('timerEscape');
    if (escape !== null && escapeEvent && this.utensils[1]) {
      const fork = this.utensils[1];
      fork.position.lerpVectors(escapeEvent.data.start, escapeEvent.data.end, easeInOutSine(escape));
      fork.rotation.z = -Math.PI * 0.42 + escape * 0.35;
    }

    const roll = this._storyProgress('timerRoll', time);
    if (roll !== null && this.kitchenTimer) {
      const p = easeInOutSine(roll);
      const start = this.kitchenTimer.userData.basePosition;
      this.kitchenTimer.position.set(
        start.x + p * 2.1,
        start.y * (1 - p) + 0.33 * p + Math.sin(p * Math.PI) * 0.28,
        start.z + p * 1.38,
      );
      this.kitchenTimer.rotation.z = -p * Math.PI * 5.5;
    }

    const ding = this._storyProgress('timerDing', time);
    if (ding !== null && this.kitchenTimer) {
      const shake = Math.sin(ding * Math.PI * 18) * (1 - ding) * 0.12;
      this.kitchenTimer.rotation.z += shake;
      const pulse = 1 + Math.sin(ding * Math.PI * 6) * (1 - ding) * 0.16;
      this.kitchenTimer.scale.setScalar(pulse);
    }

    // ── New slapstick cake chase with visible cause-and-effect trajectory ──
    const cakePush = this._storyProgress('cakePushJerry', time);
    if (cakePush !== null && this.cake) {
      const p = easeInOutSine(cakePush);
      this.cake.position.lerpVectors(this._cakeStartPos, new THREE.Vector3(0.12, 1.63, 0.85), p);
      this.cake.rotation.z = p * Math.PI * 0.35;
    }

    const cakeBounce = this._storyProgress('cakeBounce', time);
    if (cakeBounce !== null && this.cake) {
      const p = easeOutCubic(cakeBounce);
      const start = new THREE.Vector3(0.12, 1.63, 0.85);
      const end = new THREE.Vector3(-0.8, 0.18, 1.4);
      this.cake.position.lerpVectors(start, end, p);
      this.cake.position.y += Math.sin(p * Math.PI) * 0.55;
      this.cake.rotation.x = p * Math.PI * 2.5;
      this.cake.rotation.z = p * Math.PI * 0.8;
    }

    const cakeRoll = this._storyProgress('cakeRoll', time);
    if (cakeRoll !== null && this.cake) {
      const p = easeInOutSine(cakeRoll);
      const start = new THREE.Vector3(-0.8, 0.18, 1.4);
      const end = new THREE.Vector3(0.2, 0.18, 1.0);
      this.cake.position.lerpVectors(start, end, p);
      this.cake.rotation.z = p * Math.PI * 3;
    }

    const cakeFly = this._storyProgress('cakeToTom', time);
    if (cakeFly !== null && this.cake) {
      const p = easeOutCubic(cakeFly);
      const start = new THREE.Vector3(0.2, 0.18, 1.0);
      const tom = characterByName(this, 'Tom');
      const end = tom?.mesh
        ? new THREE.Vector3(tom.mesh.position.x, tom.mesh.position.y + 1.35, tom.mesh.position.z + 0.28)
        : new THREE.Vector3(0.5, 1.4, 1.4);
      this.cake.position.lerpVectors(start, end, p);
      this.cake.position.y += Math.sin(p * Math.PI) * 0.65;
      this.cake.rotation.x = p * Math.PI * 1.8;
      this.cake.rotation.z = p * Math.PI * 1.2;
    }

    const cakeSplat = this._storyProgress('cakeSplatTom', time);
    if (cakeSplat !== null && this.cake) {
      const p = easeOutCubic(cakeSplat);
      const squash = 1 - p * 0.72;
      this.cake.scale.set(1.0 + p * 0.55, Math.max(0.28, squash), 1.0 + p * 0.55);
      this.cake.position.y -= p * 0.12;
      for (let index = 1; index < this.crumbs.length - 1; index++) {
        const crumb = this.crumbs[index];
        const seed = crumb.userData.seed;
        crumb.visible = true;
        crumb.position.set(
          this.cake.position.x + Math.cos(seed) * p * (0.3 + index * 0.03),
          0.08 + Math.sin(p * Math.PI) * (0.35 + (index % 4) * 0.12),
          this.cake.position.z + Math.sin(seed) * p * (0.25 + index * 0.025),
        );
      }
    }

    const newCrash = this._storyProgress('dishesCrash', time);
    const newCrashEvent = this._storyEvents.get('dishesCrash');
    if (newCrash !== null && newCrashEvent) {
      const p = easeOutCubic(newCrash);
      for (let index = 0; index < this.dishes.length; index++) {
        const dish = this.dishes[index];
        const angle = -1.0 + index * 0.38;
        const speed = 0.9 + index * 0.12;
        dish.position.set(
          newCrashEvent.data.target.x + Math.cos(angle) * p * speed,
          dish.userData.basePosition.y + Math.sin(p * Math.PI) * (0.6 + index * 0.05) - p * 1.25,
          newCrashEvent.data.target.z + Math.sin(angle) * p * speed,
        );
        dish.rotation.x = p * (index + 1) * 1.5;
        dish.rotation.z = p * (index % 2 === 0 ? 2.8 : -2.8);
      }
      for (let index = 0; index < this.cups.length; index++) {
        const cup = this.cups[index];
        cup.position.x = cup.userData.basePosition.x + p * (index === 0 ? -1.8 : 1.5);
        cup.position.y = cup.userData.basePosition.y + Math.sin(p * Math.PI) * 1.1 - p * 1.5;
        cup.rotation.z = p * (index === 0 ? -5 : 4.5);
      }
      if (this.fryingPan) {
        this.fryingPan.position.set(-3.55 + p * 3.2, 1.67 + Math.sin(p * Math.PI) * 1.4 - p * 1.3, -0.45 + p * 0.7);
        this.fryingPan.rotation.x = p * Math.PI * 3.5;
        this.fryingPan.rotation.z = p * Math.PI * 2;
      }
    }

    const cherryEvent = this._storyProgress('jerryTakesCherry', time);
    if (cherryEvent !== null && this.cherry) {
      const jerry = characterByName(this, 'Jerry');
      if (jerry?.mesh) {
        const base = jerry.mesh.position;
        this.cherry.position.set(base.x + 0.18, base.y + 0.55, base.z + 0.12);
      }
    }

    const crash = this._storyProgress('crockeryCrash', time);
    const crashEvent = this._storyEvents.get('crockeryCrash');
    if (crash !== null && crashEvent) {
      const p = easeOutCubic(crash);
      for (let index = 0; index < this.dishes.length; index++) {
        const dish = this.dishes[index];
        const angle = -1.2 + index * 0.38;
        const speed = 0.9 + index * 0.12;
        dish.position.set(
          Math.cos(angle) * p * speed,
          dish.userData.basePosition.y + Math.sin(p * Math.PI) * (0.6 + index * 0.05) - p * 1.25,
          Math.sin(angle) * p * speed,
        );
        dish.rotation.x = p * (index + 1) * 1.5;
        dish.rotation.z = p * (index % 2 === 0 ? 2.8 : -2.8);
      }
      for (let index = 0; index < this.cups.length; index++) {
        const cup = this.cups[index];
        cup.position.x = cup.userData.basePosition.x + p * (index === 0 ? -1.8 : 1.5);
        cup.position.y = cup.userData.basePosition.y + Math.sin(p * Math.PI) * 1.1 - p * 1.5;
        cup.rotation.z = p * (index === 0 ? -5 : 4.5);
      }
      if (this.fryingPan) {
        this.fryingPan.position.set(-3.55 + p * 3.2, 1.67 + Math.sin(p * Math.PI) * 1.4 - p * 1.3, -0.45 + p * 0.7);
        this.fryingPan.rotation.x = p * Math.PI * 3.5;
        this.fryingPan.rotation.z = p * Math.PI * 2;
      }
      if (this.cake) {
        const start = new THREE.Vector3(0.12, 1.63, -0.65);
        this.cake.position.lerpVectors(start, crashEvent.data.target, p);
        this.cake.position.y += Math.sin(p * Math.PI) * 1.2;
        this.cake.rotation.z = p * Math.PI * 1.4;
        const squash = crash >= 0.92 ? 1 - (crash - 0.92) / 0.08 * 0.72 : 1;
        this.cake.scale.set(1.0 + (1 - squash) * 0.35, Math.max(0.28, squash), 1.0 + (1 - squash) * 0.35);
      }
      for (let index = 1; index < this.crumbs.length - 1; index++) {
        const crumb = this.crumbs[index];
        const seed = crumb.userData.seed;
        crumb.visible = true;
        crumb.position.set(
          crashEvent.data.target.x + Math.cos(seed) * p * (0.35 + index * 0.035),
          0.08 + Math.sin(p * Math.PI) * (0.4 + (index % 4) * 0.16),
          crashEvent.data.target.z + Math.sin(seed) * p * (0.3 + index * 0.03),
        );
      }
    }
  }

  update(time, delta) {
    super.update(time, delta);
    this._sceneTime = time;

    const reveal = this._storyProgress('revealCake', time);
    const revealEvent = this._storyEvents.get('revealCake');
    if (reveal !== null && this.cloche) {
      const p = easeOutCubic(reveal);
      this.cloche.position.set(0.12 - p * 1.05, 1.46 + p * 1.35, -0.65);
      this.cloche.rotation.z = -p * 0.5;
      this.cloche.visible = reveal < 1;
    } else if (this.cloche && (!revealEvent || time < revealEvent.start)) {
      this.cloche.position.set(0.12, 1.46, -0.65);
      this.cloche.rotation.set(0, 0, 0);
      this.cloche.visible = true;
    }

    const entrance = this._storyProgress('jerryEntrance', time);
    const entranceEvent = this._storyEvents.get('jerryEntrance');
    const jerry = characterByName(this, 'Jerry');
    if (entranceEvent && jerry?.mesh) {
      const entranceEnd = entranceEvent.start + entranceEvent.duration;
      if (time < entranceEvent.start) {
        this._storyState.jerryEntered = false;
        entranceEvent.data.completed = false;
        jerry.mesh.visible = false;
        jerry.mesh.position.copy(entranceEvent.data.start);
        jerry.mesh.scale.setScalar(1);
      } else if (time <= entranceEnd && entrance !== null) {
        this._storyState.jerryEntered = true;
        entranceEvent.data.completed = false;
        jerry.mesh.visible = true;
        const p = easeOutCubic(entrance);
        jerry.mesh.position.lerpVectors(entranceEvent.data.start, entranceEvent.data.end, p);
        const entranceBounce = Math.sin(entrance * Math.PI) * 0.12;
        jerry.mesh.scale.setScalar(Math.min(1, 0.65 + p * 0.35 + entranceBounce));
      } else if (!entranceEvent.data.completed) {
        jerry.mesh.visible = true;
        jerry.mesh.position.copy(entranceEvent.data.end);
        jerry.mesh.scale.setScalar(1);
        entranceEvent.data.completed = true;
      }
    }

    const splat = this._storyProgress('cakeSplatTom', time);
    const splatEvent = this._storyEvents.get('cakeSplatTom');
    const fly = this._storyProgress('cakeToTom', time);
    const flyEvent = this._storyEvents.get('cakeToTom');
    const roll = this._storyProgress('cakeRoll', time);
    const rollEvent = this._storyEvents.get('cakeRoll');
    const bounce = this._storyProgress('cakeBounce', time);
    const bounceEvent = this._storyEvents.get('cakeBounce');
    const push = this._storyProgress('cakePushJerry', time);
    const pushEvent = this._storyEvents.get('cakePushJerry');

    if (splat !== null && splatEvent) {
      this._storyState.cakeSplatted = true;
      if (this.cake) this.cake.visible = false;
      const tom = characterByName(this, 'Tom');
      if (tom?.headGroup && this.cakeSplat) {
        if (this.cakeSplat.parent !== tom.headGroup) {
          this.scene.updateMatrixWorld(true);
          tom.headGroup.attach(this.cakeSplat);
        }
        this.cakeSplat.position.set(0, -0.12, 0.47);
        this.cakeSplat.rotation.set(0, 0, 0);
        this.cakeSplat.visible = true;
      }
      const p = easeOutCubic(splat);
      if (this.cakeSplat) this.cakeSplat.scale.setScalar(Math.max(0.05, p));
      let origin = new THREE.Vector3(-1.3, 1.55, 1.9);
      if (tom?.headGroup) {
        tom.mesh.updateMatrixWorld(true);
        origin = tom.headGroup.localToWorld(new THREE.Vector3(0, -0.08, 0.5));
      }
      for (let index = 0; index < splatEvent.data.bursts.length; index++) {
        const burst = splatEvent.data.bursts[index];
        const end = new THREE.Vector3(
          origin.x + burst.offset.x,
          0.035,
          origin.z + burst.offset.z,
        );
        burst.object.visible = true;
        burst.object.position.lerpVectors(origin, end, p);
        burst.object.position.y += Math.sin(p * Math.PI) * (0.35 + index * 0.035);
        burst.object.rotation.x = p * (index + 1) * 0.7;
        burst.object.rotation.z = p * (index % 2 === 0 ? 2.4 : -2.4);
      }
    } else if (fly !== null && flyEvent && this.cake) {
      this._storyState.cakeSplatted = false;
      this._resetCakeSplat();
      this.cake.visible = true;
      const p = easeInOutSine(fly);
      const tom = characterByName(this, 'Tom');
      let target = new THREE.Vector3(-1.3, 1.55, 1.9);
      if (tom?.headGroup) {
        tom.mesh.updateMatrixWorld(true);
        target = tom.headGroup.localToWorld(new THREE.Vector3(0, -0.08, 0.58));
      }
      this.cake.position.lerpVectors(flyEvent.data.start, target, p);
      this.cake.position.y += Math.sin(p * Math.PI) * 0.7;
      this.cake.rotation.x = Math.PI / 2 + p * Math.PI * 1.2;
      this.cake.rotation.z = p * Math.PI * 3.2;
    } else if (roll !== null && rollEvent && this.cake) {
      this._storyState.cakeSplatted = false;
      this._resetCakeSplat();
      this.cake.visible = true;
      const p = easeInOutSine(roll);
      this.cake.position.lerpVectors(rollEvent.data.start, rollEvent.data.end, p);
      this.cake.rotation.x = Math.PI / 2;
      this.cake.rotation.z = p * Math.PI * 4;
    } else if (bounce !== null && bounceEvent && this.cake) {
      this._storyState.cakeSplatted = false;
      this._resetCakeSplat();
      this.cake.visible = true;
      const p = easeOutCubic(bounce);
      this.cake.position.lerpVectors(bounceEvent.data.start, bounceEvent.data.end, p);
      this.cake.position.y += Math.sin(p * Math.PI) * 0.48;
      this.cake.rotation.x = Math.PI / 2;
      this.cake.rotation.z = p * Math.PI * 2.5;
    } else if (push !== null && pushEvent && this.cake) {
      this._storyState.cakeSplatted = false;
      this._resetCakeSplat();
      this.cake.visible = true;
      const p = easeInOutSine(push);
      this.cake.position.lerpVectors(pushEvent.data.start, pushEvent.data.end, p);
      this.cake.position.y += Math.sin(p * Math.PI) * 0.18;
      this.cake.rotation.x = p * Math.PI / 2;
      this.cake.rotation.z = p * 0.35;
    } else if (this.cake) {
      this._storyState.cakeSplatted = false;
      this._resetCakeSplat();
      this.cake.visible = true;
      this.cake.position.copy(this._cakePath.stand);
      this.cake.rotation.set(0, 0, 0);
      this.cake.scale.setScalar(1);
    }

    const crash = this._storyProgress('dishesCrash', time);
    const crashEvent = this._storyEvents.get('dishesCrash');
    if (crash !== null && crashEvent) {
      this._storyState.crashed = true;
      const p = easeOutCubic(crash);
      const tom = characterByName(this, 'Tom');
      const center = tom?.mesh?.position || new THREE.Vector3(-1.3, 0.02, 1.4);
      this.scene.updateMatrixWorld(true);
      for (const piece of crashEvent.data.pieces) {
        const endWorld = new THREE.Vector3(
          center.x + Math.cos(piece.angle) * piece.distance,
          piece.landingY,
          center.z + Math.sin(piece.angle) * piece.distance,
        );
        const end = piece.parent === this.scene
          ? endWorld
          : piece.parent.worldToLocal(endWorld.clone());
        piece.object.position.lerpVectors(piece.start, end, p);
        piece.object.position.y += Math.sin(p * Math.PI) * piece.arc;
        const spin = Math.sin(p * Math.PI);
        piece.object.rotation.x = THREE.MathUtils.lerp(
          piece.startRotation.x,
          piece.endRotation.x,
          p,
        ) + spin * piece.spinX;
        piece.object.rotation.y = THREE.MathUtils.lerp(
          piece.startRotation.y,
          piece.endRotation.y,
          p,
        );
        piece.object.rotation.z = THREE.MathUtils.lerp(
          piece.startRotation.z,
          piece.endRotation.z,
          p,
        ) + spin * piece.spinZ;
      }
    } else if (crashEvent && time < crashEvent.start) {
      this._storyState.crashed = false;
      for (const piece of crashEvent.data.pieces) {
        piece.object.position.copy(piece.start);
        piece.object.rotation.copy(piece.startRotation);
      }
    }

    const cherryEvent = this._storyEvents.get('jerryTakesCherry');
    if (cherryEvent && time >= cherryEvent.start) {
      this._storyState.cherryTaken = true;
      this._placeCherryOnJerry();
    } else {
      this._storyState.cherryTaken = false;
      this._placeCherryOnCake();
    }
  }

  _buildRoomShell() {
    const floorMat = toonMaterial(0x6a4b38, { roughness: 0.88 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 12), floorMat);
    floor.name = 'KitchenFloor';
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const groutMat = toonMaterial(0x3f3028);
    for (let x = -7; x <= 7; x += 1) {
      addBox(
        this.scene,
        `FloorGroutX${x}`,
        new THREE.Vector3(0.018, 0.006, 12),
        new THREE.Vector3(x, 0.006, 0),
        groutMat,
        { castShadow: false },
      );
    }
    for (let z = -5; z <= 5; z += 1) {
      addBox(
        this.scene,
        `FloorGroutZ${z}`,
        new THREE.Vector3(16, 0.006, 0.018),
        new THREE.Vector3(0, 0.006, z),
        groutMat,
        { castShadow: false },
      );
    }

    const wallMat = toonMaterial(0xb9d5c2, { roughness: 0.95 });
    addBox(
      this.scene,
      'KitchenBackWall',
      new THREE.Vector3(16, 5.8, 0.22),
      new THREE.Vector3(0, 2.9, -6.0),
      wallMat,
      { receiveShadow: true },
    );
    addBox(
      this.scene,
      'KitchenLeftWall',
      new THREE.Vector3(0.22, 5.8, 12),
      new THREE.Vector3(-8.0, 2.9, 0),
      wallMat,
      { receiveShadow: true },
    );
    addBox(
      this.scene,
      'KitchenRightWall',
      new THREE.Vector3(0.22, 5.8, 12),
      new THREE.Vector3(8.0, 2.9, 0),
      wallMat,
      { receiveShadow: true },
    );

    const trimMat = toonMaterial(0xf3e2b8);
    addBox(
      this.scene,
      'BackBaseboard',
      new THREE.Vector3(15.8, 0.18, 0.12),
      new THREE.Vector3(0, 0.10, -5.83),
      trimMat,
    );

    const windowGroup = new THREE.Group();
    windowGroup.name = 'MoonWindow';
    windowGroup.position.set(0.9, 3.55, -5.84);
    this.scene.add(windowGroup);

    const frameMat = toonMaterial(0xf4eee1);
    const glassMat = new THREE.MeshBasicMaterial({ color: 0x172a48 });
    addBox(
      windowGroup,
      'WindowGlass',
      new THREE.Vector3(2.8, 1.55, 0.04),
      new THREE.Vector3(0, 0, 0),
      glassMat,
      { castShadow: false },
    );
    addBox(windowGroup, 'WindowTop', new THREE.Vector3(3.0, 0.10, 0.10), new THREE.Vector3(0, 0.82, 0.05), frameMat);
    addBox(windowGroup, 'WindowBottom', new THREE.Vector3(3.0, 0.10, 0.10), new THREE.Vector3(0, -0.82, 0.05), frameMat);
    addBox(windowGroup, 'WindowLeft', new THREE.Vector3(0.10, 1.75, 0.10), new THREE.Vector3(-1.45, 0, 0.05), frameMat);
    addBox(windowGroup, 'WindowRight', new THREE.Vector3(0.10, 1.75, 0.10), new THREE.Vector3(1.45, 0, 0.05), frameMat);
    addBox(windowGroup, 'WindowCrossV', new THREE.Vector3(0.07, 1.65, 0.10), new THREE.Vector3(0, 0, 0.06), frameMat);
    addBox(windowGroup, 'WindowCrossH', new THREE.Vector3(2.9, 0.07, 0.10), new THREE.Vector3(0, 0, 0.06), frameMat);

    const moon = new THREE.Mesh(
      new THREE.CircleGeometry(0.25, 24),
      new THREE.MeshBasicMaterial({ color: 0xfff2b3 }),
    );
    moon.name = 'Moon';
    moon.position.set(0.72, 0.30, 0.07);
    windowGroup.add(moon);
  }

  _buildBackCounterAndSink() {
    const cabinetMat = toonMaterial(0x4f8a78);
    const cabinetDark = toonMaterial(0x2d655b);
    const counterMat = toonMaterial(0xf0d89a, { roughness: 0.55 });
    const metalMat = toonMaterial(0x9ab0ba, { metalness: 0.5, roughness: 0.35 });

    this.backCounter = new THREE.Group();
    this.backCounter.name = 'BackCounter';
    this.scene.add(this.backCounter);

    addBox(
      this.backCounter,
      'BackCounterBody',
      new THREE.Vector3(8.2, 1.05, 1.15),
      new THREE.Vector3(0.8, 0.53, -5.05),
      cabinetMat,
    );
    addBox(
      this.backCounter,
      'BackCounterTop',
      new THREE.Vector3(8.5, 0.16, 1.34),
      new THREE.Vector3(0.8, 1.11, -4.98),
      counterMat,
    );

    for (let x = -2.65; x <= 4.25; x += 1.38) {
      addBox(
        this.backCounter,
        `CabinetDoor${x.toFixed(2)}`,
        new THREE.Vector3(1.22, 0.82, 0.07),
        new THREE.Vector3(x, 0.54, -4.43),
        cabinetDark,
      );
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), metalMat);
      knob.position.set(x + 0.42, 0.62, -4.37);
      this.backCounter.add(knob);
    }

    this.sink = new THREE.Group();
    this.sink.name = 'KitchenSink';
    this.sink.position.set(0.8, 1.18, -4.96);
    this.scene.add(this.sink);

    const basin = addBox(
      this.sink,
      'SinkBasin',
      new THREE.Vector3(1.15, 0.10, 0.72),
      new THREE.Vector3(0, 0, 0.03),
      metalMat,
    );
    basin.material = toonMaterial(0x60757e, { metalness: 0.6, roughness: 0.28 });

    const faucet = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.035, 8, 20, Math.PI), metalMat);
    faucet.name = 'SinkFaucet';
    faucet.position.set(0, 0.32, -0.20);
    this.sink.add(faucet);
    for (const x of [-0.23, 0.23]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.30, 10), metalMat);
      post.position.set(x, 0.18, -0.20);
      this.sink.add(post);
    }

    const upperCabinetMat = toonMaterial(0xf2c66f);
    for (const x of [-2.5, 3.8]) {
      const cabinet = addBox(
        this.scene,
        `UpperCabinet${x}`,
        new THREE.Vector3(2.0, 1.35, 0.48),
        new THREE.Vector3(x, 3.35, -5.62),
        upperCabinetMat,
      );
      cabinet.castShadow = true;
    }
  }

  _buildFridge() {
    const fridgeMat = toonMaterial(0xc7e4ea, { metalness: 0.18, roughness: 0.45 });
    const trimMat = toonMaterial(0x526b79, { metalness: 0.45, roughness: 0.3 });

    this.fridge = new THREE.Group();
    this.fridge.name = 'KitchenFridge';
    this.fridge.position.set(-5.65, 0, -4.95);
    this.scene.add(this.fridge);

    addBox(
      this.fridge,
      'FridgeBody',
      new THREE.Vector3(1.7, 3.65, 1.35),
      new THREE.Vector3(0, 1.825, 0),
      fridgeMat,
    );
    addBox(
      this.fridge,
      'FridgeDoorLine',
      new THREE.Vector3(1.58, 0.045, 0.04),
      new THREE.Vector3(0, 1.25, 0.695),
      trimMat,
    );
    addBox(
      this.fridge,
      'FridgeHandle',
      new THREE.Vector3(0.09, 1.10, 0.10),
      new THREE.Vector3(0.56, 2.20, 0.73),
      trimMat,
    );

    const note = new THREE.Mesh(
      new THREE.PlaneGeometry(0.48, 0.58),
      new THREE.MeshBasicMaterial({ color: 0xf7e36c }),
    );
    note.name = 'FridgeNote';
    note.position.set(-0.18, 2.55, 0.705);
    this.fridge.add(note);
    const magnet = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), toonMaterial(0xd84b4b));
    magnet.position.set(-0.18, 2.80, 0.75);
    this.fridge.add(magnet);
  }

  _buildIslandAndCheese() {
    const islandMat = toonMaterial(0x39796d);
    const panelMat = toonMaterial(0x28594f);
    const counterMat = toonMaterial(0xf5dca0, { roughness: 0.52 });

    this.island = new THREE.Group();
    this.island.name = 'KitchenIsland';
    this.island.position.set(0, 0, -0.65);
    this.scene.add(this.island);

    addBox(
      this.island,
      'IslandBody',
      new THREE.Vector3(3.75, 1.22, 1.72),
      new THREE.Vector3(0, 0.61, 0),
      islandMat,
    );
    addBox(
      this.island,
      'IslandFrontPanel',
      new THREE.Vector3(3.25, 0.82, 0.07),
      new THREE.Vector3(0, 0.62, 0.895),
      panelMat,
    );
    addBox(
      this.island,
      'IslandTop',
      new THREE.Vector3(4.05, 0.16, 2.02),
      new THREE.Vector3(0, 1.30, 0),
      counterMat,
    );

    const plate = new THREE.Mesh(
      new THREE.CylinderGeometry(0.48, 0.50, 0.055, 24),
      toonMaterial(0xf5f7f4),
    );
    plate.name = 'CheesePlate';
    plate.position.set(0.20, 1.42, 0.02);
    this.island.add(plate);

    this.cheese = new THREE.Group();
    this.cheese.name = 'CheeseProp';
    this.cheese.position.set(0.20, 1.53, 0.02);
    this.cheese.userData.interaction = 'midnight-snack';
    this.cheese.visible = false;
    this.island.add(this.cheese);

    const cheeseMat = toonMaterial(0xf3c742);
    const rindMat = toonMaterial(0xd99f27);
    const wedge = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.20, 3), cheeseMat);
    wedge.name = 'CheeseWedge';
    wedge.rotation.y = Math.PI / 2;
    wedge.castShadow = true;
    this.cheese.add(wedge);

    const rind = new THREE.Mesh(new THREE.CylinderGeometry(0.365, 0.365, 0.035, 3), rindMat);
    rind.position.y = -0.105;
    rind.rotation.y = Math.PI / 2;
    this.cheese.add(rind);

    const holeMat = toonMaterial(0xb67b23);
    for (const [x, y, z, radius] of [
      [-0.12, 0.07, 0.23, 0.045],
      [0.11, 0.08, 0.13, 0.034],
      [0.02, 0.10, -0.18, 0.038],
    ]) {
      const hole = new THREE.Mesh(new THREE.SphereGeometry(radius, 10, 7), holeMat);
      hole.position.set(x, y, z);
      hole.scale.y = 0.32;
      this.cheese.add(hole);
    }
  }

  _buildStoryProps() {
    const porcelain = toonMaterial(0xf4f3e8);
    const porcelainBlue = toonMaterial(0x7ba8c7);
    const metal = toonMaterial(0xa8b6bc, { metalness: 0.65, roughness: 0.28 });
    const darkMetal = toonMaterial(0x56636a, { metalness: 0.55, roughness: 0.32 });
    const cakeMat = toonMaterial(0xe8a56d);
    const icingMat = toonMaterial(0xf4d6df);
    const fillingMat = toonMaterial(0xa83f55);

    const cakeStand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.72, 0.76, 0.09, 28),
      porcelain,
    );
    cakeStand.name = 'CakeStand';
    cakeStand.position.set(0.12, 1.43, -0.65);
    cakeStand.castShadow = true;
    this.scene.add(cakeStand);

    this.cake = new THREE.Group();
    this.cake.name = 'MidnightCake';
    this.cake.position.set(0.12, 1.63, -0.65);
    this.cake.userData.interaction = 'cake';
    this.scene.add(this.cake);

    const sliceCount = 8;
    const sliceArc = (Math.PI * 2) / sliceCount;
    for (let index = 0; index < sliceCount; index++) {
      const slice = new THREE.Group();
      slice.name = `CakeSlice${index + 1}`;

      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.55, 0.30, 24, 1, false, index * sliceArc, sliceArc * 0.985),
        cakeMat,
      );
      body.castShadow = true;
      slice.add(body);

      const filling = new THREE.Mesh(
        new THREE.CylinderGeometry(0.558, 0.558, 0.045, 24, 1, false, index * sliceArc, sliceArc * 0.985),
        fillingMat,
      );
      filling.position.y = -0.015;
      slice.add(filling);

      const icing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.565, 0.565, 0.055, 24, 1, false, index * sliceArc, sliceArc * 0.985),
        icingMat,
      );
      icing.position.y = 0.177;
      slice.add(icing);

      this.cake.add(slice);
      this.cakeSlices.push(slice);
    }

    for (let i = 0; i < 6; i++) {
      const berry = new THREE.Mesh(
        new THREE.SphereGeometry(0.055, 10, 8),
        toonMaterial(i % 2 === 0 ? 0xc73f55 : 0x7b4a9c),
      );
      const angle = (i / 6) * Math.PI * 2;
      berry.position.set(Math.cos(angle) * 0.34, 0.23, Math.sin(angle) * 0.34);
      this.cake.add(berry);
    }

    // A visible cherry is planted on the cake so Jerry's later handoff is causal.
    this.cherry = new THREE.Group();
    this.cherry.name = 'JerryCherry';
    this.cherry.position.set(0.02, 0.32, 0.02);
    this.cherry.visible = true;
    this.cake.add(this.cherry);
    const cherryBody = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), toonMaterial(0xc73f55));
    cherryBody.position.y = 0;
    this.cherry.add(cherryBody);
    const cherryStem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.07, 6), toonMaterial(0x4a6b3a));
    cherryStem.position.set(0.02, 0.055, 0);
    cherryStem.rotation.z = -0.35;
    this.cherry.add(cherryStem);

    // The intact cake disappears on impact; this smaller cream decal stays on Tom.
    this.cakeSplat = new THREE.Group();
    this.cakeSplat.name = 'TomCakeSplat';
    this.cakeSplat.visible = false;
    this.scene.add(this.cakeSplat);
    const splatBody = new THREE.Mesh(new THREE.SphereGeometry(0.31, 18, 14), icingMat);
    splatBody.scale.set(1.05, 0.78, 0.16);
    this.cakeSplat.add(splatBody);
    for (const [x, y, scale] of [
      [-0.22, -0.20, 0.42],
      [0.0, -0.25, 0.55],
      [0.22, -0.18, 0.38],
    ]) {
      const drip = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), icingMat);
      drip.position.set(x, y, 0);
      drip.scale.set(scale, 1.0, 0.18);
      this.cakeSplat.add(drip);
    }
    for (const [x, y, color] of [
      [-0.15, 0.02, 0xc73f55],
      [0.16, -0.04, 0x7b4a9c],
      [0.02, -0.16, 0xc73f55],
    ]) {
      const topping = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), toonMaterial(color));
      topping.position.set(x, y, 0.055);
      topping.scale.z = 0.35;
      this.cakeSplat.add(topping);
    }

    this.cloche = new THREE.Group();
    this.cloche.name = 'CakeCloche';
    this.cloche.position.set(0.12, 1.46, -0.65);
    this.cloche.userData.baseY = this.cloche.position.y;
    this.scene.add(this.cloche);

    const glass = new THREE.Mesh(
      new THREE.SphereGeometry(0.72, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.5),
      new THREE.MeshPhysicalMaterial({
        color: 0xd9f3ff,
        transparent: true,
        opacity: 0.30,
        roughness: 0.12,
        metalness: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    glass.name = 'ClocheGlass';
    this.cloche.add(glass);

    const clocheRim = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.035, 8, 28), metal);
    clocheRim.rotation.x = Math.PI / 2;
    this.cloche.add(clocheRim);
    const clocheHandle = new THREE.Mesh(new THREE.SphereGeometry(0.105, 12, 9), darkMetal);
    clocheHandle.position.y = 0.78;
    clocheHandle.scale.y = 0.75;
    this.cloche.add(clocheHandle);

    this.utensilRack = new THREE.Group();
    this.utensilRack.name = 'UtensilRack';
    this.utensilRack.position.set(2.72, 1.42, -0.62);
    this.utensilRack.userData.baseRotationZ = 0;
    this.scene.add(this.utensilRack);

    addBox(
      this.utensilRack,
      'RackBase',
      new THREE.Vector3(1.55, 0.10, 0.55),
      new THREE.Vector3(0, 0, 0),
      darkMetal,
    );
    for (const x of [-0.68, 0.68]) {
      addBox(
        this.utensilRack,
        `RackPost${x}`,
        new THREE.Vector3(0.06, 1.15, 0.06),
        new THREE.Vector3(x, 0.58, -0.13),
        darkMetal,
      );
    }
    addBox(
      this.utensilRack,
      'RackRail',
      new THREE.Vector3(1.44, 0.06, 0.06),
      new THREE.Vector3(0, 1.10, -0.13),
      darkMetal,
    );

    for (let index = 0; index < 4; index++) {
      const utensil = new THREE.Group();
      utensil.name = index % 2 === 0 ? `Spoon${index + 1}` : `Fork${index + 1}`;
      utensil.position.set(-0.48 + index * 0.32, 0.64, 0.05);
      utensil.userData.basePosition = utensil.position.clone();
      utensil.userData.baseRotationZ = 0;

      const handle = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.50, 3, 8), metal);
      utensil.add(handle);
      if (index % 2 === 0) {
        const spoon = new THREE.Mesh(new THREE.SphereGeometry(0.095, 12, 8), metal);
        spoon.position.y = -0.32;
        spoon.scale.set(0.72, 1.15, 0.28);
        utensil.add(spoon);
      } else {
        const forkHead = addBox(
          utensil,
          'ForkHead',
          new THREE.Vector3(0.13, 0.16, 0.035),
          new THREE.Vector3(0, -0.31, 0),
          metal,
        );
        for (const x of [-0.045, -0.015, 0.015, 0.045]) {
          addBox(
            forkHead,
            `ForkTine${x}`,
            new THREE.Vector3(0.012, 0.12, 0.025),
            new THREE.Vector3(x, -0.12, 0),
            metal,
          );
        }
      }
      this.utensilRack.add(utensil);
      this.utensils.push(utensil);
    }

    for (let index = 0; index < 2; index++) {
      const cup = new THREE.Group();
      cup.name = `KitchenCup${index + 1}`;
      cup.position.set(1.76 + index * 0.48, 1.62, -0.05);
      cup.userData.basePosition = cup.position.clone();
      this.scene.add(cup);

      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.13, 0.34, 16, 1, true),
        index === 0 ? porcelainBlue : porcelain,
      );
      body.castShadow = true;
      cup.add(body);
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.10, 0.025, 7, 16, Math.PI * 1.5), index === 0 ? porcelainBlue : porcelain);
      handle.position.set(0.15, 0, 0);
      handle.rotation.y = Math.PI / 2;
      cup.add(handle);
      this.cups.push(cup);
    }

    this.mixingBowl = new THREE.Group();
    this.mixingBowl.name = 'MixingBowl';
    this.mixingBowl.position.set(-1.35, 1.54, -0.55);
    this.mixingBowl.userData.basePosition = this.mixingBowl.position.clone();
    this.scene.add(this.mixingBowl);

    const bowlShell = new THREE.Mesh(
      new THREE.SphereGeometry(0.52, 22, 12, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5),
      porcelainBlue,
    );
    bowlShell.material.side = THREE.DoubleSide;
    bowlShell.castShadow = true;
    this.mixingBowl.add(bowlShell);
    const bowlRim = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.035, 8, 24), porcelain);
    bowlRim.rotation.x = Math.PI / 2;
    this.mixingBowl.add(bowlRim);

    this.kitchenTimer = new THREE.Group();
    this.kitchenTimer.name = 'KitchenTimer';
    this.kitchenTimer.position.set(1.34, 1.68, -0.65);
    this.kitchenTimer.userData.basePosition = this.kitchenTimer.position.clone();
    this.scene.add(this.kitchenTimer);

    this.timerBody = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.30, 0.22, 22), toonMaterial(0xe85b4f));
    this.timerBody.rotation.x = Math.PI / 2;
    this.timerBody.castShadow = true;
    this.kitchenTimer.add(this.timerBody);
    const timerFace = new THREE.Mesh(new THREE.CircleGeometry(0.245, 22), porcelain);
    timerFace.position.z = 0.121;
    this.kitchenTimer.add(timerFace);
    this.timerHand = addBox(
      this.kitchenTimer,
      'TimerHand',
      new THREE.Vector3(0.025, 0.19, 0.018),
      new THREE.Vector3(0, 0.075, 0.14),
      darkMetal,
      { castShadow: false },
    );
    const timerBell = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), darkMetal);
    timerBell.name = 'TimerBell';
    timerBell.position.set(0, 0.34, 0);
    timerBell.scale.y = 0.65;
    this.kitchenTimer.add(timerBell);
    this.timerBell = timerBell;

    this.dishStack = new THREE.Group();
    this.dishStack.name = 'DishStack';
    this.dishStack.position.set(-2.72, 1.47, -0.62);
    this.dishStack.userData.basePosition = this.dishStack.position.clone();
    this.scene.add(this.dishStack);
    this.dishes = [];
    for (let index = 0; index < 7; index++) {
      const plate = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42 - index * 0.012, 0.45 - index * 0.012, 0.055, 22),
        index % 2 === 0 ? porcelain : porcelainBlue,
      );
      plate.name = `Plate${index + 1}`;
      plate.position.y = index * 0.062;
      plate.userData.basePosition = plate.position.clone();
      this.dishStack.add(plate);
      this.dishes.push(plate);
    }

    this.fryingPan = new THREE.Group();
    this.fryingPan.name = 'FryingPan';
    this.fryingPan.position.set(-3.55, 1.67, -0.45);
    this.fryingPan.userData.basePosition = this.fryingPan.position.clone();
    this.scene.add(this.fryingPan);
    const panBody = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.29, 0.10, 18), darkMetal);
    panBody.castShadow = true;
    this.fryingPan.add(panBody);
    addBox(
      this.fryingPan,
      'PanHandle',
      new THREE.Vector3(0.12, 0.10, 0.78),
      new THREE.Vector3(0, 0, -0.47),
      darkMetal,
    );

    const crumbMaterial = toonMaterial(0xe6b56f);
    for (let index = 0; index < 12; index++) {
      const crumb = new THREE.Mesh(
        new THREE.SphereGeometry(0.025 + (index % 3) * 0.009, 8, 6),
        crumbMaterial,
      );
      crumb.name = `CakeCrumb${index + 1}`;
      crumb.visible = false;
      crumb.userData.seed = index * 1.37;
      this.scene.add(crumb);
      this.crumbs.push(crumb);
    }
    this.splatCrumbs = this.crumbs.slice(1, 9);

    this.carriedSlices = [0, 1].map((index) => {
      const group = new THREE.Group();
      group.name = `CarriedCakeSlice${index + 1}`;
      const slice = new THREE.Mesh(
        new THREE.CylinderGeometry(0.19, 0.19, 0.12, 3),
        cakeMat,
      );
      slice.rotation.y = Math.PI / 2;
      group.add(slice);
      const icing = new THREE.Mesh(new THREE.CylinderGeometry(0.195, 0.195, 0.03, 3), icingMat);
      icing.position.y = 0.075;
      icing.rotation.y = Math.PI / 2;
      group.add(icing);
      group.visible = false;
      this.scene.add(group);
      return group;
    });
  }

  _buildMouseHole() {
    const black = new THREE.MeshBasicMaterial({ color: 0x101014 });
    const rimMat = toonMaterial(0x76503a);
    this.mouseHole = new THREE.Group();
    this.mouseHole.name = 'MouseHole';
    this.mouseHole.position.set(5.45, 0.02, -5.84);
    this.mouseHole.userData.interaction = 'jerry-exit';
    this.scene.add(this.mouseHole);

    const lower = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.36), black);
    lower.name = 'MouseHoleLower';
    lower.position.y = 0.18;
    this.mouseHole.add(lower);

    const arch = new THREE.Mesh(new THREE.CircleGeometry(0.36, 28, 0, Math.PI), black);
    arch.name = 'MouseHoleArch';
    arch.position.y = 0.36;
    this.mouseHole.add(arch);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.035, 8, 24, Math.PI), rimMat);
    rim.position.set(0, 0.36, 0.02);
    this.mouseHole.add(rim);
    for (const x of [-0.38, 0.38]) {
      const side = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.36, 8), rimMat);
      side.position.set(x, 0.18, 0.02);
      this.mouseHole.add(side);
    }
  }

  _buildKitchenDetails() {
    const shelfMat = toonMaterial(0x8b603d);
    const jarColors = [0xd4534b, 0xf0c75e, 0x70a7bb, 0x8fc36a];
    addBox(
      this.scene,
      'SpiceShelf',
      new THREE.Vector3(2.35, 0.10, 0.42),
      new THREE.Vector3(5.55, 2.25, -5.54),
      shelfMat,
    );
    for (let i = 0; i < jarColors.length; i++) {
      const jar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.15, 0.40, 12),
        toonMaterial(jarColors[i]),
      );
      jar.name = `SpiceJar${i + 1}`;
      jar.position.set(4.78 + i * 0.50, 2.50, -5.48);
      this.scene.add(jar);
      const lid = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.16, 0.055, 12),
        toonMaterial(0x4d5962),
      );
      lid.position.set(jar.position.x, 2.73, -5.48);
      this.scene.add(lid);
    }

    const pendantMat = toonMaterial(0xe14f45);
    for (const x of [-1.25, 1.25]) {
      const cord = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.018, 1.25, 8),
        toonMaterial(0x2a2d31),
      );
      cord.position.set(x, 4.75, -0.65);
      this.scene.add(cord);

      const shade = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.42, 18, 1, true), pendantMat);
      shade.name = `PendantLamp${x}`;
      shade.position.set(x, 4.08, -0.65);
      shade.rotation.x = Math.PI;
      this.scene.add(shade);

      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.10, 12, 8),
        new THREE.MeshBasicMaterial({ color: 0xffe5a8 }),
      );
      bulb.position.set(x, 3.96, -0.65);
      this.scene.add(bulb);
    }

    const clockFace = new THREE.Mesh(
      new THREE.CircleGeometry(0.43, 28),
      toonMaterial(0xfff7dc),
    );
    clockFace.name = 'MidnightClock';
    clockFace.position.set(-3.85, 3.85, -5.82);
    this.scene.add(clockFace);
    const clockRim = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.04, 8, 28), toonMaterial(0x39434a));
    clockRim.position.copy(clockFace.position);
    clockRim.position.z += 0.02;
    this.scene.add(clockRim);
    const hourHand = addBox(
      this.scene,
      'ClockHourHand',
      new THREE.Vector3(0.035, 0.25, 0.025),
      new THREE.Vector3(-3.85, 3.97, -5.75),
      toonMaterial(0x25282b),
      { castShadow: false },
    );
    hourHand.rotation.z = 0;
    const minuteHand = addBox(
      this.scene,
      'ClockMinuteHand',
      new THREE.Vector3(0.035, 0.34, 0.025),
      new THREE.Vector3(-3.85, 4.01, -5.73),
      toonMaterial(0x25282b),
      { castShadow: false },
    );
    minuteHand.rotation.z = 0;
  }

  _registerObstacles() {
    this.registerCameraObstacle({
      type: 'box',
      center: new THREE.Vector3(0, 0.72, -0.65),
      size: new THREE.Vector3(4.2, 1.45, 2.15),
    });
    this.registerCameraObstacle({
      type: 'box',
      center: new THREE.Vector3(-5.65, 1.83, -4.95),
      size: new THREE.Vector3(1.85, 3.75, 1.55),
    });
    this.registerCameraObstacle({
      type: 'box',
      center: new THREE.Vector3(0.8, 0.62, -5.0),
      size: new THREE.Vector3(8.7, 1.35, 1.55),
    });
    this.registerCameraObstacle({
      type: 'box',
      center: new THREE.Vector3(-2.5, 3.35, -5.62),
      size: new THREE.Vector3(2.1, 1.45, 0.60),
    });
    this.registerCameraObstacle({
      type: 'box',
      center: new THREE.Vector3(3.8, 3.35, -5.62),
      size: new THREE.Vector3(2.1, 1.45, 0.60),
    });
  }
}
