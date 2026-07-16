import MailboxClient from "./MailboxClient";

export function generateStaticParams() {
  return [{ id: "_" }];
}

export default function MailboxPage() {
  return <MailboxClient />;
}
