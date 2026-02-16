window.initialData = [
    // --- ネットワークの分類 ---
    { id: '1', folder: 'セキュア', question: 'PAN (Personal Area Network) とは？', answer: '半径10m程度の個人の範囲のネットワーク（Bluetoothなど）。' },
    { id: '2', folder: 'セキュア', question: 'LAN (Local Area Network) とは？', answer: '家庭内、ビル内など個人、企業の敷地内で構築するネットワーク。' },
    { id: '3', folder: 'セキュア', question: 'CAN (Campus Area Network) とは？', answer: '大学や工場など、広い敷地内の複数の建物のLANを相互接続したネットワーク。' },
    { id: '4', folder: 'セキュア', question: 'WAN (Wide Area Network) とは？', answer: '地理的に離れた場所にあるLANなどを相互接続したネットワーク（通信事業者の網やインターネットを利用）。' },
    { id: '5', folder: 'セキュア', question: 'MAN (Metropolitan Area Network) とは？', answer: '都市圏や市街地など、特定の地域をカバーするネットワーク。' },
    { id: '6', folder: 'セキュア', question: 'インターネット (Internet) とは？', answer: '世界中のネットワークをTCP/IPで相互接続した、世界規模のネットワーク。' },
    { id: '7', folder: 'セキュア', question: 'イントラネット (Intranet) とは？', answer: 'インターネット標準技術（TCP/IPなど）を用いて構築された、企業内などの限定されたネットワーク。' },
    { id: '8', folder: 'セキュア', question: 'エクストラネット (Extranet) とは？', answer: '複数のイントラネットを相互接続したネットワーク（企業間の電子商取引などで利用）。' },

    // --- OSI参照モデル ---
    { id: '9', folder: 'セキュア', question: 'OSI参照モデルのレイヤ7（アプリケーション層）の役割は？', answer: 'アプリケーションプログラムにネットワークサービスを提供すること。' },
    { id: '10', folder: 'セキュア', question: 'OSI参照モデルのレイヤ6（プレゼンテーション層）の役割は？', answer: '文字コード、圧縮、暗号化など、データの表現形式に関わる機能を提供すること。' },
    { id: '11', folder: 'セキュア', question: 'OSI参照モデルのレイヤ5（セッション層）の役割は？', answer: 'アプリケーション間のセッション（通信の開始から終了まで）の確立・維持・終了を行うこと。' },
    { id: '12', folder: 'セキュア', question: 'OSI参照モデルのレイヤ4（トランスポート層）の役割は？', answer: 'データの分割（セグメント化）、コネクションの確立、フロー制御、再送制御などを行うこと。' },
    { id: '13', folder: 'セキュア', question: 'OSI参照モデルのレイヤ3（ネットワーク層）の役割は？', answer: 'IPアドレスなどの論理アドレスに基づき、エンドツーエンドのルーティング（経路制御）を行うこと。' },
    { id: '14', folder: 'セキュア', question: 'OSI参照モデルのレイヤ2（データリンク層）の役割は？', answer: '直接接続された機器間でのフレームの送受信、エラー検出、MACアドレスによる制御などを行うこと。' },
    { id: '15', folder: 'セキュア', question: 'OSI参照モデルのレイヤ1（物理層）の役割は？', answer: 'ケーブルの形状や電圧レベルなど、電気的・機械的な手順や仕様を決定すること。' },
    { id: '16', folder: 'セキュア', question: 'カプセル化（Encapsulation）とは？', answer: '送信データに上位層から順にヘッダを付加していく処理のこと。' },
    { id: '17', folder: 'セキュア', question: 'TCP/IPにおけるトランスポート層のPDUは？', answer: 'TCPセグメント または UDPデータグラム' },
    { id: '18', folder: 'セキュア', question: 'TCP/IPにおけるインターネット層のPDUは？', answer: 'IPデータグラム' },
    { id: '19', folder: 'セキュア', question: 'TCP/IPにおけるリンク層のPDUは？', answer: 'フレーム' },

    // --- 通信方式・Ethernet ---
    { id: '20', folder: 'セキュア', question: 'ユニキャスト (Unicast) とは？', answer: '1対1の通信方式。' },
    { id: '21', folder: 'セキュア', question: 'ブロードキャスト (Broadcast) とは？', answer: '1対多（ネットワーク内の全員）への通信方式。' },
    { id: '22', folder: 'セキュア', question: 'マルチキャスト (Multicast) とは？', answer: '1対多（特定のグループ）への通信方式。' },
    { id: '23', folder: 'セキュア', question: 'ラウンドトリップタイム (RTT) とは？', answer: 'パケットを送信してから、その応答が返ってくるまでにかかる時間。' },
    { id: '24', folder: 'セキュア', question: 'イーサネット、ファストイーサネット、ギガビットイーサネットの通信速度は？', answer: 'それぞれ 10Mbps, 100Mbps, 1Gbps。' },
    { id: '25', folder: 'セキュア', question: '100BASE-TX の「BASE」は何を表す？', answer: 'ベースバンド伝送（デジタル信号を変調せずにそのまま送信する方式）。' },
    { id: '26', folder: 'セキュア', question: '100BASE-TX の「T」は何を表す？', answer: 'ツイストペアケーブルを使用すること。' },
    { id: '27', folder: 'セキュア', question: 'MACアドレスの長さは何ビット（何バイト）？', answer: '48ビット（6バイト）。' },
    { id: '28', folder: 'セキュア', question: 'MACアドレスの上位24ビット（3バイト）は何を表す？', answer: 'OUI（ベンダーID）。製造メーカーを識別する。' },
    { id: '29', folder: 'セキュア', question: 'ブロードキャスト用MACアドレスは？', answer: 'FF-FF-FF-FF-FF-FF' },

    // --- ケーブル ---
    { id: '30', folder: 'セキュア', question: 'UTPケーブルとSTPケーブルの違いは？', answer: 'UTPはシールドなし、STPはシールドあり（ノイズに強い）。' },
    { id: '31', folder: 'セキュア', question: 'ツイストペアケーブルの規格上の最大長は？', answer: '100メートル。' },
    { id: '32', folder: 'セキュア', question: 'ストレートケーブルの結線特徴と用途は？', answer: '両端の配列が同じ。異なる階層の機器（PC⇔スイッチなど）の接続に使う。' },
    { id: '33', folder: 'セキュア', question: 'クロスケーブルの用途は？', answer: '同じ階層の機器（PC⇔PC、スイッチ⇔スイッチなど）の接続に使う（Auto MDI/MDI-X無しの場合）。' },
    { id: '34', folder: 'セキュア', question: '1000BASE-Tの通信方式の特徴（ピンの使用方法）は？', answer: '4対8芯すべての線を使用し、全二重通信を行う。' },

    // --- CSMA/CD ---
    { id: '35', folder: 'セキュア', question: 'CSMA/CD とは何の略？', answer: 'Carrier Sense Multiple Access with Collision Detection' },
    { id: '36', folder: 'セキュア', question: 'CSMA/CD の動作手順は？', answer: '①空き確認(CS) ②送信開始(MA) ③衝突検知(CD) ④衝突時は待機して再送。' },
    { id: '37', folder: 'セキュア', question: 'オートネゴシエーション設定の機器と固定設定（全二重）の機器を接続した場合の問題は？', answer: 'デュプレックスミスマッチが起き、半二重通信となり速度が低下する。' },

    // --- IPアドレス・サブネット ---
    { id: '38', folder: 'セキュア', question: 'IPアドレス クラスAの範囲は？', answer: '0.0.0.0 ～ 127.255.255.255' },
    { id: '39', folder: 'セキュア', question: 'IPアドレス クラスBの範囲は？', answer: '128.0.0.0 ～ 191.255.255.255' },
    { id: '40', folder: 'セキュア', question: 'IPアドレス クラスCの範囲は？', answer: '192.0.0.0 ～ 223.255.255.255' },
    { id: '41', folder: 'セキュア', question: 'ネットワークアドレスとは？', answer: 'IPアドレスのホスト部が全て「0」のアドレス。そのネットワーク自体を表す。' },
    { id: '42', folder: 'セキュア', question: 'ダイレクトブロードキャストアドレスとは？', answer: 'IPアドレスのホスト部が全て「1」のアドレス。' },
    { id: '43', folder: 'セキュア', question: 'ローカルブロードキャストアドレスとは？', answer: '255.255.255.255。自ネットワーク内の全ホスト宛て。' },
    { id: '44', folder: 'セキュア', question: 'ループバックアドレスは？', answer: '127.0.0.1 （自分自身を指す仮想アドレス）。' },
    { id: '45', folder: 'セキュア', question: 'リンクローカルアドレス（APIPA）の範囲は？', answer: '169.254.0.0 ～ 169.254.255.255' },
    { id: '46', folder: 'セキュア', question: 'プライベートIPアドレス（クラスC）の範囲は？', answer: '192.168.0.0 ～ 192.168.255.255' },
    { id: '47', folder: 'セキュア', question: 'サブネットマスクの役割は？', answer: 'IPアドレスのうち、どこまでがネットワーク部で、どこからがホスト部かを定義するもの。' },

    // --- ネットワーク機器とスイッチング ---
    { id: '48', folder: 'セキュア', question: 'コリジョンドメインとは？', answer: 'パケットの衝突（コリジョン）が発生する可能性のある範囲。リピータハブはこれを拡張してしまう。' },
    { id: '49', folder: 'セキュア', question: 'マイクロセグメンテーションとは？', answer: 'スイッチ等により、ポートごとにコリジョンドメインを分割すること（衝突を減らす技術）。' },
    { id: '50', folder: 'セキュア', question: 'レイヤ2スイッチの「ラーニング（学習）」機能とは？', answer: '受信したフレームの送信元MACアドレスをMACアドレステーブルに登録すること。' },
    { id: '51', folder: 'セキュア', question: 'レイヤ2スイッチの「フォワーディング」とは？', answer: 'MACアドレステーブルに基づき、宛先MACアドレスが存在するポートにのみフレームを転送すること。' },
    { id: '52', folder: 'セキュア', question: 'レイヤ2スイッチの「フラッディング」とは？', answer: '宛先MAC不明時やブロードキャスト時に、受信ポート以外の全ポートへ転送すること。' },
    { id: '53', folder: 'セキュア', question: 'ストアアンドフォワード方式の特徴は？', answer: 'フレーム全体を受信しエラーチェックを行ってから転送する。確実だが遅延がある。' },
    { id: '54', folder: 'セキュア', question: 'VLAN (Virtual LAN) の目的は？', answer: '物理構成に関わらず、論理的にネットワーク（ブロードキャストドメイン）を分割すること。' },
    { id: '55', folder: 'セキュア', question: 'ブロードキャストドメインとは？', answer: 'ブロードキャストパケットが届く範囲。ルータで分割される。' },
    { id: '56', folder: 'セキュア', question: 'ルータはブロードキャストパケットを中継するか？', answer: '中継しない（これによりブロードキャストドメインが分割される）。' },

    // --- プロトコル / TCP/IP詳細 ---
    { id: '57', folder: 'セキュア', question: 'TCPとUDPの違いは？', answer: 'TCPはコネクション型で信頼性重視（3ウェイハンドシェイクあり）。UDPはコネクションレスで速度・リアルタイム性重視。' },
    { id: '58', folder: 'セキュア', question: 'IPヘッダにある TTL (Time To Live) の役割は？', answer: 'ループ防止のため、ルータ通過ごとに値を減らし、0になったらパケットを破棄する仕組み。' },
    { id: '59', folder: 'セキュア', question: 'ARPの役割と通信方式は？', answer: 'IPアドレスからMACアドレスを知るためのプロトコル。要求はブロードキャストで行われる。' },
    { id: '60', folder: 'セキュア', question: 'pingコマンドで使用されるプロトコルは？', answer: 'ICMP (Echo Request/Reply)。' },
    { id: '61', folder: 'セキュア', question: 'HTTP / DNS / SMTP のポート番号は？', answer: 'HTTP:80, DNS:53, SMTP:25' },
    { id: '62', folder: 'セキュア', question: 'TCPの3ウェイハンドシェイクの手順は？', answer: 'SYN送信 → SYN+ACK受信 → ACK送信 で接続を確立する。' },
    { id: '63', folder: 'セキュア', question: 'DHCPの役割は？', answer: 'IPアドレス等を自動的に割り当てる機能。' },

    // --- セキュリティ ---
    { id: '64', folder: 'セキュア', question: 'ファイアウォールのパケットフィルタリングとは？', answer: 'IPアドレスやポート番号を見て通過・遮断を判断する機能。' },
    { id: '65', folder: 'セキュア', question: 'IDS (侵入検知) と IPS (侵入防御) の違いは？', answer: 'IDSは検知・通知のみ。IPSは検知して通信遮断などの防御も行う。' },
    { id: '66', folder: 'セキュア', question: '共通鍵暗号方式とは？', answer: '暗号化と復号に同じ鍵を使う方式。高速だが鍵の配送が課題。' },
    { id: '67', folder: 'セキュア', question: '公開鍵暗号方式とは？', answer: '公開鍵と秘密鍵のペアを使う方式。鍵配送は容易だが処理が遅い。' },
    { id: '68', folder: 'セキュア', question: '公開鍵暗号で、相手に送る暗号文を作るのに使う鍵は？', answer: '受信者（相手）の「公開鍵」。' }
];

console.log(`Loaded ${window.initialData.length} questions from script.`);
