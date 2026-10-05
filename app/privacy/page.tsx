import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What GeroForge collects, and what it does not sell.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-4 text-sm leading-6 text-cream">
      <h1 className="text-3xl font-extrabold tracking-tight">Privacy policy</h1>
      <p className="text-mist">
        Last updated 5 October 2026. This policy describes the information this GeroForge site handles. It is written for this product. It is not a substitute for advice from a lawyer in your country.
      </p>

      <h2 className="pt-2 text-lg font-extrabold">Information you give us</h2>
      <p>
        If you create an account, GeroForge assigns a random username. The email address, username, and profile picture are encrypted in the database. The password itself is not stored. Only a one-way hash of the password is stored, so it cannot be turned back into the password. A profile picture is kept only if you add one. Comments, comment likes, and post likes are stored with the account. If a sign-in email is sent, the address is encrypted and a hash of the one-time link is stored until the link expires or is used, and then those records are deleted on a schedule.
      </p>
      <p>GeroForge does not ask for your real name, and it does not ask for payment details. There is no shop on this site.</p>

      <h2 className="pt-2 text-lg font-extrabold">Information collected as you use the site</h2>
      <p>
        Each post has its own unguessable address. Opening a post stores that address token in a cookie named gero_seen, so the shelf can skip it later. If you are signed in, the same visit is stored on the account. The cookie lasts up to 180 days. It is not used for advertising. The feed’s “load more” marker is sealed, so it does not spell out a page number.
      </p>
      <p>
        After you log in, an HTTP-only cookie named forge_session holds a random token. The database stores only a hash of that token. The cookie lasts 30 days unless you sign out sooner. Signing out deletes that session.
      </p>
      <p>
        Text size, contrast, and the other accessibility choices stay in this browser’s local storage. They are not sent to the server. A note that you dismissed the cookie notice is also stored only in this browser.
      </p>
      <p>
        The application does not run an advertising or analytics product, and it does not sell personal information. The computer that hosts the site may keep ordinary connection logs, such as an IP address, the time, and the page requested, as part of running a web server. Rate limits used to slow abusive traffic are kept in memory on the server and are not a profile of you. Feed-fetch logs record the public source address and whether the fetch worked. They are deleted after about 14 days. They are not a history of the pages you opened.
      </p>

      <h2 className="pt-2 text-lg font-extrabold">Public items on the shelf</h2>
      <p>
        Automated posts come from public feeds. For each item GeroForge keeps a title, a short original note, the source name, the category, the link back to the original, an embed address when the item is a video, and a thumbnail address when the source provides one. The article body and the media file are not stored. When a video plays, or a thumbnail loads, your browser contacts that host, and that host may receive your IP address under its own policy. When a story has no picture, the server asks that site for its icon and the shelf shows the icon on a white tile. Your browser loads that icon from GeroForge, not from the other site.
      </p>

      <h2 className="pt-2 text-lg font-extrabold">Who else processes information</h2>
      <p>
        The hosting provider processes the data needed to run the site. If email sign-in is turned on, the email provider receives the address and the message so the sign-in link can be delivered. Embed and thumbnail hosts receive the request your browser makes to them. GeroForge does not control those hosts.
      </p>
      <p>
        For visitors in the European Economic Area, the United Kingdom, or a similar region, the operator relies on the account contract for account data, and on the legitimate interest of running a safe shelf and remembering which posts you opened, for the other items above. You can also complain to a data-protection regulator where you live.
      </p>

      <h2 className="pt-2 text-lg font-extrabold">How long information is kept</h2>
      <p>
        A session ends when it expires or you sign out. Expired sessions, used or expired sign-in links, and old feed-fetch logs are deleted on a schedule. Account details, comments, likes, and seen posts stay until the account is deleted. Deleting an account removes the account record and the comments, likes, sessions, and seen posts tied to it.
      </p>

      <h2 className="pt-2 text-lg font-extrabold">Children</h2>
      <p>GeroForge is not directed at children under 16. Do not create an account if you are under 16.</p>

      <h2 className="pt-2 text-lg font-extrabold">Your choices</h2>
      <p>
        You can sign out at any time. You can also read the{" "}
        <Link href="/terms" className="font-semibold text-copper">
          terms of service
        </Link>{" "}
        and the{" "}
        <Link href="/copyright" className="font-semibold text-copper">
          copyright page
        </Link>
        .
      </p>
    </article>
  );
}
