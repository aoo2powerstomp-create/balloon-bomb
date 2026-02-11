/**
 * audio_manager.js
 * Web Audio API を使用した堅牢なサウンド管理クラス
 */
class AudioManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.buffers = new Map();
        this.unlocked = false;

        // Gain Nodes
        this.masterGain = this.ctx.createGain();
        this.bgmGain = this.ctx.createGain();
        this.seGain = this.ctx.createGain();

        // Connection: [Source] -> [bgm/seGain] -> [masterGain] -> [ctx.destination]
        this.bgmGain.connect(this.masterGain);
        this.seGain.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);

        // Default Volumes
        this.bgmGain.gain.value = 0.4;
        this.seGain.gain.value = 0.7;
        this.masterGain.gain.value = 1.0;

        // BGM State
        this.currentBgm = null; // { name, source, gainNode }
        this.isMuted = false;
        this.preMuteVolume = 1.0;

        // Audio Asset Paths
        this.assets = {
            bgm: {
                opening: 'assets/sound/bgm/bgm_opening.mp3',
                stage_01: 'assets/sound/bgm/bgm_stage_01.mp3',
                stage_02: 'assets/sound/bgm/bgm_stage_02.mp3',
                stage_03: 'assets/sound/bgm/bgm_stage_03.mp3',
            },
            se: {
                attack: 'assets/sound/se/se_attack.mp3',
                bom: 'assets/sound/se/se_bom.mp3',
                enemy_down: 'assets/sound/se/se_enemy_explode.mp3', // ファイル名実態に合わせる
                kill: 'assets/sound/se/se_倒した時.mp3',           // PlaySceneのエイリアス用
                gameover: 'assets/sound/se/se_gameover.mp3',
                guard: 'assets/sound/se/se_guard.mp3',
                miss: 'assets/sound/se/se_miss.mp3',
                select: 'assets/sound/se/se_select.mp3',
                critical: 'assets/sound/se/se_attack.mp3',         // 代用
                item: 'assets/sound/se/se_guard.mp3',              // 代用
                fever: 'assets/sound/se/se_bom.mp3',               // 代用
                explosion: 'assets/sound/se/se_bom.mp3'            // 代用
            }
        };
    }

    /**
     * 全アセットの事前ロード
     */
    async preload() {
        const loadTasks = [];

        // BGM
        for (const [key, path] of Object.entries(this.assets.bgm)) {
            loadTasks.push(this._load(key, path));
        }
        // SE
        for (const [key, path] of Object.entries(this.assets.se)) {
            loadTasks.push(this._load(key, path));
        }

        await Promise.all(loadTasks);
        console.log("AudioManager: All sounds loaded.");
    }

    async _load(key, path) {
        try {
            const response = await fetch(path);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
            this.buffers.set(key, audioBuffer);
        } catch (e) {
            console.warn(`AudioManager: Failed to load ${path}`, e);
        }
    }

    /**
     * モバイルブラウザ等のクリック/タップ時に呼び出してContextを有効化
     */
    async unlock() {
        if (this.unlocked) return;
        if (this.ctx.state === 'suspended') {
            await this.ctx.resume();
        }
        this.unlocked = true;
        console.log("AudioManager: Unlocked.");
    }

    /**
     * BGMの再生（クロスフェード対応）
     */
    playBgm(name, options = {}) {
        const fade = options.fade !== undefined ? options.fade : 0.3;
        const buffer = this.buffers.get(name);
        if (!buffer) {
            console.warn(`AudioManager: BGM "${name}" not found.`);
            return;
        }

        const now = this.ctx.currentTime;

        // すでに同じ曲が流れている場合は何もしない
        if (this.currentBgm && this.currentBgm.name === name) return;

        // 前のBGMをフェードアウト
        if (this.currentBgm) {
            const oldBgm = this.currentBgm;
            oldBgm.gainNode.gain.setValueAtTime(oldBgm.gainNode.gain.value, now);
            oldBgm.gainNode.gain.linearRampToValueAtTime(0, now + fade);
            setTimeout(() => {
                oldBgm.source.stop();
                oldBgm.source.disconnect();
                oldBgm.gainNode.disconnect();
            }, fade * 1000 + 100);
        }

        // 新しいBGMの生成
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        const bgmGainNode = this.ctx.createGain();
        bgmGainNode.gain.setValueAtTime(0, now);
        bgmGainNode.gain.linearRampToValueAtTime(1.0, now + fade); // 個別Gainの内側で1.0にする

        source.connect(bgmGainNode);
        bgmGainNode.connect(this.bgmGain); // 全体BGM音量に接続

        source.start(0);

        this.currentBgm = {
            name: name,
            source: source,
            gainNode: bgmGainNode
        };
    }

    /**
     * BGMの停止（フェードアウト対応）
     */
    stopBgm(options = {}) {
        const fade = options.fade !== undefined ? options.fade : 0.3;
        if (!this.currentBgm) return;

        const now = this.ctx.currentTime;
        const oldBgm = this.currentBgm;
        this.currentBgm = null;

        oldBgm.gainNode.gain.setValueAtTime(oldBgm.gainNode.gain.value, now);
        oldBgm.gainNode.gain.linearRampToValueAtTime(0, now + fade);

        setTimeout(() => {
            oldBgm.source.stop();
            oldBgm.source.disconnect();
            oldBgm.gainNode.disconnect();
        }, fade * 1000 + 100);
    }

    /**
     * 指定した音量へBGMをフェードさせる（内部 gain 直接操作）
     */
    fadeBgmTo(volume, duration) {
        const now = this.ctx.currentTime;
        this.bgmGain.gain.setValueAtTime(this.bgmGain.gain.value, now);
        this.bgmGain.gain.linearRampToValueAtTime(volume, now + duration);
    }

    /**
     * SEの再生（多重再生対応）
     */
    playSe(name) {
        const buffer = this.buffers.get(name);
        if (!buffer) {
            // console.warn(`AudioManager: SE "${name}" not found.`);
            return;
        }

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(this.seGain);
        source.start(0);
    }

    /**
     * ミュート設定
     */
    setMuted(muted) {
        this.isMuted = muted;
        if (muted) {
            this.preMuteVolume = this.masterGain.gain.value;
            this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
        } else {
            this.masterGain.gain.setTargetAtTime(this.preMuteVolume, this.ctx.currentTime, 0.05);
        }
    }

    /**
     * 音量調整 (0.0 - 1.0)
     */
    setBgmVolume(volume) {
        this.bgmGain.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.05);
    }

    setSeVolume(volume) {
        this.seGain.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.05);
    }
}

export const audioManager = new AudioManager();
