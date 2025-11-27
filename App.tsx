import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GamePhase, Player, Enemy, LogEntry, TileType, Position, MapEntity, Quest } from './types';
import { generateStoryIntro, generateMonster, generateEndingStory, getMonsterEmoji } from './services/geminiService';
import { playMoveSound, playBumpSound, playAttackSound, playDamageSound, playHealSound, playGoldSound, playLevelUpSound, playStartSound, playRunSound, playSelectSound } from './services/soundService';
import { Button } from './components/Button';
import { ProgressBar } from './components/ProgressBar';

// --- Map Configuration ---
const MAP_WIDTH = 60;
const MAP_HEIGHT = 40;
const VIEWPORT_WIDTH = 13;
const VIEWPORT_HEIGHT = 9;

// --- Town Configuration ---
const TOWN_WIDTH = 15;
const TOWN_HEIGHT = 11;

type Language = 'en' | 'ko';

interface CombatEffect {
  id: number;
  text: string;
  x: number; // percentage relative to container
  y: number; // percentage
  color: string;
  size: string;
}

const TRANSLATIONS = {
  en: {
    summoning: "Summoning...",
    enterWorld: "Enter World",
    idLabel: "Adventurer ID",
    pwLabel: "Password",
    title: "Isekai Chronicles",
    introTitle: "The Summoning",
    beginBtn: "Begin Adventure",
    move: "MOVE",
    townWelcome: "You entered the Town.",
    leaveBtn: "Depart Town",
    townTitle: "Town Square",
    hp: "HP",
    gold: "Gold",
    attack: "ATTACK",
    run: "Run Away",
    healBtn: "Heal",
    victory: "Victory!",
    gameOver: "Game Over",
    playAgain: "Play Again",
    tryAgain: "Try Again",
    logTown: "Entered Town.",
    logLeave: "Returned to the wild.",
    logRun: "You ran away safely!",
    logRunFail: "Failed to escape!",
    logDie: "You have fallen...",
    logStart: (name: string) => `Welcome, ${name}. Arrow keys to move, 'A' to interact.`,
    bossName: "Demon King",
    bossEncounter: "You face the Demon King!",
    monsterEncounter: (name: string) => `You encountered a ${name}!`,
    hitEnemy: (name: string, dmg: number) => `You hit ${name} for ${dmg} dmg!`,
    hitPlayer: (name: string, dmg: number) => `${name} hits you for ${dmg} dmg!`,
    levelUp: (lv: number) => `LEVEL UP! You are now level ${lv}.`,
    msgHealFull: "Health is full.",
    msgNoPotion: "No potions left!",
    msgBought: "Item purchased!",
    msgNoGold: "Not enough Gold.",
    healed: (amt: number) => `Recovered ${amt} HP!`,
    logHeal: (amt: number) => `Used potion. +${amt} HP.`,
    victoryMsg: (exp: number, gold: number) => `Victory! +${exp} EXP, +${gold} G.`,
    questComplete: (gold: number) => `Quest Complete! Received ${gold} Gold!`,
    questProgress: (cur: number, req: number) => `Quest: ${cur}/${req}`,
    shopTitle: "General Store",
    guildTitle: "Adventurer's Guild",
    acceptQuest: "Accept Quest",
    currentQuest: "Current Quest",
    noQuest: "No Active Quest",
    shopWelcome: "Welcome! What do you need?",
    guildWelcome: "Looking for work, adventurer?",
    itemPotion: "Health Potion (50G)",
    itemSword: "Sharpen Sword (+2 Atk) (100G)",
    monsterNames: {
        slime: "Slime",
        goblin: "Goblin",
        wolf: "Dire Wolf",
        skeleton: "Skeleton Warrior",
        worm: "Sand Worm",
        boss: "Demon King"
    },
    actionAttack: "Attack (A)",
    msgNoEnemy: "There is nothing to attack here.",
    msgEnemyNear: "An enemy is nearby! Press 'A' to fight.",
    saveAndLogout: "Save & Logout",
    msgSaved: "Game saved. Logging out...",
    msgLoadFail: "Incorrect Password!",
    msgLoaded: "Game loaded successfully."
  },
  ko: {
    summoning: "소환 중...",
    enterWorld: "이세계 입장",
    idLabel: "모험가 ID",
    pwLabel: "비밀번호",
    title: "이세계 연대기",
    introTitle: "소환",
    beginBtn: "모험 시작",
    move: "이동",
    townWelcome: "마을에 입장했습니다.",
    leaveBtn: "마을 떠나기",
    townTitle: "마을 광장",
    hp: "체력",
    gold: "골드",
    attack: "공격",
    run: "도망가기",
    healBtn: "회복",
    victory: "승리!",
    gameOver: "게임 오버",
    playAgain: "다시 하기",
    tryAgain: "다시 시도",
    logTown: "마을에 들어왔습니다.",
    logLeave: "마을 밖으로 나갑니다.",
    logRun: "무사히 도망쳤습니다!",
    logRunFail: "도망치는데 실패했습니다!",
    logDie: "쓰러졌습니다...",
    logStart: (name: string) => `${name}님 환영합니다. 방향키로 이동, 'A'키로 상호작용.`,
    bossName: "마왕",
    bossEncounter: "마왕이 나타났습니다!",
    monsterEncounter: (name: string) => `${name}이(가) 나타났습니다!`,
    hitEnemy: (name: string, dmg: number) => `${name}에게 ${dmg}의 피해!`,
    hitPlayer: (name: string, dmg: number) => `${name}에게 ${dmg}의 피해를 입음!`,
    levelUp: (lv: number) => `레벨 업! 현재 레벨: ${lv}.`,
    msgHealFull: "체력이 가득 찼습니다.",
    msgNoPotion: "포션이 없습니다!",
    msgBought: "구매 완료!",
    msgNoGold: "골드가 부족합니다.",
    healed: (amt: number) => `체력이 ${amt} 회복되었습니다!`,
    logHeal: (amt: number) => `포션 사용. 체력 +${amt}.`,
    victoryMsg: (exp: number, gold: number) => `승리! 경험치 ${exp}, 골드 ${gold} 획득.`,
    questComplete: (gold: number) => `의뢰 완료! 보상으로 ${gold} 골드를 받았습니다!`,
    questProgress: (cur: number, req: number) => `의뢰 진행: ${cur}/${req}`,
    shopTitle: "잡화점",
    guildTitle: "모험가 길드",
    acceptQuest: "의뢰 수락",
    currentQuest: "현재 의뢰",
    noQuest: "진행 중인 의뢰 없음",
    shopWelcome: "어서오게! 무엇이 필요한가?",
    guildWelcome: "일거리를 찾고 있나?",
    itemPotion: "회복 포션 (50G)",
    itemSword: "무기 강화 (+2 공격력) (100G)",
    monsterNames: {
        slime: "슬라임",
        goblin: "고블린",
        wolf: "다이어 울프",
        skeleton: "해골 전사",
        worm: "샌드 웜",
        boss: "마왕"
    },
    actionAttack: "공격 (A)",
    msgNoEnemy: "공격할 대상이 없습니다.",
    msgEnemyNear: "적과 마주쳤습니다! 'A'키를 눌러 전투하세요.",
    saveAndLogout: "저장 & 종료",
    msgSaved: "저장되었습니다. 로그아웃 중...",
    msgLoadFail: "비밀번호가 틀렸습니다!",
    msgLoaded: "게임을 불러왔습니다."
  }
};

