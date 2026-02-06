import Foundation

// MARK: - Localized Strings (Extension on LanguageManager)
// All UI strings organized by screen. Views access via `lang.xxx`.

extension LanguageManager {

    // MARK: - Common
    var back: String { jp ? "戻る" : "Back" }
    var continueText: String { jp ? "続ける" : "Continue" }
    var cancel: String { jp ? "キャンセル" : "Cancel" }
    var done: String { jp ? "完了" : "Done" }
    var ok: String { "OK" }
    var error: String { jp ? "エラー" : "Error" }
    var retry: String { jp ? "再試行" : "Retry" }
    var save: String { jp ? "保存" : "Save" }
    var loading: String { jp ? "読み込み中..." : "Loading..." }
    var saved: String { jp ? "保存済み" : "Saved" }
    var sending: String { jp ? "送信中..." : "Sending..." }

    // MARK: - Tabs
    var tabStart: String { jp ? "スタート" : "Start" }
    var tabProfile: String { jp ? "プロフィール" : "Profile" }
    var tabSettings: String { jp ? "設定" : "Settings" }

    // MARK: - Start Screen
    var chooseYourStyle: String { jp ? "スタイルを選ぼう" : "Choose Your Style" }
    var selectThemeSubtitle: String { jp ? "テーマを選んで撮影スタート" : "Select a theme to start your photobooth session" }
    var insufficientCredits: String { jp ? "クレジット不足" : "Insufficient Credits" }
    var insufficientCreditsMessage: String { jp ? "1プレイ1クレジット必要です。プロフィールタブでクレジットを獲得しよう！" : "You need at least 1 credit to start a photo session. Check the Profile tab to earn more credits!" }
    var getCredits: String { jp ? "クレジットを獲得" : "Get Credits" }

    // MARK: - Theme Descriptions (displayName stays English always)
    func themeDescription(_ style: PhotoStyle) -> String {
        switch style {
        case .nyVintage: return jp ? "白黒ビンテージ" : "Classic B&W"
        case .seoulStudio: return jp ? "韓国スタジオ" : "Natural Glow"
        case .jpKawaii: return jp ? "爆盛れカワイイ" : "Magical Beauty"
        }
    }

    // MARK: - Style Selection
    var selectMode: String { jp ? "モード選択" : "Select Mode" }
    var choosePhotobooth: String { jp ? "フォトブースを選ぼう" : "Choose your photo booth" }
    var style: String { jp ? "スタイル" : "Style" }

    // MARK: - Interval Selection
    var setup: String { jp ? "セットアップ" : "Setup" }
    var setPhotoInterval: String { jp ? "カウントダウンを設定" : "Set Photo Interval" }
    var chooseSecondsBetween: String { jp ? "カウントダウンの秒数を選ぼう" : "Choose seconds between each photo" }
    var sec: String { jp ? "秒" : "sec" }
    var intervalDescription: String { jp ? "各写真を撮影する前にこの秒数だけ準備期間があるよ" : "You'll have this many seconds to prepare between each of your 4 photos" }

    // MARK: - Camera Screen
    var cancelSession: String { jp ? "撮影をキャンセルしますか？" : "Cancel Session?" }
    var continueSession: String { jp ? "撮影を続ける" : "Continue Session" }
    var photosWillBeLost: String { jp ? "写真が失われます。キャンセルしますか？" : "Your photos will be lost. Are you sure you want to cancel?" }
    func shotOf(_ current: Int, _ total: Int) -> String { jp ? "ショット \(current) / \(total)" : "Shot \(current) of \(total)" }
    func photoOf(_ current: Int, _ total: Int) -> String { jp ? "写真 \(current) / \(total)" : "Photo \(current) of \(total)" }
    var reviewYourPhoto: String { jp ? "写真を確認" : "Review your photo" }
    var retake: String { jp ? "撮り直す" : "Retake" }
    var finish: String { jp ? "完了" : "Finish" }
    var useRealDevice: String { jp ? "カメラ機能はデバイスでテストしてね" : "Use a real device to test camera features" }

