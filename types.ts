export enum GamePhase {
  LOGIN = 'LOGIN',
  INTRO = 'INTRO',
  MAP = 'MAP', // General walking phase (World or Town)
  COMBAT = 'COMBAT', // Active fighting
  ENDING = 'ENDING',
  GAME_OVER = 'GAME_OVER'
}

export enum TileType {
  GRASS = 0,
  TREE = 1, // Wall
  MOUNTAIN = 2, // Wall
  TOWN = 3, // World Map Entrance
  DUNGEON_FLOOR = 4, 
  BOSS_FLOOR = 5,
  WATER = 6, // Wall
  SAND = 7,
  FOREST = 8,
  
  // Town Specific
  TOWN_FLOOR = 9,
  TOWN_WALL = 10,
  SHOP = 11,
  GUILD = 12,
  TOWN_EXIT = 13,
  FOUNTAIN = 14,

  // New Environment Types
  SNOW = 15,
  ICE = 16,
  LAVA = 17,
  BRIDGE = 18,
  DIRT_PATH = 19
}

export interface Position {
  x: number;
  y: number;
}

export interface Quest {
  targetName: string; // e.g., "Slime"
  targetZone: string; // e.g., "GRASS"
  requiredCount: number;
  currentCount: number;
  rewardGold: number;
  description: string;
}

export interface Player {
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  atk: number;
  exp: number;
  maxExp: number;
  gold: number;
  potions: number;
  position: Position;
  activeQuest: Quest | null;
  previousPosition?: Position;
}

// Entity on the map (Visible Monster)
export interface MapEntity {
  id: string;
  type: 'SLIME' | 'GOBLIN' | 'WOLF' | 'SKELETON' | 'BOSS' | 'UNKNOWN';
  name: string;
  emoji: string;
  position: Position;
  zone: string;
  isBoss: boolean;
}

export interface Enemy {
  id?: string; // Link to map entity
  name: string;
  hp: number;
  maxHp: number;
  atk: number;
  expReward: number;
  goldReward: number;
  description: string;
  emoji: string;
  isBoss?: boolean;
}

export interface LogEntry {
  id: string;
  text: string;
  type: 'info' | 'combat' | 'danger' | 'success' | 'quest';
}