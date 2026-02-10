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
        this.btnYoutube = document.getElementById('btn-youtube');

        this.btnRetry.onclick = () => this.engine.changeScene('PLAY');
        this.btnToTitle.onclick = () => this.engine.changeScene('TITLE');
        this.btnYoutube.onclick = (e) => e.stopPropagation();
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

        // 称号の計算
        const title = this.calculateTitle(finalScore, stats);
        document.getElementById('player-title').textContent = `称号: ${title}`;

        // ハイスコア更新チェック
        const highScore = parseInt(localStorage.getItem('balloon_high_score') || 0);
        if (finalScore > highScore) {
            localStorage.setItem('balloon_high_score', finalScore);
            document.getElementById('new-record').classList.remove('hidden');
        } else {
            document.getElementById('new-record').classList.add('hidden');
        }
    }

    calculateTitle(score, stats) {
        const missRate = (stats.missTaps / (stats.totalTaps || 1)) * 100;
        const total = stats.totalTaps || 0;

        // 特殊条件（優先度：高）
        if (total > 30 && stats.hitTaps === 0) return "虚無を叩く者";
        if (total > 10 && score === 0) return "風船の保護者";
        if (stats.hitTaps > 50 && stats.missTaps === 0) return "ミスゼロの神程式";

        // 高度な実績
        if (score >= 50000) return "★銀河最強の爆破王★";
        if (score >= 30000) return "伝説のスイーパー";
        if (stats.maxCombo >= 100) return "コンボ・ゴッド";
        if (missRate < 2 && stats.hitTaps >= 50) return "神の目を持つ者";
        if (stats.feverCount >= 10) return "フィーバー・マニアックス";

        // 一般的な実績（優先度：中）
        if (score >= 15000) return "プロバルーンボマー";
        if (stats.maxCombo >= 50) return "コンボスター";
        if (stats.feverCount >= 5) return "お祭り男";
        if (missRate < 5 && stats.hitTaps >= 30) return "精密機械";
        if (missRate > 70 && total > 100) return "マシンガン・タップ";

        // 標準的な称号（優先度：低）
        if (score >= 8000) return "凄腕のハンター";
        if (score >= 4000) return "一人前の爆破師";
        if (stats.maxCombo >= 20) return "コンボアタッカー";
        if (stats.feverCount >= 2) return "ハッピー・フィーバー";
        if (score >= 1500) return "新進気鋭のルーキー";
        if (total > 0) return "期待の新人";

        return "静かなる挑戦者";
    }

    onExit() {
        this.domElement.classList.add('hidden');
        this.domElement.classList.remove('active');
    }
}