// Helper to create a larger, zoned map
const generateMap = (): TileType[][] => {
  const map: TileType[][] = Array(MAP_HEIGHT).fill(null).map(() => Array(MAP_WIDTH).fill(TileType.GRASS));

  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      // Borders
      if (x === 0 || x === MAP_WIDTH - 1 || y === 0 || y === MAP_HEIGHT - 1) {
        map[y][x] = TileType.WATER;
        continue;
      }

      // Zone 5: Snow (Top Left)
      if (x < 25 && y < 15) {
         map[y][x] = TileType.SNOW;
         if (Math.random() < 0.05) map[y][x] = TileType.TREE; // Pine trees visually
      }
      
      // Zone 2: Forest (Top Right)
      else if (x > 25 && y < 20) {
        map[y][x] = TileType.FOREST;
        if (Math.random() < 0.15) map[y][x] = TileType.TREE;
      }

      // Zone 3: Sand/Wasteland (Bottom Left)
      else if (x < 30 && y >= 20) {
        map[y][x] = TileType.SAND;
        if (Math.random() < 0.05) map[y][x] = TileType.MOUNTAIN;
      }

      // Zone 4: Dungeon Area (Bottom Right)
      else if (x >= 30 && y >= 20) {
        map[y][x] = TileType.DUNGEON_FLOOR;
        if (Math.random() < 0.1) map[y][x] = TileType.MOUNTAIN; // Walls inside dungeon
      }
      
      // Random obstacles in Grass (Default)
      else {
         if (Math.random() < 0.05) map[y][x] = TileType.TREE;
         if (Math.random() < 0.02) map[y][x] = TileType.WATER; // Ponds
      }
    }
  }

  // River dividing Left and Right
  for(let y=0; y<MAP_HEIGHT; y++) {
     // Freeze river in snow zone
     if (y < 15) {
         map[y][25] = TileType.ICE;
         map[y][26] = TileType.ICE;
     } else {
         map[y][25] = TileType.WATER;
         map[y][26] = TileType.WATER;
     }
  }

  // Bridges
  map[10][25] = TileType.BRIDGE; map[10][26] = TileType.BRIDGE;
  map[30][25] = TileType.SAND; map[30][26] = TileType.DUNGEON_FLOOR;

  // Paths
  // Town (3,3) to Bridge (25, 10)
  // Simple diagonal drawing
  let cx = 3, cy = 3;
  while(cx < 25) {
      cx++;
      if (cy < 10 && cx % 3 === 0) cy++;
      if (map[cy][cx] !== TileType.WATER && map[cy][cx] !== TileType.BRIDGE && map[cy][cx] !== TileType.ICE) {
         map[cy][cx] = TileType.DIRT_PATH;
      }
  }

  // Bridge (26, 10) to Dungeon Deep (45, 30)
  cx = 26; cy = 10;
  while(cy < 30) {
      if (Math.random() > 0.3) cy++;
      if (Math.random() > 0.3) cx++;
      cx = Math.min(cx, MAP_WIDTH-2);
      cy = Math.min(cy, MAP_HEIGHT-2);
       if (map[cy][cx] !== TileType.WATER && map[cy][cx] !== TileType.BRIDGE && map[cy][cx] !== TileType.ICE) {
         map[cy][cx] = TileType.DIRT_PATH;
      }
  }

  // Lava around Boss
  const bossX = MAP_WIDTH - 3;
  const bossY = MAP_HEIGHT - 3;
  for(let y=bossY-2; y<=bossY+2; y++) {
      for(let x=bossX-2; x<=bossX+2; x++) {
          if (x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT) {
              if (Math.random() < 0.4) map[y][x] = TileType.LAVA;
          }
      }
  }

  // Place Town (Single Tile Entrance)
  map[3][3] = TileType.TOWN;

  // Boss Floor Decoration
  map[bossY][bossX] = TileType.BOSS_FLOOR;

  return map;
};

// Town Map Layout
const generateTownMap = (): TileType[][] => {
    const map: TileType[][] = Array(TOWN_HEIGHT).fill(null).map(() => Array(TOWN_WIDTH).fill(TileType.TOWN_FLOOR));
    
    // Walls
    for(let y=0; y<TOWN_HEIGHT; y++) {
        for(let x=0; x<TOWN_WIDTH; x++) {
            if (x===0 || x===TOWN_WIDTH-1 || y===0 || y===TOWN_HEIGHT-1) {
                map[y][x] = TileType.TOWN_WALL;
            }
        }
    }

    // Buildings
    // Shop Top Left
    map[2][2] = TileType.SHOP;
    map[2][3] = TileType.SHOP; 
    
    // Guild Top Right
    map[2][TOWN_WIDTH-3] = TileType.GUILD;
    map[2][TOWN_WIDTH-4] = TileType.GUILD;

    // Fountain Center
    map[5][7] = TileType.FOUNTAIN;

    // Exit Bottom
    map[TOWN_HEIGHT-1][7] = TileType.TOWN_EXIT;
    
    return map;
};

// Generate initial visible enemies on the map
const spawnEnemies = (map: TileType[][], lang: Language): MapEntity[] => {
    const entities: MapEntity[] = [];
    let idCounter = 0;
    const t = TRANSLATIONS[lang].monsterNames;

    const addEntity = (x: number, y: number, type: MapEntity['type'], name: string, zone: string, isBoss: boolean = false) => {
        entities.push({
            id: `enemy-${idCounter++}`,
            position: { x, y },
            type,
            name,
            emoji: getMonsterEmoji(name, isBoss),
            zone,
            isBoss
        });
    };

    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            const tile = map[y][x];
            
            // Skip safe zones and walls
            if (tile === TileType.TOWN || tile === TileType.WATER || tile === TileType.TREE || tile === TileType.MOUNTAIN || tile === TileType.LAVA || tile === TileType.ICE) continue;
            // Skip start area
            if (x < 8 && y < 8) continue;

            // Boss
            if (tile === TileType.BOSS_FLOOR) {
                addEntity(x, y, 'BOSS', t.boss, 'DUNGEON', true);
                continue;
            }

            // Random Spawns
            const rand = Math.random();
            if (tile === TileType.GRASS && rand < 0.02) {
                addEntity(x, y, 'SLIME', t.slime, 'GRASS');
            } else if (tile === TileType.FOREST && rand < 0.04) {
                addEntity(x, y, rand < 0.5 ? 'WOLF' : 'GOBLIN', rand < 0.5 ? t.wolf : t.goblin, 'FOREST');
            } else if (tile === TileType.SAND && rand < 0.03) {
                 addEntity(x, y, 'UNKNOWN', t.worm, 'SAND');
            } else if (tile === TileType.DUNGEON_FLOOR && rand < 0.05) {
                 addEntity(x, y, 'SKELETON', t.skeleton, 'DUNGEON');
            } else if (tile === TileType.SNOW && rand < 0.03) {
                 // Reuse Wolf as Snow Wolf
                 addEntity(x, y, 'WOLF', t.wolf, 'SNOW');
            }
        }
    }
    return entities;
};

