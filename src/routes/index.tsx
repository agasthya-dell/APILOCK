import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowDown, ArrowRight, ArrowUpRight, Check, ChevronDown, Copy, FileCode2, Fingerprint, GitBranch, KeyRound, LockKeyhole, Menu, Radar, ScanLine, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const categories = [
  { icon: Fingerprint, name: "AI API credentials", note: "Model providers, tokens & service keys" },
  { icon: KeyRound, name: "Cloud access", note: "AWS, Google Cloud & infrastructure" },
  { icon: GitBranch, name: "GitHub tokens", note: "Personal access & fine-grained tokens" },
  { icon: LockKeyhole, name: "Database credentials", note: "Connection strings & database URLs" },
  { icon: ShieldCheck, name: "Private keys", note: "SSH, certificates & cryptographic material" },
  { icon: FileCode2, name: "Passwords & config", note: "Hardcoded passwords and app configuration" },
];

const repoMarkers = [
  { name: "sample-api", kind: "Repository metadata", position: "marker-one" },
  { name: "config.py", kind: "Illustrative file reference", position: "marker-two" },
  { name: "commit a81c9f2", kind: "Historical context", position: "marker-three" },
];

const sampleFinding = `SecretRadar illustrative report\nRepository: developer123 / awesome-ai-chatbot\nFinding: Potential OpenAI API key\nLocation: backend/config.py:24\nSeverity: High · Confidence: High\nValue: sk-proj-••••••••••••••\nStatus: Requires owner review`;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SecretRadar — Repository security intelligence" },
      { name: "description", content: "Discover potential credential exposures, scan only authorized repositories, and turn redacted findings into clear next steps." },
      { property: "og:title", content: "SecretRadar — Repository security intelligence" },
      { property: "og:description", content: "Continuous discovery. Authorized scanning. Clear security intelligence." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SecretRadarPage,
});

function WordCircle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`word-circle ${className}`}>
      {children}
      <svg aria-hidden="true" viewBox="0 0 180 82" preserveAspectRatio="none"><path d="M12 43C10 18 43 9 91 11c42-3 76 7 78 31 4 21-34 30-78 29C47 74 15 67 12 43Z" /></svg>
    </span>
  );
}

function WordUnderline({ children }: { children: React.ReactNode }) {
  return (
    <span className="word-underline">
      {children}
      <svg aria-hidden="true" viewBox="0 0 210 18" preserveAspectRatio="none"><path d="M4 11c43-5 84 5 124 1 25-2 50-5 78-2" /></svg>
    </span>
  );
}

function BrandMark({ inverse = false }: { inverse?: boolean }) {
  return (
    <a className={`brand-mark ${inverse ? "brand-mark-inverse" : ""}`} href="#top" aria-label="SecretRadar home">
      <span className="brand-icon"><Radar aria-hidden="true" /></span>
      <span>SecretRadar</span>
    </a>
  );
}

function SecretRadarPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeMarker, setActiveMarker] = useState(0);
  const [findingOpen, setFindingOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyRedactedReport = async () => {
    try {
      await navigator.clipboard.writeText(sampleFinding);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <main id="top" className="site-shell">
      <header className="site-header">
        <div className="header-inner">
          <BrandMark />
          <nav className="desktop-nav" aria-label="Main navigation">
            <a href="#platform">Platform</a><a href="#process">How it works</a><a href="#detection">Detection</a><a href="#security">Security</a><a href="#about">About</a>
          </nav>
          <div className="header-actions"><a className="sign-in-link" href="#dashboard">Sign in <ArrowUpRight size={14} /></a><Button asChild className="button-ink"><a href="#finding">Get started <ArrowRight /></a></Button></div>
          <Button variant="ghost" size="icon" className="mobile-menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen}>{menuOpen ? <X /> : <Menu />}</Button>
        </div>
        {menuOpen && <nav className="mobile-nav" aria-label="Mobile navigation">{[["Platform", "#platform"], ["How it works", "#process"], ["Detection", "#detection"], ["Security", "#security"], ["About", "#about"]].map(([name, href]) => <a key={name} href={href} onClick={closeMenu}>{name}<ArrowUpRight /></a>)}<a href="#finding" onClick={closeMenu}>Get started <ArrowRight /></a></nav>}
      </header>

      <section className="hero section-wrap" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow"><span className="eyebrow-dot" /> Global repository security intelligence</p>
          <h1 id="hero-title">Your <WordCircle>secrets</WordCircle> shouldn’t be hiding in <WordUnderline>public.</WordUnderline></h1>
          <p className="hero-description">Discover exposed credentials, understand security risks, and stay ahead of accidental leaks across the open-source ecosystem.</p>
          <div className="hero-actions"><Button asChild className="button-ink"><a href="#platform">Explore the platform <ArrowRight /></a></Button><a className="text-link" href="#process">See how it works <ArrowDown /></a></div>
          <p className="hero-footnote"><span className="mini-dash" /> Continuous discovery. Authorized scanning. Clear security intelligence.</p>
        </div>
        <div className="radar-art" aria-label="Illustration of repository signals on a radar">
          <div className="radar-caption caption-top">OPEN SOURCE / SIGNAL MAP <span>FIG. 01</span></div>
          <div className="radar-orbit orbit-outer" /><div className="radar-orbit orbit-mid" /><div className="radar-orbit orbit-inner" />
          <div className="radar-crosshair crosshair-horizontal" /><div className="radar-crosshair crosshair-vertical" />
          <div className="radar-sweep" />
          <div className="radar-center"><Radar /><span>SR / 01</span></div>
          {repoMarkers.map((marker, index) => <button key={marker.name} className={`repo-marker ${marker.position} ${activeMarker === index ? "is-active" : ""}`} onClick={() => setActiveMarker(index)} aria-label={`${marker.name}, ${marker.kind}`}><span className="marker-point" /><span className="marker-label">{marker.name}</span></button>)}
          <svg className="radar-doodle" viewBox="0 0 430 150" aria-hidden="true"><path d="M11 97c51-51 99 34 152-5 31-23 49-64 83-56 41 9 27 78 73 81 32 2 58-21 98-15" /></svg>
          <div className="radar-tooltip"><span className="tooltip-status" /><span><strong>{repoMarkers[activeMarker]?.name}</strong><small>{repoMarkers[activeMarker]?.kind}</small></span><ArrowUpRight /></div>
          <div className="radar-caption caption-bottom"><span>SCANNING AUTHORIZED SOURCES</span><span className="radar-live"><i /> DEMO SIGNAL</span></div>
          <span className="hand-note">A signal worth a closer look <ArrowDown /></span>
        </div>
        <div className="hero-bottom-note"><span>01 — SECURITY, WITH CONTEXT</span><a href="#intro" aria-label="Scroll to introduction"><ArrowDown /></a><span>BUILT FOR THE OPEN WEB</span></div>
      </section>

      <section id="intro" className="intro-section section-wrap" aria-labelledby="intro-title">
        <div className="section-index"><span>01</span><span>THE EXPOSURE PROBLEM</span></div>
        <div className="intro-grid"><h2 id="intro-title">The internet moves fast. <WordUnderline>Exposed credentials</WordUnderline> move faster.</h2><div className="intro-aside"><p>Every day, developers publish code, update repositories, and share projects. Sometimes sensitive credentials accidentally become part of that process.</p><a href="#problem" className="text-link">Why visibility matters <ArrowRight /></a><svg className="aside-scribble" viewBox="0 0 160 54" aria-hidden="true"><path d="M4 32c28-26 53-27 64-3s23 18 31 1c8-17 21-19 32-2" /></svg><span className="hand-note">The overlooked detail <ArrowDown /></span></div></div>
        <div className="intro-bottom-rule"><span>DISCOVER</span><svg viewBox="0 0 720 90" preserveAspectRatio="none" aria-hidden="true"><path d="M-15 33c112 71 185 48 280 17 99-32 166-16 227 20 51 29 116 12 153-13 35-24 57-31 90-24" /></svg><span>UNDERSTAND</span></div>
      </section>

      <section id="problem" className="problem-section section-wrap" aria-labelledby="problem-title">
        <div className="section-index"><span>02</span><span>WHY IT MATTERS</span></div>
        <div className="problem-heading"><h2 id="problem-title">One forgotten <WordCircle>key</WordCircle> can become a serious security problem.</h2><p>Small oversights can outlive the moment they happened. Good visibility makes the next step clearer.</p></div>
        <div className="problem-list">
          <article className="problem-item"><span className="problem-number">01 / 03</span><div><h3>Accidental exposure</h3><p>Credentials can enter public repositories through configuration files, source code, sample projects, and careless commits.</p></div><span className="problem-glyph"><KeyRound /></span></article>
          <article className="problem-item problem-offset"><span className="problem-number">02 / 03</span><div><h3>Hidden history</h3><p>Removing a credential from the latest version does not automatically remove it from <WordUnderline>previous commits.</WordUnderline></p></div><span className="problem-glyph"><GitBranch /></span></article>
          <article className="problem-item"><span className="problem-number">03 / 03</span><div><h3>Limited visibility</h3><p>Without <WordCircle>continuous monitoring</WordCircle>, developers may not know where sensitive information has appeared.</p></div><span className="problem-glyph"><ScanLine /></span></article>
        </div>
        <svg className="problem-connector" viewBox="0 0 1100 360" preserveAspectRatio="none" aria-hidden="true"><path d="M18 12c230 3 183 97 379 97s204-91 378-54c161 35 14 200 258 227" /></svg>
      </section>

      <section id="process" className="process-section section-wrap" aria-labelledby="process-title">
        <div className="section-index"><span>03</span><span>HOW IT WORKS</span></div>
        <div className="process-heading"><h2 id="process-title">From discovery to <WordUnderline>actionable intelligence.</WordUnderline></h2><p>Every step has a purpose. Every scan has permission.</p></div>
        <div className="process-track">
          <svg className="process-path" viewBox="0 0 1200 110" preserveAspectRatio="none" aria-hidden="true"><path d="M8 66c92-84 157 76 288 1 138-79 154 78 294 0 117-65 157 70 287 2 104-55 190 41 315-22" /></svg>
          {[ ["01", "Discover", "Find public repository metadata and supported security monitoring sources.", Radar], ["02", "Authorize", "Verify permissions before scanning any repository source code.", ShieldCheck], ["03", "Detect", "Inspect authorized files and Git history for possible exposed credentials.", ScanLine], ["04", "Report", "Share redacted findings, severity, context, and remediation guidance.", FileCode2] ].map(([number, title, detail, Icon]) => {
            const StepIcon = Icon as typeof Radar;
            return <article className="process-step" key={number as string}><span className="step-node"><span>{number as string}</span></span><StepIcon className="step-icon" /><h3>{title as string}</h3><p>{detail as string}</p></article>;
          })}
        </div>
        <div className="authorization-note"><ShieldCheck /><p><strong>Authorization is a hard boundary.</strong> Discovery can surface repository metadata. Source-code scanning happens only for repositories with permission or through legitimate security integrations.</p></div>
      </section>

      <section id="detection" className="detection-section section-wrap" aria-labelledby="detection-title">
        <div className="section-index"><span>04</span><span>DETECTION ENGINE</span></div>
        <div className="detection-heading"><h2 id="detection-title">Know what you’re <WordUnderline>looking for.</WordUnderline></h2><p>Thoughtful pattern coverage for the credentials developers rely on.</p></div>
        <div className="detection-grid">{categories.map((item, index) => { const Icon = item.icon; return <article className="detection-item" key={item.name}><span className="category-index">0{index + 1}</span><Icon className="category-icon" /><h3>{item.name}</h3><p>{item.note}</p><ArrowUpRight className="category-arrow" /></article>; })}</div>
        <p className="detection-note">More patterns. Better <WordCircle>visibility.</WordCircle></p>
      </section>

      <section id="finding" className="finding-section section-wrap" aria-labelledby="finding-title">
        <div className="finding-copy"><div className="section-index"><span>05</span><span>ILLUSTRATIVE DEMONSTRATION</span></div><h2 id="finding-title">Here’s what a potential leak <WordUnderline>looks like.</WordUnderline></h2><p>A useful alert shows enough context to act—without repeating the sensitive value.</p><span className="finding-disclaimer"><span className="eyebrow-dot" /> Demonstration data only. No real credential is shown.</span></div>
        <div className={`finding-panel ${findingOpen ? "finding-panel-open" : ""}`}>
          <div className="finding-panel-top"><div className="finding-label"><span className="finding-status-dot" /> POTENTIAL SECRET DETECTED</div><span className="finding-example">SAMPLE / 001</span></div>
          <div className="finding-repo"><span>REPOSITORY</span><strong>developer123 / awesome-ai-chatbot</strong><ArrowUpRight /></div>
          <div className="finding-main"><div><span className="field-label">POTENTIAL FINDING</span><h3>OpenAI API key</h3></div><div className="severity-wrap"><span className="severity-tag">HIGH</span>{findingOpen && <svg className="severity-doodle" viewBox="0 0 90 44" aria-hidden="true"><path d="M7 21c3-18 75-19 77 1 2 19-73 22-77-1Z" /></svg>}</div></div>
          <div className="finding-metadata"><div><span className="field-label">FILE</span><strong className={findingOpen ? "file-highlight" : ""}>backend/config.py <i>:{findingOpen ? "24" : "—"}</i></strong></div><div><span className="field-label">COMMIT</span><strong>a81c9f2</strong></div><div><span className="field-label">CONFIDENCE</span><strong><span className="confidence-dot" /> High</strong></div></div>
          <div className="redacted-row"><span className="field-label">DETECTED VALUE <span>REDACTED</span></span><code>sk-proj-••••••••••••••</code><LockKeyhole /></div>
          {findingOpen && <div className="finding-expanded"><div className="context-copy"><span className="field-label">REVIEW STATUS</span><strong>Requires owner review</strong><p>Illustrative finding with limited exposure context. Verify ownership before taking action.</p></div><div className="remediation"><span className="field-label">RECOMMENDED NEXT STEPS</span>{["Revoke the exposed credential", "Generate a replacement", "Move it to environment variables", "Review Git history and rescan"].map((step) => <p key={step}><Check />{step}</p>)}</div></div>}
          <div className="finding-actions"><Button variant="outline" className="button-report" onClick={copyRedactedReport}>{copied ? <Check /> : <Copy />}{copied ? "Redacted report copied" : "Copy redacted report"}</Button><Button className="button-ink" onClick={() => setFindingOpen(!findingOpen)}>{findingOpen ? "Close finding" : "View finding"}{findingOpen ? <ChevronDown className="chevron-up" /> : <ArrowRight />}</Button></div>
          <div className="finding-panel-foot"><span>EXAMPLE ONLY</span><span>ALL SENSITIVE VALUES REMAIN REDACTED</span></div>
        </div>
      </section>

      <section id="security" className="security-section" aria-labelledby="security-title">
        <div className="section-wrap security-inner"><div className="section-index section-index-light"><span>06</span><span>BEYOND THE ALERT</span></div><div className="security-heading"><h2 id="security-title">Detection is only the <WordCircle>beginning.</WordCircle></h2><p>Understanding the exposure is what makes security actionable.</p></div><div className="security-grid">{[["01", "Exposure context", "Understand where a potential credential appeared."], ["02", "Historical analysis", "See whether it remains in accessible Git history."], ["03", "Risk prioritization", "Organize findings by severity and confidence."], ["04", "Remediation guidance", "Give developers clear, practical next steps."]].map(([n, title, text]) => <article key={n}><span>{n}</span><h3>{title}</h3><p>{text}</p><ArrowUpRight /></article>)}</div><svg className="security-scribble" viewBox="0 0 1200 260" preserveAspectRatio="none" aria-hidden="true"><path d="M-30 188c191-210 275 204 475-9 180-191 267 125 437-2 118-88 189-70 346 5" /></svg></div>
      </section>

      <section id="platform" className="monitoring-section section-wrap" aria-labelledby="monitoring-title">
        <div className="section-index"><span>07</span><span>CONTINUOUS MONITORING</span></div><div className="monitoring-layout"><div className="monitoring-copy"><h2 id="monitoring-title">Security doesn’t stop after <WordUnderline>one scan.</WordUnderline></h2><p>Built around continuous discovery, event-driven monitoring, and scheduled security reviews—with authorization at every source-code scan.</p><a className="text-link" href="#dashboard">Explore the platform <ArrowRight /></a></div><div className="monitoring-flow"><div className="flow-legend"><span><i className="legend-discovered" /> Discovered</span><span><i className="legend-authorized" /> Authorized</span><span><i className="legend-scan" /> Scanned</span></div>{[["Repository discovery", "METADATA"], ["Authorization", "PERMISSION CHECK"], ["Scan queue", "AUTHORIZED ONLY"], ["Detection engine", "PATTERN MATCH"], ["Finding review", "OWNER ACTION"]].map(([name, type], index) => <div className={`flow-row flow-state-${index}`} key={name}><span className="flow-node"><span /></span><span className="flow-label">{name}</span><span className="flow-type">{type}</span><ArrowRight /></div>)}<div className="sample-data-note"><span className="pulse-dot" />Workflow illustration <span>Not live monitoring data</span></div></div></div>
      </section>

      <section id="dashboard" className="dashboard-section section-wrap" aria-labelledby="dashboard-title">
        <div className="section-index"><span>08</span><span>PRODUCT PREVIEW / SAMPLE DATA</span></div><div className="dashboard-heading"><h2 id="dashboard-title">Everything important. One security <WordUnderline>overview.</WordUnderline></h2><p>Illustrative product view • Sample figures, not live data</p></div>
        <div className="dashboard-frame"><div className="dashboard-topbar"><div className="dashboard-brand"><span className="dashboard-brand-icon"><Radar /></span><strong>SecretRadar</strong><span>/ Overview</span></div><div className="dashboard-user"><span>DEMO WORKSPACE</span><span className="avatar-mark">S</span></div></div><div className="dashboard-content"><aside className="dashboard-sidebar"><span className="sidebar-caption">WORKSPACE</span>{["Overview", "Repositories", "Findings", "Scan activity", "Detection rules"].map((label, i) => <div className={`sidebar-link ${i === 0 ? "sidebar-active" : ""}`} key={label}><span className="sidebar-glyph">{["⌂", "⌘", "◉", "↗", "◎"][i]}</span>{label}</div>)}<div className="sidebar-permission"><ShieldCheck /><span>Permission checks<br /><strong>Enabled</strong></span></div></aside><div className="dashboard-main"><div className="dash-title-row"><div><span className="field-label">TUESDAY, NOVEMBER 17</span><h3>Security overview</h3></div><span className="demo-chip"><i /> SAMPLE DATA</span></div><div className="metric-row">{[["Repositories discovered", "1,284", "+ 42 this week", "neutral"], ["Authorized", "36", "Owner approved", "olive"], ["Repositories scanned", "31", "Last 24 hours", "blue"], ["Potential findings", "07", "3 require review", "coral"]].map(([label, value, detail, tone]) => <article className="metric" key={label}><span>{label}</span><strong className={`metric-${tone}`}>{value}</strong><small>{detail}</small></article>)}</div><div className="dash-panels"><article className="severity-chart"><div className="dash-panel-title"><div><span className="field-label">FINDINGS</span><h4>Severity distribution</h4></div><span className="sample-label">SAMPLE</span></div><div className="severity-chart-body"><div className="donut-chart"><span><strong>07</strong><small>sample</small></span></div><div className="severity-legend"><span><i className="sev-high" />High <b>02</b></span><span><i className="sev-medium" />Medium <b>03</b></span><span><i className="sev-low" />Low <b>02</b></span></div></div></article><article className="activity-chart"><div className="dash-panel-title"><div><span className="field-label">SCAN ACTIVITY</span><h4>Recent checks</h4></div><span className="sample-label">ILLUSTRATIVE</span></div><div className="bar-chart">{[["MON", 32], ["TUE", 58], ["WED", 41], ["THU", 75], ["FRI", 49], ["SAT", 30], ["SUN", 62]].map(([day, height]) => <div className="bar-item" key={day as string}><span className="bar-track"><i style={{ height: `${height}%` }} /></span><small>{day as string}</small></div>)}</div><div className="chart-legend"><i /> Authorized repository checks</div></article></div><div className="recent-row"><span className="field-label">RECENT SAMPLE FINDINGS</span><div><span className="recent-dot recent-high" /><strong>Potential API credential</strong><code>sample-api / config.py</code><span className="recent-severity">HIGH</span><span className="recent-time">Illustrative</span></div><div><span className="recent-dot recent-medium" /><strong>Cloud access pattern</strong><code>demo-service / settings.js</code><span className="recent-severity medium-sev">MEDIUM</span><span className="recent-time">Illustrative</span></div></div></div></div></div>
      </section>

      <section id="about" className="about-section section-wrap" aria-labelledby="about-title"><div className="section-index"><span>09</span><span>OUR APPROACH</span></div><div className="about-grid"><h2 id="about-title">Built for developers who care about what they <WordUnderline>publish.</WordUnderline></h2><div className="about-points">{["Visibility across public repository metadata.", "Authorized and controlled security scanning.", "Redacted findings that protect sensitive values.", "Actionable reports instead of confusing alerts."].map((item, i) => <p key={item}><span>0{i + 1}</span>{item}<Check /></p>)}</div></div></section>

      <section className="final-cta section-wrap" aria-labelledby="cta-title"><div className="section-index"><span>10</span><span>KEEP BUILDING IN PUBLIC</span></div><div className="final-cta-content"><p className="eyebrow"><span className="eyebrow-dot" /> Clear eyes on what you publish</p><h2 id="cta-title">Keep your code public. Keep your secrets <WordCircle>private.</WordCircle></h2><p>Start building better visibility into your repository security.</p><div className="hero-actions"><Button asChild className="button-ink"><a href="#finding">Get started <ArrowRight /></a></Button><a className="text-link" href="#platform">Explore the platform <ArrowRight /></a></div></div><svg className="cta-curve" viewBox="0 0 1350 180" preserveAspectRatio="none" aria-hidden="true"><path d="M-20 96c202 10 233-102 415-36 158 58 274 104 419 31 170-85 283-5 573 25" /></svg></section>

      <footer className="site-footer section-wrap"><div className="footer-top"><div className="footer-brand"><BrandMark /><p>Repository security intelligence<br />with permission, context, and care.</p></div><div className="footer-links"><div><span>PLATFORM</span><a href="#platform">Overview</a><a href="#process">How it works</a><a href="#detection">Detection</a><a href="#security">Security</a></div><div><span>RESOURCES</span><a href="#finding">Demonstration</a><a href="#dashboard">Product preview</a><a href="mailto:hello@secretradar.example">Contact <ArrowUpRight /></a><a href="#about">About</a></div></div></div><div className="footer-bottom"><span>Built for a more secure open-source ecosystem.</span><span>DESIGNED WITH INTENTION <span className="footer-spark">✳</span></span><a href="#top" aria-label="Back to top"><ArrowUpRight /></a></div></footer>
    </main>
  );
}
