// Force testing mode and dummy config before imports to bypass static ESM initialization order
process.env.TESTING = "true";
process.env.JWT_SECRET = "test-secret-must-be-at-least-32-characters";
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "postgres://user:password@localhost:5432/flexchat?sslmode=require";
process.env.TURNSTILE_SECRET_KEY = "";

const { db } = await import("../db/index.js");
const { blocks } = await import("../db/schema/blocks.js");
const { conversations } = await import("../db/schema/conversations.js");
const { conversationMembers } = await import("../db/schema/conversation-members.js");
const { stories } = await import("../db/schema/stories.js");
const { isConversationBlocked, isBlocked } = await import("../lib/blocking.js");
const { buildApp } = await import("../app.js");

async function runTests() {
  console.log("=== STARTING BLOCKING ENFORCEMENT VERIFICATION TESTS ===");
  const app = await buildApp();
  await app.ready();

  // Create two users for testing
  const userAPayload = {
    username: "user_a",
    email: "user_a@example.com",
    password: "Password123",
  };

  const userBPayload = {
    username: "user_b",
    email: "user_b@example.com",
    password: "Password123",
  };

  // 1. REGISTER USERS
  console.log("\n--- Registering Test Users ---");
  const regARes = await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: userAPayload,
  });
  const regBRes = await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: userBPayload,
  });

  if (regARes.statusCode !== 200 || regBRes.statusCode !== 200) {
    throw new Error("User registration failed");
  }

  const userA = JSON.parse(regARes.payload);
  const userB = JSON.parse(regBRes.payload);

  const tokenA = userA.token;
  const tokenB = userB.token;
  const idA = userA.user.id;
  const idB = userB.user.id;

  console.log("User A ID:", idA, "| User B ID:", idB);

  // 2. VERIFY INITIAL STATE (NO BLOCKS)
  console.log("\n--- Checking Initial State (No Blocks) ---");
  const blockedInitRes = await app.inject({
    method: "GET",
    url: "/users/blocked",
    headers: { authorization: `Bearer ${tokenA}` },
  });

  const blockedListInit = JSON.parse(blockedInitRes.payload);
  console.log("Blocked users count (expect 0):", blockedListInit.length);
  if (blockedListInit.length !== 0) {
    throw new Error("Initially blocked list is not empty");
  }

  // 3. BLOCK ACTION (A blocks B)
  console.log("\n--- Testing Block Action (User A blocks User B) ---");
  
  // Test block self
  const blockSelfRes = await app.inject({
    method: "POST",
    url: "/users/block",
    headers: { authorization: `Bearer ${tokenA}` },
    payload: { blockedId: idA },
  });
  console.log("Block self status code (expect 400):", blockSelfRes.statusCode);
  if (blockSelfRes.statusCode !== 400) {
    throw new Error("Should not be allowed to block self");
  }

  // Test block user B
  const blockRes = await app.inject({
    method: "POST",
    url: "/users/block",
    headers: { authorization: `Bearer ${tokenA}` },
    payload: { blockedId: idB },
  });
  console.log("Block user B status code (expect 200):", blockRes.statusCode);
  if (blockRes.statusCode !== 200) {
    throw new Error("Failed to block User B");
  }

  // Verify list of blocked users contains B
  const blockedListRes = await app.inject({
    method: "GET",
    url: "/users/blocked",
    headers: { authorization: `Bearer ${tokenA}` },
  });
  const blockedList = JSON.parse(blockedListRes.payload);
  console.log("Blocked list contents:", blockedList);
  console.log("Blocked list contains B? (expect true):", blockedList.some((u: any) => u.id === idB));
  if (!blockedList.some((u: any) => u.id === idB)) {
    throw new Error("Blocked list does not contain User B");
  }

  // 4. DISCOVER / SEARCH FILTERING (A should not discover B, B should not discover A)
  console.log("\n--- Testing Discover / Search Exclusions ---");
  const discoverARes = await app.inject({
    method: "GET",
    url: "/users/discover",
    headers: { authorization: `Bearer ${tokenA}` },
  });
  const discoverAList = JSON.parse(discoverARes.payload);
  const containsB = discoverAList.some((u: any) => u.id === idB);
  console.log("Discover A contains B? (expect false):", containsB);
  if (containsB) {
    throw new Error("Blocked User B was not filtered from User A's discovery feed");
  }

  const discoverBRes = await app.inject({
    method: "GET",
    url: "/users/discover",
    headers: { authorization: `Bearer ${tokenB}` },
  });
  const discoverBList = JSON.parse(discoverBRes.payload);
  const containsA = discoverBList.some((u: any) => u.id === idA);
  console.log("Discover B contains A? (expect false):", containsA);
  if (containsA) {
    throw new Error("Blocker User A was not filtered from User B's discovery feed");
  }

  // 5. CONVERSATION CREATION BLOCK GUARD
  console.log("\n--- Testing Conversation Creation Block Guard ---");
  const createConvoRes = await app.inject({
    method: "POST",
    url: "/conversations/direct",
    headers: { authorization: `Bearer ${tokenB}` },
    payload: { targetUserId: idA },
  });
  console.log("Conversation creation status code (expect 400):", createConvoRes.statusCode);
  const createConvoData = JSON.parse(createConvoRes.payload);
  console.log("Error message:", createConvoData.message);
  if (createConvoRes.statusCode !== 400 || createConvoData.message !== "User unavailable") {
    throw new Error("Blocked user was not prevented from starting direct conversation");
  }

  // Create a conversation manually in db for testing messages/typing/calls/stories
  const convoId = "convo_test_ab";
  await db.insert(conversations).values({
    id: convoId,
    type: "direct",
  });
  await db.insert(conversationMembers).values({ id: "member_a", conversationId: convoId, userId: idA });
  await db.insert(conversationMembers).values({ id: "member_b", conversationId: convoId, userId: idB });

  // 6. VERIFY ISCONVERSATIONBLOCKED & ISBLOCKED HELPERS
  console.log("\n--- Checking Blocking Helpers ---");
  const isConvoBlocked = await isConversationBlocked(idA, convoId);
  const isBlockedRel = await isBlocked(idA, idB);
  console.log("isConversationBlocked(A, convo) (expect true):", isConvoBlocked);
  console.log("isBlocked(A, B) (expect true):", isBlockedRel);
  if (!isConvoBlocked || !isBlockedRel) {
    throw new Error("Blocking helpers reported incorrect status");
  }

  // 7. STORIES VISIBILITY & VIEW GUARDS
  console.log("\n--- Testing Stories Visibility & Views Filtering ---");
  // A publishes a story
  const storyId = "story_test_a";
  await db.insert(stories).values({
    id: storyId,
    userId: idA,
    mediaUrl: "http://example.com/story.jpg",
    mediaType: "image",
    expiresAt: new Date(Date.now() + 3600 * 1000), // expires in 1 hour
  });

  // B attempts to fetch A's stories feed
  const storiesFeedRes = await app.inject({
    method: "GET",
    url: "/stories",
    headers: { authorization: `Bearer ${tokenB}` },
  });
  console.log("Stories feed blocked payload:", storiesFeedRes.payload);
  const storiesFeed = JSON.parse(storiesFeedRes.payload);
  const containsStory = storiesFeed.some((s: any) => s.id === storyId);
  console.log("Stories feed contains A's story? (expect false):", containsStory);
  if (containsStory) {
    throw new Error("A's story was not filtered from B's stories feed");
  }

  // B attempts to view A's story directly
  const storyViewRes = await app.inject({
    method: "POST",
    url: `/stories/${storyId}/view`,
    headers: { authorization: `Bearer ${tokenB}` },
  });
  console.log("Story view request status code (expect 404):", storyViewRes.statusCode);
  if (storyViewRes.statusCode !== 404) {
    throw new Error("Blocked user was allowed to view the story");
  }

  // 8. UNBLOCK ACTION
  console.log("\n--- Testing Unblock Action ---");
  const unblockRes = await app.inject({
    method: "POST",
    url: "/users/unblock",
    headers: { authorization: `Bearer ${tokenA}` },
    payload: { blockedId: idB },
  });
  console.log("Unblock user B status code (expect 200):", unblockRes.statusCode);
  if (unblockRes.statusCode !== 200) {
    throw new Error("Failed to unblock User B");
  }

  // Verify list of blocked users is empty again
  const blockedListAfterRes = await app.inject({
    method: "GET",
    url: "/users/blocked",
    headers: { authorization: `Bearer ${tokenA}` },
  });
  const blockedListAfter = JSON.parse(blockedListAfterRes.payload);
  console.log("Blocked users count (expect 0):", blockedListAfter.length);
  if (blockedListAfter.length !== 0) {
    throw new Error("Unblocking did not empty the blocked list");
  }

  // 9. VERIFY RESTORED VISIBILITY
  console.log("\n--- Checking Restored Visibility After Unblock ---");
  const discoverPostUnblockRes = await app.inject({
    method: "GET",
    url: "/users/discover",
    headers: { authorization: `Bearer ${tokenB}` },
  });
  const discoverPostUnblock = JSON.parse(discoverPostUnblockRes.payload);
  const containsAPost = discoverPostUnblock.some((u: any) => u.id === idA);
  console.log("Discover B contains A after unblock? (expect true):", containsAPost);
  if (!containsAPost) {
    throw new Error("Unblocked profile not restored in discover");
  }

  const storiesFeedPostRes = await app.inject({
    method: "GET",
    url: "/stories",
    headers: { authorization: `Bearer ${tokenB}` },
  });
  console.log("Stories feed post unblock payload:", storiesFeedPostRes.payload);
  const storiesFeedPost = JSON.parse(storiesFeedPostRes.payload);
  const containsStoryPost = storiesFeedPost.some((s: any) => s.id === storyId);
  console.log("Stories feed contains A's story after unblock? (expect true):", containsStoryPost);
  if (!containsStoryPost) {
    throw new Error("Story visibility not restored after unblock");
  }

  console.log("\n=== ALL BLOCKING ENFORCEMENT VERIFICATION TESTS PASSED SUCCESSFULLY! ===");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
