// Data loaded from window.initialData

class App {
    constructor() {
        // Initial State
        const defaultState = {
            cards: [],
            mode: 'study', // home, study, edit, dashboard, quiz
            isFlipped: false,
            currentCardIndex: 0,
            studyQueue: [],
            editingId: null,
            lastStudyDate: null,
            streak: 0,
            currentFolder: 'All', // 'All' or specific folder name
            folders: ['メイン'],
            studyLog: {} // { "YYYY-MM-DD": count }
        };

        // this.state will be populated by loadData
        this.state = defaultState;

        // Ensure studyLog exists (migration)
        if (!this.state.studyLog) this.state.studyLog = {};

        // Swipe gestures
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchEndX = 0;
        this.touchEndY = 0;

        // Audio
        this.synth = window.speechSynthesis;
        this.autoPlayTimer = null;
        this.isAutoPlaying = false; // Phase 4: Hands-free

        this.init();
    }

    init() {
        console.log("App initializing...");
        try {
            this.initTheme(); // Initialize theme first
            this.loadData(); // Load data from localStorage or initialData
            console.log("Data loaded. Cards:", this.state.cards ? this.state.cards.length : "null");

            // this.initFolderSelection(); // Set default folder logic - Removed as logic is handled in loadData/render

            if (!Array.isArray(this.state.cards)) {
                console.error("Cards is not an array, resetting.");
                this.state.cards = [];
            }

            // Migrating old data schema if necessary (adding image property)
            this.state.cards.forEach(card => {
                if (!card) return; // Guard against null cards
                if (!card.hasOwnProperty('image')) card.image = null;
                if (!card.hasOwnProperty('status')) card.status = 'unknown'; // 'known', 'unknown'
                if (!card.hasOwnProperty('tags')) card.tags = []; // New in Phase 4
            });

            this.updateShuffleOrder();
            this.render();
            this.setupSwipeListeners();
            this.updateStreakBadge(); // Ensure badge is updated on init
            console.log("App initialized successfully.");
        } catch (e) {
            console.error("Error during init details:", e);
            throw e;
        }

        // Global access for HTML event handlers
        window.app = this;
    }

    checkStreak() {
        const today = new Date().toDateString();
        const last = this.state.lastStudyDate;

        if (last === today) {
            // Already studied today
        } else if (last) {
            const lastDate = new Date(last);
            const diffTime = Math.abs(new Date(today) - lastDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                // Streak continues (Note: logic assumes checking on load. Real update happens on study)
                // Actually we just read the stored streak.
                // If diff > 1, streak is broken.
            } else if (diffDays > 1) {
                this.state.streak = 0;
            }
        }
        this.updateStreakBadge();
    }

    updateStreakBadge() {
        const el = document.getElementById('streak-badge');
        if (el) { // Check if element exists
            if (this.state.streak > 0) {
                el.textContent = `🔥 ${this.state.streak} `;
                el.classList.remove('hidden');
            } else {
                el.classList.add('hidden');
            }
        }
    }

    markStudiedToday() {
        const today = new Date().toDateString();
        if (this.state.lastStudyDate !== today) {
            if (this.state.lastStudyDate) {
                const lastDate = new Date(this.state.lastStudyDate);
                const diffTime = Math.abs(new Date(today) - lastDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays === 1) {
                    this.state.streak++;
                } else {
                    this.state.streak = 1;
                }
            } else {
                this.state.streak = 1;
            }
            this.state.lastStudyDate = today;
            this.saveData();
            this.updateStreakBadge();
        }
    }


    // --- Data Management ---

    render() {
        // Update View Visibility
        ['study', 'edit', 'dashboard', 'quiz'].forEach(m => {
            const view = document.getElementById(`${m}-view`);
            if (view) {
                if (m === this.state.mode) {
                    view.classList.remove('hidden');
                } else {
                    view.classList.add('hidden');
                }
            }
        });

        // Update Nav Active State
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        const navId = this.state.mode === 'quiz' ? 'nav-quiz' : `nav-${this.state.mode}`;
        const activeNav = document.getElementById(navId);
        if (activeNav) activeNav.classList.add('active');

        // Mode specific render logic
        if (this.state.mode === 'study') {
            this.renderCard();
            this.updateProgress();
        } else if (this.state.mode === 'edit') {
            this.renderList();
        } else if (this.state.mode === 'dashboard') {
            this.renderDashboard();
        } else if (this.state.mode === 'quiz') {
            // Initial render request or return to tab
            if (!this.quizState) {
                this.startQuiz();
            }
        }
    }

    // --- Quiz Logic ---

    startQuiz() {
        try {
            console.log("Starting Quiz...");
            // Filter cards based on current folder
            let pool = this.filterCardsByFolder(this.state.folders.includes(this.state.currentFolder) ? this.state.currentFolder : 'All');

            console.log("Pool size:", pool.length);

            if (pool.length < 4) {
                alert('クイズをするには、このフォルダに少なくとも4枚のカードが必要です。');
                this.setMode('study'); // Go back
                return;
            }

            // Shuffle pool
            pool = this.getRandomSubarray(pool, pool.length); // Shuffle all

            this.quizState = {
                queue: pool,
                currentIndex: 0,
                correctCount: 0,
                currentQuestion: null,
                isAnswered: false
            };

            this.renderQuizQuestion();
        } catch (e) {
            console.error("Quiz Error:", e);
            alert("クイズの開始中にエラーが発生しました: " + e.message);
        }
    }

    renderQuizQuestion() {
        try {
            const qState = this.quizState;
            if (!qState) {
                console.error("No quiz state");
                return;
            }

            if (qState.currentIndex >= qState.queue.length) {
                // End of quiz
                alert(`クイズ終了！\n正解数: ${qState.correctCount} / ${qState.queue.length}`);
                this.quizState = null; // Reset
                this.startQuiz(); // Restart
                return;
            }

            const card = qState.queue[qState.currentIndex];
            if (!card) {
                alert("Error: Card is undefined at index " + qState.currentIndex);
                return;
            }

            qState.currentQuestion = card;
            qState.isAnswered = false;

            // UI Updates
            const indexEl = document.getElementById('quiz-index');
            if (indexEl) indexEl.textContent = qState.currentIndex + 1;
            const totalEl = document.getElementById('quiz-total');
            if (totalEl) totalEl.textContent = qState.queue.length;

            const questionEl = document.getElementById('quiz-question');
            if (questionEl) {
                questionEl.textContent = card.question;
            } else {
                alert("Error: quiz-question element not found!");
            }

            // Reset Feedback
            const feedbackEl = document.getElementById('quiz-feedback');
            if (feedbackEl) {
                feedbackEl.classList.add('hidden');
                feedbackEl.textContent = '';
                feedbackEl.style.color = '';
            }

            const controlsEl = document.getElementById('quiz-controls');
            if (controlsEl) controlsEl.classList.add('hidden');

            const explEl = document.getElementById('quiz-explanation');
            if (explEl) explEl.textContent = '';

            // Generate Options
            // 1 Correct + 3 Distractors
            const distractors = this.getDistractors(card, qState.queue, 3);
            const options = this.getRandomSubarray([card, ...distractors], 4);

            const optionsContainer = document.getElementById('quiz-options');
            if (optionsContainer) {
                optionsContainer.innerHTML = '';
                options.forEach(opt => {
                    const btn = document.createElement('button');
                    btn.className = 'btn btn-outline quiz-option';
                    btn.style.textAlign = 'left';
                    btn.style.padding = '1rem';
                    btn.style.width = '100%';
                    btn.textContent = opt.answer;
                    btn.onclick = () => this.handleQuizSelection(opt, btn);
                    optionsContainer.appendChild(btn);
                });
            } else {
                alert("Error: quiz-options container not found!");
            }
        } catch (e) {
            alert("Render Quiz Error: " + e.message);
            console.error(e);
        }
    }

    getDistractors(correctCard, pool, count) {
        // Simple random selection from pool excluding correctCard
        const candidates = pool.filter(c => c.id !== correctCard.id);
        return this.getRandomSubarray(candidates, count);
    }

    getRandomSubarray(arr, size) {
        var shuffled = arr.slice(0), i = arr.length, temp, index;
        while (i--) {
            index = Math.floor(Math.random() * (i + 1));
            temp = shuffled[i];
            shuffled[i] = shuffled[index];
            shuffled[index] = temp;
        }
        return shuffled.slice(0, size);
    }