    // MARK: - Photo Review
    var reviewPhotos: String { jp ? "写真を確認" : "Review Photos" }
    var tapOneToRetake: String { jp ? "タップして撮り直し" : "Tap one photo to retake" }
    var usedYourRetake: String { jp ? "撮り直し済み" : "You've used your retake" }
    var retakeAllPhotos: String { jp ? "全部撮り直す" : "Retake All Photos" }
    var retakePhoto: String { jp ? "撮り直す？" : "Retake Photo?" }
    func retakePhotoMessage(_ index: Int) -> String { jp ? "写真#\(index)を撮り直しますか？撮り直しは1回だけです。" : "Do you want to retake photo #\(index)? You can only retake once." }
    var review: String { jp ? "確認" : "Review" }
    var tapToRetake: String { jp ? "タップして撮り直す" : "Tap to retake" }

    // MARK: - Processing
    func applyingStyle(_ name: String) -> String { jp ? "\(name) スタイルを適用中" : "Applying \(name) Style" }
    var killTimeWithGame: String { jp ? "ミニゲームで暇つぶししない？" : "Kill time with a quick game?" }
    var processingError: String { jp ? "処理エラー" : "Processing Error" }
    var processingErrorMessage: String { jp ? "写真の処理中にエラーが発生しました。" : "An error occurred while processing your photos." }
    var skipOriginalPhotos: String { jp ? "スキップ（元の写真を使用）" : "Skip (Use Original Photos)" }

    // MARK: - Customization
    var customize: String { jp ? "カスタマイズ" : "Customize" }
    var dragToReorder: String { jp ? "ドラッグで並べ替え" : "Drag to reorder" }
    var selectLayout: String { jp ? "レイアウトを選択" : "Select layout" }
    var selectFrameColor: String { jp ? "フレームカラーを選択" : "Select frame color" }
    var textColor: String { jp ? "テキストカラー" : "Text Color" }
    var saveAndContinue: String { jp ? "保存して続ける" : "Save & Continue" }

    // Layout names
    func layoutName(_ layout: CollageLayout) -> String {
        switch layout {
        case .strip: return jp ? "ストリップ (1×4)" : "Strip (1×4)"
        case .grid: return jp ? "グリッド (2×2)" : "Grid (2×2)"
        }
    }

    // Frame option names
    func frameOptionName(_ option: FrameOption) -> String {
        switch option {
        case .white: return jp ? "ホワイト" : "White"
        case .black: return jp ? "ブラック" : "Black"
        case .salmonPink: return jp ? "ピンク" : "Pink"
        case .navy: return jp ? "ネイビー" : "Navy"
        case .photo: return jp ? "写真" : "Photo"
        }
    }

    // MARK: - Preview
    var yourCollage: String { jp ? "コラージュ" : "Your Collage" }
    var reviewBeforeSaving: String { jp ? "保存前に確認しよう" : "Review your creation before saving" }
    var generatingCollage: String { jp ? "コラージュ生成中..." : "Generating collage..." }
    var failedToGenerateCollage: String { jp ? "コラージュの生成に失敗しました" : "Failed to generate collage" }
    var editCustomization: String { jp ? "カスタマイズを編集" : "Edit Customization" }
    var preview: String { jp ? "プレビュー" : "Preview" }
    var oneCredit: String { jp ? "1クレジット" : "1 Credit" }

    // MARK: - Success
    var collageSaved: String { jp ? "コラージュ保存完了！" : "Collage Saved!" }
    var oneCreditUsed: String { jp ? "1クレジット使用しました" : "1 credit has been used" }
    var saveBTSVideo: String { jp ? "メイキング動画を保存" : "Save Behind-the-Scenes Video" }
    var saveRecordingToCameraRoll: String { jp ? "カメラロールに保存" : "Save recording to Camera Roll" }
    var saveIndividualPhotos: String { jp ? "個別に写真を保存" : "Save Individual Photos" }
    func saveAllPhotos(_ count: Int) -> String { jp ? "\(count)枚の写真をカメラロールに保存" : "Save all \(count) photos to Camera Roll" }
    var shareTo: String { jp ? "シェアする" : "Share to" }
    var more: String { jp ? "その他" : "More" }
    var savedToPhotos: String { jp ? "カメラロールに保存しました" : "Saved to Photos" }
    var videoSavedToPhotos: String { jp ? "動画をカメラロールに保存しました" : "Video saved to Photos" }
    func photosSavedToPhotos(_ count: Int) -> String { jp ? "\(count)枚の写真をカメラロールに保存しました" : "\(count) photos saved to Photos" }
    var noVideoToSave: String { jp ? "保存する動画がありません" : "No video to save" }

