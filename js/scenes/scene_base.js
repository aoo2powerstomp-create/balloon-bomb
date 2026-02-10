/**
 * scene_base.js
 * 全てのシーンの基底クラス
 */
export class SceneBase {
    constructor(engine) {
        this.engine = engine;
    }

    /** シーン開始時 */
    onEnter(noFade = false) { }

    /** シーン終了時 */
    onExit() { }

    /** 更新処理 (delta: 経過秒数) */
    update(delta) { }

    /** 描画処理 (ctx: CanvasContext) */
    draw(ctx) { }

    /** 入力処理 (type: 'mousedown'等, pos: {x, y}) */
    onInput(type, pos) { }
}