const INITIAL_PLAYER: Player = {
  name: '',
  level: 1,
  hp: 100,
  maxHp: 100,
  atk: 10,
  exp: 0,
  maxExp: 100,
  gold: 10, 
  potions: 0,
  position: { x: 3, y: 4 }, // Start near town
  activeQuest: null
};

const App: React.FC = () => {
  // State
  const [language, setLanguage] = useState<Language>('en');
  const [phase, setPhase] = useState<GamePhase>(GamePhase.LOGIN);
  const [player, setPlayer] = useState<Player>(INITIAL_PLAYER);
  const [enemy, setEnemy] = useState<Enemy | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [storyText, setStoryText] = useState('');
  
  // Map State
  const mapRef = useRef<TileType[][]>(generateMap());
  const townMapRef = useRef<TileType[][]>(generateTownMap());
  const [mapEntities, setMapEntities] = useState<MapEntity[]>([]);
  const lastProcessedPos = useRef<Position>(INITIAL_PLAYER.position);

  // Town System State
  const [inTown, setInTown] = useState(false);
  const [worldPos, setWorldPos] = useState<Position>({ x: 3, y: 4 });
  const [showShop, setShowShop] = useState(false);
  const [showGuild, setShowGuild] = useState(false);
  const [potentialQuest, setPotentialQuest] = useState<Quest | null>(null);
  const [fledEnemyId, setFledEnemyId] = useState<string | null>(null);

  // Combat Visuals State
  const [combatEffects, setCombatEffects] = useState<CombatEffect[]>([]);
  const [enemyAnim, setEnemyAnim] = useState('');
  const [playerAnim, setPlayerAnim] = useState('');
  const [showSlash, setShowSlash] = useState(false);

  // Login Form State
  const [loginId, setLoginId] = useState('');
  const [loginPw, setLoginPw] = useState('');

  const logsEndRef = useRef<HTMLDivElement>(null);
  const combatLogRef = useRef<HTMLDivElement>(null);
  
  const t = TRANSLATIONS[language];

  // Initialize Map Entities once
  useEffect(() => {
     setMapEntities(spawnEnemies(mapRef.current, 'en'));
  }, []);
  
  // Update entities name when language changes
  useEffect(() => {
    if (phase === GamePhase.LOGIN) {
        setMapEntities(spawnEnemies(mapRef.current, language));
    }
  }, [language, phase]);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    combatLogRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, phase]);

  // Helper: Add Log
  const addLog = (text: string, type: LogEntry['type'] = 'info') => {
    const id = Math.random().toString(36).substring(7);
    setLogs(prev => [...prev.slice(-19), { id, text, type }]);
  };

  // Helper: Visual Effects
  const triggerCombatEffect = (type: 'damageEnemy' | 'damagePlayer' | 'heal' | 'miss' | 'crit', value?: number) => {
      const id = Date.now();
      let effect: CombatEffect | null = null;

      if (type === 'damageEnemy') {
          // Shake Enemy
          setEnemyAnim('animate-shake');
          setTimeout(() => setEnemyAnim(''), 400);
          effect = { 
              id, 
              text: `-${value}`, 
              x: 50, y: 30, 
              color: 'text-yellow-400', 
              size: 'text-4xl' 
          };
      } else if (type === 'crit') {
          // Shake + Big Text
          setEnemyAnim('animate-shake');
          setTimeout(() => setEnemyAnim(''), 400);
          effect = { 
              id, 
              text: `CRITICAL! -${value}`, 
              x: 50, y: 25, 
              color: 'text-orange-500', 
              size: 'text-5xl font-black drop-shadow-xl' 
          };
      } else if (type === 'miss') {
          effect = { 
              id, 
              text: "MISS", 
              x: 50, y: 35, 
              color: 'text-slate-500', 
              size: 'text-3xl font-bold' 
          };
      } else if (type === 'damagePlayer') {
          // Flash Screen Red
          setPlayerAnim('animate-flash-red');
          setTimeout(() => setPlayerAnim(''), 500);
          effect = { 
              id, 
              text: `-${value}`, 
              x: 50, y: 70, 
              color: 'text-red-600', 
              size: 'text-5xl font-bold' 
          };
      } else if (type === 'heal') {
          // Flash Screen Green
          setPlayerAnim('animate-flash-green');
          setTimeout(() => setPlayerAnim(''), 500);
          effect = { 
              id, 
              text: `+${value}`, 
              x: 50, y: 65, 
              color: 'text-green-400', 
              size: 'text-4xl' 
          };
      }

      if (effect) {
          setCombatEffects(prev => [...prev, effect!]);
          setTimeout(() => {
              setCombatEffects(prev => prev.filter(e => e.id !== id));
          }, 800);
      }
  };

  // --- Interaction Logic ---
  
  const checkForInteraction = useCallback(() => {
      if (inTown) return; // No combat inside town for now

      const { x, y } = player.position;
      const neighbors = [
          { x: x, y: y - 1 }, // Up
          { x: x, y: y + 1 }, // Down
          { x: x - 1, y: y }, // Left
          { x: x + 1, y: y }, // Right
      ];

      const adjacentEntity = mapEntities.find(e => 
          neighbors.some(n => n.x === e.position.x && n.y === e.position.y)
      );

      if (adjacentEntity) {
          startCombat(adjacentEntity);
      } else {
          addLog(t.msgNoEnemy, 'info');
      }
  }, [player.position, mapEntities, inTown, t]);

  const handleTileClick = (targetX: number, targetY: number) => {
      if (phase !== GamePhase.MAP) return;
      playSelectSound();
      if (inTown) return;

      const { x, y } = player.position;
      const isAdjacent = Math.abs(targetX - x) + Math.abs(targetY - y) === 1;

      if (isAdjacent) {
          const entity = mapEntities.find(e => e.position.x === targetX && e.position.y === targetY);
          if (entity) {
              startCombat(entity);
          }
      }
  };

  // --- Movement & Input Logic ---

  const movePlayer = useCallback((dx: number, dy: number) => {
    if (phase !== GamePhase.MAP) return;
    if (showShop || showGuild) return; 

    setPlayer(prev => {
      const newX = prev.position.x + dx;
      const newY = prev.position.y + dy;

      const currentMap = inTown ? townMapRef.current : mapRef.current;
      const width = inTown ? TOWN_WIDTH : MAP_WIDTH;
      const height = inTown ? TOWN_HEIGHT : MAP_HEIGHT;

      // Check bounds
      if (newX < 0 || newX >= width || newY < 0 || newY >= height) {
          playBumpSound();
          return prev;
      }

      // Check Collision
      const tile = currentMap[newY][newX];
      const blocked = [TileType.TREE, TileType.MOUNTAIN, TileType.WATER, TileType.TOWN_WALL, TileType.LAVA];
      // Note: ICE is walkable but slippery? For now just walkable.
      if (blocked.includes(tile)) {
        playBumpSound();
        return prev;
      }
      
      // Don't walk into monsters
      if (!inTown) {
          const blockedByEntity = mapEntities.some(e => e.position.x === newX && e.position.y === newY);
          if (blockedByEntity) {
              playBumpSound();
              return prev;
          }
      }

      // Reset fled status when moving
      if (fledEnemyId) setFledEnemyId(null);

      playMoveSound();

      // Store previous position for potential retreat
      const newPlayer = { ...prev, position: { x: newX, y: newY } };
      
      return newPlayer;
    });
  }, [phase, inTown, showShop, showGuild, mapEntities, fledEnemyId]);

  // Handle tile events (Removed automatic combat trigger)
  useEffect(() => {
    if (phase !== GamePhase.MAP) return;

    const { x, y } = player.position;
    
    // Prevent re-triggering event on the same tile instantly
    const isNewTile = x !== lastProcessedPos.current.x || y !== lastProcessedPos.current.y;
    lastProcessedPos.current = { x, y };

    // --- TOWN LOGIC ---
    if (inTown) {
        const tile = townMapRef.current[y][x];
        
        // Exit Town
        if (tile === TileType.TOWN_EXIT) {
            setInTown(false);
            setPlayer(prev => ({ ...prev, position: worldPos }));
            
            // Fix loop: prevent immediate re-entry by syncing ref to world pos
            lastProcessedPos.current = worldPos;
            
            addLog(t.logLeave, 'info');
            return;
        }

        if (tile === TileType.SHOP) {
            if (isNewTile) setShowShop(true);
        }

        if (tile === TileType.GUILD) {
            if (isNewTile) {
                generateRandomQuest();
                setShowGuild(true);
            }
        }
        return;
    }

    // --- WORLD LOGIC ---
    const tile = mapRef.current[y][x];

    // Enter Town
    if (isNewTile && tile === TileType.TOWN) {
      setWorldPos({ x, y }); 
      setInTown(true);
      setPlayer(prev => ({ ...prev, position: { x: 7, y: 9 } })); 
      addLog(t.logTown, 'info');
      return;
    }

    // Lava Damage
    if (tile === TileType.LAVA && isNewTile) {
        // Should not happen as lava is blocked, but if forced:
        setPlayer(prev => ({ ...prev, hp: Math.max(0, prev.hp - 10) }));
        addLog("The lava burns you!", 'danger');
        triggerCombatEffect('damagePlayer', 10);
    }

    // Check for nearby enemies just to show a hint (no combat start)
    const neighbors = [
        { x: x, y: y - 1 }, { x: x, y: y + 1 }, { x: x - 1, y }, { x: x + 1, y }
    ];
    const nearbyEnemy = mapEntities.find(e => neighbors.some(n => n.x === e.position.x && n.y === e.position.y));
    if (nearbyEnemy && isNewTile) {
        addLog(t.msgEnemyNear, 'danger');
    }

  }, [player.position, phase, mapEntities, t, inTown, worldPos]);

  // Keyboard Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight", " "].indexOf(e.key) > -1) {
            e.preventDefault();
        }

        if (phase === GamePhase.MAP) {
            switch (e.key) {
                case 'ArrowUp': case 'w': movePlayer(0, -1); break;
                case 'ArrowDown': case 's': movePlayer(0, 1); break;
                case 'ArrowLeft': movePlayer(-1, 0); break; // Removed 'a' collision
                case 'ArrowRight': case 'd': movePlayer(1, 0); break;
                case 'a': case 'A': checkForInteraction(); break; // 'A' for Action/Attack
                case ' ': case 'Enter': checkForInteraction(); break;
                
                case 'Escape': 
                    setShowShop(false);
                    setShowGuild(false);
                    break;
            }
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [movePlayer, phase, checkForInteraction]);


  // --- Game Actions ---

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    playStartSound();
    if (!loginId || !loginPw) return;
    setLoading(true);

    // Check for save data
    const savedData = localStorage.getItem(`isekaisave_${loginId}`);
    if (savedData) {
        try {
            const save = JSON.parse(savedData);
            if (save.password === loginPw) {
                // Load Game
                setPlayer(save.player);
                setInTown(save.inTown);
                setWorldPos(save.worldPos);
                setMapEntities(save.mapEntities);
                setLanguage(save.language);
                mapRef.current = save.mapLayout;
                lastProcessedPos.current = save.player.position;
                
                setPhase(GamePhase.MAP);
                addLog(t.msgLoaded, 'success');
                setLoading(false);
                return;
            } else {
                alert(t.msgLoadFail);
                setLoading(false);
                return;
            }
        } catch (err) {
            console.error("Save file corrupted", err);
        }
    }

    // New Game
    setPlayer(prev => ({ ...prev, name: loginId }));
    try {
      const intro = await generateStoryIntro(loginId, language);
      setStoryText(intro);
      setPhase(GamePhase.INTRO);
    } catch (err) {
      addLog("Failed to load story.", 'danger');
      setPhase(GamePhase.INTRO);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndLogout = () => {
      const saveData = {
          password: loginPw,
          player: player,
          inTown: inTown,
          worldPos: worldPos,
          mapEntities: mapEntities,
          mapLayout: mapRef.current,
          language: language
      };
      
      localStorage.setItem(`isekaisave_${player.name}`, JSON.stringify(saveData));
      alert(t.msgSaved);
      resetGame();
  };

  const startGame = () => {
    playStartSound();
    setPhase(GamePhase.MAP);
    setInTown(true);
    setPlayer(prev => ({ ...prev, position: { x: 7, y: 5 } })); 
    addLog(t.logStart(player.name), 'info');
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const startCombat = async (mapEntity: MapEntity) => {
    playStartSound();
    setLoading(true);
    setPhase(GamePhase.COMBAT);

    try {
      let level = player.level;
      if (mapEntity.isBoss) level = 50; 
      else if (mapEntity.zone === 'DUNGEON') level += 3;
      else if (mapEntity.zone === 'FOREST') level += 1;

      const newEnemy = await generateMonster(level, mapEntity.zone, mapEntity.isBoss, mapEntity.name, language);
      
      setEnemy({ ...newEnemy, id: mapEntity.id });
      
      if (mapEntity.isBoss) addLog(t.bossEncounter, 'danger');
      else addLog(t.monsterEncounter(newEnemy.name), 'combat');

    } catch (error) {
      console.error(error);
      addLog("The monster vanished.", 'info');
      setPhase(GamePhase.MAP);
    } finally {
      setLoading(false);
    }
  };

  const handleAttack = () => {
    if (!enemy) return;

    playAttackSound();
    
    // 10% Miss Chance
    if (Math.random() < 0.1) {
        triggerCombatEffect('miss');
        addLog("You missed!", 'info');
        setTimeout(() => enemyTurn(enemy.hp), 800);
        return;
    }

    // 15% Crit Chance
    const isCrit = Math.random() < 0.15;
    let damage = Math.floor(player.atk * (0.8 + Math.random() * 0.4));
    if (isCrit) damage = Math.floor(damage * 1.5);
    
    const newEnemyHp = Math.max(0, enemy.hp - damage);
    
    // Visuals: Slash & Numbers
    setShowSlash(true);
    setTimeout(() => setShowSlash(false), 300);
    
    if (isCrit) triggerCombatEffect('crit', damage);
    else triggerCombatEffect('damageEnemy', damage);
    
    addLog(t.hitEnemy(enemy.name, damage), 'combat');
    setEnemy(prev => prev ? ({ ...prev, hp: newEnemyHp }) : null);

    if (newEnemyHp <= 0) {
      // Delay victory slightly to allow Shake + Death animation to play
      // Shake (400ms) then Death
      setTimeout(() => {
          setEnemyAnim('animate-death');
          setTimeout(() => handleVictory(enemy), 1000); // Wait for death anim
      }, 400);
    } else {
      setTimeout(() => enemyTurn(newEnemyHp), 800);
    }
  };

  const enemyTurn = (currentEnemyHp: number) => {
    if (!enemy || currentEnemyHp <= 0) return;

    const damage = Math.max(1, Math.floor(enemy.atk * (0.8 + Math.random() * 0.4)));
    const newPlayerHp = Math.max(0, player.hp - damage);

    if (damage > 0) {
        playDamageSound();
        triggerCombatEffect('damagePlayer', damage);
    }

    setPlayer(prev => ({ ...prev, hp: newPlayerHp }));
    addLog(t.hitPlayer(enemy.name, damage), 'danger');

    if (newPlayerHp <= 0) {
      handleDefeat();
    }
  };

  const handleVictory = (defeatedEnemy: Enemy) => {
    
    if (defeatedEnemy.id) {
        setMapEntities(prev => prev.filter(e => e.id !== defeatedEnemy.id));
    }

    let newExp = player.exp + defeatedEnemy.expReward;
    let newGold = player.gold + defeatedEnemy.goldReward;
    let newLevel = player.level;
    let newMaxExp = player.maxExp;
    let newMaxHp = player.maxHp;
    let newAtk = player.atk;
    let hp = player.hp;
    let activeQuest = player.activeQuest;

    if (activeQuest) {
        if (defeatedEnemy.name.includes(activeQuest.targetName) || 
           (language === 'ko' && getMonsterEmoji(defeatedEnemy.name, false) === getMonsterEmoji(activeQuest.targetName, false))) {
            const newCount = activeQuest.currentCount + 1;
            activeQuest = { ...activeQuest, currentCount: newCount };
            addLog(t.questProgress(newCount, activeQuest.requiredCount), 'quest');

            if (newCount >= activeQuest.requiredCount) {
                newGold += activeQuest.rewardGold;
                addLog(t.questComplete(activeQuest.rewardGold), 'success');
                playGoldSound();
                activeQuest = null;
            }
        }
    }

    if (newExp >= player.maxExp) {
      newLevel += 1;
      newExp -= player.maxExp;
      newMaxExp = Math.floor(newMaxExp * 1.5);
      newMaxHp += 20;
      newAtk += 5;
      hp = newMaxHp; 
      playLevelUpSound();
      addLog(t.levelUp(newLevel), 'success');
    } else {
      playGoldSound();
    }
    
    addLog(t.victoryMsg(defeatedEnemy.expReward, defeatedEnemy.goldReward), 'success');

    setPlayer(prev => ({
      ...prev,
      level: newLevel,
      exp: newExp,
      maxExp: newMaxExp,
      maxHp: newMaxHp,
      hp: hp,
      atk: newAtk,
      gold: newGold,
      activeQuest: activeQuest
    }));

    if (defeatedEnemy.isBoss) {
      triggerEnding(true);
    } else {
      setTimeout(() => {
        setEnemy(null);
        setEnemyAnim(''); // Reset anim
        setPhase(GamePhase.MAP);
      }, 1500);
    }
  };

  const handleDefeat = () => {
    addLog(t.logDie, 'danger');
    triggerEnding(false);
  };

  const runAway = () => {
    if (enemy?.isBoss) {
        addLog(t.bossEncounter, 'danger');
        return;
    }
    if (Math.random() > 0.4) {
        playRunSound();
        addLog(t.logRun, 'info');
        setFledEnemyId(enemy?.id || null);
        setEnemy(null);
        setPhase(GamePhase.MAP);
    } else {
        addLog(t.logRunFail, 'danger');
        if (enemy) setTimeout(() => enemyTurn(enemy.hp), 500);
    }
  }

  const triggerEnding = async (victory: boolean) => {
    setLoading(true);
    const text = await generateEndingStory(player.name, victory, language);
    setStoryText(text);
    setPhase(victory ? GamePhase.ENDING : GamePhase.GAME_OVER);
    setLoading(false);
  };
  
  const resetGame = () => {
    const currentLang = language;
    setPhase(GamePhase.LOGIN);
    setPlayer({ ...INITIAL_PLAYER });
    setEnemy(null);
    setLogs([]);
    setStoryText('');
    setLoginId('');
    setLoginPw('');
    setInTown(false);
    setFledEnemyId(null);
    setCombatEffects([]);
    
    const newMap = generateMap();
    mapRef.current = newMap;
    setMapEntities(spawnEnemies(newMap, currentLang));
    lastProcessedPos.current = { ...INITIAL_PLAYER.position };
  };

  // --- Shop & Guild Logic ---

  const buyItem = (type: 'potion' | 'sword') => {
      let cost = 0;
      if (type === 'potion') cost = 50;
      if (type === 'sword') cost = 100;

      if (player.gold >= cost) {
          playGoldSound();
          setPlayer(prev => ({
              ...prev,
              gold: prev.gold - cost,
              potions: type === 'potion' ? prev.potions + 1 : prev.potions,
              atk: type === 'sword' ? prev.atk + 2 : prev.atk
          }));
          addLog(t.msgBought, 'success');
      } else {
          addLog(t.msgNoGold, 'danger');
      }
  };

  const generateRandomQuest = () => {
      const targets = [
          { name: t.monsterNames.slime, zone: 'GRASS' },
          { name: t.monsterNames.goblin, zone: 'FOREST' },
          { name: t.monsterNames.wolf, zone: 'FOREST' },
          { name: t.monsterNames.skeleton, zone: 'DUNGEON' }
      ];
      const target = targets[Math.floor(Math.random() * targets.length)];
      const count = Math.floor(Math.random() * 3) + 2; 
      const reward = count * 20;

      setPotentialQuest({
          targetName: target.name,
          targetZone: target.zone,
          requiredCount: count,
          currentCount: 0,
          rewardGold: reward,
          description: `${target.name} x${count}`
      });
  };

  const acceptQuest = () => {
      if (potentialQuest) {
          playGoldSound();
          setPlayer(prev => ({ ...prev, activeQuest: potentialQuest }));
          setShowGuild(false);
          addLog("Accepted Quest!", 'info');
      }
  };


  // --- Rendering ---

  const getVisibleMap = () => {
      if (inTown) {
           const startX = Math.max(0, Math.min(player.position.x - Math.floor(VIEWPORT_WIDTH / 2), TOWN_WIDTH - VIEWPORT_WIDTH));
           const startY = Math.max(0, Math.min(player.position.y - Math.floor(VIEWPORT_HEIGHT / 2), TOWN_HEIGHT - VIEWPORT_HEIGHT));

           const rows = [];
           for(let y=0; y<VIEWPORT_HEIGHT; y++) {
              const row = [];
              for(let x=0; x<VIEWPORT_WIDTH; x++) {
                  row.push(townMapRef.current[startY + y][startX + x]);
              }
              rows.push(row);
           }
           return { startX, startY, rows };
      } else {
          // World Map
          const startX = Math.max(0, Math.min(player.position.x - Math.floor(VIEWPORT_WIDTH / 2), MAP_WIDTH - VIEWPORT_WIDTH));
          const startY = Math.max(0, Math.min(player.position.y - Math.floor(VIEWPORT_HEIGHT / 2), MAP_HEIGHT - VIEWPORT_HEIGHT));

          const rows = [];
          for(let y=0; y<VIEWPORT_HEIGHT; y++) {
              const row = [];
              for(let x=0; x<VIEWPORT_WIDTH; x++) {
                  row.push(mapRef.current[startY + y][startX + x]);
              }
              rows.push(row);
          }
          return { startX, startY, rows };
      }
  };

  const getPseudoRandom = (x: number, y: number) => {
    return Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
  };

  const getTileRender = (type: TileType, x: number, y: number) => {
      const isPlayer = player.position.x === x && player.position.y === y;
      
      const entity = !inTown ? mapEntities.find(e => e.position.x === x && e.position.y === y) : null;

      let content = '';
      let bgClass = '';
      let borderColor = '';
      let animClass = '';
      const rand = getPseudoRandom(x, y);

      switch(type) {
          case TileType.GRASS: 
              bgClass = 'bg-green-600'; 
              borderColor = 'border-green-700';
              if (rand > 0.85) content = '🌼';
              else if (rand > 0.75) content = '🌱';
              else if (rand > 0.65) content = '🌾';
              else if (rand > 0.6) content = '🌿';
              break;
          case TileType.FOREST: 
              bgClass = 'bg-emerald-800'; 
              borderColor = 'border-emerald-900';
              content = '🌲'; 
              if (rand > 0.8) content = '🍄';
              animClass = 'animate-sway';
              break;
          case TileType.TREE: 
              bgClass = 'bg-green-900'; 
              borderColor = 'border-green-950';
              content = '🌳'; 
              animClass = 'animate-sway';
              break;
          case TileType.SAND: 
              bgClass = 'bg-yellow-600'; 
              borderColor = 'border-yellow-700';
              if (rand > 0.9) content = '🌵';
              else if (rand > 0.85) content = '🦂';
              else if (rand > 0.8) content = '🦴';
              break;
          case TileType.MOUNTAIN: 
              bgClass = 'bg-slate-600'; 
              borderColor = 'border-slate-700';
              content = '⛰️'; 
              if (rand > 0.7) content = '🏔️';
              break;
          case TileType.WATER: 
              bgClass = 'bg-blue-500'; 
              borderColor = 'border-blue-600';
              content = '🌊'; 
              animClass = 'animate-wave';
              break;
          case TileType.TOWN: 
              bgClass = 'bg-amber-700'; 
              borderColor = 'border-amber-800';
              content = '🏰'; 
              animClass = 'animate-bounce-subtle';
              break;
          case TileType.DUNGEON_FLOOR: 
              bgClass = 'bg-slate-800'; 
              borderColor = 'border-slate-900';
              if (rand > 0.9) content = '💀';
              else if (rand > 0.8) content = '🕸️';
              else if (rand > 0.7) content = '🪨';
              break;
          case TileType.BOSS_FLOOR: 
              bgClass = 'bg-red-950'; 
              borderColor = 'border-red-900';
              content = '👹';
              animClass = 'animate-pulse-glow';
              break;

          // New Tiles
          case TileType.SNOW:
              bgClass = 'bg-slate-100';
              borderColor = 'border-slate-300';
              if (rand > 0.8) content = '❄️';
              else if (rand > 0.6) content = '🌲'; // Snowy tree
              break;
          case TileType.ICE:
              bgClass = 'bg-cyan-200';
              borderColor = 'border-cyan-300';
              content = '🧊';
              break;
          case TileType.LAVA:
              bgClass = 'bg-orange-600';
              borderColor = 'border-orange-700';
              content = '🌋';
              animClass = 'animate-pulse';
              break;
          case TileType.BRIDGE:
              bgClass = 'bg-amber-800';
              borderColor = 'border-amber-900';
              content = '🪵';
              break;
          case TileType.DIRT_PATH:
              bgClass = 'bg-amber-900/40 bg-green-700'; // Blended
              borderColor = 'border-transparent';
              if (rand > 0.8) content = '🐾';
              break;
          
          // Town Tiles
          case TileType.TOWN_FLOOR:
              bgClass = 'bg-amber-100/10';
              borderColor = 'border-amber-900/30';
              break;
          case TileType.TOWN_WALL:
              bgClass = 'bg-stone-600';
              borderColor = 'border-stone-700';
              content = '🧱';
              break;
          case TileType.SHOP:
              bgClass = 'bg-amber-800';
              borderColor = 'border-amber-600';
              content = '🏪';
              animClass = 'animate-bounce-subtle';
              break;
          case TileType.GUILD:
              bgClass = 'bg-blue-900';
              borderColor = 'border-blue-700';
              content = '🛡️';
              animClass = 'animate-bounce-subtle';
              break;
          case TileType.FOUNTAIN:
              bgClass = 'bg-blue-400';
              borderColor = 'border-blue-300';
              content = '⛲';
              animClass = 'animate-pulse-glow';
              break;
          case TileType.TOWN_EXIT:
              bgClass = 'bg-green-800';
              borderColor = 'border-green-600';
              content = '🚪';
              break;

          default:
              bgClass = 'bg-gray-900';
      }
      
      return (
          <div key={`${x}-${y}`} 
               onClick={() => handleTileClick(x, y)}
               className={`w-12 h-12 md:w-16 md:h-16 border ${borderColor} flex items-center justify-center text-2xl md:text-3xl relative ${bgClass} shadow-sm cursor-pointer hover:brightness-110 overflow-hidden`}>
              <span className={`opacity-80 select-none absolute pointer-events-none ${animClass}`}>{content}</span>
              
              {/* Particle Effects */}
              {type === TileType.WATER && (
                  <div className="absolute w-1 h-1 bg-white/50 rounded-full animate-sparkle" style={{top: `${rand*100}%`, left: `${(1-rand)*100}%`}}></div>
              )}
              {type === TileType.LAVA && (
                  <div className="absolute w-2 h-2 bg-yellow-400/50 rounded-full animate-ping" style={{top: `${rand*100}%`, left: `${(1-rand)*100}%`}}></div>
              )}

              {entity && (
                  <span className="z-10 animate-pulse drop-shadow-md select-none pointer-events-none">{entity.emoji}</span>
              )}
              {isPlayer && <span className="absolute inset-0 flex items-center justify-center z-20 animate-bounce drop-shadow-lg scale-125 pointer-events-none">🧙‍♂️</span>}
          </div>
      );
  };

  const renderLogin = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-4">
      <div className="bg-slate-800 p-8 rounded-xl shadow-2xl max-w-md w-full border border-slate-700">
        <h1 className="text-4xl font-bold mb-6 text-center text-blue-400 fantasy-font">{t.title}</h1>
        
        <div className="flex justify-center gap-4 mb-6">
            <button 
                onClick={() => { playSelectSound(); setLanguage('en'); }}
                className={`px-4 py-1 rounded-full text-sm font-bold ${language === 'en' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}
            >
                English
            </button>
            <button 
                onClick={() => { playSelectSound(); setLanguage('ko'); }}
                className={`px-4 py-1 rounded-full text-sm font-bold ${language === 'ko' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}
            >
                한국어
            </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-2">{t.idLabel}</label>
            <input 
              type="text" 
              className="w-full bg-slate-700 border border-slate-600 rounded p-3 text-white focus:outline-none focus:border-blue-500"
              placeholder="HeroName"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-2">{t.pwLabel}</label>
            <input 
              type="password" 
              className="w-full bg-slate-700 border border-slate-600 rounded p-3 text-white focus:outline-none focus:border-blue-500"
              placeholder="******"
              value={loginPw}
              onChange={(e) => setLoginPw(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full mt-4" disabled={loading}>
            {loading ? t.summoning : t.enterWorld}
          </Button>
        </form>
      </div>
    </div>
  );

  const renderStory = (title: string, buttonText: string, onNext: () => void) => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-8 animate-fade-in">
      <div className="max-w-2xl w-full text-center space-y-8">
        <h2 className="text-3xl font-bold text-amber-500 fantasy-font">{title}</h2>
        <p className="text-lg leading-relaxed text-slate-300 whitespace-pre-line text-left bg-slate-900/50 p-6 rounded-lg">
          {storyText}
        </p>
        <Button onClick={onNext} size="lg" variant={phase === GamePhase.GAME_OVER ? "danger" : "primary"}>
          {buttonText}
        </Button>
      </div>
    </div>
  );

  const renderViewport = () => {
      const { startX, startY, rows } = getVisibleMap();
      
      return (
        <div className="flex flex-col items-center justify-center p-2 relative">
            <div className="bg-slate-950 p-1 rounded-lg border-4 border-slate-600 shadow-2xl">
                {rows.map((row, relativeY) => (
                    <div key={relativeY} className="flex">
                        {row.map((tile, relativeX) => getTileRender(tile, startX + relativeX, startY + relativeY))}
                    </div>
                ))}
            </div>
            
            <div className="mt-2 text-center text-slate-400 text-sm">
                {inTown ? "TOWN SQUARE" : `WILDERNESS (${player.position.x}, ${player.position.y})`}
            </div>

            {/* Mobile D-Pad */}
            <div className="mt-4 grid grid-cols-3 gap-2 md:hidden">
                 <div />
                 <Button size="lg" className="h-16 w-16 text-2xl" onClick={() => movePlayer(0, -1)}>⬆️</Button>
                 <div />
                 <Button size="lg" className="h-16 w-16 text-2xl" onClick={() => movePlayer(-1, 0)}>⬅️</Button>
                 <Button size="lg" className="h-16 w-16 text-xs font-bold bg-red-800 border-red-900" onClick={checkForInteraction}>{t.actionAttack}</Button>
                 <Button size="lg" className="h-16 w-16 text-2xl" onClick={() => movePlayer(1, 0)}>➡️</Button>
                 <div />
                 <Button size="lg" className="h-16 w-16 text-2xl" onClick={() => movePlayer(0, 1)}>⬇️</Button>
                 <div />
            </div>
        </div>
      );
  };

  const renderShop = () => (
      <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border-2 border-amber-600 rounded-lg p-6 max-w-sm w-full shadow-2xl">
              <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-amber-500 fantasy-font">{t.shopTitle}</h2>
                  <button onClick={() => setShowShop(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>
              <p className="text-slate-300 mb-4 italic">{t.shopWelcome}</p>
              <div className="text-amber-300 font-mono mb-4 text-right">💰 {player.gold}G</div>

              <div className="space-y-3">
                  <Button className="w-full flex justify-between" variant="outline" onClick={() => buyItem('potion')}>
                      <span>{t.itemPotion}</span>
                  </Button>
                  <Button className="w-full flex justify-between" variant="outline" onClick={() => buyItem('sword')}>
                      <span>{t.itemSword}</span>
                  </Button>
              </div>
          </div>
      </div>
  );

  const renderGuild = () => (
      <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border-2 border-blue-600 rounded-lg p-6 max-w-sm w-full shadow-2xl">
              <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-blue-400 fantasy-font">{t.guildTitle}</h2>
                  <button onClick={() => setShowGuild(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>
              <p className="text-slate-300 mb-4 italic">{t.guildWelcome}</p>

              {player.activeQuest ? (
                   <div className="bg-blue-900/30 p-4 rounded border border-blue-800">
                       <h3 className="font-bold text-blue-200 mb-2">{t.currentQuest}</h3>
                       <p className="text-lg">{player.activeQuest.description}</p>
                       <p className="text-sm text-slate-400 mt-2">{t.questProgress(player.activeQuest.currentCount, player.activeQuest.requiredCount)}</p>
                       <div className="mt-4 text-xs text-slate-500">Completes automatically when finished.</div>
                   </div>
              ) : (
                  potentialQuest && (
                    <div className="bg-slate-900 p-4 rounded border border-slate-700">
                        <h3 className="font-bold text-white mb-1">Wanted: {potentialQuest.targetName}</h3>
                        <p className="text-slate-400 text-sm mb-2">Zone: {potentialQuest.targetZone}</p>
                        <p className="text-amber-400 font-bold mb-4">Reward: {potentialQuest.rewardGold} G</p>
                        <Button className="w-full" onClick={acceptQuest}>{t.acceptQuest}</Button>
                    </div>
                  )
              )}
          </div>
      </div>
  );

  const renderCombat = () => (
    <div className={`flex flex-col h-full absolute inset-0 bg-slate-900 z-40 ${playerAnim}`}>
      
      {/* Visual Effects Layer */}
      <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden">
          {combatEffects.map(effect => (
              <div 
                  key={effect.id}
                  className={`absolute animate-float-up ${effect.color} ${effect.size} font-bold drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]`}
                  style={{ left: `${effect.x}%`, top: `${effect.y}%` }}
              >
                  {effect.text}
              </div>
          ))}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden bg-slate-950">
        
        <div className="z-10 flex flex-col items-center animate-fade-in">
             <div className={`text-8xl md:text-9xl mb-4 drop-shadow-[0_0_15px_rgba(255,0,0,0.5)] relative ${enemyAnim || 'animate-idle'} ${enemy?.isBoss ? 'animate-bounce' : ''}`} style={enemy?.isBoss ? { animationDuration: '3s' } : {}}>
                 {enemy?.emoji || '👾'}
                 {showSlash && (
                    <div className="absolute inset-0 flex items-center justify-center text-red-500 text-7xl animate-slash pointer-events-none z-20">
                        💥
                    </div>
                 )}
             </div>

             <div className="bg-slate-800/90 backdrop-blur p-6 rounded-xl border border-slate-600 shadow-2xl w-full max-w-md">
                <div className="flex justify-between items-center mb-2">
                    <h3 className={`text-2xl font-bold ${enemy?.isBoss ? 'text-red-500' : 'text-white'}`}>{enemy?.name}</h3>
                    {enemy?.isBoss && <span className="bg-red-600 text-white text-xs px-2 py-1 rounded font-bold">BOSS</span>}
                </div>
                <p className="text-slate-400 mb-4 italic">{enemy?.description}</p>
                <ProgressBar current={enemy?.hp || 0} max={enemy?.maxHp || 100} colorClass="bg-red-600" label="Enemy HP" />
             </div>
        </div>
      </div>

      <div className="h-40 bg-black/60 overflow-y-auto p-4 border-t border-slate-700">
         {logs.slice(-5).map(log => (
             <div key={log.id} className={`text-sm mb-1 ${log.type === 'danger' ? 'text-red-400' : log.type === 'success' ? 'text-green-400' : log.type === 'quest' ? 'text-blue-400 font-bold' : 'text-slate-300'}`}>
                 {log.text}
             </div>
         ))}
         <div ref={combatLogRef} />
      </div>

      <div className="bg-slate-800 p-4 pb-8 border-t border-slate-700">
        <div className="max-w-4xl mx-auto">
             <div className="flex justify-between items-center mb-4 text-lg font-bold">
                 <div className="text-green-400">{t.hp}: {player.hp}/{player.maxHp}</div>
                 <Button onClick={runAway} variant="outline" size="sm">🏃 {t.run}</Button>
             </div>
            <div className="flex gap-4 w-full h-16">
                <Button onClick={handleAttack} className="flex-1 text-xl" variant="danger">
                    ⚔️ {t.attack}
                </Button>
                <Button onClick={() => {
                     if (player.potions > 0 && player.hp < player.maxHp) {
                         const heal = Math.floor(player.maxHp * 0.5);
                         const actualHeal = Math.min(player.maxHp - player.hp, heal);
                         setPlayer(p => ({...p, hp: p.hp + actualHeal, potions: p.potions - 1}));
                         addLog(t.healed(actualHeal), 'success');
                         playHealSound();
                         triggerCombatEffect('heal', actualHeal);
                     }
                }} className="w-1/3 text-lg" variant="secondary" disabled={player.potions <= 0} title="Use Potion">
                    🧪 {t.healBtn} ({player.potions})
                </Button>
            </div>
        </div>
      </div>
    </div>
  );

  const isGameActive = phase === GamePhase.MAP || phase === GamePhase.COMBAT;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans flex flex-col relative overflow-hidden">
      {phase === GamePhase.LOGIN ? (
        renderLogin()
      ) : (
        <>
          {/* Header Status Bar */}
          {isGameActive && (
             <header className="bg-slate-950 p-3 border-b border-slate-800 sticky top-0 z-30 shadow-md">
                <div className="max-w-5xl mx-auto flex justify-between items-center text-sm md:text-base">
                    <div className="flex items-center gap-3">
                        <span className="text-amber-500 font-bold fantasy-font text-lg hidden sm:inline">{t.title}</span>
                        <div className="bg-slate-800 px-3 py-1 rounded-full border border-slate-700 font-mono text-blue-300">
                            Lv.{player.level} {player.name}
                        </div>
                        {player.activeQuest && (
                            <div className="hidden md:block text-xs bg-blue-900/50 px-2 py-1 rounded border border-blue-800 text-blue-200">
                                Quest: {player.activeQuest.currentCount}/{player.activeQuest.requiredCount} {player.activeQuest.targetName}
                            </div>
                        )}
                    </div>
                    
                    <div className="flex gap-4 items-center font-mono font-bold">
                        <div className="flex items-center text-red-400">
                             ❤️ {player.hp}
                        </div>
                        <div className="flex items-center text-amber-400">
                             💰 {player.gold}
                        </div>
                        <Button variant="outline" size="sm" onClick={handleSaveAndLogout} className="text-xs ml-2">
                             {t.saveAndLogout}
                        </Button>
                    </div>
                </div>
            </header>
          )}

          <main className="flex-1 flex flex-col relative max-w-5xl mx-auto w-full">
            {phase === GamePhase.INTRO && renderStory(t.introTitle, t.beginBtn, startGame)}
            
            {phase === GamePhase.MAP && renderViewport()}
            {showShop && renderShop()}
            {showGuild && renderGuild()}
            {phase === GamePhase.COMBAT && renderCombat()}
            
            {phase === GamePhase.ENDING && renderStory(t.victory, t.playAgain, resetGame)}
            {phase === GamePhase.GAME_OVER && renderStory(t.gameOver, t.tryAgain, resetGame)}
          </main>
          
           {phase === GamePhase.MAP && !showShop && !showGuild && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-3 h-32 overflow-y-auto text-xs font-mono border-t border-slate-700 pointer-events-none z-20">
                {logs.slice(-8).map((log) => (
                  <div key={log.id} className={`mb-1 ${log.type === 'danger' ? 'text-red-400' : log.type === 'success' ? 'text-green-400' : log.type === 'quest' ? 'text-blue-400' : 'text-slate-300'}`}>
                    {log.text}
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            )}
        </>
      )}
    </div>
  );
};

export default App;