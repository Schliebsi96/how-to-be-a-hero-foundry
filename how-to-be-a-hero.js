
class HowToBeAHeroActor extends Actor {
   
    prepareData() {
        super.prepareData();

        const actorData = this.system; // The system-specific data for the actor
        const items = this.items;     // All items owned by this actor

        // Initialize skill categories for calculations
        actorData.skillCategories = {
            Handeln: { totalBase: 0, skills: [] },
            Wissen: { totalBase: 0, skills: [] },
            Soziales: { totalBase: 0, skills: [] },
            Other: { totalBase: 0, skills: [] } // For skills without a specific category
        };

        // First pass: Group skills by category and sum their base values
        for (let item of items) {
            if (item.type === "skill") {
                const category = item.system.category || "Other";
                if (actorData.skillCategories[category]) {
                    actorData.skillCategories[category].totalBase += item.system.baseValue;
                    actorData.skillCategories[category].skills.push(item);
                }
            }
        }

        // Second pass: Calculate categoryModifier and totalValue for each skill
        for (let item of items) {
            if (item.type === "skill") {
                const category = item.system.category || "Other";
                const categoryTotalBase = actorData.skillCategories[category].totalBase;
                // Calculate category modifier (total of base skills in category / 10)
                // Use Math.floor to ensure an integer, as per typical RPG modifiers
                item.system.categoryModifier = Math.floor(categoryTotalBase / 10);
                // Calculate total skill value
                item.system.totalValue = item.system.baseValue + item.system.categoryModifier;
            }
        }

        // Example: Calculate remaining skill points (if hero type)
        if (this.type === "hero") {
            let spentPoints = 0;
            for (let item of items) {
                if (item.type === "skill") {
                    spentPoints += item.system.baseValue;
                }
            }
            actorData.skillPoints.remaining = actorData.skillPoints.total - spentPoints;
        }

        // You could add other derived data calculations here (e.g., max life points if derived)
        // actorData.lifePoints.max = actorData.derivedAttribute || 100;
        // actorData.lifePoints.value = Math.min(actorData.lifePoints.value, actorData.lifePoints.max);
    }

    /**
     * Handle skill rolls for the How to Be a Hero system.
     * This method creates a d100 roll and compares it to the skill's totalValue.
     * It can also incorporate an item's rollModifier and roll damage if applicable.
     * @param {string} skillName The name of the skill to roll.
     * @param {number} skillValue The total value of the skill.
     * @param {object} [itemData] Optional. The system data of an item that might modify the roll or deal damage.
     */
    async rollSkill(skillName, skillValue, itemData = {}) {
        let effectiveSkillValue = skillValue;
        let rollDescription = `${this.name} attempts a <strong>${skillName}</strong> check.`;
        let damageRoll = null;

        // Apply item roll modifier if present
        if (itemData && typeof itemData.rollModifier === 'number') {
            effectiveSkillValue += itemData.rollModifier;
            rollDescription += ` (Modified by ${itemData.rollModifier > 0 ? '+' : ''}${itemData.rollModifier} from ${itemData.name || 'item'})`;
        }

        // Create a new Roll object for a d100
        const roll = await new Roll("1d100").evaluate({ async: true });

        // Check if the roll is a success (roll <= effectiveSkillValue)
        const isSuccess = roll.total <= effectiveSkillValue;

        // Roll damage if item has damage specified and the skill roll was a success
        if (isSuccess && itemData && itemData.damage) {
            try {
                damageRoll = await new Roll(itemData.damage).evaluate({ async: true });
            } catch (err) {
                console.error(`How to Be a Hero | Failed to parse damage roll string: ${itemData.damage}`, err);
                // Handle invalid roll strings gracefully
                damageRoll = null;
            }
        }

        // Prepare the chat message content
        let chatContent = `
            <div class="how-to-be-a-hero-roll-card">
                <div class="roll-header">
                    ${rollDescription}
                </div>
                <div class="roll-result">
                    <span class="roll-label">Rolled:</span> <span class="roll-value">${roll.total}</span>
                    <span class="target-label"> vs. Target:</span> <span class="target-value">${effectiveSkillValue}</span>
                </div>
                <div class="roll-outcome ${isSuccess ? 'success' : 'failure'}">
                    ${isSuccess ? 'SUCCESS!' : 'FAILURE!'}
                </div>
                ${damageRoll ? `
                <div class="damage-result">
                    <span class="damage-label">Damage:</span> <span class="damage-value">${damageRoll.total}</span>
                    <span class="damage-formula">(${damageRoll.formula})</span>
                </div>` : ''}
            </div>
        `;

        // Create the chat message
        await ChatMessage.create({
            user: game.user.id,
            speaker: ChatMessage.getSpeaker({ actor: this }),
            content: chatContent,
            roll: roll,
            type: CONST.CHAT_MESSAGE_TYPES.ROLL
        });

        return { roll, isSuccess, damageRoll };
    }
}