    handleQuizSelection(selectedCard, btnElement) {
        if (this.quizState.isAnswered) return;
        this.quizState.isAnswered = true;

        const correctCard = this.quizState.currentQuestion;
        const isCorrect = selectedCard.id === correctCard.id;

        const feedbackEl = document.getElementById('quiz-feedback');
        if (feedbackEl) {
            feedbackEl.classList.remove('hidden');
            if (isCorrect) {
                this.quizState.correctCount++;
                feedbackEl.textContent = '正解! 🙆‍♂️';
                feedbackEl.style.color = '#10b981';
            } else {
                feedbackEl.textContent = '不正解... 🙅‍♂️';
                feedbackEl.style.color = '#ef4444';
            }
        }

        // Style all buttons
        const allBtns = document.querySelectorAll('.quiz-option');
        allBtns.forEach(btn => {
            // Highlight correct answer
            if (btn.textContent === correctCard.answer) {
                btn.classList.remove('btn-outline');
                btn.style.backgroundColor = '#d1fae5'; // Light green
                btn.style.borderColor = '#10b981';
                btn.style.color = '#065f46';
            } else if (btn === btnElement && !isCorrect) {
                // Highlight selected wrong answer
                btn.classList.remove('btn-outline');
                btn.style.backgroundColor = '#fee2e2'; // Light red
                btn.style.borderColor = '#ef4444';
                btn.style.color = '#991b1b';
            }
            btn.disabled = true;
        });

        // Show Explanation
        const expEl = document.getElementById('quiz-explanation');
        if (expEl) {
            if (correctCard.explanation) {
                expEl.textContent = correctCard.explanation;
            } else {
                expEl.textContent = '（解説はありません）';
            }
            expEl.classList.remove('hidden'); // Ensure it is visible if previously hidden? Actually logic marks the container
        }

        const controlsEl = document.getElementById('quiz-controls');
        if (controlsEl) controlsEl.classList.remove('hidden');
    }

    nextQuizQuestion() {
        this.quizState.currentIndex++;
        this.renderQuizQuestion();
    }

    // --- End Quiz Logic ---


    loadData() {
        try {
            // New unified storage (v3 reset for folder fix)
            const savedState = localStorage.getItem('skillTestAppState_v3');

            // Legacy storage (fallback)
            // const legacyCards = localStorage.getItem('skillTestCards'); // Disable legacy for clean slate
            const legacyCards = null;
            const legacyMeta = localStorage.getItem('skillTestMeta');

            if (savedState) {
                const parsed = JSON.parse(savedState);
                // Merge parsed state into default structure to ensure new fields exist
                this.state = { ...this.state, ...parsed };

                // Ensure cards is array
                if (!Array.isArray(this.state.cards)) {
                    console.warn("State cards not array, resetting.");
                    this.state.cards = [...(window.initialData || [])];
                }

                // Ensure lockedFolders exists
                if (!this.state.lockedFolders) {
                    this.state.lockedFolders = [];
                }
            } else if (legacyCards) {
                // Migration path
                console.log("Migrating legacy data...");
                try {
                    this.state.cards = JSON.parse(legacyCards);
                    if (legacyMeta) {
                        const meta = JSON.parse(legacyMeta);
                        this.state.streak = meta.streak || 0;
                        this.state.lastStudyDate = meta.lastStudyDate || null;
                    }
                } catch (e) {
                    console.error("Migration failed, using default.");
                    this.state.cards = [...(window.initialData || [])];
                }
            } else {
                // First run
                if (window.initialData) {
                    this.state.cards = [...window.initialData];
                } else {
                    this.state.cards = [];
                }
            }

            // FORCE MODE TO STUDY ON LOAD
            this.state.mode = 'study';
            this.state.isFlipped = false;
            this.state.editingId = null;

            // Merge initialData with Priority on Source File for Content
            if (window.initialData) {
                const masterIds = new Set(window.initialData.map(c => c.id));
                const localMap = new Map(this.state.cards.map(c => [c.id, c]));
                const newCards = [];

                // 1. Process Master Data (data.js)
                // This ensures all cards in data.js are present and content is up-to-date
                window.initialData.forEach(masterCard => {
                    const localCard = localMap.get(masterCard.id);
                    if (localCard) {
                        // Merge: Master content + Local progress
                        newCards.push({
                            ...masterCard, // Use master for Q, A, Explanation, Folder
                            status: localCard.status || 'unknown',
                            srs: localCard.srs || { interval: 0, reps: 0, ef: 2.5, nextReview: Date.now() },
                            tags: localCard.tags || [],
                            // Preserve image if master doesn't have one but local does? 
                            // Usually master image is authoritative if set, otherwise keep local (user upload)
                            image: masterCard.image || localCard.image
                        });
                    } else {
                        // New card from Master
                        newCards.push({
                            ...masterCard,
                            status: 'unknown',
                            srs: { interval: 0, reps: 0, ef: 2.5, nextReview: Date.now() },
                            tags: []
                        });
                    }
                });

                // 2. Process User Custom Data (Preserve cards created in-app)
                this.state.cards.forEach(localCard => {
                    if (!masterIds.has(localCard.id)) {
                        // Card exists locally but not in data.js.
                        // DECISION: Is it a user-created card or a deleted default card?
                        // User cards usually have timestamp IDs (13 digits). Legacy/Default IDs are usually shorter.
                        if (localCard.id.length >= 13 && /^\d+$/.test(localCard.id)) {
                            // Likely a user-created card (timestamp) -> KEEP
                            newCards.push(localCard);
                        } else {
                            // Likely a deleted default card -> DROP
                            console.log("Removing orphaned card:", localCard.id, localCard.question);
                        }
                    }
                });

                this.state.cards = newCards;
            }

            // Fix Invalid Statuses
            let fixedCount = 0;
            this.state.cards.forEach(card => {
                if (!card) return;
                // Fix Status
                if (card.status !== 'known' && card.status !== 'unknown') {
                    card.status = 'unknown';
                    fixedCount++;
                }
                // Fix SRS
                if (!card.srs) {
                    card.srs = { interval: 0, reps: 0, ef: 2.5, nextReview: Date.now() };
                }
                // Fix Tags
                if (!card.tags) card.tags = [];
                // Fix Folder
                if (!card.folder) card.folder = 'メイン';
            });
            // Initialize Folders
            if (!Array.isArray(this.state.folders)) {
                this.state.folders = ['メイン'];
            }
            // Merge from cards (recover lost folders)
            this.state.cards.forEach(c => {
                if (c.folder && !this.state.folders.includes(c.folder)) {
                    this.state.folders.push(c.folder);
                }
            });
            // Ensure unique and sorted
            this.state.folders = [...new Set(this.state.folders)].sort();

            this.saveData();
        } catch (e) {
            console.error("loadData failed:", e);
            alert("データの読み込みに失敗しました。");
        }
    }

    saveData() {
        try {
            // Save entire state including current index and mode
            localStorage.setItem('skillTestAppState_v3', JSON.stringify(this.state));

            // Cleanup legacy (optional, but good to avoid confusion)
            localStorage.removeItem('skillTestCards');
            localStorage.removeItem('skillTestMeta');
            localStorage.removeItem('flashcard_app_data');
        } catch (e) {
            console.error("Save failed:", e);
        }

        // Ensure shuffle order exists (Modified to allow subsets for review mode)
        // Removed auto-regeneration here to prevent infinite recursion loop with updateShuffleOrder
        if (!this.state.shuffledIndices) {
            this.state.shuffledIndices = [];
        }

        this.render();
    }

    createFolder() {
        const name = prompt("新しいフォルダ名を入力してください:");
        if (!name) return;
        const trimmed = name.trim();
        if (!trimmed) return;
        if (this.state.folders.includes(trimmed)) {
            alert("そのフォルダは既に存在します。");
            return;
        }
        this.state.folders.push(trimmed);
        this.state.folders.sort();
        this.saveData();
        this.renderFolderSelector();
        if (this.state.mode === 'edit') this.renderEditMode();
        this.showToast(`フォルダ「${trimmed}」を作成しました`);
    }

    renameFolder() {
        const current = this.state.currentFolder;
        if (!current || current === 'All' || current === 'メイン') {
            this.showToast("このフォルダは名前変更できません");
            return;
        }

        const newName = prompt(`フォルダ「${current}」の新しい名前を入力してください:`, current);
        if (!newName) return;
        const trimmed = newName.trim();
        if (!trimmed || trimmed === current) return;

        if (this.state.folders.includes(trimmed)) {
            alert("そのフォルダ名は既に使用されています。");
            return;
        }

        // Update folders list
        const index = this.state.folders.indexOf(current);
        if (index !== -1) {
            this.state.folders[index] = trimmed;
            this.state.folders.sort();
        }

        // Update cards
        this.state.cards.forEach(c => {
            if (c.folder === current) {
                c.folder = trimmed;
            }
        });

        // Update locked list if present
        if (this.state.lockedFolders.includes(current)) {
            this.state.lockedFolders = this.state.lockedFolders.filter(f => f !== current);
            this.state.lockedFolders.push(trimmed);
        }

        this.state.currentFolder = trimmed;
        this.saveData();
        this.renderFolderSelector();
        this.renderEditMode();
        this.showToast(`フォルダ名を「${trimmed}」に変更しました`);
    }

