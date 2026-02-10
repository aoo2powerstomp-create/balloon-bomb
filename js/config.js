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
        radius: 18,
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
    },
    bonus: {
        id: 'bonus',
        hp: 2,
        isItem: true,
        score: 3000,
        radius: 6,
        color: '#ff0000', // 真っ赤な〇
        movePattern: 'tricky',
        durations: {
            move: 4000,
            stop: 0,
            inflate: 0
        },
        speed: 550,
        explodeDamage: 0
    }
};

export const STAGES = [
    {
        id: 1, name: "Stage 1: Entrance",
        targetScore: 1000, spawnInterval: 1800, maxAlive: 8,
        weights: { basic: 84, tough: 10, heart: 5, bonus: 1 },
        bgColor: '#1a1a2e'
    },
    {
        id: 2, name: "Stage 2: Fast React",
        targetScore: 3000, spawnInterval: 1500, maxAlive: 10,
        weights: { basic: 59, tough: 20, fast: 15, hasty: 5, heart: 4, bonus: 1 },
        bgColor: '#16213e'
    },
    {
        id: 3, name: "Stage 3: Pressure",
        targetScore: 6000, spawnInterval: 1300, maxAlive: 12,
        weights: { basic: 41, tough: 30, fast: 20, hasty: 15, heart: 3, bonus: 1 },
        bgColor: '#0f3460'
    },
    {
        id: 4, name: "Stage 4: Multiplying",
        targetScore: 10000, spawnInterval: 1100, maxAlive: 14,
        weights: { basic: 31, tough: 30, fast: 20, hasty: 15, splitter: 10, heart: 3, bonus: 1 },
        bgColor: '#1a1a40'
    },
    {
        id: 5, name: "Stage 5: Panic Zone",
        targetScore: 16000, spawnInterval: 950, maxAlive: 16,
        weights: { tough: 38, fast: 30, hasty: 20, splitter: 15, heart: 3, bonus: 1 },
        bgColor: '#2a1a40'
    },
    {
        id: 6, name: "Stage 6: Speed Demon",
        targetScore: 23000, spawnInterval: 850, maxAlive: 18,
        weights: { tough: 34, fast: 40, hasty: 25, splitter: 20, heart: 4, bonus: 1 },
        bgColor: '#401a40'
    },
    {
        id: 7, name: "Stage 7: Chaos Bloom",
        targetScore: 32000, spawnInterval: 750, maxAlive: 20,
        weights: { tough: 29, fast: 45, hasty: 30, splitter: 25, heart: 5, bonus: 1 },
        bgColor: '#401a2a'
    },
    {
        id: 8, name: "Stage 8: Heavy Rain",
        targetScore: 45000, spawnInterval: 650, maxAlive: 22,
        weights: { tough: 25, fast: 50, hasty: 40, splitter: 30, heart: 6, bonus: 1 },
        bgColor: '#401a1a'
    },
    {
        id: 9, name: "Stage 9: Final Wall",
        targetScore: 60000, spawnInterval: 550, maxAlive: 25,
        weights: { tough: 21, fast: 60, hasty: 50, splitter: 35, heart: 8, bonus: 1 },
        bgColor: '#2a0a0a'
    },
    {
        id: 10, name: "Stage 10: Ultimate Void",
        targetScore: 999999, spawnInterval: 450, maxAlive: 30,
        weights: { tough: 17, fast: 70, hasty: 60, splitter: 45, heart: 10, bonus: 1 },
        bgColor: '#000000'
    }
];
export const EXTERNAL_LINKS = {
    YOUTUBE: "https://www.youtube.com/@toxicoutbrain"
};
