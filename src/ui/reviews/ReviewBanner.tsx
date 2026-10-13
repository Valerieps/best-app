import { navigate } from '../hooks';
import type { ReviewNotice } from './reviewNotice';

interface Props {
  notice: ReviewNotice;
  /** "Lembrar depois": hides the band until the next checkout; "Rituais" keeps counting the review. */
  onSnooze(): void;
}

/** Says a review is available and why. Never a notification, and never blocks. */
export function ReviewBanner({ notice, onSnooze }: Props) {
  return (
    <div className="banner" role="status">
      <span>{notice.text}</span>
      <span className="banner__actions">
        <button
          type="button"
          className="link"
          onClick={() => navigate({ name: notice.kind === 'focus' ? 'focusReview' : 'directionReview' })}
        >
          Fazer agora
        </button>
        <button type="button" className="link" onClick={onSnooze}>
          Lembrar depois
        </button>
      </span>
    </div>
  );
}
