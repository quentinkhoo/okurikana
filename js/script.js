document.addEventListener('DOMContentLoaded', () => {
    const editorArea = document.getElementById('editor-area');
    const loadingOverlay = document.getElementById('loading-overlay');
    const themeToggleButton = document.getElementById('theme-toggle');
    const placeholder = document.getElementById('placeholder');
    let kuroshiro = null;


    // --- THEME TOGGLE LOGIC ---
    const applyTheme = (theme) => {
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
            themeToggleButton.textContent = '☀️';
        } else {
            document.body.classList.remove('dark-mode');
            themeToggleButton.textContent = '🌙';
        }
    };

    themeToggleButton.addEventListener('click', () => {
        const isDarkMode = document.body.classList.contains('dark-mode');
        const newTheme = isDarkMode ? 'light' : 'dark';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    });

    // --- KUROSHIRO INITIALIZATION ---
    const initializeKuroshiro = async () => {
        try {
            const Kuroshiro = window.Kuroshiro.default;
            const KuromojiAnalyzer = window.KuromojiAnalyzer;
            kuroshiro = new Kuroshiro();
            await kuroshiro.init(new KuromojiAnalyzer({ dictPath: './dict' }));
        } catch (err) {
            console.error('Kuroshiro initialization failed:', err);
            loadingOverlay.innerHTML = '<p style="color: #ef4444;">Dictionary failed to load.</p>';
        } finally {
            loadingOverlay.classList.add('hidden');
            editorArea.readOnly = false;
            editorArea.focus();
        }
    };

    const insertTextAtCursor = async (text) => {
        let selection = window.getSelection();
        if (selection.rangeCount > 0) {
            let range = selection.getRangeAt(0);
            range.deleteContents(); // Optional: remove any selected content
            let textNode = document.createTextNode(text);
            range.insertNode(textNode);

            // Move the caret after the inserted text
            range.setStartAfter(textNode);
            range.setEndAfter(textNode);
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }

    // --- NEW GLOBAL CONVERSION ALGORITHM ---
    const handleEnterPress = async (event) => {
        if (event.isComposing || event.key !== 'Enter') {
            return;
        }
        event.preventDefault();
        if (!kuroshiro) return;

        // 1. MARK: Get the current cursor position and place a unique marker string.
        const cursorPosition = editorArea.selectionStart;
        const originalValue = editorArea.value;
        const CURSOR_MARKER = '||CURSOR||'; // A unique string that won't be in the text.

        const textWithMarker = 
            originalValue.substring(0, cursorPosition) + 
            CURSOR_MARKER + 
            originalValue.substring(cursorPosition);

        // 2. STRIP & PREPARE: Strip old furigana from the text.
        const rawTextWithMarker = textWithMarker.replace(/[\(\（][あ-ん]+[\)\）]/g, '');
        
        // Replace the marker with a newline *followed by* the marker.
        // This inserts the line break for conversion while keeping our bookmark.
        const textToConvert = rawTextWithMarker.replace(CURSOR_MARKER, '\n' + CURSOR_MARKER);

        try {
            // 3. RE-APPLY: Process the entire text block with Kuroshiro.
            const convertedTextWithMarker = await kuroshiro.convert(textToConvert, {
                mode: 'okurigana',
                to: 'hiragana',
            });

            // 4. REBUILD & MOVE CURSOR: Find the marker's final position.
            const newCursorPos = convertedTextWithMarker.indexOf(CURSOR_MARKER);
            
            // Remove the marker to get the final, clean text.
            const finalText = convertedTextWithMarker.replace(CURSOR_MARKER, '');

            // Set the editor's content to the final, converted text.
            editorArea.value = finalText;

            // Move the cursor to where the marker was.
            if (newCursorPos !== -1) {
                editorArea.focus();
                editorArea.selectionStart = editorArea.selectionEnd = newCursorPos;
            }
            
            // Ensure the new line is visible by scrolling if needed.
            editorArea.scrollTop = editorArea.scrollHeight;

        } catch (err) {
            console.error('Global conversion failed:', err);
        }
    };


    // --- INITIALIZATION ---
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);
    initializeKuroshiro();
    editorArea.addEventListener('keydown', handleEnterPress);
;
});