    // MARK: - Profile
    var profile: String { jp ? "プロフィール" : "Profile" }
    var profileSubtitle: String { jp ? "ステータスを確認、友達を招待、クレジットを獲得" : "Check your stats, invite friends, and earn credits" }
    var yourCredits: String { jp ? "クレジット" : "YOUR CREDITS" }
    var credits: String { jp ? "クレジット" : "credits" }
    var earnCredits: String { jp ? "クレジット獲得" : "EARN CREDITS" }
    var upTo15Free: String { jp ? "最大15回無料プレイ" : "Up to 15 free sessions" }
    var details: String { jp ? "詳細" : "Details" }
    var streak: String { jp ? "連続記録" : "Streak" }
    var days: String { jp ? "日" : "days" }
    var sessions: String { jp ? "撮影セット" : "Sessions" }
    var sessionsUnit: String { jp ? "回" : "sessions" }
    var favorite: String { jp ? "お気に入り" : "Favorite" }
    var mostUsedStyle: String { jp ? "最も使ったスタイル" : "most used style" }
    var bestScore: String { jp ? "ベストスコア" : "Best Score" }
    var flappyBird: String { jp ? "点" : "" }

    // MARK: - Settings
    var settings: String { jp ? "設定" : "Settings" }
    var manageAccount: String { jp ? "アカウントと環境設定を管理" : "Manage your account and preferences" }
    var account: String { jp ? "アカウント" : "Account" }
    var username: String { jp ? "ユーザー名" : "Username" }
    var purchases: String { jp ? "購入" : "Purchases" }
    var buyCredits: String { jp ? "クレジット購入" : "Buy Credits" }
    func creditsCount(_ count: Int) -> String { jp ? "\(count) クレジット" : "\(count) credits" }
    var purchaseHistory: String { jp ? "購入履歴" : "Purchase History" }
    var support: String { jp ? "サポート" : "Support" }
    var contactUs: String { jp ? "お問い合わせ" : "Contact Us" }
    var sendFeedback: String { jp ? "フィードバック" : "Send Feedback" }
    var app: String { jp ? "アプリ" : "App" }
    var language: String { "Language / 言語" }
    var privacyPolicy: String { jp ? "プライバシーポリシー" : "Privacy Policy" }
    var termsOfService: String { jp ? "利用規約" : "Terms of Service" }
    var version: String { jp ? "バージョン" : "Version" }
    var signOut: String { jp ? "ログアウト" : "Sign Out" }
    var deleteAccount: String { jp ? "アカウント削除" : "Delete Account" }
    var signOutConfirm: String { jp ? "ログアウトしますか？" : "Are you sure you want to sign out?" }
    var deleteAccountConfirm: String { jp ? "この操作は取り消せません。すべてのデータが完全に削除されます。" : "This action cannot be undone. All your data will be permanently deleted." }
    var editUsername: String { jp ? "ユーザー名を編集" : "Edit Username" }
    var enterNewUsername: String { jp ? "新しいユーザー名を入力" : "Enter your new username" }

    // MARK: - Referral
    var earnCreditsTitle: String { jp ? "クレジット獲得" : "Earn Credits" }
    var referFriendsEarnCredits: String { jp ? "友達を紹介してクレジットを獲得" : "Refer Friends, Earn Credits" }
    var shareYourCode: String { jp ? "コードをシェア" : "Share Your Code" }
    var shareCodeDescription: String { jp ? "紹介コードを友達に送ろう" : "Send your unique referral code to friends" }
    var friendsSignUp: String { jp ? "友達が登録" : "Friends Sign Up" }
    var friendsSignUpDescription: String { jp ? "友達がコードを使って登録し、1回以上プレイを完了" : "They create an account using your code and complete at least one session" }
    var earnCreditsStep: String { jp ? "クレジット獲得" : "Earn Credits" }
    var earnCreditsStepDescription: String { jp ? "ボーナスクレジットが自動で付与されます" : "You receive bonus credits automatically" }
    var yourReferralCode: String { jp ? "紹介コード" : "Your Referral Code" }
    var shareReferralLink: String { jp ? "紹介リンクをシェア" : "Share Referral Link" }
    var yourProgress: String { jp ? "進捗" : "Your Progress" }
    var creditEqualsSession: String { jp ? "1クレジット = 1プレイ" : "1 credit = 1 session" }
    func referralCount(_ count: Int) -> String { jp ? "\(count)人紹介" : "\(count) Referral\(count > 1 ? "s" : "")" }
    func referralCompleted(_ current: Int, _ needed: Int) -> String { jp ? "\(current)/\(needed) 完了" : "\(current)/\(needed) completed" }
    var creditsNote: String { jp ? "注：クレジットは累積です。加算ではありません。" : "Note: Credits are cumulative, not additive." }
    func referralShareMessage(_ code: String, _ link: String) -> String {
        jp ? "Photoboothに参加して3クレジットをゲット！紹介コード: \(code)\n\n\(link)" : "Join me on Photobooth and get 3 free credits! Use my referral code: \(code)\n\n\(link)"
    }

