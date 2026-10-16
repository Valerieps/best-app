import { Icon, type IconName } from './Icon';

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
}: {
  icon: IconName;
  label: string;
  onClick(): void;
  disabled?: boolean;
  pressed?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={`icon-button icon-button--sm icon-action ${pressed ? 'icon-action--on' : ''} ${className ?? ''}`}
      aria-label={label}
      aria-pressed={pressed}
      data-tip={label}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon name={icon} />
    </button>
  );
}
