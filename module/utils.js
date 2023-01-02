
export function merge(a, b) {
    return foundry.utils.mergeObject(a, b, { inplace: false });
}

export function getActorToken(actor) {
    if (actor instanceof CONFIG.Token.documentClass) { return actor.object; }
    return actor?.token ? actor?.token.object : actor?.getActiveTokens().find(t => t)
}

export function createScrollingText(token, text, floatUp = true) {
    if (token && !token?.document.hidden) {
        canvas.interface.createScrollingText(token.center, text, {
            anchor: CONST.TEXT_ANCHOR_POINTS.CENTER,
            direction: floatUp ? CONST.TEXT_ANCHOR_POINTS.TOP : CONST.TEXT_ANCHOR_POINTS.BOTTOM,
            distance: (2 * token.h),
            fontSize: 28,
            stroke: 0x000000,
            strokeThickness: 4,
            jitter: 0.25
          });
    }
}