    // MARK: - Contact Us
    var contactUsSubtitle: String { jp ? "質問やお困りごとはメッセージを送ってね" : "Have a question or need help? Send us a message" }
    var sendMessage: String { jp ? "メッセージを送信" : "Send Message" }
    var subject: String { jp ? "件名" : "Subject" }
    var whatsThisAbout: String { jp ? "何についてですか？" : "What's this about?" }
    var message: String { jp ? "メッセージ" : "Message" }
    var messageSent: String { jp ? "送信完了" : "Message Sent" }
    var thankYouContact: String { jp ? "お問い合わせありがとうございます！すぐにご返信いたします。" : "Thank you for contacting us! We'll get back to you soon." }
    var failedToSendMessage: String { jp ? "メッセージの送信に失敗しました。もう一度お試しください。" : "Failed to send message. Please try again." }
    var pleaseSignInToSend: String { jp ? "メッセージを送るにはログインしてください" : "Please sign in to send a message" }

    // MARK: - Feedback
    var sendFeedbackSubtitle: String { jp ? "フィードバックでアプリの改善に協力してね" : "Help us improve the app with your feedback" }
    var howsYourExperience: String { jp ? "使い心地はどう？" : "How's your experience?" }
    var generalFeedback: String { jp ? "一般的なフィードバック" : "General Feedback" }
    var bugReport: String { jp ? "バグ報告" : "Bug Report" }
    var featureRequest: String { jp ? "機能リクエスト" : "Feature Request" }
    var improvement: String { jp ? "改善提案" : "Improvement" }
    var feedbackType: String { jp ? "フィードバックの種類" : "Feedback Type" }
    var yourFeedback: String { jp ? "フィードバック" : "Your Feedback" }
    var tellUsMore: String { jp ? "詳しく教えてね" : "Tell us more" }
    var sendFeedbackButton: String { jp ? "フィードバックを送信" : "Send Feedback" }
    var feedbackSent: String { jp ? "送信完了" : "Feedback Sent" }
    var thankYouFeedback: String { jp ? "フィードバックありがとう！改善に役立てます。" : "Thank you for your feedback! We appreciate you helping us improve." }
    var failedToSendFeedback: String { jp ? "フィードバックの送信に失敗しました。もう一度お試しください。" : "Failed to send feedback. Please try again." }
    var pleaseSignInForFeedback: String { jp ? "フィードバックを送るにはログインしてください" : "Please sign in to send feedback" }

    func ratingText(_ rating: Int) -> String {
        switch rating {
        case 1: return jp ? "残念です。改善点を教えてください。" : "We're sorry to hear that. Please tell us how we can improve."
        case 2: return jp ? "ご意見ありがとう。改善できることは？" : "Thanks for the feedback. What could be better?"
        case 3: return jp ? "ご意見ありがとうございます！" : "We appreciate your feedback!"
        case 4: return jp ? "嬉しい！楽しんでくれてありがとう。" : "Great! We're glad you're enjoying the app."
        case 5: return jp ? "最高！気に入ってくれて嬉しいです！" : "Awesome! We're thrilled you love it!"
        default: return ""
        }
    }

    func feedbackTypeName(_ type: SendFeedbackScreen.FeedbackType) -> String {
        switch type {
        case .general: return generalFeedback
        case .bug: return bugReport
        case .feature: return featureRequest
        case .improvement: return improvement
        }
    }

