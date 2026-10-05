export class IngestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IngestError";
  }
}

export function toIngestError(error: unknown): IngestError {
  if (error instanceof IngestError) return error;
  if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
    return new IngestError("The source took too long to respond.");
  }
  return new IngestError("Could not reach that link.");
}
