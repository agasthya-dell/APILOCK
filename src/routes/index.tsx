import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  FileCode2,
  Fingerprint,
  GitBranch,
  KeyRound,
  LockKeyhole,
  Radar,
  ScanLine,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CyberEyeHeroBackground } from "@/components/visual/CyberEyeHeroBackground";
import { TopographicWavesCanvas } from "@/components/visual/TopographicWavesCanvas";
import { GaussianWaveDivider } from "@/components/visual/GaussianWaveDivider";
import { SmoothScrollProvider } from "@/components/visual/SmoothScrollProvider";
import { GalaxyPixelCard } from "@/components/GalaxyPixelCard";
import { FlamePixelCard } from "@/components/FlamePixelCard";
import { AlienCatPixelCard } from "@/components/AlienCatPixelCard";
import { FahhhPixelArt } from "@/components/FahhhPixelArt";
import { PixelShowcaseCard } from "@/components/PixelShowcaseCard";
import { AskPhillNavbar } from "@/components/AskPhillNavbar";
import { WordCircleAnimated, WordUnderlineAnimated } from "@/components/visual/DoodleDecorations";

const categories = [
  {
    icon: Fingerprint,
    name: "Auth & Service Tokens",
    note: "OAuth keys, access tokens & service secrets",
  },
  { icon: KeyRound, name: "Cloud access", note: "AWS, Google Cloud & infrastructure" },
  { icon: GitBranch, name: "GitHub tokens", note: "Personal access & fine-grained tokens" },
  { icon: LockKeyhole, name: "Database credentials", note: "Connection strings & database URLs" },
  { icon: ShieldCheck, name: "Private keys", note: "SSH, certificates & cryptographic material" },
  {
    icon: FileCode2,
    name: "Passwords & config",
    note: "Hardcoded passwords and app configuration",
  },
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "APILOCK — Continuous Git Secret Detection & Leak Prevention" },
      {
        name: "description",
        content:
          "Discover potential credential exposures, scan only authorized repositories, and turn redacted findings into clear next steps.",
      },
      { property: "og:title", content: "APILOCK — Continuous Git Secret Detection" },
      {
        property: "og:description",
        content: "Authorized repository scanning. Zero exposed secrets.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: APILOCKPage,
});

function BrandMark({ inverse = false }: { inverse?: boolean }) {
  return (
    <a
      className={`brand-mark ${inverse ? "brand-mark-inverse" : ""}`}
      href="#top"
      aria-label="APILOCK home"
    >
      <span className="brand-icon">
        <Radar aria-hidden="true" />
      </span>
      <span className="font-bold tracking-tight">APILOCK</span>
    </a>
  );
}

