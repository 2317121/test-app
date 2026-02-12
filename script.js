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

        this.init();
    }

    init() {
        this.loadData();
        this.updateShuffleOrder();
        this.render();

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
        localStorage.setItem('skillTestCards', JSON.stringify(this.state.cards));
        this.updateShuffleOrder(); // Re-shuffle when data changes
        this.render();
    }

    updateShuffleOrder() {
        // Simple index array: [0, 1, 2, ...]
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

    nextCard() {
        if (this.state.currentIndex < this.state.cards.length - 1) {
            this.state.currentIndex++;
            this.state.isFlipped = false;
            this.render();
        }
    }

    prevCard() {
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

    addCard(event) {
        event.preventDefault();
        const qInput = document.getElementById('input-question');
        const aInput = document.getElementById('input-answer');

        const newCard = {
            id: Date.now().toString(),
            question: qInput.value,
            answer: aInput.value
        };

        this.state.cards.push(newCard);
        this.saveData();

        // Clear inputs
        qInput.value = '';
        aInput.value = '';

        // Provide feedback
        alert('問題を追加しました。');
    }

    deleteCard(id) {
        if (confirm('本当にこの問題を削除しますか？')) {
            this.state.cards = this.state.cards.filter(c => c.id !== id);
            this.saveData();
        }
    }

    // --- Rendering ---

    render() {
        // Toggle Views
        const studyView = document.getElementById('study-view');
        const editView = document.getElementById('edit-view');
        const navStudy = document.getElementById('nav-study');
        const navEdit = document.getElementById('nav-edit');

        if (this.state.mode === 'study') {
            studyView.classList.remove('hidden');
            editView.classList.add('hidden');
            navStudy.classList.add('active');
            navEdit.classList.remove('active');
            this.renderStudyMode();
        } else {
            studyView.classList.add('hidden');
            editView.classList.remove('hidden');
            navStudy.classList.remove('active');
            navEdit.classList.add('active');
            this.renderEditMode();
        }
    }

    renderStudyMode() {
        const card = this.currentCard;
        const qEl = document.getElementById('card-question');
        const aEl = document.getElementById('card-answer');
        const indexEl = document.getElementById('current-index');
        const totalEl = document.getElementById('total-count');

        if (!card) {
            qEl.textContent = '問題がありません。編集モードで追加してください。';
            aEl.textContent = '';
            return;
        }

        qEl.textContent = card.question;
        aEl.textContent = card.answer;
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
            div.innerHTML = `
        <div class="list-content">
          <div class="list-q">Q: ${this.escapeHtml(card.question)}</div>
          <div class="list-a">A: ${this.escapeHtml(card.answer)}</div>
        </div>
        <div class="list-actions">
          <button onclick="app.deleteCard('${card.id}')">削除</button>
        </div>
      `;
            listContainer.appendChild(div);
        });
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
