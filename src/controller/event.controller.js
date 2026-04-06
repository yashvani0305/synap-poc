import {
  createEventCommand,
  updateEventCommand,
  castVoteCommand,
  submitQuizAnswerCommand,
} from "../services/event/event.command.service.js";
import {
  getEventsByUserQuery,
  getEventByIdQuery,
  getPollResultsQuery,
  getMyQuizAnswerQuery,
  getQuizAllAnswersQuery,
} from "../services/event/event.query.service.js";

export const handleEvent = async (req, res) => {
  try {
    const { eventName, eventTitle, type, question, options, eventId } = req.body;
    const userId = req.user.userId;

    if (!eventName || !type) {
      return res.status(400).json({ error: "eventName and type are required" });
    }

    if (type === "create") {
      const result = await createEventCommand({ eventName, eventTitle, userId, question, options });
      return res.status(201).json({ success: true, data: result });
    }

    if (type === "update") {
      const result = await updateEventCommand({ eventId, userId, question, options });
      return res.status(200).json({ success: true, data: result });
    }

    return res.status(400).json({ error: "type must be 'create' or 'update'" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getMyEvents = async (req, res) => {
  try {
    const events = await getEventsByUserQuery(req.user.userId);
    res.json({ events });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getEventById = async (req, res) => {
  try {
    const event = await getEventByIdQuery(req.params.id);
    res.json({ event });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const castVote = async (req, res) => {
  try {
    const result = await castVoteCommand({
      eventId: req.params.id,
      userId: req.user.userId,
      optionIndex: req.body.optionIndex,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const getPollResults = async (req, res) => {
  try {
    const results = await getPollResultsQuery(req.params.id);
    res.json({ success: true, data: results });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const submitQuizAnswer = async (req, res) => {
  try {
    const result = await submitQuizAnswerCommand({
      eventTitle: req.params.id,
      userId: req.user.userId,
      optionIndex: req.body.optionIndex,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const getMyQuizAnswer = async (req, res) => {
  try {
    const result = await getMyQuizAnswerQuery(req.params.id, req.user.userId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const getQuizAllAnswers = async (req, res) => {
  try {
    const result = await getQuizAllAnswersQuery(req.params.id, req.user.userId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
