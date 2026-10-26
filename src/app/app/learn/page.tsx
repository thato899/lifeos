import { requireUserId } from "@/lib/auth-scope";
import { LearningLab } from "@/components/app/learning-lab";

export default async function LearningPage() {
  await requireUserId();
  return <LearningLab />;
}
