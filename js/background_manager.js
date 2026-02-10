/**
 * background_manager.js
 * 背景画像の管理、クロスフェード遷移、およびオフスクリーンCanvasによる描画最適化を担当
 * PC/スマホ両対応。DPR上限1.5の解像度制限を考慮する。
 */
export class BackgroundManager {
    constructor(engine) {
        this.engine = engine;
        this.cache = new Map();

        this.currentImg = null;
        this.nextImg = null;

        // クロスフェード状態
        this.isCrossfading = false;
        this.fadeAlpha = 0; // nextImgの透明度 (0.0 to 1.0)
        this.fadeDuration = 0.8; // 0.8秒（少しゆったりめに）

        // オフスクリーン描画用
        this.offscreenCurrent = document.createElement('canvas');
        this.offscreenNext = document.createElement('canvas');

        this.fallbackColor = '#1a1a2e';
        this.canvasW = 0;
        this.canvasH = 0;
    }

    /**
     * アセットパス取得
     */
    getBgPath(stage) {
        const stageNum = Number(stage) || 0;
        if (stageNum === 0) return 'assets/bg/runtime/bg_title.webp';
        const num = String(stageNum).padStart(2, '0');
        return `assets/bg/runtime/bg_stage_${num}.webp`;
    }

    /**
     * 即時切り替え
     */
    async setStageImmediate(stage) {
        const path = this.getBgPath(stage);
        const img = await this.loadImage(path);
        this.currentImg = img;
        this.nextImg = null;
        this.isCrossfading = false;
        this.fadeAlpha = 0;
        this.updateOffscreen(this.offscreenCurrent, this.currentImg);
    }

    setTitle() {
        // 即時切り替えではなくクロスフェード（フェードイン）を利用
        // 初期状態からふわっと出るように。
        this.transitionTo(0);
    }

    setStage(stage) {
        this.setStageImmediate(stage);
    }

    /**
     * クロスフェード遷移開始
     */
    async transitionTo(stage) {
        const path = this.getBgPath(stage);
        const img = await this.loadImage(path);

        if (!this.currentImg) {
            // 1枚目がない場合は、nextImgにセットしてフェードインさせる
            this.nextImg = img;
            this.updateOffscreen(this.offscreenNext, this.nextImg);
            this.fadeAlpha = 0;
            this.isCrossfading = true;
            return;
        }

        this.nextImg = img;
        this.updateOffscreen(this.offscreenNext, this.nextImg);

        this.fadeAlpha = 0;
        this.isCrossfading = true;
        this.isCrossfading = true;
    }

    async loadImage(path) {
        if (this.cache.has(path)) return this.cache.get(path);

        try {
            const img = new Image();
            img.src = path;
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });
            this.cache.set(path, img);
            return img;
        } catch (e) {
            console.error(`Bg load failed: ${path}`, e);
            return null;
        }
    }

    /**
     * リサイズ時に呼ばれる（または内部でサイズを保持）
     */
    onResize(w, h) {
        this.canvasW = w;
        this.canvasH = h;

        // オフスクリーンCanvasのサイズ合わせ
        this.offscreenCurrent.width = w;
        this.offscreenCurrent.height = h;
        this.offscreenNext.width = w;
        this.offscreenNext.height = h;

        // 再レンダリング（焼き込み）
        if (this.currentImg) this.updateOffscreen(this.offscreenCurrent, this.currentImg);
        if (this.nextImg) this.updateOffscreen(this.offscreenNext, this.nextImg);
    }

    /**
     * 背景をオフスクリーンCanvasに「cover」で焼き込む
     */
    updateOffscreen(offCtxOrCanvas, img) {
        if (!img) return;
        const ctx = offCtxOrCanvas.getContext('2d');
        const w = this.canvasW;
        const h = this.canvasH;

        ctx.clearRect(0, 0, w, h);

        // Cover計算
        const imgW = img.width;
        const imgH = img.height;
        const scale = Math.max(w / imgW, h / imgH);
        const drawW = imgW * scale;
        const drawH = imgH * scale;
        const x = (w - drawW) / 2;
        const y = (h - drawH) / 2;

        ctx.drawImage(img, x, y, drawW, drawH);

        // 明度調整（全体的に暗くする）
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'; // 40%暗くする
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
    }

    /**
     * 毎フレームの更新
     */
    update(delta) {
        if (this.isCrossfading) {
            this.fadeAlpha += delta / this.fadeDuration;
            if (this.fadeAlpha >= 1.0) {
                this.fadeAlpha = 1.0;
                this.isCrossfading = false;

                // 切り替え完了
                this.currentImg = this.nextImg;
                this.nextImg = null;
                // currentを最新に同期
                this.updateOffscreen(this.offscreenCurrent, this.currentImg);
            }
        }
    }

    /**
     * メインCanvasへの描画
     */
    draw(ctx) {
        // 背景が無ければフォールバック色
        if (!this.currentImg && !this.nextImg) {
            ctx.fillStyle = this.fallbackColor;
            ctx.fillRect(0, 0, this.canvasW, this.canvasH);
            return;
        }

        // 1枚目
        if (this.currentImg) {
            ctx.globalAlpha = 1.0;
            ctx.drawImage(this.offscreenCurrent, 0, 0);
        }

        // 2枚目（クロスフェード中のみ）
        if (this.isCrossfading && this.nextImg) {
            ctx.globalAlpha = this.fadeAlpha;
            ctx.drawImage(this.offscreenNext, 0, 0);
            ctx.globalAlpha = 1.0;
        }
    }
}
