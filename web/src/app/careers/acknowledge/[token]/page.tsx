import AcknowledgeClient from "./AcknowledgeClient";

export function generateStaticParams() {
  return [{ token: "_" }];
}

export default function AcknowledgePage() {
  return <AcknowledgeClient />;
}
