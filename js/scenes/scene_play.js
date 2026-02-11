/**
 * scene_play.js
 * ゲームメインシーン
 */
import { SceneBase } from './scene_base.js';
import { EntityManager } from '../entity_manager.js';
import { STAGES, GAME_SETTINGS, FEVER_SETTINGS, COMBO_SETTINGS, GUARD_SETTINGS, BOMB_SETTINGS } from '../config.js';

import { audioManager } from '../audio_manager.js';
import { sendGAEvent } from '../ga_util.js';

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
                audioManager.playSe('hit');
                console.log("[DEBUG] Combo set to 19");
            });
        }

        const debugGuardBtn = document.getElementById('debug-guard-btn');
        if (debugGuardBtn) {
            debugGuardBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.isGameOver) return;
                this.guardCharge = Math.min(GUARD_SETTINGS.maxCharges, this.guardCharge + 1);
                this.updateHUD();
                audioManager.playSe('item');
                this.triggerGuardFlash();
                console.log(`[DEBUG] Guard added. Current: ${this.guardCharge}`);
            });
        }

        const debugBombBtn = document.getElementById('debug-bomb-btn');
        if (debugBombBtn) {
            debugBombBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.isGameOver) return;
                this.bombStock = Math.min(BOMB_SETTINGS.maxStock, this.bombStock + 1);
                this.updateHUD();
                audioManager.playSe('item');
                console.log(`[DEBUG] Bomb added. Current: ${this.bombStock}`);
            });
        }

        this.entityManager = new EntityManager(this);

        // ガードアイコン画像のロード
        this.guardIconImg = new Image();
        this.guardIconImg.src = GUARD_SETTINGS.iconPath;

        // ボムアイコン画像のロード
        this.bombIconImg = new Image();
        this.bombIconImg.src = BOMB_SETTINGS.iconPath;

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
        this.corePops = []; // コア放出エフェクト
        this.guardEffects = []; // ガード発動エフェクト
        this.shockwaves = []; // ボム衝撃波エフェクト
        this.shakeTimer = 0; // 画面揺れ
        this.isGameOver = false;
        this.isTransitioning = false;
        this.flashTime = 0;

        // コンボ・倍率システム
        this.comboCount = 0;
        this.multiplierTier = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.feverGauge = 0;
        this.isFever = false;
        this.feverTime = 0;

        // 演出用
        this.visualScore = 0; // 表示上のスコア（ロール用）
        this.lastUpdateTime = 0;
        this.lastStageIndex = -1; // ステージ変更検知用

        // プレイ時間計測用
        this.startTime = Date.now();
        this.playTimeSeconds = 0;

        // プレイ統計トラッキング
        this.stats = {
            totalTaps: 0,
            hitTaps: 0,
            missTaps: 0,
            maxCombo: 0,
            feverCount: 0
        };

        // ガードシステム
        this.guardCharge = 0;

        // ボムシステム
        this.bombStock = 0;
    }

    onEnter(noFade = false) {
        this.reset();
        this.hud.classList.remove('hidden');
        this.updateHUD();

        // 背景切り替え（初回のみ即時、それ以降はクロスフェード）
        if (noFade) {
            this.engine.backgroundManager.setStage(this.stage.id);
        } else {
            this.engine.backgroundManager.transitionTo(this.stage.id);
        }

        // BGM再生
        this.updateBgm();
    }

    /**
     * ステージに応じたBGMを再生
     */
    updateBgm(fade = 0.3) {
        const stageNum = this.currentStageIndex + 1;
        let bgmKey = 'stage_03';
        if (stageNum === 1) bgmKey = 'stage_01';
        else if (stageNum === 2) bgmKey = 'stage_02';

        audioManager.playBgm(bgmKey, { fade });
    }

    /**
     * audioManager のアンロック時に、もしこのシーンにいればBGMを開始
     */
    onAudioUnlocked() {
        this.updateBgm();
    }

    onExit() {
        this.hud.classList.add('hidden');
    }

    updateHUD() {
        // スコア表示 (visualScoreを使用)
        this.scoreDisplay.textContent = `SCORE: ${String(Math.floor(this.visualScore)).padStart(6, '0')}`;

        const hpEl = document.getElementById('hp-display');
        const maxHp = GAME_SETTINGS.MAX_HP || 5;
        const currentHp = Math.max(0, this.hp);

        if (hpEl) {
            let hpHtml = 'HP: ';
            for (let i = 0; i < maxHp; i++) {
                if (i < currentHp) {
                    hpHtml += '<span class="hp-heart hp-heart-filled">❤</span>';
                } else {
                    hpHtml += '<span class="hp-heart hp-heart-empty">❤</span>';
                }
            }
            hpEl.innerHTML = hpHtml;
        }

        // ガードUI更新
        const guardContainer = document.getElementById('guard-container');
        const guardCountEl = document.getElementById('guard-count');
        if (guardContainer && guardCountEl) {
            guardCountEl.textContent = this.feverActive ? "INFINITE" : `×${this.guardCharge}`;

            // フィーバー中は色を変える
            if (this.feverActive) {
                guardContainer.style.filter = 'drop-shadow(0 0 10px #ff2a6d)';
                guardCountEl.style.color = '#ff2a6d';
                guardContainer.classList.remove('guard-empty');
            } else {
                guardContainer.style.filter = 'drop-shadow(0 0 5px rgba(5, 217, 232, 0.5))';
                guardCountEl.style.color = '#05d9e8';

                // 0個の時は薄くする
                if (this.guardCharge === 0) {
                    guardContainer.classList.add('guard-empty');
                } else {
                    guardContainer.classList.remove('guard-empty');
                }
            }
        }

        const stageNumEl = document.getElementById('stage-number');
        if (stageNumEl) {
            const currentStage = this.currentStageIndex + 1;
            // ステージが変更された場合にグリッチ演出
            if (this.lastStageIndex !== -1 && this.lastStageIndex !== this.currentStageIndex) {
                stageNumEl.classList.remove('glitch-animate');
                void stageNumEl.offsetWidth; // Reflow
                stageNumEl.classList.add('glitch-animate');
            }
            stageNumEl.textContent = currentStage;
            this.lastStageIndex = this.currentStageIndex;
        }

        // コンボ・倍率表示
        const multipliers = [1.0, 1.2, 1.5, 2.0];
        const mult = multipliers[this.multiplierTier];
        if (this.multiplierDisplay) this.multiplierDisplay.textContent = `x${mult.toFixed(1)}`;

        const comboDisplay = document.getElementById('combo-display');
        const comboNumEl = document.getElementById('combo-num');
        if (comboDisplay && comboNumEl) {
            comboDisplay.classList.remove('hidden');
            comboNumEl.textContent = this.comboCount;
        }

        // Tierに応じたクラス付け替え
        this.multiplierDisplay.className = '';
        if (this.multiplierTier > 0) {
            this.multiplierDisplay.classList.add(`tier-${this.multiplierTier}`);
        }

        // デバッグ情報
        document.getElementById('debug-alive').textContent = this.entityManager.entities.length;


        // ボムUI更新
        const bombCountEl = document.getElementById('bomb-count');
        const bombContainer = document.getElementById('bomb-container');
        if (bombCountEl && bombContainer) {
            bombCountEl.textContent = `×${this.bombStock}`;
            if (this.bombStock === 0) {
                bombContainer.classList.add('bomb-empty');
            } else {
                bombContainer.classList.remove('bomb-empty');
            }
        }
    }

    update(delta) {
        if (this.isGameOver) {
            if (this.gameOverTimer > 0) {
                this.gameOverTimer -= delta * 1000;
                if (this.gameOverTimer <= 0) {
                    this.engine.changeScene('GAMEOVER');
                }
            }
            return;
        }

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

        // スコアのロール更新 (Lerp or Step)
        if (this.visualScore < this.score) {
            const diff = this.score - this.visualScore;
            const step = Math.ceil(diff * 0.15); // 残りの15%ずつ近づく
            this.visualScore += step;
            if (this.visualScore > this.score) this.visualScore = this.score;
            this.updateHUD(); // スコアが変わるたびにHUD更新
        }

        // 敵の更新
        this.entityManager.update(delta, this.isFever);

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

        // コア放出エフェクトの更新
        for (let i = this.corePops.length - 1; i >= 0; i--) {
            const p = this.corePops[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= p.drag;
            p.vy *= p.drag;
            p.vy += p.gravity;
            p.life -= delta * 1000;
            if (p.life <= 0) this.corePops.splice(i, 1);
        }

        // ガードエフェクトの更新
        for (let i = this.guardEffects.length - 1; i >= 0; i--) {
            const ge = this.guardEffects[i];
            ge.life -= delta;
            ge.scale += delta * 3.0; // 拡大速度を少しアップ
            ge.rotation += ge.rotationSpeed * delta; // 回転更新
            if (ge.life <= 0) this.guardEffects.splice(i, 1);
        }

        // 衝撃波の更新
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            const sw = this.shockwaves[i];
            sw.life -= delta * 1000;
            const t = 1.0 - sw.life / sw.maxLife; // 0.0 -> 1.0

            // easeOutCubic: 1 - (1 - t)^3
            const progress = 1 - Math.pow(1 - t, 3);
            sw.currentRadius = sw.targetRadius * progress;

            // 範囲内の敵を撃破
            this.entityManager.entities.forEach(entity => {
                if (entity.isDead || entity.isItem) return;

                const dx = entity.x - sw.x;
                const dy = entity.y - sw.y;
                const distSq = dx * dx + dy * dy;
                if (distSq < sw.currentRadius * sw.currentRadius) {
                    // ヒット！通常撃破
                    const scoreBase = entity.config.score || 0;
                    const gain = Math.floor(scoreBase * (this.feverActive ? FEVER_SETTINGS.scoreMultiplier : 1.0));
                    this.score += gain;
                    this.addPopup(entity.x, entity.y, gain.toString(), "255, 255, 255");

                    // ボムによるコンボ加算は制限
                    if (sw.comboGain < BOMB_SETTINGS.maxComboGain) {
                        this.comboCount++;
                        sw.comboGain++;
                    }

                    this.spawnParticles(entity.x, entity.y, entity.color);
                    entity.onHit(true); // 確実に死亡ステートへ遷移
                    audioManager.playSe('kill');
                }
            });

            if (sw.life <= 0) this.shockwaves.splice(i, 1);
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

        // コア放出エフェクトの描画
        this.corePops.forEach(p => {
            const alpha = Math.min(1.0, p.life / 100);
            const scale = 0.7 + (p.life / p.maxLife) * 0.3;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(p.x, p.y);

            if (p.life > p.maxLife - 80) { // 生成直後のみ発光
                ctx.shadowBlur = p.type === 'star' ? 20 : 12;
                ctx.shadowColor = "#ffffff";
            }
            ctx.fillStyle = "#ffffff";

            if (p.type === 'shard') {
                // 白用: 破片 (四角)
                ctx.rotate(p.life * 0.05);
                ctx.fillRect(-p.radius, -p.radius, p.radius * 2, p.radius * 2);
            } else if (p.type === 'star') {
                // 赤用: 星
                const r = p.radius * scale;
                ctx.beginPath();
                for (let i = 0; i < 5; i++) {
                    ctx.lineTo(Math.cos((18 + i * 72) * Math.PI / 180) * r, Math.sin((18 + i * 72) * Math.PI / 180) * r);
                    ctx.lineTo(Math.cos((54 + i * 72) * Math.PI / 180) * (r * 0.4), Math.sin((54 + i * 72) * Math.PI / 180) * (r * 0.4));
                }
                ctx.closePath();
                ctx.fill();
            } else {
                // 標準: 円
                ctx.beginPath();
                ctx.arc(0, 0, p.radius * scale, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        });

        // 衝撃波の描画 (SFスタイル: 二重リング + 六角形フラグメント)
        this.shockwaves.forEach(sw => {
            const t = 1.0 - sw.life / sw.maxLife;
            const alpha = Math.max(0, 1.0 - t);

            ctx.save();
            ctx.globalCompositeOperation = 'lighter';

            // 1. 外側リング (太く、徐々に細く消えていく)
            ctx.beginPath();
            ctx.arc(sw.x, sw.y, sw.currentRadius, 0, Math.PI * 2);
            ctx.lineWidth = 20 * (1 - t * 0.8) * alpha;
            ctx.strokeStyle = `rgba(0, 217, 232, ${alpha * 0.3})`; // シアン系
            ctx.stroke();

            // 2. 内側リング (鋭い白ハイライト)
            ctx.beginPath();
            ctx.arc(sw.x, sw.y, sw.currentRadius * 0.95, 0, Math.PI * 2);
            ctx.lineWidth = 3 * alpha;
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
            ctx.stroke();

            // 3. 六角形ひずみフラグメント
            sw.fragments.forEach(f => {
                const fragAlpha = alpha * 0.6;
                const fragRadius = sw.currentRadius + f.distOffset * (1 + t);
                const fx = sw.x + Math.cos(f.angle) * fragRadius;
                const fy = sw.y + Math.sin(f.angle) * fragRadius;
                const size = f.baseSize * (1 - t * 0.5) * alpha;

                ctx.save();
                ctx.translate(fx, fy);
                ctx.rotate(f.rot + f.rotSpeed * t);

                // 六角形の描画
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const ang = (i / 6) * Math.PI * 2;
                    const px = Math.cos(ang) * size;
                    const py = Math.sin(ang) * size;
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.strokeStyle = `rgba(0, 217, 232, ${fragAlpha})`;
                ctx.lineWidth = 1.5;
                ctx.stroke();
                ctx.restore();
            });

            ctx.restore();
        });

        // ガードエフェクトの描画
        this.guardEffects.forEach(ge => {
            const alpha = ge.life / ge.maxLife;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(ge.x, ge.y);
            ctx.rotate(ge.rotation || 0); // 回転適用
            ctx.scale(ge.scale, ge.scale);

            // 外光
            ctx.shadowBlur = 20;
            ctx.shadowColor = "#05d9e8";

            const size = 120; // 基本サイズを拡大
            if (this.guardIconImg && this.guardIconImg.complete) {
                ctx.drawImage(this.guardIconImg, -size / 2, -size / 2, size, size);
            }
            ctx.restore();
        });

        // ダメージフラッシュ演出
        if (this.flashTime > 0) {
            ctx.fillStyle = `rgba(255, 0, 0, ${this.flashTime * 0.5})`;
            ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
            this.flashTime -= 0.1; // 簡易的な減衰
        }

        // ゲームオーバー時のオーバーレイ
        if (this.isGameOver) {
            const alpha = Math.min(0.7, (3000 - this.gameOverTimer) / 1000);
            ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
            ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

            ctx.fillStyle = "#ff0044";
            ctx.shadowBlur = 20;
            ctx.shadowColor = "#ff0044";
            ctx.font = "bold 80px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("GAME OVER", window.innerWidth / 2, window.innerHeight / 2);
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

                        // コンボ演出（ジャンプ＋回転：倍率のみ）
                        const multEl = document.getElementById('multiplier-display');
                        if (multEl) {
                            multEl.classList.remove('combo-jump-animate');
                            void multEl.offsetWidth; // Reflow
                            multEl.classList.add('combo-jump-animate');
                        }

                        // コンボ数演出（動的ポップ：色とサイズ）
                        const comboDisplay = document.getElementById('combo-display');
                        if (comboDisplay) {
                            // 動的スケールの計算 (1.0 + min(combo/25, 1.0))
                            const scale = 1.2 + Math.min(this.comboCount / 20, 1.2);

                            // 動的カラーの計算
                            let color = '#ffffff';
                            if (this.comboCount >= 50) color = '#ffe066'; // 金
                            else if (this.comboCount >= 30) color = '#ff2a6d'; // ピンク
                            else if (this.comboCount >= 10) color = '#05d9e8'; // 水色

                            comboDisplay.style.setProperty('--combo-scale', scale);
                            comboDisplay.style.setProperty('--combo-color', color);

                            comboDisplay.classList.remove('combo-pop-animate');
                            void comboDisplay.offsetWidth; // Reflow
                            comboDisplay.classList.add('combo-pop-animate');
                        }

                        this.updateMultiplierTier();
                        this.checkFeverTrigger(); // フィーバー発動チェック

                        const mults = [1.0, 1.2, 1.5, 2.0];
                        let mult = mults[this.multiplierTier];
                        if (this.feverActive) mult *= FEVER_SETTINGS.scoreMultiplier;

                        const gain = Math.floor((result.score || 100) * mult);
                        this.score += gain;

                        // 音声再生（撃破）
                        if (result.isItem) {
                            audioManager.playSe('item');
                        } else if (result.critical) {
                            audioManager.playSe('critical');
                        } else {
                            audioManager.playSe('kill');
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

                        // エネルギー体の場合はコア放出
                        if (result.visualType === 'energy') {
                            this.spawnCorePop(result.x, result.y, result.id);
                        }

                        // ボムストック加算（赤色ボーナス）
                        if (result.id === 'bonus') {
                            this.bombStock = Math.min(BOMB_SETTINGS.maxStock, this.bombStock + 1);
                            console.log(`[BOMB] Stock added: ${this.bombStock}`);
                            this.updateHUD();
                        }
                    }
                } else {
                    // 撃破していないヒット
                    audioManager.playSe('hit');
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
        // フィーバー中はガードを消費せずブロック（無制限）
        if (this.feverActive) {
            this.addPopup(pos.x, pos.y, "FEVER GUARD!", "5, 217, 232");
            audioManager.playSe('item');
            this.triggerGuardFlash();
            this.spawnGuardEffect(pos.x, pos.y);
            return;
        }

        // ガードチャージによるブロック
        if (this.guardCharge > 0) {
            this.guardCharge--;
            this.addPopup(pos.x, pos.y, "GUARDED!", "5, 217, 232");
            audioManager.playSe('item');

            this.triggerGuardFlash();

            // GA送信: ガード発動
            sendGAEvent("item_guard_blocked", { charge: this.guardCharge });

            this.updateHUD();
            return;
        }

        // ボムによるブロック（衝撃波）
        if (this.bombStock > 0) {
            this.bombStock--;
            this.addPopup(pos.x, pos.y, "BOMB BURST!", "255, 80, 80");
            audioManager.playSe('explosion'); // 適当な爆発音（なければ critical 等）

            this.spawnShockwave(pos.x, pos.y);
            this.updateHUD();
            return;
        }

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
        audioManager.playSe('miss');
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

        // ガード付与（最大まで補充）
        this.guardCharge = GUARD_SETTINGS.maxCharges;
        sendGAEvent("item_guard_granted", { charge: this.guardCharge });

        // UI表示
        this.feverOverlay.classList.add('active');
        this.feverAlert.classList.remove('hidden');
        audioManager.playSe('fever');

        this.updateHUD();
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

    spawnCorePop(x, y, id) {
        const createPop = (angleOffset = 0, type = 'normal', rScale = 1.0, life = 400) => {
            const angle = (Math.random() * 60 - 120 + angleOffset) * (Math.PI / 180);
            const speed = (type === 'shard' ? 3.5 : 2.5) + Math.random() * 1.5;
            this.corePops.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                gravity: (type === 'shard' ? 0.2 : 0.1),
                drag: 0.98,
                radius: (type === 'shard' ? 2 : 4 + Math.random() * 2) * rScale,
                life: life,
                maxLife: life,
                type: type
            });
        };

        if (id === 'splitter' || id === 'split_child') {
            // 緑: 二股
            createPop(-20);
            createPop(20);
        } else if (id === 'tough') {
            // 白: コア + 破片
            createPop(0);
            for (let i = 0; i < 4; i++) createPop((i - 1.5) * 30, 'shard', 1.0, 300);
        } else if (id === 'bonus') {
            // 赤: コア + 星スパーク
            createPop(0);
            for (let i = 0; i < 5; i++) createPop(Math.random() * 360, 'star', 0.8, 500);
        } else {
            // 標準
            createPop(0);
        }
    }

    triggerGuardFlash() {
        const guardContainer = document.getElementById('guard-container');
        if (guardContainer) {
            guardContainer.classList.remove('guard-flash');
            void guardContainer.offsetWidth; // Reflow
            guardContainer.classList.add('guard-flash');
        }
    }

    spawnGuardEffect(x, y) {
        this.guardEffects.push({
            x: x,
            y: y,
            life: 0.5,
            maxLife: 0.5,
            scale: 0.6,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() > 0.5 ? 1 : -1) * (2.0 + Math.random() * 2.0)
        });
    }

    spawnShockwave(x, y) {
        const shortSide = Math.min(window.innerWidth, window.innerHeight);
        const radius = shortSide * BOMB_SETTINGS.radiusRatio;

        const fragments = [];
        const fragCount = 12 + Math.floor(Math.random() * 7); // 12-18 fragments
        for (let i = 0; i < fragCount; i++) {
            const angle = (i / fragCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
            fragments.push({
                angle: angle,
                baseSize: 10 + Math.random() * 15,
                rot: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 4,
                distOffset: Math.random() * 30 - 15
            });
        }

        this.shockwaves.push({
            x: x,
            y: y,
            life: BOMB_SETTINGS.durationMs,
            maxLife: BOMB_SETTINGS.durationMs,
            targetRadius: radius,
            currentRadius: 0,
            comboGain: 0,
            fragments: fragments
        });
    }

    nextStage() {
        this.currentStageIndex++;
        this.stage = STAGES[this.currentStageIndex];
        this.flashTime = 0.5;

        this.engine.backgroundManager.transitionTo(this.stage.id);

        // BGM切り替え
        this.updateBgm(0.3);
    }

    gameOver() {
        if (this.isGameOver) return;
        this.isGameOver = true;
        this.gameOverTimer = 3000;

        this.playTimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    }

    takeDamage(amount) {
        if (this.feverActive && FEVER_SETTINGS.noExplosionDamage) {
            console.log("[FEVER] damage blocked");
            return;
        }
        this.hp -= amount;
        this.flashTime = 1.0;

        this.hpDisplay.classList.remove('hp-damage');
        void this.hpDisplay.offsetWidth;
        this.hpDisplay.classList.add('hp-damage');

        setTimeout(() => {
            if (this.hpDisplay) this.hpDisplay.classList.remove('hp-damage');
        }, 400);

        document.getElementById('debug-event').textContent = 'EXPLODE!';
        if (this.hp <= 0) {
            this.gameOver();
        }
    }
}
