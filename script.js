document.addEventListener('DOMContentLoaded', () => {
    const editorArea = document.getElementById('editor-area');
    const loadingOverlay = document.getElementById('loading-overlay');
    let kuroshiro = null;

    // Initializes the Kuroshiro instance and downloads the dictionary
    const initializeKuroshiro = async () => {
        // Access libraries from the global window object (loaded via CDN in index.html)
        const Kuroshiro = window.Kuroshiro.default;
        const KuromojiAnalyzer = window.KuromojiAnalyzer;

        if (!Kuroshiro || !KuromojiAnalyzer) {
            console.error("Kuroshiro libraries not found.");
            loadingOverlay.innerHTML = '<p style="color: #ef4444;">Required libraries could not be loaded.</p>';
            return;
        }

        try {
            kuroshiro = new Kuroshiro();
            // Initialize with the dictionary from a CDN
            await kuroshiro.init(new KuromojiAnalyzer({ dictPath: "https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/dict" }));
        } catch (err)
        {
            console.error('Kuroshiro initialization failed:', err);
            loadingOverlay.innerHTML = '<p style="color: #ef4444;">Library initialization failed. Please refresh.</p>';
        } finally {
            // Hide the loading overlay and enable the editor
            loadingOverlay.classList.add('hidden');
            editorArea.setAttribute('contenteditable', 'true');
            editorArea.focus();
        }
    };

    // This function handles the text conversion
    const handleInputConversion = async () => {
        if (!kuroshiro) return;

        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        const currentNode = range.startContainer;
        
        // 1. First, ensure the cursor is actually inside our editor.
        if (!editorArea.contains(currentNode)) {
            return;
        }

        // 2. Only process raw text nodes. If the node is not text, exit.
        if (currentNode.nodeType !== Node.TEXT_NODE) {
            return;
        }

        // 3. If the text node's parent is already marked as converted, do nothing.
        // This prevents re-converting text that's already been processed.
        if (currentNode.parentNode.dataset && currentNode.parentNode.dataset.converted === 'true') {
            return;
        }

        const textToConvert = currentNode.textContent;
        if (!textToConvert.trim()) return;

        try {
            const resultHtml = await kuroshiro.convert(textToConvert, {
                mode: 'okurigana', // Or 'furigana'
                to: 'hiragana',
            });

            // Create a single wrapper span for the entire converted block
            const wrapperSpan = document.createElement('span');
            wrapperSpan.dataset.converted = 'true'; // Mark this block as converted
            wrapperSpan.innerHTML = resultHtml;

            // The node we want to replace is the text node itself (`currentNode`)
            const parentNode = currentNode.parentNode;
            if (!parentNode) return; // Safety check

            parentNode.replaceChild(wrapperSpan, currentNode);

            // Restore the cursor position to the end of the newly inserted content
            const newRange = document.createRange();
            newRange.selectNodeContents(wrapperSpan); // Select everything inside the new span
            newRange.collapse(false); // Collapse the selection to its end point
            selection.removeAllRanges(); // Clear any existing selection
            selection.addRange(newRange); // Apply the new selection

        } catch (err) {
            console.error('Conversion failed:', err);
        }
    };

    // New handler for keydown events
    const handleKeyPress = async (event) => {
        // Only trigger conversion if the 'Enter' key is pressed
        if (event.key === 'Enter') {
            event.preventDefault(); // Prevent the default browser action for Enter

            // First, process the current line of text for conversion.
            await handleInputConversion();

            // After conversion, manually create a new line and move the cursor.
            const selection = window.getSelection();
            if (!selection.rangeCount) return;

            const range = selection.getRangeAt(0);
            
            // Create a new div, which browsers often use to represent a new paragraph/line.
            const newLine = document.createElement('div');
            
            // Add a <br> tag inside. This is a robust way for contenteditable elements
            // to recognize a new line and allow typing on it.
            newLine.innerHTML = '<br>';
            
            // Insert the new line element at the current cursor position.
            range.insertNode(newLine);

            // Move the cursor to the position right after the newly created line break element.
            // This effectively places the cursor on the new line, ready for typing.
            range.setStartAfter(newLine);
            range.collapse(true);
            
            selection.removeAllRanges();
            selection.addRange(range);
        }
    };

    // Start the initialization process when the page is ready
    initializeKuroshiro();
    
    // Add the event listener for keydown events
    editorArea.addEventListener('keydown', handleKeyPress);
});

