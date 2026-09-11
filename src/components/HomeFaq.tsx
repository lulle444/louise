import Link from "next/link";

const FAQ = [
  {
    q: "Is a Ship Score investment advice?",
    a: "No. It measures documented delivery against public commitments. It says nothing about price, returns, or whether to buy or sell anything.",
  },
  {
    q: "How does a milestone become “shipped”?",
    a: "A moderator reviews accepted evidence (a working product, a repository release, official documentation) and records the change with a written reason. Community submissions never change status on their own.",
  },
  {
    q: "What happens when a deadline passes without evidence?",
    a: "The milestone is marked “No qualifying evidence found as of [date]”. That is a fact about the public record, not a claim about intent. Projects can request a correction at any time.",
  },
  {
    q: "Can a project pay to improve its score?",
    a: "No. There is no paid placement, no token that influences scoring, and every calculation is published with the formula version used.",
  },
  {
    q: "Where does the data come from?",
    a: "Public roadmaps, repositories, documentation, product endpoints, and reviewed community submissions. Every record carries its source URL and access timestamp.",
  },
];

export function HomeFaq() {
  return (
    <section aria-labelledby="faq-heading">
      <div className="mb-4">
        <p className="eyebrow mb-1">Straight answers</p>
        <h2 id="faq-heading" className="text-xl font-semibold tracking-tight text-ink">
          Frequently asked
        </h2>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {FAQ.map((item) => (
          <details key={item.q} className="card group p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-ink">
              {item.q}
              <span className="text-slate transition-transform group-open:rotate-45" aria-hidden="true">
                +
              </span>
            </summary>
            <p className="mt-2 text-sm text-slate">{item.a}</p>
          </details>
        ))}
      </div>
      <p className="mt-3 text-xs text-slate">
        More detail in the{" "}
        <Link href="/methodology" className="text-primary underline underline-offset-4">
          methodology
        </Link>{" "}
        and{" "}
        <Link href="/about" className="text-primary underline underline-offset-4">
          about
        </Link>{" "}
        pages.
      </p>
    </section>
  );
}
