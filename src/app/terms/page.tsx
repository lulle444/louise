import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_OPERATOR, LegalContact, LegalLayout, LegalSection } from "@/components/LegalLayout";

export const metadata: Metadata = { title: "Terms of Use", description: "The rules for using SHIPTRACE and contributing evidence." };

export default function TermsPage() {
  return (
    <LegalLayout eyebrow="Legal" title="Terms of Use" description="By using SHIPTRACE you agree to these terms. They are short on purpose; the important parts are that Ship Scores are not investment advice and that contributions are public.">
      <LegalSection id="service" title="1. The service">
        <p>{LEGAL_OPERATOR} (“SHIPTRACE”, “we”) records publicly available project commitments, evidence about their delivery, and a Ship Score calculated from that evidence using a published methodology. The service is provided free of charge for informational purposes.</p>
      </LegalSection>

      <LegalSection id="not-advice" title="2. Not investment, legal or security advice">
        <p>A Ship Score measures documented delivery against public commitments. It is <span className="text-ink">not</span> an investment recommendation, a rating of financial quality, a security audit, a legal conclusion, or a guarantee of future delivery. Nothing on SHIPTRACE is an offer to buy or sell any asset. Do your own research and consult professionals before making decisions.</p>
        <p>SHIPTRACE never connects to wallets, executes trades, sells tokens, or pays financial rewards. Anyone claiming otherwise in our name is not affiliated with us.</p>
      </LegalSection>

      <LegalSection id="accuracy" title="3. Accuracy and corrections">
        <p>We work from public sources and moderator review, and every factual status carries its source and timestamp. Even so, records can be incomplete or out of date. Where no evidence has been found we say so neutrally; we do not assert wrongdoing. If you believe something is wrong, use the{" "}
          <Link href="/submit?tab=correction" className="text-primary underline underline-offset-4">
            correction process
          </Link>
          . Project representatives are welcome to request corrections but cannot edit statuses or scores directly.</p>
      </LegalSection>

      <LegalSection id="accounts" title="4. Accounts">
        <p>You must provide accurate information, keep your credentials secure, and be at least 16 years old. You are responsible for activity under your account. We may suspend accounts that break these terms.</p>
      </LegalSection>

      <LegalSection id="contributions" title="5. Contributions">
        <ul className="list-disc space-y-1 pl-5">
          <li>Evidence submissions, correction requests and votes are public and attributed to your username.</li>
          <li>You must only submit links to public sources you are entitled to share, and you must disclose any conflict of interest.</li>
          <li>You grant us a worldwide, royalty-free, perpetual licence to display, store and adapt your contributions as part of the record, including after your account is closed (anonymised).</li>
          <li>Submissions never change a verified status by themselves; moderators decide, with published reasons.</li>
        </ul>
      </LegalSection>

      <LegalSection id="conduct" title="6. Acceptable use">
        <p>You must not: submit false or misleading evidence; impersonate others; harass anyone; post unlawful, defamatory or infringing material; attempt to manipulate scores or votes; scrape the service in breach of its rules; interfere with security or rate limits; or use the service to promote financial products.</p>
      </LegalSection>

      <LegalSection id="ip" title="7. Intellectual property">
        <p>The SHIPTRACE name, logo, design and methodology text are ours. Project names and marks belong to their owners and are used only to identify the projects being tracked. Short paraphrases of public commitments and links to sources are used for reporting and commentary; we do not reproduce large copyrighted passages. If you believe content infringes your rights, contact us by <LegalContact />.</p>
      </LegalSection>

      <LegalSection id="availability" title="8. Availability and changes">
        <p>We may change, suspend or discontinue any part of the service, including the scoring formula (which is versioned and published), at any time. We aim for high availability but do not guarantee it.</p>
      </LegalSection>

      <LegalSection id="liability" title="9. Disclaimer and limitation of liability">
        <p>The service is provided “as is” without warranties of any kind. To the fullest extent permitted by law, we are not liable for any loss or damage arising from use of, or reliance on, the service, including financial losses. Nothing in these terms limits liability that cannot be limited by law.</p>
      </LegalSection>

      <LegalSection id="law" title="10. Governing law">
        <p>These terms are governed by the laws of the country in which SHIPTRACE is established, and disputes are subject to the courts of that country, without affecting mandatory consumer protections that apply where you live.</p>
      </LegalSection>

      <LegalSection id="contact" title="11. Contact">
        <p>Questions about these terms: contact us by <LegalContact />.</p>
      </LegalSection>
    </LegalLayout>
  );
}
