import { useEffect, useState } from 'react';
import type { Section } from '../../domain/entities';
import { toSafeHref } from '../components/Linkified';

interface Props {
  section: Section;
  onSave(details: { participants: string; docLink: string }): void;
}

/** Optional participants and document link of a meeting section (1b). */
export function MeetingDetails({ section, onSave }: Props) {
  const [participants, setParticipants] = useState(section.participants ?? '');
  const [docLink, setDocLink] = useState(section.docLink ?? '');

  useEffect(() => setParticipants(section.participants ?? ''), [section.participants]);
  useEffect(() => setDocLink(section.docLink ?? ''), [section.docLink]);

  const save = () => onSave({ participants, docLink });
  const href = docLink.trim() ? toSafeHref(docLink.trim()) : null;

  return (
    <div className="meeting-details">
      <input
        className="meeting-details__field"
        value={participants}
        placeholder="Participantes"
        onChange={(event) => setParticipants(event.target.value)}
        onBlur={save}
        aria-label="Participantes da reunião"
      />
      <input
        className="meeting-details__field"
        value={docLink}
        placeholder="Link para documentos"
        onChange={(event) => setDocLink(event.target.value)}
        onBlur={save}
        aria-label="Link para documentos da reunião"
      />
      {href && (
        <a href={href} target="_blank" rel="noopener noreferrer" className="meeting-details__open">
          abrir
        </a>
      )}
    </div>
  );
}
