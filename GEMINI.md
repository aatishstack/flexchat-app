# FlexChat Master Engineering Context v3

## Project Overview

Project: FlexChat

FlexChat is a production-grade realtime messaging platform.

Current phase:

VISUAL PARITY PASS

The application is already functional.

The goal is NOT to rebuild the application.

The goal is NOT to redesign the application.

The goal is to make the existing production application visually match the approved Figma designs while preserving all existing functionality.

---

# Primary Sources Of Truth

Visual Source Of Truth:

1. Connected Figma MCP Project
   - Design FlexChat Messaging App

Secondary Visual Sources:

2. F:\projects\flexchat\Refrence images
3. F:\projects\flexchat\current state

Functional Source Of Truth:

4. Existing FlexChat codebase

If sources conflict:

Functionality wins.

---

# Instruction Priority

1. Runtime Stability
2. Existing Functionality
3. Existing Architecture
4. Figma MCP Designs
5. Reference Images
6. UI Polish
7. New Ideas

Higher priorities always win.

---

# Core Rule

DO NOT BREAK THE APP.

DO NOT REWRITE THE APP.

DO NOT REPLACE WORKING SYSTEMS.

DO NOT IMPORT PROTOTYPE LOGIC.

DO NOT REPLACE REAL DATA WITH MOCK DATA.

DO NOT REBUILD FEATURES FROM FIGMA.

FIGMA = VISUAL REFERENCE

FLEXCHAT = FUNCTIONAL SOURCE OF TRUTH

---

# Existing Systems

Already Implemented:

- Authentication
- JWT Refresh Flow
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

These systems must be preserved.

---

# Protected Systems

Never rewrite:

- Auth
- JWT
- Refresh Tokens
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

UI may change.

Behavior must remain unchanged.

---

# Protected Files

Do NOT modify without explicit approval:

- client/src/app/globals.css
- client/src/components/chat/conversation/chat-conversation.tsx

These files previously caused build regressions.

If modification appears necessary:

STOP.

Explain why.

Wait for approval.

---

# Figma MCP Rules

Use the connected Figma MCP project:

Design FlexChat Messaging App

Before any UI change:

1. Read Figma frame.
2. Read current implementation.
3. Compare.
4. Produce audit.
5. Wait for approval.
6. Produce blueprint.
7. Wait for approval.
8. Implement.
9. Verify build.
10. Report git diff.

Never skip steps.

---

# Audit Rules

When asked to audit:

STOP after audit.

Do not implement.

Do not create code.

Output:

# SCREEN ANALYZED

# VISUAL DIFFERENCES

# TYPOGRAPHY DIFFERENCES

# SPACING DIFFERENCES

# COMPONENT DIFFERENCES

# MOBILE ISSUES

# RECOMMENDED CHANGES

# RISK LEVEL

STOP.

---

# Blueprint Rules

When asked to create blueprint:

STOP after blueprint.

For every change report:

- File
- Component
- Exact visual change
- Estimated lines changed
- Risk level
- Regression risk

Do not implement.

STOP.

---

# Implementation Rules

Only implement approved scope.

No bonus work.

No hidden work.

No future phase work.

Only modify approved files.

If more files are needed:

STOP.

Explain.

Wait for approval.

---

# Mobile First Rules

Primary Platform:

Android

Target Widths:

- 360
- 390
- 412
- 430

Desktop is secondary.

All visual decisions must prioritize Android.

---

# FlexChat Visual Identity

Brand:

FlexChat

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

Identity:

- Premium
- Fast
- Clean
- Mobile-first
- Native-feeling

Avoid:

- Telegram cloning
- Excessive glassmorphism
- Heavy gradients
- Dashboard layouts
- Unnecessary cards

---

# Stories

Stories are a flagship feature.

Preserve:

- Story upload
- Story viewing
- Story analytics
- Story navigation
- Story interactions

Only adjust presentation.

---

# Calls

Preserve:

- Signaling
- TURN
- WebRTC
- Presence

Only adjust presentation.

---

# Verification Rules

Nothing is complete until verified.

Required:

- Build
- Typecheck (if available)
- Runtime validation
- Mobile viewport review

If not tested:

Mark UNVERIFIED.

Never claim:

- Complete
- Verified
- Working
- No regressions

without actual verification.

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

# Safety Rule

If uncertain:

STOP.

ASK.

DO NOT GUESS.

---

# Mission

Make FlexChat visually match the Figma project while preserving production functionality, realtime reliability, architecture stability, and launch readiness.

Reliability > Visuals

Functionality > Redesign

Figma > Assumptions

Audit → Blueprint → Approval → Implementation

Never skip the workflow.
