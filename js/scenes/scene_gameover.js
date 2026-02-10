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

    onEnter(noFade = false) {
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
        const oldKey = 'balloon_high_score';
        const newKey = 'energy_core_high_score';
        let highScore = parseInt(localStorage.getItem(newKey) || localStorage.getItem(oldKey) || 0);

        if (finalScore > highScore) {
            localStorage.setItem(newKey, finalScore);
            document.getElementById('new-record').classList.remove('hidden');
        } else {
            document.getElementById('new-record').classList.add('hidden');
        }
    }

    calculateTitle(score, stats) {
        const missRate = (stats.missTaps / (stats.totalTaps || 1)) * 100;
        const total = stats.totalTaps || 0;
        const maxCombo = stats.maxCombo || 0;
        const fevers = stats.feverCount || 0;

        // --- 特殊・伝説級（最優先） ---
        if (score >= 100000) return "Ω：特異点の観測者";
        if (stats.hitTaps > 100 && stats.missTaps === 0) return "ラプラスの魔：決定論的演算";
        if (total > 50 && stats.hitTaps === 0) return "虚無を穿つ絶無";
        if (maxCombo >= 200) return "クォンタム・ストリーム：極値";

        // --- 超弩級実績 ---
        if (score >= 70000) return "★銀河を統べるコア・マスタリー★";
        if (score >= 50000) return "アブソリュート・ゼロ：絶対零度の支配者";
        if (maxCombo >= 150) return "ハイパー・ストリング・セオリー";
        if (fevers >= 15) return "コア・オーバーロード：臨界突破";
        if (missRate < 1 && stats.hitTaps >= 80) return "高精度プロセシング・ユニット";

        // --- 高度な実績 ---
        if (score >= 35000) return "プラズマ・リアクター：高出力制御体";
        if (score >= 25000) return "フォトン・スライサー：光速の斬撃";
        if (maxCombo >= 100) return "コンボ・シンギュラリティ：引力";
        if (fevers >= 8) return "エネルギッシュ・バースト：連鎖反応";
        if (missRate < 3 && stats.hitTaps >= 50) return "精密コア・バランサー";
        if (total > 300 && missRate > 60) return "全方位エネルギー散布";

        // --- 中級実績 ---
        if (score >= 18000) return "エレクトロン・ストライカー";
        if (score >= 12000) return "動力源回収の専門家";
        if (maxCombo >= 60) return "チェイン・リアクション：加速";
        if (fevers >= 4) return "お祭り騒ぎのコア・パルサー";
        if (missRate < 8 && stats.hitTaps >= 30) return "安定稼働プロセッサー";
        if (total > 150 && missRate > 50) return "乱射のエネルギー・ストーム";

        // --- 初級・基本称号 ---
        if (score >= 8000) return "熟練のコア・コレクター";
        if (score >= 4000) return "新進のエネルギー・エンジニア";
        if (maxCombo >= 30) return "リズム・プロパゲーター";
        if (fevers >= 2) return "バースト・ライザー";
        if (score >= 2000) return "コア・クリーナー：初級";
        if (total > 50) return "適性試験：合格者";
        if (total > 0) return "観測開始：候補生";

        return "静止したエネルギー体";
    }

    onExit() {
        this.domElement.classList.add('hidden');
        this.domElement.classList.remove('active');
    }
}
