import { CircleAlert } from 'lucide-react';

/** A failed request, announced to assistive tech. Icon and text, never color alone. */
export function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="message message-error" role="alert">
      <CircleAlert className="message-icon" size={22} aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}
