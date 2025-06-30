// sheets/item-sheet.js

/**
 * Extend the basic Foundry VTT ItemSheet with a custom RPG system sheet.
 * This class handles the rendering and logic for different Item types.
 */
export class HowToBeAHeroItemSheet extends ItemSheet {

    /**
     * Define default options for the ItemSheet.
     * @override
     */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["how-to-be-a-hero", "sheet", "item"],
            width: 500,
            height: 400,
            // We'll dynamically set the template based on item type in getData()
        });
    }

    /**
     * Get the data for rendering the sheet.
     * Dynamically chooses the template based on the item type.
     * @override
     */
    getData() {
        const data = super.getData();
        data.system = data.item.system; // Make system data easily accessible

        // Set the appropriate template based on the item type
        data.enrichedDescription = TextEditor.enrichHTML(data.system.description || '', {async: false});
        data.enrichedEffect = TextEditor.enrichHTML(data.system.effect || '', {async: false}); // For traits

        // Assign the correct template path dynamically
        switch (this.item.type) {
            case "skill":
                this.options.template = "systems/how-to-be-a-hero/templates/item/item-skill-sheet.html";
                break;
            case "equipment":
                this.options.template = "systems/how-to-be-a-hero/templates/item/item-equipment-sheet.html";
                break;
            case "trait":
                this.options.template = "systems/how-to-be-a-hero/templates/item/item-trait-sheet.html";
                break;
            default:
                // Fallback or error handling
                console.warn(`How to Be a Hero | No specific template for item type: ${this.item.type}`);
                this.options.template = "systems/how-to-be-a-hero/templates/item/item-default-sheet.html"; // A default minimal sheet
        }

        console.log("Item Sheet Data:", data); // Log the data for debugging
        return data;
    }

    /**
     * Activates listeners for sheet events.
     * @override
     * @param {jQuery} html The rendered HTML of the sheet.
     */
    activateListeners(html) {
        super.activateListeners(html);

        // Everything below here is only needed if the sheet is editable
        if (!this.options.editable) return;

        // Handle rich text editor changes (for description, notes, etc.)
        html.find(".editor-content[data-edit]").each((i, div) => {
            const field = div.dataset.edit;
            if (!field) return;
            const editor = div.editor;
            if (editor) { // Check if editor exists
                editor.deactivate(); // Deactivate existing editor if any
            }
            const newEditor = new TinyMCE.Editor(
                {
                    target: div,
                    menubar: false,
                    toolbar: "bold italic strikethrough | alignleft aligncenter alignright | bullist numlist | link image media | code",
                    plugins: "lists link image media code",
                    forced_root_block: "", // Important for Foundry's inline content
                    setup: (editor) => {
                        editor.on('change', () => {
                            // Save content back to data model
                            this.item.update({ [`system.${field}`]: editor.getContent() });
                        });
                    }
                },
                TinyMCE.EditorManager
            );
            newEditor.render();
            div.editor = newEditor; // Store editor instance on element
        });
    }
}
