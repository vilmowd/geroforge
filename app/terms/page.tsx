import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of service",
  description: "The rules for using GeroForge, including accounts, comments, embeds, and copyright removal.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-4 text-sm leading-6 text-cream">
      <h1 className="text-3xl font-extrabold tracking-tight">Terms of service</h1>
      <p className="text-mist">
        Last updated 5 October 2026. These terms are the rules for using GeroForge. By browsing the site or creating an account, you agree to them and to the{" "}
        <Link href="/privacy" className="font-semibold text-copper">
          privacy policy
        </Link>
        . They describe this product. They are not legal advice, and they do not promise that every use is lawful in every country.
      </p>

      <h2 className="pt-2 text-lg font-extrabold">The service</h2>
      <p>
        GeroForge is a public shelf of videos, reels, news, and short notes. Each post points back to a source. Visitors can open a post, like it, comment when they have an account, and follow the Original link. The operator may add, remove, or reorder posts, and may stop the site, without notice.
      </p>

      <h2 className="pt-2 text-lg font-extrabold">Who may use it</h2>
      <p>
        You may browse without an account. An account is only for people who are 16 or older. You sign up with an email and a password, and the site assigns a random username. You are responsible for that password and for activity under the account. One person should not create an account for someone else without their permission.
      </p>

      <h2 className="pt-2 text-lg font-extrabold">Comments and likes</h2>
      <p>
        You keep ownership of the comments you write. You give the operator a non-exclusive permission to store, display, and remove those comments on this site for as long as the account or the comment exists. That permission ends for a comment when it is deleted, except for copies already made in a backup that is then deleted on the normal backup cycle.
      </p>
      <p>
        Do not post threats, harassment, private personal data, sexual content involving anyone under 18, or anything you do not have the right to post. Do not try to break the site, scrape it in a way that degrades it, or pretend to be someone else. GeroForge may remove a comment or close an account that breaks these rules.
      </p>

      <h2 className="pt-2 text-lg font-extrabold">Shelf posts are not republications</h2>
      <p>
        GeroForge does not host the original video, reel, audio, or article file. A video or reel plays in the source’s embed player. A story on this site is a short note written here, together with the title used to identify the work, the source name, and a link to the original page. The full text of a copyrighted article is not copied onto this site. Titles, thumbnails, player software, and the underlying works stay the property of their owners. GeroForge does not claim to own them.
      </p>
      <p>
        Thumbnail images are requested by your browser from the source address. GeroForge stores that address so the card can be shown. It does not keep a copy of the media file in its database.
      </p>

      <h2 className="pt-2 text-lg font-extrabold">Fair use and other exceptions</h2>
      <p>
        In the United States, fair use is decided by a court for a particular use. It is not a label the operator can award to the whole site in advance. The shelf is designed so a post identifies a work, comments on it briefly in original words, and sends the reader to the source, rather than standing in for the source. Other countries use different rules, including quotation and illustration exceptions. Those rules also depend on the facts. If a rights holder wants an item removed, the{" "}
        <Link href="/copyright" className="font-semibold text-copper">
          copyright page
        </Link>{" "}
        explains how a post comes off the shelf. A post identified for removal is taken down, whether or not a court has ruled on fair use.
      </p>

      <h2 className="pt-2 text-lg font-extrabold">Other people’s services</h2>
      <p>
        Embeds and thumbnails load from services such as YouTube, TikTok, Instagram, Vimeo, Reddit, and news sites. Those services have their own terms and privacy policies, and they may receive your IP address when your browser contacts them. GeroForge does not control those services. A link to an original page does not mean the operator endorses that page.
      </p>

      <h2 className="pt-2 text-lg font-extrabold">Notes are not professional advice</h2>
      <p>
        Desk notes are short and can be incomplete or out of date. They are not medical, legal, financial, or other professional advice, and they are not a substitute for the original report.
      </p>

      <h2 className="pt-2 text-lg font-extrabold">Disclaimers and liability</h2>
      <p>
        The site is provided as it runs. To the extent the law allows, the operator does not promise that the site will be uninterrupted, error-free, or fit for a particular purpose, and is not liable for indirect or consequential loss arising from use of the site or from a third-party source. Nothing in these terms limits liability that the law does not allow to be limited, including liability for fraud or for death or injury caused by negligence where that limit is prohibited.
      </p>
      <p>
        If you post a comment, you are responsible for it. To the extent the law allows, you will cover the operator’s reasonable losses and costs arising from a claim that your comment was unlawful or infringed someone else’s right, if the operator tells you about the claim and lets you help with the response.
      </p>

      <h2 className="pt-2 text-lg font-extrabold">Changes</h2>
      <p>
        The operator may update these terms by posting a new version on this page. If you keep using the site after that, the new version applies to use from then on. The date at the top is the latest change.
      </p>
    </article>
  );
}
