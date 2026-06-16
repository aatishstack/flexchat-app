# FlexChat Master Engineering Context v2

## Project Overview

FlexChat is a production-grade realtime messaging platform currently in its final UI migration and launch preparation phase.

Core infrastructure is considered stable.

The application already contains:

- Authentication
- JWT Refresh Flow
- Route Protection
- Socket.IO Messaging
- Presence System
- Typing System
- Notification Persistence
- Notification Realtime Sync
- Firebase FCM
- Cloudinary Media Pipeline
- Cloudflare Turnstile
- Error Boundaries
- Health Checks
- Readiness Checks
- Environment Validation
- Message Virtualization
- Conversation Virtualization
- Mobile Safe Areas
- APK Preparation
- Story System
- Call Signaling
- Dynamic TURN Integration

Infrastructure is NOT the current focus.

Visual parity and launch readiness are the current focus.

---

# Instruction Priority

If instructions conflict:

1. Runtime Stability
2. Production Functionality
3. Existing Architecture
4. Reference Screenshots
5. Approved Prototype
6. Visual Improvements

Higher priorities always win.

---

# Current Phase

Current Phase:

Visual Parity Pass

Bug fixing is temporarily paused.

Feature development is temporarily paused.

The immediate objective is:

Match the approved reference screenshots as closely as possible.

Only after visual parity is achieved should bug fixing begin.

---

# Visual Source Of Truth

Primary Reference:

F:\projects\flexchat\Refrence images

Current Application Screens:

F:\projects\flexchat\current state

Before modifying UI:

1. Review reference screenshots.
2. Review current state screenshots.
3. Compare side-by-side.
4. Identify differences.
5. Apply only necessary UI changes.

Never redesign from imagination.

Never invent layouts.

Never modernize without reference support.

Goal:

Visual parity.

Not redesign.

---

# Functional Source Of Truth

The existing FlexChat application is the functional source of truth.

Preserve:

- Socket.IO lifecycle
- Zustand ownership
- Existing APIs
- Existing routes
- Existing services
- Existing stores
- Existing business logic
- Existing notification pipeline
- Existing media pipeline
- Existing story pipeline
- Existing WebRTC pipeline

Replace presentation only.

---

# Protected Systems

Do NOT rewrite:

- Auth
- JWT
- Socket.IO
- Presence
- Typing
- Notifications backend
- Firebase
- Cloudinary
- Stories backend
- Calls backend
- TURN integration
- Database logic
- Providers
- Zustand stores

These systems are already integrated and production-tested.

---

# Approved Visual Identity

Primary Accent:

#7C4FF0

Background:

#0C0C10

Primary Surface:

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

# Brand Rules

Official Brand:

FlexChat

Brand Styling:

Flex = White

Chat = #7C4FF0

Official Logo:

F:\projects\flexchat\assets\logo\FlexChatLogo.jpeg

Use the official logo only.

Do NOT create:

- alternate logos
- generated logos
- placeholder icons
- replacement F marks

Use the official asset whenever branding is required.

Branding Areas:

- Splash
- Authentication
- Session Restore
- Onboarding
- Empty States
- Branding Headers

---

# Anti-Telegram Rule

Telegram usability is allowed.

Telegram visuals are not.

Remove:

- Telegram blue gradients
- Telegram blue surfaces
- Telegram blue message bubbles
- Telegram blue hierarchy

Allowed:

- Responsiveness
- Message density
- Scroll performance
- Conversation usability

FlexChat must maintain:

Black + Purple identity.

---

# Messaging Vision

Priorities:

1. Readability
2. Density
3. Speed
4. One-Handed Use

Requirements:

- Clean grouping
- Visible typing indicators
- Premium composer
- Lightweight reactions
- Smooth scrolling
- Comfortable touch targets

Never sacrifice reliability for appearance.

---

# Stories Vision

Stories are a flagship feature.

Requirements:

- Immersive viewer
- Premium transitions
- Viewer lists
- Reactions
- Replies
- Analytics

Story close must always return to the previous route.

Never redirect unexpectedly.

---

# Calls Vision

Requirements:

- Premium incoming call screen
- Premium voice call screen
- Premium video call screen
- Connection indicators
- Network indicators

The UI should inspire confidence.

---

# Settings Vision

Settings should feel like a premium operating system.

Focus:

- Hierarchy
- Grouping
- Discoverability
- Accessibility

Avoid endless flat lists.

---

# Mobile Rules

Primary Platform:

Android

Target Widths:

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

# Loading Experience Rules

Loading screens are part of the product.

Avoid:

- Generic spinners
- Default loaders
- Blue loading indicators

Prefer:

- Official logo
- Purple accent motion
- Brand-consistent loading states

Priority:

1. Splash
2. Session Restore
3. Auth Loading
4. Story Loading
5. Call Connecting

---

# Performance Rules

Never optimize blindly.

Before optimization:

1. Identify bottleneck.
2. Measure impact.
3. Verify improvement.

Prefer:

- Fewer rerenders
- Lower memory usage
- Smoother scrolling
- Lower network traffic

---

# Security Rules

Always:

- Validate server-side
- Authorize server-side
- Sanitize inputs
- Rate-limit sensitive actions

Never trust client state.

---

# Verification Rules

Nothing is complete until verified.

Required:

- Build passes
- Typecheck passes
- Runtime path verified
- Mobile viewport verified

If not tested:

Status = UNVERIFIED

Never report:

- COMPLETE
- VERIFIED
- PASSED
- WORKING

unless actually confirmed.

Never report:

100% parity

without side-by-side comparison.

Never report:

No regressions

without validating affected flows.

---

# Mandatory Regression Verification

After every major change verify:

- Login
- Register
- Refresh Token
- Messaging
- Typing Indicator
- Presence
- Notifications
- Stories
- Media Uploads
- Calls
- Push Notifications

If not checked:

Mark as UNVERIFIED.

---

# Reporting Rules

Always report:

# VERIFIED CHANGES

# UNVERIFIED CHANGES

# REMAINING RISKS

# REGRESSIONS

# READINESS PERCENTAGE

# NEXT RECOMMENDED STEP

Do not exaggerate progress.

Do not assume success.

Be precise.

---

# Current Priority Order

1. Visual Parity Pass
2. UI Polish
3. Bug Fixing
4. Story Experience
5. Call Experience
6. Notification Experience
7. APK Validation
8. Coturn Deployment
9. Real Device Testing
10. Production Launch

---

# Final Product Goal

FlexChat should launch as:

- Production-grade
- Premium
- Mobile-first
- Reliable
- Secure
- Scalable

Combining:

- Telegram usability
- Telegram responsiveness
- Black & Purple FlexChat identity
- Native Android feel
- Modern minimalist design
- Production-grade reliability

Mission:

Make FlexChat feel like a flagship messaging product while preserving the stability of the existing realtime architecture.
