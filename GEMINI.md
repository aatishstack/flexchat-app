# FlexChat Master Engineering Context

## Project Status

FlexChat is currently in the final productization phase.

Core infrastructure is considered complete.

Completed:

- Authentication
- JWT Refresh Flow
- Route Protection
- Socket.IO Messaging
- Presence System
- Typing System
- Notification Persistence
- Notification Realtime Sync
- Firebase FCM Integration
- Cloudinary Integration
- Cloudflare Turnstile Integration
- Error Boundaries
- Health Checks
- Readiness Checks
- Environment Validation
- Message Virtualization
- Conversation Virtualization
- Mobile Safe Areas
- APK Preparation
- Production Cleanup
- Media Upload Pipeline
- Story System Foundation
- Call Signaling Foundation
- Dynamic TURN Credential Integration

Current Metrics:

Infrastructure Readiness: 99%
Production Stability: 98%
UI Completion: 65%
APK Readiness: 92%
Call Reliability: Pending Coturn Deployment

---

# Instruction Priority

If instructions conflict:

1. Runtime Stability
2. Production Functionality
3. Existing Architecture
4. Approved Prototype
5. Visual Improvements

Higher priorities always win.

---

# Current Project Phase

Current Phase:

UI Migration
UX Polish
Production Verification

The approved FlexChat prototype package is the official visual source of truth.

The existing FlexChat application is the official functional source of truth.

---

# Mission

Transform FlexChat into a premium production-grade messaging platform.

Target:

- Telegram usability
- Telegram responsiveness
- Apple-level polish
- Linear-level cleanliness
- Android-native feel

---

# Core Philosophy

Functionality First

Reliability First

Visual Quality Second

Never sacrifice:

- stability
- messaging reliability
- call reliability
- notification reliability
- mobile performance

for visual improvements.

---

# Approved Visual Identity

Primary:

#7C4FF0

Background:

#0C0C10

Surface:

#16161D

Secondary Surface:

#1E1E27

Typography:

Plus Jakarta Sans

Spacing Scale:

4
8
12
16
20
24
32
40
48

Radius Scale:

10
14
18

Motion:

150ms–300ms

---

# Prototype Rules

The approved prototype is the visual source of truth.

Use it for:

- spacing
- hierarchy
- typography
- navigation
- stories
- calls
- settings
- profile
- motion

Do not use it for:

- backend architecture
- state management
- socket architecture
- API architecture

---

# UI Migration Rules

DO NOT:

- rewrite backend
- rewrite auth
- rewrite sockets
- rewrite notifications
- rewrite stories backend
- rewrite media backend
- rewrite WebRTC
- rewrite TURN integration
- rewrite database logic
- rewrite providers
- rewrite Zustand ownership

Preserve all working production systems.

Replace presentation only.

---

# Architecture Rules

Preserve:

- Socket.IO lifecycle
- Zustand ownership
- Existing APIs
- Existing routes
- Existing business logic
- Existing media pipeline
- Existing notification pipeline

Avoid:

- duplicate stores
- duplicate listeners
- duplicate services
- competing systems

---

# Realtime Rules

Always:

- cleanup listeners
- cleanup subscriptions
- validate reconnect behavior
- validate offline recovery
- validate multi-tab behavior

Never:

- create competing presence systems
- create competing typing systems
- create duplicate socket instances

---

# Stories Vision

Stories are a flagship feature.

Requirements:

- immersive viewer
- premium transitions
- viewer lists
- story analytics
- reactions
- replies

Story close must always return to previous route.

Never redirect unexpectedly.

---

# Messaging Vision

Priorities:

1. Readability
2. Density
3. Speed
4. Touch Ergonomics

Requirements:

- clean grouping
- visible typing indicators
- premium composer
- lightweight reactions
- smooth scrolling
- one-handed usability

---

# Calls Vision

Requirements:

- premium incoming call screen
- premium voice call screen
- premium video call screen
- network indicators
- connection indicators

The UI should inspire confidence.

---

# Settings Vision

Settings should feel like a premium operating system.

Focus:

- hierarchy
- grouping
- discoverability
- accessibility

Avoid endless settings lists.

---

# Mobile Rules

Primary Target:

Android

Widths:

360
390
412
430

Support:

- Browser
- PWA
- Android WebView
- Capacitor
- Trusted Web Activity

Desktop is secondary.

---

# Performance Rules

Never optimize blindly.

Before optimization:

- identify bottleneck
- measure impact
- verify improvement

Prefer:

- fewer rerenders
- lower memory usage
- smoother scrolling
- lower network traffic

---

# Security Rules

Always:

- validate server-side
- authorize server-side
- sanitize inputs
- rate limit sensitive actions

Never trust client state.

---

# Verification Rules

Nothing is complete until verified.

Required:

- build passes
- typecheck passes
- runtime path verified
- mobile viewport verified

If not tested:

UNVERIFIED

---

# Mandatory Regression Verification

After every major change verify:

- login
- register
- refresh token
- messaging
- typing indicator
- presence
- notifications
- stories
- media uploads
- calls
- push notifications

---

# Reporting Rules

Always report:

# VERIFIED CHANGES

# REMAINING RISKS

# REGRESSIONS

# READINESS PERCENTAGE

# NEXT RECOMMENDED STEP

Never exaggerate progress.

Never mark unverified work as complete.

---

# Current Priority Order

1. UI Migration
2. UX Polish
3. Story Experience
4. Call Experience
5. Notification Experience
6. Mobile APK Validation
7. Coturn Deployment
8. Real Device Testing
9. Production Launch

---

# Final Product Goal

FlexChat should launch as:

- production-grade
- premium
- mobile-first
- reliable
- secure
- scalable

Combining:

- Telegram usability
- Telegram responsiveness
- Premium black-and-purple identity
- Modern minimalist design
- Native-quality mobile experience
- Production-grade reliability
