// NeuronQ - Core Application (Part 1: Core + Study + Data)
class App {
    constructor() {
        this.state = {
            cards: [], mode: 'study', isFlipped: false, currentCardIndex: 0,
            shuffleOrder: [], currentFolder: 'All', editFolder: 'All',
            editingId: null, selectedCards: new Set(), autoPlay: false,
            autoPlayTimer: null, quizType: '4choice', quizCount: 10,
            quizQueue: [], quizIndex: 0, quizScore: 0, quizAnswered: false,
            quizWrong: [], quizTimerInterval: null, quizSeconds: 0,
            streak: 0, lastStudyDate: null, studyLog: {},
            filterDue: false, lockedFolders: new Set(), theme: 'light'
        };
    }

    init() {
        this.loadData();
        this.initTheme();
        this.checkStreak();
        this.updateShuffleOrder();
        this.render();
        this.setupSwipe();
        this.setupKeyboard();
        this.checkQuizResume();
    }

    // === DATA MANAGEMENT ===
    loadData() {
        // バージョンチェック: data.jsが更新されたらlocalStorageのカードを再読み込み
        const savedVersion = localStorage.getItem('neuronq_data_version');
        const currentVersion = (window.DATA_VERSION || 1).toString();
        if (savedVersion !== currentVersion && window.initialData) {
            // データが更新された → initialDataから再読み込み
            this.state.cards = window.initialData.map(c => ({ ...c, id: c.id || this.uid() }));
            localStorage.setItem('neuronq_data_version', currentVersion);
            localStorage.setItem('neuronq_cards', JSON.stringify(this.state.cards));
            console.log(`データ更新を検出 (v${savedVersion} → v${currentVersion}): ${this.state.cards.length}件のカードを再読み込みしました`);
        } else {
            const saved = localStorage.getItem('neuronq_cards');
            if (saved) {
                try { this.state.cards = JSON.parse(saved); } catch (e) { this.state.cards = []; }
            } else if (window.initialData) {
                this.state.cards = window.initialData.map(c => ({ ...c, id: c.id || this.uid() }));
                localStorage.setItem('neuronq_data_version', currentVersion);
            }
        }
        const log = localStorage.getItem('neuronq_studylog');
        if (log) try { this.state.studyLog = JSON.parse(log); } catch (e) { }
        const locked = localStorage.getItem('neuronq_locked');
        if (locked) try { this.state.lockedFolders = new Set(JSON.parse(locked)); } catch (e) { }
        this.state.lastStudyDate = localStorage.getItem('neuronq_lastdate');
        this.state.streak = parseInt(localStorage.getItem('neuronq_streak') || '0');
    }

    saveData() {
        localStorage.setItem('neuronq_cards', JSON.stringify(this.state.cards));
        localStorage.setItem('neuronq_studylog', JSON.stringify(this.state.studyLog));
        localStorage.setItem('neuronq_locked', JSON.stringify([...this.state.lockedFolders]));
        localStorage.setItem('neuronq_streak', this.state.streak.toString());
        if (this.state.lastStudyDate) localStorage.setItem('neuronq_lastdate', this.state.lastStudyDate);
    }

    uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

    getFolders() {
        const set = new Set();
        this.state.cards.forEach(c => { if (c.folder) set.add(c.folder); });
        return [...set].sort();
    }

    getFilteredCards() {
        let cards = this.state.cards;
        if (this.state.currentFolder !== 'All') cards = cards.filter(c => c.folder === this.state.currentFolder);
        if (this.state.filterDue) {
            const now = new Date();
            cards = cards.filter(c => !c.nextReview || new Date(c.nextReview) <= now);
        }
        return cards;
    }

    // === THEME ===
    initTheme() {
        const saved = localStorage.getItem('neuronq_theme');
        if (saved === 'dark') { document.body.classList.add('dark'); this.state.theme = 'dark'; }
        this.updateThemeIcon();
    }
    toggleTheme() {
        document.body.classList.toggle('dark');
        this.state.theme = document.body.classList.contains('dark') ? 'dark' : 'light';
        localStorage.setItem('neuronq_theme', this.state.theme);
        this.updateThemeIcon();
    }
    updateThemeIcon() {
        const el = document.getElementById('theme-icon');
        if (el) el.setAttribute('data-lucide', this.state.theme === 'dark' ? 'sun' : 'moon');
        lucide.createIcons();
    }

