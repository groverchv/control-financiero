
/**
 * Componente que resalta en negrita y color amarillo las coincidencias con la búsqueda.
 */
export const HighlightMatch = ({ text = '', query = '' }) => {
  if (!text) return null;
  if (!query || !query.trim()) return <span>{text}</span>;

  // Normalizar para comparación insensible a mayúsculas y acentos
  const normalize = (str) =>
    str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  const normalizedText = normalize(text);
  const normalizedQuery = normalize(query);

  const parts = [];
  let currentPos = 0;

  while (true) {
    const matchIdx = normalizedText.indexOf(normalizedQuery, currentPos);
    if (matchIdx === -1) {
      parts.push({ text: text.slice(currentPos), highlight: false });
      break;
    }

    if (matchIdx > currentPos) {
      parts.push({ text: text.slice(currentPos, matchIdx), highlight: false });
    }

    parts.push({
      text: text.slice(matchIdx, matchIdx + query.length),
      highlight: true
    });

    currentPos = matchIdx + query.length;
  }

  return (
    <span>
      {parts.map((part, idx) =>
        part.highlight ? (
          <mark key={idx} className="bg-yellow-200 text-slate-900 font-semibold px-0.5 rounded">
            {part.text}
          </mark>
        ) : (
          part.text
        )
      )}
    </span>
  );
};
