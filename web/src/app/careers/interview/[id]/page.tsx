import InterviewClient from "./InterviewClient";

export function generateStaticParams() {
  return [{ id: "_" }];
}

export default function InterviewPage() {
  return <InterviewClient />;
}
