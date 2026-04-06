// src/models/quizAnswer.model.js
// Supabase table: quiz_answers
//
// CREATE TABLE quiz_answers (
//   id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   event_id     UUID NOT NULL REFERENCES events(id),
//   user_id      UUID NOT NULL,
//   option_index INT  NOT NULL CHECK (option_index BETWEEN 0 AND 3),
//   created_at   TIMESTAMPTZ DEFAULT now(),
//   UNIQUE(event_id, user_id)    -- one answer per user per quiz
// );

export const QuizAnswerModel = {
  table: "quiz_answers",

  fields: {
    id: { type: "uuid", primaryKey: true },
    event_id: { type: "uuid", required: true, references: "events(id)" },
    user_id: { type: "uuid", required: true },
    option_index: { type: "int", required: true, min: 0, max: 3 },
    created_at: { type: "timestamptz", default: "now()" },
  },

  constraints: ["UNIQUE(event_id, user_id)"],
};
