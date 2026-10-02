import { notFound } from "next/navigation";
import LessonPlayer from "@/components/LessonPlayer";
import { ALL_LESSONS, findLesson } from "@/content/stages";

export function generateStaticParams() {
  return ALL_LESSONS.map((l) => ({ id: l.id }));
}

export default async function LessonPage({ params }: PageProps<"/lesson/[id]">) {
  const { id } = await params;
  const lesson = findLesson(id);
  if (!lesson) notFound();
  return <LessonPlayer lesson={lesson} />;
}
