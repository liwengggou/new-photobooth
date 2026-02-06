import SwiftUI
import Combine

/// Flappy Bird風ミニゲーム - 画像生成待ち時間用
struct FlappyBirdGameView: View {
    @Environment(\.theme) var theme
    @EnvironmentObject private var lang: LanguageManager

    // Best score key for UserDefaults
    static let bestScoreKey = "FlappyBirdBestScore"

    // Game state
    @State private var gameState: GameState = .waiting
    @State private var bird = Bird()
    @State private var pipes: [Pipe] = []
    @State private var score: Int = 0
    @State private var bestScore: Int = UserDefaults.standard.integer(forKey: FlappyBirdGameView.bestScoreKey)
    @State private var gameTimer: AnyCancellable?

    // Game area size
    @State private var gameSize: CGSize = .zero

    // Constants
    private let gravity: CGFloat = 0.6
    private let jumpVelocity: CGFloat = -9
    private let pipeSpeed: CGFloat = 3
    private let pipeSpacing: CGFloat = 200
    private let baseGapHeight: CGFloat = 200  // 基準の隙間（広め）
    private let gapVariation: CGFloat = 20    // ±20のランダム幅
    private let birdSize: CGFloat = 28
    private let pipeWidth: CGFloat = 45

    enum GameState {
        case waiting
        case playing
        case gameOver
    }

    struct Bird {
        var y: CGFloat = 0
        var velocity: CGFloat = 0
        let x: CGFloat = 80
    }

    struct Pipe: Identifiable {
        let id = UUID()
        var x: CGFloat
        let gapY: CGFloat
        let gapHeight: CGFloat
        var passed: Bool = false
    }