    // === STREAK ===
    checkStreak() {
        const today = new Date().toISOString().split('T')[0];
        const last = this.state.lastStudyDate;
        if (!last) { this.state.streak = 0; }
        else {
            const diff = (new Date(today) - new Date(last)) / 86400000;
            if (diff > 1) this.state.streak = 0;
        }
        this.updateStreakBadge();
    }
    markStudied() {
        const today = new Date().toISOString().split('T')[0];
        if (this.state.lastStudyDate !== today) {
            const diff = this.state.lastStudyDate ? (new Date(today) - new Date(this.state.lastStudyDate)) / 86400000 : 999;
            this.state.streak = diff === 1 ? this.state.streak + 1 : 1;
            this.state.lastStudyDate = today;
        }
        this.state.studyLog[today] = (this.state.studyLog[today] || 0) + 1;
        this.updateStreakBadge();
        this.saveData();
    }
    updateStreakBadge() {
        const el = document.getElementById('streak-count');
        if (el) el.textContent = this.state.streak;
    }

    // === NAVIGATION ===
    setMode(mode) {
        this.state.mode = mode;
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active-view'));
        const view = document.getElementById(mode + '-view');
        if (view) view.classList.add('active-view');
        document.querySelectorAll('.tab-btn, .bnav-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.mode === mode);
        });
        this.render();
    }

    // === STUDY MODE ===
    updateShuffleOrder() {
        const cards = this.getFilteredCards();
        this.state.shuffleOrder = cards.map((_, i) => i);
        const btn = document.getElementById('btn-shuffle');
        if (btn && btn.classList.contains('active')) {
            for (let i = this.state.shuffleOrder.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [this.state.shuffleOrder[i], this.state.shuffleOrder[j]] = [this.state.shuffleOrder[j], this.state.shuffleOrder[i]];
            }
        }
        this.state.currentCardIndex = 0;
        this.state.isFlipped = false;
    }

    toggleShuffle() {
        const btn = document.getElementById('btn-shuffle');
        if (btn) btn.classList.toggle('active');
        this.updateShuffleOrder();
        this.renderStudy();
    }

    filterDueCards() {
        this.state.filterDue = !this.state.filterDue;
        const btn = document.getElementById('btn-due');
        if (btn) btn.classList.toggle('active', this.state.filterDue);
        this.updateShuffleOrder();
        this.renderStudy();
    }

    currentCard() {
        const cards = this.getFilteredCards();
        const idx = this.state.shuffleOrder[this.state.currentCardIndex];
        return cards[idx] || null;
    }

    flipCard() {
        this.state.isFlipped = !this.state.isFlipped;
        const el = document.getElementById('flashcard');
        if (el) el.classList.toggle('flipped', this.state.isFlipped);
        if (this.state.isFlipped) {
            const card = this.currentCard();
            const expEl = document.getElementById('card-explanation');
            if (card && card.explanation && expEl) {
                expEl.textContent = card.explanation;
                expEl.classList.remove('hidden');
            } else if (expEl) { expEl.classList.add('hidden'); }
        }
    }

    rateCard(quality) {
        const card = this.currentCard();
        if (!card) return;
        const real = this.state.cards.find(c => c.id === card.id);
        if (!real) return;
        this.calculateNextReview(real, quality);
        this.markStudied();
        this.animateSwipe(quality >= 3 ? 'right' : 'left');
        setTimeout(() => this.nextCard(), 350);
    }

    calculateNextReview(card, quality) {
        card.reviewCount = (card.reviewCount || 0) + 1;
        card.lastReviewed = new Date().toISOString();
        if (quality >= 3) {
            card.correctCount = (card.correctCount || 0) + 1;
            if (card.reviewCount <= 1) card.interval = 1;
            else if (card.reviewCount === 2) card.interval = 3;
            else card.interval = Math.round((card.interval || 1) * (card.easeFactor || 2.5));
            card.easeFactor = Math.max(1.3, (card.easeFactor || 2.5) + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
            card.mastery = Math.min(5, (card.mastery || 0) + 1);
        } else {
            card.interval = 1; card.reviewCount = 0;
            card.easeFactor = Math.max(1.3, (card.easeFactor || 2.5) - 0.2);
            card.mastery = Math.max(0, (card.mastery || 0) - 1);
        }
        const next = new Date();
        next.setDate(next.getDate() + card.interval);
        card.nextReview = next.toISOString();
        this.saveData();
    }

    animateSwipe(dir) {
        const el = document.getElementById('flashcard');
        if (el) { el.classList.add('swipe-' + dir); }
    }

    nextCard() {
        const el = document.getElementById('flashcard');
        if (el) { el.classList.remove('swipe-left', 'swipe-right', 'flipped'); }
        this.state.isFlipped = false;
        const cards = this.getFilteredCards();
        if (this.state.currentCardIndex < this.state.shuffleOrder.length - 1) {
            this.state.currentCardIndex++;
        } else {
            this.showToast('🎉 全カード完了！');
            this.state.currentCardIndex = 0;
            this.updateShuffleOrder();
        }
        this.renderStudy();
    }

    handleStudyFolderChange(val) {
        this.state.currentFolder = val;
        this.updateShuffleOrder();
        this.renderStudy();
    }

    // === AUTO PLAY ===
    toggleAutoPlay() {
        this.state.autoPlay = !this.state.autoPlay;
        const btn = document.getElementById('btn-auto');
        if (btn) btn.classList.toggle('playing', this.state.autoPlay);
        if (this.state.autoPlay) this.runAutoPlay();
        else this.stopAutoPlay();
    }
    stopAutoPlay() {
        this.state.autoPlay = false;
        const btn = document.getElementById('btn-auto');
        if (btn) btn.classList.remove('playing');
        if (this.state.autoPlayTimer) { clearTimeout(this.state.autoPlayTimer); this.state.autoPlayTimer = null; }
        speechSynthesis.cancel();
    }
    async runAutoPlay() {
        if (!this.state.autoPlay) return;
        const card = this.currentCard();
        if (!card) { this.stopAutoPlay(); return; }
        await this.speakText(card.question); if (!this.state.autoPlay) return;
        await this.delay(500); if (!this.state.autoPlay) return;
        this.flipCard();
        await this.delay(300); if (!this.state.autoPlay) return;
        await this.speakText(card.answer); if (!this.state.autoPlay) return;
        await this.delay(1500); if (!this.state.autoPlay) return;
        this.rateCard(3);
        this.state.autoPlayTimer = setTimeout(() => this.runAutoPlay(), 800);
    }
    delay(ms) { return new Promise(r => setTimeout(r, ms)); }

    // === TTS ===
    speak(type) {
        const card = this.currentCard();
        if (!card) return;
        this.speakText(type === 'question' ? card.question : card.answer);
    }
    speakText(text) {
        return new Promise(resolve => {
            speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(text);
            u.lang = 'ja-JP'; u.rate = 1.0;
            u.onend = resolve; u.onerror = resolve;
            speechSynthesis.speak(u);
        });
    }

    // === SWIPE GESTURES ===
    setupSwipe() {
        const el = document.getElementById('flashcard-wrapper');
        if (!el) return;
        let sx = 0, sy = 0;
        el.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
        el.addEventListener('touchend', e => {
            const dx = e.changedTouches[0].clientX - sx;
            const dy = e.changedTouches[0].clientY - sy;
            if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
                if (dx > 0) this.rateCard(4); else this.rateCard(1);
            }
        }, { passive: true });
    }

    setupKeyboard() {
        document.addEventListener('keydown', e => {
            if (this.state.mode === 'study') {
                if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); this.flipCard(); }
                else if (e.key === 'ArrowLeft') this.rateCard(1);
                else if (e.key === 'ArrowRight') this.rateCard(4);
            }
        });
    }

    // === TOAST ===
    showToast(msg) {
        const c = document.getElementById('toast-container');
        if (!c) return;
        const t = document.createElement('div');
        t.className = 'toast'; t.textContent = msg;
        c.appendChild(t);
        setTimeout(() => t.remove(), 3000);
    }

    // === CONFETTI ===
    confetti() {
        const canvas = document.getElementById('confetti-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth; canvas.height = window.innerHeight;
        const pieces = [];
        const colors = ['#6366f1', '#a855f7', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];
        for (let i = 0; i < 120; i++) {
            pieces.push({
                x: Math.random() * canvas.width, y: -20 - Math.random() * 200,
                w: 6 + Math.random() * 6, h: 4 + Math.random() * 4,
                vx: (Math.random() - 0.5) * 4, vy: 2 + Math.random() * 4,
                rot: Math.random() * 360, vr: (Math.random() - 0.5) * 10,
                color: colors[Math.floor(Math.random() * colors.length)], alpha: 1
            });
        }
        let frame = 0;
        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            let alive = false;
            pieces.forEach(p => {
                if (p.alpha <= 0) return;
                alive = true;
                p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.rot += p.vr;
                if (frame > 60) p.alpha -= 0.015;
                ctx.save(); ctx.translate(p.x, p.y);
                ctx.rotate(p.rot * Math.PI / 180);
                ctx.globalAlpha = Math.max(0, p.alpha);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                ctx.restore();
            });
            frame++;
            if (alive) requestAnimationFrame(draw);
            else ctx.clearRect(0, 0, canvas.width, canvas.height);
        };
        draw();
    }

    // === RENDER ===
    render() {
        if (this.state.mode === 'study') this.renderStudy();
        else if (this.state.mode === 'quiz') this.renderQuizSetup();
        else if (this.state.mode === 'edit') { this.renderEditFolders(); this.renderEditList(); }
        else if (this.state.mode === 'stats') this.renderStats();
    }

    populateFolderSelect(selectId, selectedVal) {
        const sel = document.getElementById(selectId);
        if (!sel) return;
        const folders = this.getFolders();
        const val = selectedVal || sel.value;
        sel.innerHTML = '<option value="All">すべてのフォルダ</option>';
        folders.forEach(f => {
            const o = document.createElement('option');
            o.value = f; o.textContent = f;
            if (f === val) o.selected = true;
            sel.appendChild(o);
        });
    }

    renderStudy() {
        this.populateFolderSelect('study-folder-select', this.state.currentFolder);
        const cards = this.getFilteredCards();
        const total = cards.length;
        const cur = Math.min(this.state.currentCardIndex + 1, total);
        document.getElementById('study-current').textContent = cur;
        document.getElementById('study-total').textContent = total;
        const prog = document.getElementById('study-progress');
        if (prog) prog.style.width = total > 0 ? ((cur / total) * 100) + '%' : '0%';
        const card = this.currentCard();
        const qEl = document.getElementById('card-question');
        const aEl = document.getElementById('card-answer');
        const imgEl = document.getElementById('card-image');
        const expEl = document.getElementById('card-explanation');
        if (card) {
            if (qEl) qEl.textContent = card.question;
            if (aEl) aEl.textContent = card.answer;
            if (imgEl) { if (card.image) { imgEl.src = card.image; imgEl.classList.remove('hidden'); } else { imgEl.classList.add('hidden'); } }
            if (expEl) expEl.classList.add('hidden');
            const mi = document.getElementById('mastery-indicator');
            if (mi) { const m = card.mastery || 0; mi.textContent = m >= 4 ? '⭐ 習得済み' : m >= 2 ? '📘 学習中' : '🆕 新規'; }
        } else {
            if (qEl) qEl.textContent = 'カードがありません\n「編集」タブから追加してください';
            if (aEl) aEl.textContent = '';
            if (imgEl) imgEl.classList.add('hidden');
            if (expEl) expEl.classList.add('hidden');
        }
        const fc = document.getElementById('flashcard');
        if (fc) fc.classList.remove('flipped');
        this.state.isFlipped = false;
    }
}

// App will be extended in app_part2.js
window.AppCore = App;
