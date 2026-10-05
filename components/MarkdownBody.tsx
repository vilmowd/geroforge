export function MarkdownBody({ markdown }: { markdown: string }) {
  const blocks = markdown
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (blocks.length === 0) return null;

  return (
    <div className="space-y-5 text-[17px] leading-8 text-cream/90">
      {blocks.map((block) => {
        if (block.startsWith("## ")) {
          return (
            <h2 key={block} className="font-serif text-2xl text-cream">
              {block.slice(3)}
            </h2>
          );
        }
        const lines = block.split("\n");
        if (lines.every((line) => line.startsWith("- "))) {
          return (
            <ul key={block} className="list-disc space-y-2 pl-5">
              {lines.map((line) => (
                <li key={line}>
                  <Inline text={line.slice(2)} />
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={block}>
            <Inline text={block} />
          </p>
        );
      })}
    </div>
  );
}

function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={`${part}-${index}`} className="font-semibold text-cream">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    ),
  );
}
