import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("/Users/reyna/work/synapp-poc/src/config/db.js", () => ({
  default: { from: vi.fn() },
}));

vi.mock("uuid", () => ({ v4: () => "mock-uuid-1234" }));

import SQL from "/Users/reyna/work/synapp-poc/src/config/db.js";
import {
  createEventCommand,
  castVoteCommand,
  submitQuizAnswerCommand,
  updateEventCommand,
} from "../services/event/event.command.service.js";

const mockChain = (returnValue) => {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(returnValue),
    insert: vi.fn().mockResolvedValue(returnValue),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockResolvedValue(returnValue),
  };
  return chain;
};

beforeEach(() => vi.clearAllMocks());

// ─── CREATE EVENT ──────────────────────────────────────────────────────────
describe("createEventCommand", () => {
  it("throws if eventName is invalid", async () => {
    await expect(
      createEventCommand({ eventName: "test", eventTitle: "T", userId: "u1", question: "Q?", options: ["a","b","c","d"] })
    ).rejects.toThrow("eventName must be 'quiz' or 'poll'");
  });

  it("throws if eventTitle is missing", async () => {
    await expect(
      createEventCommand({ eventName: "quiz", eventTitle: "", userId: "u1", question: "Q?", options: ["a","b","c","d"] })
    ).rejects.toThrow("eventTitle is required");
  });

  it("throws if options length is not 4", async () => {
    await expect(
      createEventCommand({ eventName: "quiz", eventTitle: "T", userId: "u1", question: "Q?", options: ["a","b","c"] })
    ).rejects.toThrow("options must be an array of exactly 4 items");
  });

  it("throws if question is missing", async () => {
    await expect(
      createEventCommand({ eventName: "quiz", eventTitle: "T", userId: "u1", question: "", options: ["a","b","c","d"] })
    ).rejects.toThrow("question is required");
  });

  it("creates event successfully", async () => {
    const chain = mockChain({ error: null });
    SQL.from.mockReturnValue(chain);

    const result = await createEventCommand({
      eventName: "quiz",
      eventTitle: "Math Quiz",
      userId: "user-1",
      question: "What is 2+2?",
      options: ["1", "2", "4", "8"],
    });

    expect(result.eventId).toBe("mock-uuid-1234");
    expect(result.eventName).toBe("quiz");
    expect(result.eventTitle).toBe("Math Quiz");
  });

  it("throws if Supabase insert returns error", async () => {
    const chain = mockChain({ error: { message: "insert failed" } });
    SQL.from.mockReturnValue(chain);

    await expect(
      createEventCommand({ eventName: "poll", eventTitle: "My Poll", userId: "u1", question: "Q?", options: ["a","b","c","d"] })
    ).rejects.toMatchObject({ message: "insert failed" });
  });
});

// ─── CAST VOTE ─────────────────────────────────────────────────────────────
describe("castVoteCommand", () => {
  it("throws if optionIndex is missing", async () => {
    await expect(castVoteCommand({ eventId: "e1", userId: "u1", optionIndex: undefined })).rejects.toThrow("optionIndex is required");
  });

  it("throws if optionIndex is out of range", async () => {
    await expect(castVoteCommand({ eventId: "e1", userId: "u1", optionIndex: 5 })).rejects.toThrow("optionIndex must be 0, 1, 2, or 3");
  });

  it("throws if event is not a poll", async () => {
    const chain = mockChain({ data: { id: "e1", event_name: "quiz" }, error: null });
    SQL.from.mockReturnValue(chain);

    await expect(castVoteCommand({ eventId: "e1", userId: "u1", optionIndex: 1 })).rejects.toThrow("Voting is only allowed on polls");
  });

  it("casts vote successfully", async () => {
    const selectChain = mockChain({ data: { id: "e1", event_name: "poll" }, error: null });
    const upsertChain = mockChain({ error: null });
    SQL.from
      .mockReturnValueOnce(selectChain)
      .mockReturnValueOnce(upsertChain);

    const result = await castVoteCommand({ eventId: "e1", userId: "u1", optionIndex: 2 });
    expect(result.optionIndex).toBe(2);
    expect(result.eventId).toBe("e1");
  });
});

// ─── SUBMIT QUIZ ANSWER ────────────────────────────────────────────────────
describe("submitQuizAnswerCommand", () => {
  it("throws if optionIndex is missing", async () => {
    await expect(submitQuizAnswerCommand({ eventTitle: "T", userId: "u1", optionIndex: null })).rejects.toThrow("optionIndex is required");
  });

  it("throws if event is not a quiz", async () => {
    const chain = mockChain({ data: { id: "e1", event_name: "poll", options: [] }, error: null });
    SQL.from.mockReturnValue(chain);

    await expect(submitQuizAnswerCommand({ eventTitle: "My Poll", userId: "u1", optionIndex: 0 }))
      .rejects.toThrow("Answer submission is only allowed on quizzes");
  });

  it("submits answer successfully", async () => {
    const options = ["1", "2", "4", "8"];
    const selectChain = mockChain({ data: { id: "quiz-uuid", event_name: "quiz", options }, error: null });
    const upsertChain = mockChain({ error: null });
    SQL.from
      .mockReturnValueOnce(selectChain)
      .mockReturnValueOnce(upsertChain);

    const result = await submitQuizAnswerCommand({ eventTitle: "Math Quiz", userId: "u1", optionIndex: 2 });

    expect(result.optionIndex).toBe(2);
    expect(result.selectedOption).toBe("4");
    expect(result.eventId).toBe("quiz-uuid");
  });
});

// ─── UPDATE EVENT ──────────────────────────────────────────────────────────
describe("updateEventCommand", () => {
  it("throws if eventId is missing", async () => {
    await expect(updateEventCommand({ eventId: null, userId: "u1" })).rejects.toThrow("eventId is required for update");
  });

  it("throws if event not found or not owned", async () => {
    const chain = mockChain({ data: null, error: { message: "not found" } });
    SQL.from.mockReturnValue(chain);

    await expect(updateEventCommand({ eventId: "e1", userId: "u1", question: "Q?" }))
      .rejects.toThrow("Event not found or not owned by user");
  });

  it("updates event successfully", async () => {
    const selectChain = mockChain({ data: { id: "e1", user_id: "u1" }, error: null });
    const updateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    SQL.from
      .mockReturnValueOnce(selectChain)
      .mockReturnValueOnce(updateChain);

    const result = await updateEventCommand({ eventId: "e1", userId: "u1", question: "Updated?" });
    expect(result.eventId).toBe("e1");
    expect(result.question).toBe("Updated?");
  });
});
