import SwiftUI

/// Initial splash screen with app branding
struct SplashScreen: View {
    @EnvironmentObject private var appState: AppState
    @State private var isAnimating = false

    var body: some View {
        ZStack {
            // White background
            Color.white
                .ignoresSafeArea()

            // Centered logo
            Image("Logo")
                .resizable()
                .scaledToFit()
                .frame(width: 150, height: 150)
                .offset(y: -40)
                .opacity(isAnimating ? 1.0 : 0.0)
        }
        .onAppear {
            withAnimation(.easeOut(duration: 0.5)) {
                isAnimating = true
            }

            // Transition to next screen after delay
            DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                withAnimation(.easeInOut(duration: 0.3)) {
                    appState.isShowingSplash = false
                }
            }
        }
    }
}

#Preview {
    SplashScreen()
        .environmentObject(AppState())
}
