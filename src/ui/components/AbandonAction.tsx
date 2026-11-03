import { useState } from 'react';
import { IconAction } from './IconAction';

/**
 * "Abandonar tarefa" as a trash icon: the first click arms it (the icon turns warning-colored),
 * the second confirms. Losing the focus disarms it.
 */
export function AbandonAction({
  onAbandon,
  count,
  disabled,
  className,
}: {
  onAbandon(): void;
  /** Several tasks at once (the selection bar): the labels say how many. */
  count?: number;
  disabled?: boolean;
  className?: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const many = count !== undefined;
  const label = confirming
    ? many
      ? `Confirmar abandono de ${count}`
      : 'Confirmar abandono'
    : many
      ? 'Abandonar as selecionadas'
      : 'Abandonar tarefa';
  return (
    <IconAction
      icon="trash"
      label={label}
      title="Tira a tarefa de circulação sem fazer. O histórico guarda o abandono."
      disabled={disabled}
      pressed={confirming}
      className={`${confirming ? 'active-tasks__abandon--confirm' : ''} ${className ?? ''}`}
      onClick={() => {
        if (!confirming) return setConfirming(true);
        setConfirming(false);
        onAbandon();
      }}
      onBlur={() => setConfirming(false)}
    />
  );
}
