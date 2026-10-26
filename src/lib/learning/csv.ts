import { CURRICULUM, type PracticeAttempt, type TopicId } from "./curriculum";

const HEADER = "topicId,score,daysAgo,minutes";
const validTopicIds = new Set<string>(CURRICULUM.map((topic) => topic.id));

export function parsePracticeCsv(csv: string): PracticeAttempt[] {
  const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2 || lines[0] !== HEADER) {
    throw new Error(`Use this exact header: ${HEADER}`);
  }
  if (lines.length > 5001) throw new Error("Import is limited to 5,000 practice records.");

  return lines.slice(1).map((line, index) => {
    const columns = line.split(",").map((value) => value.trim());
    if (columns.length !== 4) throw new Error(`Row ${index + 2}: expected four comma-separated values.`);
    const [topicId, rawScore, rawDaysAgo, rawMinutes] = columns;
    const score = Number(rawScore);
    const daysAgo = Number(rawDaysAgo);
    const minutes = Number(rawMinutes);
    if (!validTopicIds.has(topicId)) throw new Error(`Row ${index + 2}: unknown topic “${topicId}”.`);
    if (!Number.isFinite(score) || score < 0 || score > 100) throw new Error(`Row ${index + 2}: score must be between 0 and 100.`);
    if (!Number.isFinite(daysAgo) || daysAgo < 0 || daysAgo > 3650) throw new Error(`Row ${index + 2}: daysAgo must be between 0 and 3650.`);
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 180) throw new Error(`Row ${index + 2}: minutes must be between 1 and 180.`);
    return { topicId: topicId as TopicId, score, daysAgo, minutes };
  });
}

export function practiceCsv(attempts: PracticeAttempt[]) {
  return [HEADER, ...attempts.map(({ topicId, score, daysAgo, minutes }) => `${topicId},${score},${daysAgo},${minutes}`)].join("\n");
}