    var body: some View {
        GeometryReader { geometry in
            ZStack {
                // Background
                theme.accent.opacity(0.3)

                // Pipes
                ForEach(pipes) { pipe in
                    // Top pipe
                    Rectangle()
                        .fill(theme.primary.opacity(0.8))
                        .frame(width: pipeWidth, height: pipe.gapY - pipe.gapHeight / 2)
                        .position(x: pipe.x, y: (pipe.gapY - pipe.gapHeight / 2) / 2)

                    // Bottom pipe
                    Rectangle()
                        .fill(theme.primary.opacity(0.8))
                        .frame(width: pipeWidth, height: geometry.size.height - (pipe.gapY + pipe.gapHeight / 2))
                        .position(
                            x: pipe.x,
                            y: (pipe.gapY + pipe.gapHeight / 2) + (geometry.size.height - (pipe.gapY + pipe.gapHeight / 2)) / 2
                        )
                }

                // Bird
                Image(systemName: "bird.fill")
                    .font(.system(size: birdSize))
                    .foregroundColor(theme.text)
                    .rotationEffect(.degrees(min(max(bird.velocity * 3, -30), 30)))
                    .position(x: bird.x, y: bird.y)

                // Score display
                VStack {
                    HStack {
                        Text(lang.score(score))
                            .font(Typography.displaySM)
                            .foregroundColor(theme.text)
                        Spacer()
                    }
                    .padding()
                    Spacer()
                }

                // Game state overlays
                if gameState == .waiting {
                    VStack(spacing: 20) {
                        // Title
                        Text(lang.flappyBirdTitle)
                            .font(Typography.displaySM)
                            .foregroundColor(theme.text)

                        // Rules
                        VStack(alignment: .leading, spacing: 8) {
                            HStack(spacing: 8) {
                                Image(systemName: "hand.tap.fill")
                                    .foregroundColor(theme.primary)
                                Text(lang.tapToJump)
                                    .font(Typography.bodySM)
                            }
                            HStack(spacing: 8) {
                                Image(systemName: "arrow.right")
                                    .foregroundColor(theme.primary)
                                Text(lang.flyThroughGaps)
                                    .font(Typography.bodySM)
                            }
                            HStack(spacing: 8) {
                                Image(systemName: "xmark.circle")
                                    .foregroundColor(theme.primary)
                                Text(lang.avoidHitting)
                                    .font(Typography.bodySM)
                            }
                        }
                        .foregroundColor(theme.textSecondary)
                        .padding(.vertical, 8)

                        // Start prompt
                        Text(lang.tapToStart)
                            .font(Typography.bodyMD)
                            .foregroundColor(theme.text)
                            .padding(.top, 8)
                    }
                    .padding(24)
                    .background(theme.background.opacity(0.9))
                    .cornerRadius(16)
                }

                if gameState == .gameOver {
                    VStack(spacing: 20) {
                        Text(lang.gameOver)
                            .font(Typography.displayMD)
                            .foregroundColor(theme.text)

                        Text(lang.score(score))
                            .font(Typography.displaySM)
                            .foregroundColor(theme.textSecondary)

                        Text(lang.best(bestScore))
                            .font(Typography.bodySM)
                            .foregroundColor(theme.textSecondary)

                        Button(action: {
                            resetGame()
                            startGame()
                        }) {
                            Text(lang.restart)
                                .font(Typography.bodyMD)
                                .foregroundColor(theme.background)
                                .padding(.horizontal, 24)
                                .padding(.vertical, 12)
                                .background(theme.primary)
                                .cornerRadius(10)
                        }
                    }
                    .padding(30)
                    .background(theme.background.opacity(0.9))
                    .cornerRadius(20)
                }
            }
            .onAppear {
                gameSize = geometry.size
                resetGame()
            }
            .onTapGesture {
                handleTap()
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    // MARK: - Game Logic

    private func handleTap() {
        switch gameState {
        case .waiting:
            startGame()
        case .playing:
            jump()
        case .gameOver:
            break  // Restartボタンでのみリスタート
        }
    }

    private func startGame() {
        gameState = .playing
        startGameLoop()
    }

    private func resetGame() {
        bird = Bird(y: gameSize.height / 2, velocity: 0)
        pipes = []
        score = 0
        gameState = .waiting
        gameTimer?.cancel()
    }

    private func jump() {
        bird.velocity = jumpVelocity
    }

    private func startGameLoop() {
        gameTimer = Timer.publish(every: 1/60, on: .main, in: .common)
            .autoconnect()
            .sink { _ in
                updateGame()
            }
    }

    private func updateGame() {
        guard gameState == .playing else { return }

        // Apply gravity
        bird.velocity += gravity
        bird.y += bird.velocity

        // Check bounds
        if bird.y < birdSize / 2 || bird.y > gameSize.height - birdSize / 2 {
            endGame()
            return
        }

        // Move pipes
        for i in pipes.indices {
            pipes[i].x -= pipeSpeed
        }

        // Remove off-screen pipes
        pipes.removeAll { $0.x < -pipeWidth }

        // Add new pipes
        if pipes.isEmpty || (pipes.last?.x ?? 0) < gameSize.width - pipeSpacing {
            // 隙間の高さをランダムに（若干狭い〜若干広い）
            let randomGapHeight = baseGapHeight + CGFloat.random(in: -gapVariation...gapVariation)
            let minGapY = randomGapHeight / 2 + 30
            let maxGapY = gameSize.height - randomGapHeight / 2 - 30
            let gapY = CGFloat.random(in: minGapY...maxGapY)

            let newPipe = Pipe(
                x: gameSize.width + pipeWidth,
                gapY: gapY,
                gapHeight: randomGapHeight
            )
            pipes.append(newPipe)
        }

        // Check collisions and scoring
        for i in pipes.indices {
            let pipe = pipes[i]

            // Check if bird passed pipe
            if !pipe.passed && pipe.x + pipeWidth / 2 < bird.x {
                pipes[i].passed = true
                score += 1
            }

            // Collision detection
            let birdRect = CGRect(
                x: bird.x - birdSize / 2,
                y: bird.y - birdSize / 2,
                width: birdSize,
                height: birdSize
            )

            // Top pipe rect
            let topPipeRect = CGRect(
                x: pipe.x - pipeWidth / 2,
                y: 0,
                width: pipeWidth,
                height: pipe.gapY - pipe.gapHeight / 2
            )

            // Bottom pipe rect
            let bottomPipeRect = CGRect(
                x: pipe.x - pipeWidth / 2,
                y: pipe.gapY + pipe.gapHeight / 2,
                width: pipeWidth,
                height: gameSize.height - (pipe.gapY + pipe.gapHeight / 2)
            )

            if birdRect.intersects(topPipeRect) || birdRect.intersects(bottomPipeRect) {
                endGame()
                return
            }
        }
    }

    private func endGame() {
        gameState = .gameOver
        gameTimer?.cancel()
        if score > bestScore {
            bestScore = score
            UserDefaults.standard.set(score, forKey: FlappyBirdGameView.bestScoreKey)
        }
    }
}

#Preview {
    FlappyBirdGameView()
        .frame(height: 400)
        .padding()
}
