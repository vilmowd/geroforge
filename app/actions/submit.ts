"use server";

export type SubmitState = { error: string };

export async function submitLink(_prev: SubmitState, _formData: FormData): Promise<SubmitState> {
  return { error: "Submissions are closed. You can still comment on posts." };
}
