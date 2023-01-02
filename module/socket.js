import { Tally } from "./tally.js";
import { createScrollingText, getActorToken } from "./utils.js";
import { XpCard } from "./xp-card.js";

export let xpTallySocket = undefined;

export function setupSocket() {
    xpTallySocket = socketlib.registerModule("xp-tally");
    xpTallySocket.register("claimXp", claimXp);
    xpTallySocket.register("floatXp", floatXp);
}

async function claimXp(messageId, actorUuid) {
    const message = game.messages.get(messageId);
    const actor = fromUuidSync(actorUuid);

    const claimedUuids = message.flags["xp-tally"].claimedActorUuids;
    if (actor && !claimedUuids.includes(actorUuid)) {
        await message.setFlag("xp-tally", "claimedActorUuids", [...claimedUuids, actorUuid]);
        
        const card = XpCard.fromMessage(message);

        await Tally.claimForActor(actor, card.xpShare);

        await card.refresh();
    }
}

function floatXp(actorUuid, str) {
    const actor = fromUuidSync(actorUuid);
    createScrollingText(getActorToken(actor), str);
}
