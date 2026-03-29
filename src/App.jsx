import React, { useState, useEffect, useRef } from 'react';
import { Shield, Info, RotateCcw, ChevronRight } from 'lucide-react';

// --- GAME CONSTANTS & CONFIGURATION ---
const GRID_W = 16;
const GRID_H = 12;
const CELL_SIZE = 40;
const HOME_POS = { x: 7, y: 5, w: 2, h: 2 }; // 2x2 home in the center

// Calculate distance from any tile to the closest edge of the 2x2 home
const getDistToHome = (x, y) => {
  const hx = Math.max(HOME_POS.x, Math.min(x, HOME_POS.x + 1));
  const hy = Math.max(HOME_POS.y, Math.min(y, HOME_POS.y + 1));
  return Math.max(Math.abs(x - hx), Math.abs(y - hy));
};

const ZONES = {
  ZONE_0: { radius: 1, color: 'bg-red-900/20', name: 'Zone 0 (0-5 ft)' },
  ZONE_1: { radius: 4, color: 'bg-orange-900/20', name: 'Zone 1 (5-30 ft)' },
  ZONE_2: { radius: Infinity, color: 'bg-green-900/20', name: 'Zone 2 (30-100 ft)' },
};

// Existing infrastructure (Driveway and Patio) shared across levels
const COMMON_INFRASTRUCTURE = [
  // Driveway (leads to bottom edge)
  {x: 7, y: 7, type: 'driveway'}, {x: 8, y: 7, type: 'driveway'},
  {x: 7, y: 8, type: 'driveway'}, {x: 8, y: 8, type: 'driveway'},
  {x: 7, y: 9, type: 'driveway'}, {x: 8, y: 9, type: 'driveway'},
  {x: 7, y: 10, type: 'driveway'}, {x: 8, y: 10, type: 'driveway'},
  {x: 7, y: 11, type: 'driveway'}, {x: 8, y: 11, type: 'driveway'},
  // Patio (back of the house)
  {x: 6, y: 4, type: 'patio'}, {x: 7, y: 4, type: 'patio'},
  {x: 8, y: 4, type: 'patio'}, {x: 9, y: 4, type: 'patio'}
];

const TOWER_TYPES = {
  SUCCULENT: {
    id: 'succulent',
    name: 'Fire-Resistant Succulent',
    cost: 30,
    hp: 100, // Takes damage as it extinguishes
    icon: '🪴',
    desc: 'High moisture sink. Extinguishes fire and embers that enter this specific tile.',
    placement: 'grid'
  },
  GRAVEL: {
    id: 'gravel',
    name: 'Gravel Buffer',
    cost: 15,
    hp: Infinity,
    icon: '🪨',
    desc: 'Non-combustible mulch. Slows down ground fires traversing this tile.',
    placement: 'grid'
  },
  WALL: {
    id: 'wall',
    name: 'Retaining Wall',
    cost: 40,
    hp: 150,
    icon: '🧱',
    desc: 'Disrupts paths. Completely blocks ground fires until destroyed.',
    placement: 'grid'
  },
  REMOVE: {
    id: 'remove',
    name: 'Clear Hazard',
    cost: 20,
    icon: '✂️',
    desc: 'Remove highly flammable Arborvitae/Junipers before fire reaches them.',
    placement: 'hazard'
  },
  GUTTERS: {
    id: 'gutters',
    name: 'Clean Gutters',
    cost: 40,
    icon: '🧹',
    desc: 'Structural Hardening: Clears debris. Adds +50 Max Integrity to the Home.',
    placement: 'home'
  },
  VENTS: {
    id: 'vents',
    name: '1/8" Mesh Vents',
    cost: 60,
    icon: '🪟',
    desc: 'Structural Hardening: Screens block embers. Reduces ember damage to the home by 60%.',
    placement: 'home'
  }
};

