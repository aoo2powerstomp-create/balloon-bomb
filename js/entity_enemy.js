/**
 * entity_enemy.js
 * 敵（バルーン）個体のクラス
 * 状態遷移、描画、HP管理のみを担当
 */
export class Enemy {
    constructor(config, x, y) {
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
        const angle = Math.random() * Math.PI * 2;
        this.vx = Math.cos(angle) * config.speed;
        this.vy = Math.sin(angle) * config.speed;

        this.scale = 1.0; // 演出用スケール
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

        // 演出用スケールの復帰
        if (this.scale > 1.0) {
            this.scale -= delta * 3;
            if (this.scale < 1.0) this.scale = 1.0;
        }

        switch (this.state) {
            case 'SPAWN':
                if (this.stateTime > 500) this.transition('MOVE');
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
        // アイテムは判定を広げる
        const baseRadius = this.config.isItem ? this.radius + 25 : this.radius;
        const progress = this.getStateProgress();
        let displayRadius = baseRadius;

        if (this.state === 'SPAWN') {
            displayRadius *= (this.stateTime / 500);
        } else if (this.state === 'INFLATE') {
            displayRadius *= (1.0 + progress * 0.5);
        }

        // スケール変更と当たり判定用バッファ
        return (displayRadius + 10) * this.scale;
    }

    draw(ctx) {
        const progress = this.getStateProgress();
        const displayRadius = (this.getCurrentRadius() / this.scale) - 10;
        let color = this.config.color;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);

        if (this.state === 'INFLATE') {
            if (progress > 0.8) {
                const flicker = Math.sin(Date.now() * 0.05) > 0;
                color = flicker ? '#ffffff' : this.config.inflateColor;
            } else {
                color = this.config.inflateColor;
            }
        }

        if (this.id === 'heart') {
            // ハート型の描画
            ctx.fillStyle = color;
            ctx.font = `${displayRadius * 2.5}px serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('❤', 0, 0);
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

        if (this.config.hp > 1 && !this.config.isItem) {
            ctx.fillStyle = 'white';
            ctx.font = 'bold 18px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(this.hp, 0, 6);
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
