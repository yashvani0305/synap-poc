import SQL from "../../config/db.js";

export const getEventsByUserQuery = async (userId) => {
  const { data, error } = await SQL.from("events")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data;
};

export const getEventByIdQuery = async (eventId) => {
  const { data, error } = await SQL.from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (error) throw error;

  return data;
};

export const getMyQuizAnswerQuery = async (eventId, userId) => {
  const { data: event, error: eventError } = await SQL.from("events")
    .select("id, question, options, event_name")
    .eq("id", eventId)
    .single();

  if (eventError || !event) throw new Error("Quiz not found");
  if (event.event_name !== "quiz") throw new Error("This is not a quiz");

  const { data: answer, error: answerError } = await SQL.from("quiz_answers")
    .select("option_index, created_at")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .single();

  if (answerError || !answer) {
    return { eventId, question: event.question, answered: false };
  }

  return {
    eventId,
    question: event.question,
    answered: true,
    optionIndex: answer.option_index,
    selectedOption: event.options[answer.option_index],
    answeredAt: answer.created_at,
  };
};

export const getQuizAllAnswersQuery = async (eventId, requestingUserId) => {
  const { data: event, error: eventError } = await SQL.from("events")
    .select("id, question, options, event_name, user_id")
    .eq("id", eventId)
    .single();

  if (eventError || !event) throw new Error("Quiz not found");
  if (event.event_name !== "quiz") throw new Error("This is not a quiz");
  if (event.user_id !== requestingUserId) throw new Error("Only the quiz creator can view all answers");

  const { data: answers, error: answerError } = await SQL.from("quiz_answers")
    .select("user_id, option_index, created_at")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (answerError) throw answerError;

  const totalAnswers = answers.length;
  const counts = [0, 0, 0, 0];
  answers.forEach(({ option_index }) => { counts[option_index]++; });

  const summary = event.options.map((option, index) => ({
    option,
    count: counts[index],
    percentage: totalAnswers > 0 ? +((counts[index] / totalAnswers) * 100).toFixed(2) : 0,
  }));

  const responses = answers.map(({ user_id, option_index, created_at }) => ({
    userId: user_id,
    optionIndex: option_index,
    selectedOption: event.options[option_index],
    answeredAt: created_at,
  }));

  return { eventId, question: event.question, totalAnswers, summary, responses };
};

export const getPollResultsQuery = async (eventId) => {
  const { data: poll, error: pollError } = await SQL.from("events")
    .select("id, question, options, event_name")
    .eq("id", eventId)
    .single();

  if (pollError || !poll) throw new Error("Poll not found");
  if (poll.event_name !== "poll") throw new Error("Results are only available for polls");

  const { data: votes, error: voteError } = await SQL.from("poll_votes")
    .select("option_index")
    .eq("event_id", eventId);

  if (voteError) throw voteError;

  const totalVotes = votes.length;
  const counts = [0, 0, 0, 0];
  votes.forEach(({ option_index }) => { counts[option_index] = (counts[option_index] || 0) + 1; });

  const results = poll.options.map((option, index) => ({
    option,
    votes: counts[index],
    percentage: totalVotes > 0 ? +((counts[index] / totalVotes) * 100).toFixed(2) : 0,
  }));

  return { pollId: eventId, question: poll.question, totalVotes, results };
};
