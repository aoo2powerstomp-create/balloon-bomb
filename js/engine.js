/**
 * engine.js
 * ゲームループ、Scene管理、Canvasリサイズ、入力の振り分けを統括するコアエンジン
 */
import { SceneBase } from './scenes/scene_base.js';
import { TitleScene } from './scenes/scene_title.js';
import { PlayScene } from './scenes/scene_play.js';
import { GameOverScene } from './scenes/scene_gameover.js';
import { BackgroundManager } from './background_manager.js';
import { GAME_SETTINGS } from './config.js';

class GameEngine {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.currentScene = null;
        this.scenes = {};
        this.backgroundManager = new BackgroundManager(this);
        this.isInitialScene = true;

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

        // 初期シーン設定 (初回はフェードなし)
        this.changeScene('TITLE', true);

        // ループ開始
        this.isRunning = true;
        requestAnimationFrame((time) => this.loop(time));
    }

    resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5); // PC/高解像度対策: 上限を1.5に制限
        this.canvas.width = window.innerWidth * dpr;
        this.canvas.height = window.innerHeight * dpr;
        this.canvas.style.width = `${window.innerWidth}px`;
        this.canvas.style.height = `${window.innerHeight}px`;

        // 背景マネージャーにリサイズ通知（オフスクリーンCanvasの再描画）
        if (this.backgroundManager) {
            this.backgroundManager.onResize(this.canvas.width, this.canvas.height);
        }

        // スケールを累積させないために setTransform を使用
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    async changeScene(sceneKey, noFade = false) {
        // 全画面暗転フェードは廃止したため、即座にシーンを切り替える。
        // 背景のクロスフェードは各シーンの onEnter 内で個別に開始される。

        if (this.currentScene) {
            this.currentScene.onExit();
        }
        this.currentScene = this.scenes[sceneKey];
        if (this.currentScene) {
            // 初回起動時などは noFade を渡せるようにする（暫定的に engine に状態を持たせるか、引数で渡す）
            this.currentScene.onEnter(noFade);
            this.debugScene.textContent = sceneKey;
        }
        this.isInitialScene = false;

        // transitionTo 側で fadeTarget = 0 に戻されるため、ここでは何もしない
        // ただし、もし transitionTo が呼ばれないシーンがある場合は不整合が起きるため注意
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
        this.backgroundManager.update(delta);

        // 描画
        // scaleがかかっているので、論理ピクセルサイズでクリアする
        this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

        // 1. 背景描画 (BackgroundManager)
        // Note: backgroundManager.draw 内でオフスクリーンキャンバスを使用。
        // リサイズ後の canvas.width/height (ピクセル数) で描画するため、
        // 現状の ctx.setTransform(dpr...) を考慮して drawImage する必要がある。
        // または、背景描画時のみ identities に戻して描画する。
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0); // ピクセル単位で直接描画
        this.backgroundManager.draw(this.ctx);
        this.ctx.restore();

        // 2. シーン描画 (ゲームオブジェクト等)
        if (this.currentScene) {
            this.currentScene.draw(this.ctx);
        }

        // Note: 以前実装した overlay フェードは BackgroundManager のクロスフェードに統合されたため削除済み

        requestAnimationFrame((time) => this.loop(time));
    }
}

// エントリポイント
// type="module" の場合、DOM の構築完了を待ってから実行されることが保証されるため
// 直接インスタンス化して問題ない。
new GameEngine();
