import {
  createActionPlanSchema,
  createGoalSchema,
  updateGoalProgressSchema,
  updateGoalSchema,
} from "@/lib/validation/goal";
import {
  createActionPlan,
  createGoal,
  updateGoal,
  updateGoalProgress,
} from "@/services/goal.service";
import { defineTool } from "../types";

export const createGoalTool = defineTool({
  name: "create_goal",
  title: "Create a goal",
  description:
    "Use this when the user states a new goal, e.g. 'create a goal to save R20,000 by December'. targetDate is an ISO datetime. Optionally include milestones as an initial breakdown.",
  inputSchema: createGoalSchema,
  riskLevel: "low_write",
  untrustedOutput: true,
  summarize: (input) => `Created goal "${input.title}"`,
  execute: (userId, input, actor) => createGoal(userId, input, actor),
});

export const updateGoalTool = defineTool({
  name: "update_goal",
  title: "Update a goal",
  description:
    "Use this to change a goal's title, description, category, status, or target date.",
  inputSchema: updateGoalSchema,
  riskLevel: "low_write",
  untrustedOutput: true,
  summarize: (input) => `Updated goal ${input.goalId}`,
  execute: (userId, input, actor) => updateGoal(userId, input, actor),
});

export const updateGoalProgressTool = defineTool({
  name: "update_goal_progress",
  title: "Update goal progress",
  description:
    "Use this to set a goal's progress as a percentage (0-100), e.g. after the user reports progress toward it.",
  inputSchema: updateGoalProgressSchema,
  riskLevel: "low_write",
  untrustedOutput: true,
  summarize: (input) =>
    `Set progress on goal ${input.goalId} to ${input.progress}%`,
  execute: (userId, input, actor) => updateGoalProgress(userId, input, actor),
});

export const createActionPlanTool = defineTool({
  name: "create_action_plan",
  title: "Create an action plan for a goal",
  description:
    "Use this when the user wants concrete next steps toward a goal, e.g. 'create an action plan for my goal to launch my website'. Turns the goal's incomplete milestones into tasks, or — if it has none yet — proposes a small starting set of tasks from LifeOS's planning heuristic, and links every task it creates back to the goal.",
  inputSchema: createActionPlanSchema,
  riskLevel: "low_write",
  untrustedOutput: true,
  summarize: (input) => `Created an action plan for goal ${input.goalId}`,
  execute: (userId, input, actor) =>
    createActionPlan(userId, input.goalId, actor),
});

export const goalTools = [
  createGoalTool,
  updateGoalTool,
  updateGoalProgressTool,
  createActionPlanTool,
];
