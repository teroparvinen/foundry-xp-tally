import { Tally } from "../tally.js";

export class AwardXp extends FormApplication {
    static instance = null;

    static activate() {
        if (!this.instance) {
            this.instance = new AwardXp();
        }

        if (!this.instance.rendered) {
            this.instance.render(true);
        } else {
            this.instance.bringToTop();
        }
    }

    static async refresh() {
        await this.instance?.render();
    }

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["sheet"],
            height: "auto",
            width: 280,
            id: "xp-tally-award",
            template: "modules/xp-tally/templates/award.hbs",
            title: "xp-tally.award-title",
            userId: game.userId,
            dragDrop: [{ dropSelector: ".xp-tally__award-actor-list" }],
            submitOnChange: true,
            closeOnSubmit: false
        });
    }

    get distribution() {
        const actors = game.settings.get("xp-tally", "actors").map(u => fromUuidSync(u));
        actors.sort((a, b) => a.name.localeCompare(b.name))
        const actorRows = actors.map((a, i) => ({ actor: a, adjustment: this.adjustments?.[i] }));
        const xp = Tally.totalXp;
        const xpShare = actors.length ? Math.floor(xp / actors.length) : 0;

        return { actors, actorRows, xp, xpShare }
    }

    get adjustedTotal() {
        const adjustments = this.adjustments || [];
        const hasAdjustments = adjustments.some(a => a);
        if (hasAdjustments) {
            const { actors, xpShare } = this.distribution;
            const actorShares = actors.map((a, i) => Tally.adjustedValue(xpShare, adjustments[i]));
            const totalXp = actorShares.reduce((a, b) => a + b, 0);
            return totalXp;
        }
    }

    getData(options) {
        const useIndividualAdjustment = game.settings.get("xp-tally", "individual-adjustment");
        const adjustedTotal = this.adjustedTotal;
        return { ...this.distribution, useIndividualAdjustment, adjustedTotal };
    }

    activateListeners(html) {
        super.activateListeners(html);

        const self = this;
        html.find('a[data-action="delete-actor"]').click(function(event) {
            const uuid = this.closest('.xp-tally__award-actor').dataset.uuid;
            game.settings.set("xp-tally", "actors", game.settings.get("xp-tally", "actors").filter(u => u !== uuid));
        });
        html.find('a[data-action="distribute"]').click(function(event) {
            const { actors } = self.distribution;
            const actorAdjustments = {};
    
            if (self.adjustments) {
                for (let i = 0; i < actors.length; i++) {
                    actorAdjustments[actors[i].uuid] = self.adjustments[i];
                }
            }
    
            Tally.distribute(actorAdjustments);
            self.adjustments = undefined;
            self.close();
        });
    }

    _updateObject(event, formData) {
        const data = foundry.utils.expandObject(formData);
        const adjustment = Object.values(data.adjustment) || [];
        const adjustments = adjustment && (Array.isArray(adjustment) ? adjustment : [adjustment]);
        this.adjustments = adjustments;
        setTimeout(() => this.render(), 0);
    }

    _onDrop(event) {
        let data;
        try {
            data = JSON.parse(event.dataTransfer.getData("text/plain"));
        } catch(err) {
            return false;
        }
        
        if (data.type === "Actor") {
            const actor = fromUuidSync(data.uuid);
            if (actor.type === "character") {
                game.settings.set("xp-tally", "actors", [...game.settings.get("xp-tally", "actors"), data.uuid]);
            }
        }
    }
}