import {
  createRoutineSchema,
  updateRoutineSchema,
} from "@/lib/validation/routine";
import { createRoutine, updateRoutine } from "@/services/routine.service";
import { defineTool } from "../types";

export const createRoutineTool = defineTool({
  name: "create_routine",
  title: "Create a routine",
  description:
    "Use this when the user describes a recurring routine with multiple steps, e.g. a morning routine or weekly shopping trip. steps is an ordered list of { title, estimatedMinutes? }.",
  inputSchema: createRoutineSchema,
  riskLevel: "low_write",
  untrustedOutput: true,
  summarize: (input) =>
    `Created routine "${input.name}" (${input.steps.length} steps)`,
  execute: (userId, input, actor) => createRoutine(userId, input, actor),
});

export const updateRoutineTool = defineTool({
  name: "update_routine",
  title: "Update a routine",
  description:
    "Use this to rename a routine, change its frequency or active state, or replace its steps.",
  inputSchema: updateRoutineSchema,
  riskLevel: "low_write",
  untrustedOutput: true,
  summarize: (input) => `Updated routine ${input.routineId}`,
  execute: (userId, input, actor) => updateRoutine(userId, input, actor),
});

export const routineTools = [createRoutineTool, updateRoutineTool];