class HowToBeAHeroItem extends Item {
    prepareData() {
        super.prepareData();
      }
}

// Import custom sheets
import { HowToBeAHeroActorSheet } from "./sheets/actor-sheet.js";
import { HowToBeAHeroItemSheet } from "./sheets/item-sheet.js";

Hooks.once("init", async function() {
    console.log("How to Be a Hero | Initializing system...");

    CONFIG.Actor.documentClass = HowToBeAHeroActor;
    CONFIG.Item.documentClass = HowToBeAHeroItem;

    Actors.unregisterSheet("core", ActorSheet);
    Actors.registerSheet("how-to-be-a-hero", HowToBeAHeroActorSheet, {
        types: ["hero"],
        makeDefault: true
    });
    Actors.registerSheet("how-to-be-a-hero", ActorSheet, {
        types: ["npc", "threat"],
        makeDefault: false
    });


    Items.unregisterSheet("core", ItemSheet);
    Items.registerSheet("how-to-be-a-hero", HowToBeAHeroItemSheet, {
        types: ["skill", "equipment", "trait"],
        makeDefault: true
    });


    // Example: Register a basic system setting (can expand on this later)
    game.settings.register("how-to-be-a-hero", "exampleSetting", {
        name: "HOWTOBEAHERO.ExampleSetting", // Localized string
        hint: "HOWTOBEAHERO.ExampleSettingHint", // Localized string
        scope: "world",
        config: true,
        type: Boolean,
        default: true
    });

    Handlebars.registerHelper('enrichHTML', (content) => {
        return TextEditor.enrichHTML(content);
    });

    Handlebars.registerHelper('isGreaterThanZero', (value) => {
        return value > 0;
    });
});

Hooks.once("ready", async function() {
    console.log("How to Be a Hero | System ready!");
});

Hooks.on("createActor", (actor, options, userId) => {
    if (userId === game.user.id && actor.type === "hero" && actor.items.size === 0) {
        console.log(`New hero actor created: ${actor.name}. Adding default skills.`);
        // Some default skills for a new Hero
        actor.createEmbeddedDocuments("Item", [
            {
                name: "Schießen",
                type: "skill",
                system: {
                    baseValue: 0,
                    category: "Handeln"
                }
            },
            {
                name: "Ausweichen",
                type: "skill",
                system: {
                    baseValue: 0,
                    category: "Handeln"
                }
            },
            {
                name: "Geschichte",
                type: "skill",
                system: {
                    baseValue: 0,
                    category: "Wissen"
                }
            },
            {
                name: "Überzeugen",
                type: "skill",
                system: {
                    baseValue: 0,
                    category: "Soziales"
                }
            },
            {
                name: "Fantasie",
                type: "skill",
                system: {
                    baseValue: 0,
                    category: "Soziales"
                }
            }
        ]);
    }
});

Hooks.on("updateActor", (actor, changes, options, userId) => {
    if (userId === game.user.id && changes.system) {
        console.log(`Actor system data updated: ${actor.name}`, changes.system);
    }
});

Hooks.on("updateItem", (item, changes, options, userId) => {
    if (userId === game.user.id && changes.system && item.actor) {
        console.log(`Item system data updated: ${item.name} owned by ${item.actor.name}`, changes.system);
        // If an item (like a skill) changes, its owning actor's data needs to be re-prepared
        // to ensure category modifiers and total skill values are up-to-date.
        item.actor.prepareData();
    }
});
