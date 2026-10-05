import { isAllowedEmbedUrl } from "@/lib/embed";

export function VideoEmbed({ embedUrl, title }: { embedUrl: string; title: string }) {
  if (!isAllowedEmbedUrl(embedUrl)) {
    return (
      <p className="rounded-2xl border border-line bg-panel px-4 py-6 text-sm text-mist">
        This clip does not have a supported player. The original link is below.
      </p>
    );
  }

  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl border border-line bg-black">
      <iframe
        src={embedUrl}
        title={title}
        className="absolute inset-0 h-full w-full"
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