    toggleFolderLock() {
        const current = this.state.currentFolder;
        if (!current || current === 'All' || current === 'メイン') {
            this.showToast("このフォルダのロック状態は変更できません");
            return;
        }

        if (this.state.lockedFolders.includes(current)) {
            // Unlock
            this.state.lockedFolders = this.state.lockedFolders.filter(f => f !== current);
            this.showToast(`フォルダ「${current}」のロックを解除しました`);
        } else {
            // Lock
            this.state.lockedFolders.push(current);
            this.showToast(`フォルダ「${current}」をロックしました`);
        }

        this.saveData();
        this.renderEditMode(); // Re-render to update buttons
    }

    handleFolderChange(folderName) {
        this.state.currentFolder = folderName;
        // Blur to return focus to body for keyboard shortcuts
        const s1 = document.getElementById('folder-select');
        if (s1) s1.blur();
        const s2 = document.getElementById('edit-folder-select');
        if (s2) s2.blur();

        if (this.state.mode === 'study') {
            // Re-shuffle with new filter
            this.updateShuffleOrder();
            this.state.currentIndex = 0;
            this.state.isFlipped = false;
            this.renderStudyMode();
        } else {
            this.renderEditMode();
        }
    }

    rateCard(quality) {
        this.answerCard(quality);
    }

    updateShuffleOrder(filterFn = null) {
        // Filter cards if a function is provided
        let targetCards = this.state.cards;

        // Filter by Folder
        if (this.state.currentFolder && this.state.currentFolder !== 'All') {
            const folderCards = targetCards.filter(c => c.folder === this.state.currentFolder);
            if (folderCards.length === 0 && targetCards.length > 0) {
                if (this.state.mode === 'edit') {
                    // Allow empty folder in edit mode
                    targetCards = [];
                } else {
                    console.warn("Folder is empty, switching to All");
                    alert(`フォルダ「${this.state.currentFolder}」にはカードがありません。全てのフォルダを表示します。`);
                    this.state.currentFolder = 'All';
                    // targetCards remains as all cards
                }
            } else {
                targetCards = folderCards;
            }
        }
        if (filterFn) {
            targetCards = targetCards.filter(filterFn);
            if (targetCards.length === 0) {
                alert("該当するカードがありません。フォルダ内の全てのカードを対象にします。");
                targetCards = this.state.cards;
                if (this.state.currentFolder && this.state.currentFolder !== 'All') {
                    targetCards = targetCards.filter(c => c.folder === this.state.currentFolder);
                }
            }
        }

        // Map IDs to original indices
        this.state.shuffledIndices = targetCards.map(c => this.state.cards.indexOf(c));

        // Fisher-Yates shuffle
        for (let i = this.state.shuffledIndices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.state.shuffledIndices[i], this.state.shuffledIndices[j]] =
                [this.state.shuffledIndices[j], this.state.shuffledIndices[i]];
        }
        // Limit to 20 for testing - REMOVED
        // if (this.state.shuffledIndices.length > 20) {
        //     this.state.shuffledIndices = this.state.shuffledIndices.slice(0, 20);
        // }
        this.state.currentIndex = 0; // Reset to start
        this.state.isFlipped = false;

