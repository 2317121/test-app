// Data loaded from window.initialData

class App {
    constructor() {
        this.state = {
            cards: [],
            currentIndex: 0,
            isFlipped: false,
            mode: 'study', // 'study' or 'edit'
            shuffledIndices: [] // To manage shuffle order
        };

        // Swipe gestures
        this.touchStartX = 0;
        this.touchEndX = 0;

        this.init();
    }

    init() {
        this.loadData();
        // Migrating old data schema if necessary (adding image property)
        this.state.cards.forEach(card => {
            if (!card.hasOwnProperty('image')) card.image = null;
            if (!card.hasOwnProperty('status')) card.status = 'unknown'; // 'known', 'unknown'
        });

        this.updateShuffleOrder();
        this.render();
        this.setupSwipeListeners();

        // Global access for HTML event handlers
        window.app = this;
    }

    // --- Data Management ---

    loadData() {
        const saved = localStorage.getItem('skillTestCards');
        if (saved) {
            this.state.cards = JSON.parse(saved);
        } else {
            this.state.cards = [...window.initialData];
            this.saveData();
        }
    }

    saveData() {
        try {
            localStorage.setItem('skillTestCards', JSON.stringify(this.state.cards));
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
    }

    flipCard() {
        this.state.isFlipped = !this.state.isFlipped;
        this.renderCardState();
    }

    swipeRight() {
        // Known
        this.markCardStatus('known');
        this.animateSwipe('right');
    }

    swipeLeft() {
        // Unknown
        this.markCardStatus('unknown');
        this.animateSwipe('left');
    }

    markCardStatus(status) {
        if (!this.currentCard) return;
        this.currentCard.status = status;
        this.saveData();
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

    async addCard(event) {
        event.preventDefault();
        const qInput = document.getElementById('input-question');
        const aInput = document.getElementById('input-answer');
        const imageInput = document.getElementById('input-image');

        let imageData = null;
        if (imageInput.files && imageInput.files[0]) {
            try {
                imageData = await this.resizeImage(imageInput.files[0]);
            } catch (e) {
                alert('画像の処理に失敗しました。');
                return;
            }
        }

        const newCard = {
            id: Date.now().toString(),
            question: qInput.value,
            answer: aInput.value,
            image: imageData,
            status: 'unknown'
        };

        this.state.cards.push(newCard);
        this.saveData();

        // Clear inputs
        qInput.value = '';
        aInput.value = '';
        imageInput.value = '';

        alert('問題を追加しました。');
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
        const headers = ['Question', 'Answer', 'Status'];
        const rows = this.state.cards.map(c => [
            `"${c.question.replace(/"/g, '""')}"`,
            `"${c.answer.replace(/"/g, '""')}"`,
            c.status
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
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ja-JP'; // Japanese
        speechSynthesis.speak(utterance);
    }

    // --- Rendering ---

    render() {
        // Toggle Views
        const studyView = document.getElementById('study-view');
        const editView = document.getElementById('edit-view');
        const dashboardView = document.getElementById('dashboard-view');

        const navStudy = document.getElementById('nav-study');
        const navEdit = document.getElementById('nav-edit');
        const navDashboard = document.getElementById('nav-dashboard');

        // Reset all
        studyView.classList.add('hidden');
        editView.classList.add('hidden');
        dashboardView.classList.add('hidden');

        navStudy.classList.remove('active');
        navEdit.classList.remove('active');
        navDashboard.classList.remove('active');

        if (this.state.mode === 'study') {
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

        countEl.textContent = this.state.cards.length;
        listContainer.innerHTML = '';

        // Create list items
        this.state.cards.forEach(card => {
            const div = document.createElement('div');
            div.className = 'list-item';

            let imgHtml = '';
            if (card.image) {
                imgHtml = `<img src="${card.image}" style="height: 40px; margin-right: 10px; border-radius: 4px;">`;
            }

            div.innerHTML = `
        <div class="list-content" style="display: flex; align-items: center;">
          ${imgHtml}
          <div>
            <div class="list-q">Q: ${this.escapeHtml(card.question)}</div>
            <div class="list-a">A: ${this.escapeHtml(card.answer)}</div>
          </div>
        </div>
        <div class="list-actions">
          <button onclick="app.deleteCard('${card.id}')">削除</button>
        </div>
      `;
            listContainer.appendChild(div);
        });
    }

    renderDashboardMode() {
        const total = this.state.cards.length;
        const known = this.state.cards.filter(c => c.status === 'known').length;
        const unknown = total - known;

        document.getElementById('stat-total').textContent = total;
        document.getElementById('stat-known').textContent = known;
        document.getElementById('stat-unknown').textContent = unknown;

        const percentage = total === 0 ? 0 : (known / total) * 100;
        const chart = document.getElementById('status-chart');
        chart.style.background = `conic-gradient(#16a34a 0% ${percentage}%, #ef4444 ${percentage}% 100%)`;
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
