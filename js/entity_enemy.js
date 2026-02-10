/**
 * entity_enemy.js
 * 敵（バルーン）個体のクラス
 * 状態遷移、描画、HP管理のみを担当
 */
export class Enemy {
    constructor(config, x, y, options = {}) {
        this.config = config;
        this.id = config.id;
        this.x = x;
        this.y = y;
        this.radius = config.radius;
        this.hp = config.hp;

        // 状態: SPAWN, MOVE, STOP, INFLATE, EXPLODE, DEAD
        this.state = 'SPAWN';
        this.stateTime = 0; // 現在の状態になってからの経過時間 (ms)

        // 移動用ベクトル (MOVE状態用)
        // options.angle が指定されていればそれを使用、なければランダム
        const angle = options.angle !== undefined ? options.angle : (Math.random() * Math.PI * 2);
        this.vx = Math.cos(angle) * config.speed;
        this.vy = Math.sin(angle) * config.speed;

        this.scale = 1.0; // 演出用スケール
        this.history = []; // 移動履歴（残像用）
    }

    /**
     * 現在の状態の進捗率を 0.0 〜 1.0 で返す
     */
    getStateProgress() {
        const duration = this.config.durations[this.state.toLowerCase()];
        if (!duration) return 0;
        return Math.min(1.0, this.stateTime / duration);
    }

    update(delta) {
        const deltaMs = delta * 1000;
        this.stateTime += deltaMs;

        // 履歴の更新（一定間隔で記録）
        if (!this._historyTick) this._historyTick = 0;
        this._historyTick++;
        if (this._historyTick % 2 === 0) {
            this.history.unshift({ x: this.x, y: this.y });
            if (this.history.length > 20) this.history.pop();
        }

        // 演出用スケールの復帰
        if (this.scale > 1.0) {
            this.scale -= delta * 3;
            if (this.scale < 1.0) this.scale = 1.0;
        }

        switch (this.state) {
            case 'SPAWN':
                if (this.stateTime > (this.config.durations.spawn || 250)) this.transition('MOVE');
                break;

            case 'MOVE':
                // 移動パターンの適用
                const pattern = this.config.movePattern || 'straight';
                if (pattern === 'sine') {
                    const time = Date.now() * 0.005;
                    const perpX = -this.vy;
                    const perpY = this.vx;
                    const offset = Math.sin(time) * 3;
                    this.x += (this.vx * delta) + (perpX / (this.config.speed || 1)) * offset;
                    this.y += (this.vy * delta) + (perpY / (this.config.speed || 1)) * offset;
                } else if (pattern === 'tricky') {
                    // トリッキーな動き: 「静」と「動（ランダムバリエーション）」を繰り返す
                    const cycle = 1500;
                    const phase = Date.now() % cycle;

                    if (phase < 600) {
                        // 停止フェーズ
                        this.vx *= 0.8;
                        this.vy *= 0.8;
                    } else if (phase < 700) {
                        // ダッシュ準備: 次の動きを決定
                        if (!this._dashInit) {
                            const angle = Math.random() * Math.PI * 2;
                            this._dashType = Math.floor(Math.random() * 3); // 0:直線, 1:波形, 2:不規則
                            this.vx = Math.cos(angle) * (this.config.speed * 1.5);
                            this.vy = Math.sin(angle) * (this.config.speed * 1.5);
                            this._dashInit = true;
                        }
                    } else {
                        // ダッシュフェーズ: タイプ別挙動
                        this._dashInit = false;
                        if (this._dashType === 1) {
                            // サイン波ダッシュ
                            const time = Date.now() * 0.02;
                            this.x += Math.sin(time) * 5;
                        } else if (this._dashType === 2) {
                            // 不規則な揺らぎ
                            this.vx += (Math.random() - 0.5) * 50;
                            this.vy += (Math.random() - 0.5) * 50;
                        }
                    }

                    this.x += this.vx * delta;
                    this.y += this.vy * delta;
                } else if (pattern === 'zigzag') {
                    if (Math.floor(this.stateTime / 400) % 2 === 0) {
                        this.x += this.vx * delta;
                        this.y += this.vy * delta;
                    } else {
                        this.x += -this.vy * delta;
                        this.y += this.vx * delta;
                    }
                } else {
                    this.x += this.vx * delta;
                    this.y += this.vy * delta;
                }

                if (this.x < this.radius || this.x > window.innerWidth - this.radius) this.vx *= -1;
                if (this.y < this.radius || this.y > window.innerHeight - this.radius) this.vy *= -1;

                if (this.stateTime > this.config.durations.move) {
                    if (this.config.isItem) {
                        this.transition('DEAD');
                    } else {
                        this.transition('STOP');
                    }
                }
                break;

            case 'STOP':
                if (this.stateTime > this.config.durations.stop) this.transition('INFLATE');
                break;

            case 'INFLATE':
                if (this.stateTime > this.config.durations.inflate) this.transition('EXPLODE');
                break;
        }
    }