function APILOCKPage() {
  return (
    <main id="top" className="site-shell relative">
      {/* Butter-smooth momentum inertia scroll provider */}
      <SmoothScrollProvider />

      {/* Ask Phill Style Navbar: Left Tab (Home, About, Contact), Center APILOCK, Right Get Started */}
      <AskPhillNavbar />

      {/* ─────────────────────────────────────────────────────────────
          LANDING PAGE HERO: Featuring the authentic Halftone/Dithered
          Cyber Surveillance Eye directly as the full background
         ───────────────────────────────────────────────────────────── */}
      <section
        id="hero"
        className="hero-landing section-wrap relative pt-6 sm:pt-8 pb-5 sm:pb-7 overflow-hidden flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-[#bef264]/25 shadow-2xl mt-8 sm:mt-12 lg:mt-14 text-white"
        aria-labelledby="hero-title"
      >
        {/* 1. THE AUTHENTIC HALFTONE EYE ARTWORK AS FULL BACKGROUND */}
        <CyberEyeHeroBackground />

        {/* 2. FOREGROUND CONTENT: Sits cleanly in front of the background eye art */}
        <div className="relative z-10 px-4 sm:px-8 pt-4 sm:pt-6">
          {/* Main Hero Header Row: Copy on Left, Colossal Title on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end pt-2 pb-2 sm:pb-3">
            <div className="lg:col-span-5 space-y-4">
              <h1
                id="hero-title"
                className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight text-white leading-[1.06] drop-shadow-md"
              >
                Your <WordCircleAnimated>secrets</WordCircleAnimated> shouldn’t be hiding in{" "}
                <WordUnderlineAnimated>public.</WordUnderlineAnimated>
              </h1>
              <p className="hero-description m-0 text-sm sm:text-base text-white leading-relaxed max-w-md font-sans">
                Discover exposed credentials, understand security risks, and stay ahead of
                accidental leaks in the repositories you choose to scan.
              </p>
              <div className="hero-actions flex items-center gap-4 pt-2">
                <Button
                  asChild
                  className="bg-[#bef264] text-black hover:bg-[#a3e635] hover:scale-105 font-bold font-sans px-6 shadow-lg transition-all cursor-pointer"
                >
                  <a href="/auth">
                    Get started <ArrowRight />
                  </a>
                </Button>
                <a
                  className="text-link text-xs sm:text-sm font-sans font-semibold text-white hover:text-[#bef264] transition-colors"
                  href="#process"
                >
                  See how it works <ArrowDown />
                </a>
              </div>
            </div>

            <div className="lg:col-span-7 flex justify-start lg:justify-end">
              <div className="text-left lg:text-right">
                <div className="text-6xl sm:text-8xl md:text-9xl lg:text-[140px] xl:text-[155px] font-black tracking-tighter text-white leading-[0.88] select-none drop-shadow-[0_0_30px_rgba(190,242,100,0.2)]">
                  APILOCK
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Capsule Button: [ S C R O L L   D O W N ] */}
        <div className="relative z-10 mt-3 sm:mt-4 flex justify-center px-4">
          <a
            href="#intro"
            className="w-full max-w-xl inline-flex items-center justify-center gap-3 py-3 sm:py-3.5 px-6 rounded-full border-2 border-[#bef264]/40 bg-black/75 backdrop-blur-md text-xs sm:text-sm font-sans font-semibold tracking-wider text-[#bef264] hover:border-[#bef264] hover:text-white hover:shadow-[0_0_25px_rgba(190,242,100,0.35)] transition-all cursor-pointer group select-none"
            aria-label="Scroll down to exposure section"
          >
            <span className="tracking-[0.25em]">SCROLL</span>
            <ArrowDown className="w-4 h-4 text-[#bef264] group-hover:translate-y-1 transition-transform animate-bounce" />
            <span className="tracking-[0.25em]">DOWN</span>
          </a>
        </div>
      </section>

      {/* SECTION 01: THE EXPOSURE PROBLEM */}
      <section
        id="intro"
        className="intro-section section-wrap relative"
        aria-labelledby="intro-title"
      >
        <div className="section-index">
          <span>01</span>
          <span>THE EXPOSURE PROBLEM</span>
        </div>
        <div className="intro-grid">
          <h2 id="intro-title">
            The internet moves fast.{" "}
            <WordUnderlineAnimated>Exposed credentials</WordUnderlineAnimated> move faster.
          </h2>
          <div className="intro-aside">
            <p>
              Every day, developers publish code, update repositories, and share projects. Sometimes
              sensitive credentials accidentally become part of that process.
            </p>
            <a href="#problem" className="text-link">
              Why visibility matters <ArrowRight />
            </a>
            <svg className="aside-scribble" viewBox="0 0 160 54" aria-hidden="true">
              <path d="M4 32c28-26 53-27 64-3s23 18 31 1c8-17 21-19 32-2" />
            </svg>
          </div>
        </div>

        {/* 3rd Uploaded Pixel Art: Spiral Galaxy in Section 01 (2nd Page) */}
        <GalaxyPixelCard />

        <div className="intro-bottom-rule">
          <span>DISCOVER</span>
          <svg viewBox="0 0 720 90" preserveAspectRatio="none" aria-hidden="true">
            <path d="M-15 33c112 71 185 48 280 17 99-32 166-16 227 20 51 29 116 12 153-13 35-24 57-31 90-24" />
          </svg>
          <span>UNDERSTAND</span>
        </div>
      </section>

      {/* SECTION 02: WHY IT MATTERS */}
      <section
        id="problem"
        className="problem-section section-wrap relative"
        aria-labelledby="problem-title"
      >
        <div className="section-index">
          <span>02</span>
          <span>WHY IT MATTERS</span>
        </div>
        <div className="problem-heading">
          <h2 id="problem-title">
            One forgotten <WordCircleAnimated>key</WordCircleAnimated> can become a serious security
            problem.
          </h2>
          <p>
            Small oversights can outlive the moment they happened. Good visibility makes the next
            step clearer.
          </p>
        </div>

        {/* Middle Uploaded Pixel Art: Flame on Log (Calcifer) in Section 02 (3rd Page) */}
        <FlamePixelCard />

        <div className="problem-list">
          <article className="problem-item group hover:bg-[var(--color-accent)]/20 transition-colors">
            <span className="problem-number">01 / 03</span>
            <div>
              <h3>Accidental exposure</h3>
              <p>
                Credentials can enter public repositories through configuration files, source code,
                sample projects, and careless commits.
              </p>
            </div>
            <span className="problem-glyph group-hover:scale-110 transition-transform">
              <KeyRound />
            </span>
          </article>
          <article className="problem-item problem-offset group hover:bg-[var(--color-accent)]/20 transition-colors">
            <span className="problem-number">02 / 03</span>
            <div>
              <h3>Hidden history</h3>
              <p>
                Removing a credential from the latest version does not automatically remove it from{" "}
                <WordUnderlineAnimated>previous commits.</WordUnderlineAnimated>
              </p>
            </div>
            <span className="problem-glyph group-hover:scale-110 transition-transform">
              <GitBranch />
            </span>
          </article>
          <article className="problem-item group hover:bg-[var(--color-accent)]/20 transition-colors">
            <span className="problem-number">03 / 03</span>
            <div>
              <h3>Limited visibility</h3>
              <p>
                Without <WordCircleAnimated>continuous monitoring</WordCircleAnimated>, developers
                may not know where sensitive information has appeared.
              </p>
            </div>
            <span className="problem-glyph group-hover:scale-110 transition-transform">
              <ScanLine />
            </span>
          </article>
        </div>
      </section>

      {/* SECTION 03: HOW IT WORKS */}
      <section
        id="process"
        className="process-section section-wrap"
        aria-labelledby="process-title"
      >
        <div className="section-index">
          <span>03</span>
          <span>HOW IT WORKS</span>
        </div>
        <div className="process-heading">
          <h2 id="process-title">
            From repository connection to{" "}
            <WordUnderlineAnimated>immediate remediation.</WordUnderlineAnimated>
          </h2>
          <p>Every step has a purpose. Every scan has permission.</p>
        </div>
        <div className="process-track">
          {[
            ["01", "Connect", "Choose a repository you own or have permission to scan.", GitBranch],
            [
              "02",
              "Authorize",
              "Verify permissions before scanning any repository source code.",
              ShieldCheck,
            ],
            [
              "03",
              "Detect",
              "Inspect authorized files and Git history for possible exposed credentials.",
              ScanLine,
            ],
            [
              "04",
              "Report",
              "Share redacted findings, severity, context, and remediation guidance.",
              FileCode2,
            ],
          ].map(([number, title, detail, Icon]) => {
            const StepIcon = Icon as typeof Radar;
            return (
              <article className="process-step group" key={number as string}>
                <span className="step-node group-hover:scale-110 transition-transform">
                  <span>{number as string}</span>
                </span>
                <StepIcon className="step-icon group-hover:text-[var(--color-marker)] transition-colors" />
                <h3>{title as string}</h3>
                <p>{detail as string}</p>
              </article>
            );
          })}
        </div>

        {/* 1st Uploaded Pixel Art: Alien Cat in Section 03 (4th Page) */}
        <AlienCatPixelCard />

        <div className="authorization-note">
          <ShieldCheck />
          <p>
            <strong>Authorization is a hard boundary.</strong> Source-code scanning happens only
            after you connect and authorize the repository. Public visibility alone is not
            permission to scan.
          </p>
        </div>
      </section>

      {/* SECTION 04: DETECTION ENGINE */}
      <section
        id="detection"
        className="detection-section section-wrap"
        aria-labelledby="detection-title"
      >
        <div className="section-index">
          <span>04</span>
          <span>DETECTION ENGINE</span>
        </div>
        <div className="detection-heading">
          <h2 id="detection-title">
            Know what you’re <WordUnderlineAnimated>looking for.</WordUnderlineAnimated>
          </h2>
          <p>Thoughtful pattern coverage for the credentials developers rely on.</p>
        </div>

        {/* Custom Retro Pixel Art Banner "FAHHH" in Section 04 (5th Page) */}
        <FahhhPixelArt />

        {/* Featured Pixel Art Showcase Card */}
        <PixelShowcaseCard
          imageSrc="/pixel-droid.svg"
          imageAlt="Pixel Art Cyber Droid Sentinel"
          title="Pattern recognition across every layer of your stack."
          description="From OAuth secrets and cloud credentials to private SSH keys and database URIs, APILOCK matches high-entropy tokens before they spread further."
          badge="Detection Engine"
        />

        <div className="detection-grid">
          {categories.map((item, index) => {
            const Icon = item.icon;
            return (
              <article className="detection-item" key={item.name}>
                <span className="category-index">0{index + 1}</span>
                <Icon className="category-icon" />
                <h3>{item.name}</h3>
                <p>{item.note}</p>
                <ArrowUpRight className="category-arrow" />
              </article>
            );
          })}
        </div>
        <p className="detection-note">
          More patterns. Better <WordCircleAnimated>visibility.</WordCircleAnimated>
        </p>
      </section>

      {/* 4. SHOWPIECE B: 3D TOPOGRAPHIC ZEBRA WAVES CANVAS */}
      <div id="topography">
        <TopographicWavesCanvas />
      </div>

      {/* 5. SHOWPIECE C: DYNAMIC GAUSSIAN BELL CURVE & GLYPH BAR */}
      <div id="divider">
        <GaussianWaveDivider />
      </div>

      {/* SECTION 06: BEYOND THE ALERT (OBSIDIAN DARK CHAMBER) */}
      <section id="security" className="security-section" aria-labelledby="security-title">
        <div className="section-wrap security-inner">
          <div className="section-index section-index-light">
            <span>06</span>
            <span>BEYOND THE ALERT</span>
          </div>
          <div className="security-heading">
            <h2 id="security-title">
              Detection is only the <WordCircleAnimated>beginning.</WordCircleAnimated>
            </h2>
            <p>Understanding the exposure is what makes security actionable.</p>
          </div>

          {/* Featured Pixel Art Showcase Card */}
          <PixelShowcaseCard
            imageSrc="/pixel-shield.svg"
            imageAlt="Pixel Art Cyber Shield Guardian"
            title="Defense beyond notifications. Proactive perimeter protection."
            description="Alerts only tell half the story. APILOCK verifies Git history depth, evaluates exposure severity, and equips engineering teams with instant remediation steps."
            badge="Active Perimeter Defense"
          />

          <div className="security-grid">
            {[
              ["01", "Exposure context", "Understand where a potential credential appeared."],
              ["02", "Historical analysis", "See whether it remains in accessible Git history."],
              ["03", "Risk prioritization", "Organize findings by severity and confidence."],
              ["04", "Remediation guidance", "Give developers clear, practical next steps."],
            ].map(([n, title, text]) => (
              <article key={n} className="group hover:bg-white/5 transition-colors p-4 rounded-lg">
                <span>{n}</span>
                <h3>{title}</h3>
                <p>{text}</p>
                <ArrowUpRight className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </article>
            ))}
          </div>
          <svg
            className="security-scribble"
            viewBox="0 0 1200 260"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path d="M-30 188c191-210 275 204 475-9 180-191 267 125 437-2 118-88 189-70 346 5" />
          </svg>
        </div>
      </section>

      {/* SECTION 07: CONTINUOUS MONITORING */}
      <section
        id="platform"
        className="monitoring-section section-wrap"
        aria-labelledby="monitoring-title"
      >
        <div className="section-index">
          <span>07</span>
          <span>CONTINUOUS MONITORING</span>
        </div>
        <div className="monitoring-layout">
          <div className="monitoring-copy">
            <h2 id="monitoring-title">
              Security doesn’t stop after <WordUnderlineAnimated>one scan.</WordUnderlineAnimated>
            </h2>
            <p>
              Built around continuous monitoring of connected repositories, event-driven scans, and
              scheduled security reviews—with authorization at every source-code scan.
            </p>
            <a className="text-link" href="#dashboard">
              Explore the platform <ArrowRight />
            </a>
          </div>
          <div className="monitoring-flow">
            <div className="flow-legend">
              <span>
                <i className="legend-connected" /> Connected
              </span>
              <span>
                <i className="legend-authorized" /> Authorized
              </span>
              <span>
                <i className="legend-scan" /> Scanned
              </span>
            </div>
            {[
              ["Repository connection", "WORKSPACE"],
              ["Authorization", "PERMISSION CHECK"],
              ["Scan queue", "AUTHORIZED ONLY"],
              ["Detection engine", "PATTERN MATCH"],
              ["Finding review", "OWNER ACTION"],
            ].map(([name, type], index) => (
              <div className={`flow-row flow-state-${index}`} key={name}>
                <span className="flow-node">
                  <span />
                </span>
                <span className="flow-label">{name}</span>
                <span className="flow-type">{type}</span>
                <ArrowRight />
              </div>
            ))}
            <div className="sample-data-note">
              <span className="pulse-dot" />
              Workflow illustration <span>Not live monitoring data</span>
            </div>
          </div>
        </div>

        {/* Featured Pixel Art Showcase Card */}
        <PixelShowcaseCard
          imageSrc="/pixel-satellite.svg"
          imageAlt="Pixel Art Repository Monitoring Satellite"
          title="Continuous repository monitoring. Always watching the boundary."
          description="Security isn't a one-time audit. Monitor the repositories you connect as code is pushed, branched, and merged—with strict authorization at every boundary."
          badge="Authorized Monitoring"
        />
      </section>

      {/* SECTION 08: PRODUCT PREVIEW / SAMPLE DATA */}
      <section
        id="dashboard"
        className="dashboard-section section-wrap"
        aria-labelledby="dashboard-title"
      >
        <div className="section-index">
          <span>08</span>
          <span>PRODUCT PREVIEW / SAMPLE DATA</span>
        </div>
        <div className="dashboard-heading">
          <h2 id="dashboard-title">
            Everything important. One security{" "}
            <WordUnderlineAnimated>overview.</WordUnderlineAnimated>
          </h2>
          <p>Illustrative product view • Sample figures, not live data</p>
        </div>

        {/* Featured Pixel Art Showcase Card */}
        <PixelShowcaseCard
          imageSrc="/pixel-console.svg"
          imageAlt="Pixel Art Cyber Console Workstation"
          title="Command center clarity. Designed for engineers."
          description="All your repositories, scan histories, severity breakdowns, and credential alerts united in one clean, unified developer dashboard."
          badge="Developer Console"
        />

        <div className="dashboard-frame">
          <div className="dashboard-topbar">
            <div className="dashboard-brand">
              <span className="dashboard-brand-icon">
                <Radar />
              </span>
              <strong>APILOCK</strong>
              <span>/ Overview</span>
            </div>
            <div className="dashboard-user">
              <span>DEMO WORKSPACE</span>
              <span className="avatar-mark">A</span>
            </div>
          </div>
          <div className="dashboard-content">
            <aside className="dashboard-sidebar">
              <span className="sidebar-caption">WORKSPACE</span>
              {["Overview", "Repositories", "Findings", "Scan activity", "Detection rules"].map(
                (label, i) => (
                  <div className={`sidebar-link ${i === 0 ? "sidebar-active" : ""}`} key={label}>
                    <span className="sidebar-glyph">{["⌂", "⌘", "◉", "↗", "◎"][i]}</span>
                    {label}
                  </div>
                ),
              )}
              <div className="sidebar-permission">
                <ShieldCheck />
                <span>
                  Permission checks
                  <br />
                  <strong>Enabled</strong>
                </span>
              </div>
            </aside>
            <div className="dashboard-main">
              <div className="dash-title-row">
                <div>
                  <span className="field-label">TUESDAY, NOVEMBER 17</span>
                  <h3>Security overview</h3>
                </div>
                <span className="demo-chip">
                  <i /> SAMPLE DATA
                </span>
              </div>
              <div className="metric-row">
                {[
                  ["Connected repositories", "36", "In your workspace", "neutral"],
                  ["Authorized", "31", "Owner approved", "olive"],
                  ["Repositories scanned", "28", "Last 24 hours", "blue"],
                  ["Potential findings", "07", "3 require review", "coral"],
                ].map(([label, value, detail, tone]) => (
                  <article className="metric" key={label}>
                    <span>{label}</span>
                    <strong className={`metric-${tone}`}>{value}</strong>
                    <small>{detail}</small>
                  </article>
                ))}
              </div>
              <div className="dash-panels">
                <article className="severity-chart">
                  <div className="dash-panel-title">
                    <div>
                      <span className="field-label">FINDINGS</span>
                      <h4>Severity distribution</h4>
                    </div>
                    <span className="sample-label">SAMPLE</span>
                  </div>
                  <div className="severity-chart-body">
                    <div className="donut-chart">
                      <span>
                        <strong>07</strong>
                        <small>sample</small>
                      </span>
                    </div>
                    <div className="severity-legend">
                      <span>
                        <i className="sev-high" />
                        High <b>02</b>
                      </span>
                      <span>
                        <i className="sev-medium" />
                        Medium <b>03</b>
                      </span>
                      <span>
                        <i className="sev-low" />
                        Low <b>02</b>
                      </span>
                    </div>
                  </div>
                </article>
                <article className="activity-chart">
                  <div className="dash-panel-title">
                    <div>
                      <span className="field-label">SCAN ACTIVITY</span>
                      <h4>Recent checks</h4>
                    </div>
                    <span className="sample-label">ILLUSTRATIVE</span>
                  </div>
                  <div className="bar-chart">
                    {[
                      ["MON", 32],
                      ["TUE", 58],
                      ["WED", 41],
                      ["THU", 75],
                      ["FRI", 49],
                      ["SAT", 30],
                      ["SUN", 62],
                    ].map(([day, height]) => (
                      <div className="bar-item" key={day as string}>
                        <span className="bar-track">
                          <i style={{ height: `${height}%` }} />
                        </span>
                        <small>{day as string}</small>
                      </div>
                    ))}
                  </div>
                  <div className="chart-legend">
                    <i /> Authorized repository checks
                  </div>
                </article>
              </div>
              <div className="recent-row">
                <span className="field-label">RECENT SAMPLE FINDINGS</span>
                <div>
                  <span className="recent-dot recent-high" />
                  <strong>Potential API credential</strong>
                  <code>sample-api / config.py</code>
                  <span className="recent-severity">HIGH</span>
                  <span className="recent-time">Illustrative</span>
                </div>
                <div>
                  <span className="recent-dot recent-medium" />
                  <strong>Cloud access pattern</strong>
                  <code>demo-service / settings.js</code>
                  <span className="recent-severity medium-sev">MEDIUM</span>
                  <span className="recent-time">Illustrative</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 10: OUR APPROACH */}
      <section id="about" className="about-section section-wrap" aria-labelledby="about-title">
        <div className="section-index">
          <span>10</span>
          <span>OUR APPROACH</span>
        </div>
        <div className="about-grid">
          <h2 id="about-title">
            Built for developers who care about what they{" "}
            <WordUnderlineAnimated>publish.</WordUnderlineAnimated>
          </h2>
          <div className="about-points">
            {[
              "Visibility across connected repository metadata.",
              "Authorized and controlled security scanning.",
              "Redacted findings that protect sensitive values.",
              "Actionable reports instead of confusing alerts.",
            ].map((item, i) => (
              <p key={item}>
                <span>0{i + 1}</span>
                {item}
                <Check />
              </p>
            ))}
          </div>
        </div>

        {/* Featured Pixel Art Showcase Card */}
        <PixelShowcaseCard
          imageSrc="/pixel-lock.svg"
          imageAlt="Pixel Art Cyber Guardian Lock"
          title="Built with developer trust. Hard permission boundaries."
          description="We believe secret detection must never cross authorization boundaries. Connect repositories you own or are permitted to scan, and authorize every source-code scan."
          badge="Permission First"
        />
      </section>

      {/* SECTION 11: FINAL CALL TO ACTION */}
      <section className="final-cta section-wrap" aria-labelledby="cta-title">
        <div className="section-index">
          <span>11</span>
          <span>KEEP BUILDING IN PUBLIC</span>
        </div>
        <div className="final-cta-content">
          <p className="eyebrow">
            <span className="eyebrow-dot" /> Clear eyes on what you publish
          </p>
          <h2 id="cta-title">
            Keep your code public. Keep your secrets{" "}
            <WordCircleAnimated>private.</WordCircleAnimated>
          </h2>
          <p>Start building better visibility into your repository security.</p>

          {/* Featured Pixel Art Showcase Card */}
          <PixelShowcaseCard
            imageSrc="/pixel-rocket.svg"
            imageAlt="Pixel Art Space Rocket"
            title="Launch with total confidence. Keep building in public."
            description="Ship open-source software fearlessly. Protect your keys, your infrastructure, and your users with continuous, permission-first Git perimeter defense."
            badge="Build In Public"
          />

          <div className="hero-actions">
            <Button asChild className="button-ink">
              <a href="/auth">
                Get started <ArrowRight />
              </a>
            </Button>
            <a className="text-link" href="#platform">
              Explore the platform <ArrowRight />
            </a>
          </div>
        </div>
        <svg
          className="cta-curve"
          viewBox="0 0 1350 180"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M-20 96c202 10 233-102 415-36 158 58 274 104 419 31 170-85 283-5 573 25" />
        </svg>
      </section>

      {/* SITE FOOTER */}
      <footer className="site-footer section-wrap">
        <div className="footer-top">
          <div className="footer-brand">
            <BrandMark />
            <p>
              Git repository secret defense
              <br />
              with permission, context, and care.
            </p>
          </div>
          <div className="footer-links">
            <div>
              <span>SHOWPIECES</span>
              <a href="#matrix">Guardian Matrix</a>
              <a href="#topography">3D Topography</a>
              <a href="/auth">Get Started</a>
            </div>
            <div>
              <span>PLATFORM</span>
              <a href="#platform">Overview</a>
              <a href="#process">How it works</a>
              <a href="#detection">Detection</a>
              <a href="#security">Security</a>
            </div>
            <div>
              <span>RESOURCES</span>
              <a href="#dashboard">Product preview</a>
              <a href="mailto:hello@apilock.dev">
                Contact <ArrowUpRight />
              </a>
              <a href="#about">About</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>Built for a more secure open-source ecosystem.</span>
          <span>
            DESIGNED WITH INTENTION <span className="footer-spark">✳</span>
          </span>
          <a href="#top" aria-label="Back to top">
            <ArrowUpRight />
          </a>
        </div>
      </footer>
    </main>
  );
}
