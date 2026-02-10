/**
 * entity_manager.js
 * 敵エンティティの集合を管理するシステム
 */
import { Enemy } from './entity_enemy.js';
import { ENEMY_TYPES } from './config.js';
import { isHit, isCritical } from './hit_test.js';

export class EntityManager {
    constructor(scene) {
        this.scene = scene;
        this.entities = [];
    }

    clear() {
        this.entities = [];
    }

    spawn(weights, x = null, y = null, options = {}) {
        let selectedId;

        if (typeof weights === 'string') {
            selectedId = weights;
        } else {
            // 重み付きランダムで敵タイプを選択
            const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
            let random = Math.random() * totalWeight;
            selectedId = 'basic';

            for (const [id, weight] of Object.entries(weights)) {
                if (random < weight) {
                    selectedId = id;
                    break;
                }
                random -= weight;
            }
        }

        const config = ENEMY_TYPES[selectedId];

        // 座標指定がない場合はランダム位置
        const finalX = x !== null ? x : Math.random() * (window.innerWidth - config.radius * 2) + config.radius;
        const finalY = y !== null ? y : Math.random() * (window.innerHeight - config.radius * 2) + config.radius;

        const enemy = new Enemy(config, finalX, finalY, options);
        this.entities.push(enemy);
    }

    update(delta) {
        for (let i = this.entities.length - 1; i >= 0; i--) {
            const entity = this.entities[i];
            entity.update(delta);

            // 爆発チェック
            if (entity.state === 'EXPLODE') {
                this.scene.takeDamage(entity.config.explodeDamage);
                this.entities.splice(i, 1);
                continue;
            }

            // 死亡/消滅チェック
            if (entity.state === 'DEAD') {
                // 分裂スポーン処理
                const spawnConfig = entity.config.onDeathSpawn;
                if (spawnConfig) {
                    const count = spawnConfig.count || 1;
                    const startAngle = Math.random() * Math.PI * 2;
                    for (let k = 0; k < count; k++) {
                        // 複数の場合は角度を均等に分散（2体なら180度反対）
                        const angle = startAngle + (Math.PI * 2 / count) * k;
                        this.spawn(spawnConfig.id, entity.x, entity.y, { angle: angle });
                    }
                }
                this.entities.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        this.entities.forEach(entity => entity.draw(ctx));
    }

    handleInput(inputPos) {
        const isTouch = inputPos.pointerType === 'touch';
        const padding = isTouch ? 15 : 0; // タッチ時は判定を15px広げる

        // 背面の敵から判定するため逆順にループ（重なり考慮）
        for (let i = this.entities.length - 1; i >= 0; i--) {
            const entity = this.entities[i];
            const hitRadius = entity.getCurrentRadius() + (entity.config.isItem ? 25 : 0) + 10;

            // 判定は外部の純粋関数を使用
            if (isHit(inputPos, { x: entity.x, y: entity.y, radius: hitRadius }, padding)) {
                const critical = isCritical(entity.state, entity.getStateProgress());
                const killed = entity.onHit(critical, this.scene.feverActive);

                return {
                    hit: true,
                    killed: killed,
                    score: killed ? (critical ? entity.config.score * 2 : entity.config.score) : 0,
                    critical: critical,
                    isItem: entity.config.isItem,
                    recovery: killed ? (entity.config.recovery || 0) : 0,
                    x: entity.x,
                    y: entity.y,
                    color: entity.config.color,
                    visualType: entity.config.visualType,
                    id: entity.id
                };
            }
        }
        return null; // 真の空振り
    }
}
