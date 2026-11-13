import { Icon, type IconName } from './Icon';
import { cx } from '../classNames';

/**
 * An action shown as an icon, with its name as a tooltip on hover and focus and as the label
 * read by screen readers.
 */
export function IconAction({
  icon,
  label,
  onClick,
  disabled,
  pressed,
  className,
  onBlur,
  title,
}: {
  icon: IconName;
  label: string;
  onClick(): void;
  onBlur?(): void;
  /** A longer explanation than the tooltip's label, read on hover by assistive tools. */
  title?: string;
  disabled?: boolean;
  pressed?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={cx('icon-button icon-button--sm icon-action', pressed && 'icon-action--on', className)}
      aria-label={label}
      aria-pressed={pressed}
      data-tip={label}
      onClick={onClick}
      onBlur={onBlur}
      title={title}
      disabled={disabled}
    >
      <Icon name={icon} />
    </button>
  );
}
