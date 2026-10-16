import type { ReactNode } from 'react';
import type { Person } from '../../domain/entities';
import { findPerson } from '../../domain/people';
import { routeHash } from '../hooks';
import { usePeople } from '../people/PeopleContext';
import { parseInline, parseLine, type InlineNode, type ListItem } from './markdown';

/** Bullets change with the depth, as in a text editor. */
const BULLETS = ['•', '◦', '▪'];

function renderNodes(nodes: InlineNode[], people: readonly Person[]): ReactNode[] {
  return nodes.map((node, index) => {
    switch (node.type) {
      case 'text':
        return node.text;
      case 'bold':
        return <strong key={index}>{renderNodes(node.children, people)}</strong>;
      case 'italic':
        return <em key={index}>{renderNodes(node.children, people)}</em>;
      case 'link':
        return (
          <a key={index} href={node.href} target="_blank" rel="noopener noreferrer" title={node.href}>
            {renderNodes(node.children, people)}
          </a>
        );
      case 'mention': {
        // A known person opens their page, inside the app; a name nobody has yet is only marked.
        const person = findPerson(node.name, people);
        return person ? (
          <a key={index} className="mention" href={routeHash({ name: 'person', id: person.id })} title={`Abrir a página de ${person.name}`}>
            @{node.name}
          </a>
        ) : (
          <span key={index} className="mention mention--unknown">
            @{node.name}
          </span>
        );
      }
    }
  });
}

/** A list item's bullet or number, indented by its depth: on the formatted line and beside the field being edited. */
export function ListMarker({ list }: { list: ListItem }) {
  return (
    <span className="md-list-marker" style={{ marginLeft: `${list.depth * 1.5}em` }} aria-hidden="true">
      {list.kind === 'bullet' ? BULLETS[list.depth % BULLETS.length] : `${list.number}.`}
    </span>
  );
}

/**
 * A line's Markdown shown formatted, while the line is not being edited. The text is rendered as
 * React elements, never as HTML (google-safe.md).
 */
export function MarkdownText({ text }: { text: string }) {
  const people = usePeople();
  const line = parseLine(text);
  return (
    <>
      {line.list && <ListMarker list={line.list} />}
      <span className="md-content">{renderNodes(parseInline(line.content), people)}</span>
    </>
  );
}
