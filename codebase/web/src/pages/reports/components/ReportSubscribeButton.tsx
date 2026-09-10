import { useState } from 'react';
import { Modal } from '../../../components/Modal';
import { useAuth } from '../../../auth/AuthContext';
import { useMockData } from '../../../mock/MockDataContext';
import {
  findSubscription,
  SUBSCRIBE_FREQUENCIES,
  upsertSubscription,
} from '../../../mock/reportSubscriptionService';

type Props = {
  reportKey: string;
  reportKind?: string;
  reportLabel: string;
  className?: string;
};

export function ReportSubscribeButton({ reportKey, reportKind = 'standard', reportLabel, className }: Props) {
  const { user } = useAuth();
  const { store, refresh } = useMockData();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [frequency, setFrequency] = useState<(typeof SUBSCRIBE_FREQUENCIES)[number]>('weekly');
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  function openModal() {
    if (!user) return;
    const existing = findSubscription(store, user.id, reportKey, reportKind);
    setEmail(existing?.email ?? user.email ?? '');
    setFrequency(existing?.frequency ?? 'weekly');
    setToast('');
    setError('');
    setOpen(true);
  }

  function handleSave() {
    if (!user) return;
    if (!email.trim()) {
      setError('Enter an email address to subscribe.');
      return;
    }
    upsertSubscription(store, {
      userId: user.id,
      reportKey,
      reportKind,
      reportLabel,
      email: email.trim(),
      frequency,
    });
    refresh();
    setToast('Subscription saved.');
    setError('');
    setTimeout(() => setOpen(false), 600);
  }

  return (
    <>
      <button type="button" className={className ?? 'btn btn-secondary btn-sm report-card-btn'} onClick={openModal}>
        Subscribe
      </button>
      <Modal open={open} title="Subscribe to report" onClose={() => setOpen(false)}>
        <p className="text-muted report-subscribe-lead">
          Email a copy of &ldquo;{reportLabel}&rdquo; on a recurring schedule.
        </p>
        <div className="form-group">
          <label htmlFor="report-subscribe-email">Email address</label>
          <input
            id="report-subscribe-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <div className="form-group">
          <label htmlFor="report-subscribe-frequency">Frequency</label>
          <select
            id="report-subscribe-frequency"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as (typeof SUBSCRIBE_FREQUENCIES)[number])}
          >
            {SUBSCRIBE_FREQUENCIES.map((freq) => (
              <option key={freq} value={freq}>
                {freq.charAt(0).toUpperCase() + freq.slice(1)}
              </option>
            ))}
          </select>
        </div>
        {error ? <div className="alert alert-warning">{error}</div> : null}
        {toast ? <div className="alert alert-success">{toast}</div> : null}
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave}>
            Save subscription
          </button>
        </div>
      </Modal>
    </>
  );
}
