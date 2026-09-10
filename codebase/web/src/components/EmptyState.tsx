type EmptyStateProps = {
  title: string;
  /** Supporting copy. `message` mirrors the prototype's argument name. */
  hint?: string;
  message?: string;
};

export function EmptyState({ title, hint, message }: EmptyStateProps) {
  const body = hint ?? message;
  return (
    <div className="empty-state" role="status">
      <h3>{title}</h3>
      {body ? <p>{body}</p> : null}
    </div>
  );
}