const LEVELS = [
  {
    id: 1,
    title: 'Level 1: The Basics of Zone 1',
    eduText: 'Ground fires are approaching! Place Succulents and Retaining Walls on the grid, and click the home to apply Gutter and Vent upgrades.',
    budget: 900,
    hazards: [],
    infrastructure: COMMON_INFRASTRUCTURE,
    waves: [
      { time: 1, count: 1 },
      { time: 8, count: 2 },
      { time: 16, count: 2 }
    ]
  },
  {
    id: 2,
    title: 'Level 2: The Airborne Threat',
    eduText: 'Active flames will occasionally launch Embers into the air that fly over walls straight to the house. Upgrade the home with Clean Gutters and Mesh Vents to survive!',
    budget: 1200,
    hazards: [],
    infrastructure: COMMON_INFRASTRUCTURE,
    waves: [
      { time: 1, count: 2 },
      { time: 10, count: 2 },
      { time: 18, count: 2 },
      { time: 26, count: 3 }
    ]
  },
  {
    id: 3,
    title: 'Level 3: Ladder Fuels',
    eduText: 'Junipers are highly flammable. If a ground fire touches one, it erupts into multiple deadly embers! Use the "Clear Hazard" tool to remove them during the build phase.',
    budget: 1500,
    hazards: [{x: 4, y: 3}, {x: 11, y: 3}, {x: 9, y: 9}, {x: 3, y: 8}, {x: 12, y: 7}],
    infrastructure: COMMON_INFRASTRUCTURE,
    waves: [
      { time: 1, count: 2 },
      { time: 10, count: 2 },
      { time: 18, count: 2 },
      { time: 25, count: 3 }
    ]
  },
  {
    id: 4,
    title: 'Level 4: Red Flag Warning',
    eduText: 'High winds and dry conditions. Fires move faster and spawn embers more frequently. Use a combination of Zone 0 Gravel, Zone 1 Succulents, and Structural Upgrades!',
    budget: 2400,
    hazards: [{x: 2, y: 2}, {x: 13, y: 2}, {x: 13, y: 9}, {x: 2, y: 9}, {x: 7, y: 2}, {x: 5, y: 10}],
    infrastructure: COMMON_INFRASTRUCTURE,
    speedMultiplier: 1.3,
    emberRate: 1.5,
    waves: [
      { time: 1, count: 2 },
      { time: 8, count: 2 },
      { time: 15, count: 3 },
      { time: 22, count: 3 },
      { time: 28, count: 3 }
    ]
  }
];

const MUSIC_LEVEL_CAP = 5;

function clampMusicLevel(levelId) {
  return Math.min(Math.max(levelId, 1), MUSIC_LEVEL_CAP);
}

function playSfxOneShot(src, volume = 0.65) {
  const a = new Audio(src);
  a.volume = volume;
  a.play().catch(() => {});
}

