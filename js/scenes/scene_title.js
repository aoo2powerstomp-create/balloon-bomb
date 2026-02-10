/**
 * scene_title.js
 * タイトル画面シーン
 */
import { SceneBase } from './scene_base.js';

export class TitleScene extends SceneBase {
    constructor(engine) {
        super(engine);
        this.domElement = document.getElementById('scene-title');
        this.btnStart = document.getElementById('btn-start');

        this.btnStart.onclick = () => {
            this.engine.changeScene('PLAY');
        };
    }

    onEnter() {
        this.domElement.classList.add('active');
        this.domElement.classList.remove('hidden');

        // ハイスコア表示等の更新
        const highScore = localStorage.getItem('balloon_high_score') || 0;
        document.getElementById('high-score').textContent = `HIGH SCORE: ${highScore}`;
    }

    onExit() {
        this.domElement.classList.add('hidden');
        this.domElement.classList.remove('active');
    }

    update(delta) {
        // 背景アニメーション等があればここに記述
    }

    draw(ctx) {
        // Canvasへの追加描画（パーティクル等）があればここに記述
    }
}
