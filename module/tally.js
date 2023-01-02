import { xpTallySocket } from "./socket.js";
import { XpCard } from "./xp-card.js";

export class Tally {

    static get history() {
        return game.settings.get("xp-tally", "history") || [];
    }

    static async addHistory(record) {
        const current = game.settings.get("xp-tally", "history");
        await game.settings.set("xp-tally", "history", [...current, record]);
    }

    static async removeHistory(index) {
        await game.settings.set("xp-tally", "history", game.settings.get("xp-tally", "history").filter((h, i) => i != index));      
    }

    static get rewards() {
        return game.settings.get("xp-tally", "rewards") || [];
    }

    static get nextMilestoneId() {
        return String(Math.max(...Tally.rewards.filter(r => r.type === "milestone").map(r => r.id), 0) + 1);
    }

    static get totalXp() {
        return Tally.rewards.reduce((total, r) => total + r.xp, 0);
    }

    static async setRewards(rewards) {
        await game.settings.set("xp-tally", "rewards", rewards);
    }

    static async addReward(reward) {
        const current = game.settings.get("xp-tally", "rewards");
        await game.settings.set("xp-tally", "rewards", [...current, reward]);
    }

    static async addToken(tokenDoc) {
        const existing = this.rewards.find(r => r.type === "token" && r.uuid === tokenDoc.uuid);
        if (!existing) {
            const reward = {
                type: "token",
                uuid: tokenDoc.uuid,
                img: tokenDoc.texture.src,
                name: tokenDoc.name,
                xp: tokenDoc.actor.system.details.xp.value
            };
            await this.addReward(reward);
        }
    }

    static async removeToken(tokenDoc) {
        await this.setRewards(this.rewards.filter(r => !(r.type === "token" && r.uuid === tokenDoc.uuid)));
    }

    static async removeByIndex(index) {
        await this.setRewards(this.rewards.filter((r, i) => i != index));
    }

    static adjustedValue(value, adjustment) {
        if (typeof adjustment === "string" && ["+", "-"].includes(adjustment[0])) {
            let delta = parseInt(adjustment);
            return value + delta;
        }
        if (adjustment != "" && !isNaN(adjustment)) {
            return parseInt(adjustment);
        }
        return value;
    }

    static async distribute(actorAdjustments) {
        const actorUuids = game.settings.get("xp-tally", "actors");
        const rewards = Tally.rewards;
        if (actorUuids && actorUuids.length) {
            const method = game.settings.get("xp-tally", "application");
            const xpShare = Math.floor(Tally.totalXp / actorUuids.length);

            const actorShares = actorUuids.map(u => ({
                actorUuid: u,
                xpShare: Tally.adjustedValue(xpShare, actorAdjustments[u])
            }));
            const shares = actorShares.reduce((r, a) => {
                r[a.xpShare] = r[a.xpShare] || [];
                r[a.xpShare].push(a.actorUuid);
                return r;
            }, {});

            if (method === "collect" || method === "announce") {
                for (const xpShare in shares) {
                    const actorUuids = shares[xpShare];
                    const xpCard = new XpCard(actorUuids, [], parseInt(xpShare), method === "collect");
                    xpCard.make();
                }
            }

            if (method === "announce" || method === "auto") {
                for (const xpShare in shares) {
                    const actorUuids = shares[xpShare];
                    await Promise.all(actorUuids.map(u => Tally.claimForActor(fromUuidSync(u), parseInt(xpShare))));
                }
            }

            const timestamp = Date.now();
            Tally.addHistory({ shares, rewards, timestamp });
            Tally.setRewards([]);
        }
    }

    static async claimForActor(actor, xp) {
        xpTallySocket.executeForEveryone("floatXp", actor.uuid, game.i18n.format("xp-tally.xp-amount-float", { xp }))

        const existingXp = foundry.utils.getProperty(actor, "system.details.xp.value");
        await actor.update({ "system.details.xp.value": existingXp + xp });
    }

}
