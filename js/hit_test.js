/**
 * hit_test.js
 * 衝突判定（ポインタヒット）とクリティカル判定を行う純粋関数群
 */

/**
 * 点（マウス座標）が円（敵）の内部にあるか判定する
 * @param {Object} pointer - {x, y}
 * @param {Object} target - {x, y, radius}
 * @param {number} padding - 判定の拡張幅
 * @returns {boolean}
 */
export function isHit(pointer, target, padding = 0) {
    const dx = pointer.x - target.x;
    const dy = pointer.y - target.y;
    const distanceSq = dx * dx + dy * dy;
    const r = target.radius + padding;
    return distanceSq <= r * r;
}

/**
 * 敵がクリティカル条件を満たしているか判定する
 * @param {string} state - 現在の状態 (EnemyState.INFLATE 等)
 * @param {number} stateProgress - 現在の状態の進捗率 (0.0 〜 1.0)
 * @param {number} threshold - クリティカル判定のしきい値 (例: 0.8)
 * @returns {boolean}
 */
export function isCritical(state, stateProgress, threshold = 0.8) {
    // 膨張(INFLATE)状態、かつ進捗が threshold を超えている場合のみクリティカル
    return state === 'INFLATE' && stateProgress >= threshold;
}
