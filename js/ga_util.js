/**
 * ga_util.js
 * Google Analytics 4 へのイベント送信ヘルパー
 */

export function sendGAEvent(eventName, params = {}) {
    if (typeof gtag !== "function") return;
    try {
        gtag("event", eventName, params);
    } catch (e) {
        // 静かに失敗する
    }
}
