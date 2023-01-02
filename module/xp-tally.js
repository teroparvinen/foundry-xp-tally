import { AwardXp } from "./apps/award.js";
import { History } from "./apps/history.js";
import { XpTracker } from "./apps/tracker.js";
import { setupSocket } from "./socket.js";
import { Tally } from "./tally.js";
import { XpCard } from "./xp-card.js";

let lastBadgeCount;

Hooks.on("getSceneControlButtons", (controls) => {
    if (game.user.isGM) {
        const tokens = controls.find((c) => c.name === "token");
        if (tokens) {
            tokens.tools.push({
                name: "xp-tally",
                title: "xp-tally.tracker-title",
                icon: "fas fa-trophy",
                visible: true,
                onClick: () => XpTracker.activate(),
                button: true
            });
        }
    }
});

Hooks.on("init", () => {
    game.settings.register("xp-tally", "rewards", { 
        scope: "world",
        type: Array,
        default: [],
        onChange: value => {
            XpTracker.refresh();
            AwardXp.refresh();

            updateToolBadge();
        }
    });
    game.settings.register("xp-tally", "actors", { 
        scope: "world",
        type: Array,
        default: [],
        onChange: value => {
            AwardXp.refresh();
        }
    });
    game.settings.register("xp-tally", "history", { 
        scope: "world",
        type: Array,
        default: [],
        onChange: value => {
            History.refresh();
        }
    });

    lastBadgeCount = game.settings.get("xp-tally", "rewards").length;

    game.settings.register("xp-tally", "show-badge", {
        name: "xp-tally.setting-show-badge",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
        onChange: value => {
            updateToolBadge();
        }
    });
    game.settings.register("xp-tally", "individual-adjustment", {
        name: "xp-tally.setting-individual-adjustment",
        hint: "xp-tally.setting-individual-adjustment-hint",
        scope: "world",
        config: true,
        type: Boolean,
        default: false,
        onChange: value => {
            AwardXp.refresh();
        }
    });
    game.settings.register("xp-tally", "application", {
        name: "xp-tally.settings-application",
        scope: "world",
        config: true,
        default: "collect",
        choices: {
            collect: "xp-tally.settings-application-collect",
            announce: "xp-tally.settings-application-announce",
            auto: "xp-tally.settings-application-auto"
        },
        type: String
    });
});

Hooks.on("setup", () => {
    setupSocket();
});

Hooks.on("updateCombatant", (combatant, data) => {
    if (game.user.isGM && Object.keys(data).includes("defeated")) {
        const defeated = data.defeated;
        const tokenDoc = combatant.token;
        const actor = combatant.actor;

        if (!actor.hasPlayerOwner && actor.system.details.xp?.value) {
            if (!defeated) {
                Tally.removeToken(tokenDoc);
            } else {
                Tally.addToken(tokenDoc);
            }
        }
    }
});

Hooks.on("renderChatLog", (app, html, data) => {
    XpCard.activateListeners(html);
});

Hooks.on("renderChatMessage", (message, html, data) => {
    const buttons = html.find('.xp-card__buttons button');
    if (buttons.length) {
        buttons.each(function() {
            const actor = fromUuidSync(this.dataset.actorUuid);
            if (!actor || !actor.isOwner) {
                $(this).hide();
            }
        })
    }
});

Hooks.on("renderSceneControls", (app, html, data) => {
    if (game.user.isGM) {
        const tool = html.find('.control-tool[data-tool="xp-tally"]');
        tool.css("position", "relative");
    
        const count = game.settings.get("xp-tally", "rewards").length;
        tool.append(`<div id="xp-tally__tool-badge">${count}</div>`);
        if (!count) {
            $('#xp-tally__tool-badge').hide();    
        }
    }
});

function updateToolBadge() {
    if (game.user.isGM) {
        const count = game.settings.get("xp-tally", "rewards").length;
        const badge = $('#xp-tally__tool-badge');
        const isEnabled = count && game.settings.get("xp-tally", "show-badge");
        badge.text(count);
        isEnabled ? badge.show() : badge.hide();
    
        if (isEnabled && count > lastBadgeCount) {
            const el = badge[0];
            el.classList.remove("pulse");
            void el.offsetWidth;
            el.classList.add("pulse");
        }
    
        lastBadgeCount = count;
    }
}