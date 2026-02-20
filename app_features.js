// NeuronQ - Features (Quiz, Edit, Stats, Import/Export)
// Extends AppCore from app_core.js

(function () {
    const Base = window.AppCore;

    // === QUIZ ===
    Base.prototype.renderQuizSetup = function () {
        this.populateFolderSelect('quiz-folder-select');
        const saved = localStorage.getItem('neuronq_quiz_save');
        const banner = document.getElementById('quiz-resume-banner');
        if (banner) banner.classList.toggle('hidden', !saved);
    };

    Base.prototype.setQuizType = function (btn) {
        document.querySelectorAll('[data-type]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.state.quizType = btn.dataset.type;
    };
    Base.prototype.setQuizCount = function (btn) {
        document.querySelectorAll('[data-count]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.state.quizCount = btn.dataset.count === 'all' ? 9999 : parseInt(btn.dataset.count);
    };

    Base.prototype.startQuiz = function () {
        const folder = document.getElementById('quiz-folder-select')?.value || 'All';
        let pool = folder === 'All' ? [...this.state.cards] : this.state.cards.filter(c => c.folder === folder);
        if (pool.length < 2) { this.showToast('カードが足りません（2枚以上必要）'); return; }
        for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[pool[i], pool[j]] = [pool[j], pool[i]]; }
        this.state.quizQueue = pool.slice(0, Math.min(this.state.quizCount, pool.length));
        this.state.quizIndex = 0; this.state.quizScore = 0;
        this.state.quizAnswered = false; this.state.quizWrong = [];
        this.state.quizSeconds = 0;
        document.getElementById('quiz-setup')?.classList.add('hidden');
        document.getElementById('quiz-result')?.classList.add('hidden');
        document.getElementById('quiz-active')?.classList.remove('hidden');
        this.startQuizTimer();
        this.renderQuizQuestion();
        localStorage.removeItem('neuronq_quiz_save');
    };

    Base.prototype.startReviewQuiz = function () {
        if (this.state.quizWrong.length < 1) { this.showToast('復習するカードがありません'); return; }
        this.state.quizQueue = [...this.state.quizWrong];
        this.state.quizIndex = 0; this.state.quizScore = 0;
        this.state.quizAnswered = false; this.state.quizWrong = [];
        this.state.quizSeconds = 0;
        document.getElementById('quiz-result')?.classList.add('hidden');
        document.getElementById('quiz-active')?.classList.remove('hidden');
        this.startQuizTimer();
        this.renderQuizQuestion();
    };

    Base.prototype.resumeQuiz = function () {
        try {
            const s = JSON.parse(localStorage.getItem('neuronq_quiz_save'));
            Object.assign(this.state, { quizQueue: s.queue, quizIndex: s.index, quizScore: s.score, quizWrong: s.wrong, quizType: s.type, quizAnswered: false, quizSeconds: s.seconds || 0 });
            document.getElementById('quiz-setup')?.classList.add('hidden');
            document.getElementById('quiz-active')?.classList.remove('hidden');
            this.startQuizTimer();
            this.renderQuizQuestion();
            localStorage.removeItem('neuronq_quiz_save');
        } catch (e) { this.showToast('復元に失敗しました'); }
    };
    Base.prototype.discardQuiz = function () {
        localStorage.removeItem('neuronq_quiz_save');
        document.getElementById('quiz-resume-banner')?.classList.add('hidden');
    };
    Base.prototype.checkQuizResume = function () {
        const saved = localStorage.getItem('neuronq_quiz_save');
        const banner = document.getElementById('quiz-resume-banner');
        if (banner) banner.classList.toggle('hidden', !saved);
    };
    Base.prototype.saveQuizState = function () {
        localStorage.setItem('neuronq_quiz_save', JSON.stringify({
            queue: this.state.quizQueue, index: this.state.quizIndex, score: this.state.quizScore,
            wrong: this.state.quizWrong, type: this.state.quizType, seconds: this.state.quizSeconds
        }));
    };

    Base.prototype.startQuizTimer = function () {
        if (this.state.quizTimerInterval) clearInterval(this.state.quizTimerInterval);
        this.state.quizTimerInterval = setInterval(() => {
            this.state.quizSeconds++;
            const m = Math.floor(this.state.quizSeconds / 60);
            const s = this.state.quizSeconds % 60;
            const el = document.getElementById('quiz-timer');
            if (el) el.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        }, 1000);
    };

    Base.prototype.renderQuizQuestion = function () {
        const q = this.state.quizQueue[this.state.quizIndex];
        if (!q) { this.showQuizResult(); return; }
        this.state.quizAnswered = false;
        document.getElementById('quiz-index').textContent = this.state.quizIndex + 1;
        document.getElementById('quiz-total').textContent = this.state.quizQueue.length;
        document.getElementById('quiz-score').textContent = this.state.quizScore;
        const fill = document.getElementById('quiz-progress-fill');
        if (fill) fill.style.width = ((this.state.quizIndex / this.state.quizQueue.length) * 100) + '%';
        document.getElementById('quiz-question').textContent = q.question;
        const img = document.getElementById('quiz-image');
        if (q.image) { img.src = q.image; img.classList.remove('hidden'); } else { img.classList.add('hidden'); }
        document.getElementById('quiz-feedback')?.classList.add('hidden');

        const choicesEl = document.getElementById('quiz-choices');
        const typingEl = document.getElementById('quiz-typing');
        if (this.state.quizType === '4choice') {
            choicesEl.classList.remove('hidden'); typingEl.classList.add('hidden');
            const distractorTexts = this.getDistractors(q, 3);
            const options = [...distractorTexts.map(t => ({ text: t, isCorrect: false })), { text: q.answer, isCorrect: true }];
            for (let i = options.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[options[i], options[j]] = [options[j], options[i]]; }
            choicesEl.innerHTML = '';
            options.forEach(opt => {
                const btn = document.createElement('button');
                btn.className = 'quiz-choice-btn';
                btn.textContent = opt.text;
                btn.onclick = () => this.handleQuizAnswer(opt.isCorrect, btn, q);
                choicesEl.appendChild(btn);
            });
        } else {
            choicesEl.classList.add('hidden'); typingEl.classList.remove('hidden');
            const inp = document.getElementById('quiz-input');
            if (inp) { inp.value = ''; inp.focus(); }
        }
        this.saveQuizState();
    };

    // ====================================================================
    // ひっかけ回答生成エンジン
    // 問題の内容を分析し、正解に近いが間違っている選択肢を3つ生成する
    // ====================================================================
    Base.prototype.getDistractors = function (card, count) {
        const q = (card.question || '').toLowerCase();
        const a = (card.answer || '');
        const aLow = a.toLowerCase();
        const result = [];

        // --- カテゴリ別ひっかけマッピング ---
        const distractorDB = {
            // OSI層
            osiLayers: {
                triggers: ['レイヤ', 'osi', '物理層', 'データリンク層', 'ネットワーク層', 'トランスポート層', 'セッション層', 'プレゼンテーション層', 'アプリケーション層', '第1層', '第2層', '第3層', '第4層', '第5層', '第6層', '第7層'],
                pool: [
                    'レイヤ1（物理層）', 'レイヤ2（データリンク層）', 'レイヤ3（ネットワーク層）',
                    'レイヤ4（トランスポート層）', 'レイヤ5（セッション層）', 'レイヤ6（プレゼンテーション層）',
                    'レイヤ7（アプリケーション層）', '物理層', 'データリンク層', 'ネットワーク層',
                    'トランスポート層', 'セッション層', 'プレゼンテーション層', 'アプリケーション層'
                ]
            },
            // プロトコル
            protocols: {
                triggers: ['プロトコル', 'tcp', 'udp', 'icmp', 'arp', 'rarp', 'dhcp', 'dns', 'http', 'ftp', 'smtp', 'pop3', 'imap', 'ssh', 'telnet', 'snmp', 'ospf', 'rip', 'bgp', 'igp', 'egp', 'ppp', 'hdlc'],
                pool: [
                    'TCP', 'UDP', 'ICMP', 'ARP', 'RARP', 'HTTP', 'HTTPS',
                    'FTP', 'SMTP', 'POP3', 'IMAP', 'DNS', 'DHCP',
                    'SSH', 'Telnet', 'SNMP', 'OSPF', 'RIP', 'BGP',
                    'NTP', 'TFTP', 'SIP', 'IGMP', 'PPP', 'HDLC'
                ]
            },
            // ポート番号
            ports: {
                triggers: ['ポート番号', 'ポート', 'port'],
                pool: [
                    'HTTP:80, DNS:53, SMTP:25', 'FTP:21, SSH:22, Telnet:23',
                    'HTTP:80, HTTPS:443, FTP:21', 'POP3:110, IMAP:143, SMTP:25',
                    'SSH(22), Telnet(23), FTP(20, 21), DNS(53), DHCP(67, 68)。',
                    'HTTP(80), SMTP(25), POP3(110), IMAP(143)。',
                    'HTTP:443, DNS:53, SMTP:587', 'FTP:20, SSH:23, Telnet:22',
                    'HTTP:8080, DNS:5353, SMTP:465'
                ]
            },
            // IPアドレス・サブネット
            ipAddress: {
                triggers: ['ipアドレス', 'サブネット', 'ネットワークアドレス', 'ブロードキャストアドレス', 'プライベート', 'クラスa', 'クラスb', 'クラスc', 'cidr', '/28', '/26', '/24', '/19', '/16'],
                pool: [
                    '192.168.0.0 ～ 192.168.255.255', '172.16.0.0 ～ 172.31.255.255',
                    '10.0.0.0 ～ 10.255.255.255', '128.0.0.0 ～ 191.255.255.255',
                    '0.0.0.0 ～ 127.255.255.255', '192.0.0.0 ～ 223.255.255.255',
                    '255.255.255.0', '255.255.240.0', '255.255.224.0', '255.255.192.0',
                    '255.255.255.128', '255.255.255.240', '255.255.255.252',
                    '192.168.1.0', '192.168.1.64', '192.168.1.128', '192.168.1.192',
                    '172.16.10.0', '172.16.10.16', '172.16.10.32', '172.16.10.15',
                    '10.5.8.0', '10.5.8.16', '10.5.8.31', '10.5.8.32'
                ]
            },
            // MACアドレス
            macAddress: {
                triggers: ['macアドレス', 'mac', 'oui', 'ベンダー'],
                pool: [
                    '32ビット', '48ビット', '64ビット', '128ビット',
                    'ベンダー（製造メーカー）固有のID。', 'NIC（ネットワークインターフェースカード）固有のID。',
                    'デバイスのシリアル番号。', 'FF-FF-FF-FF-FF-FF',
                    '00-00-00-00-00-00', 'IPアドレスとの対応テーブル。'
                ]
            },
            // ドメイン（コリジョン・ブロードキャスト）
            domains: {
                triggers: ['コリジョンドメイン', 'ブロードキャストドメイン', 'ドメイン', '分割'],
                pool: [
                    'コリジョンドメイン', 'ブロードキャストドメイン', 'フェイルオーバードメイン',
                    'セキュリティドメイン', 'マルチキャストドメイン', '管理ドメイン'
                ]
            },
            // ネットワーク種類
            networkTypes: {
                triggers: ['lan', 'wan', 'man', 'can', 'pan', 'イントラネット', 'エクストラネット', 'インターネット'],
                pool: [
                    'LAN (Local Area Network)', 'WAN (Wide Area Network)',
                    'MAN (Metropolitan Area Network)', 'CAN (Campus Area Network)',
                    'PAN (Personal Area Network)', 'SAN (Storage Area Network)',
                    'イントラネット', 'エクストラネット', 'インターネット', 'VLAN'
                ]
            },
            // 暗号方式
            encryption: {
                triggers: ['暗号', '公開鍵', '共通鍵', '秘密鍵', 'ハッシュ', 'aes', 'des', 'rsa'],
                pool: [
                    '公開鍵暗号化方式', '共通鍵暗号化方式', 'ハイブリッド暗号方式',
                    '暗号化と復号に異なる鍵（ペア鍵）を使用し、鍵の配送・管理が容易である',
                    '暗号化と復号に同じ鍵を使う方式。高速だが鍵の配送が課題。',
                    'ハッシュ値（メッセージダイジェスト）', 'デジタル署名',
                    '処理が高速で、鍵の配送も容易である',
                    '処理は遅いが、鍵の配送・管理が困難である',
                    'ストリーム暗号方式', 'ブロック暗号方式'
                ]
            },
            // セキュリティ攻撃
            attacks: {
                triggers: ['攻撃', 'ddos', 'dos', '侵入', 'ids', 'ips', '能動的', '受動的', 'マルウェア'],
                pool: [
                    'DDoS攻撃', 'DoS攻撃', 'フィッシング攻撃', 'ブルートフォース攻撃',
                    'SQLインジェクション', 'クロスサイトスクリプティング', 'バッファオーバーフロー',
                    '能動的攻撃 (Active Attack)', '受動的攻撃 (Passive Attack)',
                    '中間者攻撃 (Man-in-the-Middle)', 'なりすまし攻撃',
                    'IDSは検知して通知するのみ。IPSは不正アクセスを検出すると遮断等の防御も行う。',
                    'IDSは検知して遮断する。IPSは通知のみ行う。',
                    'IDSもIPSも検知・遮断の両方を行う。'
                ]
            },
            // ケーブル
            cables: {
                triggers: ['ケーブル', 'utp', 'stp', 'ストレート', 'クロス', 'cat', 'カテゴリ', 'ツイストペア', '光ファイバ', '100base', '1000base'],
                pool: [
                    'ツイストペアケーブル', '光ファイバケーブル', '同軸ケーブル',
                    'UTPはシールドなし、STPはシールドあり（ノイズに強い）。',
                    'UTPはシールドあり、STPはシールドなし。',
                    '100メートル。', '200メートル。', '50メートル。', '500メートル。',
                    'Cat5(100M), Cat5e(1G), Cat6(1G), Cat6A/7(10G)。',
                    'Cat5(10M), Cat5e(100M), Cat6(1G), Cat6A/7(10G)。',
                    '100MHz / 100BASE-TX', '250MHz / 1000BASE-T', '500MHz / 10GBASE-T',
                    '1, 2, 3, 6番ピンのみを使用する。', '4対8芯すべての線を使用し、全二重通信を行う。',
                    '1, 2番ピンのみを使用する。'
                ]
            },
            // VLAN・スイッチ
            switching: {
                triggers: ['vlan', 'スイッチ', 'フラッディング', 'フォワーディング', 'ラーニング', 'ストアアンドフォワード', 'カットスルー', 'macアドレステーブル'],
                pool: [
                    'フラッディング', 'フォワーディング', 'フィルタリング', 'ラーニング',
                    '物理構成に関わらず、論理的にネットワーク（ブロードキャストドメイン）を分割すること。',
                    '物理的な配線を変えずにブロードキャストドメインを分割する',
                    '物理的な配線を変えずにコリジョンドメインを分割する',
                    '論理的にMACアドレステーブルを分割する',
                    'ストアアンドフォワード(FCSチェックあり・確実), カットスルー(FCSなし・高速)。',
                    'カットスルー(FCSチェックあり・確実), ストアアンドフォワード(FCSなし・高速)。'
                ]
            },
            // ルーティング
            routing: {
                triggers: ['ルーティング', 'rip', 'ospf', 'ホップ', 'メトリック', 'スプリットホライズン', 'ポイズンリバース', 'アドミニストレーティブ', 'ad値', 'igp', 'egp', 'bgp'],
                pool: [
                    'ホップ数（経由するルータの数）', '帯域幅（リンクの速度）',
                    'コスト（帯域幅に基づく値）', '遅延（レイテンシ）',
                    'リンクステート型', 'ディスタンスベクター型', 'パスベクター型',
                    'スプリットホライズン', 'ポイズンリバース', 'ルートポイズニング', 'ホールドダウン',
                    '直接接続 (0)', 'スタティックルート (1)', 'OSPF (110)', 'RIP (120)',
                    '15（16で到達不能とみなす）。', '30秒ごと。',
                    'IGP (Interior Gateway Protocol)', 'EGP (Exterior Gateway Protocol)',
                    '16', '15', '32', '255',
                    'サブネットマスクの通知（クラスレスルーティング対応）',
                    'マルチキャスト対応', '認証機能の追加'
                ]
            },
            // WAN
            wan: {
                triggers: ['wan', 'dte', 'dce', 'フレームリレー', 'dlci', 'ppp', 'ip-vpn', 'nat', 'napt', 'pat', 'onu', 'ftth'],
                pool: [
                    'フレームリレー', 'ATM', 'ISDN', 'IP-VPN', '広域イーサネット',
                    'NAT=IPのみ変換(1対1), NAPT(PAT)=IPとポート番号を変換(1対多)。',
                    'NAT=IPとポート番号を変換(1対多), NAPT=IPのみ変換(1対1)。',
                    'DTE=データ端末装置(ルータ等), DCE=回線終端装置(ONU/モデム等)。',
                    'DTE=回線終端装置(ONU等), DCE=データ端末装置(ルータ等)。',
                    'E/O変換（電気信号 ⇒ 光信号）', 'O/E変換（光信号 ⇒ 電気信号）',
                    'A/D変換（アナログ ⇒ デジタル）', 'D/A変換（デジタル ⇒ アナログ）',
                    'PAT (NAPT / IPマスカレード)', 'スタティックNAT', 'ダイナミックNAT',
                    'ONU', 'モデム', 'ルータ', 'TA（ターミナルアダプタ）',
                    'Cisco HDLC', 'PPP', 'HDLC', 'SLIP',
                    'NCP (Network Control Protocol)', 'LCP (Link Control Protocol)'
                ]
            },
            // 無線LAN
            wireless: {
                triggers: ['無線lan', 'wifi', 'ssid', 'essid', 'bssid', 'wep', 'wpa', 'wpa2', 'wpa3', 'csma/ca', '802.11', '2.4ghz', '5ghz', 'チャネル', 'ローミング', 'ステルス', 'tkip', 'aes', '隠れ端末', '電波', '周波数'],
                pool: [
                    'ESSID (SSID)', 'BSSID', 'MACアドレス', 'チャネルID',
                    'WEP', 'WPA', 'WPA2', 'WPA3', 'IEEE 802.1X',
                    'CSMA/CA with RTS/CTS', 'CSMA/CD', 'CSMA/CA', 'トークンパッシング',
                    '1, 6, 11', '1, 5, 9, 13', '1, 7, 13', '2, 7, 12',
                    '5GHz帯 / 6.9Gbps', '2.4GHz帯 / 600Mbps', '5GHz帯 / 1.3Gbps', '2.4GHz帯 / 54Mbps',
                    'ステルス機能', 'MACアドレスフィルタリング', 'ビーコン暗号化',
                    '直進性が高く、障害物で反射しやすい', '回折しやすく、障害物を回り込む',
                    '直進性が低く、広範囲に拡散する', '減衰が少なく、長距離伝送に適する'
                ]
            },
            // DMZ・ファイアウォール
            firewall: {
                triggers: ['dmz', 'ファイアウォール', 'パケットフィルタリング', 'fw', '非武装地帯'],
                pool: [
                    'DMZ (DeMilitarized Zone)', 'イントラネット', 'エクストラネット',
                    '外部から内部へのアクセスは原則として「全て拒否」する。',
                    '外部から内部へのアクセスは原則として「全て許可」する。',
                    '内部から外部へのアクセスは原則として「全て拒否」する。',
                    'IPアドレスやポート番号を見て通過・遮断を判断する機能。',
                    'MACアドレスを見て通過・遮断を判断する機能。',
                    'URLやコンテンツを見て通過・遮断を判断する機能。'
                ]
            },
            // PDU
            pdu: {
                triggers: ['pdu', 'セグメント', 'データグラム', 'フレーム', 'パケット', 'データの単位'],
                pool: [
                    'セグメント / データグラム', 'パケット', 'フレーム', 'ビット',
                    'IPデータグラム', 'セル', 'メッセージ', 'オクテット'
                ]
            },
            // 通信方式
            castTypes: {
                triggers: ['ユニキャスト', 'ブロードキャスト', 'マルチキャスト', '1対1', '1対多', '通信方式'],
                pool: [
                    '1対1の通信方式。', '1対多（ネットワーク内の全員）への通信方式。',
                    '1対多（特定のグループ）への通信方式。', '多対多の通信方式。',
                    'エニーキャスト（最も近い1台への通信）'
                ]
            },
            // DHCP
            dhcp: {
                triggers: ['dhcp', 'ipアドレスを自動', 'リース', 'discover', 'offer', 'request', 'ack'],
                pool: [
                    'DHCP Discover', 'DHCP Offer', 'DHCP Request', 'DHCP Acknowledge',
                    'ARP Request', 'DNS Query', 'ICMP Echo Request',
                    'IPアドレス等を自動的に割り当てる機能。', 'MACアドレスを自動的に割り当てる機能。'
                ]
            },
            // カプセル化・データ処理
            encapsulation: {
                triggers: ['カプセル化', 'ヘッダ', '上位層', '下位層', 'encapsulation'],
                pool: [
                    'カプセル化', '非カプセル化（デカプセル化）', 'フラグメンテーション',
                    'セグメンテーション', 'マルチプレクシング', 'トンネリング'
                ]
            },
            // 輻輳・ボトルネック
            congestion: {
                triggers: ['輻輳', 'ボトルネック', '混雑', 'ジッタ', 'qos'],
                pool: [
                    '輻輳', 'ボトルネック', 'レイテンシ', 'ジッタ',
                    'パケットロス', 'スループット低下', 'バッファオーバーフロー',
                    'First In First Out（先入れ先出し）の処理方式。',
                    'Weighted Fair Queuing（重み付き公平キューイング）'
                ]
            },
            // TTL
            ttl: {
                triggers: ['ttl', 'time to live', '生存時間', 'ループ防止'],
                pool: [
                    'ルータを経由するたびに値を減らし、0になったらパケットを破棄してループを防ぐ',
                    'パケットの優先度を決定し、QoSを制御する',
                    'パケットの暗号化レベルを指定する',
                    'パケットの送信元を特定し、認証を行う'
                ]
            },
            // 半二重・全二重
            duplex: {
                triggers: ['半二重', '全二重', 'duplex', 'オートネゴシエーション'],
                pool: [
                    '自動的に半二重になる', '自動的に全二重になる',
                    '通信が切断される', '速度のみ自動設定され、二重モードは手動設定が必要になる',
                    '半二重は送受信を切り替える(ハブ等)。全二重は同時送受信可能(スイッチ等)。',
                    '半二重は同時送受信可能。全二重は送受信を切り替える。'
                ]
            },
            // コマンド
            commands: {
                triggers: ['コマンド', 'route print', 'ping', 'traceroute', 'ipconfig', 'nslookup', 'netstat'],
                pool: [
                    'route print', 'ipconfig /all', 'netstat -an', 'arp -a',
                    'nslookup', 'tracert', 'ping', 'pathping'
                ]
            },
            // 階層設計
            hierarchy: {
                triggers: ['アクセス層', 'ディストリビューション層', 'コア層', 'サーバファーム', '階層設計'],
                pool: [
                    'アクセス層', 'ディストリビューション層', 'コア層', 'サーバファーム層',
                    'エッジ層', 'アグリゲーション層', 'バックボーン層'
                ]
            },
            // CSMA/CD・CSMA/CA
            accessControl: {
                triggers: ['csma/cd', 'csma/ca', '衝突検出', '衝突回避', 'アクセス制御'],
                pool: [
                    'CSMA/CD', 'CSMA/CA', 'CSMA/CA with RTS/CTS',
                    'トークンパッシング', 'ポーリング', 'TDMA',
                    'イーサネットで用いられるアクセス制御方式（搬送波感知多重アクセス/衝突検出）。',
                    '無線LANで用いられる「搬送波感知多重アクセス/衝突回避」方式。'
                ]
            },
            // 3ウェイハンドシェイク
            handshake: {
                triggers: ['3ウェイ', 'ハンドシェイク', 'syn', 'ack', '接続確立'],
                pool: [
                    '3ウェイハンドシェイク (SYN -> SYN+ACK -> ACK)',
                    '2ウェイハンドシェイク (SYN -> ACK)',
                    '4ウェイハンドシェイク (SYN -> SYN+ACK -> ACK -> FIN)',
                    'SYN送信 → SYN+ACK受信 → ACK送信 で接続を確立する。',
                    'ACK送信 → SYN受信 → SYN+ACK送信 で接続を確立する。'
                ]
            },
            // 光ファイバ
            fiber: {
                triggers: ['光ファイバ', 'コア', 'クラッド', '被覆', 'シングルモード', 'マルチモード'],
                pool: [
                    '中心から順に、コア、クラッド、被覆。',
                    '中心から順に、クラッド、コア、被覆。',
                    '中心から順に、被覆、コア、クラッド。',
                    '中心から順に、コア、被覆、クラッド。'
                ]
            }
        };

        // ステップ1: 問題文・回答文からマッチするカテゴリを見つける
        const matchedPools = [];
        for (const key in distractorDB) {
            const cat = distractorDB[key];
            const hit = cat.triggers.some(t => q.includes(t) || aLow.includes(t));
            if (hit) matchedPools.push(cat.pool);
        }

        // ステップ2: マッチしたプールから、正解と違う回答を収集
        const candidates = new Set();
        matchedPools.forEach(pool => {
            pool.forEach(item => {
                if (item.toLowerCase() !== aLow && item !== a) candidates.add(item);
            });
        });

        // ステップ3: 同じフォルダ内の他カードの回答もフォールバック候補に
        const folderCards = this.state.cards.filter(c => c.id !== card.id && c.folder === card.folder);
        const otherCards = this.state.cards.filter(c => c.id !== card.id && c.folder !== card.folder);

        // ステップ4: candidatesから最適なものを選択
        const candidateArr = Array.from(candidates);
        // シャッフル
        for (let i = candidateArr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [candidateArr[i], candidateArr[j]] = [candidateArr[j], candidateArr[i]];
        }
        candidateArr.forEach(c => { if (result.length < count) result.push(c); });

        // ステップ5: まだ足りなければ同フォルダ→他フォルダの回答を追加
        if (result.length < count) {
            const usedSet = new Set(result.map(r => r.toLowerCase()));
            usedSet.add(aLow);
            const fallback = [...folderCards, ...otherCards];
            for (let i = fallback.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [fallback[i], fallback[j]] = [fallback[j], fallback[i]];
            }
            for (const c of fallback) {
                if (result.length >= count) break;
                if (!usedSet.has(c.answer.toLowerCase())) {
                    usedSet.add(c.answer.toLowerCase());
                    result.push(c.answer);
                }
            }
        }

        return result.slice(0, count);
    };

    Base.prototype.handleQuizAnswer = function (isCorrect, btnEl, correct) {
        if (this.state.quizAnswered) return;
        this.state.quizAnswered = true;
        document.querySelectorAll('.quiz-choice-btn').forEach(b => {
            b.disabled = true;
            if (b.textContent === correct.answer) b.classList.add('show-correct');
        });
        if (isCorrect) { btnEl.classList.add('selected-correct'); this.state.quizScore++; }
        else { btnEl.classList.add('selected-wrong'); this.state.quizWrong.push(correct); }
        this.calculateNextReview(this.state.cards.find(c => c.id === correct.id), isCorrect ? 4 : 1);
        this.showQuizFeedback(isCorrect, correct);
    };

    Base.prototype.submitTypingAnswer = function () {
        if (this.state.quizAnswered) return;
        const inp = document.getElementById('quiz-input');
        const q = this.state.quizQueue[this.state.quizIndex];
        if (!inp || !q) return;
        this.state.quizAnswered = true;
        const userAns = inp.value.trim();
        const correctAns = q.answer.trim();
        const isCorrect = userAns.toLowerCase() === correctAns.toLowerCase() ||
            correctAns.toLowerCase().includes(userAns.toLowerCase()) && userAns.length > correctAns.length * 0.5;
        if (isCorrect) this.state.quizScore++; else this.state.quizWrong.push(q);
        this.calculateNextReview(this.state.cards.find(c => c.id === q.id), isCorrect ? 4 : 1);
        this.showQuizFeedback(isCorrect, q, userAns);
    };

    Base.prototype.showQuizFeedback = function (isCorrect, card, userAns) {
        const fb = document.getElementById('quiz-feedback');
        if (!fb) return;
        fb.classList.remove('hidden');
        document.getElementById('quiz-feedback-icon').textContent = isCorrect ? '✅' : '❌';
        let txt = isCorrect ? '正解！' : '不正解...';
        if (!isCorrect && userAns) txt += `\nあなたの回答: ${userAns}`;
        if (!isCorrect) txt += `\n正解: ${card.answer}`;
        document.getElementById('quiz-feedback-text').textContent = txt;
        const expEl = document.getElementById('quiz-explanation-text');
        if (card.explanation && expEl) { expEl.textContent = card.explanation; expEl.style.display = 'block'; }
        else if (expEl) { expEl.style.display = 'none'; }
        document.getElementById('quiz-score').textContent = this.state.quizScore;
        // スマホで回答後に自動スクロール → フィードバック＆「次へ」ボタンが見える
        setTimeout(() => fb.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    };

    Base.prototype.nextQuizQuestion = function () {
        this.state.quizIndex++;
        if (this.state.quizIndex >= this.state.quizQueue.length) this.showQuizResult();
        else this.renderQuizQuestion();
    };

    Base.prototype.showQuizResult = function () {
        if (this.state.quizTimerInterval) { clearInterval(this.state.quizTimerInterval); this.state.quizTimerInterval = null; }
        document.getElementById('quiz-active')?.classList.add('hidden');
        const r = document.getElementById('quiz-result');
        if (r) r.classList.remove('hidden');
        const total = this.state.quizQueue.length;
        const score = this.state.quizScore;
        const pct = Math.round((score / total) * 100);
        document.getElementById('result-icon').textContent = pct >= 80 ? '🏆' : pct >= 50 ? '👍' : '📚';
        document.getElementById('result-title').textContent = pct >= 80 ? '素晴らしい！' : pct >= 50 ? 'もう少し！' : '頑張ろう！';
        document.getElementById('result-score-display').textContent = `${score}/${total} (${pct}%)`;
        document.getElementById('result-message').textContent = `所要時間: ${Math.floor(this.state.quizSeconds / 60)}分${this.state.quizSeconds % 60}秒`;
        const wrongList = document.getElementById('result-wrong-list');
        if (wrongList) {
            wrongList.innerHTML = this.state.quizWrong.map(c => `<div class="wrong-item"><div class="q">Q: ${this.escHtml(c.question)}</div><div class="a">A: ${this.escHtml(c.answer)}</div></div>`).join('');
        }
        const reviewBtn = document.getElementById('btn-review-wrong');
        if (reviewBtn) reviewBtn.classList.toggle('hidden', this.state.quizWrong.length < 1);
        if (pct >= 80) this.confetti();
        localStorage.removeItem('neuronq_quiz_save');
        this.markStudied();
    };

    // === EDIT MODE ===
    Base.prototype.renderEditFolders = function () {
        this.populateFolderSelect('edit-folder-select', this.state.editFolder);
        const dl = document.getElementById('folder-datalist');
        if (dl) { dl.innerHTML = ''; this.getFolders().forEach(f => { const o = document.createElement('option'); o.value = f; dl.appendChild(o); }); }
    };

    Base.prototype.handleEditFolderChange = function (val) { this.state.editFolder = val; this.renderEditList(); };

    Base.prototype.renderEditList = function () {
        const container = document.getElementById('card-list');
        if (!container) return;
        let cards = this.state.editFolder === 'All' ? [...this.state.cards] : this.state.cards.filter(c => c.folder === this.state.editFolder);
        const q = (document.getElementById('search-input')?.value || '').toLowerCase();
        if (q) cards = cards.filter(c => (c.question + c.answer + (c.folder || '') + (c.tags || []).join('')).toLowerCase().includes(q));
        document.getElementById('edit-count').textContent = cards.length;
        container.innerHTML = cards.map(c => `
    <div class="card-list-item">
      <input type="checkbox" ${this.state.selectedCards.has(c.id) ? 'checked' : ''} onchange="app.toggleSelect('${c.id}',this.checked)">
      <div class="card-list-info">
        <div class="card-list-q">${this.escHtml(c.question)}</div>
        <div class="card-list-a">${this.escHtml(c.answer)}</div>
        <div class="card-list-meta">${c.folder ? `<span class="card-folder-tag">${this.escHtml(c.folder)}</span>` : ''}</div>
      </div>
      <div class="card-list-actions">
        <button class="icon-btn-sm" onclick="app.openModal('edit','${c.id}')" title="編集"><i data-lucide="pencil"></i></button>
        <button class="icon-btn-sm" onclick="app.duplicateCard('${c.id}')" title="複製"><i data-lucide="copy"></i></button>
        <button class="icon-btn-sm danger" onclick="app.deleteCard('${c.id}')" title="削除"><i data-lucide="trash-2"></i></button>
      </div>
    </div>`).join('');
        lucide.createIcons();
        this.updateBulkBar();
    };

    Base.prototype.toggleSelect = function (id, checked) {
        if (checked) this.state.selectedCards.add(id); else this.state.selectedCards.delete(id);
        this.updateBulkBar();
    };
    Base.prototype.updateBulkBar = function () {
        const bar = document.getElementById('bulk-bar');
        const count = this.state.selectedCards.size;
        if (bar) { bar.classList.toggle('hidden', count === 0); }
        document.getElementById('bulk-count').textContent = count;
        const sel = document.getElementById('bulk-folder-target');
        if (sel) { sel.innerHTML = ''; this.getFolders().forEach(f => { const o = document.createElement('option'); o.value = f; o.textContent = f; sel.appendChild(o); }); }
    };
    Base.prototype.moveSelected = function () {
        const dest = document.getElementById('bulk-folder-target')?.value;
        if (!dest) return;
        this.state.cards.forEach(c => { if (this.state.selectedCards.has(c.id)) c.folder = dest; });
        this.state.selectedCards.clear(); this.saveData(); this.renderEditList();
        this.showToast('移動しました');
    };
    Base.prototype.deleteSelected = function () {
        if (!confirm(`${this.state.selectedCards.size}件を削除しますか？`)) return;
        this.state.cards = this.state.cards.filter(c => !this.state.selectedCards.has(c.id));
        this.state.selectedCards.clear(); this.saveData(); this.renderEditList();
        this.showToast('削除しました');
    };

    // === MODAL ===
    Base.prototype.openModal = function (mode, id) {
        this.state.editingId = id || null;
        const modal = document.getElementById('card-modal');
        if (!modal) return;
        modal.classList.remove('hidden');
        document.getElementById('modal-title').textContent = mode === 'add' ? 'カードを追加' : 'カードを編集';
        document.getElementById('btn-submit').textContent = mode === 'add' ? '追加' : '更新';
        if (mode === 'edit' && id) {
            const c = this.state.cards.find(x => x.id === id);
            if (c) {
                document.getElementById('input-question').value = c.question || '';
                document.getElementById('input-answer').value = c.answer || '';
                document.getElementById('input-explanation').value = c.explanation || '';
                document.getElementById('input-folder').value = c.folder || '';
                document.getElementById('input-tags').value = (c.tags || []).join(', ');
            }
        } else { document.getElementById('card-form').reset(); }
        this.renderEditFolders();
    };
    Base.prototype.closeModal = function () { document.getElementById('card-modal')?.classList.add('hidden'); };

    Base.prototype.handleFormSubmit = function (e) {
        e.preventDefault();
        const q = document.getElementById('input-question').value.trim();
        const a = document.getElementById('input-answer').value.trim();
        const exp = document.getElementById('input-explanation').value.trim();
        const folder = document.getElementById('input-folder').value.trim() || 'メイン';
        const tags = document.getElementById('input-tags').value.split(',').map(t => t.trim()).filter(Boolean);
        const imageFile = document.getElementById('input-image').files[0];

        const save = (imgData) => {
            if (this.state.editingId) {
                const c = this.state.cards.find(x => x.id === this.state.editingId);
                if (c) { c.question = q; c.answer = a; c.explanation = exp; c.folder = folder; c.tags = tags; if (imgData) c.image = imgData; }
            } else {
                this.state.cards.push({ id: this.uid(), question: q, answer: a, explanation: exp, folder, tags, image: imgData || null, mastery: 0, interval: 1, easeFactor: 2.5, nextReview: null, reviewCount: 0, correctCount: 0, lastReviewed: null, created: new Date().toISOString() });
            }
            this.saveData(); this.closeModal(); this.renderEditList(); this.updateShuffleOrder();
            this.showToast(this.state.editingId ? '更新しました' : '追加しました');
        };
        if (imageFile) {
            const reader = new FileReader();
            reader.onload = e => { this.resizeImg(e.target.result).then(save); };
            reader.readAsDataURL(imageFile);
        } else { save(null); }
    };

    Base.prototype.resizeImg = function (dataUrl) {
        return new Promise(resolve => {
            const img = new Image(); img.onload = () => {
                const maxW = 600; let w = img.width, h = img.height;
                if (w > maxW) { h = h * (maxW / w); w = maxW; }
                const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
                cv.getContext('2d').drawImage(img, 0, 0, w, h);
                resolve(cv.toDataURL('image/jpeg', 0.7));
            }; img.src = dataUrl;
        });
    };

    Base.prototype.deleteCard = function (id) {
        if (!confirm('このカードを削除しますか？')) return;
        this.state.cards = this.state.cards.filter(c => c.id !== id);
        this.saveData(); this.renderEditList(); this.showToast('削除しました');
    };
    Base.prototype.duplicateCard = function (id) {
        const c = this.state.cards.find(x => x.id === id);
        if (!c) return;
        this.state.cards.push({ ...c, id: this.uid(), mastery: 0, interval: 1, reviewCount: 0, correctCount: 0, nextReview: null, lastReviewed: null, created: new Date().toISOString() });
        this.saveData(); this.renderEditList(); this.showToast('複製しました');
    };

    // === FOLDER MANAGEMENT ===
    Base.prototype.createFolder = function () {
        const name = prompt('新しいフォルダ名:');
        if (!name || !name.trim()) return;
        if (!this.state.cards.some(c => c.folder === name.trim())) {
            this.state.cards.push({ id: this.uid(), question: '(新規)', answer: '(編集してください)', folder: name.trim(), tags: [], mastery: 0, interval: 1, easeFactor: 2.5, nextReview: null, reviewCount: 0, correctCount: 0, lastReviewed: null, created: new Date().toISOString() });
            this.saveData();
        }
        this.state.editFolder = name.trim();
        this.renderEditFolders(); this.renderEditList();
        this.showToast('フォルダを作成しました');
    };
    Base.prototype.renameFolder = function () {
        if (this.state.editFolder === 'All') return;
        const newName = prompt('新しい名前:', this.state.editFolder);
        if (!newName || !newName.trim()) return;
        this.state.cards.forEach(c => { if (c.folder === this.state.editFolder) c.folder = newName.trim(); });
        this.state.editFolder = newName.trim();
        this.saveData(); this.renderEditFolders(); this.renderEditList();
        this.showToast('名前を変更しました');
    };
    Base.prototype.toggleFolderLock = function () {
        if (this.state.editFolder === 'All') return;
        if (this.state.lockedFolders.has(this.state.editFolder)) this.state.lockedFolders.delete(this.state.editFolder);
        else this.state.lockedFolders.add(this.state.editFolder);
        this.saveData();
        this.showToast(this.state.lockedFolders.has(this.state.editFolder) ? 'ロックしました' : 'ロック解除しました');
    };
    Base.prototype.deleteFolder = function () {
        if (this.state.editFolder === 'All') return;
        if (!confirm(`フォルダ「${this.state.editFolder}」を削除しますか？中のカードも全て削除されます。`)) return;
        this.state.cards = this.state.cards.filter(c => c.folder !== this.state.editFolder);
        this.state.editFolder = 'All';
        this.saveData(); this.renderEditFolders(); this.renderEditList();
        this.showToast('フォルダを削除しました');
    };

    // === IMPORT / EXPORT ===
    Base.prototype.exportJSON = function () {
        const data = JSON.stringify(this.state.cards, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = 'neuronq_backup_' + new Date().toISOString().split('T')[0] + '.json'; a.click();
        this.showToast('バックアップを保存しました');
    };
    Base.prototype.importJSON = function (input) {
        const file = input.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            try {
                const data = JSON.parse(e.target.result);
                if (!Array.isArray(data)) throw new Error('invalid');
                this.state.cards = data.map(c => ({ ...c, id: c.id || this.uid() }));
                this.saveData(); this.updateShuffleOrder(); this.render();
                this.showToast(`${data.length}件のカードを復元しました`);
            } catch (e) { this.showToast('ファイルの読み込みに失敗しました'); }
        };
        reader.readAsText(file); input.value = '';
    };
    Base.prototype.exportCSV = function () {
        let csv = '\uFEFFquestion,answer,explanation,folder,tags\n';
        this.state.cards.forEach(c => {
            csv += `"${(c.question || '').replace(/"/g, '""')}","${(c.answer || '').replace(/"/g, '""')}","${(c.explanation || '').replace(/"/g, '""')}","${c.folder || ''}","${(c.tags || []).join(';')}"\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = 'neuronq_' + new Date().toISOString().split('T')[0] + '.csv'; a.click();
    };
    Base.prototype.importCSV = function (input) {
        const file = input.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            const lines = e.target.result.split('\n').filter(l => l.trim());
            let count = 0;
            for (let i = 1; i < lines.length; i++) {
                const cols = this.parseCSVRow(lines[i]);
                if (cols.length >= 2) {
                    this.state.cards.push({ id: this.uid(), question: cols[0], answer: cols[1], explanation: cols[2] || '', folder: cols[3] || 'メイン', tags: (cols[4] || '').split(';').filter(Boolean), image: null, mastery: 0, interval: 1, easeFactor: 2.5, nextReview: null, reviewCount: 0, correctCount: 0, lastReviewed: null, created: new Date().toISOString() });
                    count++;
                }
            }
            this.saveData(); this.updateShuffleOrder(); this.render();
            this.showToast(`${count}件を追加しました`);
        };
        reader.readAsText(file); input.value = '';
    };
    Base.prototype.parseCSVRow = function (text) {
        const result = []; let cur = ''; let inQ = false;
        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            if (inQ) { if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') { inQ = false; } else { cur += ch; } }
            else { if (ch === '"') { inQ = true; } else if (ch === ',') { result.push(cur); cur = ''; } else { cur += ch; } }
        }
        result.push(cur); return result;
    };

    // === STATS ===
    Base.prototype.renderStats = function () {
        const cards = this.state.cards;
        const mastered = cards.filter(c => (c.mastery || 0) >= 4).length;
        const now = new Date();
        const due = cards.filter(c => !c.nextReview || new Date(c.nextReview) <= now).length;
        document.getElementById('stat-total').textContent = cards.length;
        document.getElementById('stat-mastered').textContent = mastered;
        document.getElementById('stat-due').textContent = due;
        document.getElementById('stat-streak').textContent = this.state.streak;
        this.renderDonut(mastered, cards.length);
        this.renderHeatmap();
        this.renderFolderChart();
    };

    Base.prototype.renderDonut = function (mastered, total) {
        const container = document.getElementById('donut-chart');
        if (!container) return;
        const pct = total > 0 ? Math.round((mastered / total) * 100) : 0;
        const rem = total - mastered;
        container.innerHTML = `<svg viewBox="0 0 36 36" style="width:100%;height:100%">
    <circle cx="18" cy="18" r="15.91" fill="none" stroke="var(--bg-secondary)" stroke-width="3"/>
    <circle cx="18" cy="18" r="15.91" fill="none" stroke="var(--success)" stroke-width="3"
      stroke-dasharray="${pct},${100 - pct}" stroke-dashoffset="25" stroke-linecap="round"/>
    <text x="18" y="20" text-anchor="middle" font-size="6" font-weight="800" fill="var(--text)">${pct}%</text>
  </svg>`;
        const legend = document.getElementById('donut-legend');
        if (legend) legend.innerHTML = `<span><span class="legend-dot" style="background:var(--success)"></span>習得: ${mastered}</span><span><span class="legend-dot" style="background:var(--danger)"></span>未習得: ${rem}</span>`;
    };

    Base.prototype.renderHeatmap = function () {
        const container = document.getElementById('heatmap');
        if (!container) return;
        container.innerHTML = '';
        const today = new Date();
        for (let i = 89; i >= 0; i--) {
            const d = new Date(today); d.setDate(d.getDate() - i);
            const key = d.toISOString().split('T')[0];
            const count = this.state.studyLog[key] || 0;
            const cell = document.createElement('div');
            cell.className = 'heatmap-cell';
            if (count >= 20) cell.classList.add('l4');
            else if (count >= 10) cell.classList.add('l3');
            else if (count >= 5) cell.classList.add('l2');
            else if (count >= 1) cell.classList.add('l1');
            cell.title = `${key}: ${count}回`;
            container.appendChild(cell);
        }
    };

    Base.prototype.renderFolderChart = function () {
        const container = document.getElementById('folder-chart');
        if (!container) return;
        const folders = {};
        this.state.cards.forEach(c => { const f = c.folder || '未分類'; folders[f] = (folders[f] || 0) + 1; });
        const max = Math.max(...Object.values(folders), 1);
        container.innerHTML = Object.entries(folders).sort((a, b) => b[1] - a[1]).map(([name, count]) => `
    <div class="folder-bar-item">
      <span class="folder-bar-name">${this.escHtml(name)}</span>
      <div class="folder-bar-track"><div class="folder-bar-fill" style="width:${(count / max) * 100}%"></div></div>
      <span class="folder-bar-count">${count}</span>
    </div>`).join('');
    };

    // === UTILITY ===
    Base.prototype.escHtml = function (s) {
        if (!s) return '';
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    };

})();

// === INITIALIZE ===
const app = new window.AppCore();
document.addEventListener('DOMContentLoaded', () => app.init());
