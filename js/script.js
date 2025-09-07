document.addEventListener('DOMContentLoaded', () => {
    const editorArea = document.getElementById('editor-area');
    const loadingOverlay = document.getElementById('loading-overlay');
    const themeToggleButton = document.getElementById('theme-toggle');
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
            // Assumes the 'dict' folder is in the same main directory as your index.html
            await kuroshiro.init(new KuromojiAnalyzer({ dictPath: './dict' }));

        } catch (err) {
            console.error('Kuroshiro initialization failed:', err);
            loadingOverlay.innerHTML = '<p style="color: #ef4444;">Dictionary failed to load. Please check the console for details.</p>';
        } finally {
            loadingOverlay.classList.add('hidden');
            editorArea.setAttribute('contenteditable', 'true');
            editorArea.focus();
        }
    };

    // --- CONVERSION LOGIC ---
    const handleInputConversion = async (currentBlock) => {
        if (!kuroshiro || !currentBlock) return;

        try {
            const fragment = document.createDocumentFragment();
            const childNodes = Array.from(currentBlock.childNodes);

            for (const node of childNodes) {
                if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
                    const rawText = await kuroshiro.convert(node.textContent, {
                        mode: 'okurigana',
                        to: 'hiragana',
                    });
                    const formattedHtml = rawText.replace(/\[(.*?)\]/g, '<em class="okurigana">[$1]</em>');
                    const wrapperSpan = document.createElement('span');
                    wrapperSpan.innerHTML = formattedHtml;
                    fragment.appendChild(wrapperSpan);
                } else {
                    fragment.appendChild(node.cloneNode(true));
                }
            }

            currentBlock.innerHTML = '';
            currentBlock.appendChild(fragment);

            // Set cursor to the end of the modified block
            const selection = window.getSelection();
            const newRange = document.createRange();
            newRange.selectNodeContents(currentBlock);
            newRange.collapse(false);
            selection.removeAllRanges();
            selection.addRange(newRange);

        } catch (err) {
            console.error('Conversion failed:', err);
        }
    };
    
    // --- HELPER FUNCTION TO FIND THE CURRENT LINE ---
    const findCurrentBlock = (range) => {
        let node = range.startContainer;
        if (node.nodeType === Node.TEXT_NODE) {
            node = node.parentNode;
        }
        while (node && node.parentNode !== editorArea) {
            node = node.parentNode;
        }
        return (node === editorArea) ? null : node;
    };

    // --- EVENT LISTENERS ---
    const handleKeyPress = async (event) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();

        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        let currentBlock = findCurrentBlock(range);

        // If there's no text or block, just create a new line
        if (!editorArea.firstChild) {
            const firstDiv = document.createElement('div');
            firstDiv.innerHTML = '<br>';
            editorArea.appendChild(firstDiv);
            range.setStart(firstDiv, 0);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
            return;
        }
        
        // Recovery logic for loose text
        if (!currentBlock) {
             console.warn("No valid block found; attempting to recover editor structure.");
             const newBlock = document.createElement('div');
             while (editorArea.firstChild) {
                 newBlock.appendChild(editorArea.firstChild);
             }
             editorArea.appendChild(newBlock);
             currentBlock = newBlock;
             range.selectNodeContents(currentBlock);
             range.collapse(false);
             selection.removeAllRanges();
             selection.addRange(range);
        }

        await handleInputConversion(currentBlock);

        const newDiv = document.createElement('div');
        newDiv.innerHTML = '<br>';
        currentBlock.insertAdjacentElement('afterend', newDiv);

        // Move cursor to the new line
        range.setStart(newDiv, 0);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
    };

    // --- INITIALIZATION ---
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);
    initializeKuroshiro();
    editorArea.addEventListener('keydown', handleKeyPress);
});