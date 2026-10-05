"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ background: "#f4f0ff", color: "#241b3a", fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
        <h1>GeroForge hit a snag</h1>
        <button type="button" onClick={reset} style={{ marginTop: "1rem" }}>
          Try again
        </button>
      </body>
    </html>
  );
}
