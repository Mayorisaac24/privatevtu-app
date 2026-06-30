export interface ContentSection {
  id: string;
  title: string;
  paragraphs: string[];
  bullets: string[];
}

function slugify(title: string, index: number) {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${base || 'section'}-${index}`;
}

function appendLinesToSection(section: ContentSection, lines: string[]) {
  let paraBuf: string[] = [];

  const flushPara = () => {
    if (paraBuf.length) {
      section.paragraphs.push(paraBuf.join(' '));
      paraBuf = [];
    }
  };

  for (const line of lines) {
    const bulletMatch = line.match(/^[-•*]\s+(.+)$/);
    if (bulletMatch) {
      flushPara();
      section.bullets.push(bulletMatch[1].trim());
    } else {
      paraBuf.push(line);
    }
  }

  flushPara();
}

export function parseContentPageBody(body: string): ContentSection[] {
  const normalized = body.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  const blocks = normalized.split(/\n\n+/).map((block) => block.trim()).filter(Boolean);
  const sections: ContentSection[] = [];
  let current: ContentSection | null = null;

  const pushCurrent = () => {
    if (!current) return;
    if (current.paragraphs.length || current.bullets.length) {
      sections.push(current);
    }
    current = null;
  };

  for (const block of blocks) {
    const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
    if (!lines.length) continue;

    const headingMatch = lines[0].match(/^(?:#{1,3}\s+|\*\*)(.+?)(?:\*\*)?$/);
    if (headingMatch) {
      pushCurrent();
      const title = headingMatch[1].trim();
      current = {
        id: slugify(title, sections.length),
        title,
        paragraphs: [],
        bullets: [],
      };
      if (lines.length > 1) appendLinesToSection(current, lines.slice(1));
      continue;
    }

    if (!current) {
      current = {
        id: slugify('overview', sections.length),
        title: 'Overview',
        paragraphs: [],
        bullets: [],
      };
    }
    appendLinesToSection(current, lines);
  }

  pushCurrent();
  return sections;
}

export function formatContentUpdatedAt(iso: string | null | undefined) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