        // Save the new order and index immediately
        this.saveData();
    }

    get currentCard() {
        if (this.state.cards.length === 0) return null;
        const realIndex = this.state.shuffledIndices[this.state.currentIndex];
        return this.state.cards[realIndex];
    }

    // --- Actions ---

    setMode(mode) {
        this.state.mode = mode;
        this.state.isFlipped = false;
        this.render();
        // If switching to edit mode, ensure list is rendered with current filter state (defaults to empty)
        if (mode === 'edit') {
            // We could reset filters here if desired:
            // document.getElementById('search-input').value = '';
        }
    }

    flipCard() {
        this.state.isFlipped = !this.state.isFlipped;
        this.renderCardState();
    }

    // Unified answer handler
    answerCard(quality) {
        if (!this.currentCard) return;

        // Update SRS
        this.calculateNextReview(this.currentCard, quality);

        // Update Status (Legacy support)
        this.currentCard.status = quality >= 3 ? 'known' : 'unknown';

        // Update Streak
        this.markStudiedToday();

        // Update Heatmap
        this.trackStudyActivity();

        this.saveData();
    }

    trackStudyActivity() {
        const today = new Date().toISOString().split('T')[0];
        if (!this.state.studyLog) this.state.studyLog = {};
        this.state.studyLog[today] = (this.state.studyLog[today] || 0) + 1;
    }

    // Called by UI buttons
    rateCard(quality) {
        if (this.isProcessing) return;
        this.isProcessing = true;

        console.log("rateCard Button Pressed:", quality);
        const cardEl = document.getElementById('flashcard');
        const dir = quality <= 2 ? 'left' : 'right';

        if (cardEl) {
            console.log("Adding class:", `swipe-${dir}`);
            cardEl.classList.add(`swipe-${dir}`);
        } else {
            console.warn("flashcard element not found!");
            this.isProcessing = false;
            return;
        }

        setTimeout(() => {
            try {
                console.log("Animate done, proceeding.");
                this.answerCard(quality);
                this.nextCard();
            } catch (e) {
                console.error("Error in rateCard:", e);
                alert("エラーが発生しました: " + e.message);
            } finally {
                this.isProcessing = false;
                if (cardEl) cardEl.classList.remove(`swipe-${dir}`);
            }
        }, 300);
    }

    calculateNextReview(card, quality) {
        // SM-2 Algorithm
        // quality: 0-5 (3+ is pass)
        let srs = card.srs;

        // Update EF
        // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
        let q = quality;
        srs.ef = srs.ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
        if (srs.ef < 1.3) srs.ef = 1.3;

        // Update Interval & Reps
        if (q >= 3) {
            if (srs.reps === 0) {
                srs.interval = 1;
            } else if (srs.reps === 1) {
                srs.interval = 6;
            } else {
                srs.interval = Math.ceil(srs.interval * srs.ef);
            }
            srs.reps++;
        } else {
            srs.reps = 0;
            srs.interval = 1;
        }

        // Update Next Review Date
        // interval is in days
        srs.nextReview = Date.now() + (srs.interval * 24 * 60 * 60 * 1000);
    }

    swipeRight() {
        // Known (Easy/Good) -> Quality 4
        this.answerCard(4);
        this.animateSwipe('right');
    }

    swipeLeft() {
        // Unknown (Again/Hard) -> Quality 1
        this.answerCard(1);
        this.animateSwipe('left');
    }

    animateSwipe(direction) {
        const cardEl = document.getElementById('flashcard');
        cardEl.classList.add(`swipe-${direction}`);

        setTimeout(() => {
            try {
                cardEl.classList.remove(`swipe-${direction}`);
                this.nextCard();
            } catch (e) {
                console.error("Error in animateSwipe:", e);
            }
        }, 300);
    }

    nextCard() {
        console.log("nextCard:", this.state.currentIndex, "/", this.state.cards.length);
        if (this.state.currentIndex < this.state.shuffledIndices.length - 1) {
            this.state.currentIndex++;
            this.state.isFlipped = false;
            this.render();
        } else {
            // End of deck
            this.handleEndOfDeck();
        }
    }

    handleEndOfDeck() {
        // Check if there are unknown cards
        const unknowns = this.state.cards.filter(c => c.status === 'unknown').length;

        if (unknowns > 0) {
            if (confirm(`一通り学習しました！\nまだ覚えていない（苦手）カードが ${unknowns} 枚あります。\n苦手なカードだけを復習しますか？\n（キャンセルを押すと全てのカードをシャッフルして再開します）`)) {
                this.updateShuffleOrder(c => c.status === 'unknown');
            } else {
                this.updateShuffleOrder();
            }
        } else {
            alert('素晴らしい！全てのカードを「覚えた」にしました！\n再度全てのカードをシャッフルして学習します。');
            this.updateShuffleOrder();
        }

        // Ensure start from beginning
        this.state.currentIndex = 0;
        this.saveData();
        this.render();
    }

    prevCard() {
        // Not used in swipe mode primarily, but kept for logic
        if (this.state.currentIndex > 0) {
            this.state.currentIndex--;
            this.state.isFlipped = false;
            this.render();
        }
    }

    toggleShuffle() {
        this.updateShuffleOrder();
        this.render();
        this.showToast('カードをシャッフルしました');
    }

    // --- Modal & Form Handling ---

    openModal(mode, id = null) {
        const modal = document.getElementById('edit-modal');
        const title = document.getElementById('modal-title');
        const submitBtn = document.getElementById('btn-submit-card');

        modal.classList.remove('hidden');

        if (mode === 'add') {
            title.textContent = '問題を追加';
            submitBtn.textContent = '追加';
            submitBtn.classList.remove('btn-warning');
            this.resetForm();
            // Pre-fill folder if selected
            if (this.state.currentFolder && this.state.currentFolder !== 'All') {
                document.getElementById('input-folder').value = this.state.currentFolder;
            }
            this.state.editingId = null;
        } else if (mode === 'edit' && id) {
            title.textContent = '問題を編集';
            submitBtn.textContent = '更新';
            submitBtn.classList.add('btn-warning');
            this.loadCardToForm(id);
            this.state.editingId = id;
        }
    }

    closeModal() {
        document.getElementById('edit-modal').classList.add('hidden');
        this.resetForm();
        this.state.editingId = null;
    }

    resetForm() {
        document.getElementById('input-question').value = '';
        document.getElementById('input-answer').value = '';
        document.getElementById('input-folder').value = '';
        document.getElementById('input-image').value = '';
        document.getElementById('input-tags').value = '';
        document.getElementById('input-explanation').value = '';
    }

    loadCardToForm(id) {
        const card = this.state.cards.find(c => c.id === id);
        if (!card) return;
        document.getElementById('input-question').value = card.question;
        document.getElementById('input-answer').value = card.answer;
        document.getElementById('input-folder').value = card.folder || 'メイン';
        document.getElementById('input-tags').value = (card.tags || []).join(', ');
        document.getElementById('input-explanation').value = card.explanation || '';
    }

    async handleFormSubmit(event) {
        event.preventDefault();
        const qInput = document.getElementById('input-question');
        const aInput = document.getElementById('input-answer');
        const folderInput = document.getElementById('input-folder');
        const imageInput = document.getElementById('input-image');
        const tagsInput = document.getElementById('input-tags');
        const explanationInput = document.getElementById('input-explanation');

        if (this.state.editingId) {
            await this.updateCard(qInput, aInput, imageInput, tagsInput, folderInput, explanationInput);
        } else {
            await this.addCard(qInput, aInput, imageInput, tagsInput, folderInput, explanationInput);
        }
        this.closeModal();
    }

    async addCard(qInput, aInput, imageInput, tagsInput, folderInput, explanationInput) {
        let imageData = null;
        if (imageInput.files && imageInput.files[0]) {
            try {
                imageData = await this.resizeImage(imageInput.files[0]);
            } catch (e) {
                this.showToast('画像の処理に失敗しました。');
                return;
            }
        }

        const tags = tagsInput.value.split(',').map(t => t.trim()).filter(t => t);
        const folder = (folderInput && folderInput.value.trim()) ? folderInput.value.trim() : 'メイン';
        const explanation = explanationInput ? explanationInput.value : '';

        const newCard = {
            id: Date.now().toString(),
            question: qInput.value,
            answer: aInput.value,
            folder: folder,
            image: imageData,
            tags: tags,
            explanation: explanation,
            status: 'unknown',
            srs: { interval: 0, reps: 0, ef: 2.5, nextReview: Date.now() }
        };

        this.state.cards.push(newCard);

        // Add new card to current shuffle order so it appears immediately
        this.state.shuffledIndices.push(this.state.cards.length - 1);

        this.saveData();
        this.showToast('問題を追加しました。次の問題として表示されます(または列の最後に追加されました)。');
    }

    async updateCard(qInput, aInput, imageInput, tagsInput, folderInput, explanationInput) {
        const cardIndex = this.state.cards.findIndex(c => c.id === this.state.editingId);
        if (cardIndex === -1) return;

        const card = this.state.cards[cardIndex];
        card.question = qInput.value;
        card.answer = aInput.value;
        card.folder = (folderInput && folderInput.value.trim()) ? folderInput.value.trim() : 'メイン';
        card.tags = tagsInput.value.split(',').map(t => t.trim()).filter(t => t);
        card.explanation = explanationInput ? explanationInput.value : '';

        if (imageInput.files && imageInput.files[0]) {
            try {
                card.image = await this.resizeImage(imageInput.files[0]);
            } catch (e) {
                console.error(e);
            }
        }

        this.saveData();
        this.showToast('問題を更新しました。');

        // If we are currently studying this card, re-render to show changes
        if (this.currentCard && this.currentCard.id === this.state.editingId) {
            this.render();
        }
    }

    resizeImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 500;
                    const MAX_HEIGHT = 500;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Compress to JPEG 0.7
                    resolve(canvas.toDataURL('image/jpeg', 0.7));
                };
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    deleteCard(id) {
        if (confirm('本当にこの問題を削除しますか？')) {
            this.state.cards = this.state.cards.filter(c => c.id !== id);
            this.saveData();
            this.showToast("問題を削除しました");
            // If in edit mode, re-render
            if (this.state.mode === 'edit') this.renderEditMode();
        }
    }

    duplicateCard(id) {
        const original = this.state.cards.find(c => c.id === id);
        if (!original) return;

        const newCard = {
            ...original,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            srs: { interval: 0, reps: 0, ef: 2.5, nextReview: Date.now() } // Reset SRS
        };

        // Open modal with this new card data (but treated as 'add' effectively, or pre-filled edit)
        // Better flow: Add to state, then open edit modal
        this.state.cards.push(newCard);
        this.saveData();
        this.showToast("問題を複製しました");

        // Open edit modal for the new card
        this.openModal('edit', newCard.id);
        if (this.state.mode === 'edit') this.renderEditMode();
    }

    deleteSelectedCards() {
        const count = this.state.selectedCards ? this.state.selectedCards.length : 0;
        if (count === 0) return;

        if (confirm(`${count}件の問題を本当に削除しますか？`)) {
            this.state.cards = this.state.cards.filter(c => !this.state.selectedCards.includes(c.id));
            this.state.selectedCards = [];
            this.saveData();
            this.renderEditMode();
            this.renderBulkActionBar();
            this.showToast(`${count}件の問題を削除しました`);
        }
    }


    // --- Toast Notification ---
    showToast(message) {
        const container = document.getElementById('toast-container');
        if (!container) return; // Guard if element missing

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;

        container.appendChild(toast);

        // Trigger generic animation
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (container.contains(toast)) {
                    container.removeChild(toast);
                }
            }, 300); // Wait for transition
        }, 3000);
    }

    // --- Folder Management ---

    initiateDeleteFolder() {
        const folder = this.state.currentFolder;
        if (!folder || folder === 'All' || folder === 'メイン') {
            this.showToast("「メイン」フォルダや「すべて」は削除できません。");
            return;
        }

        const modal = document.getElementById('delete-folder-modal');
        const msg = document.getElementById('delete-modal-msg');
        const optionsDiv = document.getElementById('delete-options');
        const moveSelect = document.getElementById('move-dest-folder');
        const radios = document.getElementsByName('delete-action');

        // Check content
        const cardsInFolder = this.state.cards.filter(c => c.folder === folder);

        document.getElementById('delete-modal-title').textContent = `フォルダ「${folder}」を削除`;

        if (cardsInFolder.length > 0) {
            msg.textContent = `このフォルダには ${cardsInFolder.length} 件の問題が含まれています。`;
            optionsDiv.classList.remove('hidden');

            // Populate move options (exclude current)
            moveSelect.innerHTML = '';
            // Always offer 'メイン'
            const targetFolders = this.state.folders.filter(f => f !== folder).sort();
            if (!targetFolders.includes('メイン')) targetFolders.unshift('メイン');

            targetFolders.forEach(f => {
                const opt = document.createElement('option');
                opt.value = f;
                opt.textContent = f;
                moveSelect.appendChild(opt);
            });

            // Reset interaction
            radios[0].checked = true; // Default delete
            moveSelect.disabled = true;

            // Radio change handler
            radios.forEach(radio => {
                radio.onchange = (e) => {
                    moveSelect.disabled = (e.target.value !== 'move');
                };
            });

        } else {
            msg.textContent = "このフォルダは空です。削除しますか？";
            optionsDiv.classList.add('hidden');
        }

        modal.classList.remove('hidden');
    }

    handleFolderChange(folderName) {
        this.state.currentFolder = folderName;
        this.state.currentIndex = 0; // Reset index
        this.saveData(); // Save preference

        if (this.state.mode === 'quiz') {
            this.startQuiz();
        } else {
            this.renderStudyMode();
        }
    }

    filterCardsByFolder(folderName) {
        if (!folderName || folderName === 'All') {
            return this.state.cards;
        }
        return this.state.cards.filter(card => card.folder === folderName);
    }


    confirmDeleteFolder() {
        const folder = this.state.currentFolder;
        const modal = document.getElementById('delete-folder-modal');
        const optionsDiv = document.getElementById('delete-options');

        // If hidden options, it's empty folder delete
        if (optionsDiv.classList.contains('hidden')) {
            this.deleteFolderData(folder, 'delete');
        } else {
            const action = document.querySelector('input[name="delete-action"]:checked').value;
            const dest = document.getElementById('move-dest-folder').value;
            this.deleteFolderData(folder, action, dest);
        }

        modal.classList.add('hidden');
    }

    deleteFolderData(folderName, action, destFolder = null) {
        if (action === 'move' && destFolder) {
            // Move cards
            this.state.cards.forEach(c => {
                if (c.folder === folderName) {
                    c.folder = destFolder;
                }
            });
            this.showToast(`カードを「${destFolder}」へ移動し、フォルダを削除しました`);
        } else {
            // Delete cards
            const beforeCount = this.state.cards.length;
            this.state.cards = this.state.cards.filter(c => c.folder !== folderName);
            const deletedStats = beforeCount - this.state.cards.length;

            if (deletedStats > 0) {
                this.showToast(`フォルダと ${deletedStats} 件の問題を削除しました`);
            } else {
                this.showToast(`フォルダ「${folderName}」を削除しました`);
            }
        }

        // Remove folder
        this.state.folders = this.state.folders.filter(f => f !== folderName);

        // Reset view
        this.state.currentFolder = 'All'; // or 'メイン'

        // Initial Render
        this.renderFolderSelector();
        this.renderStudyMode();
    }

    handleKeywords(e) {
        // Ignore if typing in input/textarea
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;

        if (this.state.mode === 'study') {
            if (e.code === 'Space' || e.code === 'Enter') {
                e.preventDefault(); // Prevent scrolling
                if (!this.state.isFlipped) {
                    this.flipCard();
                }
            }
            if (this.state.isFlipped) {
                if (e.key === '1') this.rateCard(1);
                if (e.key === '2') this.rateCard(2);
                if (e.key === '3') this.rateCard(3);
                if (e.key === '4') this.rateCard(4);
            }
            if (e.key === 'e' || e.key === 'E') {
                this.setMode('edit');
            }
        } else if (this.state.mode === 'edit') {
            if (e.key === 's' || e.key === 'S') {
                this.setMode('study');
            }
        } else if (this.state.mode === 'dashboard') {
            if (e.key === 's' || e.key === 'S') {
                this.setMode('study');
            }
        }
    }

    // --- CSV Import/Export ---

    exportCSV() {
        const headers = ['Question', 'Answer', 'Folder', 'Status', 'Tags'];
        const rows = this.state.cards.map(c => [
            `"${c.question.replace(/"/g, '""')}"`,
            `"${c.answer.replace(/"/g, '""')}"`,
            `"${(c.folder || 'メイン').replace(/"/g, '""')}"`,
            c.status,
            `"${(c.tags || []).join(',')}"`
        ]);

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' }); // Add BOM for Excel

        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'skill_test_cards.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    importCSV(input) {
        if (!input.files || !input.files[0]) return;

        const file = input.files[0];
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const text = e.target.result;
                const rows = text.split('\n').map(row => row.trim()).filter(row => row);

                // Check header to determine format
                const header = rows[0].toLowerCase();
                const hasFolder = header.includes('folder');

                // Skip header if present
                const startIndex = header.includes('question') ? 1 : 0;

                // Ask for Replace or Append
                let replaceMode = false;
                if (this.state.cards.length > 0) {
                    replaceMode = confirm("既存のカードを全て削除して、CSVの内容に置き換えますか？\n（[キャンセル] を押すと追加モードになります）");
                }

                if (replaceMode) {
                    this.state.cards = [];
                    // Keep folders? Ideally reset folders too, but keep "All"/"Main" logic safe
                    this.state.folders = ['メイン'];
                    this.state.shuffledIndices = [];
                }

                let addedCount = 0;
                for (let i = startIndex; i < rows.length; i++) {
                    // Simple CSV parser (handles quoted commas)
                    const cols = this.parseCSVRow(rows[i]);

                    // Format 1 (New): Question, Answer, Folder, Status, Tags
                    // Format 2 (Old): Question, Answer, Status, Tags

                    if (cols.length >= 2) {
                        let folder = 'メイン';
                        let status = 'unknown';
                        let tags = [];

                        if (hasFolder) {
                            // New format: Q, A, Folder, Status, Tags
                            folder = cols[2] ? cols[2].trim() : 'メイン';
                            status = cols[3] || 'unknown';
                            tags = cols[4] ? cols[4].split(',').map(t => t.trim()) : [];
                        } else {
                            // Old format: Q, A, Status, Tags
                            status = cols[2] || 'unknown';
                            tags = cols[3] ? cols[3].split(',').map(t => t.trim()) : [];
                        }

                        // Register folder if new
                        if (folder && !this.state.folders.includes(folder)) {
                            this.state.folders.push(folder);
                        }

                        const newCard = {
                            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                            question: cols[0],
                            answer: cols[1],
                            folder: folder,
                            status: status,
                            tags: tags,
                            image: null,
                            srs: { interval: 0, reps: 0, ef: 2.5, nextReview: Date.now() } // Ensure SRS init
                        };
                        this.state.cards.push(newCard);
                        addedCount++;
                    }
                }

                // Sort Folders
                this.state.folders.sort();

                // Add to shuffle order
                this.updateShuffleOrder();

                this.saveData();
                this.renderFolderSelector();
                this.renderEditMode(); // Refresh edit view

                const modeMsg = replaceMode ? "全データを置き換え" : "追加";
                alert(`${addedCount}件の問題をインポートしました（${modeMsg}）。`);

                // Reset input
                input.value = '';
            } catch (err) {
                console.error(err);
                alert('CSVの読み込みに失敗しました。フォーマットを確認してください。');
            }
        };

        reader.readAsText(file);
    }

    // --- JSON Import/Export (Backup) ---

    exportJSON() {
        const dataStr = JSON.stringify(this.state, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const date = new Date().toISOString().split('T')[0];
        const link = document.createElement('a');
        link.href = url;
        link.download = `skill_test_backup_${date}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    importJSON(input) {
        if (!input.files || !input.files[0]) return;

        const file = input.files[0];
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target.result);

                // Basic Validation
                if (!json.cards || !Array.isArray(json.cards)) {
                    throw new Error("Invalid format: cards array missing");
                }

                if (confirm('現在のデータを上書きして復元しますか？\n（この操作は取り消せません）')) {
                    this.state = json;
                    this.saveData();
                    alert('復元が完了しました。ページをリロードします。');
                    window.location.reload();
                }
            } catch (err) {
                console.error(err);
                alert('JSONの読み込みに失敗しました: ' + err.message);
            }
            // Reset
            input.value = '';
        };
        reader.readAsText(file);
    }

    parseCSVRow(text) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (char === '"') {
                if (i + 1 < text.length && text[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current);
        return result;
    }

    setupSwipeListeners() {
        const touchContainer = document.getElementById('flashcard-container');
        const flashcard = document.getElementById('flashcard');

        touchContainer.addEventListener('touchstart', (e) => {
            this.touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        touchContainer.addEventListener('touchend', (e) => {
            this.touchEndX = e.changedTouches[0].screenX;
            this.handleGesture();
        }, { passive: true });

        // Click to flip
        if (flashcard) {
            flashcard.addEventListener('click', (e) => {
                // Ignore clicks on buttons or if processing
                if (this.state.isProcessing || e.target.closest('button')) return;
                this.flipCard();
            });
        }
    }

    handleGesture() {
        const SWIPE_THRESHOLD = 50;
        if (this.touchEndX < this.touchStartX - SWIPE_THRESHOLD) {
            this.swipeLeft(); // Left swipe
        }
        if (this.touchEndX > this.touchStartX + SWIPE_THRESHOLD) {
            this.swipeRight(); // Right swipe
        }
    }

    // --- TTS ---

    speakQuestion(event) {
        event.stopPropagation(); // Prevent card flip
        if (!this.currentCard) return;

        const text = this.currentCard.question;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ja-JP'; // Japanese
        speechSynthesis.speak(utterance);
    }

    // --- Hands-free Mode (Phase 4) ---

    toggleAutoPlay() {
        this.isAutoPlaying = !this.isAutoPlaying;
        const btn = document.getElementById('btn-auto-play');

        if (this.isAutoPlaying) {
            btn.classList.add('active');
            btn.innerHTML = '<i class="fas fa-stop"></i> 停止'; // Assuming FontAwesome or text
            this.runAutoPlayLoop();
        } else {
            this.stopAutoPlay();
        }
    }

    stopAutoPlay() {
        this.isAutoPlaying = false;
        const btn = document.getElementById('btn-auto-play');
        if (btn) {
            btn.classList.remove('active');
            btn.innerHTML = '<i class="fas fa-play"></i> 自動';
        }
        clearTimeout(this.autoPlayTimer);
        this.synth.cancel();
    }

    async runAutoPlayLoop() {
        if (!this.isAutoPlaying) return;

        // 1. Speak Question
        if (this.state.isFlipped) {
            this.flipCard();
            await new Promise(r => setTimeout(r, 500));
        }

        const card = this.currentCard;

        if (!card) {
            this.stopAutoPlay();
            return;
        }

        // Speak Question
        await this.speakText(card.question);

        if (!this.isAutoPlaying) return;

        // 2. Wait (Thinking time)
        await new Promise(r => this.autoPlayTimer = setTimeout(r, 3000));

        if (!this.isAutoPlaying) return;

        // 3. Flip & Speak Answer
        this.flipCard();
        await this.speakText(card.answer);

        if (!this.isAutoPlaying) return;

        // 4. Wait (Review time)
        await new Promise(r => this.autoPlayTimer = setTimeout(r, 2000));

        if (!this.isAutoPlaying) return;

        // 5. Next Card (Mark as 'Good' / 3)
        this.rateCard(3);

        // Loop continues because rateCard calls nextCard, and we need to trigger loop again? 
        // rateCard -> nextCard -> render. We need to hook into nextCard or just recursive call.
        // Actually, rateCard modifies state and calls render. ensuring loop continues:
        // We can just call runAutoPlayLoop again.

        // Wait for render update
        setTimeout(() => this.runAutoPlayLoop(), 500);
    }

    // Helper for TTS promise
    speakText(text) {
        return new Promise(resolve => {
            if (this.synth.speaking) this.synth.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'ja-JP';
            utterance.rate = 1.0;

            utterance.onend = () => resolve();
            utterance.onerror = () => resolve(); // Resolve on error too to prevent hanging

            this.synth.speak(utterance);
        });
    }

    // --- Quiz Mode (Phase 3) ---

    renderQuizStart() {
        document.getElementById('quiz-start').classList.remove('hidden');
        document.getElementById('quiz-question-container').classList.add('hidden');
        document.getElementById('quiz-result').classList.add('hidden');

        // Populate Folder Select
        const folderSelect = document.getElementById('quiz-folder-select');
        if (folderSelect) {
            // Get unique folders
            let folders = new Set(['メイン']);
            if (this.state.folders && Array.isArray(this.state.folders)) {
                this.state.folders.forEach(f => folders.add(f));
            }
            this.state.cards.forEach(c => {
                if (c.folder) folders.add(c.folder);
            });
            const sortedFolders = Array.from(folders).sort();

            let html = '<option value="All">すべてのフォルダ</option>';
            // Pre-select current folder if valid
            const preSelect = (this.state.currentFolder && this.state.currentFolder !== 'All') ? this.state.currentFolder : 'All';

            sortedFolders.forEach(f => {
                const selected = (f === preSelect) ? 'selected' : '';
                html += `<option value="${f}" ${selected}>${f}</option>`;
            });
            folderSelect.innerHTML = html;
        }
    }

    startQuiz(mode = 'normal') {
        let pool = [];

        // Get Quiz Type
        const typeSelect = document.getElementById('quiz-type');
        const quizType = typeSelect ? typeSelect.value : '4choice';

        if (mode === 'review') {
            if (!this.quizState || !this.quizState.wrongQuestions || this.quizState.wrongQuestions.length === 0) {
                alert('復習する問題がありません。');
                return;
            }
            pool = this.state.cards.filter(c => this.quizState.wrongQuestions.includes(c.id));
        } else {
            // Get selected folder from UI
            const folderSelect = document.getElementById('quiz-folder-select');
            let targetFolder = folderSelect ? folderSelect.value : 'All';

            // Fallback: If UI missing or "All" selected, check if we should default to Secure?
            // User wanted Secure 59 questions. 
            // If user explicitly selects "All", we should show All.
            // If user selects specific folder, show that.

            // However, to keep the "default to Secure if available AND no specific selection made (or UI missing)" logic:
            if (!folderSelect) {
                const secure = this.state.folders.find(f => f.includes('セキュア'));
                if (secure) targetFolder = secure;
            }

            pool = this.filterCardsByFolder(targetFolder);
        }

        if (pool.length < 1) {
            alert('クイズをするには、少なくとも1つの問題が必要です。');
            return;
        }

        // Shuffle
        const shuffled = [...pool].sort(() => Math.random() - 0.5);

        this.quizState = {
            questions: shuffled, // Use ALL questions
            current: 0,
            score: 0,
            wrongQuestions: [],
            mode: mode,
            type: quizType // Save type
        };

        document.getElementById('quiz-start').classList.add('hidden');
        document.getElementById('quiz-question-container').classList.remove('hidden');
        document.getElementById('quiz-result').classList.add('hidden'); // Ensure result is hidden
        this.renderQuizQuestion();
    }

    startReviewQuiz() {
        this.startQuiz('review');
    }

    renderQuizQuestion() {
        const q = this.quizState.questions[this.quizState.current];
        const total = this.quizState.questions.length;

        // Update Header
        document.getElementById('quiz-index').textContent = this.quizState.current + 1;
        document.getElementById('quiz-total').textContent = total;
        document.getElementById('quiz-score').textContent = `Score: ${this.quizState.score}`;

        // Question
        document.getElementById('quiz-question').textContent = q.question;
        const imgEl = document.getElementById('quiz-image');
        if (q.image) {
            imgEl.src = q.image;
            imgEl.classList.remove('hidden');
        } else {
            imgEl.classList.add('hidden');
        }

        // Reset Explanation & Next Button
        document.getElementById('quiz-explanation-container').classList.add('hidden');
        document.getElementById('quiz-options').style.pointerEvents = 'auto'; // Enable clicks
        const container = document.getElementById('quiz-options');
        container.innerHTML = '';

        // Add Audio Button to Question
        const qEl = document.getElementById('quiz-question');
        // Create audio button
        const audioBtn = document.createElement('button');
        audioBtn.className = 'btn-icon'; // Need style?
        audioBtn.style.marginLeft = '10px';
        audioBtn.style.verticalAlign = 'middle';
        audioBtn.style.cursor = 'pointer';
        audioBtn.style.background = 'none';
        audioBtn.style.border = 'none';
        audioBtn.style.color = 'var(--primary-color)';
        audioBtn.innerHTML = '<i data-lucide="volume-2"></i>';
        audioBtn.onclick = (e) => {
            e.stopPropagation();
            this.speakText(q.question);
        };
        qEl.appendChild(audioBtn);
        if (window.lucide) lucide.createIcons();

        // Branch by Quiz Type
        if (this.quizState.type === 'input') {
            // --- Input Type ---
            const inputGroup = document.createElement('div');
            inputGroup.style.display = 'flex';
            inputGroup.style.gap = '10px';
            inputGroup.style.flexDirection = 'column';

            const input = document.createElement('input');
            input.type = 'text';
            input.id = 'quiz-input-answer';
            input.className = 'form-control'; // reuse style?
            input.placeholder = '回答を入力...';
            input.style.padding = '12px';
            input.style.borderRadius = '8px';
            input.style.border = '1px solid #ddd';
            input.style.fontSize = '1.1rem';

            const submitBtn = document.createElement('button');
            submitBtn.textContent = '回答する';
            submitBtn.className = 'btn btn-primary';
            submitBtn.onclick = () => this.checkInputAnswer();

            // Enter key support
            input.onkeydown = (e) => {
                if (e.key === 'Enter') this.checkInputAnswer();
            };

            inputGroup.appendChild(input);
            inputGroup.appendChild(submitBtn);
            container.appendChild(inputGroup);
            input.focus();

        } else {
            // --- 4 Choice Type ---
            const choices = this.generateChoices(q);
            choices.forEach(choice => {
                const btn = document.createElement('button');
                btn.className = 'btn-choice';
                btn.textContent = choice;
                btn.onclick = () => this.answerQuiz(btn, choice, q.answer);
                container.appendChild(btn);
            });
        }
    }

    checkInputAnswer() {
        const input = document.getElementById('quiz-input-answer');
        if (!input) return;
        const userAnswer = input.value.trim();
        if (!userAnswer) return;

        const currentQ = this.quizState.questions[this.quizState.current];
        const isCorrect = (userAnswer.toLowerCase() === currentQ.answer.toLowerCase()); // Simple check

        const container = document.getElementById('quiz-options');
        container.innerHTML = '';

        const resultDiv = document.createElement('div');
        resultDiv.style.textAlign = 'center';
        resultDiv.style.padding = '1rem';
        resultDiv.style.fontSize = '1.2rem';
        resultDiv.style.fontWeight = 'bold';

        if (isCorrect) {
            resultDiv.textContent = '正解！😄';
            resultDiv.style.color = '#10b981'; // green
            this.quizState.score++;
            this.rateCard(5);
        } else {
            resultDiv.innerHTML = `不正解... 😢<br><span style="font-size: 1rem; color: var(--text-color);">正解: ${this.escapeHtml(currentQ.answer)}</span>`;
            resultDiv.style.color = '#ef4444'; // red
            this.quizState.wrongQuestions.push(currentQ.id);
            this.rateCard(1);
        }
        container.appendChild(resultDiv);
        document.getElementById('quiz-score').textContent = `Score: ${this.quizState.score}`;

        // Show Explanation
        const explanationContainer = document.getElementById('quiz-explanation-container');
        const explanationEl = document.getElementById('quiz-explanation'); // Ensure this ID exists!
        if (explanationEl) {
            explanationEl.innerHTML = `<strong>解説:</strong><br>${currentQ.explanation ? this.escapeHtml(currentQ.explanation) : '解説はありません。'}`;
        }
        explanationContainer.classList.remove('hidden');

        // Play audio for answer
        this.speakText(currentQ.answer);
    }

    generateChoices(correctCard) {
        // Pick 3 wrong answers
        const wrongAnswers = this.state.cards
            .filter(c => c.id !== correctCard.id)
            .map(c => c.answer);

        // Shuffle wrong answers and pick 3
        const selectedWrong = wrongAnswers.sort(() => Math.random() - 0.5).slice(0, 3);

        // Combine with correct answer and shuffle
        const all = [correctCard.answer, ...selectedWrong];
        return all.sort(() => Math.random() - 0.5);
    }

    answerQuiz(btn, selected, correct) {
        // Prevent double click
        const buttons = document.querySelectorAll('.btn-choice');
        buttons.forEach(b => b.disabled = true);
        document.getElementById('quiz-options').style.pointerEvents = 'none';

        const currentQ = this.quizState.questions[this.quizState.current];
        const isCorrect = (selected === correct);

        if (isCorrect) {
            btn.classList.add('correct');
            this.quizState.score++;
        } else {
            btn.classList.add('wrong');
            // Show correct one
            buttons.forEach(b => {
                if (b.textContent === correct) b.classList.add('correct');
            });
            // Record wrong question
            this.quizState.wrongQuestions.push(currentQ.id);
        }

        // Show Explanation
        const expContainer = document.getElementById('quiz-explanation-container');
        const expText = document.getElementById('quiz-explanation');

        if (currentQ.explanation) {
            expText.textContent = currentQ.explanation;
        } else {
            expText.textContent = "解説はありません。";
        }
        expContainer.classList.remove('hidden');

        // Scroll to bottom to show explanation on mobile
        setTimeout(() => {
            expContainer.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, 100);
    }

    nextQuizQuestion() {
        this.quizState.current++;
        if (this.quizState.current < this.quizState.questions.length) {
            this.renderQuizQuestion();
        } else {
            this.showQuizResult();
        }
    }

    // --- Theme ---
    initTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        this.updateThemeIcon();
    }

    toggleTheme() {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        this.updateThemeIcon();
    }

    updateThemeIcon() {
        const btn = document.getElementById('theme-toggle');
        if (!btn) return;
        const isDark = document.body.classList.contains('dark-mode');
        btn.innerHTML = isDark ? '<i data-lucide="sun"></i>' : '<i data-lucide="moon"></i>';
        if (window.lucide) lucide.createIcons();
    }

    showQuizResult() {
        document.getElementById('quiz-question-container').classList.add('hidden');
        document.getElementById('quiz-result').classList.remove('hidden');

        const score = this.quizState.score;
        const total = this.quizState.questions.length;
        const scorePer = Math.round((score / total) * 100);

        document.getElementById('final-score').textContent = scorePer;

        let msg = '';
        if (scorePer === 100) msg = '完璧です！';
        else if (scorePer >= 80) msg = '素晴らしい！';
        else if (scorePer >= 60) msg = 'あと少し！';
        else msg = 'がんばろう！';

        document.getElementById('score-message').textContent = msg;

        // Review Button Logic
        const reviewBtn = document.getElementById('btn-review-quiz');
        if (this.quizState.wrongQuestions.length > 0) {
            reviewBtn.classList.remove('hidden');
            reviewBtn.textContent = `間違えた問題(${this.quizState.wrongQuestions.length}問)を復習`;
        } else {
            reviewBtn.classList.add('hidden');
        }
    }

    // --- Rendering ---

    render() {
        this.renderFolderSelector();

        // Toggle Views
        const studyView = document.getElementById('study-view');
        const editView = document.getElementById('edit-view');
        const dashboardView = document.getElementById('dashboard-view');
        const quizView = document.getElementById('quiz-view');

        const navStudy = document.getElementById('nav-study');
        const navEdit = document.getElementById('nav-edit');
        const navDashboard = document.getElementById('nav-dashboard');
        const navQuiz = document.getElementById('nav-quiz');

        // Reset all
        studyView.classList.add('hidden');
        editView.classList.add('hidden');
        dashboardView.classList.add('hidden');
        quizView.classList.add('hidden');

        navStudy.classList.remove('active');
        navEdit.classList.remove('active');
        navDashboard.classList.remove('active');
        if (navQuiz) navQuiz.classList.remove('active');

        if (this.state.mode === 'study' || this.state.mode === 'home') {
            studyView.classList.remove('hidden');
            navStudy.classList.add('active');
            this.renderStudyMode();
        } else if (this.state.mode === 'edit') {
            editView.classList.remove('hidden');
            navEdit.classList.add('active');
            this.renderEditMode();
        } else if (this.state.mode === 'dashboard') {
            dashboardView.classList.remove('hidden');
            navDashboard.classList.add('active');
            this.renderDashboardMode();
        } else if (this.state.mode === 'quiz') {
            quizView.classList.remove('hidden');
            if (navQuiz) navQuiz.classList.add('active');
            this.renderQuizStart();
        }

        // Always render folder selector if not in quiz mode
        if (this.state.mode !== 'quiz') {
            this.renderFolderSelector();
        }
    }

    handleFolderChange(folderName) {
        this.state.currentFolder = folderName;
        this.state.currentIndex = 0; // Reset index
        this.updateShuffleOrder();
        this.saveData(); // Save preference
        this.render();
    }

    renderFolderSelector() {
        const folderSelect = document.getElementById('folder-select');
        const folderDatalist = document.getElementById('folder-list');

        // Get unique folders
        let folders = new Set(['メイン']);
        if (this.state.folders && Array.isArray(this.state.folders)) {
            this.state.folders.forEach(f => folders.add(f));
        }
        // Safety: Ensure folders from cards are included
        this.state.cards.forEach(c => {
            if (c.folder) folders.add(c.folder);
        });
        const sortedFolders = Array.from(folders).sort();

        // Update Select (Study View)
        if (folderSelect) {
            let html = '<option value="All">すべてのフォルダ</option>';
            sortedFolders.forEach(f => {
                const selected = (f === this.state.currentFolder) ? 'selected' : '';
                html += `<option value="${f}" ${selected}>${f}</option>`;
            });
            folderSelect.innerHTML = html;
            // Ensure value is set correctly even if innerHTML didn't catch it
            folderSelect.value = this.state.currentFolder || 'All';
        }

        // Update Select (Edit View) - NEW
        const editFolderSelect = document.getElementById('edit-folder-select');
        if (editFolderSelect) {
            let html = '<option value="All">すべてのフォルダ</option>';
            sortedFolders.forEach(f => {
                const selected = (f === this.state.currentFolder) ? 'selected' : '';
                html += `<option value="${f}" ${selected}>${f}</option>`;
            });
            editFolderSelect.innerHTML = html;
            editFolderSelect.value = this.state.currentFolder || 'All';
        }

        // Add/Update Delete Button Logic
        const deleteFolderBtn = document.getElementById('btn-delete-folder');
        if (deleteFolderBtn) {
            const isDeletable = (this.state.currentFolder && this.state.currentFolder !== 'All' && this.state.currentFolder !== 'メイン');
            deleteFolderBtn.style.display = isDeletable ? 'inline-block' : 'none';
        }

        // Update Datalist (Edit Form)
        if (folderDatalist) {
            folderDatalist.innerHTML = sortedFolders.map(f => `<option value="${f}">`).join('');
        }
    }

    renderStudyMode() {
        // Safety Check: Ensure index is valid
        if (this.state.shuffledIndices.length > 0 && this.state.currentIndex >= this.state.shuffledIndices.length) {
            console.warn("Index out of bounds detected in render. Resetting to 0.");
            this.state.currentIndex = 0;
            this.saveData();
        }

        const card = this.currentCard;
        const qEl = document.getElementById('card-question');
        const aEl = document.getElementById('card-answer');
        const imgEl = document.getElementById('card-image-front');
        const indexEl = document.getElementById('current-index');
        const totalEl = document.getElementById('total-count');

        if (!card) {
            qEl.textContent = '問題がありません。編集モードで追加してください。';
            aEl.textContent = '';
            imgEl.classList.add('hidden');
            const expEl = document.getElementById('card-explanation');
            if (expEl) expEl.classList.add('hidden');
            return;
        }

        qEl.textContent = card.question;
        aEl.textContent = card.answer;

        const expEl = document.getElementById('card-explanation');
        if (expEl) {
            if (card.explanation) {
                expEl.textContent = card.explanation;
                expEl.classList.remove('hidden');
            } else {
                expEl.classList.add('hidden');
            }
        }

        if (card.image) {
            imgEl.src = card.image;
            imgEl.classList.remove('hidden');
        } else {
            imgEl.classList.add('hidden');
        }

        indexEl.textContent = this.state.currentIndex + 1;
        totalEl.textContent = this.state.shuffledIndices.length;

        this.renderCardState();
    }

    renderCardState() {
        const cardEl = document.getElementById('flashcard');
        if (this.state.isFlipped) {
            cardEl.classList.add('flipped');
        } else {
            cardEl.classList.remove('flipped');
        }
    }

    toggleSelectCard(id, isSelected) {
        if (!this.state.selectedCards) this.state.selectedCards = [];
        if (isSelected) {
            this.state.selectedCards.push(id);
        } else {
            this.state.selectedCards = this.state.selectedCards.filter(cid => cid !== id);
        }
        this.renderBulkActionBar();
    }

    renderBulkActionBar() {
        const bar = document.getElementById('bulk-action-bar');
        const countSpan = document.getElementById('bulk-selected-count');
        if (!bar) return;

        const count = this.state.selectedCards ? this.state.selectedCards.length : 0;
        if (count > 0) {
            bar.classList.remove('hidden');
            if (countSpan) countSpan.textContent = count;
        } else {
            bar.classList.add('hidden');
        }
    }

    moveSelectedCards() {
        const select = document.getElementById('bulk-folder-select');
        const targetFolder = select.value;
        if (!targetFolder) {
            alert('移動先のフォルダを選択してください。');
            return;
        }

        const count = this.state.selectedCards ? this.state.selectedCards.length : 0;
        if (count === 0) return;

        if (!confirm(`${count}件のカードを「${targetFolder}」に移動しますか？`)) return;

        this.state.cards.forEach(card => {
            if (this.state.selectedCards.includes(card.id)) {
                card.folder = targetFolder;
            }
        });

        this.state.selectedCards = []; // Clear selection
        this.saveData();
        this.renderEditMode();
        this.renderBulkActionBar(); // Hide bar
        alert('移動しました。');
    }

    renderEditMode() {
        const listContainer = document.getElementById('card-list-container');
        const countEl = document.getElementById('list-count');

        const current = this.state.currentFolder;
        const isSystemFolder = (!current || current === 'All' || current === 'メイン');
        const isLocked = this.state.lockedFolders && this.state.lockedFolders.includes(current);

        // Update Delete Button Logic
        const deleteFolderBtn = document.getElementById('btn-delete-folder');
        if (deleteFolderBtn) {
            // Show if NOT system folder AND NOT locked
            const isDeletable = !isSystemFolder && !isLocked;
            deleteFolderBtn.style.display = isDeletable ? 'inline-flex' : 'none';
        }

        // Update Rename Button Logic
        const renameFolderBtn = document.getElementById('btn-rename-folder');
        if (renameFolderBtn) {
            renameFolderBtn.style.display = !isSystemFolder ? 'inline-flex' : 'none';
        }

        // Update Lock Button Logic
        const lockFolderBtn = document.getElementById('btn-lock-folder');
        if (lockFolderBtn) {
            if (isSystemFolder) {
                lockFolderBtn.style.display = 'none';
            } else {
                lockFolderBtn.style.display = 'inline-flex';
                // Update icon/state
                const isLockedState = isLocked;
                const icon = isLockedState ? 'lock' : 'unlock';
                lockFolderBtn.innerHTML = `<i data-lucide="${icon}"></i>`;

                // Style updates
                if (isLockedState) {
                    lockFolderBtn.classList.add('warning');
                    lockFolderBtn.title = "ロック中 (解除するにはクリック)";
                } else {
                    lockFolderBtn.classList.remove('warning');
                    lockFolderBtn.title = "フォルダをロック";
                }
            }
            if (window.lucide) lucide.createIcons();
        }

        // Filter Logic
        const keyword = (document.getElementById('search-input').value || '').toLowerCase();

        // Filter cards
        const filteredCards = this.state.cards.filter(card => {
            const matchesKeyword = (card.question.toLowerCase().includes(keyword) || card.answer.toLowerCase().includes(keyword));
            const matchesFolder = (this.state.currentFolder && this.state.currentFolder !== 'All')
                ? (card.folder === this.state.currentFolder) : true;
            return matchesKeyword && matchesFolder;
        });

        countEl.textContent = filteredCards.length;
        listContainer.innerHTML = '';

        // Create list items
        filteredCards.forEach(card => {
            const div = document.createElement('div');
            div.className = 'list-item';
            div.style.display = 'flex';
            div.style.alignItems = 'center';

            let imgHtml = '';
            if (card.image) {
                imgHtml = `<img src="${card.image}" style="height: 40px; margin-right: 10px; border-radius: 4px;">`;
            }

            // Content
            div.innerHTML = `
        <div class="list-content" style="flex: 1; display: flex; align-items: center; overflow: hidden;">
          ${imgHtml}
          <div style="overflow: hidden; text-overflow: ellipsis;">
            <div class="list-q" style="font-weight: bold;">Q: ${this.escapeHtml(card.question)}</div>
            <div class="list-a">A: ${this.escapeHtml(card.answer)}</div>
          </div>
        </div>
        <div class="list-actions" style="display: flex; gap: 4px; margin-left: 10px;">
          <button class="btn-sm" onclick="app.openModal('edit', '${card.id}')">編集</button>
          <button class="btn-sm" onclick="app.duplicateCard('${card.id}')" title="複製"><i data-lucide="copy" style="width: 14px; height: 14px;"></i></button>
          <button class="btn-sm btn-danger" onclick="app.deleteCard('${card.id}')">削除</button>
        </div>
      `;

            // Checkbox - Prepend
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'select-card-checkbox';
            checkbox.value = card.id;
            checkbox.style.marginRight = '10px';
            checkbox.style.cursor = 'pointer';
            if (this.state.selectedCards && this.state.selectedCards.includes(card.id)) {
                checkbox.checked = true;
            }
            checkbox.onchange = (e) => this.toggleSelectCard(card.id, e.target.checked);

            div.prepend(checkbox);
            listContainer.appendChild(div);
        });

        if (window.lucide) lucide.createIcons();
    }

    renderDashboardMode() {
        // Recalculate Logic
        const total = this.state.cards.length;
        const known = this.state.cards.filter(c => c.status === 'known').length;
        const unknown = this.state.cards.filter(c => c.status === 'unknown').length;

        // SRS Stats
        const mature = this.state.cards.filter(c => c.srs && c.srs.interval > 21).length;
        const young = this.state.cards.filter(c => c.srs && c.srs.interval > 0 && c.srs.interval <= 21).length;
        const learning = this.state.cards.filter(c => !c.srs || c.srs.interval === 0).length;

        document.getElementById('stat-total').textContent = total;
        document.getElementById('stat-known').textContent = mature; // Use mature as "mastered"
        document.getElementById('stat-unknown').textContent = learning;
        document.getElementById('streak-count').textContent = this.state.streak;

        this.renderHeatmap();
    }

    renderHeatmap() {
        const container = document.getElementById('heatmap-container');
        if (!container) return;
        container.innerHTML = '';

        // Show last 90 days (about 13 weeks)
        const daysToShow = 91;
        const today = new Date();
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - daysToShow + 1);

        for (let i = 0; i < daysToShow; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            const dateString = date.toISOString().split('T')[0];
            const count = this.state.studyLog[dateString] || 0;

            let level = 0;
            if (count > 0) level = 1;
            if (count > 5) level = 2;
            if (count > 15) level = 3;
            if (count > 30) level = 4;

            const square = document.createElement('div');
            square.className = 'day-square';
            square.dataset.date = dateString;
            square.dataset.level = level;
            square.title = `${dateString}: ${count} items`;

            container.appendChild(square);
        }
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Start App
try {
    window.app = new App();
} catch (e) {
    console.error("App Init Failed:", e);
    alert("アプリの起動に失敗しました: " + e.message);
}
