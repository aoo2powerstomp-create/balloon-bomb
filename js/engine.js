/**
 * engine.js
 * ゲームループ、Scene管理、Canvasリサイズ、入力の振り分けを統括するコアエンジン
 */
import { SceneBase } from './scenes/scene_base.js';
import { TitleScene } from './scenes/scene_title.js';
import { PlayScene } from './scenes/scene_play.js';
import { GameOverScene } from './scenes/scene_gameover.js';
import { GAME_SETTINGS } from './config.js';

class GameEngine {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.currentScene = null;
        this.scenes = {};

        this.lastTime = 0;
        this.isRunning = false;

        // UI要素
        this.debugFps = document.getElementById('debug-fps');
        this.debugScene = document.getElementById('debug-scene');

        this.init();
    }

    init() {
        window.addEventListener('resize', () => this.resize());
        this.resize();

        // Sceneのインスタンス化
        this.scenes = {
            TITLE: new TitleScene(this),
            PLAY: new PlayScene(this),
            GAMEOVER: new GameOverScene(this)
        };

        // 入力イベントの登録 (Pointer Eventsでマウス/タッチを統合)
        this.canvas.addEventListener('pointerdown', (e) => this.handleInput('pointerdown', e));

        // タッチ時のスクロール等のデフォルト動作を防止
        this.canvas.style.touchAction = 'none';

        // 初期シーン設定
        this.changeScene('TITLE');

        // ループ開始
        this.isRunning = true;
        requestAnimationFrame((time) => this.loop(time));
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = window.innerWidth * dpr;
        this.canvas.height = window.innerHeight * dpr;
        this.canvas.style.width = `${window.innerWidth}px`;
        this.canvas.style.height = `${window.innerHeight}px`;

        // スケールを累積させないために setTransform を使用
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    changeScene(sceneKey) {
        if (this.currentScene) {
            this.currentScene.onExit();
        }
        this.currentScene = this.scenes[sceneKey];
        if (this.currentScene) {
            this.currentScene.onEnter();
            this.debugScene.textContent = sceneKey;
        }
    }

    handleInput(type, event) {
        const rect = this.canvas.getBoundingClientRect();
        // 論理ピクセル座標を計算
        const pos = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
            pointerType: event.pointerType // mouse, touch, pen
        };
        if (this.currentScene) {
            this.currentScene.onInput(type, pos);
        }
    }

    loop(time) {
        if (!this.isRunning) return;

        const delta = (time - this.lastTime) / 1000; // 秒単位
        this.lastTime = time;

        // FPS デバッグ (簡易)
        if (Math.random() < 0.1) {
            this.debugFps.textContent = Math.round(1 / delta) || 0;
        }

        // 更新
        if (this.currentScene) {
            this.currentScene.update(delta);
        }

        // 描画
        // scaleがかかっているので、論理ピクセルサイズでクリアする
        this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        if (this.currentScene) {
            this.currentScene.draw(this.ctx);
        }

        requestAnimationFrame((time) => this.loop(time));
    }
}

// エントリポイント
// type="module" の場合、DOM の構築完了を待ってから実行されることが保証されるため
// 直接インスタンス化して問題ない。
new GameEngine();