    // MARK: - Credits Purchase
    var buyCreditsSubtitle: String { jp ? "クレジットを購入して素敵な写真を作ろう" : "Get more credits to create amazing photos" }
    var currentBalance: String { jp ? "残高" : "Current Balance" }
    var creditPackages: String { jp ? "クレジットパッケージ" : "Credit Packages" }
    var unableToLoadProducts: String { jp ? "商品を読み込めませんでした" : "Unable to load products" }
    var aboutCredits: String { jp ? "クレジットについて" : "About Credits" }
    var creditEqualsPhotoSession: String { jp ? "1クレジット = 1フォトプレイ" : "1 credit = 1 photo session" }
    var creditsNeverExpire: String { jp ? "クレジットに有効期限はありません" : "Credits never expire" }
    var referFriendsForFreeCredits: String { jp ? "友達を紹介して無料クレジットを獲得" : "Refer friends to earn free credits" }
    var restorePurchases: String { jp ? "購入を復元" : "Restore Purchases" }
    var purchaseSuccessful: String { jp ? "購入完了！" : "Purchase Successful!" }
    var purchaseFailed: String { jp ? "購入失敗" : "Purchase Failed" }
    var bestValue: String { jp ? "お得" : "Best Value" }
    func youReceivedCredits(_ count: Int) -> String { jp ? "\(count)クレジットを獲得しました！" : "You received \(count) credit\(count == 1 ? "" : "s")!" }
    var perCredit: String { jp ? "/クレジット" : "/credit" }

    // MARK: - Purchase History
    var purchaseHistorySubtitle: String { jp ? "過去のクレジット購入" : "Your past credit purchases" }
    var noPurchasesYet: String { jp ? "まだ購入履歴はありません" : "No purchases yet" }
    var purchaseCreditsPrompt: String { jp ? "クレジットを購入して素敵な写真を作ろう" : "Purchase credits to create amazing photos" }
    var allPurchases: String { jp ? "全購入履歴" : "All Purchases" }

    // MARK: - Login
    var continueWithGoogle: String { jp ? "Googleで続ける" : "Continue with Google" }
    var signUpWithEmail: String { jp ? "メールで登録" : "Sign up with Email" }
    var signInWithEmail: String { jp ? "メールでログイン" : "Sign in with Email" }
    var alreadyHaveAccount: String { jp ? "アカウントをお持ちの方はこちら" : "Already have an account? Sign In" }
    var dontHaveAccount: String { jp ? "アカウントを作成する" : "Don't have an account? Sign Up" }
    var name: String { jp ? "名前" : "Name" }
    var email: String { jp ? "メール" : "Email" }
    var password: String { jp ? "パスワード" : "Password" }
    var createAccount: String { jp ? "アカウント作成" : "Create Account" }
    var signIn: String { jp ? "ログイン" : "Sign In" }
    var anErrorOccurred: String { jp ? "エラーが発生しました" : "An error occurred" }

    // MARK: - Flappy Bird
    var flappyBirdTitle: String { jp ? "フラッピーバード" : "Flappy Bird" }
    func score(_ n: Int) -> String { jp ? "スコア: \(n)" : "Score: \(n)" }
    func best(_ n: Int) -> String { jp ? "ベスト: \(n)" : "Best: \(n)" }
    var tapToJump: String { jp ? "タップで鳥をジャンプ" : "Tap to make the bird jump" }
    var flyThroughGaps: String { jp ? "パイプの隙間を飛び抜けよう" : "Fly through the gaps in pipes" }
    var avoidHitting: String { jp ? "パイプや端にぶつからないように" : "Avoid hitting pipes or edges" }
    var tapToStart: String { jp ? "タップしてスタート！" : "Tap to Start!" }
    var gameOver: String { "Game Over" }
    var restart: String { jp ? "再スタート" : "Restart" }

    // MARK: - Misc Error Messages
    var userNotAuthenticated: String { jp ? "認証されていません" : "User not authenticated" }
    var failedToFetchUser: String { jp ? "ユーザーデータの取得に失敗しました" : "Failed to fetch user data" }
    var insufficientCreditsEarn: String { jp ? "クレジット不足です。紹介で獲得してください。" : "Insufficient credits. Please earn more credits through referrals." }
    var noStyledPhotos: String { jp ? "スタイル済みの写真がありません" : "No styled photos available" }
    var noCollageToSave: String { jp ? "保存するコラージュがありません" : "No collage to save" }
    var failedToSaveCollage: String { jp ? "コラージュの保存に失敗しました" : "Failed to save collage" }
}
