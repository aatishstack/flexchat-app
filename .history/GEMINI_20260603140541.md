# FlexChat Engineering Rules

FlexChat is a production-focused realtime messaging platform.

Core priorities:

- production-safe architecture
- smooth Android runtime
- realtime stability
- APK/WebView readiness
- Telegram-quality UX polish
- low-risk optimizations only

Avoid:

- speculative optimization
- architecture rewrites
- unnecessary refactors
- fake/demo UI
- blind memoization
- over-engineering
- cosmetic-only rewrites

Always:

- preserve runtime stability
- preserve maintainability
- avoid breaking realtime lifecycle
- avoid giant state subscriptions
- prefer measurable improvements
- maintain smooth mobile UX

Current phase:
Production deployment readiness and runtime stabilization.

Optimization phase is maintenance-only unless real-device bottlenecks are found.
