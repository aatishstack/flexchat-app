// Force testing mode and dummy config before imports to bypass static ESM initialization order
process.env.TESTING = "true";
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "postgres://user:password@localhost:5432/flexchat?sslmode=require";

const { db } = await import("../db/index.js");
const { blocks } = await import("../db/schema/blocks.js");
const { conversations } = await import("../db/schema/conversations.js");
const { conversationMembers } = await import("../db/schema/conversation-members.js");
const { isBlocked, isConversationBlocked } = await import("../lib/blocking.js");

async function runTests() {
  console.log("=== STARTING BLOCKING HELPER VERIFICATION TESTS ===");

  // 1. Setup seed users
  const userA = "user_A";
  const userB = "user_B";
  const userC = "user_C";

  // 2. Setup direct conversation between A and B
  const dmAB = "convo_AB";
  await db.insert(conversations).values({
    id: dmAB,
    type: "direct",
    name: "DM A-B"
  });

  await db.insert(conversationMembers).values({
    id: "member_AB_A",
    conversationId: dmAB,
    userId: userA
  });

  await db.insert(conversationMembers).values({
    id: "member_AB_B",
    conversationId: dmAB,
    userId: userB
  });

  // 3. Setup a group conversation between A, B, and C
  const groupABC = "convo_ABC";
  await db.insert(conversations).values({
    id: groupABC,
    type: "group",
    name: "Group A-B-C"
  });

  await db.insert(conversationMembers).values({
    id: "member_ABC_A",
    conversationId: groupABC,
    userId: userA
  });

  await db.insert(conversationMembers).values({
    id: "member_ABC_B",
    conversationId: groupABC,
    userId: userB
  });

  await db.insert(conversationMembers).values({
    id: "member_ABC_C",
    conversationId: groupABC,
    userId: userC
  });

  // Test Case 1: Initially no blocks exist
  console.log("\n--- Test Case 1: Initial state (No blocks) ---");
  const blockInit1 = await isBlocked(userA, userB);
  const blockInit2 = await isBlocked(userB, userA);
  const convoInit1 = await isConversationBlocked(userA, dmAB);
  const convoInit2 = await isConversationBlocked(userB, dmAB);

  console.log("isBlocked(A, B) initially (expect false):", blockInit1);
  console.log("isBlocked(B, A) initially (expect false):", blockInit2);
  console.log("isConversationBlocked(A, dmAB) initially (expect false):", convoInit1);
  console.log("isConversationBlocked(B, dmAB) initially (expect false):", convoInit2);

  if (blockInit1 || blockInit2 || convoInit1 || convoInit2) {
    throw new Error("Initial state check failed: blocks exist when they shouldn't.");
  }

  // Test Case 2: User A blocks User B
  console.log("\n--- Test Case 2: A blocks B ---");
  await db.insert(blocks).values({
    id: "block_A_B",
    blockerId: userA,
    blockedId: userB
  });

  const blockAB = await isBlocked(userA, userB);
  const blockBA = await isBlocked(userB, userA);
  const convoBlockedA = await isConversationBlocked(userA, dmAB);
  const convoBlockedB = await isConversationBlocked(userB, dmAB);

  console.log("isBlocked(A, B) (expect true):", blockAB);
  console.log("isBlocked(B, A) (expect true):", blockBA);
  console.log("isConversationBlocked(A, dmAB) (expect true):", convoBlockedA);
  console.log("isConversationBlocked(B, dmAB) (expect true):", convoBlockedB);

  if (!blockAB || !blockBA || !convoBlockedA || !convoBlockedB) {
    throw new Error("Blocking verification failed: block or conversation block not detected.");
  }

  // Test Case 3: Group conversations should not be blocked even if there is a block between members
  console.log("\n--- Test Case 3: Group conversations are not blocked ---");
  const convoGroupA = await isConversationBlocked(userA, groupABC);
  const convoGroupB = await isConversationBlocked(userB, groupABC);

  console.log("isConversationBlocked(A, groupABC) (expect false):", convoGroupA);
  console.log("isConversationBlocked(B, groupABC) (expect false):", convoGroupB);

  if (convoGroupA || convoGroupB) {
    throw new Error("Group conversation block verification failed: group convo was incorrectly reported as blocked.");
  }

  // Test Case 4: No block between A and C
  console.log("\n--- Test Case 4: No block between A and C ---");
  const blockAC = await isBlocked(userA, userC);
  console.log("isBlocked(A, C) (expect false):", blockAC);
  if (blockAC) {
    throw new Error("Incorrect block detected between A and C.");
  }

  console.log("\n=== ALL BLOCKING HELPER VERIFICATION TESTS PASSED SUCCESSFULLY! ===");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
