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
            studyLog: {} // { "YYYY-MM-DD": count }
        };

        this.state = JSON.parse(localStorage.getItem('flashcard_app_data')) || defaultState;

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
        this.loadData();
        // Migrating old data schema if necessary (adding image property)
        this.state.cards.forEach(card => {
            if (!card.hasOwnProperty('image')) card.image = null;
            if (!card.hasOwnProperty('status')) card.status = 'unknown'; // 'known', 'unknown'
            if (!card.hasOwnProperty('tags')) card.tags = []; // New in Phase 4
        });

        this.updateShuffleOrder();
        this.render();
        this.setupSwipeListeners();
        this.updateStreakBadge(); // Ensure badge is updated on init

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

    loadData() {
        const saved = localStorage.getItem('skillTestCards');
        const savedMeta = localStorage.getItem('skillTestMeta');

        if (saved) {
            this.state.cards = JSON.parse(saved);
        } else {
            this.state.cards = [...window.initialData];
        }

        // Initialize SRS fields if missing
        this.state.cards.forEach(card => {
            if (!card.srs) {
                card.srs = {
                    interval: 0,
                    reps: 0,
                    ef: 2.5,
                    nextReview: Date.now()
                };
            }
        });

        if (savedMeta) {
            const meta = JSON.parse(savedMeta);
            this.state.streak = meta.streak || 0;
            this.state.lastStudyDate = meta.lastStudyDate || null;
        }

        this.saveData(); // Save normalized data
    }

    saveData() {
        try {
            localStorage.setItem('skillTestCards', JSON.stringify(this.state.cards));
            localStorage.setItem('skillTestMeta', JSON.stringify({
                streak: this.state.streak,
                lastStudyDate: this.state.lastStudyDate
            }));
        } catch (e) {
            alert('保存に失敗しました。画像のサイズが大きすぎる可能性があります。');
            console.error(e);
        }
        this.render();
    }

    updateShuffleOrder() {
        // Filter out "Known" cards if we want to study only unknown?
        // For now, let's keep all cards but prioritize unknown? 
        // Simplified: Just shuffle everything for now.

        this.state.shuffledIndices = this.state.cards.map((_, i) => i);
        // Fisher-Yates shuffle
        for (let i = this.state.shuffledIndices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.state.shuffledIndices[i], this.state.shuffledIndices[j]] =
                [this.state.shuffledIndices[j], this.state.shuffledIndices[i]];
        }
        this.state.currentIndex = 0; // Reset to start
        this.state.isFlipped = false;
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

    // Called by UI buttons
    rateCard(quality) {
        const cardEl = document.getElementById('flashcard');
        const dir = quality <= 2 ? 'left' : 'right';

        if (cardEl) {
            cardEl.classList.add(`swipe-${dir}`);
        }

        // Animate first, then process logic after delay
        setTimeout(() => {
            this.answerCard(quality);
            // answerCard now needs to call saveData/render again? 
            // or we manually call it here. 
            // Let's restore answerCard to be self-contained for safety, 
            // but we need to prevent it from rendering if we want smooth animation?
            // Actually, if we render, the animation class is lost, which is desired at the END of animation.
            this.nextCard();
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
            cardEl.classList.remove(`swipe-${direction}`);
            this.nextCard();
        }, 300);
    }

    nextCard() {
        if (this.state.currentIndex < this.state.cards.length - 1) {
            this.state.currentIndex++;
            this.state.isFlipped = false;
            this.render();
        } else {
            alert('一通り学習しました！シャッフルして最初に戻ります。');
            this.updateShuffleOrder();
            this.render();
        }
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
        alert('カードをシャッフルしました！');
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
        document.getElementById('input-image').value = '';
        document.getElementById('input-tags').value = '';
    }

    loadCardToForm(id) {
        const card = this.state.cards.find(c => c.id === id);
        if (!card) return;
        document.getElementById('input-question').value = card.question;
        document.getElementById('input-answer').value = card.answer;
        document.getElementById('input-tags').value = (card.tags || []).join(', ');
    }

    async handleFormSubmit(event) {
        event.preventDefault();
        const qInput = document.getElementById('input-question');
        const aInput = document.getElementById('input-answer');
        const imageInput = document.getElementById('input-image');
        const tagsInput = document.getElementById('input-tags');

        if (this.state.editingId) {
            await this.updateCard(qInput, aInput, imageInput, tagsInput);
        } else {
            await this.addCard(qInput, aInput, imageInput, tagsInput);
        }
        this.closeModal();
    }

    async addCard(qInput, aInput, imageInput, tagsInput) {
        let imageData = null;
        if (imageInput.files && imageInput.files[0]) {
            try {
                imageData = await this.resizeImage(imageInput.files[0]);
            } catch (e) {
                alert('画像の処理に失敗しました。');
                return;
            }
        }

        const tags = tagsInput.value.split(',').map(t => t.trim()).filter(t => t);

        const newCard = {
            id: Date.now().toString(),
            question: qInput.value,
            answer: aInput.value,
            image: imageData,
            tags: tags,
            status: 'unknown',
            srs: { interval: 0, reps: 0, ef: 2.5, nextReview: Date.now() }
        };

        this.state.cards.push(newCard);
        this.saveData();
        alert('問題を追加しました。');
    }

    async updateCard(qInput, aInput, imageInput, tagsInput) {
        const cardIndex = this.state.cards.findIndex(c => c.id === this.state.editingId);
        if (cardIndex === -1) return;

        const card = this.state.cards[cardIndex];
        card.question = qInput.value;
        card.answer = aInput.value;
        card.tags = tagsInput.value.split(',').map(t => t.trim()).filter(t => t);

        if (imageInput.files && imageInput.files[0]) {
            try {
                card.image = await this.resizeImage(imageInput.files[0]);
            } catch (e) {
                console.error(e);
            }
        }

        this.saveData();
        alert('問題を更新しました。');
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
        }
    }

    // --- CSV Import/Export ---

    exportCSV() {
        const headers = ['Question', 'Answer', 'Status', 'Tags'];
        const rows = this.state.cards.map(c => [
            `"${c.question.replace(/"/g, '""')}"`,
            `"${c.answer.replace(/"/g, '""')}"`,
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

                // Skip header if present
                const startIndex = rows[0].toLowerCase().includes('question') ? 1 : 0;

                let addedCount = 0;
                for (let i = startIndex; i < rows.length; i++) {
                    // Simple CSV parser (handles quoted commas)
                    const cols = this.parseCSVRow(rows[i]);
                    if (cols.length >= 2) {
                        const newCard = {
                            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                            question: cols[0],
                            answer: cols[1],
                            status: cols[2] || 'unknown',
                            tags: cols[3] ? cols[3].split(',').map(t => t.trim()) : [],
                            image: null
                        };
                        this.state.cards.push(newCard);
                        addedCount++;
                    }
                }

                this.saveData();
                alert(`${addedCount}件の問題をインポートしました。`);
                // Reset input
                input.value = '';
            } catch (err) {
                console.error(err);
                alert('CSVの読み込みに失敗しました。フォーマットを確認してください。');
            }
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

        touchContainer.addEventListener('touchstart', (e) => {
            this.touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        touchContainer.addEventListener('touchend', (e) => {
            this.touchEndX = e.changedTouches[0].screenX;
            this.handleGesture();
        }, { passive: true });
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
    }

    startQuiz() {
        if (this.state.cards.length < 4) {
            alert('クイズをするには、少なくとも4つの問題が必要です。');
            return;
        }

        // Select 10 random cards
        const shuffled = [...this.state.cards].sort(() => Math.random() - 0.5);
        this.quizState = {
            questions: shuffled.slice(0, 10),
            current: 0,
            score: 0
        };

        document.getElementById('quiz-start').classList.add('hidden');
        document.getElementById('quiz-question-container').classList.remove('hidden');
        this.renderQuizQuestion();
    }

    renderQuizQuestion() {
        const q = this.quizState.questions[this.quizState.current];
        const total = this.quizState.questions.length;

        // Update Header
        document.getElementById('quiz-progress').textContent = `${this.quizState.current + 1} / ${total}`;
        document.getElementById('quiz-score').textContent = `Score: ${this.quizState.score}`;

        // Question
        document.getElementById('quiz-question-text').textContent = q.question;
        const imgEl = document.getElementById('quiz-image');
        if (q.image) {
            imgEl.src = q.image;
            imgEl.classList.remove('hidden');
        } else {
            imgEl.classList.add('hidden');
        }

        // Generate Choices
        const choices = this.generateChoices(q);
        const container = document.getElementById('quiz-choices');
        container.innerHTML = '';

        choices.forEach(choice => {
            const btn = document.createElement('button');
            btn.className = 'btn-choice';
            btn.textContent = choice;
            btn.onclick = () => this.answerQuiz(btn, choice, q.answer);
            container.appendChild(btn);
        });
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

        if (selected === correct) {
            btn.classList.add('correct');
            this.quizState.score++;
        } else {
            btn.classList.add('wrong');
            // Show correct one
            buttons.forEach(b => {
                if (b.textContent === correct) b.classList.add('correct');
            });
        }

        setTimeout(() => {
            this.quizState.current++;
            if (this.quizState.current < this.quizState.questions.length) {
                this.renderQuizQuestion();
            } else {
                this.showQuizResult();
            }
        }, 1500);
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
    }

    // --- Rendering ---

    render() {
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
    }

    renderStudyMode() {
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
            return;
        }

        qEl.textContent = card.question;
        aEl.textContent = card.answer;

        if (card.image) {
            imgEl.src = card.image;
            imgEl.classList.remove('hidden');
        } else {
            imgEl.classList.add('hidden');
        }

        indexEl.textContent = this.state.currentIndex + 1;
        totalEl.textContent = this.state.cards.length;

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

    renderEditMode() {
        const listContainer = document.getElementById('card-list-container');
        const countEl = document.getElementById('list-count');

        // Filter Logic
        const keyword = (document.getElementById('search-input').value || '').toLowerCase();
        const tagFilter = document.getElementById('tag-filter').value;

        // Collect all unique tags for filter dropdown
        const allTags = new Set();
        this.state.cards.forEach(c => {
            if (c.tags) c.tags.forEach(t => allTags.add(t));
        });

        // Update Tag Filter Options (preserve selection)
        const tagSelect = document.getElementById('tag-filter');
        const currentSelection = tagSelect.value;
        tagSelect.innerHTML = '<option value="">全てのタグ</option>';
        allTags.forEach(tag => {
            const option = document.createElement('option');
            option.value = tag;
            option.textContent = tag;
            if (tag === currentSelection) option.selected = true;
            tagSelect.appendChild(option);
        });

        // Filter cards
        const filteredCards = this.state.cards.filter(card => {
            const matchesKeyword = (card.question.toLowerCase().includes(keyword) || card.answer.toLowerCase().includes(keyword));
            const matchesTag = tagFilter ? (card.tags && card.tags.includes(tagFilter)) : true;
            return matchesKeyword && matchesTag;
        });

        countEl.textContent = filteredCards.length;
        listContainer.innerHTML = '';

        // Create list items
        filteredCards.forEach(card => {
            const div = document.createElement('div');
            div.className = 'list-item';

            let imgHtml = '';
            if (card.image) {
                imgHtml = `<img src="${card.image}" style="height: 40px; margin-right: 10px; border-radius: 4px;">`;
            }

            let tagsHtml = '';
            if (card.tags && card.tags.length > 0) {
                tagsHtml = `<div style="margin-top: 4px;">${card.tags.map(t => `<span class="tag-badge">#${t}</span>`).join('')}</div>`;
            }

            div.innerHTML = `
        <div class="list-content" style="display: flex; align-items: center;">
          ${imgHtml}
          <div>
            <div class="list-q">Q: ${this.escapeHtml(card.question)}</div>
            <div class="list-a">A: ${this.escapeHtml(card.answer)}</div>
            ${tagsHtml}
          </div>
        </div>
        <div class="list-actions">
          <button class="btn-sm" onclick="app.openModal('edit', '${card.id}')" style="margin-right: 5px;">編集</button>
          <button class="btn-sm btn-danger" onclick="app.deleteCard('${card.id}')">削除</button>
        </div>
      `;
            listContainer.appendChild(div);
        });
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
new App();
