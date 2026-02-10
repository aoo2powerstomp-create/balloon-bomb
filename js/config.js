/**
 * config.js
 * ゲームのパラメータ、敵タイプ、ステージ構成を定義するデータ駆動設定ファイル
 */

export const GAME_SETTINGS = {
    INITIAL_HP: 3,
    MAX_HP: 5,
    CRITICAL_WINDOW: 0.8, // 膨張時間の残り20% (0.8〜1.0) でクリティカル
    FPS_TARGET: 60
};

export const FEVER_SETTINGS = {
    triggerCombo: 20,
    durationMs: 5000,
    scoreMultiplier: 2.0,
    oneShotKills: true,
    noExplosionDamage: true,
    missPenaltyDisabled: true
};

export const COMBO_SETTINGS = {
    tierThresholds: [5, 15, 30] // 倍率が上がるコンボ数
};

export const ENEMY_TYPES = {
    basic: {
        id: 'basic',
        hp: 1,
        score: 100,
        radius: 35,
        color: '#05d9e8',
        inflateColor: '#ff2a6d',
        movePattern: 'straight',
        durations: {
            move: 2000,
            stop: 1000,
            inflate: 2000
        },
        speed: 100, // px per second
        explodeDamage: 1
    },
    tough: {
        id: 'tough',
        hp: 3,
        score: 300,
        radius: 50,
        color: '#f9f9f9',
        inflateColor: '#ff2a6d',
        movePattern: 'zigzag',
        durations: {
            move: 3000,
            stop: 1500,
            inflate: 2500
        },
        speed: 100, // 速度アップ
        explodeDamage: 1
    },
    fast: {
        id: 'fast',
        hp: 1,
        score: 200,
        radius: 25,
        color: '#ffe066',
        inflateColor: '#ff2a6d',
        movePattern: 'sine',
        durations: {
            move: 1500,
            stop: 500,
            inflate: 1000
        },
        speed: 250,
        explodeDamage: 1
    },
    hasty: {
        id: 'hasty',
        hp: 1,
        score: 150,
        radius: 32,
        color: '#ff00ff', // 紫
        inflateColor: '#ff2a6d',
        movePattern: 'straight',
        durations: {
            move: 1200,
            stop: 400,
            inflate: 800 // せっかち！
        },
        speed: 160,
        explodeDamage: 1
    },
    splitter: {
        id: 'splitter',
        hp: 1,
        score: 80,
        radius: 40,
        color: '#00ff00', // 緑
        inflateColor: '#ff2a6d',
        movePattern: 'straight',
        durations: {
            move: 2000,
            stop: 1000,
            inflate: 2500
        },
        speed: 80,
        explodeDamage: 1,
        onDeathSpawn: { id: 'split_child', count: 1 }
    },
    split_child: {
        id: 'split_child',
        hp: 1,
        score: 40,
        radius: 22,
        color: '#7cfc00', // 薄緑
        inflateColor: '#ff2a6d',
        movePattern: 'straight',
        durations: {
            move: 1000,
            stop: 300,
            inflate: 600
        },
        speed: 200,
        explodeDamage: 1
    },
    heart: {
        id: 'heart',
        hp: 1, // 消えないバグを修正
        isItem: true,
        recovery: 1,
        score: 50,
        radius: 12,
        color: '#ff85a2',
        inflateColor: '#ff2a6d',
        movePattern: 'straight',
        durations: {
            move: 3000,
            stop: 0,
            inflate: 0
        },
        speed: 450,
        explodeDamage: 0
    }
};

export const STAGES = [
    {
        id: 1,
        name: "Stage 1: Entrance",
        targetScore: 1000,
        spawnInterval: 1800,
        maxAlive: 8,
        weights: { basic: 80, tough: 10, fast: 10, heart: 5 },
        bgColor: '#1a1a2e'
    },
    {
        id: 2,
        name: "Stage 2: Pressure Zone",
        targetScore: 3500,
        spawnInterval: 1400,
        maxAlive: 12,
        weights: { basic: 40, tough: 25, fast: 20, hasty: 15, heart: 2 },
        bgColor: '#16213e'
    },
    {
        id: 3,
        name: "Stage 3: Zigzag Chaos",
        targetScore: 7000,
        spawnInterval: 1000,
        maxAlive: 15,
        weights: { basic: 25, tough: 30, fast: 25, hasty: 15, splitter: 10, heart: 2 },
        bgColor: '#0f3460'
    },
    {
        id: 4,
        name: "Stage 4: Sine Hell",
        targetScore: 12000,
        spawnInterval: 800,
        maxAlive: 18,
        weights: { basic: 15, tough: 25, fast: 40, hasty: 20, splitter: 15, heart: 3 },
        bgColor: '#1a1a2e'
    },
    {
        id: 5,
        name: "Stage 5: Ultimate Void",
        targetScore: 999999, // Endless
        spawnInterval: 600,
        maxAlive: 20,
        weights: { basic: 10, tough: 30, fast: 40, hasty: 25, splitter: 20, heart: 4 },
        bgColor: '#16213e'
    }
];
