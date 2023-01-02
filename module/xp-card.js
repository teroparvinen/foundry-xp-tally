import { xpTallySocket } from "./socket.js";

export class XpCard {

    static templateName = "modules/xp-tally/templates/xp-card.hbs";

    static activateListeners(html) {
        html.on("click", ".xp-card a, .xp-card button", this._onXpCardAction.bind(this));
    }

    static async _onXpCardAction(event) {
        const button = event.currentTarget;
        button.disabled = true;
        const chatCard = button.closest(".chat-card");
        const messageId = chatCard.closest(".message").dataset.messageId;
        const action = button.dataset.xpAction;

        switch (action) {
        case "claim":
            const actorUuid = button.dataset.actorUuid;
            xpTallySocket.executeAsGM("claimXp", messageId, actorUuid);
            break;
        default:
            break;
        }

        button.disabled = false;
    }

    static fromMessage(message) {
        const data = message.flags["xp-tally"];
        const card = new XpCard(data.actorUuids, data.claimedActorUuids, data.xpShare, data.doCollect);
        card.message = message;
        return card;
    }

    constructor(actorUuids, claimedActorUuids, xpShare, doCollect) {
        this.actorUuids = actorUuids;
        this.claimedActorUuids = claimedActorUuids;
        this.xpShare = xpShare;
        this.doCollect = doCollect;
    }

    async make() {
        const content = await this._renderContent();

        const messageData = foundry.utils.mergeObject(
            {
                content,
                whisper: [],
                "flags.xp-tally": {
                    actorUuids: this.actorUuids,
                    claimedActorUuids: this.claimedActorUuids,
                    xpShare: this.xpShare,
                    doCollect: this.doCollect
                }
            }
        );
        this.message = await ChatMessage.create(messageData);
    }

    async refresh() {
        const content = await this._renderContent();
        await this.message.update({ content });
    }

    async _renderContent() {
        const xpShare = this.xpShare;
        const doCollect = this.doCollect;
        const actors = this.actorUuids.map(u => {
            const actor = fromUuidSync(u);
            const isClaimed = this.claimedActorUuids.includes(u);
            const isLevelUp = actor.system.details.xp?.value >= actor.system.details.xp?.max;

            return {
                actor,
                isClaimed,
                isLevelUp
            };
        });

        const templateData = {
            actors,
            xpShare,
            doCollect
        };
        return await renderTemplate(XpCard.templateName, templateData);
    }

}