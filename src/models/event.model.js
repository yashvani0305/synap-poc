// src/models/event.model.js
// Supabase table: events
//
// CREATE TABLE events (
//   id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   event_name   TEXT NOT NULL CHECK (event_name IN ('quiz', 'poll')),
//   event_title  TEXT NOT NULL,
//   type         TEXT NOT NULL CHECK (type IN ('create', 'update')),
//   user_id      UUID NOT NULL REFERENCES users(id),
//   question     TEXT NOT NULL,
//   options      JSONB NOT NULL,       -- array of exactly 4 strings
//   created_at   TIMESTAMPTZ DEFAULT now(),
//   updated_at   TIMESTAMPTZ
// );

export const EventModel = {
  table: "events",

  fields: {
    id: { type: "uuid", primaryKey: true },
    event_name: { type: "text", required: true, enum: ["quiz", "poll"] },
    event_title: { type: "text", required: true },
    type: { type: "text", required: true, enum: ["create", "update"] },
    user_id: { type: "uuid", required: true },
    question: { type: "text", required: true },
    options: { type: "jsonb", required: true, description: "Array of exactly 4 strings" },
    created_at: { type: "timestamptz", default: "now()" },
    updated_at: { type: "timestamptz" },
  },
};
