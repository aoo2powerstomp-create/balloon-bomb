/**
 * scene_play.js
 * ゲームメインシーン
 */
import { SceneBase } from './scene_base.js';
import { EntityManager } from '../entity_manager.js';
import { STAGES, GAME_SETTINGS, FEVER_SETTINGS, COMBO_SETTINGS } from '../config.js';

import { sfx } from '../sfx.js';

export class PlayScene extends SceneBase {
    constructor(engine) {
        super(engine);
        this.hud = document.getElementById('hud');
        this.scoreDisplay = document.getElementById('score-display');
        this.hpDisplay = document.getElementById('hp-display');
        this.stageDisplay = document.getElementById('stage-display');
        this.multiplierDisplay = document.getElementById('multiplier-display');
        this.comboDisplay = document.getElementById('combo-display');

        // フィーバーUI
        this.feverOverlay = document.getElementById('fever-overlay');
        this.feverAlert = document.getElementById('fever-alert');

        // フィーバー用デバッグボタン
        const debugFeverBtn = document.getElementById('debug-fever-btn');
        if (debugFeverBtn) {
            debugFeverBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // ゲームへの入力を防ぐ
                if (this.isGameOver) return;
                this.comboCount = 19;
                this.updateMultiplierTier();
                this.updateHUD();
                sfx.play('hit');
                console.log("[DEBUG] Combo set to 19");
            });
        }

        this.entityManager = new EntityManager(this);
        this.reset();
    }

    reset() {
        this.score = 0;
        this.hp = GAME_SETTINGS.INITIAL_HP;
        this.currentStageIndex = 0;
        this.stage = STAGES[this.currentStageIndex];
        this.spawnTimer = 0;
        this.entityManager.clear();
        this.popups = [];
        this.particles = []; // パーティクル配列
        this.shakeTimer = 0; // 画面揺れ
        this.isGameOver = false;
        this.isTransitioning = false;
        this.flashTime = 0;

        // コンボ・倍率システム
        this.comboCount = 0;
        this.multiplierTier = 0;
        this.missCooldown = 0;

        // フィーバーシステム
        this.feverTimer = 0;
        this.feverActive = false;
        this.lastFeverCombo = 0;

        // プレイ統計トラッキング
        this.stats = {
            totalTaps: 0,
            hitTaps: 0,
            missTaps: 0,
            maxCombo: 0,
            feverCount: 0
        };
    }

    onEnter() {
        this.reset();
        this.hud.classList.remove('hidden');
        this.updateHUD();
    }

    onExit() {
        this.hud.classList.add('hidden');
    }

    updateHUD() {
        this.scoreDisplay.textContent = `SCORE: ${String(this.score).padStart(6, '0')}`;
        // HP表示
        const hearts = '❤'.repeat(Math.max(0, this.hp));
        this.hpDisplay.innerHTML = `HP: <span class="hp-heart">${hearts}</span>`;
        this.stageDisplay.textContent = `STAGE: ${this.currentStageIndex + 1}`;

        // コンボ・倍率表示
        const multipliers = [1.0, 1.2, 1.5, 2.0];
        const mult = multipliers[this.multiplierTier];
        this.multiplierDisplay.textContent = `x${mult.toFixed(1)}`;
        this.comboDisplay.textContent = `${this.comboCount} COMBO`;

        // Tierに応じたクラス付け替え
        this.multiplierDisplay.className = '';
        if (this.multiplierTier > 0) {
            this.multiplierDisplay.classList.add(`tier-${this.multiplierTier}`);
        }

        // デバッグ情報
        document.getElementById('debug-alive').textContent = this.entityManager.entities.length;
    }

    update(delta) {
        if (this.isGameOver) return;

        // クールダウン
        if (this.missCooldown > 0) {
            this.missCooldown -= delta * 1000;
        }

        // フィーバータイマー
        if (this.feverActive) {
            this.feverTimer -= delta * 1000;
            if (this.feverTimer <= 0) {
                this.stopFever();
            }
        }

        // 画面揺れ減衰
        if (this.shakeTimer > 0) {
            this.shakeTimer -= delta;
        }

        // 敵の更新
        this.entityManager.update(delta);

        // パーティクルの更新
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.5; // 重力
            p.life -= delta;
            if (p.life <= 0) this.particles.splice(i, 1);
        }

        // ポップアップの更新
        for (let i = this.popups.length - 1; i >= 0; i--) {
            const p = this.popups[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.5; // 重力
            p.life -= delta;
            if (p.life <= 0) this.popups.splice(i, 1);
        }

        // スポーン処理
        this.spawnTimer += delta * 1000;
        if (this.spawnTimer >= this.stage.spawnInterval) {
            this.spawnTimer = 0;
            if (this.entityManager.entities.length < this.stage.maxAlive) {
                this.entityManager.spawn(this.stage.weights);
            }
        }

        // ステージ遷移チェック
        if (this.score >= this.stage.targetScore && STAGES[this.currentStageIndex + 1]) {
            this.nextStage();
        }

        // ゲームオーバーチェック
        if (this.hp <= 0) {
            this.gameOver();
        }

        this.updateHUD();
    }

    draw(ctx) {
        ctx.save();

        // 画面揺れ
        if (this.shakeTimer > 0) {
            const intensity = 3;
            ctx.translate((Math.random() - 0.5) * intensity, (Math.random() - 0.5) * intensity);
        }

        // 背景の描画 (configのbgColorを使用)
        ctx.fillStyle = this.stage.bgColor;
        ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

        // 敵の描画
        this.entityManager.draw(ctx);

        // パーティクルの描画
        this.particles.forEach(p => {
            ctx.fillStyle = p.color + Math.floor(p.life * 255).toString(16).padStart(2, '0');
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });

        // ポップアップの描画
        this.popups.forEach(p => {
            ctx.fillStyle = `rgba(${p.color}, ${p.life * 2})`;
            ctx.font = `bold ${20 + p.life * 10}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(p.text, p.x, p.y);
        });

        // ダメージフラッシュ演出
        if (this.flashTime > 0) {
            ctx.fillStyle = `rgba(255, 0, 0, ${this.flashTime * 0.5})`;
            ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
            this.flashTime -= 0.1; // 簡易的な減衰
        }

        ctx.restore();
    }

    onInput(type, pos) {
        if (this.isGameOver) return;

        if (type === 'pointerdown') {
            this.stats.totalTaps++; // 総タップ数

            const result = this.entityManager.handleInput(pos);
            if (result && result.hit) {
                this.stats.hitTaps++; // ヒット数
                // ヒット演出（共通）
                this.shakeTimer = 0.05;
                this.spawnParticles(result.x, result.y, result.color || "#05d9e8");

                if (result.killed || (this.feverActive && FEVER_SETTINGS.oneShotKills)) {
                    // フィーバー中の一撃撃破
                    const killed = result.killed || (this.feverActive && FEVER_SETTINGS.oneShotKills);

                    if (killed) {
                        // コンボ・スコア加算
                        this.comboCount++;
                        this.updateMultiplierTier();
                        this.checkFeverTrigger(); // フィーバー発動チェック

                        const mults = [1.0, 1.2, 1.5, 2.0];
                        let mult = mults[this.multiplierTier];
                        if (this.feverActive) mult *= FEVER_SETTINGS.scoreMultiplier;

                        const gain = Math.floor((result.score || 100) * mult);
                        this.score += gain;

                        // 音声再生（撃破）
                        if (result.isItem) {
                            sfx.play('item');
                        } else if (result.critical) {
                            sfx.play('critical');
                        } else {
                            sfx.play('kill');
                        }

                        // アイテム（回復）の場合
                        if (result.isItem && result.recovery > 0) {
                            this.hp = Math.min(GAME_SETTINGS.MAX_HP, this.hp + result.recovery);
                            this.addPopup(result.x, result.y, "HP UP!", "255, 133, 162");
                        } else {
                            const scoreText = result.critical ? `CRITICAL! ${gain}` : `${gain}`;
                            const color = result.critical ? "255, 255, 0" : "255, 255, 255";
                            this.addPopup(result.x, result.y, scoreText, color);
                        }
                    }
                } else {
                    // 撃破していないヒット
                    sfx.play('hit');
                }

                document.getElementById('debug-event').textContent = result.critical ? 'CRITICAL!' : 'HIT';
            } else {
                // ミス（空振り）
                this.handleMiss(pos);
            }
        }
    }

    updateMultiplierTier() {
        // 最大コンボ更新
        if (this.comboCount > this.stats.maxCombo) {
            this.stats.maxCombo = this.comboCount;
        }

        const thresholds = COMBO_SETTINGS.tierThresholds;
        let tier = 0;
        for (let i = 0; i < thresholds.length; i++) {
            if (this.comboCount >= thresholds[i]) {
                tier = i + 1;
            }
        }
        this.multiplierTier = tier;
    }

    handleMiss(pos) {
        this.stats.missTaps++; // ミス数

        // クールダウン中は無視
        if (this.missCooldown > 0) return;
        this.missCooldown = 120; // 120ms

        // フィーバー中はペナルティ緩和（コンボ維持）
        if (this.feverActive && FEVER_SETTINGS.missPenaltyDisabled) {
            this.addPopup(pos.x, pos.y, "GUARD!", "255, 255, 255");
        } else {
            // ペナルティ（0リセット）
            this.multiplierTier = 0;
            this.comboCount = 0;
        }

        // MISS ポップアップ
        this.addPopup(pos.x, pos.y, "MISS", "255, 0, 0");
        document.getElementById('debug-event').textContent = 'MISS';
        sfx.play('miss');
    }

    checkFeverTrigger() {
        if (this.comboCount > 0 &&
            this.comboCount % FEVER_SETTINGS.triggerCombo === 0 &&
            this.comboCount !== this.lastFeverCombo) {
            this.startFever();
        }
    }

    startFever() {
        console.log(`[FEVER] start at combo=${this.comboCount}`);
        this.feverActive = true;
        this.feverTimer = FEVER_SETTINGS.durationMs;
        this.lastFeverCombo = this.comboCount;
        this.stats.feverCount++; // 統計: フィーバー回数

        // UI表示
        this.feverOverlay.classList.add('active');
        this.feverAlert.classList.remove('hidden');
        sfx.play('fever');
    }

    stopFever() {
        console.log(`[FEVER] end`);
        this.feverActive = false;
        this.feverTimer = 0;

        // UI非表示
        this.feverOverlay.classList.remove('active');
        this.feverAlert.classList.add('hidden');
    }

    spawnParticles(x, y, color) {
        const count = 12;
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 10 + 2;
            this.particles.push({
                x: x, y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: color,
                size: Math.random() * 4 + 2,
                life: 0.4
            });
        }
    }

    addPopup(x, y, text, color) {
        this.popups.push({
            x: x, y: y, text: text, color: color,
            vx: (Math.random() - 0.5) * 8,
            vy: -12,
            life: 1.0
        });
    }

    nextStage() {
        this.currentStageIndex++;
        this.stage = STAGES[this.currentStageIndex];
        this.flashTime = 0.5; // ステージアップ演出のみ
    }

    gameOver() {
        this.isGameOver = true;
        this.engine.changeScene('GAMEOVER');
    }

    takeDamage(amount) {
        if (this.feverActive && FEVER_SETTINGS.noExplosionDamage) {
            console.log("[FEVER] damage blocked");
            return;
        }
        this.hp -= amount;
        this.flashTime = 1.0; // 被弾フラッシュ設定

        // HP表示にエフェクトを掛ける
        this.hpDisplay.classList.remove('hp-damage');
        void this.hpDisplay.offsetWidth; // reflow
        this.hpDisplay.classList.add('hp-damage');

        // 一定時間後にクラスを削除（色が戻らない問題の対策）
        setTimeout(() => {
            this.hpDisplay.classList.remove('hp-damage');
        }, 400);

        document.getElementById('debug-event').textContent = 'EXPLODE!';
        if (this.hp <= 0) {
            this.gameOver();
        }
    }
}
