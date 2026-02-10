/**
 * scene_gameover.js
 * ゲームオーバー画面シーン
 */
import { SceneBase } from './scene_base.js';

export class GameOverScene extends SceneBase {
    constructor(engine) {
        super(engine);
        this.domElement = document.getElementById('scene-gameover');
        this.btnRetry = document.getElementById('btn-retry');
        this.btnToTitle = document.getElementById('btn-to-title');

        this.btnRetry.onclick = () => this.engine.changeScene('PLAY');
        this.btnToTitle.onclick = () => this.engine.changeScene('TITLE');
    }

    onEnter() {
        this.domElement.classList.add('active');
        this.domElement.classList.remove('hidden');

        // スコア表示
        const playScene = this.engine.scenes.PLAY;
        const finalScore = playScene.score || 0;
        document.getElementById('final-score').textContent = `SCORE: ${finalScore}`;

        // 統計表示
        const stats = playScene.stats;
        const total = stats.totalTaps || 0;
        const missRate = total > 0 ? (stats.missTaps / total * 100).toFixed(1) : "0.0";

        document.getElementById('stat-total-taps').textContent = total;
        document.getElementById('stat-max-combo').textContent = stats.maxCombo;
        document.getElementById('stat-fever-count').textContent = stats.feverCount;
        document.getElementById('stat-miss-rate').textContent = missRate;
        document.getElementById('stat-hit-taps').textContent = stats.hitTaps;
        document.getElementById('stat-miss-taps').textContent = stats.missTaps;

        // ハイスコア更新チェック
        const highScore = parseInt(localStorage.getItem('balloon_high_score') || 0);
        if (finalScore > highScore) {
            localStorage.setItem('balloon_high_score', finalScore);
            document.getElementById('new-record').classList.remove('hidden');
        } else {
            document.getElementById('new-record').classList.add('hidden');
        }
    }

    onExit() {
        this.domElement.classList.add('hidden');
        this.domElement.classList.remove('active');
    }
}
