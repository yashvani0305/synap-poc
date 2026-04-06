// src/routes/event.routes.js
import express from "express";
import {
  handleEvent,
  getMyEvents,
  getEventById,
  castVote,
  getPollResults,
  submitQuizAnswer,
  getMyQuizAnswer,
  getQuizAllAnswers,
} from "../controller/event.controller.js";

const router = express.Router();

// POST  /api/event        — create or update a quiz/poll (CQRS command)
router.post("/", handleEvent);

// GET   /api/event        — get all events for the logged-in user (CQRS query)
router.get("/", getMyEvents);

// POST  /api/event/:id/vote     — cast a vote on a poll option (CQRS command)
router.post("/:id/vote", castVote);

// GET   /api/event/:id/results  — get vote counts + percentages for a poll (CQRS query)
router.get("/:id/results", getPollResults);

// POST  /api/event/:id/answer    — submit answer to a quiz (CQRS command)
router.post("/:id/answer", submitQuizAnswer);

// GET   /api/event/:id/my-answer — get logged-in user's own answer (CQRS query)
router.get("/:id/my-answer", getMyQuizAnswer);

// GET   /api/event/:id/answers   — creator only: all user answers + summary (CQRS query)
router.get("/:id/answers", getQuizAllAnswers);

// GET   /api/event/:id   — get a single event by id (CQRS query)
router.get("/:id", getEventById);

export default router;