    transition(newState) {
        this.state = newState;
        this.stateTime = 0;
    }

    /**
     * 現在の表示上の半径を返す（判定と描画用）
     */
    getCurrentRadius() {
        const baseRadius = this.radius;
        const progress = this.getStateProgress();
        let displayRadius = baseRadius;

        if (this.state === 'SPAWN') {
            displayRadius *= (this.stateTime / 250);
        } else if (this.state === 'INFLATE') {
            displayRadius *= (1.0 + progress * 0.5);
        }

        return displayRadius * this.scale;
    }

    draw(ctx) {
        if (this.config.visualType === 'energy') {
            drawEnergyEntity(ctx, this.x, this.y, this.state, this.getStateProgress(), this.config.energyParams, this);
            return;
        }

        const progress = this.getStateProgress();
        const displayRadius = this.getCurrentRadius() / this.scale;
        let color = this.config.color;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);

        if (this.state === 'INFLATE') {
            if (progress > 0.8) {
                const flickerSpeed = 100 / (this.config.durations.inflate || 1000);
                const flicker = Math.sin(Date.now() * flickerSpeed) > 0;
                color = flicker ? '#ffffff' : this.config.inflateColor;
            } else {
                color = this.config.inflateColor;
            }
        }

        if (this.id === 'heart') {
            const time = Date.now() * 0.005;
            const pulse = Math.sin(time) * 0.15;
            const heartScale = (1.0 + pulse) * displayRadius * 0.13;

            // キラキラ粒子（背面）
            for (let i = 0; i < 3; i++) {
                const seed = Math.floor((Date.now() + i * 500) / 1000);
                const angle = (seed * 123.4 + i * 2.1) % (Math.PI * 2);
                const r = displayRadius * (1.1 + Math.sin(Date.now() * 0.01 + i) * 0.2);
                ctx.fillStyle = '#fff';
                ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.01 + i) * 0.5;
                ctx.beginPath();
                ctx.arc(Math.cos(angle) * r, Math.sin(angle) * r, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }

            // ハート本体の描画（グラデーションとグロー）
            ctx.save();
            ctx.scale(heartScale, heartScale);

            // 外光（グロー）
            ctx.shadowBlur = 15 + Math.sin(time) * 5;
            ctx.shadowColor = '#ff2a6d';

            // グラデーション作成
            const grad = ctx.createLinearGradient(0, -10, 0, 10);
            grad.addColorStop(0, '#ffffff'); // 上部は白
            grad.addColorStop(1, '#ff2a6d'); // 下部はピンク

            ctx.fillStyle = grad;
            ctx.font = `bold 20px serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('❤', 0, 0);
            ctx.restore();
        } else {
            ctx.beginPath();
            ctx.arc(0, 0, displayRadius, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();

            // 敵のみ枠線を描画
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        ctx.restore();
    }

    /**
     * ヒット時の処理
     * @param {boolean} isFever
     * @returns {boolean} 撃破したかどうか
     */
    onHit(isCritical, isFever = false) {
        this.scale = 1.4; // 叩いた瞬間にぷるんと拡大
        if (isCritical || isFever) {
            this.hp = 0;
        } else {
            this.hp--;
        }

        if (this.hp <= 0) {
            this.transition('DEAD');
            return true;
        }
        return false;
    }
}

/**
 * 暴走エネルギー体の描画
 */
function drawEnergyEntity(ctx, x, y, state, progress, params, entity) {
    const t = Date.now();
    const { coreRadius, shellRadius, pulseSpeed, safeColor, dangerColor, spark } = params;
    const type = entity.id;

    // --- 0. 黄色 (fast) の残像描画 (背景) ---
    if (type === 'fast' && entity.history.length > 5) {
        ctx.save();
        const intervals = [4, 10]; // どのくらい前のフレームを描くか
        intervals.forEach((idx, i) => {
            const h = entity.history[idx];
            if (!h) return;
            const hAlpha = (0.15 - i * 0.05);
            const hScale = (0.9 - i * 0.1);
            ctx.save();
            ctx.translate(h.x, h.y);
            ctx.globalAlpha = hAlpha;
            const hGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, shellRadius * hScale);
            hGrad.addColorStop(0, safeColor + "aa");
            hGrad.addColorStop(1, "transparent");
            ctx.fillStyle = hGrad;
            ctx.beginPath();
            ctx.arc(0, 0, shellRadius * hScale, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
        ctx.restore();
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(entity.scale, entity.scale);

    // 1. 状態に応じた変動値の計算
    let pulseAmount = Math.sin(t * pulseSpeed) * 0.1;
    let currentColor = safeColor;
    let sparkRate = (spark && spark.rateMove) ? spark.rateMove : 1.0;
    let globalAlpha = 1.0;

    if (state === 'STOP') {
        pulseAmount = 0;
        sparkRate = 0.1;
    } else if (state === 'INFLATE') {
        pulseAmount = Math.sin(t * pulseSpeed * 2.5) * (0.1 + progress * 0.25);
        if (progress < 0.3) currentColor = safeColor;
        else if (progress < 0.7) currentColor = "#a033ff";
        else currentColor = dangerColor;
        sparkRate = (spark && spark.rateInflate) ? spark.rateInflate : 3.5;
    } else if (state === 'SPAWN') {
        sparkRate = 0.5;
        globalAlpha = Math.min(1.0, progress * 1.5); // フェードイン
    }

    // TYPE別調整
    if (type === 'tough') sparkRate *= 0.6; // 白は低頻度
    if (type === 'bonus') sparkRate *= 1.5; // 赤は高頻度
    if (type === 'fast') sparkRate *= 0.5; // 黄色は控えめ

    // 登場演出（SPAWN）のレイヤードアニメーション
    let shellScale = 1.0;
    let coreScale = 1.0;
    if (state === 'SPAWN') {
        // イージング: easeOutQuart
        const eased = 1 - Math.pow(1 - progress, 4);
        // コアが先に現れる (0.0〜0.6)
        coreScale = Math.min(1.0, eased * 2.0);
        // シェルがワンテンポ遅れて広がる (0.3〜1.0)
        shellScale = Math.max(0, (eased - 0.3) / 0.7);
    } else if (state === 'INFLATE') {
        shellScale = 1.0 + progress * 0.5;
    }

    const currentRadius = shellRadius * shellScale * (1.0 + pulseAmount);
    ctx.globalAlpha = globalAlpha;

    // 2. 稲妻(Spark)の擬似生成 (ステートレスな描画)
    const activeSparks = [];
    if (spark && spark.enabled && state !== 'SPAWN') { // 出現中は稲妻を出さない
        const bucketSize = 100;
        const maxSparks = (type === 'bonus' ? 5 : 3);
        const loopCount = (type === 'tough' ? 2 : maxSparks);
        for (let i = 0; i < loopCount; i++) {
            const seed = Math.floor((t + i * 137) / bucketSize);
            const pseudoRand = (Math.sin(seed * 789.1 + i) * 10000) % 1;
            const chance = (sparkRate * bucketSize / 1000);

            if (Math.abs(pseudoRand) < chance) {
                const lifeProgress = ((t + i * 137) % bucketSize) / bucketSize;
                activeSparks.push({
                    seed,
                    lifeProgress,
                    type: Math.abs(pseudoRand) > (chance * 0.4) ? 'ring' : 'spike',
                    randShift: pseudoRand
                });
            }
        }
    }

    // 3. 外側グロー + フラッシュ (背面)
    if (shellScale > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, currentRadius + 8, 0, Math.PI * 2);
        const flashBoost = activeSparks.length > 0 ? 0.35 : 0;
        ctx.globalAlpha = (0.2 + flashBoost) * globalAlpha;
        ctx.shadowBlur = 15 + (flashBoost * 50);
        ctx.shadowColor = currentColor;
        ctx.fillStyle = currentColor;
        ctx.fill();

        // 紫専用: INFLATE中の警告リング
        if (type === 'hasty' && state === 'INFLATE') {
            ctx.strokeStyle = "#ff00ff";
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.3 + Math.sin(t * 0.02) * 0.2;
            ctx.beginPath();
            ctx.arc(0, 0, currentRadius + 12 + Math.sin(t * 0.01) * 5, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();
    }

    // 4. 稲妻の描画
    activeSparks.forEach(s => {
        ctx.save();
        ctx.strokeStyle = (type === 'tough' || type === 'bonus') ? "#ffffff" : "#ffffff";
        ctx.shadowBlur = (type === 'tough' ? 20 : 15);
        ctx.shadowColor = currentColor;
        const flicker = Math.sin(s.lifeProgress * 50) > 0 ? 1.0 : 0.5;
        ctx.globalAlpha = (1.0 - s.lifeProgress) * flicker * 0.7 * globalAlpha;

        // 太さ調整
        let lWidth = 2.5;
        if (type === 'tough') lWidth = 4.5;
        if (type === 'hasty') lWidth = 1.2;
        ctx.lineWidth = lWidth * (1.0 - s.lifeProgress);

        if (s.type === 'ring') {
            const startAng = (s.seed * 543) % (Math.PI * 2);
            const arcLen = (0.5 + Math.abs(s.seed % 1)) * 1.5;
            const segments = (type === 'tough' ? 6 : 10);
            ctx.beginPath();
            for (let j = 0; j <= segments; j++) {
                const ang = startAng + (arcLen * (j / segments));
                const rShift = (Math.sin(j * 2 + s.seed) * (type === 'tough' ? 15 : 12) * Math.random());
                const px = Math.cos(ang) * (currentRadius + rShift);
                const py = Math.sin(ang) * (currentRadius + rShift);
                if (j === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.stroke();
        } else {
            const ang = (s.seed * 987) % (Math.PI * 2);
            const segments = 6;
            const startR = currentRadius * 0.5;
            const totalLen = (type === 'hasty' ? 15 : 25) + (Math.abs(s.randShift) * 20);
            ctx.beginPath();
            for (let j = 0; j <= segments; j++) {
                const r = startR + (totalLen * (j / segments));
                const sideShift = (Math.random() - 0.5) * 15;
                const px = Math.cos(ang) * r - Math.sin(ang) * sideShift;
                const py = Math.sin(ang) * r + Math.cos(ang) * sideShift;
                if (j === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.stroke();
        }
        ctx.restore();
    });

    // 5. エネルギーシェル (放射グラデーション)
    if (shellScale > 0) {
        const grad = ctx.createRadialGradient(-currentRadius * 0.2, -currentRadius * 0.2, currentRadius * 0.1, 0, 0, currentRadius);
        grad.addColorStop(0, "rgba(255, 255, 255, 0.45)");
        grad.addColorStop(0.6, currentColor + "55");
        grad.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.beginPath();
        ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
    }

    // 6. 発光コア (中心)
    if (coreScale > 0) {
        ctx.save();
        ctx.fillStyle = "#ffffff";
        ctx.shadowBlur = 12;
        ctx.shadowColor = "#ffffff";
        const baseCoreR = 5 * (1.1 + pulseAmount) * (state === 'SPAWN' ? coreScale : 1.0);

        if (type === 'splitter' || type === 'split_child') {
            // 緑用: 双核
            const gap = baseCoreR * 0.8;
            for (let side = -1; side <= 1; side += 2) {
                ctx.beginPath();
                ctx.arc(side * gap, 0, baseCoreR * 0.7, 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            // 通常: 単核
            ctx.beginPath();
            ctx.arc(0, 0, baseCoreR, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    // 7. スパーク粒子 (火花)
    if (state !== 'SPAWN' || progress > 0.5) {
        let sparkInensity = 0.5 + (state === 'INFLATE' ? progress * 0.5 : 0);
        let sparkCount = state === 'MOVE' ? 4 : (state === 'INFLATE' ? 8 + progress * 10 : 2);
        if (state === 'SPAWN') sparkCount = Math.floor(4 * (progress - 0.5) * 2);
        if (type === 'bonus') sparkCount *= 2;

        if (sparkCount > 0) {
            ctx.save();
            ctx.fillStyle = "#ffffff";
            for (let i = 0; i < sparkCount; i++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = currentRadius * (0.6 + Math.random() * 0.6);
                ctx.beginPath();
                ctx.arc(Math.cos(angle) * dist, Math.sin(angle) * dist, 1 + Math.random(), 0, Math.PI * 2);
                ctx.globalAlpha = Math.random() * sparkInensity * globalAlpha;
                ctx.fill();
            }
            ctx.restore();
        }
    }

    ctx.restore();
}
