import type { Metadata } from "next";
import { LEGAL_CONTACT, LEGAL_OPERATOR, LegalLayout, LegalSection } from "@/components/LegalLayout";

export const metadata: Metadata = { title: "Privacy Policy", description: "How SHIPTRACE collects, uses and protects personal data." };

export default function PrivacyPage() {
  return (
    <LegalLayout eyebrow="Legal" title="Privacy Policy" description="What we collect, why, and the choices you have. SHIPTRACE is designed to hold as little personal data as possible.">
      <LegalSection id="who" title="1. Who we are">
        <p>SHIPTRACE is operated by {LEGAL_OPERATOR} (“we”, “us”). We are the data controller for personal data processed through this website. Contact: {LEGAL_CONTACT}.</p>
      </LegalSection>

      <LegalSection id="what" title="2. What we collect">
        <ul className="list-disc space-y-1 pl-5">
          <li><span className="text-ink">Account data</span> if you create an account: email address, a username you choose, a display name, and an optional bio. Passwords are handled by our authentication provider and are never visible to us.</li>
          <li><span className="text-ink">Contributions</span>: evidence submissions, correction requests, votes, and watchlists. Evidence and corrections are public and attributed to your username by design.</li>
          <li><span className="text-ink">Moderation records</span>: decisions, reasons and timestamps attached to a moderator&apos;s account, kept permanently as part of the audit history.</li>
          <li><span className="text-ink">Technical data</span>: IP address, browser type and request logs collected by our hosting provider for security and reliability, retained for a limited period.</li>
          <li><span className="text-ink">Cookies</span>: a session cookie needed to keep you signed in. We do not use advertising cookies. See section 7.</li>
        </ul>
        <p>We never ask for wallet addresses, private keys, holdings, or payment details.</p>
      </LegalSection>

      <LegalSection id="why" title="3. Why we process it">
        <ul className="list-disc space-y-1 pl-5">
          <li>To run the service: sign you in, show your watchlist, publish your submissions, and let moderators review them (performance of our terms with you).</li>
          <li>To keep the record trustworthy: attributing submissions and preserving moderation history (our legitimate interest in accuracy and accountability).</li>
          <li>To keep the service secure and prevent abuse, including rate limiting and spam protection (legitimate interest).</li>
          <li>To answer your requests, including correction and dispute requests (legitimate interest and legal obligations).</li>
        </ul>
      </LegalSection>

      <LegalSection id="public" title="4. What is public">
        <p>Your username, display name, bio, badges, accepted-evidence count, and every evidence submission, correction request and vote count are public. Your watchlist is private unless you make it public. Your email address is never shown publicly.</p>
        <p>Because SHIPTRACE is an audit record, accepted submissions and moderation decisions are retained even if you later delete your account; they are then shown under an anonymised name.</p>
      </LegalSection>

      <LegalSection id="processors" title="5. Who we share data with">
        <ul className="list-disc space-y-1 pl-5">
          <li><span className="text-ink">Vercel</span> hosts the website and processes request logs.</li>
          <li><span className="text-ink">Supabase</span> stores account and application data and provides authentication.</li>
          <li><span className="text-ink">GitHub</span> is queried for public repository metadata about tracked projects, not about you.</li>
        </ul>
        <p>These providers process data on our instructions. We do not sell personal data and do not share it with advertisers. We may disclose data when required by law.</p>
      </LegalSection>

      <LegalSection id="transfers" title="6. International transfers">
        <p>Our providers may process data outside your country, including in the United States. Where required, transfers rely on standard contractual clauses or equivalent safeguards offered by those providers.</p>
      </LegalSection>

      <LegalSection id="cookies" title="7. Cookies">
        <p>We set only strictly necessary cookies: a session cookie that keeps you signed in and expires when the session ends or after 24 hours in preview mode. No analytics or advertising cookies are set. Because these cookies are essential, no consent banner is shown.</p>
      </LegalSection>

      <LegalSection id="retention" title="8. Retention">
        <ul className="list-disc space-y-1 pl-5">
          <li>Account data: for as long as your account exists, then deleted within 30 days of a deletion request.</li>
          <li>Public contributions and moderation records: retained as part of the audit history, anonymised after account deletion.</li>
          <li>Server logs: typically 30 days.</li>
        </ul>
      </LegalSection>

      <LegalSection id="rights" title="9. Your rights">
        <p>Depending on where you live, you may have the right to access, correct, delete, or export your personal data, to object to or restrict processing, and to complain to a supervisory authority. To exercise these rights, contact {LEGAL_CONTACT}. We may need to verify your identity first.</p>
      </LegalSection>

      <LegalSection id="children" title="10. Children">
        <p>SHIPTRACE is not directed at children under 16 and we do not knowingly collect their data.</p>
      </LegalSection>

      <LegalSection id="changes" title="11. Changes">
        <p>We will post any changes on this page and update the date at the top. Material changes will be announced on the site.</p>
      </LegalSection>
    </LegalLayout>
  );
}
