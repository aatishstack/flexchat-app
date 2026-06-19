# FlexChat Master Engineering Context v4

## Project Overview

Project: FlexChat

FlexChat is a production-grade realtime messaging platform.

The application is already functional.

Core systems are implemented and integrated.

Current objective is NOT rebuilding.

Current objective is NOT redesigning.

Current objective is:

PRODUCTION READINESS

The mission is to transform FlexChat from a working application into a reliable, secure, scalable, mobile-first production product.

---

# Current Phase

Current Phase:

PRODUCTION READINESS PHASE

Visual parity phase is substantially complete.

New feature development is secondary.

Current priorities:

1. Security Audit
2. JWT & Session Architecture
3. Blocking System Validation
4. Redis / Presence Architecture
5. TURN Validation
6. Production Bug Hunting
7. Android Device Testing
8. Interaction Layer Improvements
9. Performance Hardening
10. Launch Preparation

---

# Project Goal

FlexChat should become:

- Reliable
- Fast
- Mobile-first
- Secure
- Production-grade
- Low-cost
- Free-stack friendly

Target:

- 100+ active users comfortably
- Hundreds of conversations daily
- Stable realtime messaging
- Reliable notifications
- Reliable media uploads
- Reliable calls
- Smooth Android experience

---

# Product Philosophy

FlexChat is NOT trying to become Telegram.

FlexChat is NOT trying to become WhatsApp.

FlexChat should borrow proven patterns from industry leaders while maintaining its own identity.

Use:

- WhatsApp interaction quality
- Telegram responsiveness
- Signal reliability

Avoid:

- Feature bloat
- Enterprise complexity
- Premature scaling

---

# Priority Order

If priorities conflict:

1. Reliability
2. Security
3. Existing Functionality
4. Performance
5. Existing Architecture
6. UX
7. New Features
8. Visual Polish

Higher priorities always win.

---

# Core Rule

DO NOT BREAK THE APP.

DO NOT REWRITE THE APP.

DO NOT REPLACE WORKING SYSTEMS.

DO NOT IMPORT PROTOTYPE LOGIC.

DO NOT REPLACE REAL DATA WITH MOCK DATA.

DO NOT REBUILD FEATURES FROM SCRATCH.

Improve existing systems first.

---

# Existing Systems

Already Implemented:

- Authentication
- JWT
- Route Protection
- Socket.IO Messaging
- Presence
- Typing
- Notifications
- Firebase FCM
- Cloudinary
- Stories
- Calls
- TURN Integration
- Media Uploads
- Conversation Virtualization
- Message Virtualization
- Mobile Safe Areas
- Google OAuth

Assume these systems exist.

Verify implementation before claiming issues.

---

# Protected Systems

Never rewrite without explicit approval:

- Auth
- JWT
- Refresh Flow
- Socket.IO
- Presence
- Typing
- Notifications
- Firebase
- Cloudinary
- Stories Backend
- Calls Backend
- TURN
- Database Layer
- Zustand Stores
- Providers
- Services
- API Contracts

Refactor only when necessary.

Preserve behavior.

---

# Audit Philosophy

Never assume.

Never guess.

Never infer missing functionality without evidence.

Before reporting:

1. Search codebase
2. Verify implementation
3. Collect evidence
4. Produce findings

Every finding must be marked:

VERIFIED
PARTIALLY VERIFIED
UNVERIFIED

Evidence wins.

Assumptions lose.

---

# Security Rules

Security is a launch blocker.

Always inspect:

- JWT storage
- JWT refresh flow
- Session management
- Logout flow
- Token revocation
- Authorization
- Upload validation
- Blocking enforcement
- Rate limiting
- Abuse prevention

Security findings take priority over UI findings.

---

# Performance Rules

Never optimize blindly.

Before optimization:

1. Identify bottleneck
2. Measure bottleneck
3. Validate bottleneck
4. Implement fix
5. Measure improvement

Avoid:

- Premature optimization
- Complexity without benefit
- Heavy animation libraries

Prefer:

- Lower rerenders
- Lower memory usage
- Lower network traffic
- Better perceived performance

---

# Architecture Rules

FlexChat is intentionally simple.

Avoid recommending:

- Kubernetes
- Kafka
- ElasticSearch
- Microservices
- Service Meshes
- Enterprise Infrastructure

Unless a real bottleneck exists.

Target scale:

100–500 active users.

Keep infrastructure lightweight.

---

# Redis Rules

Before recommending Redis:

Identify:

- Presence usage
- Typing usage
- Rate limiting
- Conversation caching
- Session storage

Explain:

- Why Redis is needed
- Expected gain
- Cost
- Complexity

Do not add Redis because "everyone uses Redis."

---

# TURN Rules

Before call-related recommendations:

Verify:

- STUN configuration
- TURN configuration
- Cross-network testing
- Android testing
- Reconnection behavior

Call reliability is more important than call features.

---

# Interaction Layer

Future UX work should focus on:

- Long Press Context Menus
- Message Actions
- Chat Actions
- Swipe Reply
- Double Tap Reactions
- Multi Select
- Story Gestures
- Haptic Feedback
- Press States
- Native Android Feel

Avoid:

- Heavy animation systems
- Over-engineered gesture libraries

Performance always wins.

---

# Mobile Rules

Primary Platform:

Android

Target Widths:

- 360
- 390
- 412
- 430

Support:

- Browser
- PWA
- Android WebView
- Capacitor
- TWA

Desktop is secondary.

Every change should be reviewed through a mobile-first lens.

---

# Bug Hunting Rules

When performing bug hunts:

Do not propose fixes immediately.

First:

1. Reproduce
2. Locate root cause
3. Identify affected files
4. Estimate risk
5. Report findings

Output:

# BUG

# ROOT CAUSE

# FILES AFFECTED

# RISK LEVEL

# RECOMMENDED FIX

STOP.

---

# Audit Output Format

Always report:

# VERIFIED FINDINGS

# PARTIALLY VERIFIED FINDINGS

# UNVERIFIED FINDINGS

# CRITICAL RISKS

# HIGH RISKS

# MEDIUM RISKS

# LOW RISKS

# REMAINING RISKS

# RECOMMENDED NEXT STEP

Never exaggerate progress.

Never claim success without evidence.

---

# Verification Rules

Nothing is complete until verified.

Required:

- Build
- Typecheck
- Runtime validation
- Mobile validation

If not tested:

Status = UNVERIFIED

Never claim:

- COMPLETE
- VERIFIED
- WORKING
- NO REGRESSIONS

without evidence.

---

# Git Verification

Before reporting completion:

Run:

git diff --name-only

Report exact output.

Never estimate.

Never assume.

---

# Reporting Format

Always report:

# FILES MODIFIED

# VERIFIED CHANGES

# UNVERIFIED CHANGES

# REMAINING RISKS

# REGRESSIONS

# BUILD STATUS

# GIT DIFF

---

# Launch Philosophy

Launch blockers:

- Security vulnerabilities
- Session flaws
- Authorization flaws
- Message delivery failures
- Call reliability failures
- Notification failures

Non-blockers:

- Minor UI polish
- Animation tweaks
- Cosmetic differences

Reliability > Features

Security > Features

Performance > Features

---

# Mission

Make FlexChat:

Reliable.
Secure.
Fast.
Mobile-first.
Production-grade.

Preserve the existing architecture.

Preserve realtime reliability.

Preserve launch velocity.

Build the best possible messaging experience on a lightweight, affordable stack.
