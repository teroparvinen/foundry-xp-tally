import { Tally } from "../tally.js";

export class History extends FormApplication {
    static instance = null;

    static activate() {
        if (!this.instance) {
            this.instance = new History();
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
            height: 600,
            width: 700,
            id: "xp-tally-history",
            template: "modules/xp-tally/templates/history.hbs",
            title: "xp-tally.history",
            resizable: true,
            userId: game.userId,
            scrollY: ['.xp-tally__history-list', '.xp-tally__history-rewards']
        });
    }

    getData(options) {
        const history = Tally.history.map(h => ({
            timestamp: h.timestamp,
            shares: Object.entries(h.shares).map(e => {
                const xpShare = e[0];
                const actorUuids = e[1];
                return {
                    actors: actorUuids.map(u => fromUuidSync(u)?.name ?? "Unknown").join(", "),
                    xpShare
                };
            }),
            rewards: h.rewards
        }))
        const index = this.index;
        const rewards = this.index !== undefined && history[this.index].rewards;
        return { history, rewards, index };
    }

    activateListeners(html) {
        super.activateListeners(html);

        const self = this;
        html.find('.xp-tally__history').click(function(event) {
            self.index = parseInt(this.dataset.index);
            self.render();
        });

        new ContextMenu(html, '.xp-tally__history', [{
            name: "xp-tally.delete-history",
            icon: '<i class="fas fa-trash"></i>',
            callback: async elem => {
                const index = elem[0].dataset.index;
                if (self.index == index) {
                    self.index = undefined;
                }
                await Tally.removeHistory(index);
            }
        }]);
    }

    _updateObject() {}
}