import { v4 as uuid } from "uuid";
import SQL from "../../config/db.js";

export const createEventCommand = async ({ eventName, eventTitle, userId, question, options }) => {
  if (!["quiz", "poll"].includes(eventName)) {
    throw new Error("eventName must be 'quiz' or 'poll'");
  }

  if (!eventTitle || typeof eventTitle !== "string") {
    throw new Error("eventTitle is required");
  }

  if (!question || typeof question !== "string") {
    throw new Error("question is required");
  }

  if (!Array.isArray(options) || options.length !== 4) {
    throw new Error("options must be an array of exactly 4 items");
  }

  const eventId = uuid();

  const { error } = await SQL.from("events").insert([
    {
      id: eventId,
      event_name: eventName,
      event_title: eventTitle,
      type: "create",
      user_id: userId,
      question,
      options,
    },
  ]);

  if (error) throw error;

  return { eventId, eventName, eventTitle, type: "create", userId, question, options };
};

export const castVoteCommand = async ({ eventId, userId, optionIndex }) => {
  if (optionIndex === undefined || optionIndex === null) {
    throw new Error("optionIndex is required");
  }

  if (![0, 1, 2, 3].includes(Number(optionIndex))) {
    throw new Error("optionIndex must be 0, 1, 2, or 3");
  }

  const { data: event, error: fetchError } = await SQL.from("events")
    .select("id, event_name")
    .eq("id", eventId)
    .single();

  if (fetchError || !event) throw new Error("Poll not found");
  if (event.event_name !== "poll") throw new Error("Voting is only allowed on polls");

  const { error } = await SQL.from("poll_votes").upsert(
    [{ id: uuid(), event_id: eventId, user_id: userId, option_index: Number(optionIndex) }],
    { onConflict: "event_id,user_id" },
  );

  if (error) throw error;

  return { eventId, userId, optionIndex: Number(optionIndex) };
};

export const submitQuizAnswerCommand = async ({ eventTitle, userId, optionIndex }) => {
  if (optionIndex === undefined || optionIndex === null) {
    throw new Error("optionIndex is required");
  }

  if (![0, 1, 2, 3].includes(Number(optionIndex))) {
    throw new Error("optionIndex must be 0, 1, 2, or 3");
  }

  const { data: event, error: fetchError } = await SQL.from("events")
    .select("id, event_name, options")
    .eq("event_title", eventTitle)
    .single();

  if (fetchError || !event) throw new Error("Quiz not found");
  if (event.event_name !== "quiz") throw new Error("Answer submission is only allowed on quizzes");

  const { error } = await SQL.from("quiz_answers").upsert(
    [{ id: uuid(), event_id: event.id, user_id: userId, option_index: Number(optionIndex) }],
    { onConflict: "event_id,user_id" },
  );

  if (error) throw error;

  return {
    eventId: event.id,
    eventTitle,
    userId,
    optionIndex: Number(optionIndex),
    selectedOption: event.options[Number(optionIndex)],
  };
};

export const updateEventCommand = async ({ eventId, userId, question, options }) => {
  if (!eventId) throw new Error("eventId is required for update");

  const { data: existing, error: fetchError } = await SQL.from("events")
    .select("*")
    .eq("id", eventId)
    .eq("user_id", userId)
    .single();

  if (fetchError || !existing) throw new Error("Event not found or not owned by user");

  const updates = {};
  if (question) updates.question = question;
  if (Array.isArray(options) && options.length === 4) updates.options = options;
  updates.updated_at = new Date().toISOString();

  const { error } = await SQL.from("events").update(updates).eq("id", eventId);

  if (error) throw error;

  return { eventId, ...updates };
};
