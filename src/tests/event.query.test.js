import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("/Users/reyna/work/synapp-poc/src/config/db.js", () => ({
  default: { from: vi.fn() },
}));

import SQL from "/Users/reyna/work/synapp-poc/src/config/db.js";
import {
  getEventsByUserQuery,
  getEventByIdQuery,
  getPollResultsQuery,
  getMyQuizAnswerQuery,
  getQuizAllAnswersQuery,
} from "../services/event/event.query.service.js";

beforeEach(() => vi.clearAllMocks());

const mockSelect = (returnValue) => {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue(returnValue),
    single: vi.fn().mockResolvedValue(returnValue),
  };
  return chain;
};

// ─── GET EVENTS BY USER ────────────────────────────────────────────────────
describe("getEventsByUserQuery", () => {
  it("returns events for user", async () => {
    const chain = mockSelect({ data: [{ id: "e1" }, { id: "e2" }], error: null });
    SQL.from.mockReturnValue(chain);

    const result = await getEventsByUserQuery("u1");
    expect(result).toHaveLength(2);
  });

  it("throws if Supabase returns error", async () => {
    const chain = mockSelect({ data: null, error: { message: "db error" } });
    SQL.from.mockReturnValue(chain);

    await expect(getEventsByUserQuery("u1")).rejects.toMatchObject({ message: "db error" });
  });
});

// ─── GET EVENT BY ID ───────────────────────────────────────────────────────
describe("getEventByIdQuery", () => {
  it("returns event by id", async () => {
    const chain = mockSelect({ data: { id: "e1", event_name: "quiz" }, error: null });
    SQL.from.mockReturnValue(chain);

    const result = await getEventByIdQuery("e1");
    expect(result.id).toBe("e1");
  });

  it("throws on error", async () => {
    const chain = mockSelect({ data: null, error: { message: "not found" } });
    SQL.from.mockReturnValue(chain);

    await expect(getEventByIdQuery("bad-id")).rejects.toMatchObject({ message: "not found" });
  });
});

// ─── GET POLL RESULTS ──────────────────────────────────────────────────────
describe("getPollResultsQuery", () => {
  it("throws if event is not a poll", async () => {
    const chain = mockSelect({ data: { id: "e1", event_name: "quiz", options: [] }, error: null });
    SQL.from.mockReturnValue(chain);

    await expect(getPollResultsQuery("e1")).rejects.toThrow("Results are only available for polls");
  });

  it("calculates percentages correctly", async () => {
    const options = ["JS", "Python", "Go", "Rust"];
    const pollChain = mockSelect({ data: { id: "e1", event_name: "poll", question: "Q?", options }, error: null });
    const votesData = [{ option_index: 0 }, { option_index: 0 }, { option_index: 1 }];
    const votesChain = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ data: votesData, error: null }) };

    SQL.from
      .mockReturnValueOnce(pollChain)
      .mockReturnValueOnce(votesChain);

    const result = await getPollResultsQuery("e1");

    expect(result.totalVotes).toBe(3);
    expect(result.results[0].votes).toBe(2);
    expect(result.results[0].percentage).toBe(66.67);
    expect(result.results[1].votes).toBe(1);
    expect(result.results[1].percentage).toBe(33.33);
  });

  it("returns 0% for all options when no votes", async () => {
    const options = ["JS", "Python", "Go", "Rust"];
    const pollChain = mockSelect({ data: { id: "e1", event_name: "poll", question: "Q?", options }, error: null });
    const votesChain = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ data: [], error: null }) };

    SQL.from
      .mockReturnValueOnce(pollChain)
      .mockReturnValueOnce(votesChain);

    const result = await getPollResultsQuery("e1");

    expect(result.totalVotes).toBe(0);
    result.results.forEach(r => expect(r.percentage).toBe(0));
  });
});

// ─── GET MY QUIZ ANSWER ────────────────────────────────────────────────────
describe("getMyQuizAnswerQuery", () => {
  it("throws if event is not a quiz", async () => {
    const chain = mockSelect({ data: { id: "e1", event_name: "poll", options: [] }, error: null });
    SQL.from.mockReturnValue(chain);

    await expect(getMyQuizAnswerQuery("e1", "u1")).rejects.toThrow("This is not a quiz");
  });

  it("returns answered: false when user has not answered", async () => {
    const eventChain = mockSelect({ data: { id: "e1", event_name: "quiz", question: "Q?", options: ["a","b","c","d"] }, error: null });
    const answerChain = mockSelect({ data: null, error: { message: "no rows" } });

    SQL.from
      .mockReturnValueOnce(eventChain)
      .mockReturnValueOnce(answerChain);

    const result = await getMyQuizAnswerQuery("e1", "u1");
    expect(result.answered).toBe(false);
  });

  it("returns answer details when user has answered", async () => {
    const options = ["1", "2", "4", "8"];
    const eventChain = mockSelect({ data: { id: "e1", event_name: "quiz", question: "2+2?", options }, error: null });
    const answerChain = mockSelect({ data: { option_index: 2, created_at: "2026-04-10T10:00:00Z" }, error: null });

    SQL.from
      .mockReturnValueOnce(eventChain)
      .mockReturnValueOnce(answerChain);

    const result = await getMyQuizAnswerQuery("e1", "u1");
    expect(result.answered).toBe(true);
    expect(result.optionIndex).toBe(2);
    expect(result.selectedOption).toBe("4");
  });
});

// ─── GET ALL QUIZ ANSWERS ──────────────────────────────────────────────────
describe("getQuizAllAnswersQuery", () => {
  it("throws if not the creator", async () => {
    const chain = mockSelect({ data: { id: "e1", event_name: "quiz", user_id: "creator-id", options: [] }, error: null });
    SQL.from.mockReturnValue(chain);

    await expect(getQuizAllAnswersQuery("e1", "other-user")).rejects.toThrow("Only the quiz creator can view all answers");
  });

  it("returns summary with correct percentages", async () => {
    const options = ["1", "2", "4", "8"];
    const eventChain = mockSelect({ data: { id: "e1", event_name: "quiz", question: "2+2?", options, user_id: "creator" }, error: null });
    const answersChain = mockSelect({
      data: [
        { user_id: "u1", option_index: 2, created_at: "2026-04-10T10:00:00Z" },
        { user_id: "u2", option_index: 2, created_at: "2026-04-10T10:01:00Z" },
        { user_id: "u3", option_index: 1, created_at: "2026-04-10T10:02:00Z" },
      ],
      error: null,
    });

    SQL.from
      .mockReturnValueOnce(eventChain)
      .mockReturnValueOnce(answersChain);

    const result = await getQuizAllAnswersQuery("e1", "creator");

    expect(result.totalAnswers).toBe(3);
    expect(result.summary[2].count).toBe(2);
    expect(result.summary[2].percentage).toBe(66.67);
    expect(result.responses).toHaveLength(3);
  });
});
