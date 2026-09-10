import { ReactNode, useEffect, useState } from 'react';

type SideDrawerProps = {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  side?: 'left' | 'right';
};

export function SideDrawer({ title, open, onClose, children, side = 'right' }: SideDrawerProps) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!open) {
      setEntered(false);
      return;
    }
    const frame = window.requestAnimationFrame(() => setEntered(true));
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    document.body.classList.add('drawer-open');
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('drawer-open');
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={`drawer-overlay${entered ? ' open' : ''}`}
      role="presentation"
      onClick={onClose}
    >
      <aside
        className={`side-drawer${side === 'left' ? ' side-drawer-left' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="side-drawer-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="drawer-header">
          <h2 id="side-drawer-title">{title}</h2>
          <button type="button" className="drawer-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="drawer-body">{children}</div>
      </aside>
    </div>
  );
}