// --- MAIN COMPONENT ---
export default function App() {
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [gameState, setGameState] = useState('menu'); 
  const [selectedTool, setSelectedTool] = useState(null);
  const [mousePos, setMousePos] = useState({ x: -1, y: -1 });

  // Game Engine State (Refs for performance in animation loop)
  const engineRef = useRef({
    money: 0,
    homeHp: 100,
    homeMaxHp: 100,
    timeElapsed: 0,
    enemies: [],
    towers: [],
    hazards: [],
    infrastructure: [],
    upgrades: { gutters: false, vents: false },
    wavesSpawned: 0,
    level: null,
    lastTick: 0
  });

  const [renderTrigger, setRenderTrigger] = useState(0);
  const level = LEVELS[currentLevelIdx];

  const musicRef = useRef(null);
  const musicTrackKeyRef = useRef('');
  const fireSfxRef = useRef(null);
  const emberSfxRef = useRef(null);

  useEffect(() => {
    const fire = new Audio('/sfx/fire.wav');
    fire.loop = true;
    fire.volume = 0.38;
    const ember = new Audio('/sfx/embers.wav');
    ember.loop = true;
    ember.volume = 0.34;
    fireSfxRef.current = fire;
    emberSfxRef.current = ember;
    return () => {
      fire.pause();
      ember.pause();
      fireSfxRef.current = null;
      emberSfxRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (gameState !== 'playing') {
      fireSfxRef.current?.pause();
      emberSfxRef.current?.pause();
    }
  }, [gameState]);

  useEffect(() => {
    const el = new Audio();
    el.loop = true;
    el.volume = 0.55;
    musicRef.current = el;
    return () => {
      musicTrackKeyRef.current = '';
      el.pause();
      musicRef.current = null;
    };
  }, []);

  useEffect(() => {
    const el = musicRef.current;
    if (!el) return;

    let key;
    let src;
    if (gameState === 'menu') {
      key = 'main';
      src = '/music/main.ogg';
    } else if (gameState === 'playing') {
      const n = clampMusicLevel(level.id);
      key = `run-${n}`;
      src = `/music/run_${n}.ogg`;
    } else {
      const n = clampMusicLevel(level.id);
      key = `build-${n}`;
      src = `/music/build_${n}.ogg`;
    }

    if (musicTrackKeyRef.current === key) return;
    musicTrackKeyRef.current = key;
    el.src = src;
    el.load();
    el.play().catch(() => {});
  }, [gameState, level.id]);

  const initLevel = (lvlIdx) => {
    const lvl = LEVELS[lvlIdx];
    engineRef.current = {
      money: lvl.budget,
      homeHp: 100,
      homeMaxHp: 100,
      timeElapsed: 0,
      enemies: [],
      towers: [],
      hazards: [...lvl.hazards],
      infrastructure: lvl.infrastructure || [],
      upgrades: { gutters: false, vents: false },
      wavesSpawned: 0,
      level: lvl,
      lastTick: performance.now()
    };
    setCurrentLevelIdx(lvlIdx);
    setGameState('build');
    setSelectedTool(null);
    setRenderTrigger(val => val + 1);
  };

  useEffect(() => {
    let reqId;
    const tick = (currentTime) => {
      if (gameState !== 'playing') return;
      
      const engine = engineRef.current;
      const dt = (currentTime - engine.lastTick) / 1000; 
      engine.lastTick = currentTime;
      
      if (dt > 0.1) {
         reqId = requestAnimationFrame(tick);
         return;
      }

      engine.timeElapsed += dt;

      // Spawning Waves
      engine.level.waves.forEach((wave) => {
        if (engine.timeElapsed >= wave.time && !wave.spawned) {
          wave.spawned = true;
          engine.wavesSpawned++;
          
          const side = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
          
          for(let i = 0; i < wave.count; i++) {
            let sx, sy;
            // Spawn with a slight random spread along the chosen edge
            if(side === 0) { sx = Math.random() * (GRID_W - 2) + 1; sy = -0.5; }
            if(side === 1) { sx = GRID_W + 0.5; sy = Math.random() * (GRID_H - 2) + 1; }
            if(side === 2) { 
              sx = Math.random() * (GRID_W - 2) + 1; 
              // Prevent spawning directly below the driveway to avoid getting stuck
              while(sx > 5 && sx < 10) sx = Math.random() * (GRID_W - 2) + 1;
              sy = GRID_H + 0.5; 
            }
            if(side === 3) { sx = -0.5; sy = Math.random() * (GRID_H - 2) + 1; }
            
            engine.enemies.push({
              id: Math.random().toString(36).substring(2, 9),
              type: 'fire',
              x: sx, y: sy,
              hp: 100, maxHp: 100,
              speed: 1.2 * (engine.level.speedMultiplier || 1),
              emberCooldown: Math.random() * 4 + 3 // First ember in 3-7 seconds
            });
          }
        }
      });

      // Target center of home for movement
      const targetX = HOME_POS.x + 1;
      const targetY = HOME_POS.y + 1;

      // Enemies Logic
      for (let i = engine.enemies.length - 1; i >= 0; i--) {
        const e = engine.enemies[i];
        
        if (e.hp <= 0) {
          engine.money += (e.type === 'fire' ? 15 : 5); // Reward for extinguishing
          engine.enemies.splice(i, 1);
          continue;
        }

        const centerX = e.x + 0.5;
        const centerY = e.y + 0.5;

        // Home Collision
        const hx = Math.max(HOME_POS.x, Math.min(centerX, HOME_POS.x + 2));
        const hy = Math.max(HOME_POS.y, Math.min(centerY, HOME_POS.y + 2));
        const distToHome = Math.sqrt(Math.pow(centerX - hx, 2) + Math.pow(centerY - hy, 2));

        if (distToHome < 0.6) {
          let dmg = e.type === 'fire' ? 20 : 15;
          if (e.type === 'ember' && engine.upgrades.vents) dmg = 6; // Vents reduce ember damage
          
          engine.homeHp -= dmg;
          engine.enemies.splice(i, 1);
          continue;
        }

        // Grid interactions
        const cellX = Math.floor(centerX);
        const cellY = Math.floor(centerY);
        const cellTower = engine.towers.find(t => t.x === cellX && t.y === cellY);
        
        let speedMultiplier = 1;

        if (e.type === 'fire') {
          // Fire interacts with built defenses
          if (cellTower) {
            if (cellTower.type === 'gravel') {
              speedMultiplier = 0.4;
              e.hp -= 5 * dt; 
            } else if (cellTower.type === 'succulent') {
              speedMultiplier = 0.2;
              e.hp -= 60 * dt; // Extinguishes fire fast
              cellTower.hp -= 15 * dt; // Takes some damage
              if (cellTower.hp <= 0) engine.towers = engine.towers.filter(t => t.id !== cellTower.id);
            } 
          }

          // Hazard Ignition
          for (let j = engine.hazards.length - 1; j >= 0; j--) {
            const h = engine.hazards[j];
            if (Math.abs(centerX - (h.x + 0.5)) < 0.8 && Math.abs(centerY - (h.y + 0.5)) < 0.8) {
              // Ignite hazard!
              engine.hazards.splice(j, 1);
              // Spawn 3 embers instantly
              for(let k = 0; k < 3; k++) {
                engine.enemies.push({
                  id: Math.random().toString(),
                  type: 'ember',
                  x: h.x + Math.random() * 0.5 - 0.25, 
                  y: h.y + Math.random() * 0.5 - 0.25,
                  hp: 30, maxHp: 30, speed: 2.5
                });
              }
            }
          }

          // Periodic Ember Spawning from Fire
          e.emberCooldown -= dt * (engine.level.emberRate || 1);
          if (e.emberCooldown <= 0) {
            e.emberCooldown = Math.random() * 5 + 4; // Reset cooldown
            engine.enemies.push({
              id: Math.random().toString(),
              type: 'ember',
              x: e.x, y: e.y,
              hp: 30, maxHp: 30, speed: 2.5
            });
          }

        } else if (e.type === 'ember') {
          // Embers fly over walls/gravel, but succulents can intercept them
          if (cellTower && cellTower.type === 'succulent') {
            e.hp -= 100 * dt; // Dies very fast
            cellTower.hp -= 5 * dt;
            if (cellTower.hp <= 0) engine.towers = engine.towers.filter(t => t.id !== cellTower.id);
          }
        }

        // Movement with strict bounding box collision
        const dx = targetX - centerX;
        const dy = targetY - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 0) {
          let vx = (dx / dist) * e.speed * speedMultiplier * dt;
          let vy = (dy / dist) * e.speed * speedMultiplier * dt;

          if (e.type === 'fire') {
            const getHitSolid = (fx, fy) => {
              const MARGIN = 0.15; // Inner margin keeps visual sprite out of solid tiles
              const left = fx + MARGIN;
              const right = fx + 1 - MARGIN;
              const top = fy + MARGIN;
              const bottom = fy + 1 - MARGIN;
              
              for (let t of engine.towers) {
                if (t.type === 'wall' && left < t.x + 1 && right > t.x && top < t.y + 1 && bottom > t.y) return t;
              }
              for (let i of engine.infrastructure) {
                if ((i.type === 'driveway' || i.type === 'patio') && left < i.x + 1 && right > i.x && top < i.y + 1 && bottom > i.y) return i;
              }
              return null;
            };

            const damageSolid = (solid) => {
              if (solid.hp !== undefined) {
                solid.hp -= 25 * dt; // Deal damage to destructible walls
                if (solid.hp <= 0) {
                  engine.towers = engine.towers.filter(t => t.id !== solid.id);
                }
              }
            };

            // Test X Movement
            let solidX = getHitSolid(e.x + vx, e.y);
            if (solidX) {
              vx = 0; // Block X movement
              damageSolid(solidX);
              e.hp -= 40 * dt; // Fire burns out rapidly when blocked
            }

            // Test Y Movement
            let solidY = getHitSolid(e.x, e.y + vy);
            if (solidY) {
              vy = 0; // Block Y movement
              damageSolid(solidY);
              e.hp -= 40 * dt; // Fire burns out rapidly when blocked
            }
          }

          // Apply approved movement
          e.x += vx;
          e.y += vy;
        }
      }

      const fireSfx = fireSfxRef.current;
      const emberSfx = emberSfxRef.current;
      if (fireSfx && emberSfx) {
        const hasFireEnemy = engine.enemies.some((e) => e.type === 'fire');
        const hasEmberEnemy = engine.enemies.some((e) => e.type === 'ember');
        if (hasFireEnemy) {
          if (fireSfx.paused) fireSfx.play().catch(() => {});
        } else {
          fireSfx.pause();
        }
        if (hasEmberEnemy) {
          if (emberSfx.paused) emberSfx.play().catch(() => {});
        } else {
          emberSfx.pause();
        }
      }

      // Check win/loss
      if (engine.homeHp <= 0) {
        setGameState('lost');
        engine.level.waves.forEach(w => w.spawned = false); 
        return;
      }
      if (engine.wavesSpawned === engine.level.waves.length && engine.enemies.length === 0) {
        setGameState('won');
        engine.level.waves.forEach(w => w.spawned = false);
        return;
      }

      setRenderTrigger(val => val + 1);
      reqId = requestAnimationFrame(tick);
    };

    if (gameState === 'playing') {
      engineRef.current.lastTick = performance.now();
      reqId = requestAnimationFrame(tick);
    }
    return () => cancelAnimationFrame(reqId);
  }, [gameState]);

  const handleGridClick = (x, y) => {
    if ((gameState !== 'playing' && gameState !== 'build') || !selectedTool) return;
    const engine = engineRef.current;
    const tool = TOWER_TYPES[selectedTool];

    if (engine.money < tool.cost) return;

    const isHome = (x >= HOME_POS.x && x < HOME_POS.x + HOME_POS.w && y >= HOME_POS.y && y < HOME_POS.y + HOME_POS.h);
    const hasTower = engine.towers.some(t => t.x === x && t.y === y);
    const hasHazard = engine.hazards.some(h => h.x === x && h.y === y);
    const hasInfra = engine.infrastructure.some(i => i.x === x && i.y === y);

    if (selectedTool === 'REMOVE') {
      const hazardIdx = engine.hazards.findIndex(h => h.x === x && h.y === y);
      if (hazardIdx !== -1) {
        engine.hazards.splice(hazardIdx, 1);
        engine.money -= tool.cost;
        playSfxOneShot('/sfx/click.wav');
        setRenderTrigger(val => val + 1);
      }
      return;
    }

    if (tool.placement === 'home') {
      if (isHome) {
        if (selectedTool === 'GUTTERS' && !engine.upgrades.gutters) {
          engine.upgrades.gutters = true;
          engine.homeMaxHp += 50;
          engine.homeHp += 50;
          engine.money -= tool.cost;
          playSfxOneShot('/sfx/click.wav');
        } else if (selectedTool === 'VENTS' && !engine.upgrades.vents) {
          engine.upgrades.vents = true;
          engine.money -= tool.cost;
          playSfxOneShot('/sfx/click.wav');
        }
        setRenderTrigger(val => val + 1);
      }
      return;
    }

    if (tool.placement === 'grid') {
      // Prevent building on home, existing towers, hazards, and hard infrastructure
      if (!isHome && !hasTower && !hasHazard && !hasInfra) {
        engine.towers.push({
          id: Math.random().toString(),
          type: tool.id,
          x, y,
          hp: tool.hp
        });
        engine.money -= tool.cost;
        playSfxOneShot('/sfx/click.wav');
        setRenderTrigger(val => val + 1);
      }
    }
  };

  const engine = engineRef.current;

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 font-sans flex flex-col items-center py-8 select-none">
      
      <div className="w-full max-w-6xl flex justify-between items-center mb-6 px-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2 text-orange-400">
            <Shield className="w-8 h-8" /> Fire Defense
          </h1>
          <p className="text-neutral-400">Defensible Space Simulator</p>
        </div>
        {(gameState === 'playing' || gameState === 'build') && (
          <div className="flex gap-6 bg-neutral-800 p-4 rounded-xl border border-neutral-700 shadow-lg items-center">
            {gameState === 'build' ? (
              <div className="flex gap-3">
                <button 
                  onClick={() => initLevel(currentLevelIdx)}
                  className="bg-neutral-600 hover:bg-neutral-500 text-white font-bold py-2 px-4 rounded-lg shadow-lg flex items-center gap-2 transition-colors"
                  title="Reset Defenses"
                >
                  <RotateCcw className="w-4 h-4" /> Reset
                </button>
                <button 
                  onClick={() => setGameState('playing')}
                  className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-6 rounded-lg animate-pulse shadow-lg shadow-red-900/50"
                >
                  Start Fire
                </button>
              </div>
            ) : (
              <div className="text-red-400 font-bold px-4 flex items-center gap-2">
                🔥 Defending
              </div>
            )}
            <div className="w-px h-10 bg-neutral-700"></div>
            <div className="text-center">
              <div className="text-sm text-neutral-400 uppercase tracking-wide">Budget</div>
              <div className="text-2xl font-bold text-green-400">${Math.floor(engine.money)}</div>
            </div>
            <div className="text-center w-32">
              <div className="text-sm text-neutral-400 uppercase tracking-wide">Home Integrity</div>
              <div className="w-full bg-neutral-900 rounded-full h-3 mt-1 border border-neutral-600">
                <div 
                  className={`h-full rounded-full ${engine.homeHp > 50 ? 'bg-blue-500' : 'bg-red-500'}`} 
                  style={{width: `${Math.max(0, (engine.homeHp/engine.homeMaxHp)*100)}%`}}
                />
              </div>
              <div className="text-xs text-neutral-500 mt-1">{Math.max(0, Math.floor(engine.homeHp))} / {engine.homeMaxHp}</div>
            </div>
          </div>
        )}
      </div>

      {gameState === 'menu' && (
        <div className="bg-neutral-800 p-8 rounded-2xl max-w-2xl text-center border border-neutral-700 shadow-2xl mt-12">
          <h2 className="text-4xl font-bold mb-4 text-orange-400">Fire Defense</h2>
          <p className="text-lg text-neutral-300 mb-6 leading-relaxed">
            Wildfires spread through creeping ground flames and flying embers. 
            Protect the home by applying real-world fire resilience principles to the Home Ignition Zone (HIZ).
          </p>
          <div className="grid grid-cols-3 gap-4 mb-8 text-left">
            <div className="bg-neutral-700/50 p-4 rounded-lg">
              <span className="text-red-400 font-bold">Zone 0 (0-5 ft)</span><br/>
              <span className="text-sm text-neutral-300">Non-combustible area. Use gravel and wall barriers.</span>
            </div>
            <div className="bg-neutral-700/50 p-4 rounded-lg">
              <span className="text-orange-400 font-bold">Zone 1 (5-30 ft)</span><br/>
              <span className="text-sm text-neutral-300">Lean, clean, green. High-moisture succulents intercept fire.</span>
            </div>
            <div className="bg-neutral-700/50 p-4 rounded-lg">
              <span className="text-blue-400 font-bold">The Home</span><br/>
              <span className="text-sm text-neutral-300">Clean gutters and install mesh vents to survive embers.</span>
            </div>
          </div>
          <button 
            onClick={() => initLevel(0)}
            className="bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 px-8 rounded-full text-lg transition-transform hover:scale-105"
          >
            Start Campaign
          </button>
        </div>
      )}

      {(gameState === 'playing' || gameState === 'build' || gameState === 'won' || gameState === 'lost') && (
        <div className="flex w-full max-w-7xl gap-6 px-4">
          
          <div className="flex-1">
            <div className="bg-neutral-800 rounded-2xl p-4 border border-neutral-700 shadow-xl relative">
              
              <div className="bg-blue-900/30 border border-blue-500/30 text-blue-200 p-3 rounded-lg mb-4 flex items-start gap-3">
                <Info className="w-5 h-5 shrink-0 mt-0.5 text-blue-400" />
                <div>
                  <div className="font-bold text-blue-300">{level.title}</div>
                  <div className="text-sm">{level.eduText}</div>
                </div>
              </div>

              <div 
                className="relative bg-neutral-900 border-2 border-neutral-700 rounded overflow-hidden shadow-inner cursor-crosshair"
                style={{ width: GRID_W * CELL_SIZE, height: GRID_H * CELL_SIZE, margin: '0 auto' }}
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setMousePos({
                    x: Math.floor((e.clientX - rect.left) / CELL_SIZE),
                    y: Math.floor((e.clientY - rect.top) / CELL_SIZE)
                  });
                }}
                onMouseLeave={() => setMousePos({x:-1, y:-1})}
              >
                {/* Concentric Zone Backgrounds & Infrastructure */}
                {Array.from({ length: GRID_W }).map((_, x) => 
                  Array.from({ length: GRID_H }).map((_, y) => {
                    const dist = getDistToHome(x, y);
                    let color = ZONES.ZONE_2.color;
                    if (dist <= ZONES.ZONE_0.radius) color = ZONES.ZONE_0.color;
                    else if (dist <= ZONES.ZONE_1.radius) color = ZONES.ZONE_1.color;
                    
                    const infra = engine.infrastructure?.find(i => i.x === x && i.y === y);
                    let infraClasses = '';
                    if (infra) {
                      if (infra.type === 'driveway') infraClasses = 'bg-zinc-600 border-zinc-800 border-2 opacity-100 shadow-sm z-0';
                      if (infra.type === 'patio') infraClasses = 'bg-stone-500/80 border-stone-600/50 border z-0';
                    }

                    return (
                      <div 
                        key={`bg-${x}-${y}`} 
                        className={`absolute border border-black/10 ${color} ${infraClasses}`} 
                        style={{ left: x * CELL_SIZE, top: y * CELL_SIZE, width: CELL_SIZE, height: CELL_SIZE }} 
                      />
                    );
                  })
                )}

                {/* Grid Lines & Interactive Highlights */}
                {Array.from({ length: GRID_W }).map((_, x) => 
                  Array.from({ length: GRID_H }).map((_, y) => {
                    const hasTower = engine.towers.some(t => t.x === x && t.y === y);
                    const hasHazard = engine.hazards.some(h => h.x === x && h.y === y);
                    const hasInfra = engine.infrastructure.some(i => i.x === x && i.y === y);
                    const isHome = (x >= HOME_POS.x && x < HOME_POS.x + HOME_POS.w && y >= HOME_POS.y && y < HOME_POS.y + HOME_POS.h);
                    
                    let isValid = false;
                    let isInvalid = false;
                    
                    if (selectedTool) {
                      const tool = TOWER_TYPES[selectedTool];
                      const canAfford = engine.money >= tool.cost;
                      
                      if (selectedTool === 'REMOVE') {
                        isValid = hasHazard && canAfford;
                      } else if (tool.placement === 'home') {
                        isValid = isHome && canAfford;
                        if (isHome) {
                          if (selectedTool === 'GUTTERS' && engine.upgrades.gutters) isInvalid = true;
                          if (selectedTool === 'VENTS' && engine.upgrades.vents) isInvalid = true;
                          if (isInvalid) isValid = false;
                        }
                      } else if (tool.placement === 'grid') {
                        if (!isHome && !hasTower && !hasHazard && !hasInfra && canAfford) isValid = true;
                      }
                      if (!isValid && mousePos.x === x && mousePos.y === y) isInvalid = true;
                    }

                    return (
                      <div 
                        key={`${x}-${y}`}
                        onClick={() => handleGridClick(x, y)}
                        className={`absolute border border-neutral-800/50 transition-colors duration-200
                          ${isValid ? 'bg-green-500/30 border-green-400 cursor-pointer z-20 hover:bg-green-400/50 shadow-[inset_0_0_15px_rgba(74,222,128,0.3)]' : ''}
                          ${isInvalid ? 'cursor-not-allowed bg-red-500/20 z-20' : ''}
                        `}
                        style={{ left: x*CELL_SIZE, top: y*CELL_SIZE, width: CELL_SIZE, height: CELL_SIZE }}
                      />
                    );
                  })
                )}

                {/* The Home Structure (2x2) - pointer-events-none ensures grid clicks work underneath */}
                <div 
                  className="absolute bg-neutral-800 border-4 border-neutral-700 rounded-md flex flex-col items-center justify-center drop-shadow-xl z-10 pointer-events-none"
                  style={{ left: HOME_POS.x*CELL_SIZE, top: HOME_POS.y*CELL_SIZE, width: HOME_POS.w*CELL_SIZE, height: HOME_POS.h*CELL_SIZE }}
                >
                  <span className="text-4xl mb-1">🏠</span>
                  <div className="flex gap-1">
                    {engine.upgrades.gutters && <span className="text-xs bg-blue-900/50 border border-blue-500 px-1 rounded text-blue-200" title="Clean Gutters">🧹</span>}
                    {engine.upgrades.vents && <span className="text-xs bg-purple-900/50 border border-purple-500 px-1 rounded text-purple-200" title="Mesh Vents">🪟</span>}
                  </div>
                </div>

                {/* Hazards */}
                {engine.hazards.map((h, i) => (
                  <div key={`haz-${i}`} className="absolute text-3xl flex items-center justify-center animate-pulse z-10 pointer-events-none"
                       style={{ left: h.x*CELL_SIZE, top: h.y*CELL_SIZE, width: CELL_SIZE, height: CELL_SIZE }}>
                    🌲
                  </div>
                ))}

                {/* Towers */}
                {engine.towers.map(t => (
                  <div key={t.id} className="absolute text-2xl flex items-center justify-center z-10 pointer-events-none"
                       style={{ left: t.x*CELL_SIZE, top: t.y*CELL_SIZE, width: CELL_SIZE, height: CELL_SIZE }}>
                    {TOWER_TYPES[t.type.toUpperCase()].icon}
                    {t.hp < TOWER_TYPES[t.type.toUpperCase()].hp && (
                      <div className="absolute bottom-1 w-3/4 h-1 bg-red-900/80 rounded overflow-hidden">
                        <div className="h-full bg-green-500" style={{width: `${(t.hp/TOWER_TYPES[t.type.toUpperCase()].hp)*100}%`}}/>
                      </div>
                    )}
                  </div>
                ))}

                {/* Enemies */}
                {engine.enemies.map(e => (
                  <div key={e.id} className="absolute flex flex-col items-center justify-center transition-transform duration-75 z-20 pointer-events-none"
                       style={{ transform: `translate(${e.x*CELL_SIZE}px, ${e.y*CELL_SIZE}px)`, width: CELL_SIZE, height: CELL_SIZE }}>
                    <div className={`text-2xl ${e.type === 'ember' ? 'animate-bounce drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]' : 'drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]'}`}>
                      {e.type === 'fire' ? '🔥' : '✨'}
                    </div>
                    <div className="w-6 h-1 bg-neutral-900 rounded-full mt-1 border border-neutral-700 overflow-hidden">
                      <div className={`h-full ${e.type === 'fire' ? 'bg-orange-500' : 'bg-yellow-400'}`} style={{width: `${(e.hp/e.maxHp)*100}%`}}/>
                    </div>
                  </div>
                ))}

              </div>
              
              {/* Legend */}
              <div className="flex justify-center gap-6 text-sm text-neutral-300 mt-4">
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-900/60 rounded-sm border border-red-500/50"></div> Zone 0: Non-Combustible</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-orange-900/60 rounded-sm border border-orange-500/50"></div> Zone 1: Lean & Green</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-900/60 rounded-sm border border-green-500/50"></div> Zone 2: Reduce Fuel</div>
              </div>

            </div>
          </div>

          <div className="w-80 flex flex-col gap-4">
            <div className="bg-neutral-800 rounded-2xl p-4 border border-neutral-700 shadow-xl flex-1 overflow-y-auto max-h-[80vh]">
              <h3 className="text-xl font-bold mb-3 border-b border-neutral-700 pb-2">Defenses</h3>
              
              {gameState === 'build' && (
                <div className="mb-4 bg-blue-900/30 text-blue-300 p-3 rounded-lg text-sm border border-blue-800/50 flex gap-2 items-start">
                  <Info className="w-4 h-4 mt-0.5 shrink-0" />
                  <p><strong>Build Phase:</strong> Prepare defenses. Flames approach from random edges!</p>
                </div>
              )}
              
              <div className="space-y-2">
                {Object.values(TOWER_TYPES).map(tool => {
                  let isAffordable = engine.money >= tool.cost;
                  
                  // Check if home upgrades are already maxed
                  if (tool.id === 'gutters' && engine.upgrades.gutters) isAffordable = false;
                  if (tool.id === 'vents' && engine.upgrades.vents) isAffordable = false;

                  const isSelected = selectedTool === tool.id.toUpperCase();
                  const isDisabled = !isAffordable || (gameState !== 'playing' && gameState !== 'build');
                  
                  return (
                    <button
                      key={tool.id}
                      onClick={() => setSelectedTool(isSelected ? null : tool.id.toUpperCase())}
                      disabled={isDisabled}
                      className={`w-full text-left p-3 rounded-xl border-2 transition-all flex flex-col gap-1
                        ${isDisabled ? 'opacity-40 border-neutral-700 bg-neutral-800 cursor-not-allowed' : 
                          isSelected ? 'border-orange-500 bg-orange-900/20 shadow-[0_0_15px_rgba(249,115,22,0.2)]' : 'border-neutral-600 bg-neutral-700 hover:border-neutral-500 hover:bg-neutral-600'}`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="font-bold flex items-center gap-2 text-sm">
                          <span className="text-xl">{tool.icon}</span> {tool.name}
                        </span>
                        <span className={`font-mono font-bold text-sm ${isAffordable ? 'text-green-400' : 'text-neutral-500'}`}>${tool.cost}</span>
                      </div>
                      <div className="text-xs text-neutral-400 leading-tight">
                        {tool.desc}
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="mt-6 bg-neutral-900 p-3 rounded-xl border border-neutral-700">
                <h4 className="font-bold text-xs text-neutral-400 uppercase mb-2">Enemy Legend</h4>
                <div className="text-xs space-y-2">
                  <div className="flex items-center gap-2"><span>🔥</span> <strong>Ground Fire:</strong> Creeps towards home.</div>
                  <div className="flex items-center gap-2"><span>✨</span> <strong>Ember:</strong> Flies over grid defenses. Spawns from flames.</div>
                  <div className="flex items-center gap-2"><span>🌲</span> <strong>Ladder Fuel:</strong> Hazard! Spawns embers if ignited.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OVERLAYS */}
      {gameState === 'lost' && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-neutral-800 p-8 rounded-2xl max-w-md text-center border border-red-500 shadow-2xl">
            <h2 className="text-4xl font-bold text-red-500 mb-4">Structure Lost!</h2>
            <p className="text-neutral-300 mb-6">The fire breached your defensible space. Remember to harden the home with vents/gutters and clear ladder fuels.</p>
            <button 
              onClick={() => initLevel(currentLevelIdx)}
              className="bg-neutral-700 hover:bg-neutral-600 text-white font-bold py-3 px-8 rounded-full flex items-center justify-center gap-2 w-full"
            >
              <RotateCcw className="w-5 h-5" /> Try Again
            </button>
          </div>
        </div>
      )}

      {gameState === 'won' && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-neutral-800 p-8 rounded-2xl max-w-md text-center border border-green-500 shadow-2xl">
            <h2 className="text-4xl font-bold text-green-500 mb-4">Structure Saved!</h2>
            <p className="text-neutral-300 mb-6">Excellent firescaping! You successfully managed the vegetation and materials to deprive the fire of fuel.</p>
            
            {currentLevelIdx < LEVELS.length - 1 ? (
              <button 
                onClick={() => initLevel(currentLevelIdx + 1)}
                className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-8 rounded-full flex items-center justify-center gap-2 w-full"
              >
                Next Level <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <div className="bg-blue-900/40 border border-blue-500 p-4 rounded-xl">
                <h3 className="text-xl font-bold text-blue-300 mb-2">Campaign Complete!</h3>
                <p className="text-sm text-blue-200">You are now ready to apply these defensible space principles to your actual property. Check local resources for a free assessment!</p>
                <button 
                  onClick={() => setGameState('menu')}
                  className="mt-4 bg-neutral-700 hover:bg-neutral-600 text-white font-bold py-2 px-6 rounded-full w-full"
                >
                  Return to Menu
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}