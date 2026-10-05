import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Copyright",
  description: "How GeroForge uses public sources, and how a post comes off the shelf.",
  alternates: { canonical: "/copyright" },
};

export default function CopyrightPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-4 text-sm leading-6 text-cream">
      <h1 className="text-3xl font-extrabold tracking-tight">Copyright</h1>
      <p className="text-mist">Last updated 5 October 2026. This page explains what GeroForge publishes. It is not legal advice, and it is not a court decision about fair use.</p>

      <h2 className="pt-2 text-lg font-extrabold">What appears on a post</h2>
      <p>
        A GeroForge post is a pointer back to someone else’s work, plus a short note written for this shelf. The page can show the title, the source name, a link labeled Original, a thumbnail address supplied by the source, and, for a video or reel, that host’s own embed player. The note is original text. It is not the article, the script, or the soundtrack.
      </p>
      <p>
        GeroForge does not download or store the video, reel, or audio file. It does not store the full text of a source article. The visitor’s browser loads an embed or a thumbnail from the original host. That host keeps the file.
      </p>

      <h2 className="pt-2 text-lg font-extrabold">Fair use</h2>
      <p>
        Fair use is a limit on copyright in the United States. A court decides it case by case. GeroForge does not claim that every post has already been ruled fair use. The shelf is built so it does not replace the original: the note is short, the media stays on the source, and the original page is linked. Other countries have different exceptions, such as quotation or illustration. None of those exceptions is a blanket permission.
      </p>

      <h2 id="notice" className="pt-2 text-lg font-extrabold">
        Removal
      </h2>
      <p>
        A post comes off the public shelf when that exact page is identified for removal. Taking a post down is not an admission that the post was unlawful. United States hosts that want the Digital Millennium Copyright Act safe harbor also register a designated agent with the U.S. Copyright Office. Publishing this page does not by itself complete that registration.
      </p>
      <p>
        The{" "}
        <Link href="/terms" className="font-semibold text-copper">
          terms of service
        </Link>{" "}
        and the{" "}
        <Link href="/privacy" className="font-semibold text-copper">
          privacy policy
        </Link>{" "}
        are part of the same set of rules.
      </p>
    </article>
  );
}
