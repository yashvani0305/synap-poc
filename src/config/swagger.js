// src/config/swagger.js
import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Synapp POC API",
      version: "1.0.0",
      description: "Auth, Quiz, and Poll event API with CQRS and JWT",
    },
    servers: [{ url: process.env.API_BASE_URL || `http://localhost:${process.env.PORT}` }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        SignupRequest: {
          type: "object",
          required: ["username", "password"],
          properties: {
            username: { type: "string", example: "testuser" },
            password: { type: "string", example: "pass123" },
          },
        },
        LoginRequest: {
          type: "object",
          required: ["username", "password"],
          properties: {
            username: { type: "string", example: "testuser" },
            password: { type: "string", example: "pass123" },
          },
        },
        LoginResponse: {
          type: "object",
          properties: {
            jwtToken: { type: "string" },
            matrixToken: { type: "string" },
            userId: { type: "string", format: "uuid" },
          },
        },
        EventCreateRequest: {
          type: "object",
          required: ["eventName", "eventTitle", "type", "question", "options"],
          properties: {
            eventName: {
              type: "string",
              enum: ["quiz", "poll"],
              example: "poll",
            },
            eventTitle: { type: "string", example: "Friday Fun Poll" },
            type: { type: "string", enum: ["create"], example: "create" },
            question: { type: "string", example: "Favourite language?" },
            options: {
              type: "array",
              items: { type: "string" },
              minItems: 4,
              maxItems: 4,
              example: ["JavaScript", "Python", "Go", "Rust"],
            },
          },
        },
        EventUpdateRequest: {
          type: "object",
          required: ["eventName", "type", "eventId"],
          properties: {
            eventName: { type: "string", enum: ["quiz", "poll"] },
            type: { type: "string", enum: ["update"], example: "update" },
            eventId: { type: "string", format: "uuid" },
            question: { type: "string" },
            options: {
              type: "array",
              items: { type: "string" },
              minItems: 4,
              maxItems: 4,
            },
          },
        },
        EventResponse: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            event_name: { type: "string", enum: ["quiz", "poll"] },
            event_title: { type: "string" },
            type: { type: "string" },
            user_id: { type: "string", format: "uuid" },
            question: { type: "string" },
            options: { type: "array", items: { type: "string" } },
            created_at: { type: "string", format: "date-time" },
          },
        },
        VoteRequest: {
          type: "object",
          required: ["optionIndex"],
          properties: {
            optionIndex: {
              type: "integer",
              minimum: 0,
              maximum: 3,
              example: 2,
            },
          },
        },
        PollResultOption: {
          type: "object",
          properties: {
            option: { type: "string" },
            votes: { type: "integer" },
            percentage: { type: "number", example: 40.0 },
          },
        },
        PollResultsResponse: {
          type: "object",
          properties: {
            pollId: { type: "string", format: "uuid" },
            question: { type: "string" },
            totalVotes: { type: "integer" },
            results: {
              type: "array",
              items: { $ref: "#/components/schemas/PollResultOption" },
            },
          },
        },
        Error: {
          type: "object",
          properties: {
            error: { type: "string" },
          },
        },
      },
    },
    paths: {
      // ─── AUTH ───────────────────────────────────────────────────
      "/api/auth/signup": {
        post: {
          tags: ["Auth"],
          summary: "Register a new user",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SignupRequest" },
              },
            },
          },
          responses: {
            200: {
              description: "User created",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      message: { type: "string" },
                      userId: { type: "string", format: "uuid" },
                      matrixUserId: { type: "string" },
                    },
                  },
                },
              },
            },
            400: {
              description: "Bad request",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },
      "/api/auth/login": {
        post: {
          tags: ["Auth"],
          summary: "Login and receive JWT + Matrix token",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginRequest" },
              },
            },
          },
          responses: {
            200: {
              description: "Login successful",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/LoginResponse" },
                },
              },
            },
            401: {
              description: "Invalid credentials",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      // ─── LOGIN1 (Matrix direct) ──────────────────────────────────
      "/api/auth/login1": {
        post: {
          tags: ["Auth"],
          summary: "Login directly via Matrix — returns Matrix access token",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginRequest" },
                example: { username: "testuser", password: "pass123" },
              },
            },
          },
          responses: {
            200: {
              description: "Matrix login successful",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      accessToken: { type: "string" },
                      userId: { type: "string" },
                      deviceId: { type: "string" },
                    },
                  },
                },
              },
            },
            500: {
              description: "Matrix login failed",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
            },
          },
        },
      },

      // ─── LOGOUT ─────────────────────────────────────────────────
      "/api/auth/logout": {
        post: {
          tags: ["Auth"],
          summary: "Logout — invalidates JWT and Matrix session",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "x-matrix-token",
              in: "header",
              required: false,
              description: "Matrix access token received at login — invalidates the Matrix session server-side",
              schema: { type: "string" },
            },
          ],
          responses: {
            200: {
              description: "Logged out successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      message: { type: "string", example: "Logged out successfully" },
                    },
                  },
                },
              },
            },
            401: { description: "Invalid or missing JWT" },
            500: {
              description: "Server error",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
            },
          },
        },
      },

      // ─── EVENTS ─────────────────────────────────────────────────
      "/api/event": {
        post: {
          tags: ["Event"],
          summary: "Create or update a quiz / poll",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  oneOf: [
                    { $ref: "#/components/schemas/EventCreateRequest" },
                    { $ref: "#/components/schemas/EventUpdateRequest" },
                  ],
                },
                examples: {
                  createPoll: {
                    summary: "Create a poll",
                    value: {
                      eventName: "poll",
                      eventTitle: "Friday Fun Poll",
                      type: "create",
                      question: "Favourite language?",
                      options: ["JavaScript", "Python", "Go", "Rust"],
                    },
                  },
                  createQuiz: {
                    summary: "Create a quiz",
                    value: {
                      eventName: "quiz",
                      eventTitle: "Math Quiz Round 1",
                      type: "create",
                      question: "What is 2 + 2?",
                      options: ["1", "2", "4", "8"],
                    },
                  },
                  updateEvent: {
                    summary: "Update an existing event",
                    value: {
                      eventName: "quiz",
                      type: "update",
                      eventId: "uuid-here",
                      question: "Updated question?",
                      options: ["A", "B", "C", "D"],
                    },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: "Event created",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      data: { $ref: "#/components/schemas/EventResponse" },
                    },
                  },
                },
              },
            },
            200: { description: "Event updated" },
            400: {
              description: "Validation error",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            401: { description: "Unauthorized" },
          },
        },
        get: {
          tags: ["Event"],
          summary: "Get all events for the logged-in user",
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "List of events",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      events: {
                        type: "array",
                        items: { $ref: "#/components/schemas/EventResponse" },
                      },
                    },
                  },
                },
              },
            },
            401: { description: "Unauthorized" },
          },
        },
      },
      "/api/event/{id}": {
        get: {
          tags: ["Event"],
          summary: "Get a single event by ID",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            200: {
              description: "Event details",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      event: { $ref: "#/components/schemas/EventResponse" },
                    },
                  },
                },
              },
            },
            401: { description: "Unauthorized" },
            500: { description: "Not found or error" },
          },
        },
      },

      // ─── POLL VOTING ─────────────────────────────────────────────
      "/api/event/{id}/vote": {
        post: {
          tags: ["Poll"],
          summary:
            "Cast a vote on a poll option (one vote per user, re-vote updates choice)",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "Poll event ID",
              schema: { type: "string", format: "uuid" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/VoteRequest" },
                example: { optionIndex: 2 },
              },
            },
          },
          responses: {
            200: {
              description: "Vote recorded",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      data: {
                        type: "object",
                        properties: {
                          eventId: { type: "string", format: "uuid" },
                          userId: { type: "string", format: "uuid" },
                          optionIndex: { type: "integer" },
                        },
                      },
                    },
                  },
                },
              },
            },
            400: {
              description: "Validation error or not a poll",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            401: { description: "Unauthorized" },
          },
        },
      },
      "/api/event/{id}/results": {
        get: {
          tags: ["Poll"],
          summary: "Get vote counts and percentage breakdown for a poll",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "Poll event ID",
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            200: {
              description: "Poll results with percentages",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      data: {
                        $ref: "#/components/schemas/PollResultsResponse",
                      },
                    },
                  },
                  example: {
                    success: true,
                    data: {
                      pollId: "abc-uuid",
                      question: "Favourite language?",
                      totalVotes: 10,
                      results: [
                        { option: "JavaScript", votes: 4, percentage: 40 },
                        { option: "Python", votes: 3, percentage: 30 },
                        { option: "Go", votes: 2, percentage: 20 },
                        { option: "Rust", votes: 1, percentage: 10 },
                      ],
                    },
                  },
                },
              },
            },
            400: {
              description: "Not a poll or not found",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            401: { description: "Unauthorized" },
          },
        },
      },

      // ─── QUIZ ANSWERS ────────────────────────────────────────────
      "/api/event/{id}/answer": {
        post: {
          tags: ["Quiz"],
          summary: "Submit (or update) answer to a quiz question",
          description:
            "One answer per user per quiz. Re-submitting updates the previous choice.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "Quiz event ID",
              schema: { type: "string", format: "text" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["optionIndex"],
                  properties: {
                    optionIndex: {
                      type: "integer",
                      minimum: 0,
                      maximum: 3,
                      description: "Index of the chosen option (0–3)",
                      example: 2,
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Answer saved",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      data: {
                        type: "object",
                        properties: {
                          eventTitle: { type: "string", format: "text" },
                          userId: { type: "string", format: "uuid" },
                          optionIndex: { type: "integer" },
                          selectedOption: { type: "string" },
                        },
                      },
                    },
                  },
                  example: {
                    success: true,
                    data: {
                      eventTitle: "quiz-uuid",
                      userId: "user-uuid",
                      optionIndex: 2,
                      selectedOption: "4",
                    },
                  },
                },
              },
            },
            400: {
              description: "Validation error or not a quiz",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            401: { description: "Unauthorized" },
          },
        },
      },
      "/api/event/{id}/my-answer": {
        get: {
          tags: ["Quiz"],
          summary: "Get your own answer for a quiz",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "Quiz event ID",
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            200: {
              description: "User's answer (or unanswered status)",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      data: {
                        type: "object",
                        properties: {
                          eventTitle: { type: "string", format: "text" },
                          question: { type: "string" },
                          answered: { type: "boolean" },
                          optionIndex: { type: "integer" },
                          selectedOption: { type: "string" },
                          answeredAt: { type: "string", format: "date-time" },
                        },
                      },
                    },
                  },
                  examples: {
                    answered: {
                      summary: "User has answered",
                      value: {
                        success: true,
                        data: {
                          eventTitle: "quiz-uuid",
                          question: "What is 2 + 2?",
                          answered: true,
                          optionIndex: 2,
                          selectedOption: "4",
                          answeredAt: "2026-04-02T10:00:00Z",
                        },
                      },
                    },
                    notAnswered: {
                      summary: "User has not answered yet",
                      value: {
                        success: true,
                        data: {
                          eventTitle: "quiz-uuid",
                          question: "What is 2 + 2?",
                          answered: false,
                        },
                      },
                    },
                  },
                },
              },
            },
            400: {
              description: "Not a quiz or not found",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            401: { description: "Unauthorized" },
          },
        },
      },
      "/api/event/{id}/answers": {
        get: {
          tags: ["Quiz"],
          summary: "Get all user answers for a quiz (creator only)",
          description:
            "Only the creator of the quiz can access this. Returns each user's answer and a per-option summary.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "Quiz event ID",
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            200: {
              description: "All answers with summary breakdown",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      data: {
                        type: "object",
                        properties: {
                          eventTitle: { type: "string", format: "text" },
                          question: { type: "string" },
                          totalAnswers: { type: "integer" },
                          summary: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                option: { type: "string" },
                                count: { type: "integer" },
                                percentage: { type: "number" },
                              },
                            },
                          },
                          responses: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                userId: { type: "string", format: "uuid" },
                                optionIndex: { type: "integer" },
                                selectedOption: { type: "string" },
                                answeredAt: {
                                  type: "string",
                                  format: "date-time",
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                  example: {
                    success: true,
                    data: {
                      eventId: "quiz-uuid",
                      question: "What is 2 + 2?",
                      totalAnswers: 3,
                      summary: [
                        { option: "1", count: 0, percentage: 0 },
                        { option: "2", count: 1, percentage: 33.33 },
                        { option: "4", count: 2, percentage: 66.67 },
                        { option: "8", count: 0, percentage: 0 },
                      ],
                      responses: [
                        {
                          userId: "user-1",
                          optionIndex: 2,
                          selectedOption: "4",
                          answeredAt: "2026-04-02T10:00:00Z",
                        },
                        {
                          userId: "user-2",
                          optionIndex: 2,
                          selectedOption: "4",
                          answeredAt: "2026-04-02T10:01:00Z",
                        },
                        {
                          userId: "user-3",
                          optionIndex: 1,
                          selectedOption: "2",
                          answeredAt: "2026-04-02T10:02:00Z",
                        },
                      ],
                    },
                  },
                },
              },
            },
            400: {
              description: "Not a quiz, not found, or not the creator",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            401: { description: "Unauthorized" },
          },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
