import { Component, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, ArrowRight, BarChart3, Check, CheckCircle2, ClipboardCheck, Menu,
  Eye, EyeOff, ImagePlus, UploadCloud, Moon, Save, Sun, Target, UserRound, X, Zap,
  CalendarDays, Flag, Plus, Trash2, LayoutDashboard, ListChecks, Clock3, BookOpen, Flame, Trophy, TrendingUp, PieChart, Sparkles, ChevronRight, PanelLeftClose, PanelLeftOpen, Award, Timer, HelpCircle, Bell, ShieldCheck, Users, Send, Search, CheckCheck, Megaphone, UserCheck, ChevronDown, Info, PenLine, LockKeyhole, Cookie, Scale, Heart, ClipboardList, LogOut, WalletCards, Receipt, CircleDollarSign, Landmark, BriefcaseBusiness, TrendingDown, Percent, RotateCcw, Medal, FileText, Download
} from "lucide-react";
import { supabase } from "./supabaseClient";
import FinanceEngine from "./components/FinanceEngine";

// Shared finance panel heading used by the detailed Investment and Net Worth views.
function PanelHead({ kicker, title, icon }) {
  return (
    <div className="panel-heading">
      <div>
        <span className="card-kicker">{kicker}</span>
        <h2>{title}</h2>
      </div>
      {icon}
    </div>
  );
}

const features = [
  { icon: ClipboardCheck, title: "Smart To-Do", text: "Plan the work that matters and move completed tasks out of the way." },
  { icon: BarChart3, title: "Daily & Weekly Progress", text: "See exactly how consistently you are moving toward your study goals." },
  { icon: CheckCircle2, title: "Study Records", text: "Track lectures, questions, pages, exercise and your daily score." },
  { icon: Target, title: "Goals", text: "Turn bigger ambitions into measurable targets you can actually follow." },
  { icon: Zap, title: "Streaks", text: "Build momentum and keep your discipline visible day after day." },
  { icon: BarChart3, title: "Analytics", text: "Understand your strongest days, weak spots and long-term improvement." }
];

class TaskenErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || "Something unexpected happened." };
  }
  componentDidCatch(error) {
    console.error("TRACKEN runtime error:", error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="runtime-error-screen">
          <div className="runtime-error-card">
            <div className="runtime-error-mark">T<span>.</span></div>
            <span className="card-kicker">TRACKEN RECOVERY</span>
            <h1>We hit an unexpected problem.</h1>
            <p>Your study data is safely stored in Supabase. Refresh the page and try again.</p>
            <details><summary>Technical details</summary><code>{this.state.message}</code></details>
            <button className="primary-cta" onClick={() => window.location.reload()}>Refresh TRACKEN <ArrowRight size={17} /></button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function friendlyAuthError(message) {
  const text = String(message || "").toLowerCase();
  if (text.includes("invalid login credentials")) return "The email or password is incorrect.";
  if (text.includes("email not confirmed")) return "Please confirm your email before logging in.";
  if (text.includes("user already registered")) return "An account with this email already exists. Try logging in.";
  if (text.includes("password should be at least")) return "Your password must be at least 6 characters.";
  if (text.includes("rate limit")) return "Too many attempts. Please wait a moment and try again.";
  return message || "Something went wrong. Please try again.";
}

function getAuthRedirectUrl() {
  const base = import.meta.env.BASE_URL || "/";
  return new URL(base, window.location.origin).toString();
}


function useSyncedUserState(userId, column, initialValue, delay = 300) {
  const legacyKeys = {
    habits: "tracken-habits", tracked_seconds: "tracken-time-today", time_running: "tracken-time-running",
    focus_sessions: "tracken-focus-sessions", activity_log: "tracken-activity-log", money: "tracken-money",
    investments: "tracken-investments", assets: "tracken-assets", liabilities: "tracken-liabilities",
    monthly_budget: "tracken-monthly-budget", budget_categories: "tracken-budget-categories", finance_goals: "tracken-finance-goals", finance_goal_plans: "tracken-finance-goal-plans", projects: "tracken-projects", task_meta: "tracken-task-meta",
    daily_capacity: "tracken-daily-capacity", runway_start: "tracken-runway-start", cashflow_automation_rules: "tracken-cashflow-automation-rules"
  };
  const getInitial = () => {
    try {
      const cached = localStorage.getItem(`tracken-state-${column}-${userId}`);
      if (cached !== null) { const parsed = JSON.parse(cached); return Array.isArray(initialValue) && !Array.isArray(parsed) ? initialValue : parsed; }
      const legacy = legacyKeys[column] ? localStorage.getItem(legacyKeys[column]) : null;
      if (legacy !== null) { const parsed = JSON.parse(legacy); return Array.isArray(initialValue) && !Array.isArray(parsed) ? initialValue : parsed; }
      return initialValue;
    } catch { return initialValue; }
  };
  const [value, setValue] = useState(getInitial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.from("user_app_state").select(column).eq("user_id", userId).maybeSingle();
      if (cancelled) return;
      if (!error && data && data[column] !== null && data[column] !== undefined) { const remoteValue = data[column]; setValue(Array.isArray(initialValue) && !Array.isArray(remoteValue) ? initialValue : remoteValue); }
      setHydrated(true);
    })();
    return () => { cancelled = true; };
  }, [userId, column]);

  useEffect(() => {
    try { localStorage.setItem(`tracken-state-${column}-${userId}`, JSON.stringify(value)); } catch {}
    if (!hydrated) return undefined;
    const timer = setTimeout(() => {
      supabase.from("user_app_state").upsert({ user_id: userId, [column]: value, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
        .then(({ error }) => { if (error) console.warn(`TRACKEN state sync (${column}):`, error.message); });
    }, delay);
    return () => clearTimeout(timer);
  }, [value, hydrated, userId, column, delay]);

  return [value, setValue, hydrated];
}

function clearTrackenLocalCache(userId) {
  const prefixes = [
    "tracken-state-habits-", "tracken-state-tracked_seconds-", "tracken-state-time_running-",
    "tracken-state-focus_sessions-", "tracken-state-activity_log-", "tracken-state-money-",
    "tracken-state-investments-", "tracken-state-assets-", "tracken-state-liabilities-",
    "tracken-state-monthly_budget-", "tracken-state-budget_categories-", "tracken-state-finance_goals-", "tracken-state-finance_goal_plans-", "tracken-state-projects-", "tracken-state-task_meta-",
    "tracken-state-daily_capacity-", "tracken-state-runway_start-", "tracken-state-cashflow_automation_rules-"
  ];
  prefixes.forEach(prefix => localStorage.removeItem(`${prefix}${userId}`));
  ["tracken-habits", "tracken-time-today", "tracken-time-running", "tracken-focus-sessions", "tracken-activity-log", "tracken-money", "tracken-investments", "tracken-assets", "tracken-liabilities", "tracken-monthly-budget", "tracken-budget-categories", "tracken-finance-goals", "tracken-finance-goal-plans", "tracken-projects", "tracken-task-meta", "tracken-daily-capacity", "tracken-runway-start", "tracken-cashflow-automation-rules"].forEach(k => localStorage.removeItem(k));
  localStorage.removeItem(`tracken-avatar-${userId}`);
}

function normalizeArticleHtml(html) {
  const source = String(html || "");
  if (!source.includes("<")) return source.split(/\n\s*\n/).map(p => `<p>${p.replace(/\n/g, "<br />")}</p>`).join("");
  if (typeof window === "undefined") return source;
  const doc = new DOMParser().parseFromString(source, "text/html");
  doc.querySelectorAll("script,style,iframe,object,embed,form").forEach(el => el.remove());
  doc.querySelectorAll("*").forEach(el => {
    [...el.attributes].forEach(attr => {
      if (["src", "href", "alt", "title", "target", "rel", "width", "download"].includes(attr.name)) return;
      if (attr.name === "style" && el.tagName === "IMG") {
        const match = String(attr.value || "").match(/(?:^|;)\s*width\s*:\s*(\d{1,3})%/i);
        if (match) el.setAttribute("style", `width:${Math.min(100, Math.max(10, Number(match[1])))}%;height:auto;`);
        else el.removeAttribute("style");
        return;
      }
      el.removeAttribute(attr.name);
    });
    if (el.tagName === "A") {
      const href = el.getAttribute("href") || "";
      const safeHttp = /^https?:\/\//i.test(href);
      const safeData = /^data:(application\/pdf|application\/zip|application\/octet-stream|application\/vnd\.|text\/plain|image\/)[^,]*;base64,/i.test(href);
      if (!safeHttp && !safeData) el.removeAttribute("href");
      else { el.setAttribute("target", "_blank"); el.setAttribute("rel", "noreferrer noopener"); }
    }
    if (el.tagName === "IMG") {
      const src = el.getAttribute("src") || "";
      if (!/^https?:\/\//i.test(src) && !/^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,/i.test(src)) el.remove();
    }
  });
  return doc.body.innerHTML;
}

function parseUpdatePayload(message) {
  try {
    const parsed = JSON.parse(String(message || ""));
    if (parsed && parsed.__trackenUpdate === 1) return { html: String(parsed.html || ""), attachment: parsed.attachment || null };
  } catch {}
  return { html: normalizeArticleHtml(message || ""), attachment: null };
}

function formatFileSize(bytes) {
  const n = Number(bytes || 0);
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function getTimeGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 5) return "Welcome back";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 22) return "Good evening";
  return "Good night";
}

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem("tasken-theme") || "light");
  const [session, setSession] = useState(null);
  const [authView, setAuthView] = useState(null);
  const [publicPage, setPublicPage] = useState("home");
  const [selectedBlogPost, setSelectedBlogPost] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [recoveryMode, setRecoveryMode] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("tasken-theme", theme);
  }, [theme]);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        const msg = String(error.message || "").toLowerCase();
        if (msg.includes("issued in the future") || msg.includes("jwt")) {
          supabase.auth.signOut({ scope: "local" }).catch(() => {});
        }
        setSession(null);
      } else setSession(data.session);
      setLoadingSession(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "PASSWORD_RECOVERY") setRecoveryMode(true);
      if (event === "SIGNED_OUT") setRecoveryMode(false);
      setSession(nextSession);
      if (event === "TOKEN_REFRESHED" && !nextSession) setSession(null);
    });

    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  const toggleTheme = () => setTheme((current) => current === "light" ? "dark" : "light");

  if (loadingSession) {
    return <div className="loading-screen"><div className="loading-logo">TRACKEN<span>.</span></div></div>;
  }

  if (session && recoveryMode) {
    return (
      <PasswordRecoveryPage
        theme={theme}
        toggleTheme={toggleTheme}
        onComplete={() => setRecoveryMode(false)}
      />
    );
  }

  if (session) {
    return (
      <TaskenErrorBoundary>
        <Dashboard session={session} theme={theme} toggleTheme={toggleTheme} onLogout={() => setPublicPage("home")} />
      </TaskenErrorBoundary>
    );
  }

  if (authView) {
    return (
      <TaskenErrorBoundary>
      <AuthPage
        mode={authView}
        setMode={setAuthView}
        theme={theme}
        toggleTheme={toggleTheme}
        onBack={() => setAuthView(null)}
      />
      </TaskenErrorBoundary>
    );
  }

  if (publicPage === "blog-post" && selectedBlogPost) {
    return <TaskenErrorBoundary><BlogPostPage post={selectedBlogPost} theme={theme} toggleTheme={toggleTheme} onBack={() => { setSelectedBlogPost(null); setPublicPage("blog"); }} onLogin={() => setAuthView("login")} onRegister={() => setAuthView("register")} onContact={() => setPublicPage("contact")} onNavigate={setPublicPage} /></TaskenErrorBoundary>;
  }

  if (publicPage === "blog") {
    return <TaskenErrorBoundary><BlogPage theme={theme} toggleTheme={toggleTheme} onBack={() => setPublicPage("home")} onLogin={() => setAuthView("login")} onRegister={() => setAuthView("register")} onContact={() => setPublicPage("contact")} onNavigate={setPublicPage} onOpenPost={(post) => { setSelectedBlogPost(post); setPublicPage("blog-post"); }} /></TaskenErrorBoundary>;
  }

  if (["about", "privacy", "terms", "cookies", "disclaimer", "advertising"].includes(publicPage)) {
    return <TaskenErrorBoundary><LegalPage page={publicPage} theme={theme} toggleTheme={toggleTheme} onBack={() => setPublicPage("home")} onLogin={() => setAuthView("login")} onRegister={() => setAuthView("register")} onContact={() => setPublicPage("contact")} onNavigate={setPublicPage} /></TaskenErrorBoundary>;
  }

  if (publicPage === "contact") {
    return (
      <TaskenErrorBoundary>
        <ContactPage
          theme={theme}
          toggleTheme={toggleTheme}
          onBack={() => setPublicPage("home")}
          onLogin={() => setAuthView("login")}
          onRegister={() => setAuthView("register")}
          onBlog={() => setPublicPage("blog")}
          onContact={() => setPublicPage("contact")}
          onNavigate={setPublicPage}
        />
      </TaskenErrorBoundary>
    );
  }

  return (
    <TaskenErrorBoundary>
      <LandingHome
        theme={theme}
        toggleTheme={toggleTheme}
        onLogin={() => setAuthView("login")}
        onRegister={() => setAuthView("register")}
        onBlog={() => setPublicPage("blog")}
        onContact={() => setPublicPage("contact")}
        onNavigate={setPublicPage}
      />
    </TaskenErrorBoundary>
  );
}


function LandingHome({ theme, toggleTheme, onLogin, onRegister, onBlog, onContact, onNavigate }) {
  const [activeDemo, setActiveDemo] = useState("Overview");
  const heroVisualRef = useRef(null);
  const demo = {
    Overview: { icon: LayoutDashboard, eyebrow: "OVERVIEW / COMMAND CENTER", title: "See your whole day without opening five apps.", text: "TRACKEN connects execution, learning, routines, focus and progress into one operating picture.", stat: "84", label: "today's progress", progress: 84 },
    Tasks: { icon: ListChecks, eyebrow: "TASKS / EXECUTION", title: "Know what needs your attention next.", text: "Capture tasks, set priority and due dates, complete the work and keep the queue visible.", stat: "7 / 9", label: "tasks complete", progress: 78 },
    Study: { icon: BookOpen, eyebrow: "STUDY / LEARNING", title: "Turn study time into a record of progress.", text: "Track lectures, minutes, questions and pages so effort becomes evidence you can review.", stat: "3h 42m", label: "study recorded", progress: 68 },
    Goals: { icon: Target, eyebrow: "GOALS / DIRECTION", title: "Connect today's work to something bigger.", text: "Create measurable targets, monitor progress and connect everyday actions to longer-term goals.", stat: "72%", label: "goal progress", progress: 72 },
    Habits: { icon: Flame, eyebrow: "HABITS / CONSISTENCY", title: "Make consistency visible.", text: "Keep routines in one place, mark completion and see the pattern instead of relying on memory.", stat: "6 days", label: "current streak", progress: 76 },
    Focus: { icon: Timer, eyebrow: "FOCUS / TIME", title: "Protect the time that actually moves things forward.", text: "Record focused sessions and understand where your working time is going.", stat: "2h 15m", label: "deep work", progress: 64 },
    Money: { icon: WalletCards, eyebrow: "MONEY / VISIBILITY", title: "Bring everyday money into the same picture.", text: "Track cashflow, budgets, savings goals, investments and net worth without leaving your personal system.", stat: "₹24.8k", label: "available", progress: 71 }
  };
  const active = demo[activeDemo];
  const ActiveIcon = active.icon;
  const featureRows = [
    ["Tasks", "Priority queue · due dates · completion", ListChecks],
    ["Study", "Lectures · time · questions · pages", BookOpen],
    ["Goals", "Targets · progress · linked work", Target],
    ["Habits", "Routines · schedules · consistency", Flame],
    ["Focus", "Sessions · duration · time tracking", Timer],
    ["Money", "Cashflow · budget · investments · net worth", WalletCards],
    ["Review", "Analytics · patterns · weekly review", BarChart3]
  ];

  useEffect(() => {
    const nodes = document.querySelectorAll(".home-reveal");
    if (!("IntersectionObserver" in window)) { nodes.forEach(n => n.classList.add("is-visible")); return; }
    const observer = new IntersectionObserver(entries => entries.forEach(entry => entry.isIntersecting && entry.target.classList.add("is-visible")), { threshold: .08 });
    nodes.forEach(node => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  const handleHeroMove = (event) => {
    if (!heroVisualRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches || window.innerWidth < 900) return;
    const rect = heroVisualRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - .5;
    const y = (event.clientY - rect.top) / rect.height - .5;
    heroVisualRef.current.style.setProperty("--rx", `${(-y * 3.5).toFixed(2)}deg`);
    heroVisualRef.current.style.setProperty("--ry", `${(x * 5).toFixed(2)}deg`);
    heroVisualRef.current.style.setProperty("--mx", `${(x * 12).toFixed(1)}px`);
    heroVisualRef.current.style.setProperty("--my", `${(y * 10).toFixed(1)}px`);
  };
  const resetHero = () => { if (heroVisualRef.current) { heroVisualRef.current.style.setProperty("--rx", "0deg"); heroVisualRef.current.style.setProperty("--ry", "0deg"); heroVisualRef.current.style.setProperty("--mx", "0px"); heroVisualRef.current.style.setProperty("--my", "0px"); } };

  return (
    <div className="landing-v3 landing-v4">
      <PublicHeader
        theme={theme}
        toggleTheme={toggleTheme}
        onLogin={onLogin}
        onRegister={onRegister}
        onBlog={onBlog}
        onContact={onContact}
        onNavigate={onNavigate}
      />

      <main>
        <section className="home-hero home-hero-v4">
          <div className="home-ambient" aria-hidden="true"><i></i><i></i><i></i></div>
          <div className="home-hero-copy">
            <div className="landing-eyebrow"><span></span> ONE SYSTEM. EVERY KIND OF PROGRESS.</div>
            <h1>Track what matters.<br/><em>See yourself moving.</em></h1>
            <p>TRACKEN is a personal progress OS for tasks, study, goals, habits, focus, money and the patterns connecting them — all in one clear workspace.</p>
            <div className="landing-hero-actions"><button className="landing-primary home-primary" onClick={onRegister}>Start Tracking <ArrowRight size={18}/></button><a className="landing-secondary" href="#product">Explore TRACKEN <ChevronRight size={17}/></a></div>
            <div className="home-trust-line"><span><CheckCircle2 size={15}/> Real product workflows</span><span><ShieldCheck size={15}/> Personal account workspace</span><span><Zap size={15}/> Built for daily use</span></div>
            <div className="home-hero-microcopy"><b>Plan.</b><span>Track.</span><span>Review.</span><span>Keep moving.</span></div>
          </div>

          <div className="home-hero-stage home-hero-stage-v4" ref={heroVisualRef} onMouseMove={handleHeroMove} onMouseLeave={resetHero}>
            <div className="home-depth-glow" aria-hidden="true"></div>
            <div className="home-float home-float-a"><CheckCircle2 size={15}/><span>Today's execution</span><strong>7 / 9 done</strong></div>
            <div className="home-float home-float-b"><Target size={15}/><span>Active goal</span><strong>72%</strong></div>
            <div className="home-float home-float-c"><Flame size={15}/><span>Consistency</span><strong>6 day streak</strong></div>
            <div className="home-product-shell home-product-shell-v4">
              <div className="home-product-bar"><div><i></i><i></i><i></i></div><span>TRACKEN · COMMAND CENTER</span><small><b></b> PERSONAL PROGRESS OS</small></div>
              <div className="home-product-body home-product-body-v4">
                <aside className="home-product-sidebar-v4">
                  <div className="home-mini-brand">T<span>.</span></div>
                  {[LayoutDashboard,ListChecks,BookOpen,Target,Flame,Timer,WalletCards,BarChart3].map((Icon,i)=><div key={i} className={i===0?"active":""}><Icon size={14}/><span>{["Overview","Tasks","Study","Goals","Habits","Focus","Money","Analytics"][i]}</span></div>)}
                </aside>
                <div className="home-product-main home-product-main-v4">
                  <div className="home-product-heading"><div><small>MONDAY · YOUR OPERATING PICTURE</small><h3>Everything important, in context.</h3><p>See today's execution and the bigger direction together.</p></div><div className="home-avatar">T</div></div>
                  <div className="home-command-metrics">
                    <article className="featured"><span>DAILY PROGRESS</span><strong>84</strong><small>/100 · moving well today</small><div className="metric-line"><i style={{width:"84%"}}></i></div></article>
                    <article><span>TASKS</span><strong>7 / 9</strong><small>2 remaining</small><div className="metric-line"><i style={{width:"78%"}}></i></div></article>
                    <article><span>STUDY</span><strong>3h 42m</strong><small>4 sessions</small><div className="metric-line"><i style={{width:"68%"}}></i></div></article>
                    <article><span>FOCUS</span><strong>2h 15m</strong><small>deep work</small><div className="metric-line"><i style={{width:"64%"}}></i></div></article>
                  </div>
                  <div className="home-dashboard-rich-grid">
                    <article className="rich-panel task-queue"><div className="rich-panel-head"><span>SMART QUEUE</span><b>5 active</b></div>{["Finish priority task","Review lecture notes","20 reasoning questions","Plan tomorrow"].map((x,i)=><div className="rich-task" key={x}><i className={i<2?"done":""}>{i<2?"✓":""}</i><span>{x}<small>{["Today · Priority","Today · Study","Today · Practice","Tomorrow · Plan"][i]}</small></span><b>{i<2?"DONE":i===2?"NEXT":"PLAN"}</b></div>)}</article>
                    <article className="rich-panel progress-panel"><div className="rich-panel-head"><span>PROGRESS MAP</span><BarChart3 size={13}/></div><div className="rich-ring"><div><strong>78%</strong><small>this week</small></div></div><div className="mini-bars">{[38,55,47,72,61,86,68].map((v,i)=><i key={i} style={{height:`${v}%`}}></i>)}</div></article>
                    <article className="rich-panel goal-panel"><div className="rich-panel-head"><span>GOAL MOMENTUM</span><Target size={13}/></div><strong>Build consistent momentum</strong><div className="metric-line"><i style={{width:"72%"}}></i></div><small>72% · connected to today's work</small><div className="goal-tags"><span>3 tasks</span><span>7 days</span></div></article>
                    <article className="rich-panel finance-panel"><div className="rich-panel-head"><span>MONEY SNAPSHOT</span><WalletCards size={13}/></div><strong>₹24,800</strong><small>available after planned commitments</small><div className="finance-row"><span>Budget</span><b>68%</b></div><div className="finance-row"><span>Savings goal</span><b>54%</b></div></article>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <a href="#value" className="home-scroll-cue" aria-label="Scroll to learn more"><span>SEE WHY IT MATTERS</span><i></i></a>
        </section>

        <section className="home-value home-reveal" id="value">
          <div className="landing-section-kicker">WHY TRACKEN</div>
          <div className="home-value-grid home-value-grid-v4"><div><h2>Your effort is happening everywhere.<br/><em>Your progress shouldn't be.</em></h2><p className="home-lead">Tasks get finished. Lectures get studied. Habits get repeated. Goals move forward. Focus gets spent. Money moves.</p></div><div><p>When those pieces live in separate places, you can be busy without knowing whether you are actually moving forward.</p><strong>TRACKEN brings the important signals into one operating picture — so the next action and the bigger direction can sit together.</strong><button className="home-text-cta" onClick={onRegister}>Start Tracking <ArrowRight size={16}/></button></div></div>
          <div className="home-system-strip"><span>PLAN <b>Tasks · Goals</b></span><span>BUILD <b>Study · Habits</b></span><span>FOCUS <b>Sessions · Time</b></span><span>MANAGE <b>Budget · Investments</b></span><span>REVIEW <b>Analytics · Weekly Review</b></span></div>
        </section>

        <section className="home-product-section home-reveal" id="product">
          <div className="home-section-heading home-section-heading-v4"><div><div className="landing-section-kicker">THE PRODUCT</div><h2>Not a concept.<br/><em>A system you can use.</em></h2></div><p>The homepage should not make you imagine the product. This is the product logic: real workflows, real screens and a connected view of what you are doing.</p></div>
          <div className="home-product-showcase-v4">
            <div className="showcase-topbar"><span>TRACKEN / OVERVIEW</span><div><i></i><i></i><i></i></div><b>LIVE PRODUCT PREVIEW</b></div>
            <div className="showcase-body">
              <aside><div className="showcase-brand">TRACKEN<span>.</span><small>PERSONAL PROGRESS OS</small></div>{featureRows.map(([name,sub,Icon])=><button key={name} className={activeDemo===name||((activeDemo==="Money"&&name==="Money"))?"active":""} onClick={()=>setActiveDemo(name)}><Icon size={14}/><span>{name}<small>{sub.split(" · ")[0]}</small></span></button>)}</aside>
              <div className="showcase-content">
                <div className="showcase-head"><div><span>{active.eyebrow}</span><h3>{active.title}</h3><p>{active.text}</p></div><div className="showcase-score"><strong>{active.stat}</strong><small>{active.label}</small></div></div>
                <div className="showcase-grid">
                  <div className="showcase-card showcase-card-large"><div className="showcase-card-head"><span>ACTIVITY / TODAY</span><b>Live preview</b></div><div className="showcase-activity"><div><strong>7</strong><span>tasks done</span></div><div><strong>3h 42m</strong><span>study</span></div><div><strong>2h 15m</strong><span>focus</span></div><div><strong>6</strong><span>day streak</span></div></div><div className="showcase-chart">{[24,46,38,68,54,82,61,90,72,84,63,76].map((v,i)=><i key={i} style={{height:`${v}%`}}></i>)}</div></div>
                  <div className="showcase-card"><div className="showcase-card-head"><span>NEXT BEST ACTION</span><Zap size={14}/></div><strong className="showcase-action">Finish priority task</strong><p>One useful move is better than another crowded list.</p><button onClick={onRegister}>Open TRACKEN <ArrowRight size={14}/></button></div>
                  <div className="showcase-card"><div className="showcase-card-head"><span>GOAL / MOMENTUM</span><Target size={14}/></div><strong>Build consistent momentum</strong><div className="showcase-progress"><i style={{width:`${active.progress}%`}}></i></div><div className="showcase-meta"><span>{active.progress}% progress</span><span>Connected work</span></div></div>
                  <div className="showcase-card"><div className="showcase-card-head"><span>REVIEW SIGNAL</span><BarChart3 size={14}/></div><strong>Patterns become easier to see.</strong><p>Analytics and weekly review turn recorded activity into a clearer next step.</p></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="home-demo home-reveal" id="features">
          <div className="home-section-heading home-section-heading-v4"><div><div className="landing-section-kicker">EXPLORE THE SYSTEM</div><h2>One workspace.<br/><em>Many useful signals.</em></h2></div><p>Switch between the parts of TRACKEN that matter to you. The point is not more screens — it is a clearer relationship between them.</p></div>
          <div className="home-demo-tabs home-demo-tabs-v4" role="tablist">{Object.keys(demo).map(name=>{const Icon=demo[name].icon; return <button key={name} role="tab" aria-selected={activeDemo===name} className={activeDemo===name?"active":""} onClick={()=>setActiveDemo(name)}><Icon size={14}/>{name}</button>})}</div>
          <div className="home-demo-panel home-demo-panel-v4" key={activeDemo}><div className="home-demo-copy"><div className="landing-section-kicker">{active.eyebrow}</div><ActiveIcon size={28}/><h3>{active.title}</h3><p>{active.text}</p><button className="landing-primary" onClick={onRegister}>Start Tracking <ArrowRight size={17}/></button></div><div className="home-demo-visual home-demo-visual-v4"><div className="demo-window-head"><span>TRACKEN / {activeDemo.toUpperCase()}</span><small>INTERACTIVE PREVIEW</small></div><div className="demo-command-row"><div className="demo-big-number"><span>{active.label}</span><strong>{active.stat}</strong></div><div className="demo-ring-small" style={{"--progress":`${active.progress}%`}}><span>{active.progress}%</span></div></div><div className="demo-detail-grid"><div><span>Today</span><b>Visible</b><small>Record the work you actually did.</small></div><div><span>Next</span><b>Actionable</b><small>Know what deserves attention next.</small></div><div><span>Review</span><b>Connected</b><small>See how activity adds up over time.</small></div></div></div></div>
        </section>

        <section className="home-progress home-reveal home-progress-v4"><div><div className="landing-section-kicker">VISIBLE PROGRESS</div><h2>When effort is recorded,<br/><em>progress gets a shape.</em></h2><p>Illustrative values only — the experience is about making change visible: from the first task completed to a pattern you can review.</p><div className="progress-story"><span><b>01</b> Record</span><span><b>02</b> Complete</span><span><b>03</b> Review</span></div></div><div className="home-progress-visual home-progress-visual-v4"><div className="home-progress-ring"><strong>75%</strong><span>PROGRESS</span></div><div className="home-progress-steps">{[0,25,50,75,100].map(v=><div key={v} className={v<=75?"active":""}><i></i><span>{v}%</span></div>)}</div></div></section>

        <section className="home-how home-reveal" id="how-it-works"><div className="home-section-heading home-section-heading-v4"><div><div className="landing-section-kicker">HOW TRACKEN WORKS</div><h2>Plan → Track →<br/><em>Improve.</em></h2></div><p>Three steps. One loop. TRACKEN stays useful because the system moves with you instead of becoming another thing to manage.</p></div><div className="home-how-grid home-how-grid-v4">{[["01","PLAN","Add your tasks, lectures and goals.",ClipboardCheck],["02","TRACK","Complete the work, record sessions and build routines.",TrendingUp],["03","IMPROVE","Review the signals and decide what comes next.",Sparkles]].map(([n,t,x,Icon])=><article key={n}><span>{n}</span><div><Icon size={22}/></div><h3>{t}</h3><p>{x}</p><b>{n==="01"?"Give effort a direction":n==="02"?"Make the work visible":"Turn visibility into momentum"}</b></article>)}</div></section>

        <section className="home-trust home-reveal"><div className="landing-section-kicker">TRUST THE EXPERIENCE</div><h2>See what you are getting.</h2><p>No invented ratings, user counts or productivity claims. Trust comes from the product itself: the depth of the workflows, the clarity of the interface and a personal workspace that continues after you sign in.</p><div className="home-trust-grid home-trust-grid-v4"><span><ShieldCheck size={20}/><b>Personal workspace</b><small>TRACKEN is built around an account-based workspace for your own tracking system.</small></span><span><LayoutDashboard size={20}/><b>Connected system</b><small>Tasks, study, goals, habits, focus, money and review live inside one product.</small></span><span><LockKeyhole size={20}/><b>Designed for real use</b><small>Less decorative noise. More controls, records, progress and useful context.</small></span></div></section>

        <section className="landing-final-cta home-final home-final-v4 home-reveal"><div className="home-final-orb" aria-hidden="true"></div><div className="landing-section-kicker">START WITH ONE THING</div><h2>Your progress<br/><em>deserves to be seen.</em></h2><p>You do not need to organise your whole life on day one. Start with the part you want to make clearer — then build from there.</p><button className="landing-primary home-primary" onClick={onRegister}>Start Tracking <ArrowRight size={18}/></button><small>No complicated setup. Just a clearer place to begin.</small></section>
      </main>

      <footer className="landing-footer-v2 landing-footer-v4"><div><div className="landing-footer-brand">TRACKEN<span>.</span></div><small>PERSONAL PROGRESS OS</small><p>Track what matters. Understand your patterns. Keep moving.</p></div><div className="landing-footer-links"><a href="#features">Features</a><button onClick={()=>onNavigate("about")}>About</button><button onClick={onContact}>Contact</button><button onClick={onBlog}>Blog</button></div><div className="landing-footer-policies"><button onClick={()=>onNavigate("privacy")}>Privacy Policy</button><button onClick={()=>onNavigate("terms")}>Terms</button><button onClick={()=>onNavigate("disclaimer")}>Disclaimer</button><button onClick={()=>onNavigate("cookies")}>Cookie Policy</button><button onClick={()=>onNavigate("advertising")}>Advertising</button></div><div className="landing-footer-bottom"><span>TRACKEN by MMD</span><span>Personal Progress OS</span></div></footer>
    </div>
  );
}

function DashboardPreview() {
  const nav = [[LayoutDashboard,"Dashboard",true],[ListChecks,"Tasks"],[BookOpen,"Study records"],[Target,"Goals"],[CalendarDays,"Calendar"],[Trophy,"Achievements"],[TrendingUp,"Momentum"]];
  const heat = Array.from({length: 35}, (_, i) => (i % 9 === 0 || i % 11 === 0) ? 3 : (i % 4 === 0 ? 2 : (i % 3 === 0 ? 1 : 0)));
  return <div className="hero-visual hero-real-dashboard" aria-label="TRACKEN command center preview">
    <div className="glow"></div>
    <div className="dashboard-window dashboard-window-rich">
      <div className="window-bar">
        <div className="window-dots"><i></i><i></i><i></i></div>
        <span>TRACKEN · COMMAND CENTER</span>
        <div className="window-status"><span></span> Live study tracker</div>
      </div>
      <div className="real-dashboard-preview">
        <aside className="preview-sidebar">
          <div className="preview-brand">TRACKEN<span>.</span><small>COMMAND CENTER</small></div>
          <div className="preview-nav">{nav.map(([Icon,label,active])=><div key={label} className={`preview-nav-item ${active?"active":""}`}><Icon size={12}/>{label}</div>)}</div>
          <div className="preview-sidebar-bottom"><div className="preview-avatar">Y</div><span>Yash<small>Just building myself</small></span></div>
        </aside>
        <div className="preview-main">
          <div className="preview-top">
            <div><span className="mini-label">AUG 26 · TODAY</span><h3>Good morning, Yash.</h3><small className="preview-subline">Plan clearly. Work consistently. See the progress.</small></div>
            <div className="preview-actions"><span><Flame size={12}/> 12 days</span><b>Y</b></div>
          </div>
          <div className="preview-metrics preview-metrics-five">
            <div><span>Tasks today</span><strong>7/9</strong><small>78% complete</small></div>
            <div><span>Study time</span><strong>4h 20m</strong><small>+42m this week</small></div>
            <div><span>Questions</span><strong>125</strong><small>+18 today</small></div>
            <div><span>Streak</span><strong>12 days</strong><small>Best 18 days</small></div>
            <div className="preview-accent-card"><span>Daily score</span><strong>82%</strong><small>Excellent momentum</small></div>
          </div>
          <div className="preview-content-grid preview-main-grid">
            <div className="preview-real-panel preview-task-panel">
              <div className="preview-panel-head"><span>Today's tasks</span><b>+ Add task</b></div>
              {["Complete algebra lecture","50 reasoning questions","Read 20 pages","Revise formulas","Review yesterday's notes"].map((task,i)=><div className={`preview-real-task ${i===0?"done":""}`} key={task}><i>{i===0?"✓":""}</i><span>{task}<small>{["Math · 60 min","Aptitude · 45 min","Physics · 30 min","Chemistry · 25 min","Revision · 20 min"][i]}</small></span>{i===0&&<b>Done</b>}</div>)}
            </div>
            <div className="preview-real-panel preview-progress-real">
              <div className="preview-panel-head"><span>Progress overview</span><BarChart3 size={14}/></div>
              <div className="preview-ring"><div><strong>78%</strong><small>Today</small></div></div>
              <div className="preview-progress-row"><span>Today</span><b>78%</b></div><div className="preview-line"><i style={{width:"78%"}}></i></div>
              <div className="preview-progress-row"><span>This week</span><b>68%</b></div><div className="preview-line"><i style={{width:"68%"}}></i></div>
              <div className="preview-legend"><span><i></i>Completed</span><span><i></i>Remaining</span></div>
            </div>
          </div>
          <div className="preview-lower-grid preview-rich-lower">
            <div className="preview-real-panel">
              <div className="preview-panel-head"><span>Study rhythm</span><small>Last 7 days</small></div>
              <div className="preview-bars">{[24,48,34,72,58,80,92].map((h,i)=><div key={i}><i style={{height:`${h}%`}}></i><span>{["M","T","W","T","F","S","S"][i]}</span></div>)}</div>
            </div>
            <div className="preview-real-panel preview-heatmap-panel">
              <div className="preview-panel-head"><span>Activity heatmap</span><small>Consistency</small></div>
              <div className="preview-heatmap">{heat.map((v,i)=><i key={i} className={`heat-${v}`}></i>)}</div>
              <div className="preview-heat-legend"><span>Less</span><i className="heat-0"></i><i className="heat-1"></i><i className="heat-2"></i><i className="heat-3"></i><span>More</span></div>
            </div>
            <div className="preview-real-panel preview-goal">
              <div className="preview-panel-head"><span>Goal momentum</span><b>View all</b></div>
              <strong>BUILD 100 WEBSITE</strong><div className="preview-goal-line"><i style={{width:"43%"}}></i></div><small>43% · 1 task completed · 6 days left</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>;
}

function PublicHeader({ theme, toggleTheme, onLogin, onRegister, onBlog, onContact, onNavigate }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const goHomeSection = (section) => {
    setMobileNavOpen(false);
    if (onNavigate) onNavigate("home");
    window.setTimeout(() => {
      const target = document.getElementById(section);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      else window.scrollTo({ top: 0, behavior: "smooth" });
    }, 0);
  };

  const goBlog = () => {
    setMobileNavOpen(false);
    onBlog?.();
  };

  const goContact = () => {
    setMobileNavOpen(false);
    onContact?.();
  };

  const goLogin = () => {
    setMobileNavOpen(false);
    onLogin?.();
  };

  const goRegister = () => {
    setMobileNavOpen(false);
    onRegister?.();
  };

  return (
    <header className="landing-nav landing-nav-v3 landing-nav-v4 public-shared-header">
      <button className="landing-brand" onClick={() => { setMobileNavOpen(false); onNavigate?.("home"); window.scrollTo({ top: 0, behavior: "smooth" }); }} aria-label="TRACKEN home">
        TRACKEN<span>.</span><small>PERSONAL PROGRESS OS</small>
      </button>
      <nav className={`landing-nav-links ${mobileNavOpen ? "is-open" : ""}`} aria-label="Primary navigation">
        <button onClick={() => goHomeSection("features")}>Features</button>
        <button onClick={() => goHomeSection("how-it-works")}>How It Works</button>
        <button onClick={goBlog}>Blog</button>
        <button onClick={goContact}>Contact</button>
      </nav>
      <div className="landing-actions landing-actions-v4">
        <button className="landing-mobile-menu" onClick={() => setMobileNavOpen(v => !v)} aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"} aria-expanded={mobileNavOpen}>{mobileNavOpen ? <X size={19}/> : <Menu size={19}/>}</button>
        <button className="landing-theme" onClick={toggleTheme} aria-label="Toggle theme" title={theme === "light" ? "Dark mode" : "Light mode"}>{theme === "light" ? <Moon size={17}/> : <Sun size={17}/>}</button>
        <button className="landing-login" onClick={goLogin}>Login</button>
        <button className="landing-signup" onClick={goRegister}>Get Started <ArrowRight size={16}/></button>
      </div>
    </header>
  );
}

function ContactPage({ theme, toggleTheme, onBack, onLogin, onRegister, onBlog, onContact, onNavigate }) {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const submit = (event) => { event.preventDefault(); setSent(true); };
  return (
    <div className="contact-page-shell">
      <PublicHeader
        theme={theme}
        toggleTheme={toggleTheme}
        onLogin={onLogin}
        onRegister={onRegister}
        onBlog={onBlog}
        onContact={onContact}
        onNavigate={onNavigate}
      />
      <main className="contact-page-main">
        <section className="contact-page-hero contact-page-hero-premium">
          <div className="contact-page-copy">
            <div className="eyebrow"><span></span> Get in touch</div>
            <h1>Let's make<br /><em>better study days.</em></h1>
            <p>Have an idea, a question or feedback about TRACKEN? Tell us what would make your workflow more useful, focused or enjoyable.</p>
            <div className="contact-promise">
              <div><div className="contact-promise-icon"><CheckCircle2 size={18}/></div><span><strong>Real feedback matters.</strong> Useful ideas help shape the product.</span></div>
              <div><div className="contact-promise-icon"><Zap size={18}/></div><span><strong>Built around students.</strong> Share the friction you want removed.</span></div>
              <div><div className="contact-promise-icon"><Heart size={18}/></div><span><strong>Thoughtful replies.</strong> We aim to respond clearly and respectfully.</span></div>
            </div>
          </div>
          <div className="contact-form-wrap">
            <div className="contact-form-glow"></div>
            <form className="contact-form-card contact-form-card-premium" onSubmit={submit}>
              <div className="contact-form-head"><span className="card-kicker">SEND A MESSAGE</span><h2>What can we help with?</h2><p>Share as much detail as you'd like.</p></div>
              {sent ? (
                <div className="contact-success">
                  <div className="contact-success-icon"><Check size={24}/></div><span className="card-kicker">MESSAGE READY</span><h3>Thanks for reaching out.</h3><p>Your message has been prepared successfully. We'll connect the live delivery channel before production launch.</p><button type="button" className="secondary-cta" onClick={() => { setSent(false); setForm({ name:"", email:"", subject:"", message:"" }); }}>Send another message</button>
                </div>
              ) : (
                <>
                  <div className="contact-form-grid"><label><span>Your name</span><input value={form.name} onChange={(e)=>update("name",e.target.value)} placeholder="Your name" required /></label><label><span>Email address</span><input type="email" value={form.email} onChange={(e)=>update("email",e.target.value)} placeholder="you@example.com" required /></label></div>
                  <label><span>Subject</span><input value={form.subject} onChange={(e)=>update("subject",e.target.value)} placeholder="What would you like to share?" required /></label>
                  <label><span>Message</span><textarea value={form.message} onChange={(e)=>update("message",e.target.value)} placeholder="Write your message here..." rows="7" required /></label>
                  <button className="primary-cta contact-submit" type="submit">Send message <ArrowRight size={18}/></button>
                </>
              )}
            </form>
            <div className="contact-visual-card"><div className="contact-visual-orbit"><Send size={28}/></div><span>YOUR VOICE MATTERS</span><strong>Let's build something<br />better together.</strong><small>Clear ideas. Better tools. Stronger study days.</small></div>
          </div>
        </section>
      </main>
      <PublicFooter onNavigate={(page) => page === "home" ? onBack() : onNavigate?.(page)} />
    </div>
  );
}

function BlogPage({theme,toggleTheme,onBack,onLogin,onRegister,onContact,onNavigate,onOpenPost}) {
  const [mobileNavOpen,setMobileNavOpen]=useState(false);
  const [posts,setPosts]=useState([]);
  const [loading,setLoading]=useState(true);
  const [activeCategory,setActiveCategory]=useState("All");
  const [galleryOpen,setGalleryOpen]=useState(false);
  const [galleryImages,setGalleryImages]=useState([]);
  const [galleryIndex,setGalleryIndex]=useState(0);
  const galleryTouchStart=useRef(0);

  useEffect(()=>{
    let mounted=true;
    (async()=>{
      setLoading(true);
      const [{data,error},{data:galleryData,error:galleryError}]=await Promise.all([
        supabase.from("blog_posts").select("*").eq("published",true).order("published_at",{ascending:false}),
        supabase.from("journal_gallery").select("*").order("created_at",{ascending:false})
      ]);
      if(mounted){
        setPosts(!error && Array.isArray(data) ? data : []);
        setGalleryImages(!galleryError && Array.isArray(galleryData) ? galleryData : []);
        setLoading(false);
      }
    })();
    return()=>{mounted=false};
  },[]);

  const categories=["All",...Array.from(new Set(posts.map(p=>p.category).filter(Boolean)))];
  const visible=activeCategory==="All"?posts:posts.filter(p=>p.category===activeCategory);

  return (
    <div className="public-page-shell journal-page-shell">
      <PublicHeader
        theme={theme}
        toggleTheme={toggleTheme}
        onLogin={onLogin}
        onRegister={onRegister}
        onBlog={() => {}}
        onContact={onContact}
        onNavigate={onNavigate}
      />
      <main className="journal-main" id="journal-intro">
        <section className="journal-hero-clean">
          <div className="journal-hero-copy">
            <span className="eyebrow"><span></span> TRACKEN BLOG</span>
            <h1>Ideas, systems &amp;<br/><em>better days.</em></h1>
            <p>A quiet place for practical writing on study, discipline, focus, planning and the systems that make progress easier to see.</p>
          </div>
          <div className="journal-hero-mark">
            <BookOpen size={25}/>
            <span>THE BLOG</span>
            <strong>{posts.length}</strong>
            <small>{posts.length===1 ? "published entry" : "published entries"}</small>
          </div>
        </section>

        <section className="journal-gallery-entry">
          <div><span className="card-kicker">VISUAL BLOG</span><h2>Gallery of TRACKEN</h2><p>Moments, product visuals and images shared directly from the TRACKEN studio.</p></div>
          <button className="primary-cta" onClick={()=>{setGalleryIndex(0);setGalleryOpen(true)}}><ImagePlus size={17}/> View Gallery <ArrowRight size={16}/></button>
        </section>

        {galleryOpen && (
          <div
            className="journal-gallery-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Gallery of TRACKEN"
            onClick={() => setGalleryOpen(false)}
          >
            <div className="journal-gallery-modal" onClick={(e) => e.stopPropagation()}>
              <div className="journal-gallery-head">
                <div>
                  <span className="card-kicker">TRACKEN BLOG</span>
                  <h2>Gallery of TRACKEN</h2>
                  <p>
                    {galleryImages.length}{" "}
                    {galleryImages.length === 1 ? "image" : "images"} published
                  </p>
                </div>
                <button
                  className="icon-button"
                  onClick={() => setGalleryOpen(false)}
                  aria-label="Close gallery"
                >
                  <X size={20} />
                </button>
              </div>

              {galleryImages.length > 0 ? (
                <>
                  <div
                    className="journal-gallery-viewer"
                    onTouchStart={(e) => {
                      galleryTouchStart.current = e.changedTouches[0].clientX;
                    }}
                    onTouchEnd={(e) => {
                      const dx = e.changedTouches[0].clientX - galleryTouchStart.current;
                      if (Math.abs(dx) > 45) {
                        setGalleryIndex((i) =>
                          dx < 0
                            ? Math.min(i + 1, galleryImages.length - 1)
                            : Math.max(i - 1, 0)
                        );
                      }
                    }}
                  >
                    <button
                      className="gallery-nav gallery-prev"
                      onClick={() => setGalleryIndex((i) => Math.max(i - 1, 0))}
                      disabled={galleryIndex === 0}
                      aria-label="Previous image"
                    >
                      ‹
                    </button>

                    <figure>
                      <img
                        src={galleryImages[galleryIndex].image_url}
                        alt={
                          galleryImages[galleryIndex].alt_text ||
                          galleryImages[galleryIndex].caption ||
                          "TRACKEN gallery"
                        }
                      />
                      {galleryImages[galleryIndex].caption && (
                        <figcaption>{galleryImages[galleryIndex].caption}</figcaption>
                      )}
                      <div className="gallery-viewer-meta">
                        <span>
                          {galleryIndex + 1} / {galleryImages.length}
                        </span>
                        <a
                          href={galleryImages[galleryIndex].image_url}
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          Open full image
                        </a>
                      </div>
                    </figure>

                    <button
                      className="gallery-nav gallery-next"
                      onClick={() =>
                        setGalleryIndex((i) => Math.min(i + 1, galleryImages.length - 1))
                      }
                      disabled={galleryIndex === galleryImages.length - 1}
                      aria-label="Next image"
                    >
                      ›
                    </button>
                  </div>

                  <div className="gallery-thumbnail-strip">
                    {galleryImages.map((item, i) => (
                      <button
                        key={item.id}
                        className={i === galleryIndex ? "active" : ""}
                        onClick={() => setGalleryIndex(i)}
                        aria-label={`View image ${i + 1}`}
                      >
                        <img src={item.image_url} alt="" />
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="journal-gallery-empty">
                  <ImagePlus size={28} />
                  <h3>The gallery is ready.</h3>
                  <p>Images uploaded from Admin will appear here instantly.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {posts.length>0 && <div className="journal-filter-row">{categories.map(c=><button key={c} className={activeCategory===c?"active":""} onClick={()=>setActiveCategory(c)}>{c}</button>)}</div>}

        {loading ? (
          <section className="journal-empty-state journal-loading-state"><div className="journal-empty-icon"><BookOpen size={23}/></div><span className="card-kicker">LOADING BLOG</span><h2>Preparing your latest entries.</h2><p>Just a moment.</p></section>
        ) : visible.length===0 ? (
          <section className="journal-empty-state">
            <div className="journal-empty-icon"><PenLine size={23}/></div>
            <span className="card-kicker">YOUR BLOG</span>
            <h2>Your first entry starts here.</h2>
            <p>No articles have been published yet. Write your first blog article from the TRACKEN Admin portal and it will appear here automatically.</p>
            <button className="primary-cta" onClick={onLogin}>Write a blog article <ArrowRight size={16}/></button>
          </section>
        ) : (
          <section className="journal-grid">
            {visible.map((post,index)=><article className={`journal-card ${index===0?"featured":""}`} key={post.id||post.slug} role="button" tabIndex={0} onClick={()=>onOpenPost(post)} onKeyDown={(e)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();onOpenPost(post);}}}>
              <div className="journal-card-art"><span>{String(index+1).padStart(2,"0")}</span><BookOpen size={28}/></div>
              <div className="journal-card-content">
                <div className="journal-meta"><span>{post.category||"Blog"}</span><time>{post.published_at?new Date(post.published_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}):"Published"}</time></div>
                <h2>{post.title}</h2>
                <p>{post.excerpt}</p>
                <div className="journal-card-footer"><span>{post.read_minutes||5} min read</span><ArrowRight size={16}/></div>
              </div>
            </article>)}
          </section>
        )}
      </main>
      <PublicFooter onNavigate={(page)=>{if(page==="home")onBack(); else onNavigate(page);}}/>
    </div>
  );
}

function BlogPostPage({post,theme,toggleTheme,onBack,onLogin,onRegister,onContact,onNavigate}) {
  const articleHtml = normalizeArticleHtml(post?.content || "");
  const published = post?.published_at ? new Date(post.published_at).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"}) : "Published";
  return (
    <div className="public-page-shell journal-post-shell">
      <PublicHeader
        theme={theme}
        toggleTheme={toggleTheme}
        onLogin={onLogin}
        onRegister={onRegister}
        onBlog={onBack}
        onContact={onContact}
        onNavigate={onNavigate}
      />
      <main className="journal-post-main">
        <button className="journal-back-link" onClick={onBack}><ArrowLeft size={15}/> Back to Blog</button>
        <article className="journal-post-article">
          <header className="journal-post-header">
            <div className="journal-meta"><span>{post?.category || "Blog"}</span><time>{published}</time></div>
            <h1>{post?.title || "Blog entry"}</h1>
            {post?.excerpt && <p className="journal-post-excerpt">{post.excerpt}</p>}
            <div className="journal-post-meta"><span>{post?.read_minutes || 5} min read</span><span>TRACKEN BLOG</span></div>
          </header>
          <div className="journal-post-body" dangerouslySetInnerHTML={{__html: articleHtml}} />
        </article>
      </main>
      <PublicFooter onNavigate={(page)=>{if(page==="home")onNavigate("home"); else onNavigate(page);}}/>
    </div>
  );
}

function LegalPage({page,theme,toggleTheme,onBack,onLogin,onRegister,onNavigate}) {
  const content={
    about:{icon:Heart,kicker:"ABOUT TRACKEN",title:"A calmer way to build better study days.",intro:"TRACKEN is a focused student productivity platform built around tasks, study records, goals, streaks and measurable progress.",sections:[["Our approach","We believe study systems should reduce friction, not add another layer of complexity. TRACKEN brings the work, the record and the bigger picture into one command center."],["Built for consistency","The product is designed to help students turn daily effort into visible momentum through clear tasks, honest records and meaningful goals."],["Our promise","We aim to keep TRACKEN useful, transparent and respectful of the people who use it."]]},
    privacy:{icon:LockKeyhole,kicker:"PRIVACY POLICY",title:"Your information deserves clarity.",intro:"This page explains, in plain language, how TRACKEN handles information used to provide the service.",sections:[["Information we collect","TRACKEN may collect account details, profile information, tasks, goals, study records and messages you choose to submit so the service can provide your requested features."],["How information is used","Information is used to authenticate your account, save your progress, provide dashboard features, communicate important service updates and improve reliability."],["Security","We use account authentication and access controls to protect stored data. No online service can promise absolute security, so please use a strong, unique password."],["Your choices","You can update profile information through TRACKEN and contact us if you have questions about your data or privacy."]]},
    terms:{icon:Scale,kicker:"TERMS & CONDITIONS",title:"Use TRACKEN responsibly.",intro:"These terms describe the basic rules for using TRACKEN and its study-management features.",sections:[["Acceptable use","Use TRACKEN for lawful personal productivity and study planning. Do not attempt to disrupt the service, access another person's account or misuse administrative functionality."],["Your content","You remain responsible for information, messages and content you enter into TRACKEN. Keep your credentials private."],["Service changes","Features may evolve as TRACKEN develops. We may update, improve or retire features when necessary to maintain the service."],["No guarantee of outcomes","TRACKEN is a productivity tool. It can help you organize and measure effort, but academic or career outcomes depend on many factors outside the service."]]},
    cookies:{icon:Cookie,kicker:"COOKIE POLICY",title:"A transparent approach to cookies.",intro:"TRACKEN may use browser storage and similar technologies to remember settings and keep the experience working smoothly.",sections:[["Essential storage","We may use local browser storage for preferences such as theme selection and interface state. These are used to make the product behave as expected."],["Authentication","Authentication and session handling are provided through our authentication infrastructure so you can remain securely signed in."],["Analytics and advertising","If analytics or advertising technologies are introduced, this policy will be updated with relevant information about their purpose and controls."],["Your control","You can manage cookies and browser storage through your browser settings. Disabling some storage may affect functionality."]]},
    disclaimer:{icon:Info,kicker:"DISCLAIMER",title:"TRACKEN helps you track the work.",intro:"TRACKEN provides productivity and study-tracking tools. It does not provide professional academic, medical, legal or financial advice.",sections:[["Educational use","Study statistics, scores and insights are organizational tools and should not be treated as guarantees of exam performance or admissions outcomes."],["Third-party services","TRACKEN may rely on external infrastructure and services. Their availability can affect parts of the experience."],["Advertising disclosure","Where advertising is displayed, it may be provided by third-party advertising services. Sponsored content does not determine TRACKEN's independent product guidance."]]},
    advertising:{icon:Megaphone,kicker:"ADVERTISING & ADSENSE",title:"A clear approach to advertising.",intro:"TRACKEN may use advertising to support the continued development and availability of the service. We aim to keep advertising clearly separated from product functionality and editorial content.",sections:[["Advertising on TRACKEN","If advertising is enabled, advertisements may be supplied by third-party advertising partners such as Google AdSense. The presence of an advertisement does not mean TRACKEN endorses every product or service shown."],["How advertising works","Third-party advertising services may use information such as browser context, device information or consent choices to deliver and measure advertisements, subject to the provider's policies and applicable controls."],["Editorial independence","TRACKEN's study guidance, product information and blog content are created independently of advertising placement. Advertisers do not control our product decisions or editorial direction."],["Your choices","Where required, TRACKEN will provide appropriate consent and privacy controls. You can also manage relevant advertising preferences through your browser, device and applicable advertising-provider controls."]]}
  }[page]||{}; const Icon=content.icon||Info;
  return <div className="public-page-shell legal-page-shell"><PublicHeader
  theme={theme}
  toggleTheme={toggleTheme}
  onLogin={onLogin}
  onRegister={onRegister}
  onBlog={() => onNavigate("blog")}
  onContact={() => onNavigate("contact")}
  onNavigate={onNavigate}
/><main className="legal-main"><div className="legal-hero"><div className="legal-icon"><Icon size={24}/></div><div className="eyebrow"><span></span> {content.kicker}</div><h1>{content.title}</h1><p>{content.intro}</p></div><div className="legal-body">{content.sections.map(([h,t])=><section key={h}><h2>{h}</h2><p>{t}</p></section>)}</div></main><PublicFooter onNavigate={onNavigate}/></div>;
}
function PublicFooter({onNavigate}) { return <footer className="footer premium-footer public-footer"><div className="footer-brand-block"><div className="footer-brand">TRACKEN<span>.</span></div><div className="footer-byline">by MMD</div><p>© 2026 TRACKEN. Built for better study days.</p></div><div className="footer-links footer-policy-links"><button onClick={()=>onNavigate("about")}>About</button><button onClick={()=>onNavigate("privacy")}>Privacy Policy</button><button onClick={()=>onNavigate("terms")}>Terms &amp; Conditions</button><button onClick={()=>onNavigate("cookies")}>Cookie Policy</button><button onClick={()=>onNavigate("disclaimer")}>Disclaimer</button><button onClick={()=>onNavigate("advertising")}>Advertising</button></div><div className="footer-adsense-note"><ShieldCheck size={15}/><span>Privacy-first experience with clear advertising and content disclosures.</span></div></footer>; }

function AuthPage({ mode, setMode, theme, toggleTheme, onBack }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [broadcastEditorRef, setBroadcastEditorRef] = useState(null);
  const [broadcastFile, setBroadcastFile] = useState(null);
  const [broadcastHtml, setBroadcastHtml] = useState("");
  const [uploadingBroadcastFile, setUploadingBroadcastFile] = useState(false);
  const [error, setError] = useState("");

  const register = async (e) => {
    e.preventDefault();
    setError(""); setMessage("");
    if (!fullName.trim()) return setError("Please enter your name.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim() },
        // Always return to the actual GitHub Pages base URL instead of
        // a nested route that GitHub Pages would answer with 404.
        emailRedirectTo: getAuthRedirectUrl()
      }
    });
    setBusy(false);
    if (error) return setError(friendlyAuthError(error.message));
    if (!data.session) {
      setMessage("Account created. Check your email to confirm your account, then log in.");
      return;
    }
    setMessage("Account created successfully. Welcome to TRACKEN.");
  };

  const login = async (e) => {
    e.preventDefault();
    setError(""); setMessage("");
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setError(friendlyAuthError(error.message));
  };

  const signInWithGoogle = async () => {
    setError(""); setMessage("");
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getAuthRedirectUrl()
      }
    });
    if (error) {
      setBusy(false);
      return setError(friendlyAuthError(error.message));
    }
    // Supabase redirects the browser to Google, so keep the button locked
    // while the redirect is being initiated.
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    setError(""); setMessage("");
    if (!email.trim()) return setError("Enter your account email first.");
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: getAuthRedirectUrl()
    });
    setBusy(false);
    if (error) return setError(friendlyAuthError(error.message));
    setMessage("Password reset instructions have been sent to your email.");
  };

  return (
    <div className="auth-shell">
      <div className="auth-top">
        <button className="back-button" onClick={onBack}><ArrowLeft size={17} /> Back</button>
        <a className="brand" href="#" onClick={onBack}>TRACKEN<span>.</span></a>
        <button className="auth-theme-icon" onClick={toggleTheme} aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"} title={theme === "light" ? "Dark mode" : "Light mode"}>{theme === "light" ? <Moon size={19} strokeWidth={2} /> : <Sun size={19} strokeWidth={2} />}</button>
      </div>

      <div className="auth-layout">
        <div className="auth-side">
          <div className="eyebrow"><span></span> TRACK WHAT MATTERS</div>
          <h1>{mode === "register" ? <>Build a clearer<br /><em>way forward.</em></> : <>Welcome<br /><em>back.</em></>}</h1>
          <p>{mode === "register" ? "Create your personal TRACKEN workspace and make everyday effort easier to see, review and improve." : "Your tasks, study, goals, habits, focus and progress are waiting in one place."}</p>
        </div>

        <div className="auth-card">
          <div className="auth-card-head">
            <span className="mini-label">{mode === "register" ? "START YOUR SYSTEM" : "WELCOME BACK"}</span>
            <h2>{mode === "register" ? "Start your TRACKEN workspace" : "Return to your progress"}</h2>
            <p>{mode === "register" ? "Bring your work, learning and progress into one clear system." : "Pick up where you left off and keep moving."}</p>
          </div>

          {mode !== "reset" && (
            <>
              <button type="button" className="google-auth-button" onClick={signInWithGoogle} disabled={busy} aria-label="Continue with Google">
                <svg className="google-auth-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M21.35 12.27c0-.72-.06-1.42-.18-2.09H12v3.96h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.7 2.91-4.2 2.91-7.26Z"/>
                  <path fill="#34A853" d="M12 21.73c2.63 0 4.84-.87 6.45-2.36l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.7-1.72-5.47-4.03H3.29v2.53A9.74 9.74 0 0 0 12 21.73Z"/>
                  <path fill="#FBBC05" d="M6.53 13.81A5.86 5.86 0 0 1 6.22 12c0-.63.11-1.24.31-1.81V7.66H3.29A9.74 9.74 0 0 0 2.27 12c0 1.57.38 3.06 1.02 4.34l3.24-2.53Z"/>
                  <path fill="#EA4335" d="M12 6.16c1.43 0 2.71.49 3.72 1.46l2.79-2.79C16.84 3.25 14.63 2.27 12 2.27a9.74 9.74 0 0 0-8.71 5.39l3.24 2.53C7.3 7.88 9.46 6.16 12 6.16Z"/>
                </svg>
                <span>{mode === "register" ? "Continue with Google" : "Continue with Google"}</span>
              </button>
              <div className="auth-divider" aria-hidden="true"><span>or</span></div>
            </>
          )}

          <form onSubmit={mode === "register" ? register : mode === "reset" ? resetPassword : login}>
            {mode === "register" && (
              <label>Full name<input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" autoComplete="name" /></label>
            )}
            <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required /></label>
            {mode !== "reset" && <label>Password
              <div className="password-wrap">
                <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" autoComplete={mode === "register" ? "new-password" : "current-password"} required />
                <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
              </div>
            </label>}

            {mode === "reset" && <p className="auth-helper">We'll email you a secure link to choose a new password.</p>}
            {error && <div className="auth-message error" role="alert" aria-live="polite">{error}</div>}
            {message && <div className="auth-message success" role="status" aria-live="polite">{message}</div>}

            <button className="primary-cta auth-submit" disabled={busy}>
              {busy ? "Please wait..." : mode === "register" ? <>Start Tracking <ArrowRight size={18} /></> : mode === "reset" ? <>Send Reset Link <ArrowRight size={18} /></> : <>Login <ArrowRight size={18} /></>}
            </button>
          </form>

          {mode === "login" && <button className="forgot-password-link" onClick={() => { setError(""); setMessage(""); setMode("reset"); }}>Forgot your password?</button>}

          <div className="auth-switch">
            {mode === "register" ? "Already have an account?" : mode === "reset" ? "Remember your password?" : "New to TRACKEN?"}
            <button onClick={() => { setError(""); setMessage(""); setMode(mode === "register" || mode === "reset" ? "login" : "register"); }}>
              {mode === "register" || mode === "reset" ? "Login" : "Start your discipline journey"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}



function PasswordRecoveryPage({ theme, toggleTheme, onComplete }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return setError(friendlyAuthError(error.message));
    setDone(true);
    setTimeout(async () => {
      await supabase.auth.signOut();
      onComplete();
    }, 1200);
  };

  return (
    <div className="auth-shell">
      <div className="auth-top">
        <div></div>
        <a className="brand" href="#" aria-label="TRACKEN">TRACKEN<span>.</span></a>
        <button className="dashboard-theme-button theme-control" onClick={toggleTheme} aria-label="Toggle dark mode" title="Toggle dark mode">{theme === "light" ? <Moon size={18} /> : <Sun size={18} />}<span>{theme === "light" ? "Dark mode" : "Light mode"}</span></button>
      </div>
      <div className="auth-layout">
        <div className="auth-side">
          <div className="eyebrow"><span></span> Account security</div>
          <h1>Choose a new<br /><em>password.</em></h1>
          <p>Keep your TRACKEN account protected with a password you can remember and trust.</p>
        </div>
        <div className="auth-card">
          <div className="auth-card-head">
            <span className="mini-label">SECURE RECOVERY</span>
            <h2>Reset your password</h2>
            <p>Choose a new password for your TRACKEN account.</p>
          </div>
          {done ? <div className="auth-message success" role="status">Password updated successfully. Returning you to login…</div> : (
            <form onSubmit={submit}>
              <label>New password
                <div className="password-wrap">
                  <input type={show ? "text" : "password"} value={password} onChange={(e)=>setPassword(e.target.value)} autoComplete="new-password" placeholder="At least 6 characters" required />
                  <button type="button" onClick={()=>setShow(!show)} aria-label={show ? "Hide password" : "Show password"}>{show ? <EyeOff size={17}/> : <Eye size={17}/>}</button>
                </div>
              </label>
              <label>Confirm password<input type="password" value={confirm} onChange={(e)=>setConfirm(e.target.value)} autoComplete="new-password" placeholder="Re-enter your password" required /></label>
              {error && <div className="auth-message error" role="alert">{error}</div>}
              <button className="primary-cta auth-submit" disabled={busy}>{busy ? "Updating…" : <>Update Password <ArrowRight size={18}/></>}</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

const PROFILE_OPTIONS = {
  preparation: [
    "Using TRACKEN to organize my studies",
    "Preparing for an exam",
    "Building a daily productivity system",
    "Balancing study, work & life",
    "Improving consistency and discipline",
    "Exploring my next goal",
    "Other"
  ],
  direction: [
    "Finish more of what I start",
    "Build a reliable study routine",
    "Stay on top of my tasks",
    "Make my goals measurable",
    "Understand my progress with analytics",
    "Build better habits",
    "Manage my time and focus better",
    "Keep my money and progress organized"
  ],
  motivation: [
    "Seeing visible progress motivates me",
    "I want a system that keeps me accountable",
    "I want less chaos and more clarity",
    "I want to build consistency",
    "I want to understand where my time goes",
    "I want my daily work to connect to bigger goals",
    "I enjoy improving systems around me"
  ],
  studyTime: [
    "Early morning", "Morning", "Afternoon", "Evening", "Late night", "It changes every day"
  ],
  challenge: [
    "Starting tasks", "Staying focused", "Finishing what I start", "Managing too many priorities", "Staying consistent", "Knowing what to work on next", "Tracking my progress"
  ],
  methods: [
    "Tasks & checklists", "Focus sessions", "Daily study records", "Habit tracking", "Goal tracking", "Time tracking", "Weekly reviews", "Analytics & insights"
  ],
  careers: [
    "Technology & Software", "Medicine & Healthcare", "Law", "Finance & Business", "Science & Research", "Government & Public Service", "Design & Creativity", "Education", "Engineering", "Entrepreneurship", "I'm still exploring"
  ],
  values: [
    "Consistency", "Growth", "Financial independence", "Meaningful work", "Work-life balance", "Recognition", "Making an impact", "Learning", "Freedom", "Stability"
  ]
};

const emptyProfile = {
  full_name: "",
  avatar_url: "",
  preparation_for: "",
  preparation_other: "",
  target: "",
  direction_goal: "",
  motivation: "",
  best_study_time: "",
  biggest_challenge: "",
  study_methods: [],
  career_interests: [],
  career_values: [],
  five_year_vision: "",
  badge: null
};

function Dashboard({ session, theme, toggleTheme, onLogout }) {
  const userId = session.user.id;
  const name = session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "there";
  const today = new Date();
  const toDateKey = (date) => {
    const y = date.getFullYear(); const m = String(date.getMonth() + 1).padStart(2, "0"); const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };
  const todayKey = toDateKey(today);
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [tasks, setTasks] = useState([]);
  const [record, setRecord] = useState({ lectures_watched: 0, lecture_minutes: 0, questions_done: 0, pages_read: 0, exercise_done: false });
  const [history, setHistory] = useState([]);
  const [goals, setGoals] = useState([]);
  const [profile, setProfile] = useState(emptyProfile);
  const [newTask, setNewTask] = useState("");
  const [newTaskGoal, setNewTaskGoal] = useState("");
  const [showTaskInput, setShowTaskInput] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingTask, setSavingTask] = useState(false);
  const [savingRecord, setSavingRecord] = useState(false);
  const [error, setError] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  const [showUpdates, setShowUpdates] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showWeeklyReview, setShowWeeklyReview] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTracker, setShowTracker] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem("tasken-sidebar-collapsed") === "true");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [timeGreeting, setTimeGreeting] = useState(() => getTimeGreeting());
  const [isAdmin, setIsAdmin] = useState(false);
  const [unreadUpdates, setUnreadUpdates] = useState(0);
  const [habits, setHabits] = useSyncedUserState(userId, "habits", []);
  const [focusSeconds, setFocusSeconds] = useState(25 * 60);
  const [focusRunning, setFocusRunning] = useState(false);
  const [focusPreset, setFocusPreset] = useState(25);
  const [trackedSeconds, setTrackedSeconds] = useSyncedUserState(userId, "tracked_seconds", 0, 5000);
  const [timeRunning, setTimeRunning] = useSyncedUserState(userId, "time_running", false, 1500);
  const [completedFocusSessions, setCompletedFocusSessions] = useSyncedUserState(userId, "focus_sessions", 0);
  const [activityLog, setActivityLog] = useSyncedUserState(userId, "activity_log", [], 2000);
  const [reviewAutomation, setReviewAutomation] = useSyncedUserState(userId, "review_automation", { daily: true, weekly: true }, 1200);
  const [reviewSnapshots, setReviewSnapshots] = useSyncedUserState(userId, "review_snapshots", [], 1500);

  useEffect(() => { document.body.classList.toggle("tasken-mobile-sidebar-open", mobileSidebarOpen); return () => document.body.classList.remove("tasken-mobile-sidebar-open"); }, [mobileSidebarOpen]);
  useEffect(() => { const openGoals = () => setShowTracker("goals"); window.addEventListener("tracken-open-goals", openGoals); return () => window.removeEventListener("tracken-open-goals", openGoals); }, []);
  useEffect(() => { const t = setInterval(() => setTimeGreeting(getTimeGreeting()), 60000); return () => clearInterval(t); }, []);
  useEffect(() => {
    if (!focusRunning) return undefined;
    const timer = setInterval(() => setFocusSeconds((v) => { if (v <= 1) { setFocusRunning(false); setCompletedFocusSessions((c) => c + 1); logActivity("focus_completed", `${focusPreset} minute focus session`, focusPreset); return focusPreset * 60; } return v - 1; }), 1000);
    return () => clearInterval(timer);
  }, [focusRunning, focusPreset]);
  useEffect(() => {
    if (!timeRunning) return undefined;
    const timer = setInterval(() => setTrackedSeconds((v) => v + 1), 1000);
    return () => clearInterval(timer);
  }, [timeRunning]);

  const fetchAll = async () => {
    setError("");
    const weekStart = new Date(today); weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6);
    const [tasksRes, recordRes, historyRes, goalsRes, profileRes, adminRes, updatesRes, readsRes] = await Promise.all([
      supabase.from("tasks").select("*").eq("user_id", userId).order("created_at", { ascending: true }),
      supabase.from("daily_records").select("*").eq("user_id", userId).eq("record_date", selectedDate).maybeSingle(),
      supabase.from("daily_records").select("*").eq("user_id", userId).order("record_date", { ascending: false }).limit(90),
      supabase.from("goals").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("admin_users").select("user_id").eq("user_id", userId).maybeSingle(),
      supabase.from("updates").select("id").or(`recipient_user_id.is.null,recipient_user_id.eq.${userId}`),
      supabase.from("update_reads").select("update_id").eq("user_id", userId)
    ]);
    if (tasksRes.error) setError(tasksRes.error.message); else setTasks(tasksRes.data || []);
    if (recordRes.error) setError(recordRes.error.message); else setRecord({ lectures_watched: recordRes.data?.lectures_watched || 0, lecture_minutes: recordRes.data?.lecture_minutes || 0, questions_done: recordRes.data?.questions_done || 0, pages_read: recordRes.data?.pages_read || 0, exercise_done: recordRes.data?.exercise_done || false });
    if (!historyRes.error) setHistory(historyRes.data || []);
    if (!goalsRes.error) setGoals(goalsRes.data || []);
    if (!profileRes.error && profileRes.data) setProfile({ ...emptyProfile, ...profileRes.data, study_methods: profileRes.data.study_methods || [], career_interests: profileRes.data.career_interests || [], career_values: profileRes.data.career_values || [] });
    setIsAdmin(Boolean(adminRes.data && !adminRes.error));
    if (!updatesRes.error && !readsRes.error) { const read = new Set((readsRes.data || []).map((x) => x.update_id)); setUnreadUpdates((updatesRes.data || []).filter((x) => !read.has(x.id)).length); }
    setLoading(false);
  };
  useEffect(() => { fetchAll(); }, [userId, selectedDate]);

  const selectedTasks = tasks.filter((t) => t.task_date === selectedDate);
  const todoTasks = selectedTasks.filter((t) => t.status !== "completed");
  const completedTasks = selectedTasks.filter((t) => t.status === "completed");
  const taskProgress = selectedTasks.length ? Math.round((completedTasks.length / selectedTasks.length) * 100) : 0;
  const weeklyTasks = tasks.filter((t) => { const d = new Date(`${t.task_date}T12:00:00`); const n = new Date(today); const diff = Math.floor((n - d) / 86400000); return diff >= 0 && diff < 7; });
  const weeklyTaskProgress = weeklyTasks.length ? Math.round((weeklyTasks.filter((t) => t.status === "completed").length / weeklyTasks.length) * 100) : 0;
  const totalStudyMinutes = history.reduce((s, r) => s + Number(r.lecture_minutes || 0), 0);
  const weeklyStudyMinutes = history.filter((r) => { const d = new Date(`${r.record_date}T12:00:00`); const diff = Math.floor((today - d) / 86400000); return diff >= 0 && diff < 7; }).reduce((s, r) => s + Number(r.lecture_minutes || 0), 0);
  const activeGoals = goals.filter((g) => g.status === "active");
  const topGoal = activeGoals[0];
  const goalProgress = topGoal?.target_value > 0 ? Math.min(100, Math.round((Number(topGoal.current_value || 0) / Number(topGoal.target_value)) * 100)) : 0;
  const studyScore = Math.min(100, Math.round((Math.min(record.lecture_minutes / 180, 1) * 45) + (Math.min(record.questions_done / 100, 1) * 25) + (record.exercise_done ? 15 : 0) + (Math.min(record.pages_read / 40, 1) * 15)));
  const todayHabitKey = todayKey;
  const dashboardHabitScheduledOn = (h, dateKey) => {
    const day = new Date(`${dateKey}T12:00:00`).getDay();
    if (h?.scheduleType === "weekdays") return day >= 1 && day <= 5;
    if (h?.scheduleType === "custom") return Array.isArray(h.scheduleDays) && h.scheduleDays.includes(day);
    return true;
  };
  const habitDoneToday = (h) => dashboardHabitScheduledOn(h, todayHabitKey) && (Array.isArray(h.completedDates) ? h.completedDates.includes(todayHabitKey) : Boolean(h.done));
  const activeHabitsToday = habits.filter(h => {
    if (h.startDate && h.durationDays) {
      const start = new Date(`${h.startDate}T12:00:00`); const d = new Date(`${todayHabitKey}T12:00:00`); const end = new Date(start); end.setDate(end.getDate() + Number(h.durationDays) - 1);
      if (!(d >= start && d <= end)) return false;
    }
    return dashboardHabitScheduledOn(h, todayHabitKey);
  });
  const consistencyScore = activeHabitsToday.length ? Math.round((activeHabitsToday.filter(h => habitDoneToday(h)).length / activeHabitsToday.length) * 100) : 0;
  const focusScore = Math.min(100, Math.round((trackedSeconds / 3600) * 100));
  const goalScore = activeGoals.length ? goalProgress : 0;
  const score = Math.round((taskProgress * 0.30) + (studyScore * 0.25) + (goalScore * 0.20) + (consistencyScore * 0.15) + (focusScore * 0.10));
  const scoreLabel = score >= 85 ? "Exceptional momentum" : score >= 70 ? "Strong momentum" : score >= 50 ? "Building momentum" : "Start small, stay consistent";
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(today); d.setDate(today.getDate() - (6 - i)); return d; });
  const recordMap = Object.fromEntries(history.map((r) => [r.record_date, r]));
  const formatTime = (seconds) => { const total=Math.max(0,Number(seconds)||0); return `${Math.floor(total / 3600)}h ${String(Math.floor((total % 3600) / 60)).padStart(2, "0")}m ${String(total % 60).padStart(2, "0")}s`; };
  const formatFocus = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const logActivity = (type, label, value=1) => setActivityLog((c) => [...c, { id: crypto.randomUUID(), type, label, value, at: new Date().toISOString() }].slice(-250));
  const reviewDateKey = (date) => { const y=date.getFullYear(); const m=String(date.getMonth()+1).padStart(2,"0"); const d=String(date.getDate()).padStart(2,"0"); return `${y}-${m}-${d}`; };
  const buildReviewSnapshot = (type, start, end) => {
    const startKey=reviewDateKey(start), endKey=reviewDateKey(end);
    const periodTasks=tasks.filter(t=>t.task_date>=startKey && t.task_date<=endKey);
    const completed=periodTasks.filter(t=>t.status==="completed").length;
    const periodRecords=history.filter(r=>r.record_date>=startKey && r.record_date<=endKey);
    const studyMinutes=periodRecords.reduce((sum,r)=>sum+Number(r.lecture_minutes||0),0);
    const questions=periodRecords.reduce((sum,r)=>sum+Number(r.questions_done||0),0);
    const events=activityLog.filter(e=>{const k=String(e.at||"").slice(0,10);return k>=startKey&&k<=endKey;});
    const focusMinutes=events.filter(e=>e.type==="focus_completed").reduce((sum,e)=>sum+Number(e.value||0),0);
    let habitScheduled=0, habitCompleted=0;
    habits.forEach(h=>{ const cursor=new Date(`${startKey}T12:00:00`); const stop=new Date(`${endKey}T12:00:00`); while(cursor<=stop){ const key=reviewDateKey(cursor); const day=cursor.getDay(); const scheduled=h.scheduleType==="weekdays" ? day>=1&&day<=5 : h.scheduleType==="custom" ? Array.isArray(h.scheduleDays)&&h.scheduleDays.includes(day) : true; if(scheduled){habitScheduled++; if(Array.isArray(h.completedDates)?h.completedDates.includes(key):Boolean(h.done)&&key===endKey) habitCompleted++;} cursor.setDate(cursor.getDate()+1); } });
    const taskPct=periodTasks.length?Math.round(completed/periodTasks.length*100):0;
    const habitPct=habitScheduled?Math.round(habitCompleted/habitScheduled*100):0;
    const goal=goals.find(g=>g.status==="active");
    const goalPct=goal?.target_value?Math.min(100,Math.round(Number(goal.current_value||0)/Number(goal.target_value)*100)):0;
    const strongest=taskPct>=80?"Execution":studyMinutes>=(type==="weekly"?300:60)?"Study":habitPct>=70?"Consistency":"Momentum";
    const next=taskPct<70?"Finish one high-impact task before adding new work.":studyMinutes<(type==="weekly"?300:60)?"Protect a focused study block in the next cycle.":habitPct<70?"Make one scheduled habit easier to complete consistently.":goalPct<50&&goal?`Move ${goal.title} forward with one concrete action.`:"Keep the current rhythm and raise the quality bar slightly.";
    return {id:crypto.randomUUID(),key:`${type}:${startKey}:${endKey}`,type,periodStart:startKey,periodEnd:endKey,createdAt:new Date().toISOString(),metrics:{tasksTotal:periodTasks.length,tasksDone:completed,taskPct,studyMinutes,questions,focusMinutes,habitScheduled,habitCompleted,habitPct,goalPct},strongest,next};
  };
  const materializeAutomaticReviews = () => {
    const settings={daily:true,weekly:true,...(reviewAutomation||{})};
    const now=new Date(); const additions=[]; const existing=new Set((reviewSnapshots||[]).map(x=>x.key));
    if(settings.daily){ const end=new Date(now); end.setDate(now.getDate()-1); end.setHours(0,0,0,0); const start=new Date(end); if(!existing.has(`daily:${reviewDateKey(start)}:${reviewDateKey(end)}`)) additions.push(buildReviewSnapshot("daily",start,end)); }
    if(settings.weekly){ const monday=new Date(now); monday.setHours(0,0,0,0); monday.setDate(now.getDate()-((now.getDay()+6)%7)); const end=new Date(monday); end.setDate(monday.getDate()-1); const start=new Date(end); start.setDate(end.getDate()-6); const key=`weekly:${reviewDateKey(start)}:${reviewDateKey(end)}`; if(!existing.has(key)) additions.push(buildReviewSnapshot("weekly",start,end)); }
    if(additions.length) setReviewSnapshots(current=>[...additions,...(current||[])].slice(0,24));
  };
  useEffect(()=>{ if(!loading) materializeAutomaticReviews(); },[loading,tasks.length,history.length,habits.length,goals.length,activityLog.length,reviewAutomation.daily,reviewAutomation.weekly]);
  const addTask = () => {
    const title = newTask.trim();
    if (!title) return;
    const tempId = crypto.randomUUID();
    const optimisticTask = { id: tempId, user_id: userId, title, task_date: selectedDate, status: "todo", priority: "medium", goal_id: newTaskGoal || null, created_at: new Date().toISOString() };
    setTasks((current) => [...current, optimisticTask]);
    logActivity("task_created", title);
    setNewTask("");
    setNewTaskGoal("");
    setShowTaskInput(false);
    setSavingTask(false);
    // Persist in the background so the UI feels instant. If Supabase rejects it, remove only the optimistic row.
    supabase.from("tasks").insert({ user_id: userId, title, task_date: selectedDate, status: "todo", priority: "medium", goal_id: newTaskGoal || null }).select().single()
      .then(({ data, error: e }) => {
        if (e) {
          setTasks((current) => current.filter((item) => item.id !== tempId));
          setError(e.message || "Task could not be saved.");
          return;
        }
        if (data) setTasks((current) => current.map((item) => item.id === tempId ? data : item));
      });
  };
  const toggleTask = async (task) => {
    const nextStatus = task.status === "completed" ? "todo" : "completed";
    const previous = task.status;
    const completedAt = nextStatus === "completed" ? new Date().toISOString() : null;
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status: nextStatus, completed_at: completedAt } : item));
    if (nextStatus === "completed") logActivity("task_completed", task.title);
    const { error: e } = await supabase.from("tasks").update({ status: nextStatus, completed_at: completedAt }).eq("id", task.id).eq("user_id", userId);
    if (e) {
      setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status: previous, completed_at: task.completed_at || null } : item));
      setError(e.message || "Task could not be updated.");
    }
  };
  const deleteTask = async (task) => { const { error: e } = await supabase.from("tasks").delete().eq("id", task.id).eq("user_id", userId); if (e) setError(e.message); else setTasks((c) => c.filter((x) => x.id !== task.id)); };
  const updateRecord = (field, value) => { const numeric = ["lectures_watched", "lecture_minutes", "questions_done", "pages_read"]; setRecord((c) => ({ ...c, [field]: numeric.includes(field) ? Math.max(0, Number(value) || 0) : value })); };
  const dailyScore = Math.min(100, Math.round((Math.min(record.lectures_watched / 4, 1) * 20) + (Math.min(record.lecture_minutes / 180, 1) * 20) + (Math.min(record.questions_done / 150, 1) * 25) + (Math.min(record.pages_read / 50, 1) * 15) + (record.exercise_done ? 20 : 0)));
  const saveRecord = async () => { if (savingRecord) return; setSavingRecord(true); const { data, error: e } = await supabase.from("daily_records").upsert({ user_id: userId, record_date: selectedDate, ...record, daily_score: dailyScore, updated_at: new Date().toISOString() }, { onConflict: "user_id,record_date" }).select().single(); if (e) setError(e.message); else { setHistory((c) => [data, ...c.filter((x) => x.record_date !== selectedDate)].slice(0, 90)); logActivity("study_logged", `Study · ${record.lecture_minutes || 0} min`, Number(record.lecture_minutes || 0)); } setSavingRecord(false); };
  const toggleHabit = (id) => setHabits((c) => c.map((h) => {
    if (h.id !== id || !dashboardHabitScheduledOn(h, todayHabitKey)) return h;
    const dates = Array.isArray(h.completedDates) ? [...h.completedDates] : (h.done ? [todayHabitKey] : []);
    const done = dates.includes(todayHabitKey); const nextDates = done ? dates.filter(d => d !== todayHabitKey) : [...new Set([...dates, todayHabitKey])];
    if (!done) logActivity("habit_completed", h.title);
    return { ...h, completedDates: nextDates, done: nextDates.includes(todayHabitKey) };
  }));
  const addHabit = () => { const title = window.prompt("Habit name"); if (title?.trim()) setHabits((c) => [...c, { id: crypto.randomUUID(), title: title.trim(), startDate: todayHabitKey, durationDays: 30, scheduleType:"daily", scheduleDays:[0,1,2,3,4,5,6], completedDates: [] }]); };
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const toggleSidebar = () => {
    if (window.matchMedia("(max-width: 650px)").matches) {
      setMobileSidebarOpen(false);
      return;
    }
    setSidebarCollapsed((c) => { const n = !c; localStorage.setItem("tasken-sidebar-collapsed", String(n)); return n; });
  };
  const handleLogout = async () => { setError(""); const { error: logoutError } = await supabase.auth.signOut(); if (logoutError) return setError(logoutError.message); onLogout?.(); };
  if (showProfile) return <ProfilePage session={session} profile={profile} setProfile={setProfile} theme={theme} toggleTheme={toggleTheme} onBack={() => setShowProfile(false)} />;
  if (showAnalytics) return <AnalyticsPage session={session} theme={theme} toggleTheme={toggleTheme} history={history} tasks={tasks} goals={goals} onBack={() => setShowAnalytics(false)} />;
  if (showWeeklyReview) return <WeeklyReviewPage session={session} theme={theme} toggleTheme={toggleTheme} tasks={tasks} history={history} goals={goals} habits={habits} activityLog={activityLog} trackedSeconds={trackedSeconds} completedFocusSessions={completedFocusSessions} score={score} reviewAutomation={reviewAutomation} setReviewAutomation={setReviewAutomation} reviewSnapshots={reviewSnapshots} onGenerateReviews={materializeAutomaticReviews} onBack={() => setShowWeeklyReview(false)} />;
  if (showCalendar) return <CalendarHistoryPage session={session} theme={theme} toggleTheme={toggleTheme} onBack={() => setShowCalendar(false)} />;
  if (showTracker) return <TaskenErrorBoundary><TrackerHubPage initialTab={showTracker} session={session} theme={theme} toggleTheme={toggleTheme} tasks={tasks} setTasks={setTasks} history={history} goals={goals} setGoals={setGoals} habits={habits} setHabits={setHabits} trackedSeconds={trackedSeconds} setTrackedSeconds={setTrackedSeconds} focusSeconds={focusSeconds} setFocusSeconds={setFocusSeconds} focusRunning={focusRunning} setFocusRunning={setFocusRunning} focusPreset={focusPreset} setFocusPreset={setFocusPreset} formatTime={formatTime} formatFocus={formatFocus} timeRunning={timeRunning} setTimeRunning={setTimeRunning} toggleTask={toggleTask} deleteTask={deleteTask} onBack={() => setShowTracker(null)} onTasks={scrollTo} /></TaskenErrorBoundary>;
  if (showUpdates) return <UpdatesPage session={session} theme={theme} toggleTheme={toggleTheme} onBack={() => setShowUpdates(false)} onUnreadChange={setUnreadUpdates} />;
  if (showAdmin) return <AdminPage session={session} theme={theme} toggleTheme={toggleTheme} onBack={() => setShowAdmin(false)} />;

  return (
    <div className={`command-center tracken-command-center tasken-app-shell ${sidebarCollapsed ? "sidebar-is-collapsed" : ""} ${mobileSidebarOpen ? "mobile-sidebar-is-open" : ""}`}>
      <aside className="tasken-sidebar tracken-sidebar">
        <div className="sidebar-brand"><div className="sidebar-brand-copy"><div className="brand">TRACKEN<span>.</span></div><span>PERSONAL PROGRESS OS</span></div><button className="sidebar-collapse" onClick={toggleSidebar} aria-label="Toggle sidebar">{sidebarCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}</button></div>
        <nav className="sidebar-nav">
          <button className="sidebar-item active"><LayoutDashboard size={18} /><span className="sidebar-item-label">Overview</span></button>
          <div className="sidebar-section-label">TRACK</div>
          <button className="sidebar-item" onClick={() => setShowTracker("tasks")}><ListChecks size={18} /><span className="sidebar-item-label">Tasks</span><span className="sidebar-count">{todoTasks.length}</span></button>
          <button className="sidebar-item" onClick={() => setShowTracker("goals")}><Target size={18} /><span className="sidebar-item-label">Goals</span></button>
          <button className="sidebar-item" onClick={() => setShowTracker("habits")}><Flame size={18} /><span className="sidebar-item-label">Habits</span></button>
          <button className="sidebar-item" onClick={() => setShowTracker("focus")}><Timer size={18} /><span className="sidebar-item-label">Focus</span></button>
          <button className="sidebar-item" onClick={() => setShowTracker("productivity")}><BriefcaseBusiness size={18} /><span className="sidebar-item-label">Productivity Engine</span></button>
          <div className="sidebar-section-label">MONEY</div>
          <button className="sidebar-item" onClick={() => setShowTracker("money")}><WalletCards size={18} /><span className="sidebar-item-label">Cashflow</span></button>
          <button className="sidebar-item" onClick={() => setShowTracker("budget")}><PieChart size={18} /><span className="sidebar-item-label">Budget</span></button>
          <button className="sidebar-item" onClick={() => setShowTracker("investments")}><BriefcaseBusiness size={18} /><span className="sidebar-item-label">Investments</span></button>
          <div className="sidebar-section-label">INSIGHTS</div>
          <button className="sidebar-item" onClick={() => setShowAnalytics(true)}><TrendingUp size={18} /><span className="sidebar-item-label">Analytics</span></button>
          <button className="sidebar-item" onClick={() => setShowWeeklyReview(true)}><ClipboardList size={18} /><span className="sidebar-item-label">Weekly Review</span></button>
          <button className="sidebar-item" onClick={() => scrollTo("track-achievements")}><Trophy size={18} /><span className="sidebar-item-label">Achievements</span></button>
          <div className="sidebar-section-label">SYSTEM</div>
          <button className={`sidebar-item ${unreadUpdates ? "has-unread" : ""}`} onClick={() => setShowUpdates(true)}><Bell size={18} /><span className="sidebar-item-label">Updates</span>{unreadUpdates ? <span className="sidebar-count unread-count">{unreadUpdates}</span> : null}</button>
          {isAdmin && <button className="sidebar-item" onClick={() => setShowAdmin(true)}><ShieldCheck size={18} /><span className="sidebar-item-label">Admin</span></button>}
        </nav>
        <div className="sidebar-spacer" /><div className="tracken-sidebar-score"><span>TRACKEN SCORE</span><strong>{score}</strong><small>{scoreLabel}</small></div><div className="tasken-sidebar-version">4.2.0 TRACKEN</div>
      </aside>
      <button className="mobile-sidebar-overlay" aria-label="Close navigation" onClick={() => setMobileSidebarOpen(false)}></button>
      <main className="dashboard-main tasken-main tracken-main">
        <header className="dashboard-topbar tracken-topbar"><div className="tracken-mobile-title"><button className="mobile-sidebar-toggle" onClick={() => setMobileSidebarOpen(true)}><PanelLeftOpen size={19} /></button><span>TRACKEN</span></div><div className="topbar-date">{today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</div><div className="topbar-actions"><button className="dashboard-theme-button theme-control" onClick={toggleTheme} aria-label="Toggle dark mode" title="Toggle dark mode">{theme === "light" ? <Moon size={18} /> : <Sun size={18} />}<span>{theme === "light" ? "Dark mode" : "Light mode"}</span></button><button className="logout-button topbar-logout" onClick={handleLogout} aria-label="Log out" title="Log out"><LogOut size={17} /><span>Logout</span></button><button className="profile-pill" onClick={() => setShowProfile(true)}>{profile.avatar_url ? <img src={profile.avatar_url} alt="Profile" onError={(e) => { e.currentTarget.style.display="none"; }} /> : <span>{name.charAt(0).toUpperCase()}</span>}<b>{name.split(" ")[0]}</b>{profile.badge && <em className={`profile-pill-badge ${String(profile.badge).toLowerCase()}`}>{profile.badge}</em>}<ChevronDown size={15} /></button></div></header>
        <div className="tracken-content">
          {error && <div className="dashboard-error"><Info size={16} />{error}<button onClick={() => setError("")}>×</button></div>}
          <section className="tracken-hero"><div><span className="eyebrow">{timeGreeting}, {name.split(" ")[0]} <Sparkles size={14} /></span><h1>Your progress, <em>in one place.</em></h1><p>Track what matters. Understand your patterns. Build momentum every day.</p></div><div className="hero-score"><div className="score-orbit" style={{"--score-progress": `${score}%`}}><strong>{score}</strong><span>/100</span></div><div className="hero-score-copy"><span>TRACKEN SCORE · LIVE</span><b>{scoreLabel}</b><small>Calculated from today's execution, study, goals, habits and focus.</small><div className="hero-score-meta"><span>Execution {taskProgress}%</span><span>Study {studyScore}%</span><span>Consistency {consistencyScore}%</span></div></div></div></section>
          <section className="tracken-kpis"><div className="kpi-card"><span>Tasks today</span><strong>{completedTasks.length}<small> / {selectedTasks.length || 0}</small></strong><div className="kpi-progress"><i style={{width:`${taskProgress}%`}} /></div><small>{taskProgress}% complete</small></div><div className="kpi-card"><span>Study today</span><strong>{Math.floor(record.lecture_minutes/60)}<small>h {record.lecture_minutes%60}m</small></strong><small>{Math.floor(weeklyStudyMinutes/60)}h {weeklyStudyMinutes%60}m this week</small></div><div className="kpi-card"><span>Focus today</span><strong>{formatTime(trackedSeconds)}</strong><small>{timeRunning ? "Timer running now" : "Ready when you are"}</small></div><div className="kpi-card accent-kpi"><span>Goal progress</span><strong>{goalProgress}<small>%</small></strong><small>{topGoal ? topGoal.title : "Create your first goal"}</small></div></section>
          <section className="tracken-command-strip">
            <div className="command-glance-row">
              <article className="command-score-card">
                <div className="command-score-copy"><span className="card-kicker">TODAY AT A GLANCE</span><h2>Your operating picture.</h2><p>One clear view of the signals that move your TRACKEN Score today.</p></div>
                <div className="command-score-value"><strong>{score}</strong><span>/100</span><small>{scoreLabel}</small></div>
              </article>
            </div>
            <div className="command-signal-row">
              <article className="command-signal-card"><span className="card-kicker">EXECUTION</span><strong>{taskProgress}%</strong><span>tasks complete today</span><div><i style={{width:`${taskProgress}%`}}/></div></article>
              <article className="command-signal-card"><span className="card-kicker">CONSISTENCY</span><strong>{habits.length ? Math.round((activeHabitsToday.filter(h=>habitDoneToday(h)).length/activeHabitsToday.length)*100) : 0}%</strong><span>habits completed today</span><div><i style={{width:`${habits.length ? Math.round((activeHabitsToday.filter(h=>habitDoneToday(h)).length/activeHabitsToday.length)*100) : 0}%`}}/></div></article>
              <article className="command-signal-card"><span className="card-kicker">FOCUS</span><strong>{completedFocusSessions}</strong><span>focus sessions completed</span><div><i style={{width:`${Math.min(100, completedFocusSessions*20)}%`}}/></div></article>
            </div>
          </section>
          <section className="tracken-intelligence-hero">
            <div className="intelligence-intro">
              <div><span className="card-kicker">TRACKEN INTELLIGENCE</span><h2>A clearer answer to <em>what matters next.</em></h2><p>Use the activity you already record to surface useful priorities, patterns and decisions — without turning the dashboard into another complicated tool.</p></div>
              <div className="intelligence-pulse"><Sparkles size={17}/><span>LIVE FROM YOUR ACTIVITY</span></div>
            </div>
            <div className="intelligence-cards">
              <article className="intelligence-card featured-intelligence"><div className="intelligence-card-top"><span>NEXT BEST MOVE</span><Zap size={16}/></div><strong>{todoTasks[0]?.title || (record.lecture_minutes < 60 ? "Protect a focused study block" : "Keep your current rhythm")}</strong><p>{todoTasks[0] ? `Your highest-priority open task is still in the runway. Finish it before adding more work.` : record.lecture_minutes < 60 ? "Your study record is light today. A focused block would strengthen today's evidence." : "Your current signals are balanced. Keep the system simple and repeat what is working."}</p><button onClick={()=>todoTasks[0]?scrollTo("track-tasks"):scrollTo("track-study")}>Take me there <ArrowRight size={14}/></button></article>
              <article className="intelligence-card"><div className="intelligence-card-top"><span>PATTERN SIGNAL</span><TrendingUp size={16}/></div><strong>{weeklyTaskProgress >= 70 ? "Execution is holding" : "Execution has room"}</strong><p>{weeklyTaskProgress >= 70 ? `You completed ${weeklyTaskProgress}% of this week's recorded tasks. Keep protecting the queue.` : `Your weekly task completion is ${weeklyTaskProgress}%. Reduce the queue and close one meaningful loop.`}</p><div className="intelligence-meter"><i style={{width:`${weeklyTaskProgress}%`}}/></div></article>
              <article className="intelligence-card"><div className="intelligence-card-top"><span>DAILY BRIEF</span><Sparkles size={16}/></div><strong>{scoreLabel}</strong><p>{score >= 70 ? "Your system is showing useful momentum across multiple signals." : "Start with one small action. TRACKEN will make the change visible as you build the record."}</p><div className="intelligence-tags"><span>Execution {taskProgress}%</span><span>Study {studyScore}%</span><span>Goal {goalProgress}%</span></div></article>
            </div>
          </section>
          <section className="tracken-grid-main">
            <article className="tracken-panel task-panel" id="track-tasks"><div className="panel-heading"><div><span className="card-kicker">TODAY · {selectedDate}</span><h2>Priority queue</h2></div><button className="primary-small" onClick={() => setShowTaskInput((v)=>!v)}><Plus size={16}/> Add task</button></div>{showTaskInput && <div className="tracken-add-task"><input autoFocus value={newTask} onChange={(e)=>setNewTask(e.target.value)} onKeyDown={(e)=>e.key === "Enter" && addTask()} placeholder="What matters next?"/><select value={newTaskGoal} onChange={(e)=>setNewTaskGoal(e.target.value)}><option value="">No goal</option>{activeGoals.map(g=><option key={g.id} value={g.id}>{g.title}</option>)}</select><button onClick={addTask}>{savingTask ? "…" : "Add"}</button></div>}<div className="tracken-task-list">{todoTasks.slice(0,6).map((task)=><div className="tracken-task" key={task.id}><button className={`tracken-check priority-${task.priority}`} onClick={()=>toggleTask(task)}></button><div><b>{task.title}</b><small>{task.goal_id ? `Goal · ${goals.find(g => String(g.id) === String(task.goal_id))?.title || "Linked goal"}` : "Today"}</small></div><button className="task-delete" onClick={()=>deleteTask(task)} aria-label={`Delete ${task.title}`} title="Delete task"><Trash2 size={15}/></button></div>)}{!loading && todoTasks.length===0 && <div className="tracken-empty"><CheckCircle2 size={22}/><b>Clear runway.</b><span>Everything planned for today is done.</span></div>}</div><div className="panel-footer"><span>{todoTasks.length} remaining</span><button onClick={()=>scrollTo("track-tasks")}>View all <ChevronRight size={14}/></button></div></article>
            <article className="tracken-panel score-panel"><div className="panel-heading"><div><span className="card-kicker">PERSONAL ANALYTICS</span><h2>Momentum</h2></div><TrendingUp size={19}/></div><div className="momentum-chart">{days.map((d,i)=>{const r=recordMap[toDateKey(d)]; const h=Math.max(8, Math.min(100, Number(r?.daily_score||0))); return <div className="momentum-bar" key={i}><i style={{height:`${h}%`}}/><span>{d.toLocaleDateString("en-US",{weekday:"short"}).slice(0,1)}</span></div>})}</div><div className="momentum-summary"><strong>{weeklyTaskProgress}%</strong><span>weekly task completion</span><b>{weeklyStudyMinutes ? `${Math.floor(weeklyStudyMinutes/60)}h ${weeklyStudyMinutes%60}m` : "0h"}</b><span>study this week</span></div></article>
          </section>
          <section className="tracken-intelligence-grid">
            <article className="tracken-panel next-action-panel">
              <div className="panel-heading"><div><span className="card-kicker">NEXT BEST ACTION</span><h2>What should move next?</h2></div><Sparkles size={19}/></div>
              {(() => {
                const nextTask = todoTasks[0];
                const studyNeed = record.lecture_minutes < 60 || record.questions_done < 25;
                const habitNeed = activeHabitsToday.length > 0 && activeHabitsToday.some(h=>!habitDoneToday(h));
                let title = nextTask?.title || (studyNeed ? "Log a focused study block" : habitNeed ? `Complete ${activeHabitsToday.find(h=>!habitDoneToday(h))?.title}` : "Protect your momentum");
                let meta = nextTask ? `${nextTask.priority || "medium"} priority · task` : studyNeed ? "Study engine · build today's evidence" : habitNeed ? "Consistency engine · keep the chain alive" : "You're on track · choose one meaningful action";
                return <div className="next-action-body"><div className="next-action-icon"><Zap size={22}/></div><div><strong>{title}</strong><p>{meta}</p></div><button className="primary-small" onClick={()=> nextTask ? scrollTo("track-tasks") : studyNeed ? scrollTo("track-study") : scrollTo("track-habits")}>Open <ArrowRight size={15}/></button></div>;
              })()}
            </article>
            <article className="tracken-panel score-breakdown-panel">
              <div className="panel-heading"><div><span className="card-kicker">SCORE BREAKDOWN</span><h2>Why your score is {score}.</h2></div><BarChart3 size={19}/></div>
              <div className="score-breakdown-list">
                <div><span><b>Execution</b><small>Tasks completed</small></span><strong>{taskProgress}</strong><i><em style={{width:`${taskProgress}%`}}/></i></div>
                <div><span><b>Study</b><small>Daily study output</small></span><strong>{studyScore}</strong><i><em style={{width:`${studyScore}%`}}/></i></div>
                <div><span><b>Goals</b><small>Top goal progress</small></span><strong>{goalProgress}</strong><i><em style={{width:`${goalProgress}%`}}/></i></div>
                <div><span><b>Consistency</b><small>Habits completed</small></span><strong>{habits.length ? Math.round((activeHabitsToday.filter(h=>habitDoneToday(h)).length/activeHabitsToday.length)*100) : 0}</strong><i><em style={{width:`${habits.length ? Math.round((activeHabitsToday.filter(h=>habitDoneToday(h)).length/activeHabitsToday.length)*100) : 0}%`}}/></i></div>
              </div>
            </article>
          </section>
          <section className="tracken-grid-three">
            <article className="tracken-panel" id="track-habits"><div className="panel-heading"><div><span className="card-kicker">CONSISTENCY</span><h2>Habits</h2></div><button className="ghost-small" onClick={()=>setShowTracker("habits")}><Plus size={15}/> New</button></div><div className="habit-list">{habits.length ? habits.map(h=><button className={`habit-row ${habitDoneToday(h)?"done":""}`} key={h.id} onClick={()=>toggleHabit(h.id)}><span className="habit-dot">{habitDoneToday(h)?<Check size={13}/>:null}</span><b>{h.title}</b><small>{habitDoneToday(h)?"Completed today":dashboardHabitScheduledOn(h,todayHabitKey)?"Open today":"Rest day"}</small></button>) : <div className="tracken-empty"><Flame size={20}/><b>Build your first streak.</b><span>Add a habit you want to make automatic.</span></div>}</div></article>
            <article className="tracken-panel" id="track-study"><div className="panel-heading"><div><span className="card-kicker">STUDY ENGINE</span><h2>Daily study</h2></div><span className="mini-score">{dailyScore}</span></div><div className="study-inputs"><label>Lectures<input type="number" min="0" value={record.lectures_watched} onChange={(e)=>updateRecord("lectures_watched",e.target.value)}/></label><label>Minutes<input type="number" min="0" value={record.lecture_minutes} onChange={(e)=>updateRecord("lecture_minutes",e.target.value)}/></label><label>Questions<input type="number" min="0" value={record.questions_done} onChange={(e)=>updateRecord("questions_done",e.target.value)}/></label><label>Pages<input type="number" min="0" value={record.pages_read} onChange={(e)=>updateRecord("pages_read",e.target.value)}/></label></div><label className={`exercise-toggle ${record.exercise_done?"done":""}`}><input type="checkbox" checked={record.exercise_done} onChange={(e)=>updateRecord("exercise_done",e.target.checked)}/><span>{record.exercise_done?<Check size={15}/>:null}</span>Exercise completed</label><button className="save-wide" onClick={saveRecord}>{savingRecord?"Saving…":"Save today's study"}<Save size={15}/></button></article>
            <article className="tracken-panel" id="track-focus"><div className="panel-heading"><div><span className="card-kicker">FOCUS & TIME</span><h2>Deep work</h2></div><Timer size={19}/></div><div className="focus-clock">{formatFocus(focusSeconds)}</div><div className="focus-presets">{[25,50,90].map(p=><button className={focusPreset===p?"selected":""} key={p} onClick={()=>{setFocusPreset(p);setFocusSeconds(p*60);setFocusRunning(false)}}>{p}m</button>)}</div><div className="focus-actions"><button className="primary-small" onClick={()=>setFocusRunning(v=>!v)}>{focusRunning?"Pause":"Start focus"}</button><button className="ghost-small" onClick={()=>{setFocusRunning(false);setFocusSeconds(focusPreset*60)}}>Reset</button></div><div className="time-tracker"><div><span>TIME TRACKER</span><b>{formatTime(trackedSeconds)}</b></div><button className={timeRunning?"running":""} onClick={()=>setTimeRunning(v=>!v)}>{timeRunning?"Stop":"Start"}</button></div></article>
          </section>
          <section className="tracken-grid-main bottom-grid"><article className="tracken-panel goal-panel"><div className="panel-heading"><div><span className="card-kicker">DESTINATION</span><h2>Goal momentum</h2></div><button className="ghost-small" onClick={()=>setShowTracker("goals")}>Manage <ChevronRight size={14}/></button></div>{topGoal?<><div className="goal-title-row"><div><b>{topGoal.title}</b><small>{topGoal.category||"Personal goal"}</small></div><strong>{goalProgress}%</strong></div><div className="big-progress"><i style={{width:`${goalProgress}%`}}/></div><div className="goal-meta"><span><b>{topGoal.current_value||0}</b> {topGoal.unit||"progress"}</span><span>{topGoal.target_date?`${Math.max(0,Math.ceil((new Date(`${topGoal.target_date}T12:00:00`)-today)/86400000))} days left`:"No deadline"}</span></div></>:<button className="goal-empty" onClick={()=>setShowTracker("goals")}><Target size={23}/><b>Give your effort a destination.</b><span>Create your first goal →</span></button>}</article><article className="tracken-panel insight-panel"><div className="panel-heading"><div><span className="card-kicker">TRACKEN INSIGHT</span><h2>One thing to improve</h2></div><Sparkles size={18}/></div><div className="insight-copy"><div className="insight-icon"><Zap size={19}/></div><div><b>{taskProgress < 70 ? "Close your task loop." : weeklyStudyMinutes < 300 ? "Protect a daily study block." : "Keep your current rhythm."}</b><p>{taskProgress < 70 ? "You have unfinished work today. Pick one high-impact task and finish it before adding more." : weeklyStudyMinutes < 300 ? "Your study engine has room to compound. A consistent 45–60 minute block can move the weekly curve." : "Your recent activity is balanced. Keep the system simple and repeat what is working."}</p></div></div><button className="insight-link" onClick={()=>setShowAnalytics(true)}>Open full analytics <ArrowRight size={15}/></button></article></section>
          <section className="achievement-strip" id="track-achievements"><div><Trophy size={20}/><div><span>ACHIEVEMENTS</span><b>Make progress visible.</b></div></div><div className="achievement-items"><span><Flame size={15}/> {Math.max(1, history.length)} active days</span><span><Clock3 size={15}/> {Math.floor(totalStudyMinutes/60)}h total study</span><span><CheckCheck size={15}/> {tasks.filter(t=>t.status==="completed").length} tasks completed</span></div></section>
          <footer className="dashboard-product-footer"><div><strong>TRACKEN <span>by MMD</span></strong><small>Made with DeepIntelligence</small></div><span>Personal Progress OS · 4.2.0</span></footer>
        </div>
      </main>
    </div>
  );
}


function fmtIN(n){return `₹${Number(n||0).toLocaleString("en-IN")}`;}

function TrackerHubPage({ initialTab="tasks", session, theme, toggleTheme, tasks, setTasks, history, goals, setGoals, habits, setHabits, trackedSeconds, setTrackedSeconds, focusSeconds, setFocusSeconds, focusRunning, setFocusRunning, focusPreset, setFocusPreset, formatTime, formatFocus, timeRunning, setTimeRunning, toggleTask, deleteTask, onBack }) {
  const [tab, setTab] = useState(initialTab);
  const [moneyRaw, setMoney] = useSyncedUserState(session.user.id, "money", []);
  const money = Array.isArray(moneyRaw) ? moneyRaw : [];
  const [investmentsRaw, setInvestments] = useSyncedUserState(session.user.id, "investments", []);
  const investments = Array.isArray(investmentsRaw) ? investmentsRaw : [];
  const [assetsRaw, setAssets] = useSyncedUserState(session.user.id, "assets", []);
  const assets = Array.isArray(assetsRaw) ? assetsRaw : [];
  const [liabilitiesRaw, setLiabilities] = useSyncedUserState(session.user.id, "liabilities", []);
  const liabilities = Array.isArray(liabilitiesRaw) ? liabilitiesRaw : [];
  const [networthHydrated, setNetworthHydrated] = useState(false);
  const [budget, setBudget] = useSyncedUserState(session.user.id, "monthly_budget", 0);
  const [budgetOverride, setBudgetOverride] = useSyncedUserState(session.user.id, "monthly_budget_override", false);
  const [budgetCategoriesRaw, setBudgetCategories] = useSyncedUserState(session.user.id, "budget_categories", {});
  const budgetCategories = budgetCategoriesRaw && typeof budgetCategoriesRaw === "object" && !Array.isArray(budgetCategoriesRaw) ? budgetCategoriesRaw : {};
  const [financeGoalPlans, setFinanceGoalPlans] = useSyncedUserState(session.user.id, "finance_goal_plans", {});
  const [financeGoalsRaw, setFinanceGoals] = useSyncedUserState(session.user.id, "finance_goals", []);
  const financeGoals = Array.isArray(financeGoalsRaw) ? financeGoalsRaw : [];
  const [cashflowAutomationRulesRaw, setCashflowAutomationRules] = useSyncedUserState(session.user.id, "cashflow_automation_rules", []);
  const cashflowAutomationRules = Array.isArray(cashflowAutomationRulesRaw) ? cashflowAutomationRulesRaw : [];
  const [holding, setHolding] = useState({ name:"", invested:"", value:"" });
  const [habitText, setHabitText] = useState("");
  const [habitForm, setHabitForm] = useState({ title:"", startDate:new Date().toISOString().slice(0,10), durationDays:30, scheduleType:"daily", scheduleDays:[1,2,3,4,5,6,0] });
  const [showHabitForm, setShowHabitForm] = useState(false);
  const [editingHabitId, setEditingHabitId] = useState(null);
  const [taskQuickTitle, setTaskQuickTitle] = useState("");
  const [taskQuickPriority, setTaskQuickPriority] = useState("medium");
  const [taskQuickDate, setTaskQuickDate] = useState(new Date().toISOString().slice(0,10));
  const [taskQuickGoal, setTaskQuickGoal] = useState("");
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [taskEdit, setTaskEdit] = useState({ title:"", priority:"medium", task_date:"", goal_id:"" });
  const [showStudySummary, setShowStudySummary] = useState(false);
  const [editingInvestmentId, setEditingInvestmentId] = useState(null);
  const [investmentEdit, setInvestmentEdit] = useState({name:"",invested:"",value:""});
  const [editingAssetId, setEditingAssetId] = useState(null);
  const [assetEdit, setAssetEdit] = useState({name:"",value:""});
  const [editingLiabilityId, setEditingLiabilityId] = useState(null);
  const [liabilityEdit, setLiabilityEdit] = useState({name:"",value:""});
  const [plannerDate, setPlannerDate] = useState(new Date().toISOString().slice(0,10));
  const [movingTaskId, setMovingTaskId] = useState(null);
  const [projects, setProjects] = useSyncedUserState(session.user.id, "projects", []);
  const [taskMeta, setTaskMeta] = useSyncedUserState(session.user.id, "task_meta", {});
  const [projectName, setProjectName] = useState("");
  const [engineTaskTitle, setEngineTaskTitle] = useState("");
  const [engineTaskDate, setEngineTaskDate] = useState(new Date().toISOString().slice(0,10));
  const [engineTaskPriority, setEngineTaskPriority] = useState("high");
  const [engineTaskDuration, setEngineTaskDuration] = useState(45);
  const [engineTaskProject, setEngineTaskProject] = useState("");
  const [engineTaskRecurrence, setEngineTaskRecurrence] = useState("none");
  const [engineTaskDependency, setEngineTaskDependency] = useState("");
  const [engineTaskGoal, setEngineTaskGoal] = useState("");
  const [automationTitle, setAutomationTitle] = useState("");
  const [automationFrequency, setAutomationFrequency] = useState("daily");
  const [automationStartDate, setAutomationStartDate] = useState(new Date().toISOString().slice(0,10));
  const [automationEndDate, setAutomationEndDate] = useState("");
  const [automationPriority, setAutomationPriority] = useState("medium");
  const [automationDuration, setAutomationDuration] = useState(30);
  const [automationProject, setAutomationProject] = useState("");
  const [automationGoal, setAutomationGoal] = useState("");
  const [automationSaving, setAutomationSaving] = useState(false);
  const [cashflowAutomationTitle, setCashflowAutomationTitle] = useState("");
  const [cashflowAutomationType, setCashflowAutomationType] = useState("expense");
  const [cashflowAutomationAmount, setCashflowAutomationAmount] = useState("");
  const [cashflowAutomationCategory, setCashflowAutomationCategory] = useState("General");
  const [cashflowAutomationFrequency, setCashflowAutomationFrequency] = useState("monthly");
  const [cashflowAutomationStartDate, setCashflowAutomationStartDate] = useState(new Date().toISOString().slice(0,10));
  const [cashflowAutomationEndDate, setCashflowAutomationEndDate] = useState("");
  const [cashflowAutomationSaving, setCashflowAutomationSaving] = useState(false);
  const [capacityHours, setCapacityHours] = useSyncedUserState(session.user.id, "daily_capacity", 6);
  const [runwayDate, setRunwayDate] = useState(new Date().toISOString().slice(0,10));
  const [runwayStartHour, setRunwayStartHour] = useSyncedUserState(session.user.id, "runway_start", 9);
  useEffect(()=>{ if(tab==="goals") window.scrollTo({top:0,behavior:"smooth"}); },[tab]);
  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      const {data,error}=await supabase.from("profiles").select("networth_snapshot").eq("id",session.user.id).maybeSingle();
      if(!cancelled && !error && data?.networth_snapshot){
        const snapshot=data.networth_snapshot || {};
        if(Array.isArray(snapshot.assets)) setAssets(snapshot.assets);
        if(Array.isArray(snapshot.liabilities)) setLiabilities(snapshot.liabilities);
      }
      if(!cancelled) setNetworthHydrated(true);
    })();
    return()=>{cancelled=true};
  },[session.user.id]);
  useEffect(()=>{
    if(!networthHydrated) return;
    const investmentValue=investments.reduce((sum,item)=>sum+Number(item.value||0),0);
    const cashBalance=money.filter(item=>item.type==="income").reduce((sum,item)=>sum+Number(item.amount||0),0)-money.filter(item=>item.type==="expense"||item.type==="saving").reduce((sum,item)=>sum+Number(item.amount||0),0);
    const otherAssets=assets.reduce((sum,item)=>sum+Number(item.value||0),0);
    const liabilitiesValue=liabilities.reduce((sum,item)=>sum+Number(item.value||0),0);
    const snapshot={assets,liabilities,investments_value:investmentValue,cash_balance:cashBalance,networth_total:investmentValue+cashBalance+otherAssets-liabilitiesValue,updated_at:new Date().toISOString()};
    supabase.from("profiles").upsert({id:session.user.id,networth_snapshot:snapshot},{onConflict:"id"}).then(({error})=>{ if(error) console.warn("Net worth sync:",error.message); });
  },[networthHydrated,assets,liabilities,investments,money,session.user.id]);
  // Timers are owned by Dashboard so switching tracker tabs cannot create duplicate intervals.
  // This prevents the time tracker from jumping by two seconds.

  const todayTasks=tasks.filter(t=>t.task_date===new Date().toISOString().slice(0,10));
  const done=todayTasks.filter(t=>t.status==="completed").length;
  const studyMinutes=history.slice(0,30).reduce((a,r)=>a+Number(r.lecture_minutes||0),0);
  const totalIncome=money.filter(x=>x.type==="income").reduce((a,x)=>a+Number(x.amount),0);
  const totalExpense=money.filter(x=>x.type==="expense").reduce((a,x)=>a+Number(x.amount),0);
  const portfolio=investments.reduce((a,x)=>a+Number(x.value||0),0);
  const invested=investments.reduce((a,x)=>a+Number(x.invested||0),0);
  const totalSavings=money.filter(x=>x.type==="saving").reduce((a,x)=>a+Number(x.amount||0),0);
  const moneyBalance=totalIncome-totalExpense-totalSavings;
  const plannerTasks = tasks.filter(t => t.task_date === plannerDate);
  const plannerDone = plannerTasks.filter(t => t.status === "completed").length;
  const nextSevenDays = Array.from({length:7}, (_, i) => { const d = new Date(); d.setDate(d.getDate()+i); return d.toISOString().slice(0,10); });
  const upcomingTasks = tasks.filter(t => nextSevenDays.includes(t.task_date)).sort((a,b) => String(a.task_date).localeCompare(String(b.task_date)));
  const priorityOpen = plannerTasks.filter(t => t.status !== "completed" && ["high","urgent"].includes(String(t.priority || "").toLowerCase())).length;
  const planningScore = plannerTasks.length ? Math.round((plannerDone / plannerTasks.length) * 70 + (priorityOpen === 0 ? 30 : Math.max(0, 30 - priorityOpen * 10))) : 70;
  const getMeta = (id) => taskMeta[id] || { duration: 30, projectId: "", recurrence: "none", dependencyId: "" };
  const recurringRules = Array.isArray(taskMeta.__recurring_rules) ? taskMeta.__recurring_rules : [];
  const goalAutomationRules = Array.isArray(taskMeta.__goal_automations) ? taskMeta.__goal_automations : [];
  const tasksRef = useRef(tasks);
  const taskMetaRef = useRef(taskMeta);
  const goalsRef = useRef(goals);
  tasksRef.current = tasks;
  taskMetaRef.current = taskMeta;
  goalsRef.current = goals;
  const cashflowRulesRef = useRef(cashflowAutomationRules);
  const moneyRef = useRef(money);
  cashflowRulesRef.current = cashflowAutomationRules;
  moneyRef.current = money;
  const recurrenceLabel = (frequency) => ({ daily:"Every day", weekdays:"Every weekday", weekly:"Every week", monthly:"Every month" }[frequency] || "One-time");
  const nextRecurringDate = (dateKey, frequency) => {
    const d = new Date(`${dateKey}T12:00:00`);
    if (frequency === "daily") d.setDate(d.getDate()+1);
    else if (frequency === "weekdays") { do { d.setDate(d.getDate()+1); } while (d.getDay()===0 || d.getDay()===6); }
    else if (frequency === "weekly") d.setDate(d.getDate()+7);
    else if (frequency === "monthly") {
      // Clamp the day when moving from a long month (e.g. Jan 31 → Feb 28)
      // instead of allowing JavaScript Date to overflow into the next month.
      const originalDay=d.getDate();
      d.setDate(1);
      d.setMonth(d.getMonth()+1);
      const lastDay=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();
      d.setDate(Math.min(originalDay,lastDay));
    }
    return d.toISOString().slice(0,10);
  };
  const recurringRuleKey = (ruleId, dateKey) => `__recurring_run__${ruleId}__${dateKey}`;
  const goalAutomationKey = (ruleId, dateKey) => `__goal_automation_run__${ruleId}__${dateKey}`;
  const cashflowAutomationKey = (ruleId, dateKey) => `__cashflow_automation_run__${ruleId}__${dateKey}`;
  const nextCashflowDate = (dateKey, frequency) => {
    const d = new Date(`${dateKey}T12:00:00`);
    if (frequency === "daily") d.setDate(d.getDate()+1);
    else if (frequency === "weekdays") { do { d.setDate(d.getDate()+1); } while (d.getDay()===0 || d.getDay()===6); }
    else if (frequency === "weekly") d.setDate(d.getDate()+7);
    else if (frequency === "monthly") {
      const originalDay=d.getDate(); d.setDate(1); d.setMonth(d.getMonth()+1);
      const lastDay=new Date(d.getFullYear(),d.getMonth()+1,0).getDate(); d.setDate(Math.min(originalDay,lastDay));
    }
    return d.toISOString().slice(0,10);
  };
  const cashflowFrequencyLabel = (frequency) => ({daily:"Every day",weekdays:"Every weekday",weekly:"Every week",monthly:"Every month"}[frequency] || "Every month");

  const isBlocked = (task) => { const dep = getMeta(task.id).dependencyId; return Boolean(dep && tasks.some(x => x.id === dep && x.status !== "completed")); };
  const durationFor = (task) => Math.max(5, Number(getMeta(task.id).duration || 30));
  const engineTasks = tasks.slice().sort((a,b) => {
    const rank = { urgent: 4, high: 3, medium: 2, low: 1 };
    const pa = rank[String(a.priority||"medium").toLowerCase()] || 2, pb = rank[String(b.priority||"medium").toLowerCase()] || 2;
    if (a.status !== b.status) return a.status === "completed" ? 1 : -1;
    if (pb !== pa) return pb - pa;
    return String(a.task_date||"").localeCompare(String(b.task_date||""));
  });
  const engineToday = tasks.filter(t => t.task_date === new Date().toISOString().slice(0,10) && t.status !== "completed");
  const enginePlannedMinutes = engineToday.reduce((sum,t)=>sum+durationFor(t),0);
  const engineCapacityMinutes = Math.max(1, Number(capacityHours||6)*60);
  const engineOverdue = tasks.filter(t => t.status !== "completed" && t.task_date && t.task_date < new Date().toISOString().slice(0,10)).length;
  const studyActivityDates = new Set(history.filter(r => Number(r.daily_score||0)>0 || Number(r.lecture_minutes||0)>0 || Number(r.questions_done||0)>0 || Number(r.pages_read||0)>0).map(r=>r.record_date));
  const currentStudyStreak = (() => { let run=0; const d=new Date(); while(studyActivityDates.has(d.toISOString().slice(0,10))){ run++; d.setDate(d.getDate()-1); } return run; })();
  const bestStudyStreak = (() => { const sorted=[...studyActivityDates].sort(); let best=0,run=0,prev=null; for(const key of sorted){ const d=new Date(key+"T12:00:00"); if(prev){ const diff=Math.round((d-prev)/86400000); run=diff===1?run+1:1; } else run=1; best=Math.max(best,run); prev=d; } return best; })();
  const streakLast7 = Array.from({length:7},(_,i)=>{ const d=new Date(); d.setDate(d.getDate()-(6-i)); return {key:d.toISOString().slice(0,10), label:d.toLocaleDateString("en-US",{weekday:"short"}).slice(0,2), active:studyActivityDates.has(d.toISOString().slice(0,10))}; });
  const runwayOpenTasks = tasks.filter(t => t.task_date === runwayDate && t.status !== "completed").sort((a,b) => {
    const rank={urgent:4,high:3,medium:2,low:1};
    const pa=rank[String(a.priority||"medium").toLowerCase()]||2;
    const pb=rank[String(b.priority||"medium").toLowerCase()]||2;
    if(pb!==pa) return pb-pa;
    return String(a.title||"").localeCompare(String(b.title||""));
  });
  const runwayCapacityMinutes = Math.max(60, Number(capacityHours||6)*60);
  const runwayTasks = runwayOpenTasks.reduce((acc,t)=>{
    const used=acc.reduce((sum,x)=>sum+durationFor(x),0);
    return used+durationFor(t)<=runwayCapacityMinutes?[...acc,t]:acc;
  },[]);
  const runwayPlannedMinutes = runwayTasks.reduce((sum,t)=>sum+durationFor(t),0);
  const runwayOverflowTasks = runwayOpenTasks.filter(t=>!runwayTasks.some(x=>x.id===t.id));
  const formatRunwayTime = (minutes) => {
    const total=Math.max(0,Number(minutes)||0);
    const hour24=(runwayStartHour+Math.floor(total/60))%24;
    const minute=total%60;
    const suffix=hour24>=12?"PM":"AM";
    const hour12=hour24%12||12;
    return `${hour12}:${String(minute).padStart(2,"0")} ${suffix}`;
  };
  const completeEngineTask = async (task) => {
    const {data,error:e}=await supabase.from("tasks").update({status:"completed"}).eq("id",task.id).select().single();
    if(!e&&data)setTasks(c=>c.map(x=>x.id===task.id?data:x));
  };
  const engineProjects = projects.map(project => { const items = tasks.filter(t=>getMeta(t.id).projectId===project.id); const completed = items.filter(t=>t.status==="completed").length; return {...project, items, completed, progress: items.length ? Math.round(completed/items.length*100) : 0}; });
  const createEngineTask = () => {
    const title=engineTaskTitle.trim(); if(!title)return;
    const tempId=crypto.randomUUID();
    const payload={user_id:session.user.id,title,task_date:engineTaskDate,status:"todo",priority:engineTaskPriority,goal_id:engineTaskGoal||null};
    const meta={duration:Number(engineTaskDuration)||45,projectId:engineTaskProject,recurrence:engineTaskRecurrence,dependencyId:engineTaskDependency};
    setTasks(c=>[...c,{id:tempId,...payload,created_at:new Date().toISOString()}]);
    setTaskMeta(c=>({...c,[tempId]:meta})); setEngineTaskTitle(""); setEngineTaskGoal("");
    supabase.from("tasks").insert(payload).select().single().then(({data,error:e})=>{
      if(e){setTasks(c=>c.filter(x=>x.id!==tempId));setTaskMeta(c=>{const n={...c};delete n[tempId];return n;});window.alert(e.message||"Task could not be saved.");return;}
      if(data){setTasks(c=>c.map(x=>x.id===tempId?data:x));setTaskMeta(c=>{const n={...c};n[data.id]=n[tempId]||meta;delete n[tempId];return n;});}
    });
  };
  const addProject = () => { const title=projectName.trim(); if(!title)return; setProjects(c=>[{id:crypto.randomUUID(),name:title,createdAt:new Date().toISOString()},...c]); setProjectName(""); };
  const updateTaskMeta = (task, patch) => setTaskMeta(c=>({...c,[task.id]:{duration:30,projectId:"",recurrence:"none",dependencyId:"",...(c[task.id]||{}),...patch}}));
  const generateRecurring = async (task) => {
    const meta=getMeta(task.id); const rec=meta.recurrence; if(rec==="none") return;
    const nextDate=nextRecurringDate(task.task_date,rec);
    const rule=meta.automationId ? recurringRules.find(r=>r.id===meta.automationId) : null;
    if(rule?.endDate && nextDate>rule.endDate) return;
    const key=meta.automationId ? recurringRuleKey(meta.automationId,nextDate) : null;
    if(key && tasks.some(t=>getMeta(t.id).recurringRunKey===key)) return;
    const tempId=crypto.randomUUID();
    const payload={user_id:session.user.id,title:task.title,task_date:nextDate,status:"todo",priority:task.priority||"medium",goal_id:task.goal_id||null};
    setTasks(c=>[...c,{id:tempId,...payload,created_at:new Date().toISOString()}]);
    setTaskMeta(c=>({...c,[tempId]:{...meta,recurringRunKey:key||undefined}}));
    const {data,error:e}=await supabase.from("tasks").insert(payload).select().single();
    if(e){setTasks(c=>c.filter(x=>x.id!==tempId));setTaskMeta(c=>{const n={...c};delete n[tempId];return n;});}
    else if(data){setTasks(c=>c.map(x=>x.id===tempId?data:x));setTaskMeta(c=>{const n={...c};n[data.id]=n[tempId];delete n[tempId];return n;});}
  };
  const moveTask = async (task, date) => { if (!date || date === task.task_date || movingTaskId === task.id) return; setMovingTaskId(task.id); const {data,error:e}=await supabase.from("tasks").update({task_date:date}).eq("id",task.id).select().single(); if (!e && data) setTasks(c=>c.map(x=>x.id===task.id?data:x)); setMovingTaskId(null); };
  const createRecurringAutomation = () => {
    const title = automationTitle.trim();
    if (!title || automationSaving) return;
    if (automationEndDate && automationEndDate < automationStartDate) { window.alert("End date must be on or after the start date."); return; }
    const rule = { id: crypto.randomUUID(), title, frequency: automationFrequency, startDate: automationStartDate, endDate: automationEndDate || null, priority: automationPriority, duration: Number(automationDuration)||30, projectId: automationProject, goalId: automationGoal || null, enabled: true, createdAt: new Date().toISOString() };
    setTaskMeta(current => ({ ...current, __recurring_rules: [rule, ...(Array.isArray(current.__recurring_rules)?current.__recurring_rules:[])] }));
    setAutomationTitle("");
    setAutomationEndDate("");
  };
  const toggleRecurringAutomation = (ruleId) => setTaskMeta(current => ({ ...current, __recurring_rules: (current.__recurring_rules||[]).map(r => r.id===ruleId ? {...r,enabled:!r.enabled} : r) }));
  const deleteRecurringAutomation = (ruleId) => {
    if (!window.confirm("Delete this automation? Existing tasks it already created will stay.")) return;
    setTaskMeta(current => ({ ...current, __recurring_rules: (current.__recurring_rules||[]).filter(r=>r.id!==ruleId) }));
  };
  const createCashflowAutomation = () => {
    const title = cashflowAutomationTitle.trim();
    const amount = Number(cashflowAutomationAmount);
    if (!title || !amount || amount <= 0 || cashflowAutomationSaving) return;
    if (cashflowAutomationEndDate && cashflowAutomationEndDate < cashflowAutomationStartDate) { window.alert("End date must be on or after the start date."); return; }
    const rule = { id: crypto.randomUUID(), title, type: cashflowAutomationType, amount, category: cashflowAutomationCategory.trim() || "General", frequency: cashflowAutomationFrequency, startDate: cashflowAutomationStartDate, endDate: cashflowAutomationEndDate || null, enabled: true, createdAt: new Date().toISOString() };
    setCashflowAutomationRules(current => [rule, ...(Array.isArray(current)?current:[])]);
    setCashflowAutomationTitle(""); setCashflowAutomationAmount(""); setCashflowAutomationEndDate("");
  };
  const toggleCashflowAutomation = (ruleId) => setCashflowAutomationRules(current => (current||[]).map(r=>r.id===ruleId?{...r,enabled:!r.enabled}:r));
  const deleteCashflowAutomation = (ruleId) => {
    if (!window.confirm("Delete this cashflow automation? Existing entries it already created will stay.")) return;
    setCashflowAutomationRules(current => (current||[]).filter(r=>r.id!==ruleId));
  };
  const addFinanceGoalContribution = async (goalId, amount, note) => {
    const value=Number(amount); const goal=(financeGoals||[]).find(g=>String(g.id)===String(goalId));
    if(!goal||!Number.isFinite(value)||value<=0)return {ok:false,message:"Choose a finance goal and enter a valid contribution."};
    const remaining=Math.max(0,Number(goal.target||0)-Number(goal.saved||0));
    if(value>remaining)return {ok:false,message:`Contribution is higher than the remaining goal amount (₹${remaining.toLocaleString("en-IN")}).`};
    const next={...goal,saved:Number(goal.saved||0)+value,updatedAt:new Date().toISOString()};
    const tx={id:crypto.randomUUID(),user_id:session.user.id,type:"saving",title:note?.trim()||`Goal contribution · ${goal.title}`,amount:value,category:"Goal Funding",date:new Date().toISOString(),financeGoalId:goal.id,created_at:new Date().toISOString()};
    setMoney(v=>[tx,...v]); setFinanceGoals(v=>v.map(g=>String(g.id)===String(goal.id)?next:g));
    return {ok:true};
  };
  const createFinanceGoal = (form, editingId) => {
    const title=form.title.trim(), target=Number(form.target), saved=Number(form.saved||0), monthly=Number(form.monthly||0);
    if(!title||target<=0||saved<0||saved>target||monthly<0){window.alert("Enter a goal name, a valid target, and a saved amount that does not exceed the target.");return false;}
    if(editingId){setFinanceGoals(v=>v.map(g=>g.id===editingId?{...g,title,target,saved,monthly,deadline:form.deadline||null,status:"active",updatedAt:new Date().toISOString()}:g));}
    else setFinanceGoals(v=>[{id:crypto.randomUUID(),title,target,saved,monthly,deadline:form.deadline||null,status:"active",createdAt:new Date().toISOString()},...(v||[])]);
    return true;
  };
  const materializeRecurringCashflow = async () => {
    const rules = Array.isArray(cashflowRulesRef.current) ? cashflowRulesRef.current : [];
    if (!rules.length) return;
    const today = new Date().toISOString().slice(0,10);
    const existingKeys = new Set((moneyRef.current||[]).map(x=>x.recurringRunKey).filter(Boolean));
    const additions=[];
    const addEntry=(rule,date,key)=>{
      if(existingKeys.has(key)) return;
      const tempId=crypto.randomUUID();
      additions.push({id:tempId,user_id:session.user.id,type:rule.type,title:rule.title,amount:Number(rule.amount),category:rule.category||"General",date:`${date}T09:00:00.000Z`,recurringRunKey:key,automationId:rule.id,created_at:new Date().toISOString()});
      existingKeys.add(key);
    };
    for(const rule of rules){
      if(!rule.enabled || !rule.startDate) continue;
      let date=rule.startDate, guard=0;
      while(date<=today && guard++<400){
        if(!rule.endDate || date<=rule.endDate) addEntry(rule,date,cashflowAutomationKey(rule.id,date));
        const next=nextCashflowDate(date,rule.frequency);
        if(next===date || (rule.endDate && next>rule.endDate && date<today)) break;
        date=next;
      }
    }
    if(!additions.length) return;
    setMoney(current=>[...additions,...current]);
    for(const temp of additions){
      // Cashflow is stored in the user's synced app state, so there is no separate DB table to insert into.
      // setMoney above persists the complete updated list through the existing sync hook.
    }
  };

  const materializeRecurringTasks = async () => {
    const metaNow = taskMetaRef.current || {};
    const rules = Array.isArray(metaNow.__recurring_rules) ? metaNow.__recurring_rules : [];
    const goalRules = Array.isArray(metaNow.__goal_automations) ? metaNow.__goal_automations : [];
    const currentTasks = tasksRef.current;
    if (!rules.length && !goalRules.length) return;
    const today = new Date().toISOString().slice(0,10);
    const existingKeys = new Set();
    currentTasks.forEach(t => {
      const m = taskMetaRef.current[t.id] || {};
      if (m.recurringRunKey) existingKeys.add(m.recurringRunKey);
      if (m.goalAutomationRunKey) existingKeys.add(m.goalAutomationRunKey);
    });
    const additions=[]; const metaAdds={};
    const addDueTask = (rule, date, key, extraMeta={}) => {
      if (existingKeys.has(key)) return;
      const tempId=crypto.randomUUID();
      additions.push({id:tempId,user_id:session.user.id,title:rule.title,task_date:date,status:"todo",priority:rule.priority||"medium",goal_id:rule.goalId||null,created_at:new Date().toISOString()});
      metaAdds[tempId]={duration:rule.duration||30,projectId:rule.projectId||"",recurrence:rule.frequency,dependencyId:"",...extraMeta};
      existingKeys.add(key);
    };
    for (const rule of rules) {
      if (!rule.enabled || !rule.startDate) continue;
      let date = rule.startDate;
      let guard=0;
      while (date <= today && guard++ < 400) {
        if (!rule.endDate || date <= rule.endDate) addDueTask(rule,date,recurringRuleKey(rule.id,date),{recurringRunKey:recurringRuleKey(rule.id,date),automationId:rule.id});
        const next=nextRecurringDate(date,rule.frequency);
        if(next===date || (rule.endDate && next>rule.endDate && date<today)) break;
        date=next;
      }
    }
    const liveGoals = goalsRef.current || [];
    for (const rule of goalRules) {
      if (!rule.enabled || !rule.startDate || !rule.goalId) continue;
      const goal = liveGoals.find(g=>String(g.id)===String(rule.goalId));
      if (!goal || goal.status === "completed") continue;
      const effectiveEnd = rule.endDate || goal.target_date || null;
      let date = rule.startDate;
      let guard=0;
      while (date <= today && guard++ < 400) {
        if ((!effectiveEnd || date <= effectiveEnd) && (!goal.target_date || date <= goal.target_date)) {
          const key=goalAutomationKey(rule.id,date);
          addDueTask(rule,date,key,{goalAutomationRunKey:key,goalAutomationId:rule.id});
        }
        const next=nextRecurringDate(date,rule.frequency);
        if(next===date || (effectiveEnd && next>effectiveEnd && date<today)) break;
        date=next;
      }
    }
    if (!additions.length) return;
    setTasks(current => [...current, ...additions]);
    setTaskMeta(current => ({...current,...metaAdds}));
    for (const temp of additions) {
      const {data,error:e}=await supabase.from("tasks").insert({user_id:session.user.id,title:temp.title,task_date:temp.task_date,status:temp.status,priority:temp.priority,goal_id:temp.goal_id}).select().single();
      if(e){ setTasks(c=>c.filter(x=>x.id!==temp.id)); setTaskMeta(c=>{const n={...c}; delete n[temp.id]; return n;}); }
      else if(data){ setTasks(c=>c.map(x=>x.id===temp.id?data:x)); setTaskMeta(c=>{const n={...c}; n[data.id]=n[temp.id]; delete n[temp.id]; return n;}); }
    }
  };
  useEffect(()=>{ materializeRecurringTasks(); materializeRecurringCashflow(); const id=setInterval(()=>{materializeRecurringTasks(); materializeRecurringCashflow();},60000); return()=>clearInterval(id); },[recurringRules.length, goalAutomationRules.length, cashflowAutomationRules.length, session.user.id]);

  const tabs=[
    ["runway",Clock3,"Today"],["productivity",BriefcaseBusiness,"Productivity Engine"],["tasks",ListChecks,"Tasks"],["goals",Target,"Goals"],["habits",Flame,"Habits"],["focus",Timer,"Focus"],
    ["money",WalletCards,"Cashflow"],["budget",PieChart,"Budget"],["investments",BriefcaseBusiness,"Investments"],["networth",CircleDollarSign,"Net Worth"]
  ];
  const visibleTabs = tabs.filter(([id]) => id !== "streak");
  const addAsset=()=>{ const name=prompt("Asset name"); const value=Number(prompt("Current value")); if(name&&value>0)setAssets(v=>[{id:crypto.randomUUID(),name,value},...v]); };
  const startEditAsset=(x)=>{setEditingAssetId(x.id);setAssetEdit({name:x.name||"",value:String(x.value||"")});};
  const saveAssetEdit=()=>{if(!editingAssetId||!assetEdit.name.trim()||Number(assetEdit.value)<=0)return;setAssets(v=>v.map(x=>x.id===editingAssetId?{...x,name:assetEdit.name.trim(),value:Number(assetEdit.value)}:x));setEditingAssetId(null);};
  const deleteAsset=(id)=>{if(window.confirm("Delete this asset? This cannot be undone."))setAssets(v=>v.filter(x=>x.id!==id));};
  const addLiability=()=>{ const name=prompt("Liability name"); const value=Number(prompt("Outstanding amount")); if(name&&value>0)setLiabilities(v=>[{id:crypto.randomUUID(),name,value},...v]); };
  const startEditLiability=(x)=>{setEditingLiabilityId(x.id);setLiabilityEdit({name:x.name||"",value:String(x.value||"")});};
  const saveLiabilityEdit=()=>{if(!editingLiabilityId||!liabilityEdit.name.trim()||Number(liabilityEdit.value)<=0)return;setLiabilities(v=>v.map(x=>x.id===editingLiabilityId?{...x,name:liabilityEdit.name.trim(),value:Number(liabilityEdit.value)}:x));setEditingLiabilityId(null);};
  const deleteLiability=(id)=>{if(window.confirm("Delete this liability? This cannot be undone."))setLiabilities(v=>v.filter(x=>x.id!==id));};
  const addInvestment=()=>{ if(!holding.name.trim()||Number(holding.value)<=0)return; setInvestments(v=>[{...holding,id:crypto.randomUUID(),invested:Number(holding.invested||0),value:Number(holding.value)},...v]); setHolding({name:"",invested:"",value:""}); };
  const startEditInvestment=(x)=>{setEditingInvestmentId(x.id);setInvestmentEdit({name:x.name||"",invested:String(x.invested||""),value:String(x.value||"")});};
  const saveInvestmentEdit=()=>{if(!editingInvestmentId||!investmentEdit.name.trim()||Number(investmentEdit.value)<=0)return;setInvestments(v=>v.map(x=>x.id===editingInvestmentId?{...x,...investmentEdit,invested:Number(investmentEdit.invested||0),value:Number(investmentEdit.value)}:x));setEditingInvestmentId(null);};
  const deleteInvestment=(id)=>{if(window.confirm("Delete this investment holding? This cannot be undone."))setInvestments(v=>v.filter(x=>x.id!==id));};
  const addQuickTask=()=>{
    const title=taskQuickTitle.trim();
    if(!title)return;
    const tempId=crypto.randomUUID();
    const payload={user_id:session.user.id,title,task_date:taskQuickDate,status:"todo",priority:taskQuickPriority,goal_id:taskQuickGoal||null};
    const optimistic={id:tempId,...payload,created_at:new Date().toISOString()};
    setTasks(c=>[...c,optimistic]);
    setTaskQuickTitle("");
    setTaskQuickGoal("");
    supabase.from("tasks").insert(payload).select().single().then(({data,error:e})=>{
      if(e){setTasks(c=>c.filter(x=>x.id!==tempId));window.alert(e.message);return;}
      if(data)setTasks(c=>c.map(x=>x.id===tempId?data:x));
    });
  };
  const startEditTask=(task)=>{setEditingTaskId(task.id);setTaskEdit({title:task.title||"",priority:task.priority||"medium",task_date:task.task_date||new Date().toISOString().slice(0,10),goal_id:task.goal_id||""});};
  const cancelEditTask=()=>{setEditingTaskId(null);setTaskEdit({title:"",priority:"medium",task_date:"",goal_id:""});};
  const saveTaskEdit=()=>{
    if(!editingTaskId||!taskEdit.title.trim()||!taskEdit.task_date)return;
    const id=editingTaskId; const previous=tasks.find(x=>x.id===id);
    const patch={title:taskEdit.title.trim(),priority:taskEdit.priority,task_date:taskEdit.task_date,goal_id:taskEdit.goal_id||null};
    setTasks(c=>c.map(x=>x.id===id?{...x,...patch}:x)); cancelEditTask();
    supabase.from("tasks").update(patch).eq("id",id).eq("user_id",session.user.id).select().single().then(({data,error:e})=>{
      if(e){if(previous)setTasks(c=>c.map(x=>x.id===id?previous:x));window.alert(e.message);return;}
      if(data)setTasks(c=>c.map(x=>x.id===id?data:x));
    });
  };
  const habitDayKey = (date) => { const d = typeof date === "string" ? new Date(`${date}T12:00:00`) : date; return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
  const normalizedHabit = (h) => ({
    ...h,
    startDate: h.startDate || habitDayKey(new Date()),
    durationDays: Math.max(1, Number(h.durationDays) || 30),
    scheduleType: ["daily","weekdays","custom"].includes(h.scheduleType) ? h.scheduleType : "daily",
    scheduleDays: Array.isArray(h.scheduleDays) && h.scheduleDays.length ? [...new Set(h.scheduleDays.map(Number).filter(d=>d>=0&&d<=6))] : [1,2,3,4,5,6,0],
    completedDates: Array.isArray(h.completedDates) ? h.completedDates : (h.done ? [habitDayKey(new Date())] : [])
  });
  const habitScheduledOn = (h, dateKey) => {
    const n = normalizedHabit(h);
    const day = new Date(`${dateKey}T12:00:00`).getDay();
    if (n.scheduleType === "weekdays") return day >= 1 && day <= 5;
    if (n.scheduleType === "custom") return n.scheduleDays.includes(day);
    return true;
  };
  const habitScheduleLabel = (h) => {
    const n = normalizedHabit(h);
    if (n.scheduleType === "weekdays") return "Weekdays";
    if (n.scheduleType === "custom") {
      const names = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
      return n.scheduleDays.sort((a,b)=>a-b).map(d=>names[d]).join(" · ") || "Custom schedule";
    }
    return "Every day";
  };
  const isHabitActiveOn = (h, dateKey) => { const n = normalizedHabit(h); const start = new Date(`${n.startDate}T12:00:00`); const day = new Date(`${dateKey}T12:00:00`); const end = new Date(start); end.setDate(end.getDate() + n.durationDays - 1); return day >= start && day <= end; };
  const isHabitDoneOn = (h, dateKey) => normalizedHabit(h).completedDates.includes(dateKey);
  const habitDays = (h) => { const n=normalizedHabit(h); const start=new Date(`${n.startDate}T12:00:00`); return Array.from({length:n.durationDays},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);return {key:habitDayKey(d),label:d.toLocaleDateString("en-US",{weekday:"short"}).slice(0,2),day:d.getDate()};}); };
  const toggleHabitDay = (habit, dateKey) => setHabits(current => current.map(h => { if(h.id!==habit.id || !isHabitActiveOn(h,dateKey) || !habitScheduledOn(h,dateKey)) return h; const n=normalizedHabit(h); const has=n.completedDates.includes(dateKey); const completedDates=has?n.completedDates.filter(d=>d!==dateKey):[...new Set([...n.completedDates,dateKey])]; return {...n,completedDates,done:completedDates.includes(habitDayKey(new Date()))}; }));
  const openNewHabit = () => { setEditingHabitId(null); setHabitForm({title:"",startDate:habitDayKey(new Date()),durationDays:30,scheduleType:"daily",scheduleDays:[1,2,3,4,5,6,0]}); setShowHabitForm(true); };
  const openEditHabit = (habit) => { const n=normalizedHabit(habit); setEditingHabitId(habit.id); setHabitForm({title:n.title,startDate:n.startDate,durationDays:n.durationDays,scheduleType:n.scheduleType,scheduleDays:n.scheduleDays}); setShowHabitForm(true); };
  const saveHabit = () => {
    const title=habitForm.title.trim();
    const duration=Math.max(1,Math.min(365,Number(habitForm.durationDays)||0));
    const scheduleType=["daily","weekdays","custom"].includes(habitForm.scheduleType) ? habitForm.scheduleType : "daily";
    const scheduleDays=scheduleType === "custom" ? [...new Set((habitForm.scheduleDays||[]).map(Number).filter(d=>d>=0&&d<=6))] : scheduleType === "weekdays" ? [1,2,3,4,5] : [0,1,2,3,4,5,6];
    if(!title || !habitForm.startDate || !duration || (scheduleType === "custom" && !scheduleDays.length)) return;
    setHabits(current => editingHabitId
      ? current.map(h => h.id===editingHabitId ? {...normalizedHabit(h),title,startDate:habitForm.startDate,durationDays:duration,scheduleType,scheduleDays} : h)
      : [{id:crypto.randomUUID(),title,startDate:habitForm.startDate,durationDays:duration,scheduleType,scheduleDays,completedDates:[]},...current]);
    setShowHabitForm(false);
  };
  const deleteHabit = (habit) => { if(window.confirm(`Delete “${habit.title}”? Its habit history will also be removed.`)) setHabits(current=>current.filter(h=>h.id!==habit.id)); };
  const title={runway:"Today’s Runway",productivity:"Productivity Engine",tasks:"Tasks",streak:"Streak",goals:"Goals that move you.",habits:"Habit System",focus:"Focus Mode",money:"Cashflow",budget:"Budget",investments:"Investments",networth:"Net Worth"}[tab];
  const renderHabitCard = (raw) => {
    const h = normalizedHabit(raw);
    const days = habitDays(h);
    const today = habitDayKey(new Date());
    const activeToday = isHabitActiveOn(h, today);
    const scheduledToday = activeToday && habitScheduledOn(h, today);
    const scheduledCount = days.filter(d => habitScheduledOn(h,d.key)).length;
    const completedCount = h.completedDates.filter(d => isHabitActiveOn(h, d) && habitScheduledOn(h,d)).length;
    const nextScheduled = days.find(d => d.key >= today && isHabitActiveOn(h,d.key) && habitScheduledOn(h,d.key));
    return (
      <article className="habit-system-card" key={h.id}>
        <div className="habit-system-card-head">
          <div><span className="card-kicker">{!activeToday ? "DURATION COMPLETE" : scheduledToday ? "SCHEDULED TODAY" : "REST DAY"}</span><h3>{h.title}</h3><p>{new Date(`${h.startDate}T12:00:00`).toLocaleDateString("en-US", {month:"short",day:"numeric",year:"numeric"})} · {h.durationDays} days · {completedCount}/{scheduledCount} scheduled days · {habitScheduleLabel(h)}{nextScheduled && !scheduledToday ? ` · Next ${nextScheduled.key}` : ""}</p></div>
          <div className="habit-row-actions"><button className="ghost-small" onClick={() => openEditHabit(h)}><PenLine size={14}/> Edit</button><button className="ghost-small danger-text" onClick={() => deleteHabit(h)}><Trash2 size={14}/> Delete</button></div>
        </div>
        <div className="habit-day-strip">
          {days.map(day => {
            const done = isHabitDoneOn(h, day.key);
            return <button key={day.key} className={`${done ? "completed " : ""}${day.key === today ? "today " : ""}${habitScheduledOn(h,day.key) ? "scheduled" : "rest-day"}`} onClick={() => toggleHabitDay(h, day.key)} disabled={!isHabitActiveOn(h, day.key) || !habitScheduledOn(h,day.key)} title={`${day.key} · ${habitScheduledOn(h,day.key) ? (done ? "Completed" : "Scheduled") : "Rest day"}`}><span>{done ? <Check size={13}/> : day.day}</span><small>{habitScheduledOn(h,day.key) ? day.label : "REST"}</small></button>;
          })}
        </div>
      </article>
    );
  };
  return <div className="tracker-page-shell">
    <header className="tracker-page-topbar"><div className="tracker-page-brand"><button className="back-button" onClick={onBack}><ArrowLeft size={17}/></button><div><span>TRACKEN</span><small>PERSONAL PROGRESS OS</small></div></div><div className="tracker-page-actions"><button className="dashboard-theme-button theme-control" onClick={toggleTheme} aria-label="Toggle dark mode" title="Toggle dark mode">{theme==="light"?<Moon size={18}/>:<Sun size={18}/>}<span>{theme==="light"?"Dark mode":"Light mode"}</span></button></div></header>
    <div className="tracker-page-body"><aside className="tracker-subnav"><div className="tracker-subnav-kicker">TRACK CENTER</div>{visibleTabs.map(([id,Icon,label])=><button key={id} className={tab===id?"active":""} onClick={()=>setTab(id)}><Icon size={17}/><span>{label}</span>{id==="tasks"&&<small>{todayTasks.filter(t=>t.status!=="completed").length}</small>}</button>)}<div className="tracker-subnav-footer"><span>TRACKEN SCORE</span><strong>{Math.min(100,Math.round((done/Math.max(todayTasks.length,1))*60+(Math.min(studyMinutes/900,1)*40)))}</strong><small>Activity-based</small></div></aside>
      <main className="tracker-workspace">{tab!=="goals"&&tab!=="budget"&&<div className="tracker-heading"><div><span className="card-kicker">TRACK CENTER</span><h1>{title}</h1><p>{tab==="money"?"Know where your money goes.":tab==="investments"?"Keep your portfolio visible.":tab==="networth"?"See your financial position at a glance.":tab==="productivity"?"Turn goals, tasks and time into an execution system.":tab==="streak"?"Your study consistency, summarized in one clear view.":"One system for the work that moves you forward."}</p></div><span className="tracker-date">{new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</span></div>}
      {tab==="runway"&&<section className="runway-engine">
        <div className="runway-hero">
          <div className="runway-hero-copy">
            <span className="eyebrow"><span></span> DAILY OPERATING SYSTEM · 4.2.0</span>
            <h2>Your day, turned into a <em>clear runway.</em></h2>
            <p>TRACKEN converts today's open work into a realistic sequence using priority, estimated duration and your available capacity. The goal is not to fill every minute — it is to finish the work that matters.</p>
            <div className="runway-date-controls">
              <button className="ghost-small" onClick={()=>{const d=new Date(runwayDate+"T12:00:00");d.setDate(d.getDate()-1);setRunwayDate(d.toISOString().slice(0,10));}}><ArrowLeft size={14}/> Previous</button>
              <strong>{new Date(runwayDate+"T12:00:00").toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</strong>
              <button className="ghost-small" onClick={()=>setRunwayDate(new Date().toISOString().slice(0,10))}>Today</button>
              <button className="ghost-small" onClick={()=>{const d=new Date(runwayDate+"T12:00:00");d.setDate(d.getDate()+1);setRunwayDate(d.toISOString().slice(0,10));}}>Next <ArrowRight size={14}/></button>
            </div>
          </div>
          <div className="runway-command">
            <span>RUNWAY HEALTH</span>
            <strong>{runwayOverflowTasks.length?"TIGHT":"CLEAR"}</strong>
            <small>{runwayTasks.length} selected · {Math.round(runwayPlannedMinutes/60*10)/10}h planned</small>
            <div className="runway-health-meter"><i style={{width:`${Math.min(100,runwayPlannedMinutes/runwayCapacityMinutes*100)}%`}}/></div>
            <b>{Math.max(0,Math.round((runwayCapacityMinutes-runwayPlannedMinutes)/60*10)/10)}h buffer</b>
          </div>
        </div>
        <div className="runway-kpis">
          <article><span>OPEN TODAY</span><strong>{runwayOpenTasks.length}</strong><small>unfinished tasks</small></article>
          <article><span>PLANNED</span><strong>{Math.round(runwayPlannedMinutes/60*10)/10}h</strong><small>selected for your runway</small></article>
          <article><span>CAPACITY</span><strong>{capacityHours}h</strong><small>your daily limit</small></article>
          <article><span>OUTSIDE RUNWAY</span><strong className={runwayOverflowTasks.length?"negative":"positive"}>{runwayOverflowTasks.length}</strong><small>{runwayOverflowTasks.length?"needs rescheduling":"nothing pushed out"}</small></article>
        </div>
        <div className="runway-grid">
          <article className="tracker-large-card">
            <div className="panel-heading"><div><span className="card-kicker">TODAY'S RUNWAY</span><h2>Work in the order that matters.</h2></div><Sparkles size={20}/></div>
            <div className="runway-settings"><label>Start time<select value={runwayStartHour} onChange={e=>setRunwayStartHour(Number(e.target.value))}>{[6,7,8,9,10,11,12,13,14,15,16,17,18].map(h=><option key={h} value={h}>{h%12||12}:00 {h>=12?"PM":"AM"}</option>)}</select></label><label>Capacity<input type="number" min="1" max="24" step="0.5" value={capacityHours} onChange={e=>setCapacityHours(Math.max(1,Number(e.target.value)||1))}/></label></div>
            <div className="runway-timeline">
              {runwayTasks.length?runwayTasks.map((t,i)=>{const offset=runwayTasks.slice(0,i).reduce((sum,x)=>sum+durationFor(x),0);const dur=durationFor(t);return <div className="runway-task-card" key={t.id}><div className="runway-time"><span>{formatRunwayTime(offset)}</span><i></i></div><div className="runway-task-body"><div><span className={`runway-priority ${String(t.priority||"medium").toLowerCase()}`}>{String(t.priority||"medium")}</span><small>{dur} min</small></div><b>{t.title}</b><p>{getMeta(t.id).projectId?projects.find(p=>p.id===getMeta(t.id).projectId)?.name||"Project":"Independent task"}</p></div><button className="runway-complete" onClick={()=>completeEngineTask(t)} title="Complete task"><Check size={15}/></button></div>}) : <div className="tracker-empty-big"><CheckCircle2 size={28}/><h3>Your runway is clear.</h3><p>No open tasks are scheduled for this day. Use the Productivity Engine to capture new work.</p></div>}
            </div>
          </article>
          <aside className="runway-side-stack">
            <article className="tracker-large-card"><div className="panel-heading"><div><span className="card-kicker">DAILY BRIEF</span><h2>What matters now.</h2></div><Zap size={19}/></div><div className="runway-brief-list"><div><span>FIRST PRIORITY</span><b>{runwayTasks[0]?.title||"Nothing urgent"}</b><small>{runwayTasks[0]?`${String(runwayTasks[0].priority||"medium")} · ${durationFor(runwayTasks[0])} min`:"You have room to plan."}</small></div><div><span>FOCUS WINDOW</span><b>{formatRunwayTime(0)} — {formatRunwayTime(Math.min(runwayPlannedMinutes,120))}</b><small>Protect the first meaningful block.</small></div><div><span>DECISION RULE</span><b>Finish before you add.</b><small>Keep a buffer for reality, interruptions and thinking.</small></div></div></article>
            <article className="tracker-large-card"><div className="panel-heading"><div><span className="card-kicker">CAPACITY CHECK</span><h2>Don't overbook the day.</h2></div><Clock3 size={19}/></div><div className="runway-capacity-ring" style={{"--runway-pct":`${Math.min(100,runwayPlannedMinutes/runwayCapacityMinutes*100)}%`}}><div><strong>{Math.round(runwayPlannedMinutes/runwayCapacityMinutes*100)}%</strong><span>allocated</span></div></div><p className="tracker-copy">{runwayOverflowTasks.length?`You have ${runwayOverflowTasks.length} task${runwayOverflowTasks.length>1?"s":""} outside today's realistic capacity. Move lower-value work instead of extending the day.`:"Your selected work fits inside your stated capacity. Keep the remaining time as a deliberate buffer."}</p></article>
          </aside>
        </div>
        {runwayOverflowTasks.length>0&&<article className="tracker-large-card runway-overflow"><div className="panel-heading"><div><span className="card-kicker">TRIAGE QUEUE</span><h2>These tasks need another plan.</h2></div><Bell size={19}/></div><div className="runway-overflow-list">{runwayOverflowTasks.map(t=><div key={t.id}><div><b>{t.title}</b><small>{String(t.priority||"medium")} · {durationFor(t)} min · {t.task_date}</small></div><button className="ghost-small" onClick={()=>setTab("planner")}>Reschedule <ArrowRight size={14}/></button></div>)}</div></article>}
      </section>}
      {tab==="productivity"&&<section className="productivity-engine">
        <div className="productivity-hero">
          <div><span className="eyebrow"><span></span> EXECUTION SYSTEM · 4.2.0</span><h2>Turn goals into <em>finished work.</em></h2><p>Projects, priorities, dependencies, recurring work and time capacity — one engine for deciding what deserves your attention.</p></div>
          <div className="productivity-hero-score"><span>CAPACITY TODAY</span><strong>{Math.max(0,Math.round((engineCapacityMinutes-enginePlannedMinutes)/60*10)/10)}h</strong><small>{Math.round(enginePlannedMinutes/60*10)/10}h planned · {capacityHours}h capacity</small></div>
        </div>
        <article className="productivity-streak-card" onClick={()=>setShowStudySummary(true)} role="button" tabIndex="0" onKeyDown={e=>{if(e.key==="Enter"||e.key===" ")setShowStudySummary(true);}}>
          <div className="streak-card-main"><div className="productivity-streak-mark"><Flame size={22}/></div><div><span className="card-kicker">STUDY STREAK</span><h3>{currentStudyStreak}<small> days</small></h3><p>{currentStudyStreak ? "Your consistency is building momentum." : "Start a study record today to begin your streak."}</p></div></div>
          <div className="streak-week" aria-label="Last 7 days study activity">{streakLast7.map(day=><div key={day.key} className={day.active?"active":""}><span>{day.active?"✓":""}</span><small>{day.label}</small></div>)}</div>
          <div className="streak-card-stat"><span>BEST</span><strong>{bestStudyStreak}d</strong></div><div className="streak-card-action"><span>View full study summary</span><ArrowRight size={18}/></div>
        </article>
        <div className="productivity-kpis"><article><span>OPEN WORK</span><strong>{tasks.filter(t=>t.status!=="completed").length}</strong><small>tasks in your system</small></article><article><span>TODAY'S LOAD</span><strong>{Math.min(999,Math.round(enginePlannedMinutes/60*10)/10)}h</strong><small>{Math.round(enginePlannedMinutes/engineCapacityMinutes*100)}% of capacity</small></article><article><span>OVERDUE</span><strong className={engineOverdue?"negative":"positive"}>{engineOverdue}</strong><small>{engineOverdue?"needs triage":"runway is clear"}</small></article><article><span>PROJECTS</span><strong>{projects.length}</strong><small>active workstreams</small></article></div>
        <div className="productivity-grid">
          <article className="tracker-large-card productivity-queue-card"><div className="panel-heading"><div><span className="card-kicker">SMART QUEUE</span><h2>Do this next.</h2></div><Sparkles size={20}/></div><p className="tracker-copy">Priority, due date and blockers shape this queue. Finish blocked work only after its prerequisite is complete.</p><div className="engine-queue">{engineTasks.filter(t=>t.status!=="completed").slice(0,8).map((t,i)=><div className={`engine-task-row ${isBlocked(t)?"blocked":""}`} key={t.id}><span className="engine-rank">{i+1}</span><div className="engine-task-main"><b>{t.title}</b><small>{String(t.priority||"medium").toUpperCase()} · {durationFor(t)} min · {t.task_date||"No date"}{t.goal_id ? ` · Goal · ${goals.find(g => String(g.id) === String(t.goal_id))?.title || "Linked goal"}` : ""}{isBlocked(t)?" · BLOCKED":""}</small></div><div className="engine-task-controls"><select value={getMeta(t.id).duration} onChange={e=>updateTaskMeta(t,{duration:Number(e.target.value)})}><option value="15">15m</option><option value="30">30m</option><option value="45">45m</option><option value="60">1h</option><option value="90">1h 30m</option><option value="120">2h</option></select><select value={getMeta(t.id).projectId} onChange={e=>updateTaskMeta(t,{projectId:e.target.value})}><option value="">No project</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>{getMeta(t.id).recurrence!=="none"&&<button className="ghost-small" onClick={()=>generateRecurring(t)} title="Create next occurrence"><ArrowRight size={14}/></button>}</div></div>)}{!engineTasks.filter(t=>t.status!=="completed").length&&<div className="tracker-empty-big"><CheckCircle2 size={28}/><h3>Execution runway is clear.</h3><p>No open work needs your attention.</p></div>}</div></article>
          <article className="tracker-large-card engine-capacity-card"><div className="panel-heading"><div><span className="card-kicker">TIME CAPACITY</span><h2>Don't overbook yourself.</h2></div><Clock3 size={20}/></div><label className="engine-capacity-input"><span>Daily capacity</span><div><input type="number" min="1" max="24" step="0.5" value={capacityHours} onChange={e=>setCapacityHours(Math.max(1,Number(e.target.value)||1))}/><b>hours</b></div></label><div className="capacity-meter"><i style={{width:`${Math.min(100,enginePlannedMinutes/engineCapacityMinutes*100)}%`}}/></div><div className="capacity-stats"><span><b>{Math.round(enginePlannedMinutes/60*10)/10}h</b> planned</span><span><b>{Math.max(0,Math.round((engineCapacityMinutes-enginePlannedMinutes)/60*10)/10)}h</b> available</span></div><div className="engine-alert">{enginePlannedMinutes>engineCapacityMinutes?<><Bell size={16}/><span>Your plan exceeds today's capacity. Move lower-value work.</span></>:<><Check size={16}/><span>Your planned workload fits inside your stated capacity.</span></>}</div></article>
        </div>
        <div className="productivity-grid lower">
          <article className="tracker-large-card"><div className="panel-heading"><div><span className="card-kicker">CREATE WORK</span><h2>Capture the whole task.</h2></div><Plus size={20}/></div><div className="engine-form-grid"><input value={engineTaskTitle} onChange={e=>setEngineTaskTitle(e.target.value)} placeholder="Task that needs to get done…"/><input type="date" value={engineTaskDate} onChange={e=>setEngineTaskDate(e.target.value)}/><select value={engineTaskPriority} onChange={e=>setEngineTaskPriority(e.target.value)}><option value="urgent">Urgent</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select><select value={engineTaskDuration} onChange={e=>setEngineTaskDuration(Number(e.target.value))}><option value="15">15 min</option><option value="30">30 min</option><option value="45">45 min</option><option value="60">1 hour</option><option value="90">90 min</option><option value="120">2 hours</option></select><select value={engineTaskProject} onChange={e=>setEngineTaskProject(e.target.value)}><option value="">No project</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select><select value={engineTaskRecurrence} onChange={e=>setEngineTaskRecurrence(e.target.value)}><option value="none">One-time</option><option value="daily">Every day</option><option value="weekly">Every week</option><option value="monthly">Every month</option></select><select value={engineTaskDependency} onChange={e=>setEngineTaskDependency(e.target.value)}><option value="">No dependency</option>{tasks.filter(t=>t.status!=="completed").slice(0,30).map(t=><option key={t.id} value={t.id}>After: {t.title}</option>)}</select><select value={engineTaskGoal} onChange={e=>setEngineTaskGoal(e.target.value)}><option value="">No goal (optional)</option>{goals.filter(g=>g.status==="active").map(g=><option key={g.id} value={g.id}>{g.title}</option>)}</select><button className="primary-small" onClick={createEngineTask}><Plus size={15}/> Create task</button></div></article>
          <article className="tracker-large-card"><div className="panel-heading"><div><span className="card-kicker">PROJECTS</span><h2>Workstreams with a finish line.</h2></div><BriefcaseBusiness size={20}/></div><div className="engine-project-create"><input value={projectName} onChange={e=>setProjectName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addProject()} placeholder="New project name…"/><button className="primary-small project-add-button" onClick={addProject}><Plus size={15}/> Project</button></div><div className="engine-project-list">{engineProjects.map(p=><div key={p.id}><div><b>{p.name}</b><small>{p.completed}/{p.items.length} tasks complete</small></div><strong>{p.progress}%</strong><i><em style={{width:`${p.progress}%`}}/></i></div>)}{!projects.length&&<div className="tracker-empty-big"><BriefcaseBusiness size={26}/><h3>Create your first workstream.</h3><p>Projects group tasks into a measurable outcome.</p></div>}</div></article>
        </div>
        <article className="tracker-large-card engine-rules-card"><div className="panel-heading"><div><span className="card-kicker">OPERATING RULES</span><h2>How TRACKEN decides what matters.</h2></div><ShieldCheck size={20}/></div><div className="engine-rule-grid"><span><b>01 · PRIORITY</b><small>Urgent and high-impact work rises first.</small></span><span><b>02 · DEADLINE</b><small>Older and overdue work gains urgency.</small></span><span><b>03 · BLOCKERS</b><small>Dependencies prevent false completion.</small></span><span><b>04 · CAPACITY</b><small>Planned minutes are compared with available time.</small></span></div></article>
        <ProductivityCalendar tasks={tasks} />
      </section>}
      {tab==="planner"&&<section className="planner-engine">
        <div className="planner-toolbar"><button className="ghost-small" onClick={()=>{const d=new Date(plannerDate+"T12:00:00");d.setDate(d.getDate()-1);setPlannerDate(d.toISOString().slice(0,10));}}><ArrowLeft size={15}/> Previous</button><div><span className="card-kicker">DAILY PLAN</span><h2>{new Date(plannerDate+"T12:00:00").toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</h2></div><div className="planner-toolbar-actions"><button className="ghost-small" onClick={()=>setPlannerDate(new Date().toISOString().slice(0,10))}>Today</button><button className="ghost-small" onClick={()=>{const d=new Date(plannerDate+"T12:00:00");d.setDate(d.getDate()+1);setPlannerDate(d.toISOString().slice(0,10));}}>Next <ArrowRight size={15}/></button></div></div>
        <div className="planner-kpis"><article className="planner-kpi-main"><span>PLANNING SCORE</span><strong>{Math.min(100,planningScore)}</strong><p>{plannerDone} of {plannerTasks.length} planned tasks complete</p><div className="tracker-progress"><i style={{width:`${Math.min(100,planningScore)}%`}}/></div></article><article><span>OPEN PRIORITIES</span><strong>{priorityOpen}</strong><small>High-impact work needing attention</small></article><article><span>7-DAY QUEUE</span><strong>{upcomingTasks.filter(t=>t.status!=="completed").length}</strong><small>Open tasks across the next week</small></article></div>
        <div className="planner-grid">
          <article className="tracker-large-card"><div className="panel-heading"><div><span className="card-kicker">TODAY'S RUNWAY</span><h2>Plan the work, then execute.</h2></div><CalendarDays size={20}/></div>{plannerTasks.length?<div className="planner-task-list">{plannerTasks.map(t=><div className="planner-task-row" key={t.id}><span className={`tracker-status-dot ${t.status}`}></span><div><b>{t.title}</b><small>{t.priority||"medium"}{t.goal_id?` · Goal · ${goals.find(g=>String(g.id)===String(t.goal_id))?.title||"Linked goal"}`:""}</small></div><select value={t.task_date} disabled={movingTaskId===t.id} onChange={e=>moveTask(t,e.target.value)}><option value={t.task_date}>Today</option>{nextSevenDays.filter(d=>d!==t.task_date).map(d=><option key={d} value={d}>{new Date(d+"T12:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}</option>)}</select></div>)}</div>:<div className="tracker-empty-big"><CalendarDays size={28}/><h3>No work planned.</h3><p>Your day is open. Add tasks from the Tasks tracker and they will appear here automatically.</p></div>}</article>
          <article className="tracker-large-card"><div className="panel-heading"><div><span className="card-kicker">GOAL RADAR</span><h2>Is your effort on schedule?</h2></div><Target size={20}/></div><div className="planner-goal-list">{goals.filter(g=>g.status==="active").slice(0,5).map(g=>{const progress=g.target_value>0?Math.min(100,Math.round(Number(g.current_value||0)/Number(g.target_value)*100)):0; const daysLeft=g.target_date?Math.ceil((new Date(`${g.target_date}T12:00:00`)-new Date())/86400000):null; const risk=daysLeft!==null&&daysLeft<30&&progress<70; return <div key={g.id}><div><b>{g.title}</b><span>{risk?"At risk":daysLeft===null?"No deadline":`${Math.max(0,daysLeft)} days left`}</span></div><i><em style={{width:`${progress}%`}}/></i><small>{progress}% complete</small></div>})}{!goals.filter(g=>g.status==="active").length&&<div className="tracker-empty-big"><Target size={25}/><h3>No active goals.</h3><p>Create a goal to give your plan a destination.</p></div>}</div></article>
        </div>
        <article className="tracker-large-card planner-week-card"><div className="panel-heading"><div><span className="card-kicker">NEXT 7 DAYS</span><h2>Upcoming workload</h2></div><ListChecks size={20}/></div><div className="planner-week-grid">{nextSevenDays.map(d=>{const dayTasks=tasks.filter(t=>t.task_date===d); const doneDay=dayTasks.filter(t=>t.status==="completed").length; return <button key={d} className={plannerDate===d?"selected":""} onClick={()=>setPlannerDate(d)}><span>{new Date(d+"T12:00:00").toLocaleDateString("en-US",{weekday:"short"})}</span><b>{new Date(d+"T12:00:00").getDate()}</b><small>{doneDay}/{dayTasks.length||0}</small></button>})}</div></article>
      </section>}
      {tab==="tasks"&&<section className="task-work-layout">
        <article className="tracker-hero-card task-work-summary"><div><span>TODAY'S WORK</span><strong>{todayTasks.length}</strong><p>{done} completed · {todayTasks.length-done} remaining</p></div><div className="task-summary-progress"><span>{todayTasks.length?Math.round(done/todayTasks.length*100):0}% complete</span><div className="tracker-progress"><i style={{width:`${todayTasks.length?done/todayTasks.length*100:0}%`}}/></div></div></article>
        <article className="tracker-large-card task-capture-card"><div className="panel-heading"><div><span className="card-kicker">QUICK CAPTURE</span><h2>Add a task here.</h2><p className="tracker-copy">Capture work without leaving the task system.</p></div><Plus size={20}/></div><div className="task-quick-add"><input value={taskQuickTitle} onChange={e=>setTaskQuickTitle(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addQuickTask()} placeholder="What needs to get done?"/><select value={taskQuickPriority} onChange={e=>setTaskQuickPriority(e.target.value)}><option value="urgent">Urgent</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select><input type="date" value={taskQuickDate} onChange={e=>setTaskQuickDate(e.target.value)}/><select value={taskQuickGoal} onChange={e=>setTaskQuickGoal(e.target.value)}><option value="">No goal (optional)</option>{goals.filter(g=>g.status==="active").map(g=><option key={g.id} value={g.id}>{g.title}</option>)}</select><button className="primary-small task-add-button" onClick={addQuickTask}><Plus size={15}/> Add task</button></div><div className="panel-heading task-queue-heading"><div><span className="card-kicker">PRIORITY QUEUE</span><h2>What needs your attention</h2></div><ListChecks size={20}/></div>{todayTasks.length?<div className="tracker-task-table">{todayTasks.slice(0,12).map(t=>editingTaskId===t.id?<div className="tracker-task-row tracker-task-row-edit" key={t.id}><span className={`tracker-status-dot ${t.status}`}></span><input className="task-inline-title" value={taskEdit.title} onChange={e=>setTaskEdit({...taskEdit,title:e.target.value})}/><select value={taskEdit.priority} onChange={e=>setTaskEdit({...taskEdit,priority:e.target.value})}><option value="urgent">Urgent</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select><input type="date" value={taskEdit.task_date} onChange={e=>setTaskEdit({...taskEdit,task_date:e.target.value})}/><select value={taskEdit.goal_id} onChange={e=>setTaskEdit({...taskEdit,goal_id:e.target.value})}><option value="">No goal</option>{goals.filter(g=>g.status==="active").map(g=><option key={g.id} value={g.id}>{g.title}</option>)}</select><div className="task-row-actions"><button className="primary-small task-save-button" onClick={saveTaskEdit}>Save changes</button><button className="ghost-small" onClick={cancelEditTask}>Cancel</button></div></div>:<div className="tracker-task-row" key={t.id}><button className={`task-check-button ${t.status==="completed"?"done":""}`} onClick={()=>toggleTask?.(t)} aria-label={t.status==="completed"?"Mark task open":"Mark task complete"}>{t.status==="completed"?<Check size={12}/>:null}</button><div className="task-row-main"><b className={t.status==="completed"?"task-completed-title":""}>{t.title}</b><small>{String(t.priority||"medium")} · Due {t.task_date||"No date"}{t.goal_id?` · Goal · ${goals.find(g=>String(g.id)===String(t.goal_id))?.title||"Linked goal"}`:""}</small></div><span className="task-status-label">{t.status==="completed"?"Completed":"Open"}</span><div className="task-row-actions"><button className="task-edit-button" onClick={()=>startEditTask(t)} aria-label={`Edit ${t.title}`} title="Edit task"><PenLine size={15}/></button><button className="task-edit-button task-delete-inline" onClick={()=>deleteTask?.(t)} aria-label={`Delete ${t.title}`} title="Delete task"><Trash2 size={15}/></button></div></div>)}</div>:<div className="tracker-empty-big"><ListChecks size={28}/><h3>Your queue is clear.</h3><p>Add a task above to build today's runway.</p></div>}</article>
                  <article className="tracker-large-card automation-center-card"><div className="panel-heading"><div><span className="card-kicker">AUTOMATION CENTER · 01</span><h2>Recurring tasks.</h2><p className="tracker-copy">Create a rule once. TRACKEN keeps the planned work appearing on schedule.</p></div><RotateCcw size={20}/></div><div className="automation-form-grid"><input value={automationTitle} onChange={e=>setAutomationTitle(e.target.value)} placeholder="What should repeat?"/><select value={automationFrequency} onChange={e=>setAutomationFrequency(e.target.value)}><option value="daily">Every day</option><option value="weekdays">Every weekday</option><option value="weekly">Every week</option><option value="monthly">Every month</option></select><input type="date" value={automationStartDate} onChange={e=>setAutomationStartDate(e.target.value)}/><input type="date" value={automationEndDate} onChange={e=>setAutomationEndDate(e.target.value)} title="Optional end date"/><select value={automationPriority} onChange={e=>setAutomationPriority(e.target.value)}><option value="urgent">Urgent</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select><select value={automationDuration} onChange={e=>setAutomationDuration(Number(e.target.value))}><option value="15">15 min</option><option value="30">30 min</option><option value="45">45 min</option><option value="60">1 hour</option><option value="90">90 min</option><option value="120">2 hours</option></select><select value={automationProject} onChange={e=>setAutomationProject(e.target.value)}><option value="">No project</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select><select value={automationGoal} onChange={e=>setAutomationGoal(e.target.value)}><option value="">No goal (optional)</option>{goals.filter(g=>g.status==="active").map(g=><option key={g.id} value={g.id}>{g.title}</option>)}</select><button className="primary-small" onClick={createRecurringAutomation}><RotateCcw size={15}/> Create automation</button></div><div className="automation-list">{recurringRules.map(rule=><div className={`automation-rule ${rule.enabled?"active":"paused"}`} key={rule.id}><div className="automation-rule-icon"><RotateCcw size={16}/></div><div className="automation-rule-main"><b>{rule.title}</b><small>{recurrenceLabel(rule.frequency)} · starts {rule.startDate}{rule.endDate?` · ends ${rule.endDate}`:""}{rule.goalId?` · Goal · ${goals.find(g=>String(g.id)===String(rule.goalId))?.title||"Linked goal"}`:""}</small></div><span className="automation-status">{rule.enabled?"ACTIVE":"PAUSED"}</span><button className="ghost-small" onClick={()=>toggleRecurringAutomation(rule.id)}>{rule.enabled?"Pause":"Resume"}</button><button className="ghost-small danger-ghost" onClick={()=>deleteRecurringAutomation(rule.id)}><Trash2 size={14}/></button></div>)}{!recurringRules.length&&<div className="automation-empty"><RotateCcw size={22}/><div><b>No recurring task rules yet.</b><small>Create one above and TRACKEN will handle the repetition.</small></div></div>}</div></article>
      </section>}
      {tab==="goals"&&<section className="goals-route-shell"><GoalsPage session={session} goals={goals} setGoals={setGoals} tasks={tasks} taskMeta={taskMeta} setTaskMeta={setTaskMeta} theme={theme} toggleTheme={toggleTheme} onBack={onBack} onError={(message)=>window.alert(message)} /></section>}
      {tab==="habits"&&<section className="tracker-content-grid habits-workspace"><article className="tracker-large-card"><div className="panel-heading"><div><span className="card-kicker">CONSISTENCY ENGINE</span><h2>Build habits by showing up.</h2><p className="tracker-copy">Set a habit for a defined duration and choose exactly when it should be practiced. TRACKEN keeps rest days separate from missed days.</p></div><Flame size={20}/></div><div className="habit-control-bar"><div><strong>{habits.length}</strong><span>habits in your system</span></div><button className="tracker-big-action compact" onClick={openNewHabit}><Plus size={16}/> New habit</button></div>{showHabitForm&&<div className="habit-form-card"><div className="habit-form-head"><div><span className="card-kicker">{editingHabitId?"EDIT HABIT":"NEW HABIT"}</span><h3>{editingHabitId?"Refine your routine.":"What are you building?"}</h3></div><button className="icon-button" onClick={()=>setShowHabitForm(false)} aria-label="Close">×</button></div><div className="habit-form-grid"><label>Habit name<input value={habitForm.title} onChange={e=>setHabitForm({...habitForm,title:e.target.value})} placeholder="e.g. Read 20 pages"/></label><label>Start date<input type="date" value={habitForm.startDate} onChange={e=>setHabitForm({...habitForm,startDate:e.target.value})}/></label><label>Duration (days)<input type="number" min="1" max="365" value={habitForm.durationDays} onChange={e=>setHabitForm({...habitForm,durationDays:e.target.value})}/></label><label>Schedule<select value={habitForm.scheduleType} onChange={e=>setHabitForm({...habitForm,scheduleType:e.target.value})}><option value="daily">Every day</option><option value="weekdays">Weekdays</option><option value="custom">Custom days</option></select></label></div>{habitForm.scheduleType==="custom"&&<div className="habit-schedule-days"><span>Repeat on</span><div>{[[1,"Mon"],[2,"Tue"],[3,"Wed"],[4,"Thu"],[5,"Fri"],[6,"Sat"],[0,"Sun"]].map(([value,label])=>{const selected=(habitForm.scheduleDays||[]).includes(value);return <button key={value} type="button" className={selected?"selected":""} onClick={()=>setHabitForm(f=>({...f,scheduleDays:selected?(f.scheduleDays||[]).filter(d=>d!==value):[...(f.scheduleDays||[]),value]}))}>{label}</button>})}</div><small>Select at least one day. Rest days stay visible but cannot be marked complete.</small></div>}<div className="habit-form-actions"><button className="ghost-small" onClick={()=>setShowHabitForm(false)}>Cancel</button><button className="primary-small" onClick={saveHabit}>{editingHabitId?"Save changes":"Create habit"}</button></div></div>}<div className="habit-system-list">{habits.length ? habits.map(renderHabitCard) : <div className="tracker-empty-big"><Flame size={28}/><h3>Start your first habit.</h3><p>Choose a habit, give it a duration, and manually check each day you complete it.</p><button className="tracker-big-action compact" onClick={openNewHabit}><Plus size={16}/> Create your first habit</button></div>}</div></article></section>}
      {tab==="focus"&&<section className="tracker-focus-page">
        <div className="focus-page-hero">
          <div><span className="eyebrow"><span></span> FOCUS / DEEP WORK</span><h2>Make time feel <em>intentional.</em></h2><p>Choose a rhythm, protect the block, and let TRACKEN turn focused time into visible progress.</p></div>
          <div className="focus-live-badge"><i></i><span>{focusRunning?"SESSION RUNNING":"READY FOR FOCUS"}</span></div>
        </div>
        <div className="focus-cockpit-grid">
          <article className="focus-command-card focus-command-card-premium">
            <div className="focus-command-top"><span>FOCUS TIMER</span><small>{focusRunning?"IN SESSION":"YOUR NEXT BLOCK"}</small></div>
            <div className="focus-timer-orbit" style={{"--focus-pct":`${Math.max(0,Math.min(100,Math.round((1-(focusSeconds/(Math.max(1,focusPreset*60))))*100)))}%`}}><div className="focus-orbit-inner"><span>{focusRunning?"FOCUSING":"READY"}</span><strong>{formatFocus(focusSeconds)}</strong><small>{focusPreset} minute block</small></div></div>
            <div className="focus-presets focus-presets-premium">{[15,25,50,90].map(p=><button className={focusPreset===p?"selected":""} key={p} onClick={()=>{setFocusPreset(p);setFocusSeconds(p*60);setFocusRunning(false)}}>{p}<small>min</small></button>)}</div>
            <div className="focus-actions focus-actions-premium"><button className="primary-small" onClick={()=>setFocusRunning(v=>!v)}>{focusRunning?<><span>Pause session</span></>:<><Timer size={15}/><span>Start focus</span></>}</button><button className="ghost-small" onClick={()=>{setFocusRunning(false);setFocusSeconds(focusPreset*60)}}>Reset</button></div>
          </article>
          <div className="focus-insight-stack">
            <article className="tracker-large-card focus-intent-card"><div className="panel-heading"><div><span className="card-kicker">FOCUS INTENT</span><h2>One block. One outcome.</h2></div><Target size={20}/></div><div className="focus-intent-main"><div className="focus-intent-icon"><Zap size={18}/></div><div><strong>{tasks.find(t=>t.status!=="completed" && t.task_date===new Date().toISOString().slice(0,10))?.title || "Choose the one task that matters most."}</strong><small>{todayTasks.length?`${todayTasks.filter(t=>t.status!=="completed").length} open task${todayTasks.filter(t=>t.status!=="completed").length===1?"":"s"} today` : "Your queue is clear — use this block for deep work."}</small></div></div><div className="focus-principles"><span><Check size={14}/> Silence notifications</span><span><Check size={14}/> Keep one outcome visible</span><span><Check size={14}/> Review after the block</span></div></article>
            <article className="tracker-large-card focus-stats-card"><div className="panel-heading"><div><span className="card-kicker">TODAY / TIME CAPTURE</span><h2>Your time, accounted for.</h2></div><Clock3 size={20}/></div><div className="focus-time-hero"><div><strong>{formatTime(trackedSeconds)}</strong><span>{timeRunning?"Time tracker is running":"Tracked today"}</span></div><button className={`tracker-big-action compact ${timeRunning?"running":""}`} onClick={()=>setTimeRunning(v=>!v)}>{timeRunning?"Stop tracking":trackedSeconds>0?"Resume tracking":"Start tracking"}</button></div><div className="focus-stat-strip"><div><b>{Math.floor(trackedSeconds/3600)}h</b><span>captured</span></div><div><b>{Math.floor(trackedSeconds/60)%60}m</b><span>this session</span></div><div><b>{focusRunning?"Live":"Ready"}</b><span>timer state</span></div></div></article>
          </div>
        </div>
        <div className="focus-bottom-grid">
          <article className="tracker-large-card focus-rhythm-card"><div className="panel-heading"><div><span className="card-kicker">FOCUS RHYTHMS</span><h2>Pick the kind of session you need.</h2></div><Timer size={20}/></div><div className="focus-rhythm-grid"><button onClick={()=>{setFocusPreset(15);setFocusSeconds(15*60);setFocusRunning(false)}}><span>QUICK START</span><strong>15 min</strong><small>Clear one small blocker.</small></button><button onClick={()=>{setFocusPreset(25);setFocusSeconds(25*60);setFocusRunning(false)}}><span>CLASSIC</span><strong>25 min</strong><small>Focused work with a clean finish line.</small></button><button onClick={()=>{setFocusPreset(50);setFocusSeconds(50*60);setFocusRunning(false)}}><span>DEEP BLOCK</span><strong>50 min</strong><small>Best for study, coding or writing.</small></button><button onClick={()=>{setFocusPreset(90);setFocusSeconds(90*60);setFocusRunning(false)}}><span>FLOW</span><strong>90 min</strong><small>Long-form work with room to think.</small></button></div></article>
          <article className="tracker-large-card focus-bottom-insight"><div className="panel-heading"><div><span className="card-kicker">THE FOCUS LOOP</span><h2>Start → protect → review.</h2></div><Sparkles size={20}/></div><div className="focus-loop"><div><b>01</b><span>START</span><small>Pick one outcome.</small></div><i></i><div><b>02</b><span>PROTECT</span><small>Stay inside the block.</small></div><i></i><div><b>03</b><span>REVIEW</span><small>Carry the result forward.</small></div></div><p className="tracker-copy">Focused time becomes more valuable when it leaves evidence behind. Your sessions can feed the wider TRACKEN picture instead of disappearing when the timer ends.</p></article>
        </div>
      </section>}
      {((tab==="money")||(tab==="budget"))&&<FinanceEngine tab={tab} money={money} setMoney={setMoney} budget={budget} setBudget={setBudget} budgetOverride={budgetOverride} setBudgetOverride={setBudgetOverride} budgetCategories={budgetCategories} setBudgetCategories={setBudgetCategories} cashflowAutomationRules={cashflowAutomationRules} cashflowFrequencyLabel={cashflowFrequencyLabel} createCashflowAutomation={createCashflowAutomation} toggleCashflowAutomation={toggleCashflowAutomation} deleteCashflowAutomation={deleteCashflowAutomation} cashflowAutomationTitle={cashflowAutomationTitle} setCashflowAutomationTitle={setCashflowAutomationTitle} cashflowAutomationType={cashflowAutomationType} setCashflowAutomationType={setCashflowAutomationType} cashflowAutomationAmount={cashflowAutomationAmount} setCashflowAutomationAmount={setCashflowAutomationAmount} cashflowAutomationCategory={cashflowAutomationCategory} setCashflowAutomationCategory={setCashflowAutomationCategory} cashflowAutomationFrequency={cashflowAutomationFrequency} setCashflowAutomationFrequency={setCashflowAutomationFrequency} cashflowAutomationStartDate={cashflowAutomationStartDate} setCashflowAutomationStartDate={setCashflowAutomationStartDate} cashflowAutomationEndDate={cashflowAutomationEndDate} setCashflowAutomationEndDate={setCashflowAutomationEndDate} goals={goals} setGoals={setGoals} financeGoalPlans={financeGoalPlans} setFinanceGoalPlans={setFinanceGoalPlans} financeGoals={financeGoals} setFinanceGoals={setFinanceGoals} onGoalContribution={addFinanceGoalContribution} createFinanceGoal={createFinanceGoal} session={session} />}
      {tab==="investments"&&<section className="tracker-money finance-wealth-page"><div className="money-kpis"><article><span>PORTFOLIO VALUE</span><strong>₹{portfolio.toLocaleString("en-IN")}</strong></article><article><span>INVESTED CAPITAL</span><strong>₹{invested.toLocaleString("en-IN")}</strong></article><article><span>GAIN / LOSS</span><strong className={portfolio-invested>=0?"positive":"negative"}>{portfolio-invested>=0?"+":"−"}₹{Math.abs(portfolio-invested).toLocaleString("en-IN")}</strong></article><article><span>RETURN</span><strong>{invested>0?`${((portfolio-invested)/invested*100).toFixed(1)}%`:"—"}</strong></article></div><article className="tracker-large-card"><div className="panel-heading"><div><span className="card-kicker">INVESTMENT PORTFOLIO</span><h2>Understand every holding.</h2><p className="tracker-copy">Track invested capital, current value, profit or loss and portfolio weight.</p></div><BriefcaseBusiness size={20}/></div><div className="tracker-add-row money-add"><input value={holding.name} onChange={e=>setHolding({...holding,name:e.target.value})} placeholder="Asset / fund name"/><input type="number" value={holding.invested} onChange={e=>setHolding({...holding,invested:e.target.value})} placeholder="Invested capital"/><input type="number" value={holding.value} onChange={e=>setHolding({...holding,value:e.target.value})} placeholder="Current value"/><button onClick={addInvestment}><Plus size={16}/> Add holding</button></div><div className="investment-table-wrap"><table className="investment-table"><thead><tr><th>Holding</th><th>Invested</th><th>Current</th><th>Gain / Loss</th><th>Return</th><th>Weight</th><th></th></tr></thead><tbody>{investments.map(x=>{const gain=Number(x.value||0)-Number(x.invested||0);const ret=Number(x.invested||0)>0?gain/Number(x.invested)*100:0;const weight=portfolio>0?Number(x.value||0)/portfolio*100:0;return editingInvestmentId===x.id?<tr key={x.id}><td><input value={investmentEdit.name} onChange={e=>setInvestmentEdit({...investmentEdit,name:e.target.value})}/></td><td><input type="number" value={investmentEdit.invested} onChange={e=>setInvestmentEdit({...investmentEdit,invested:e.target.value})}/></td><td><input type="number" value={investmentEdit.value} onChange={e=>setInvestmentEdit({...investmentEdit,value:e.target.value})}/></td><td colSpan="3">Edit holding details</td><td><button className="primary-small" onClick={saveInvestmentEdit}>Save</button><button className="ghost-small" onClick={()=>setEditingInvestmentId(null)}>Cancel</button></td></tr>:<tr key={x.id}><td><b>{x.name}</b></td><td>{fmtIN(x.invested)}</td><td>{fmtIN(x.value)}</td><td className={gain>=0?"positive":"negative"}>{gain>=0?"+":"−"}{fmtIN(Math.abs(gain))}</td><td className={gain>=0?"positive":"negative"}>{ret.toFixed(1)}%</td><td>{weight.toFixed(1)}%</td><td><div className="row-actions"><button onClick={()=>startEditInvestment(x)} aria-label="Edit investment"><PenLine size={15}/></button><button onClick={()=>deleteInvestment(x.id)} aria-label="Delete investment"><Trash2 size={15}/></button></div></td></tr>})}</tbody></table></div>{!investments.length&&<div className="tracker-empty-big"><BriefcaseBusiness size={28}/><h3>Your portfolio is empty.</h3><p>Add holdings to see detailed performance.</p></div>}</article><div className="finance-wealth-grid"><article className="tracker-large-card"><PanelHead kicker="ALLOCATION" title="Portfolio mix" icon={<PieChart size={20}/>}/>{investments.length?investments.map(x=><div className="finance-bar-row" key={x.id}><div><span>{x.name}</span><b>{portfolio?`${(Number(x.value||0)/portfolio*100).toFixed(1)}%`:"0%"}</b></div><i><em style={{width:`${portfolio?clamp(Number(x.value||0)/portfolio*100,2,100):0}%`}}/></i></div>):<div className="finance-empty">Add holdings to build your allocation.</div>}</article><article className="tracker-large-card"><PanelHead kicker="PORTFOLIO INSIGHT" title="What your numbers say" icon={<Sparkles size={20}/>}/><p className="tracker-copy finance-readable-copy">{portfolio>=invested?`Your portfolio is currently ${fmtIN(portfolio-invested)} above invested capital.`:`Your portfolio is currently ${fmtIN(invested-portfolio)} below invested capital.`}</p><p className="tracker-copy">Use current value as the latest manual valuation. TRACKEN does not fetch live market prices yet.</p></article></div></section>}
      {tab==="networth"&&<section className="tracker-money finance-wealth-page"><div className="money-kpis"><article><span>NET WORTH</span><strong>₹{(portfolio+Math.max(0,moneyBalance)+assets.reduce((a,x)=>a+Number(x.value||0),0)-liabilities.reduce((a,x)=>a+Number(x.value||0),0)).toLocaleString("en-IN")}</strong></article><article><span>TOTAL ASSETS</span><strong>₹{(portfolio+Math.max(0,moneyBalance)+assets.reduce((a,x)=>a+Number(x.value||0),0)).toLocaleString("en-IN")}</strong></article><article><span>LIABILITIES</span><strong className="negative">₹{liabilities.reduce((a,x)=>a+Number(x.value||0),0).toLocaleString("en-IN")}</strong></article><article><span>LIQUID CASH</span><strong>₹{Math.max(0,moneyBalance).toLocaleString("en-IN")}</strong></article></div><article className="tracker-large-card"><div className="panel-heading"><div><span className="card-kicker">PERSONAL BALANCE SHEET</span><h2>Know what you own and owe.</h2><p className="tracker-copy">Keep investments, cash, other assets and outstanding liabilities together.</p></div><Landmark size={20}/></div><div className="tracker-add-row"><button onClick={addAsset}><Plus size={16}/> Add asset</button><button onClick={addLiability}><Plus size={16}/> Add liability</button></div><div className="tracker-stat-grid"><div><b>₹{portfolio.toLocaleString("en-IN")}</b><span>Investments</span></div><div><b>₹{Math.max(0,moneyBalance).toLocaleString("en-IN")}</b><span>Cash</span></div><div><b>{assets.length}</b><span>Other assets</span></div><div><b>{liabilities.length}</b><span>Liabilities</span></div></div><div className="balance-lists"><div><span>ASSETS</span>{assets.length?assets.map(x=>editingAssetId===x.id?<div className="wealth-edit-row" key={x.id}><input value={assetEdit.name} onChange={e=>setAssetEdit({...assetEdit,name:e.target.value})}/><input type="number" value={assetEdit.value} onChange={e=>setAssetEdit({...assetEdit,value:e.target.value})}/><button className="primary-small" onClick={saveAssetEdit}>Save</button><button className="ghost-small" onClick={()=>setEditingAssetId(null)}>Cancel</button></div>:<p key={x.id}><b>{x.name}</b><strong>{fmtIN(x.value)}</strong><span className="wealth-actions"><button onClick={()=>startEditAsset(x)} aria-label="Edit asset"><PenLine size={14}/></button><button onClick={()=>deleteAsset(x.id)} aria-label="Delete asset"><Trash2 size={14}/></button></span></p>):<p className="muted-row">No other assets added.</p>}</div><div><span>LIABILITIES</span>{liabilities.length?liabilities.map(x=>editingLiabilityId===x.id?<div className="wealth-edit-row" key={x.id}><input value={liabilityEdit.name} onChange={e=>setLiabilityEdit({...liabilityEdit,name:e.target.value})}/><input type="number" value={liabilityEdit.value} onChange={e=>setLiabilityEdit({...liabilityEdit,value:e.target.value})}/><button className="primary-small" onClick={saveLiabilityEdit}>Save</button><button className="ghost-small" onClick={()=>setEditingLiabilityId(null)}>Cancel</button></div>:<p key={x.id}><b>{x.name}</b><strong>{fmtIN(x.value)}</strong><span className="wealth-actions"><button onClick={()=>startEditLiability(x)} aria-label="Edit liability"><PenLine size={14}/></button><button onClick={()=>deleteLiability(x.id)} aria-label="Delete liability"><Trash2 size={14}/></button></span></p>):<p className="muted-row">No liabilities added.</p>}</div></div></article><div className="finance-wealth-grid"><article className="tracker-large-card"><PanelHead kicker="NET WORTH COMPOSITION" title="Where your wealth sits" icon={<CircleDollarSign size={20}/>}/><div className="finance-wealth-stat"><span>Investments</span><b>{fmtIN(portfolio)}</b></div><div className="finance-wealth-stat"><span>Cash</span><b>{fmtIN(Math.max(0,moneyBalance))}</b></div><div className="finance-wealth-stat"><span>Other assets</span><b>{fmtIN(assets.reduce((a,x)=>a+Number(x.value||0),0))}</b></div><div className="finance-wealth-stat"><span>Less liabilities</span><b className="negative">−{fmtIN(liabilities.reduce((a,x)=>a+Number(x.value||0),0))}</b></div></article><article className="tracker-large-card"><PanelHead kicker="NET WORTH INSIGHT" title="Your financial position" icon={<Sparkles size={20}/>}/><p className="tracker-copy finance-readable-copy">Net worth is calculated as investments + cash + other assets − liabilities.</p><p className="tracker-copy">Update asset and liability values whenever your latest balances change.</p></article></div></section>}
      {showStudySummary&&<StudySummaryModal history={history} onClose={()=>setShowStudySummary(false)} />}
      </main></div></div>;
}

function ProductivityCalendar({ tasks = [] }) {
  const [month, setMonth] = useState(() => new Date());
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const first = (start.getDay() + 6) % 7;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = [];
  for (let i=0;i<first;i++) cells.push(null);
  for (let d=1;d<=daysInMonth;d++) cells.push(new Date(month.getFullYear(), month.getMonth(), d));
  while(cells.length%7) cells.push(null);
  const taskCount={}; tasks.forEach(t=>{if(t.task_date) taskCount[t.task_date]=(taskCount[t.task_date]||0)+1;});
  const key=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  return <article className="tracker-large-card productivity-calendar-card"><div className="panel-heading"><div><span className="card-kicker">PRODUCTIVITY CALENDAR</span><h2>See your workload by day.</h2><p className="tracker-copy">Your planning calendar lives directly inside the Productivity Engine.</p></div><CalendarDays size={20}/></div><div className="productivity-calendar-toolbar"><button className="ghost-small" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))} aria-label="Previous month">‹</button><strong>{month.toLocaleDateString("en-US",{month:"long",year:"numeric"})}</strong><button className="ghost-small" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))} aria-label="Next month">›</button><button className="ghost-small" onClick={()=>setMonth(new Date())}>Today</button></div><div className="productivity-calendar-weekdays">{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d=><span key={d}>{d}</span>)}</div><div className="productivity-calendar-grid">{cells.map((date,i)=>date?<div key={i} className={date.toDateString()===new Date().toDateString()?"today":""}><span>{date.getDate()}</span>{taskCount[key(date)]?<b>{taskCount[key(date)]} task{taskCount[key(date)]===1?"":"s"}</b>:<small>No tasks</small>}</div>:<div className="blank" key={i}/>)}</div></article>;
}

function CalendarHistoryPage({ session, theme, toggleTheme, onBack }) {
  const userId = session.user.id;
  const [records, setRecords] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [userStates, setUserStates] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserDetail, setSelectedUserDetail] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [month, setMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const dateKey = (date) => {
    const y=date.getFullYear(), m=String(date.getMonth()+1).padStart(2,"0"), d=String(date.getDate()).padStart(2,"0");
    return `${y}-${m}-${d}`;
  };
  const fmt = (key) => new Date(`${key}T12:00:00`).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
  const selectedKey=dateKey(selectedDate);

  useEffect(() => {
    (async()=>{
      setLoading(true); setError("");
      const [r,t]=await Promise.all([
        supabase.from("daily_records").select("*").eq("user_id",userId).order("record_date",{ascending:false}),
        supabase.from("tasks").select("*").eq("user_id",userId)
      ]);
      if(r.error) setError(r.error.message);
      if(t.error) setError(t.error.message);
      setRecords(r.data||[]);
      setTasks(t.data||[]);
      setLoading(false);
    })();
  },[userId]);

  const recordMap=useMemo(()=>Object.fromEntries(records.map(r=>[r.record_date,r])),[records]);
  const taskMap=useMemo(()=>{
    const m={};
    tasks.forEach(t=>{
      (m[t.task_date] ||= {total:0,done:0});
      m[t.task_date].total++;
      if(t.status==="completed") m[t.task_date].done++;
    });
    return m;
  },[tasks]);

  const start=new Date(month.getFullYear(),month.getMonth(),1);
  const first=(start.getDay()+6)%7;
  const daysIn=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
  const cells=[];
  for(let i=0;i<first;i++) cells.push(null);
  for(let d=1;d<=daysIn;d++) cells.push(new Date(month.getFullYear(),month.getMonth(),d));
  while(cells.length%7) cells.push(null);

  const selectedRecord=recordMap[selectedKey];
  const selectedTask=taskMap[selectedKey] || {total:0,done:0};
  const selectedScore=selectedRecord?.daily_score || 0;
  const activeDays=records.filter(r=>(r.daily_score||0)>0).length;

  const history=records.slice().sort((a,b)=>b.record_date.localeCompare(a.record_date));

  const activityClass=(date)=>{
    if(!date) return "";
    const r=recordMap[dateKey(date)];
    if(!r) return "empty";
    const score=Number(r.daily_score||0);
    if(score>=80) return "high";
    if(score>=50) return "medium";
    return "low";
  };

  return (
    <div className="subpage-shell calendar-history-page">
      <header className="calendar-topbar">
        <div className="calendar-topbar-title">
          <span className="card-kicker">TRACKEN CALENDAR</span>
          <h1>Study calendar</h1>
          <p>Track your study rhythm, daily scores and saved records.</p>
        </div>
        <div className="calendar-top-actions">
          <button className="dashboard-theme-button theme-control" onClick={toggleTheme} aria-label="Toggle dark mode" title="Toggle dark mode">
            {theme==="light"?<Moon size={17}/>:<Sun size={17}/>}
            <span>{theme==="light"?"Dark mode":"Light mode"}</span>
          </button>
          <button className="secondary-cta compact-cta calendar-dashboard-button" onClick={onBack}>
            <LayoutDashboard size={16}/>
            <span>Dashboard</span>
            <ArrowRight size={16}/>
          </button>
        </div>
      </header>

      <main className="calendar-page-main">
        <div className="calendar-page-inner">
          <section className="calendar-hero">
            <div className="calendar-hero-copy">
              <span className="eyebrow"><span></span> CALENDAR · HISTORY</span>
              <h2>Your study <em>timeline.</em></h2>
              <p>See every study day, task completion and daily record in one place.</p>
            </div>
            <div className="history-overview-card">
              <div>
                <span>ACTIVE STUDY DAYS</span>
                <strong>{activeDays}</strong>
                <small>days with a recorded score</small>
              </div>
              <div className="overview-card-mark"><CalendarDays size={20}/></div>
            </div>
          </section>

          {error && <div className="dashboard-error">{error}</div>}

          <section className="calendar-history-grid">
            <article className="calendar-panel">
              <div className="calendar-panel-head">
                <div>
                  <span className="card-kicker">STUDY CALENDAR</span>
                  <h2>{month.toLocaleDateString("en-US",{month:"long",year:"numeric"})}</h2>
                </div>
                <div className="calendar-nav">
                  <button className="calendar-today-button" onClick={()=>{setMonth(new Date());setSelectedDate(new Date());}}>Today</button>
                  <button aria-label="Previous month" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))}>‹</button>
                  <button aria-label="Next month" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))}>›</button>
                </div>
              </div>
              <div className="calendar-weekdays">{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d=><span key={d}>{d}</span>)}</div>
              <div className="calendar-grid">
                {cells.map((date,i)=>{
                  if(!date) return <div className="calendar-cell blank" key={`b${i}`}/>;
                  const key=dateKey(date), r=recordMap[key], score=Number(r?.daily_score||0);
                  return <button key={key} className={`calendar-cell ${activityClass(date)} ${key===selectedKey?"selected":""}`} onClick={()=>setSelectedDate(date)}>
                    <span>{date.getDate()}</span>
                    {r && <b>{Math.round(score)}%</b>}
                    {taskMap[key]?.done ? <i>{taskMap[key].done}</i> : null}
                  </button>;
                })}
              </div>
              <div className="calendar-legend">
                <span><i className="legend-dot high"></i> Strong</span>
                <span><i className="legend-dot medium"></i> Active</span>
                <span><i className="legend-dot low"></i> Light</span>
                <span><i className="legend-dot empty"></i> No record</span>
              </div>
            </article>

            <article className="selected-day-panel">
              <div className="selected-day-head">
                <span className="card-kicker">SELECTED DAY</span>
                <h2>{selectedDate.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</h2>
                <strong>{selectedScore ? `${Math.round(selectedScore)}%` : "—"}</strong>
              </div>
              {selectedRecord ? (
                <div className="selected-stats">
                  <div><span>Study time</span><strong>{Math.floor((selectedRecord.lecture_minutes||0)/60)}h {(selectedRecord.lecture_minutes||0)%60}m</strong></div>
                  <div><span>Lectures</span><strong>{selectedRecord.lectures_watched||0}</strong></div>
                  <div><span>Questions</span><strong>{selectedRecord.questions_done||0}</strong></div>
                  <div><span>Pages</span><strong>{selectedRecord.pages_read||0}</strong></div>
                  <div><span>Exercise</span><strong>{selectedRecord.exercise_done ? "Completed" : "Not completed"}</strong></div>
                  <div><span>Tasks</span><strong>{selectedTask.done} / {selectedTask.total}</strong></div>
                </div>
              ) : (
                <div className="selected-empty">
                  <CalendarDays size={28}/>
                  <h3>No study record</h3>
                  <p>No daily record has been saved for this date yet.</p>
                </div>
              )}
            </article>
          </section>


          <section className="intelligence-grid">
            <article className="achievements-panel">
              <div className="intelligence-head">
                <div>
                  <span className="card-kicker">ACHIEVEMENTS</span>
                  <h2>Milestones you've earned.</h2>
                  <p>Automatically unlocked from your real study activity.</p>
                </div>
                <Trophy size={22} />
              </div>
              <div className="achievement-grid">
                {(() => {
                  const totalQuestions = records.reduce((a,r)=>a+Number(r.questions_done||0),0);
                  const totalPages = records.reduce((a,r)=>a+Number(r.pages_read||0),0);
                  const totalTasks = tasks.length;
                  const completedTasks = tasks.filter(t=>t.status==="completed").length;
                  const bestScore = Math.max(0,...records.map(r=>Number(r.daily_score||0)));
                  const days = new Set(records.filter(r=>Number(r.daily_score||0)>0).map(r=>r.record_date)).size;
                  const achievements = [
                    {icon:"✓", title:"First Step", text:"Save your first study record.", unlocked:records.length>0},
                    {icon:"🔥", title:"7-Day Warrior", text:"Build a 7-day study streak.", unlocked: (()=>{let run=0,max=0; const ds=new Set(records.map(r=>r.record_date)); const today=new Date(); for(let i=0;i<365;i++){const d=new Date(today);d.setDate(today.getDate()-i); if(ds.has(dateKey(d))) {run++;max=Math.max(max,run)} else run=0} return max>=7;})()},
                    {icon:"💯", title:"Century", text:"Solve 100 questions in one day.", unlocked:records.some(r=>Number(r.questions_done||0)>=100)},
                    {icon:"📚", title:"Bookworm", text:"Read 500 pages.", unlocked:totalPages>=500},
                    {icon:"⚡", title:"Momentum", text:"Maintain 14 consecutive study days.", unlocked:days>=14},
                    {icon:"🏆", title:"Perfect Day", text:"Score 100% on a study day.", unlocked:bestScore>=100},
                    {icon:"✓", title:"Task Finisher", text:"Complete your first task.", unlocked:completedTasks>0},
                    {icon:"🎯", title:"Committed", text:"Create your first goal.", unlocked:false}
                  ];
                  return achievements.map(a=>
                    <div className={`achievement-card ${a.unlocked?"unlocked":"locked"}`} key={a.title}>
                      <div className="achievement-icon">{a.unlocked ? a.icon : "🔒"}</div>
                      <div><strong>{a.title}</strong><span>{a.text}</span></div>
                      <small>{a.unlocked ? "UNLOCKED" : "LOCKED"}</small>
                    </div>
                  );
                })()}
              </div>
            </article>

            <article className="momentum-panel">
              <div className="intelligence-head">
                <div>
                  <span className="card-kicker">MOMENTUM INTELLIGENCE</span>
                  <h2>Your study momentum.</h2>
                  <p>TRACKEN reads your recent consistency and turns it into useful guidance.</p>
                </div>
                <Sparkles size={22} />
              </div>
              {(() => {
                const sorted=records.slice().sort((a,b)=>a.record_date.localeCompare(b.record_date));
                const last7=sorted.slice(-7);
                const previous7=sorted.slice(-14,-7);
                const avg=(arr,key)=>arr.length?arr.reduce((a,r)=>a+Number(r[key]||0),0)/arr.length:0;
                const recentHours=last7.reduce((a,r)=>a+Number(r.lecture_minutes||0),0)/60;
                const prevHours=previous7.reduce((a,r)=>a+Number(r.lecture_minutes||0),0)/60;
                const recentScore=avg(last7,"daily_score");
                const prevScore=avg(previous7,"daily_score");
                const recentQuestions=last7.reduce((a,r)=>a+Number(r.questions_done||0),0);
                const trend=recentHours-prevHours;
                const scoreTrend=recentScore-prevScore;
                const consistency=Math.min(100,Math.round((last7.filter(r=>Number(r.daily_score||0)>0).length/7)*100));
                let title="Build one more strong day.";
                let body="Your recent activity is the foundation. A small, repeatable study session today keeps your momentum alive.";
                if(consistency>=85 && trend>=0){title="You're building real momentum. 🔥"; body=`You recorded study activity on ${last7.filter(r=>Number(r.daily_score||0)>0).length} of the last 7 days. Keep the streak alive.`;}
                else if(scoreTrend>=8){title="Your quality is improving. ↑"; body=`Your average score is up about ${Math.round(scoreTrend)} points versus the previous 7 recorded days.`;}
                else if(trend>1){title="Your study time is climbing. ↑"; body=`You studied about ${trend.toFixed(1)} more hours than the previous 7-day period.`;}
                else if(consistency<50){title="Protect your consistency."; body="Your recent activity has gaps. Start with one focused task today rather than waiting for a perfect study session.";}
                return <div className="momentum-content">
                  <div className="momentum-score"><span>CONSISTENCY</span><strong>{consistency}%</strong><div><i style={{width:`${consistency}%`}}/></div></div>
                  <div className="momentum-message"><span className="momentum-label">CURRENT SIGNAL</span><h3>{title}</h3><p>{body}</p></div>
                  <div className="momentum-stats">
                    <div><span>7-day study</span><strong>{recentHours.toFixed(1)}h</strong></div>
                    <div><span>Questions</span><strong>{recentQuestions}</strong></div>
                    <div><span>Score trend</span><strong>{scoreTrend>=0?"+":""}{Math.round(scoreTrend)}%</strong></div>
                  </div>
                  <div className="momentum-next"><Sparkles size={16}/><span><b>Next best action:</b> complete one planned task and log the study session before you finish.</span></div>
                </div>;
              })()}
            </article>
          </section>

          <section className="history-list-panel">
            <div className="history-list-head">
              <div><span className="card-kicker">COMPLETE HISTORY</span><h2>Previous study days</h2></div>
              <span>{history.length} saved day{history.length===1?"":"s"}</span>
            </div>
            <div className="history-list">
              {history.length ? history.map(r=>{
                const tk=taskMap[r.record_date]||{total:0,done:0};
                return <button key={r.record_date} className={`history-row ${r.record_date===selectedKey?"active":""}`} onClick={()=>setSelectedDate(new Date(`${r.record_date}T12:00:00`))}>
                  <div className="history-date"><strong>{new Date(`${r.record_date}T12:00:00`).getDate()}</strong><span>{new Date(`${r.record_date}T12:00:00`).toLocaleDateString("en-US",{month:"short",weekday:"short"})}</span></div>
                  <div className="history-row-main"><strong>{fmt(r.record_date)}</strong><span>{Math.floor((r.lecture_minutes||0)/60)}h {(r.lecture_minutes||0)%60}m study · {r.questions_done||0} questions · {r.pages_read||0} pages</span></div>
                  <div className="history-row-tasks"><span>Tasks</span><strong>{tk.done}/{tk.total}</strong></div>
                  <div className="history-row-score"><span>Score</span><strong>{Math.round(r.daily_score||0)}%</strong></div>
                </button>;
              }) : <div className="history-empty-large">{loading ? "Loading your study history…" : "Your saved daily records will appear here."}</div>}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}


function WeeklyReviewPage({ session, theme, toggleTheme, tasks, history, goals, habits, activityLog, trackedSeconds, completedFocusSessions, score, reviewAutomation, setReviewAutomation, reviewSnapshots, onGenerateReviews, onBack }) {
  const now = new Date();
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7)); weekStart.setHours(0,0,0,0);
  const inWeek = (iso) => new Date(iso) >= weekStart;
  const weekTasks = tasks.filter(t => t.task_date && new Date(`${t.task_date}T23:59:59`) >= weekStart && new Date(`${t.task_date}T12:00:00`) <= now);
  const done = weekTasks.filter(t=>t.status==='completed').length;
  const completion = weekTasks.length ? Math.round(done/weekTasks.length*100) : 0;
  const weekRecords = history.filter(r=>r.record_date && new Date(`${r.record_date}T12:00:00`) >= weekStart);
  const studyMinutes = weekRecords.reduce((s,r)=>s+Number(r.lecture_minutes||0),0);
  const questions = weekRecords.reduce((s,r)=>s+Number(r.questions_done||0),0);
  const events = activityLog.filter(e=>inWeek(e.at));
  const focus = events.filter(e=>e.type==='focus_completed').reduce((s,e)=>s+Number(e.value||0),0);
  const habitDone = events.filter(e=>e.type==='habit_completed').length;
  const activeDays = new Set([...weekRecords.map(r=>r.record_date), ...events.map(e=>e.at.slice(0,10))]).size;
  const topGoal = goals.find(g=>g.status==='active');
  const progress = topGoal?.target_value ? Math.min(100,Math.round(Number(topGoal.current_value||0)/Number(topGoal.target_value)*100)) : 0;
  const strongest = completion >= 80 ? 'Execution' : studyMinutes >= 300 ? 'Study' : habitDone >= 5 ? 'Consistency' : 'Momentum';
  const next = completion < 70 ? 'Close two high-priority tasks before adding new work.' : studyMinutes < 300 ? 'Protect one uninterrupted study block tomorrow.' : habitDone < 5 ? 'Use one small habit to keep the chain alive.' : 'Keep the current rhythm and raise the quality bar slightly.';
  return <div className="review-shell">
    <header className="review-topbar"><div className="tracker-page-brand"><button className="back-button" onClick={onBack}><ArrowLeft size={17}/></button><div><span>TRACKEN</span><small>WEEKLY REVIEW</small></div></div><div className="tracker-page-actions"><button className="dashboard-theme-button theme-control" onClick={toggleTheme} aria-label="Toggle dark mode" title="Toggle dark mode">{theme==='light'?<Moon size={17}/>:<Sun size={17}/>}<span>{theme==='light'?"Dark mode":"Light mode"}</span></button></div></header>
    <main className="review-workspace"><div className="review-heading"><div><span className="card-kicker">WEEKLY REVIEW · {weekStart.toLocaleDateString('en-US',{month:'short',day:'numeric'})} — {now.toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span><h1>Turn activity into <em>direction.</em></h1><p>A concise read of what you actually did, where momentum came from, and what deserves attention next.</p></div><div className="review-score"><span>TRACKEN SCORE</span><strong>{score}</strong><small>current momentum</small></div></div>
    <section className="review-card review-automation-card"><div className="review-card-head"><div><span className="card-kicker">AUTOMATION CENTER · 05</span><h2>Automatic reviews.</h2><p>TRACKEN prepares a daily and weekly reflection from your actual activity. It runs when the app opens after a period closes.</p></div><Sparkles size={20}/></div><div className="review-automation-controls"><label><input type="checkbox" checked={reviewAutomation?.daily!==false} onChange={e=>setReviewAutomation(v=>({...v,daily:e.target.checked}))}/> Daily review</label><label><input type="checkbox" checked={reviewAutomation?.weekly!==false} onChange={e=>setReviewAutomation(v=>({...v,weekly:e.target.checked}))}/> Weekly review</label><button className="primary-small" onClick={onGenerateReviews}><RotateCcw size={14}/> Generate latest</button></div><div className="review-automation-note"><Clock3 size={14}/> Daily reviews summarize the previous day. Weekly reviews summarize the previous Monday–Sunday cycle. Existing reviews are never duplicated.</div></section>
    <section className="review-stat-grid"><ReviewStat label="Task execution" value={`${completion}%`} meta={`${done}/${weekTasks.length} completed`}/><ReviewStat label="Study output" value={formatReviewMinutes(studyMinutes)} meta={`${questions} questions`}/><ReviewStat label="Focus" value={`${focus}m`} meta={`${completedFocusSessions} sessions total`}/><ReviewStat label="Active days" value={activeDays} meta={`${habitDone} habits completed`}/></section>
    <section className="review-grid"><article className="review-card"><div className="review-card-head"><div><span className="card-kicker">WHAT WORKED</span><h2>Your strongest signal</h2></div><Award size={20}/></div><div className="review-highlight"><strong>{strongest}</strong><p>{strongest==='Execution' ? `You completed ${completion}% of planned tasks this week.` : strongest==='Study' ? `You logged ${formatReviewMinutes(studyMinutes)} of study and ${questions} questions.` : strongest==='Consistency' ? `You completed ${habitDone} habit check-ins and kept your routine visible.` : 'You have enough activity to start identifying a repeatable personal rhythm.'}</p></div></article><article className="review-card"><div className="review-card-head"><div><span className="card-kicker">NEXT WEEK</span><h2>One clear move</h2></div><Zap size={20}/></div><div className="review-next"><div className="review-next-icon"><Zap size={20}/></div><p>{next}</p></div></article></section>
    <section className="review-card"><div className="review-card-head"><div><span className="card-kicker">CONNECTED PROGRESS</span><h2>Effort → outcome</h2><p>TRACKEN's core promise is to connect your daily evidence to meaningful progress.</p></div><TrendingUp size={20}/></div><div className="review-flow"><ReviewFlow label="Execution" value={completion}/><span>→</span><ReviewFlow label="Consistency" value={Math.min(100,Math.round((habitDone/Math.max(7,habits.length*7))*100))}/><span>→</span><ReviewFlow label="Goal" value={progress}/></div></section>
    <section className="review-card"><div className="review-card-head"><div><span className="card-kicker">WEEKLY SNAPSHOT</span><h2>Your operating rhythm</h2></div><BarChart3 size={20}/></div><div className="review-bars">{Array.from({length:7},(_,i)=>{const d=new Date(weekStart);d.setDate(weekStart.getDate()+i);const key=d.toISOString().slice(0,10);const mins=weekRecords.filter(r=>r.record_date===key).reduce((s,r)=>s+Number(r.lecture_minutes||0),0);const task=weekTasks.filter(t=>t.task_date===key).filter(t=>t.status==='completed').length;const h=Math.max(6,Math.min(100,mins/3+task*12));return <div key={key}><i style={{height:`${h}%`}}/><span>{d.toLocaleDateString('en-US',{weekday:'short'}).slice(0,2)}</span></div>})}</div></section>
    <section className="review-card"><div className="review-card-head"><div><span className="card-kicker">AUTOMATED HISTORY</span><h2>Recent reflections</h2><p>Saved snapshots stay available even after the next review is generated.</p></div><ClipboardList size={20}/></div><div className="review-snapshot-grid">{(reviewSnapshots||[]).slice(0,6).map(s=><article className="review-snapshot" key={s.id}><div><span>{s.type==='daily'?'DAILY':'WEEKLY'}</span><small>{s.periodStart} → {s.periodEnd}</small></div><strong>{s.strongest}</strong><p>{s.metrics?.taskPct||0}% tasks · {formatReviewMinutes(s.metrics?.studyMinutes||0)} study · {s.metrics?.habitPct||0}% habits</p><em>{s.next}</em></article>)}{!(reviewSnapshots||[]).length&&<div className="review-empty-state">Your first completed-period reflection will appear here automatically.</div>}</div></section>
    </main></div>;
}
function ReviewStat({label,value,meta}){return <div className="review-stat"><span>{label}</span><strong>{value}</strong><small>{meta}</small></div>}
function ReviewFlow({label,value}){return <div className="review-flow-item"><strong>{value}%</strong><span>{label}</span><i><em style={{width:`${Math.max(0,Math.min(100,value))}%`}}/></i></div>}
function formatReviewMinutes(m){const n=Number(m)||0;return `${Math.floor(n/60)}h ${String(n%60).padStart(2,'0')}m`}

function AnalyticsPage({ session, theme, toggleTheme, history, tasks, goals, onBack }) {
  const [range, setRange] = useState(7);
  const records = [...history].sort((a, b) => a.record_date.localeCompare(b.record_date));
  const now = new Date();
  const key = (d) => {
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  const money = (() => { try { return JSON.parse(localStorage.getItem("tracken-money") || "[]"); } catch { return []; } })();
  const investments = (() => { try { return JSON.parse(localStorage.getItem("tracken-investments") || "[]"); } catch { return []; } })();
  const habits = (() => { try { return JSON.parse(localStorage.getItem("tracken-habits") || "[]"); } catch { return []; } })();
  const trackedSeconds = Number(localStorage.getItem("tracken-time-today") || 0);
  const focusSessions = Number(localStorage.getItem("tracken-focus-sessions") || 0);
  const activityLog = (() => { try { return JSON.parse(localStorage.getItem("tracken-activity-log") || "[]"); } catch { return []; } })();

  const rangeStart = new Date(now);
  rangeStart.setDate(now.getDate() - (range - 1));
  const previousStart = new Date(rangeStart);
  previousStart.setDate(rangeStart.getDate() - range);
  const previousEnd = new Date(rangeStart);
  previousEnd.setDate(rangeStart.getDate() - 1);
  const filteredRecords = records.filter(r => r.record_date >= key(rangeStart) && r.record_date <= key(now));
  const previousRecords = records.filter(r => r.record_date >= key(previousStart) && r.record_date <= key(previousEnd));
  const sum = (arr, field) => arr.reduce((s, r) => s + Number(r[field] || 0), 0);
  const minutes = sum(filteredRecords, "lecture_minutes");
  const questions = sum(filteredRecords, "questions_done");
  const pages = sum(filteredRecords, "pages_read");
  const lectures = sum(filteredRecords, "lectures_watched");
  const scores = filteredRecords.map(r => Number(r.daily_score || 0)).filter(n => n > 0);
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const activeDays = filteredRecords.filter(r => Number(r.daily_score || 0) > 0).length;
  const previousMinutes = sum(previousRecords, "lecture_minutes");
  const previousQuestions = sum(previousRecords, "questions_done");
  const previousScores = previousRecords.map(r => Number(r.daily_score || 0)).filter(n => n > 0);
  const previousAvg = previousScores.length ? Math.round(previousScores.reduce((a, b) => a + b, 0) / previousScores.length) : 0;
  const plannedTasks = tasks.filter(t => t.task_date >= key(rangeStart) && t.task_date <= key(now));
  const doneTasks = plannedTasks.filter(t => t.status === "completed").length;
  const completion = plannedTasks.length ? Math.round(doneTasks / plannedTasks.length * 100) : 0;
  const previousTasks = tasks.filter(t => t.task_date >= key(previousStart) && t.task_date <= key(previousEnd));
  const previousCompletion = previousTasks.length ? Math.round(previousTasks.filter(t => t.status === "completed").length / previousTasks.length * 100) : 0;
  const daily = Array.from({ length: range }, (_, i) => {
    const d = new Date(rangeStart); d.setDate(rangeStart.getDate() + i);
    const k = key(d); const r = filteredRecords.find(x => x.record_date === k);
    return { key: k, date: d, minutes: Number(r?.lecture_minutes || 0), questions: Number(r?.questions_done || 0), pages: Number(r?.pages_read || 0), score: Number(r?.daily_score || 0) };
  });
  const maxMinutes = Math.max(60, ...daily.map(d => d.minutes));
  const bestDay = daily.reduce((best, d) => d.minutes > best.minutes ? d : best, daily[0] || { minutes: 0 });
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthRecords = records.filter(r => r.record_date >= key(monthStart));
  const monthMinutes = sum(monthRecords, "lecture_minutes");
  const monthQuestions = sum(monthRecords, "questions_done");
  const monthPages = sum(monthRecords, "pages_read");
  const totalMinutes = sum(records, "lecture_minutes");
  const totalQuestions = sum(records, "questions_done");
  const totalPages = sum(records, "pages_read");
  const totalLectures = sum(records, "lectures_watched");
  const formatDay = d => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const formatMinutes = m => `${Math.floor(m / 60)}h ${m % 60}m`;
  const formatCompactMinutes = m => m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60 ? `${m % 60}m` : ""}`;
  const activeGoals = goals.filter(g => g.status === "active");
  const goalRows = activeGoals.map(g => {
    const target = Number(g.target_value || 0), current = Number(g.current_value || 0);
    const linked = tasks.filter(t => String(t.goal_id) === String(g.id));
    const done = linked.filter(t => t.status === "completed").length;
    return { ...g, progress: target > 0 ? Math.min(100, Math.round(current / target * 100)) : 0, done, linked: linked.length };
  });
  const totalIncome = money.filter(x => x.type === "income").reduce((s, x) => s + Number(x.amount || 0), 0);
  const totalExpense = money.filter(x => x.type === "expense").reduce((s, x) => s + Number(x.amount || 0), 0);
  const portfolio = investments.reduce((s, x) => s + Number(x.value || 0), 0);
  const invested = investments.reduce((s, x) => s + Number(x.invested || 0), 0);
  const moneyBalance = totalIncome - totalExpense;
  const todayKey = new Date().toISOString().slice(0,10); const habitRate = habits.length ? Math.round(habits.filter(h => Array.isArray(h.completedDates) ? h.completedDates.includes(todayKey) : Boolean(h.done)).length / habits.length * 100) : 0;
  const focusHours = Math.floor((Number(localStorage.getItem("tracken-focus-minutes") || 0)) / 60);
  const pctChange = (current, previous) => previous ? Math.round(((current - previous) / Math.abs(previous)) * 100) : (current > 0 ? 100 : 0);
  const studyChange = pctChange(minutes, previousMinutes);
  const taskChange = pctChange(completion, previousCompletion);
  const scoreChange = avg - previousAvg;
  const dataSignals = [
    minutes > 0 ? { icon: Clock3, label: "Study rhythm", value: `${formatCompactMinutes(minutes)}`, meta: `${studyChange >= 0 ? "+" : ""}${studyChange}% vs previous window`, tone: studyChange >= 0 ? "positive" : "negative" } : null,
    plannedTasks.length ? { icon: ClipboardCheck, label: "Execution", value: `${completion}%`, meta: `${taskChange >= 0 ? "+" : ""}${taskChange}% completion change`, tone: taskChange >= 0 ? "positive" : "negative" } : null,
    habits.length ? { icon: Flame, label: "Consistency", value: `${habitRate}%`, meta: `${habits.length} habits in your daily system`, tone: habitRate >= 70 ? "positive" : "neutral" } : null,
    money.length ? { icon: WalletCards, label: "Cash flow", value: `₹${Math.abs(moneyBalance).toLocaleString("en-IN")}`, meta: moneyBalance >= 0 ? "positive net cash flow" : "expenses exceed income", tone: moneyBalance >= 0 ? "positive" : "negative" }
      : null
  ].filter(Boolean).slice(0, 4);
  let primaryInsight = "Keep recording real activity and TRACKEN will turn it into stronger personal insights.";
  let primaryAction = "Log one meaningful activity today.";
  if (completion < 70 && plannedTasks.length) { primaryInsight = "Your biggest opportunity is closing the task loop. Fewer open tasks will make your progress more reliable."; primaryAction = "Finish one high-priority task before adding another."; }
  else if (minutes < 300 && range === 7) { primaryInsight = "Your study rhythm has room to compound. A repeatable daily block is more valuable than occasional long sessions."; primaryAction = "Protect one 45–60 minute study block today."; }
  else if (habitRate < 70 && habits.length) { primaryInsight = "Consistency is the current bottleneck. Make your smallest habits easier to complete every day."; primaryAction = "Complete the easiest open habit now."; }
  else if (money.length && moneyBalance < 0) { primaryInsight = "Your recorded expenses are currently above your recorded income. Review the largest categories before adding new discretionary spending."; primaryAction = "Review your latest three expenses."; }
  else if (scoreChange > 0) { primaryInsight = `Your average study score is up ${scoreChange} points versus the previous window. Protect the routine that created the improvement.`; primaryAction = "Repeat your strongest study pattern."; }

  return (
    <div className="analytics-page-shell tasken-app-shell">
      <aside className="analytics-side-rail">
        <button className="back-link" onClick={onBack}><ArrowLeft size={16}/> Back to dashboard</button>
        <div className="subpage-brand"><div className="brand">TRACKEN<span>.</span></div><span>INTELLIGENCE</span></div>
        <div className="analytics-side-card">
          <div className="analytics-side-icon"><Sparkles size={22}/></div>
          <strong>Turn activity into decisions.</strong>
          <p>TRACKEN reads your saved work, consistency and money signals to show what is changing and what deserves attention next.</p>
        </div>
        <div className="intelligence-rail-note"><span>DATA SOURCES</span><b>{records.length + tasks.length + habits.length + money.length + investments.length}</b><small>tracked items available</small></div>
      </aside>

      <div className="analytics-page-main">
        <header className="analytics-topbar">
          <div>
            <span className="card-kicker">TRACKEN INTELLIGENCE</span>
            <h1>Know what is moving.</h1>
            <p>Your personal progress system, translated into decisions you can act on.</p>
          </div>
          <div className="analytics-top-actions">
            <button className="dashboard-theme-button theme-control" onClick={toggleTheme} aria-label="Toggle dark mode" title="Toggle dark mode">{theme === "light" ? <Moon size={17}/> : <Sun size={17}/>} <span>{theme === "light" ? "Dark mode" : "Light mode"}</span></button>
            <button className="secondary-cta compact-cta" onClick={onBack}>Dashboard <ArrowRight size={16}/></button>
          </div>
        </header>

        <main className="analytics-content intelligence-content">
          <section className="intelligence-hero">
            <div><span className="card-kicker">PERSONAL OPERATING SIGNAL</span><h2>{avg || completion || habitRate ? `Your system is ${Math.max(avg, completion, habitRate)}% active.` : "Your system is ready."}</h2><p>{primaryInsight}</p><button className="primary-small" onClick={onBack}>{primaryAction} <ArrowRight size={15}/></button></div>
            <div className="intelligence-orbit"><Sparkles size={24}/><strong>{Math.max(0, Math.min(100, Math.round((avg * .35) + (completion * .3) + (habitRate * .2) + (Math.min(focusSessions, 10) * 1.5))))}</strong><span>system health</span></div>
          </section>

          <section className="analytics-range-bar">
            <div><span className="card-kicker">PERFORMANCE WINDOW</span><h2>What changed</h2></div>
            <div className="range-switch">{[7, 30].map(n => <button key={n} className={range === n ? "active" : ""} onClick={() => setRange(n)}>{n === 7 ? "Last 7 days" : "Last 30 days"}</button>)}</div>
          </section>

          <section className="intelligence-signal-grid">
            {dataSignals.map(({ icon: Icon, label, value, meta, tone }) => <article key={label} className={`intelligence-signal ${tone}`}><div className="intelligence-signal-icon"><Icon size={18}/></div><span>{label}</span><strong>{value}</strong><small>{meta}</small></article>)}
            {!dataSignals.length && <article className="intelligence-signal empty"><Sparkles size={18}/><span>BUILD YOUR SIGNAL</span><strong>0 data points</strong><small>Start tracking to unlock personal intelligence.</small></article>}
          </section>

          <section className="analytics-stat-grid">
            <AnalyticsStat icon={Clock3} label="Study time" value={formatMinutes(minutes)} meta={`${formatMinutes(monthMinutes)} this month`}/>
            <AnalyticsStat icon={BookOpen} label="Questions solved" value={questions.toLocaleString()} meta={`${monthQuestions.toLocaleString()} this month`}/>
            <AnalyticsStat icon={ClipboardCheck} label="Tasks completed" value={`${doneTasks}/${plannedTasks.length}`} meta={`${completion}% completion`}/>
            <AnalyticsStat icon={TrendingUp} label="Average score" value={`${avg}%`} meta={`${scoreChange >= 0 ? "+" : ""}${scoreChange} pts vs previous`}/>
            <AnalyticsStat icon={Flame} label="Active days" value={activeDays} meta={`${range} day window`}/>
            <AnalyticsStat icon={Timer} label="Focus sessions" value={focusSessions} meta={`${focusHours}h accumulated focus`}/>
          </section>

          <section className="analytics-main-grid">
            <article className="analytics-panel analytics-chart-panel">
              <div className="analytics-panel-head"><div><span className="card-kicker">STUDY TIME</span><h2>Daily rhythm</h2><p>See whether your effort is becoming repeatable.</p></div><strong>{formatMinutes(minutes)}</strong></div>
              <div className="analytics-bar-chart">{daily.map(d => <button key={d.key} className="analytics-bar-item" title={`${formatDay(d.date)} · ${formatMinutes(d.minutes)}`}><div className="analytics-bar-track"><i style={{ height: `${Math.max(d.minutes ? 6 : 2, (d.minutes / maxMinutes) * 100)}%` }}/></div><span>{d.date.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2)}</span><small>{d.minutes ? `${Math.round(d.minutes / 60 * 10) / 10}h` : "—"}</small></button>)}</div>
            </article>
            <article className="analytics-panel score-panel">
              <div className="analytics-panel-head"><div><span className="card-kicker">MOMENTUM</span><h2>Is the curve improving?</h2><p>Compare this window with the immediately previous one.</p></div><div className={`intelligence-change ${scoreChange >= 0 ? "up" : "down"}`}>{scoreChange >= 0 ? "↑" : "↓"} {Math.abs(scoreChange)} pts</div></div>
              <div className="comparison-list"><div><span>Study time</span><b>{formatMinutes(minutes)}</b><small>{studyChange >= 0 ? "+" : ""}{studyChange}%</small></div><div><span>Task completion</span><b>{completion}%</b><small>{taskChange >= 0 ? "+" : ""}{taskChange}%</small></div><div><span>Average score</span><b>{avg}%</b><small>{scoreChange >= 0 ? "+" : ""}{scoreChange} pts</small></div></div>
            </article>
          </section>

          <section className="analytics-main-grid">
            <article className="analytics-panel breakdown-analytics-panel"><div className="analytics-panel-head"><div><span className="card-kicker">PROGRESS MIX</span><h2>Where your effort goes</h2><p>The measurable inputs behind your current window.</p></div><PieChart size={22}/></div><div className="analytics-breakdown-list"><AnalyticsBreakdown icon={BookOpen} label="Lectures watched" value={lectures} unit="lectures" percent={Math.min(100, lectures * 5)}/><AnalyticsBreakdown icon={Timer} label="Lecture duration" value={formatMinutes(minutes)} unit="logged" percent={Math.min(100, minutes / 3)}/><AnalyticsBreakdown icon={HelpCircle} label="Questions solved" value={questions.toLocaleString()} unit="questions" percent={Math.min(100, questions / 1.5)}/><AnalyticsBreakdown icon={BookOpen} label="Pages read" value={pages.toLocaleString()} unit="pages" percent={Math.min(100, pages * 2)}/></div></article>
            <article className="analytics-panel best-day-panel"><div className="analytics-panel-head"><div><span className="card-kicker">BEST DAY</span><h2>Your strongest session</h2><p>The day with the most lecture time in this window.</p></div><Award size={22}/></div><div className="best-day-card"><strong>{bestDay?.minutes ? formatMinutes(bestDay.minutes) : "No study time yet"}</strong><span>{bestDay?.minutes ? formatDay(bestDay.date) : "Save a study record to reveal it"}</span>{bestDay?.minutes ? <div><b>{bestDay.questions}</b> questions <b>{bestDay.pages}</b> pages <b>{bestDay.score}%</b> score</div> : null}</div></article>
          </section>

          <section className="analytics-panel goal-performance-panel"><div className="analytics-panel-head"><div><span className="card-kicker">GOAL PERFORMANCE</span><h2>Effort → destination</h2><p>Connect the work you log to the outcomes you said matter.</p></div><Target size={22}/></div>{goalRows.length ? <div className="analytics-goal-list">{goalRows.map(g => <article className="analytics-goal-row" key={g.id}><div className="analytics-goal-title"><span>{g.category || "Goal"}</span><h3>{g.title}</h3></div><div className="analytics-goal-progress"><div><span>Goal progress</span><strong>{g.progress}%</strong></div><div className="goal-progress-track"><i style={{ width: `${g.progress}%` }}/></div></div><div className="analytics-goal-meta"><b>{g.current_value || 0}</b> {g.unit || "progress"} <span>•</span><b>{g.done}/{g.linked}</b> tasks</div></article>)}</div> : <div className="analytics-empty"><Target size={25}/><h3>No active goals yet</h3><p>Create a goal and TRACKEN will connect execution to the destination.</p></div>}</section>

          <section className="intelligence-finance-grid">
            <article className="analytics-panel"><div className="analytics-panel-head"><div><span className="card-kicker">FINANCIAL SIGNAL</span><h2>Money at a glance</h2><p>Recorded values only — no bank assumptions.</p></div><WalletCards size={22}/></div><div className="finance-signal-grid"><div><span>Income</span><strong>₹{totalIncome.toLocaleString("en-IN")}</strong></div><div><span>Expenses</span><strong>₹{totalExpense.toLocaleString("en-IN")}</strong></div><div><span>Portfolio</span><strong>₹{portfolio.toLocaleString("en-IN")}</strong></div><div><span>Cash flow</span><strong className={moneyBalance >= 0 ? "positive" : "negative"}>₹{moneyBalance.toLocaleString("en-IN")}</strong></div></div></article>
            <article className="analytics-panel"><div className="analytics-panel-head"><div><span className="card-kicker">RECENT SIGNALS</span><h2>What you've been doing</h2><p>Recent activity captured by TRACKEN.</p></div><Activity size={22}/></div><div className="recent-signal-list">{activityLog.slice(-6).reverse().map(item => <div key={item.id}><span>{new Date(item.at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span><b>{item.label}</b><small>{item.type.replaceAll("_", " ")}</small></div>)}{!activityLog.length && <div className="analytics-empty"><Activity size={22}/><p>Your recent activity will appear here.</p></div>}</div></article>
          </section>

          <section className="analytics-panel lifetime-panel"><div className="analytics-panel-head"><div><span className="card-kicker">ALL-TIME SNAPSHOT</span><h2>Your accumulated footprint</h2><p>Everything TRACKEN has recorded for this account.</p></div><Sparkles size={22}/></div><div className="lifetime-grid"><div><span>Total study time</span><strong>{formatMinutes(totalMinutes)}</strong></div><div><span>Total questions</span><strong>{totalQuestions.toLocaleString()}</strong></div><div><span>Total pages</span><strong>{totalPages.toLocaleString()}</strong></div><div><span>Total lectures</span><strong>{totalLectures.toLocaleString()}</strong></div></div><div className="analytics-footnote">{records[0]?.record_date ? `Tracking since ${formatDay(new Date(`${records[0].record_date}T12:00:00`))}. The more consistently you record, the stronger your insights become.` : "Your intelligence layer will grow automatically as you save activity."}</div></section>
        </main>
      </div>
    </div>
  );
}

function Activity({size=22}) { return <ClipboardList size={size}/>; }

function AnalyticsStat({icon:Icon,label,value,meta}) {
  return <article className="analytics-stat"><div className="analytics-stat-icon"><Icon size={20}/></div><span>{label}</span><strong>{value}</strong><small>{meta}</small></article>;
}
function AnalyticsProgress({label,value}) {
  const safe=Math.max(0,Math.min(100,Number(value)||0));
  return <div className="analytics-progress-row"><div><span>{label}</span><strong>{safe}%</strong></div><div className="analytics-progress-track"><i style={{width:`${safe}%`}}/></div></div>;
}
function AnalyticsBreakdown({icon:Icon,label,value,unit,percent}) {
  const safe=Math.max(2,Math.min(100,Number(percent)||0));
  return <div className="analytics-breakdown-row"><div className="analytics-breakdown-icon"><Icon size={17}/></div><div className="analytics-breakdown-copy"><div><span>{label}</span><strong>{value}</strong></div><small>{unit}</small><div className="analytics-mini-track"><i style={{width:`${safe}%`}}/></div></div></div>;
}

function getDaysLeft(date) {
  if (!date) return "—";
  return Math.max(0, Math.ceil((new Date(`${date}T23:59:59`) - new Date()) / 86400000));
}

function StatCard({ icon: Icon, label, value, meta, progress, accent }) {
  return <article className={`command-stat-card ${accent ? "accent" : ""}`}><div className="stat-icon"><Icon size={19} /></div><span>{label}</span><strong>{value}</strong>{progress !== undefined ? <div className="stat-progress"><i style={{ width: `${progress}%` }}></i></div> : null}<small>{meta}</small></article>;
}

function BreakdownItem({ label, value, unit }) {
  return <div className="breakdown-item"><span><i></i>{label}</span><strong>{value}</strong><small>{unit}</small></div>;
}

function Achievement({ icon, title, unlocked }) {
  return <div className={`achievement ${unlocked ? "unlocked" : "locked"}`}><span>{unlocked ? icon : "○"}</span><div><strong>{title}</strong><small>{unlocked ? "Unlocked" : "Keep going"}</small></div></div>;
}



const UPDATE_TYPES = ["Notice", "Announcement", "Important", "General"];

function UpdatesPage({ session, theme, toggleTheme, onBack, onUnreadChange = () => {} }) {
  const userId = session.user.id;
  const [updates, setUpdates] = useState([]);
  const [readIds, setReadIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadUpdates = async () => {
    setLoading(true); setError("");
    const [updatesRes, readsRes] = await Promise.all([
      supabase.from("updates").select("*").or(`recipient_user_id.is.null,recipient_user_id.eq.${userId}`).order("created_at", { ascending: false }),
      supabase.from("update_reads").select("update_id").eq("user_id", userId)
    ]);
    if (updatesRes.error) setError(updatesRes.error.message);
    else setUpdates(updatesRes.data || []);
    if (readsRes.error) setError(readsRes.error.message);
    else setReadIds(new Set((readsRes.data || []).map((item) => item.update_id)));
    setLoading(false);
  };

  useEffect(() => { loadUpdates(); }, [userId]);

  const unread = updates.filter((item) => !readIds.has(item.id));

  useEffect(() => { onUnreadChange(unread.length); }, [unread.length]);

  const markRead = async (updateId) => {
    if (readIds.has(updateId)) return;
    const { error: readError } = await supabase.from("update_reads").upsert({ update_id: updateId, user_id: userId, read_at: new Date().toISOString() }, { onConflict: "update_id,user_id" });
    if (readError) return setError(readError.message);
    setReadIds((current) => new Set([...current, updateId]));
  };

  const markAllRead = async () => {
    if (!unread.length) return;
    const rows = unread.map((item) => ({ update_id: item.id, user_id: userId, read_at: new Date().toISOString() }));
    const { error: readError } = await supabase.from("update_reads").upsert(rows, { onConflict: "update_id,user_id" });
    if (readError) return setError(readError.message);
    setReadIds(new Set([...readIds, ...unread.map((item) => item.id)]));
  };

  return (
    <div className="subpage-shell tasken-app-shell">
      <aside className="subpage-side-rail"><button className="back-link" onClick={onBack}><ArrowLeft size={16} /> Back to dashboard</button><div className="subpage-brand"><div className="brand">TRACKEN<span>.</span></div><span>UPDATES</span></div><div className="subpage-side-note"><Bell size={20} /><strong>Stay in the loop.</strong><p>Official notices and important messages from TRACKEN appear here.</p></div></aside>
      <div className="subpage-main">
        <header className="subpage-topbar"><div><span className="card-kicker">TRACKEN UPDATES</span><h1>Updates & notices</h1></div><div className="subpage-actions"><button className="dashboard-theme-button theme-control" onClick={toggleTheme} aria-label="Toggle dark mode" title="Toggle dark mode"><Moon size={17} /><span>{theme === "light" ? "Dark mode" : "Light mode"}</span></button><button className="secondary-cta compact-cta" onClick={onBack}>Dashboard <ArrowRight size={16} /></button></div></header>
        <main className="subpage-content">
          {error && <div className="dashboard-error">{error}</div>}
          <section className="updates-hero"><div><span className="eyebrow"><span></span> YOUR INBOX</span><h2>{unread.length ? `${unread.length} new ${unread.length === 1 ? "message" : "messages"}.` : "You're all caught up."}</h2><p>Important information from the TRACKEN team, kept in one clear place.</p></div><button className="primary-cta compact-cta" onClick={markAllRead} disabled={!unread.length}><CheckCheck size={16} /> Mark all read</button></section>
          <section className="updates-list">
            {loading ? <div className="updates-empty"><Bell size={26} /><h3>Loading updates…</h3></div> : updates.length ? updates.map((item) => {
              const unreadItem = !readIds.has(item.id);
              return <article key={item.id} className={`update-card ${unreadItem ? "unread" : ""}`} onClick={() => markRead(item.id)}><div className={`update-type ${String(item.type || "General").toLowerCase()}`}><Megaphone size={18} /></div><div className="update-body"><div className="update-meta"><span>{item.type || "General"}</span><time>{new Date(item.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</time>{unreadItem && <b>NEW</b>}</div><h3>{item.title}</h3>{(() => { const payload=parseUpdatePayload(item.message); return <><div className="update-rich-content" dangerouslySetInnerHTML={{__html:normalizeArticleHtml(payload.html)}} />{payload.attachment?.url && <a className="update-attachment-card" href={payload.attachment.url} target="_blank" rel="noreferrer noopener" onClick={e=>e.stopPropagation()}><span className="update-attachment-icon"><FileText size={19}/></span><span><strong>{payload.attachment.name || "Attached file"}</strong><small>{payload.attachment.size ? formatFileSize(payload.attachment.size) : "Open file"}</small></span><Download size={18}/></a>}</> })()}<small>{item.recipient_user_id ? "Direct message" : "For all TRACKEN users"}</small></div>{unreadItem && <span className="unread-dot" />}</article>;
            }) : <div className="updates-empty"><Bell size={26} /><h3>No updates yet</h3><p>When TRACKEN has something important to share, you'll find it here.</p></div>}
          </section>
        </main>
      </div>
    </div>
  );
}


function AdminPage({ session, theme, toggleTheme, onBack }) {
  const [users, setUsers] = useState([]);
  const [records, setRecords] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [userStates, setUserStates] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserDetail, setSelectedUserDetail] = useState(null);
  const [goals, setGoals] = useState([]);
  const [profile, setProfile] = useState(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [target, setTarget] = useState("all");
  const [type, setType] = useState("Notice");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [broadcastEditorRef, setBroadcastEditorRef] = useState(null);
  const [broadcastFile, setBroadcastFile] = useState(null);
  const [broadcastHtml, setBroadcastHtml] = useState("");
  const [uploadingBroadcastFile, setUploadingBroadcastFile] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentHistory, setSentHistory] = useState([]);
  const [search, setSearch] = useState("");
  const [financeSearch, setFinanceSearch] = useState("");
  const [financeSearchInput, setFinanceSearchInput] = useState("");
  const [blogPosts, setBlogPosts] = useState([]);
  const [blogTitle, setBlogTitle] = useState("");
  const [blogSlug, setBlogSlug] = useState("");
  const [blogCategory, setBlogCategory] = useState("Productivity");
  const [blogExcerpt, setBlogExcerpt] = useState("");
  const [blogContent, setBlogContent] = useState("");
  const blogContentRef = useRef(null);
  const [uploadingArticleImage, setUploadingArticleImage] = useState(false);
  const [selectedArticleImage, setSelectedArticleImage] = useState(null);
  const [blogReadMinutes, setBlogReadMinutes] = useState(5);
  const [publishingBlog, setPublishingBlog] = useState(false);
  const [blogSent, setBlogSent] = useState(false);
  const [editingUpdateId, setEditingUpdateId] = useState(null);
  const [updateEdit, setUpdateEdit] = useState({ title:"", message:"", type:"Notice" });
  const [editingBlogId, setEditingBlogId] = useState(null);
  const [galleryImages, setGalleryImages] = useState([]);
  const [galleryFiles, setGalleryFiles] = useState([]);
  const [galleryCaption, setGalleryCaption] = useState("");
  const [uploadingGallery, setUploadingGallery] = useState(false);

  const adminLoadInFlight = useRef(false);
  const loadAdminData = async (showInitialLoader = false) => {
    if (adminLoadInFlight.current) return;
    adminLoadInFlight.current = true;
    if (showInitialLoader) setLoading(true);
    setError("");
    try {
      const [usersRes, recordsRes, tasksRes, goalsRes, stateRes, historyRes, blogRes, galleryRes] = await Promise.all([
        supabase.rpc("admin_list_users"),
        supabase.from("daily_records").select("*").order("record_date", { ascending: false }).limit(5000),
        supabase.from("tasks").select("*").limit(5000),
        supabase.from("goals").select("*").limit(5000),
        supabase.from("user_app_state").select("user_id,money,investments,assets,liabilities,habits,focus_sessions,tracked_seconds").limit(5000),
        supabase.from("updates").select("*").order("created_at", { ascending: false }).limit(1000),
        supabase.from("blog_posts").select("*").order("created_at", { ascending: false }).limit(1000),
        supabase.from("journal_gallery").select("*").order("created_at", { ascending: false }).limit(500)
      ]);
      const firstError = [usersRes, recordsRes, tasksRes, goalsRes, stateRes, historyRes, blogRes, galleryRes].find((res) => res.error);
      if (firstError?.error) setError(firstError.error.message);
      if (!usersRes.error) setUsers(usersRes.data || []);
      if (!recordsRes.error) setRecords(recordsRes.data || []);
      if (!tasksRes.error) setTasks(tasksRes.data || []);
      if (!goalsRes.error) setGoals(goalsRes.data || []);
      if (!stateRes.error) setUserStates(stateRes.data || []);
      if (!historyRes.error) setSentHistory((historyRes.data || []).filter((item) => item.created_by === session.user.id));
      if (!blogRes?.error) setBlogPosts(blogRes.data || []);
      if (!galleryRes?.error) setGalleryImages(galleryRes.data || []);
    } catch (err) {
      setError(err?.message || "Could not refresh the Admin Center.");
    } finally {
      if (showInitialLoader) setLoading(false);
      adminLoadInFlight.current = false;
    }
  };

  useEffect(() => {
    loadAdminData(true);
    const timer = setInterval(() => loadAdminData(false), 10000);
    const channel = supabase.channel("admin-live-state")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_app_state" }, () => loadAdminData(false))
      .on("postgres_changes", { event: "*", schema: "public", table: "daily_records" }, () => loadAdminData(false))
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => loadAdminData(false))
      .on("postgres_changes", { event: "*", schema: "public", table: "goals" }, () => loadAdminData(false))
      .on("postgres_changes", { event: "*", schema: "public", table: "updates" }, () => loadAdminData(false))
      .subscribe();
    return () => { clearInterval(timer); supabase.removeChannel(channel); };
  }, []);

  const fileToDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read the selected file."));
    reader.readAsDataURL(file);
  });

  const uploadAdminFile = async (file, folder="broadcast") => {
    if (!file) return null;
    if (file.size > 25 * 1024 * 1024) throw new Error("Files must be 25 MB or smaller.");
    setUploadingBroadcastFile(true);
    const ext=(file.name.split(".").pop()||"bin").toLowerCase().replace(/[^a-z0-9]/g,"") || "bin";
    const filename=`${Date.now()}-${Math.random().toString(36).slice(2,9)}.${ext}`;
    const candidates=["journal-article","journal-gallery"];
    let lastError=null;
    try {
      for (const bucket of candidates) {
        const path=`${session.user.id}/${folder}/${filename}`;
        const {error:uploadError}=await supabase.storage.from(bucket).upload(path,file,{cacheControl:"3600",upsert:false,contentType:file.type||"application/octet-stream"});
        if (uploadError) { lastError=uploadError; continue; }
        const {data}=supabase.storage.from(bucket).getPublicUrl(path);
        if (data?.publicUrl) return {url:data.publicUrl,name:file.name,size:file.size,type:file.type||"application/octet-stream",storage_path:path,bucket};
        lastError=new Error(`Storage bucket ${bucket} did not return a public URL.`);
      }
      // Some existing TRACKEN Supabase projects have older Storage policies.
      // For small attachments, fall back to a self-contained data URL so an
      // update/article can still be published instead of silently failing.
      if (file.size <= 5 * 1024 * 1024) {
        const dataUrl = await fileToDataUrl(file);
        if (dataUrl) return {url:dataUrl,name:file.name,size:file.size,type:file.type||"application/octet-stream",embedded:true};
      }
      throw lastError || new Error("Could not upload the file. Check the Storage policies for the article bucket.");
    } finally {
      setUploadingBroadcastFile(false);
    }
  };

  const sendUpdate = async (e) => {
    e.preventDefault();
    if (!title.trim() || sending) return;
    setSending(true); setError(""); setSent(false);
    let attachment=null;
    try {
      if(broadcastFile) attachment=await uploadAdminFile(broadcastFile,"broadcast");
      const editorHtml=broadcastEditorRef ? normalizeArticleHtml(broadcastEditorRef.innerHTML) : normalizeArticleHtml(message.trim());
      if(!editorHtml.replace(/<[^>]*>/g,"").trim() && !attachment) throw new Error("Add a message or attach a file.");
      const stored=JSON.stringify({__trackenUpdate:1,html:editorHtml,attachment});
      const { data, error: sendError } = await supabase.from("updates").insert({ title: title.trim(), message: stored, type, recipient_user_id: target === "all" ? null : target, created_by: session.user.id }).select().single();
      if (sendError) throw sendError;
      setSentHistory((current) => [{...(data||{}),id:data?.id||`local-${Date.now()}`,title:title.trim(),message:stored,type,recipient_user_id:target === "all" ? null : target,created_by:session.user.id,created_at:new Date().toISOString()}, ...current]);
      setTitle(""); setMessage(""); setBroadcastFile(null); setBroadcastHtml(""); if(broadcastEditorRef) broadcastEditorRef.innerHTML=""; setSent(true);
      setTimeout(() => setSent(false), 3500);
    } catch(err){
      if(attachment?.bucket && attachment?.storage_path) await supabase.storage.from(attachment.bucket).remove([attachment.storage_path]).catch(()=>{});
      setError(err?.message||"Could not send update.");
    } finally { setSending(false); }
  };

  const startEditUpdate = (item) => { const payload=parseUpdatePayload(item.message); setEditingUpdateId(item.id); setUpdateEdit({title:item.title||"", message:payload.html||"", type:item.type||"Notice"}); };
  const cancelEditUpdate = () => { setEditingUpdateId(null); setUpdateEdit({title:"", message:"", type:"Notice"}); };
  const saveUpdateEdit = async () => {
    if(!editingUpdateId || !updateEdit.title.trim()) return;
    const currentItem=sentHistory.find(x=>x.id===editingUpdateId); const currentPayload=parseUpdatePayload(currentItem?.message||""); const nextMessage=JSON.stringify({__trackenUpdate:1,html:normalizeArticleHtml(updateEdit.message.trim()),attachment:currentPayload.attachment||null}); const {data,error:editError}=await supabase.from("updates").update({title:updateEdit.title.trim(),message:nextMessage,type:updateEdit.type}).eq("id",editingUpdateId).select().single();
    if(editError){setError(editError.message);return;}
    setSentHistory(current=>current.map(item=>item.id===editingUpdateId?data:item)); cancelEditUpdate();
  };
  const deleteUpdate = async (id) => {
    if(!window.confirm("Delete this update? This cannot be undone.")) return;
    const {error:deleteError}=await supabase.from("updates").delete().eq("id",id);
    if(deleteError){setError(deleteError.message);return;}
    setSentHistory(current=>current.filter(item=>item.id!==id));
  };

  const startEditBlog = (post) => { setEditingBlogId(post.id); setBlogTitle(post.title||""); setBlogSlug(post.slug||""); setBlogCategory(post.category||"Productivity"); setBlogExcerpt(post.excerpt||""); setBlogContent(post.content||""); setBlogReadMinutes(post.read_minutes||5); };
  const cancelEditBlog = () => { setEditingBlogId(null); setBlogTitle(""); setBlogSlug(""); setBlogCategory("Productivity"); setBlogExcerpt(""); setBlogContent(""); setBlogReadMinutes(5); setSelectedArticleImage(null); };
  useEffect(()=>{
    if(blogContentRef.current && blogContentRef.current.innerHTML !== normalizeArticleHtml(blogContent)) blogContentRef.current.innerHTML = normalizeArticleHtml(blogContent);
  },[editingBlogId]);

  const deleteBlog = async (id) => {
    if(!window.confirm("Delete this article? This cannot be undone.")) return;
    if(String(id).startsWith("local-")){ const next=blogPosts.filter(post=>post.id!==id); setBlogPosts(next); localStorage.setItem("tasken-blog-posts",JSON.stringify(next)); return; }
    const {error:deleteError}=await supabase.from("blog_posts").delete().eq("id",id);
    if(deleteError){setError(deleteError.message);return;}
    setBlogPosts(current=>current.filter(post=>post.id!==id));
  };

  const insertArticleImageAtRange = (editor, range, src, alt = "Article image") => {
    const image = document.createElement("img");
    image.src = src;
    image.alt = alt;
    image.loading = "lazy";
    image.style.width = "100%";
    image.style.height = "auto";
    image.style.maxWidth = "100%";

    // Insert the image exactly at the saved cursor position. Then create a
    // dedicated paragraph after it so typing always continues BELOW the image
    // instead of jumping back to the start of the editor.
    range.deleteContents();
    range.insertNode(image);

    const paragraph = document.createElement("p");
    paragraph.appendChild(document.createElement("br"));
    const imageParent = image.parentElement;
    if (imageParent && imageParent.tagName === "P") imageParent.insertAdjacentElement("afterend", paragraph);
    else if (imageParent) imageParent.insertBefore(paragraph, image.nextSibling);
    else editor.appendChild(paragraph);

    const caret = document.createRange();
    caret.selectNodeContents(paragraph);
    caret.collapse(true);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(caret);

    setSelectedArticleImage(image);
    setBlogContent(editor.innerHTML);
  };

  const getEditorRange = () => {
    const editor = blogContentRef.current;
    const selection = window.getSelection();
    if (editor && selection?.rangeCount) {
      const range = selection.getRangeAt(0);
      if (editor.contains(range.commonAncestorContainer)) return range.cloneRange();
    }
    if (editor) {
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      return range;
    }
    return null;
  };

  const uploadArticleImage = async (file, savedRange = null) => {
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 10 * 1024 * 1024) { setError("Article images must be 10 MB or smaller."); return; }
    setUploadingArticleImage(true); setError("");
    try {
      const ext=(file.name.split(".").pop()||"png").toLowerCase();
      const filename=`${Date.now()}-${Math.random().toString(36).slice(2,9)}.${ext}`;
      let publicUrl=""; let storageBucket=""; let storagePath=""; let lastError=null;
      for (const bucket of ["journal-article","journal-gallery"]) {
        const path=`${session.user.id}/article-images/${filename}`;
        const {error:uploadError}=await supabase.storage.from(bucket).upload(path,file,{cacheControl:"3600",upsert:false,contentType:file.type});
        if(uploadError){lastError=uploadError;continue;}
        const {data}=supabase.storage.from(bucket).getPublicUrl(path);
        if(data?.publicUrl){publicUrl=data.publicUrl;storageBucket=bucket;storagePath=path;break;}
      }
      if(!publicUrl && file.size <= 5 * 1024 * 1024) publicUrl = await fileToDataUrl(file);
      if(!publicUrl) throw lastError || new Error("Could not create a public article image URL.");
      const editor=blogContentRef.current;
      if(!editor || !publicUrl) throw new Error("Article editor or image URL is unavailable.");
      editor.focus();
      const range = savedRange && editor.contains(savedRange.commonAncestorContainer) ? savedRange : getEditorRange();
      if(!range) throw new Error("Could not place the image in the article.");
      insertArticleImageAtRange(editor, range, publicUrl, file.name || "Article image");
    } catch(err) { setError(`Article image upload failed: ${err?.message||"Please try again."}`); }
    finally { setUploadingArticleImage(false); }
  };

  const uploadArticleFile = async (file) => {
    if(!file) return;
    if(file.size > 25*1024*1024){setError("Article files must be 25 MB or smaller.");return;}
    setUploadingArticleImage(true); setError("");
    try {
      const ext=(file.name.split(".").pop()||"bin").toLowerCase().replace(/[^a-z0-9]/g,"") || "bin"; const filename=`${Date.now()}-${Math.random().toString(36).slice(2,9)}.${ext}`;
      let publicUrl=""; let lastError=null;
      for (const bucket of ["journal-article","journal-gallery"]) {
        const path=`${session.user.id}/article-files/${filename}`;
        const {error:uploadError}=await supabase.storage.from(bucket).upload(path,file,{cacheControl:"3600",upsert:false,contentType:file.type||"application/octet-stream"});
        if(uploadError){lastError=uploadError;continue;}
        const {data}=supabase.storage.from(bucket).getPublicUrl(path);
        if(data?.publicUrl){publicUrl=data.publicUrl;break;}
      }
      if(!publicUrl && file.size <= 5 * 1024 * 1024) publicUrl = await fileToDataUrl(file);
      if(!publicUrl) throw lastError || new Error("Could not create a public article file URL. Check Storage policies or use a file under 5 MB.");
      const editor=blogContentRef.current; if(!editor) throw new Error("Article editor is unavailable.");
      editor.focus(); const range=getEditorRange(); if(!range) throw new Error("Could not place the file."); range.deleteContents(); const p=document.createElement("p"); p.innerHTML=`<a href="${publicUrl}" target="_blank" rel="noreferrer noopener" download="${file.name.replace(/"/g,"") }"><strong>Open / download ${file.name}</strong> <span>· ${formatFileSize(file.size)}</span></a>`; range.insertNode(p); const br=document.createElement("p"); br.innerHTML="<br/>"; p.insertAdjacentElement("afterend",br); setBlogContent(editor.innerHTML);
    } catch(err){setError(`Article file upload failed: ${err?.message||"Please try again."}`);} finally{setUploadingArticleImage(false);}
  };

  const handleArticleEditorClick = (e) => {
    const target = e.target;
    if (target?.tagName === "IMG") {
      setSelectedArticleImage(target);
      return;
    }
    setSelectedArticleImage(null);
  };

  const resizeSelectedArticleImage = (percent) => {
    const editor = blogContentRef.current;
    if (!editor || !selectedArticleImage || !editor.contains(selectedArticleImage)) return;
    const width = Math.min(100, Math.max(10, Number(percent) || 100));
    selectedArticleImage.style.width = `${width}%`;
    selectedArticleImage.style.height = "auto";
    selectedArticleImage.style.maxWidth = "100%";
    setBlogContent(editor.innerHTML);
  };

  const handleArticlePaste = async (e) => {
    const items = Array.from(e.clipboardData?.items || []);
    const imageItem = items.find(item => item.type.startsWith("image/"));
    const editor = blogContentRef.current;
    const savedRange = getEditorRange();
    if (imageItem) {
      e.preventDefault();
      await uploadArticleImage(imageItem.getAsFile(), savedRange);
      return;
    }

    // Also support copying an image from a web page where the clipboard
    // provides HTML instead of an image File.
    const html = e.clipboardData?.getData("text/html") || "";
    const match = html.match(/<img[^>]+src=["'](https?:\/\/[^"']+)["'][^>]*>/i);
    if (match && editor && savedRange) {
      e.preventDefault();
      insertArticleImageAtRange(editor, savedRange, match[1], "Article image");
    }
  };

  const publishBlog = async (e) => {
    e.preventDefault();
    if (!blogTitle.trim() || !blogExcerpt.trim() || !blogContent.trim() || publishingBlog) return;
    setPublishingBlog(true); setError(""); setBlogSent(false);
    const slug = blogSlug.trim() || blogTitle.trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
    const payload = { title: blogTitle.trim(), slug, category: blogCategory, excerpt: blogExcerpt.trim(), content: blogContent.trim(), read_minutes: Number(blogReadMinutes)||5, published: true, published_at: new Date().toISOString(), created_by: session.user.id };
    if(editingBlogId){
      if(String(editingBlogId).startsWith("local-")){ const next=blogPosts.map(post=>post.id===editingBlogId?{...post,...payload}:post); setBlogPosts(next); localStorage.setItem("tasken-blog-posts",JSON.stringify(next)); }
      else { const {data,error:blogError}=await supabase.from("blog_posts").update(payload).eq("id",editingBlogId).select().single(); if(blogError){setError(blogError.message);setPublishingBlog(false);return;} setBlogPosts(current=>current.map(post=>post.id===editingBlogId?data:post)); }
    } else {
      const { data, error: blogError } = await supabase.from("blog_posts").insert(payload).select().single();
      if (blogError) { const localPost={...payload,id:`local-${Date.now()}`}; const next=[localPost,...blogPosts]; setBlogPosts(next); localStorage.setItem("tasken-blog-posts",JSON.stringify(next)); setError(`Blog saved locally. Run the blog migration SQL to publish it to Supabase: ${blogError.message}`); }
      else { const next=[data,...blogPosts]; setBlogPosts(next); localStorage.setItem("tasken-blog-posts",JSON.stringify(next)); }
    }
    cancelEditBlog(); setPublishingBlog(false); setBlogSent(true); setTimeout(()=>setBlogSent(false),3500);
  };

  const uploadGalleryImage = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!galleryFiles.length || uploadingGallery) return;
    setUploadingGallery(true); setError("");
    const results = [];
    const failed = [];
    try {
      for (const file of galleryFiles) {
        try {
          if (!file.type.startsWith("image/")) throw new Error("not an image file");
          if (file.size > 10 * 1024 * 1024) throw new Error("larger than 10 MB");
          const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
          const path = `${session.user.id}/${Date.now()}-${Math.random().toString(36).slice(2,9)}-${Math.random().toString(36).slice(2,6)}.${ext}`;
          const { error: uploadError } = await supabase.storage.from("journal-gallery").upload(path, file, { cacheControl:"3600", upsert:false, contentType:file.type });
          if (uploadError) throw uploadError;
          const { data: publicData } = supabase.storage.from("journal-gallery").getPublicUrl(path);
          if (!publicData?.publicUrl) throw new Error("could not create a public image URL");
          const { data, error: insertError } = await supabase.from("journal_gallery").insert({ image_url:publicData.publicUrl, storage_path:path, caption:galleryCaption.trim(), alt_text:galleryCaption.trim() || file.name, created_by:session.user.id }).select().single();
          if (insertError) {
            await supabase.storage.from("journal-gallery").remove([path]);
            throw insertError;
          }
          results.push(data);
        } catch (fileError) {
          failed.push(`${file.name}: ${fileError?.message || "upload failed"}`);
        }
      }
      if (results.length) setGalleryImages(current => [...results, ...current]);
      if (failed.length) setError(`${results.length} uploaded. ${failed.length} failed — ${failed.slice(0,3).join(" | ")}`);
      if (results.length === galleryFiles.length) {
        setGalleryFiles([]); setGalleryCaption("");
        if (form) form.reset();
      } else {
        const failedNames = new Set(failed.map(item => item.split(":")[0]));
        setGalleryFiles(current => current.filter(file => failedNames.has(file.name)));
      }
    } catch (err) {
      setError(`Gallery upload failed: ${err?.message || "Please try again."}`);
    } finally { setUploadingGallery(false); }
  };
  const deleteGalleryImage = async (item) => {
    if(!window.confirm("Delete this gallery image?")) return;
    const {error:deleteError}=await supabase.from("journal_gallery").delete().eq("id",item.id);
    if(deleteError){setError(deleteError.message);return;}
    if(item.storage_path) await supabase.storage.from("journal-gallery").remove([item.storage_path]);
    setGalleryImages(current=>current.filter(x=>x.id!==item.id));
  };

  const filteredUsers = users.filter((user) => `${user.username || ""} ${user.full_name || ""} ${user.email || ""}`.toLowerCase().includes(search.toLowerCase()));
  const filteredFinanceUsers = users.filter((user) => `${user.username || ""} ${user.full_name || ""} ${user.email || ""}`.toLowerCase().includes(financeSearch.trim().toLowerCase()));
  const totalStudyMinutes = records.reduce((sum, item) => sum + Number(item.lecture_minutes || 0), 0);
  const totalQuestions = records.reduce((sum, item) => sum + Number(item.questions_done || 0), 0);
  const activeGoals = goals.filter((goal) => goal.status === "active").length;
  const todayKey = new Date().toISOString().slice(0, 10);
  const activeToday = new Set(records.filter((r) => r.record_date === todayKey).map((r) => r.user_id)).size;

  const userSummary = (userId) => {
    const userRecords = records.filter((r) => r.user_id === userId);
    const userTasks = tasks.filter((t) => t.user_id === userId);
    const userGoals = goals.filter((g) => g.user_id === userId && g.status === "active");
    const minutes = userRecords.reduce((sum, r) => sum + Number(r.lecture_minutes || 0), 0);
    const questions = userRecords.reduce((sum, r) => sum + Number(r.questions_done || 0), 0);
    const completed = userTasks.filter((t) => t.status === "completed").length;
    const days = [...new Set(userRecords.map(r=>r.record_date).filter(Boolean))].sort();
    let streak=0, cursor=new Date();
    const daySet=new Set(days);
    while(daySet.has(cursor.toISOString().slice(0,10))){ streak++; cursor.setDate(cursor.getDate()-1); }
    return { days:days.length, hours:`${Math.floor(minutes / 60)}h ${minutes % 60}m`, questions, completed, totalTasks:userTasks.length, goals:userGoals.length, streak };
  };

  const userStateFor = (userId) => userStates.find(s=>s.user_id===userId) || {};
  const financialSnapshotFor = (userId) => {
    const state=userStateFor(userId); const money=Array.isArray(state.money)?state.money:[]; const investments=Array.isArray(state.investments)?state.investments:[]; const assets=Array.isArray(state.assets)?state.assets:[]; const liabilities=Array.isArray(state.liabilities)?state.liabilities:[];
    const income=money.filter(x=>x.type==="income").reduce((a,x)=>a+Number(x.amount||0),0); const expense=money.filter(x=>x.type==="expense").reduce((a,x)=>a+Number(x.amount||0),0); const savings=money.filter(x=>x.type==="saving").reduce((a,x)=>a+Number(x.amount||0),0);
    const cash=income-expense-savings; const portfolio=investments.reduce((a,x)=>a+Number(x.value||0),0); const other=assets.reduce((a,x)=>a+Number(x.value||0),0); const debt=liabilities.reduce((a,x)=>a+Number(x.value||0),0);
    return {income,expense,savings,cash,portfolio,other,debt,networth:portfolio+cash+other-debt};
  };
  const openUserDetail = (user) => {
    const state = userStateFor(user.id);
    setSelectedUser(user);
    setSelectedUserDetail({ summary:userSummary(user.id), tasks:tasks.filter(t=>t.user_id===user.id), records:records.filter(r=>r.user_id===user.id), goals:goals.filter(g=>g.user_id===user.id), habits:Array.isArray(state.habits)?state.habits:[] });
  };

  useEffect(() => {
    if (!selectedUser) return;
    const state = userStateFor(selectedUser.id);
    setSelectedUserDetail({ summary:userSummary(selectedUser.id), tasks:tasks.filter(t=>t.user_id===selectedUser.id), records:records.filter(r=>r.user_id===selectedUser.id), goals:goals.filter(g=>g.user_id===selectedUser.id), habits:Array.isArray(state.habits)?state.habits:[] });
  }, [selectedUser, users, records, tasks, goals, userStates]);


  return (
    <div className="subpage-shell tasken-app-shell admin-page-shell">
      <aside className="subpage-side-rail admin-rail"><button className="back-link" onClick={onBack}><ArrowLeft size={16} /> Back to dashboard</button><div className="subpage-brand"><div className="brand">TRACKEN<span>.</span></div><span>ADMIN CENTER</span></div><div className="subpage-side-note admin-note"><ShieldCheck size={20} /><strong>Owner controls.</strong><p>Send official updates and review platform-wide study activity.</p></div></aside>
      <div className="subpage-main">
        <header className="subpage-topbar"><div><span className="card-kicker">ADMIN CENTER</span><h1>Run TRACKEN.</h1></div><div className="subpage-actions"><button className="dashboard-theme-button theme-control" onClick={toggleTheme} aria-label="Toggle dark mode" title="Toggle dark mode"><Moon size={17} /><span>{theme === "light" ? "Dark mode" : "Light mode"}</span></button><button className="secondary-cta compact-cta" onClick={onBack}>Dashboard <ArrowRight size={16} /></button></div></header>
        <main className="subpage-content">
          {error && <div className="dashboard-error">{error}</div>}
          <section className="admin-stat-grid"><AdminStat icon={Users} label="Registered accounts" value={users.length} meta={`${activeToday} active today`} /><AdminStat icon={Clock3} label="Total study time" value={`${Math.floor(totalStudyMinutes / 60)}h`} meta={`${totalStudyMinutes % 60}m extra`} /><AdminStat icon={BookOpen} label="Questions solved" value={totalQuestions.toLocaleString()} meta="Across saved records" /><AdminStat icon={Target} label="Active goals" value={activeGoals} meta="Currently in progress" /></section>
          <section className="admin-panel admin-broadcast-panel">
            <div className="panel-head"><div><span className="card-kicker">BROADCAST</span><h2>Publish an update</h2><p>Send rich content, tables, images or downloadable files to everyone or one account.</p></div><Send size={21}/></div>
            <form className="admin-send-form" onSubmit={sendUpdate}><label><span>Audience</span><select value={target} onChange={e=>setTarget(e.target.value)}><option value="all">Everyone — all registered accounts</option>{users.map(user=><option key={user.id} value={user.id}>{user.username||user.full_name||"Unnamed user"} · {user.email||user.id.slice(0,8)}</option>)}</select></label><label><span>Message type</span><select value={type} onChange={e=>setType(e.target.value)}>{UPDATE_TYPES.map(item=><option key={item}>{item}</option>)}</select></label><label><span>Title</span><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. TRACKEN 4.2.0 is live"/></label><label><span>Update</span><div ref={el=>setBroadcastEditorRef(el)} className="admin-rich-editor" contentEditable suppressContentEditableWarning data-placeholder="Write an update, paste formatted text or tables, and include images…" onInput={e=>{setBroadcastHtml(e.currentTarget.innerHTML);setMessage(e.currentTarget.innerHTML)}} onPaste={e=>{const items=Array.from(e.clipboardData?.items||[]);const img=items.find(i=>i.type.startsWith("image/"));if(img){e.preventDefault();uploadAdminFile(img.getAsFile(),"broadcast").then(file=>{if(!file)return;document.execCommand("insertHTML",false,`<p><img src="${file.url}" alt="${file.name}" style="max-width:100%;height:auto"/></p>`);setBroadcastHtml(e.currentTarget.innerHTML);setMessage(e.currentTarget.innerHTML)}).catch(err=>setError(err.message));}}}/></label><div className="admin-file-picker"><label className="file-picker-button"><UploadCloud size={16}/> {broadcastFile?"Replace file":"Attach file"}<input type="file" onChange={e=>setBroadcastFile(e.target.files?.[0]||null)}/></label>{broadcastFile&&<span><FileText size={15}/>{broadcastFile.name} · {formatFileSize(broadcastFile.size)} <button type="button" onClick={()=>setBroadcastFile(null)}>Remove</button></span>}</div><div className="admin-send-footer">{sent?<span className="success-note"><CheckCircle2 size={15}/> Update sent successfully.</span>:<span>Supports rich text, pasted tables/images and files up to 25 MB.</span>}<button className="primary-cta compact-cta" disabled={sending||uploadingBroadcastFile||!title.trim()}>{sending||uploadingBroadcastFile?"Publishing…":"Send update"} <ArrowRight size={16}/></button></div></form>
          </section>

          <section className="admin-panel users-panel admin-candidates-panel"><div className="panel-head"><div><span className="card-kicker">CANDIDATES</span><h2>Registered users</h2><p>Review activity, streaks and the work each account has recorded.</p></div><Users size={21}/></div><div className="admin-search"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name or email…"/></div>{loading?<div className="admin-empty">Loading accounts…</div>:<div className="admin-user-list">{filteredUsers.map(user=>{const summary=userSummary(user.id);return <div className="admin-user-row admin-user-row-expanded" key={user.id}><div className="admin-user-avatar">{(user.username||user.full_name||user.email||"U").charAt(0).toUpperCase()}</div><div className="admin-user-main"><strong>{user.username||user.full_name||"Unnamed user"}</strong><small>{user.email||user.id}</small></div><div className="admin-user-stats"><span><b>{summary.streak}</b> streak</span><span><b>{summary.totalTasks}</b> tasks</span><span><b>{summary.completed}</b> done</span><span><b>{summary.hours}</b> study</span><span><b>{summary.goals}</b> goals</span></div><button className="primary-small admin-view-user" onClick={()=>openUserDetail(user)}>View <ChevronRight size={14}/></button></div>})}{!filteredUsers.length&&<div className="admin-empty">No accounts match your search.</div>}</div>}</section>

          {selectedUser && selectedUserDetail && <div className="admin-user-detail-overlay" role="dialog" aria-modal="true" onClick={()=>setSelectedUser(null)}><article className="admin-user-detail" onClick={e=>e.stopPropagation()}><div className="panel-head"><div><span className="card-kicker">USER DETAIL</span><h2>{selectedUser.username||selectedUser.full_name||"Unnamed user"}</h2><p>{selectedUser.email}</p></div><button className="icon-close" onClick={()=>setSelectedUser(null)}><X size={18}/></button></div><div className="admin-detail-metrics"><span><b>{selectedUserDetail.summary.streak}</b> day streak</span><span><b>{selectedUserDetail.summary.totalTasks}</b> tasks</span><span><b>{selectedUserDetail.summary.hours}</b> study</span><span><b>{selectedUserDetail.summary.goals}</b> active goals</span></div><div className="admin-detail-grid"><section><span className="card-kicker">TASKS</span>{selectedUserDetail.tasks.length?selectedUserDetail.tasks.slice(0,30).map(t=><div className="admin-detail-row" key={t.id}><span>{t.title||"Untitled task"}</span><b>{t.status||"pending"}</b></div>):<p className="admin-empty-inline">No tasks recorded.</p>}</section><section><span className="card-kicker">STUDY</span><div className="admin-detail-stat"><b>{selectedUserDetail.summary.hours}</b><small>total recorded study</small></div><div className="admin-detail-stat"><b>{selectedUserDetail.summary.questions}</b><small>questions solved</small></div></section><section><span className="card-kicker">GOALS</span>{selectedUserDetail.goals.length?selectedUserDetail.goals.map(g=><div className="admin-detail-row" key={g.id}><span>{g.title}</span><b>{g.status}</b></div>):<p className="admin-empty-inline">No active goals.</p>}</section><section><span className="card-kicker">HABITS</span>{selectedUserDetail.habits.length?selectedUserDetail.habits.slice(0,20).map((h,i)=><div className="admin-detail-row" key={h.id||i}><span>{h.title||h.name||"Habit"}</span><b>{h.completedToday||h.completed?"Done":"Active"}</b></div>):<p className="admin-empty-inline">No habits recorded.</p>}</section></div></article></div>}
          <section className="admin-panel admin-history-panel">
            <div className="panel-head">
              <div>
                <span className="card-kicker">MESSAGE HISTORY</span>
                <h2>Sent updates</h2>
                <p>A complete record of every update you have sent from the Admin Center.</p>
              </div>
              <Bell size={21} />
            </div>
            <div className="admin-history-list">
              {sentHistory.length ? sentHistory.map((item) => {
                const recipient = item.recipient_user_id
                  ? (users.find((user) => user.id === item.recipient_user_id)?.email || "Selected account")
                  : "All registered accounts";
                return editingUpdateId===item.id ? (
                  <article className="admin-history-row admin-edit-row" key={item.id}>
                    <div className="admin-history-icon"><PenLine size={17} /></div>
                    <div className="admin-history-main">
                      <div className="admin-inline-form"><select value={updateEdit.type} onChange={e=>setUpdateEdit({...updateEdit,type:e.target.value})}>{UPDATE_TYPES.map(x=><option key={x}>{x}</option>)}</select><input value={updateEdit.title} onChange={e=>setUpdateEdit({...updateEdit,title:e.target.value})}/><textarea value={updateEdit.message} onChange={e=>setUpdateEdit({...updateEdit,message:e.target.value})}/><div className="admin-inline-actions"><button className="primary-small" onClick={saveUpdateEdit}>Save changes</button><button className="ghost-small" onClick={cancelEditUpdate}>Cancel</button></div></div>
                    </div>
                  </article>
                ) : (
                  <article className="admin-history-row" key={item.id}>
                    <div className="admin-history-icon"><Megaphone size={17} /></div>
                    <div className="admin-history-main">
                      <div className="admin-history-top"><span>{item.type || "Notice"}</span><time>{new Date(item.created_at).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</time></div>
                      <h3>{item.title}</h3>{(() => { const payload=parseUpdatePayload(item.message); return <><div className="admin-history-rich" dangerouslySetInnerHTML={{__html:normalizeArticleHtml(payload.html)}} />{payload.attachment?.url&&<a className="admin-history-attachment" href={payload.attachment.url} target="_blank" rel="noreferrer noopener"><FileText size={16}/><span>{payload.attachment.name}</span><Download size={15}/></a>}</> })()}<small>Sent to <strong>{recipient}</strong></small>
                    </div>
                    <div className="admin-history-actions"><button className="ghost-small" onClick={()=>startEditUpdate(item)} title="Edit update"><PenLine size={14}/> Edit</button><button className="danger-small" onClick={()=>deleteUpdate(item.id)} title="Delete update"><Trash2 size={14}/> Delete</button></div>
                  </article>
                );
              }) : (
                <div className="admin-history-empty">
                  <Send size={24} />
                  <h3>No messages sent yet</h3>
                  <p>Every update you publish will appear here for your records.</p>
                </div>
              )}
            </div>
          </section>
          <section className="admin-panel blog-admin-panel">
             <div className="panel-head"><div><span className="card-kicker">BLOG STUDIO</span><h2>{editingBlogId ? "Edit article" : "Write a new article"}</h2><p>Publish a blog article that appears on the public Blog page.</p></div><PenLine size={21}/></div>
             <form className="blog-admin-form" onSubmit={publishBlog}><div className="blog-admin-grid"><label><span>Title</span><input value={blogTitle} onChange={(e)=>setBlogTitle(e.target.value)} placeholder="e.g. How to build a study routine that sticks"/></label><label><span>Slug</span><input value={blogSlug} onChange={(e)=>setBlogSlug(e.target.value)} placeholder="optional-url-slug"/></label><label><span>Category</span><select value={blogCategory} onChange={(e)=>setBlogCategory(e.target.value)}><option>Productivity</option><option>Study tips</option><option>Discipline</option><option>Mindset</option><option>Career</option><option>Product Updates</option></select></label><label><span>Read time</span><input type="number" min="1" max="30" value={blogReadMinutes} onChange={(e)=>setBlogReadMinutes(e.target.value)}/></label></div><label><span>Excerpt</span><textarea value={blogExcerpt} onChange={(e)=>setBlogExcerpt(e.target.value)} placeholder="A short description shown on the Blog page…" rows="3"/></label><div className="article-asset-toolbar"><label className="file-picker-button"><FileText size={16}/> Add image / file<input type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip" onChange={e=>{const f=e.target.files?.[0]; if(f?.type?.startsWith("image/")) uploadArticleImage(f); else if(f) uploadArticleFile(f); e.target.value="";}}/></label><span>Images appear inline. Other files become clean view/download links.</span></div><label className="article-editor-label"><span>Article content <small>{uploadingArticleImage ? "Uploading asset…" : "Paste images directly, then click an image to resize it."}</small></span>{selectedArticleImage && <div className="article-image-toolbar" role="toolbar" aria-label="Resize selected image"><strong>Image size</strong><button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>resizeSelectedArticleImage(25)}>25%</button><button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>resizeSelectedArticleImage(50)}>50%</button><button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>resizeSelectedArticleImage(75)}>75%</button><button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>resizeSelectedArticleImage(100)}>Full</button></div>}<div ref={blogContentRef} className="article-rich-editor" contentEditable suppressContentEditableWarning onInput={e=>setBlogContent(e.currentTarget.innerHTML)} onClick={handleArticleEditorClick} onPaste={handleArticlePaste} dangerouslySetInnerHTML={{__html:normalizeArticleHtml(blogContent)}} data-placeholder="Write your full blog article here…" /></label><div className="admin-send-footer">{blogSent?<span className="success-note"><CheckCircle2 size={15}/> Article published.</span>:<span>Published articles appear on the public Blog.</span>}<button className="primary-cta compact-cta" disabled={publishingBlog||!blogTitle.trim()||!blogExcerpt.trim()||!blogContent.trim()}>{publishingBlog?"Saving…":editingBlogId?"Save article":"Publish article"} <ArrowRight size={16}/></button></div></form><div className="blog-admin-history"><div className="blog-admin-history-head"><span className="card-kicker">PUBLISHED</span><strong>{blogPosts.length} article{blogPosts.length===1?"":"s"}</strong></div>{blogPosts.slice(0,20).map(post=><div className="blog-admin-row" key={post.id||post.slug}><span className="blog-admin-dot"></span><div className="blog-admin-row-copy"><strong>{post.title}</strong><small>{post.category||"Insights"} · {post.published_at?new Date(post.published_at).toLocaleDateString():"Local draft"}</small></div><div className="admin-row-actions"><button className="ghost-small" onClick={()=>startEditBlog(post)}><PenLine size={14}/> Edit</button><button className="danger-small" onClick={()=>deleteBlog(post.id)}><Trash2 size={14}/> Delete</button></div></div>)}</div>
           </section>

          <section className="admin-panel admin-gallery-panel">
            <div className="panel-head"><div><span className="card-kicker">BLOG GALLERY</span><h2>Build your visual blog.</h2><p>Add multiple images at once. Everything published here appears inside <strong>Gallery of TRACKEN</strong>.</p></div><ImagePlus size={21}/></div>
            <form className="admin-gallery-upload-premium" onSubmit={uploadGalleryImage}>
              <label className="admin-gallery-dropzone">
                <div className="gallery-upload-icon"><UploadCloud size={28}/></div>
                <strong>{galleryFiles.length ? `${galleryFiles.length} image${galleryFiles.length===1?"":"s"} selected` : "Choose images to publish"}</strong>
                <span>JPG, PNG, WEBP or GIF · up to 10 MB each · select multiple</span>
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={e=>setGalleryFiles(Array.from(e.target.files||[]))} />
              </label>
              {galleryFiles.length>0 && <div className="gallery-selected-list">{galleryFiles.map(file=><span key={`${file.name}-${file.size}`}>{file.name}</span>)}</div>}
              <div className="gallery-upload-bottom"><label><span>Shared caption <small>(optional)</small></span><input value={galleryCaption} onChange={e=>setGalleryCaption(e.target.value)} placeholder="e.g. TRACKEN behind the scenes"/></label><button className="primary-cta compact-cta" disabled={!galleryFiles.length||uploadingGallery}>{uploadingGallery?`Uploading ${galleryFiles.length} image${galleryFiles.length===1?"":"s"}…`:`Publish ${galleryFiles.length||""} image${galleryFiles.length===1?"":"s"}`} <ArrowRight size={16}/></button></div>
            </form>
            <div className="admin-gallery-grid">{galleryImages.map(item=><article key={item.id}><img src={item.image_url} alt={item.alt_text||"Gallery"}/><div><strong>{item.caption||"TRACKEN Gallery"}</strong><small>{item.created_at?new Date(item.created_at).toLocaleDateString():"Published"}</small></div><button className="danger-small" onClick={()=>deleteGalleryImage(item)}><Trash2 size={14}/> Delete</button></article>)}{!galleryImages.length&&<div className="admin-empty">No gallery images yet.</div>}</div>
          </section>

          <section className="admin-panel admin-networth-panel">
            <div className="panel-head"><div><span className="card-kicker">FINANCIAL OVERVIEW</span><h2>User net worth</h2><p>Live financial values calculated from each user's current TRACKEN state.</p></div><CircleDollarSign size={21}/></div>
            <form className="admin-finance-search" role="search" onSubmit={e=>{e.preventDefault();setFinanceSearch(financeSearchInput.trim())}}><Search size={16}/><input value={financeSearchInput} onChange={e=>setFinanceSearchInput(e.target.value)} placeholder="Search by user name or email…" aria-label="Search financial profiles by name or email"/><button className="admin-finance-search-submit" type="submit"><Search size={14}/> Search</button>{(financeSearch||financeSearchInput)&&<button className="admin-finance-search-clear" type="button" onClick={()=>{setFinanceSearch("");setFinanceSearchInput("")}} aria-label="Clear financial search"><X size={15}/></button>}<span>{filteredFinanceUsers.length} {filteredFinanceUsers.length===1?"profile":"profiles"}</span></form>
            <div className="admin-networth-list">{loading ? <div className="admin-empty">Loading financial profiles…</div> : users.length ? filteredFinanceUsers.map(user=>{ const fin=financialSnapshotFor(user.id); return <article className="admin-networth-row" key={`nw-${user.id}`}><div className="admin-user-avatar">{(user.username||user.full_name||user.email||"U").charAt(0).toUpperCase()}</div><div className="admin-networth-user"><strong>{user.username||user.full_name||"Unnamed candidate"}</strong><small>{user.email||user.id}</small></div><div className="admin-networth-metrics"><span><small>Net worth</small><b className={fin.networth>=0?"positive":"negative"}>₹{fin.networth.toLocaleString("en-IN")}</b></span><span><small>Cash</small><b>₹{fin.cash.toLocaleString("en-IN")}</b></span><span><small>Portfolio</small><b>₹{fin.portfolio.toLocaleString("en-IN")}</b></span><span><small>Liabilities</small><b>₹{fin.debt.toLocaleString("en-IN")}</b></span></div></article>}) : <div className="admin-empty">No registered users yet.</div>}{users.length && !filteredFinanceUsers.length ? <div className="admin-empty">No financial profiles match “{financeSearch}”.</div> : null}</div>
          </section>
        </main>
      </div>
    </div>
  );
}
function AdminStat({ icon: Icon, label, value, meta }) {
  return <article className="admin-stat"><div className="stat-icon"><Icon size={19} /></div><span>{label}</span><strong>{value}</strong><small>{meta}</small></article>;
}

const GOAL_CATEGORIES = ["Academic", "Exam", "Career", "Skill", "Personal", "Other"];
const GOAL_PRIORITIES = ["low", "medium", "high"];

function InlineGoalsPanel({ session, goals, setGoals, tasks, onError }) {
  const userId = session.user.id;
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title:"", category:"Academic", target_date:"", priority:"medium", description:"", target_value:"", current_value:"", unit:"" });
  const resetForm = () => { setForm({title:"",category:"Academic",target_date:"",priority:"medium",description:"",target_value:"",current_value:"",unit:""}); setEditingId(null); setShowForm(false); };
  const openEdit = (goal) => { setEditingId(goal.id); setForm({title:goal.title||"",category:goal.category||"Academic",target_date:goal.target_date||"",priority:goal.priority||"medium",description:goal.description||"",target_value:goal.target_value??"",current_value:goal.current_value??"",unit:goal.unit||""}); setShowForm(true); };
  const saveGoal = () => {
    if (!form.title.trim()) return onError("Please give your goal a name.");
    if (form.target_value !== "" && Number(form.current_value || 0) > Number(form.target_value)) return onError("Current progress cannot be greater than the target.");
    const isEditing=Boolean(editingId); const id=editingId || crypto.randomUUID();
    const payload={user_id:userId,title:form.title.trim(),category:form.category,target_date:form.target_date||null,priority:form.priority,description:form.description.trim()||null,target_value:form.target_value===""?null:Number(form.target_value),current_value:Number(form.current_value||0),unit:form.unit.trim()||null,status:"active"};
    const previous=isEditing?goals.find(g=>g.id===id):null; const optimistic={id,...payload,created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
    setGoals(c=>isEditing?c.map(g=>g.id===id?{...g,...optimistic}:g):[optimistic,...c]); reset();
    const query=isEditing?supabase.from("goals").update(payload).eq("id",id).eq("user_id",userId).select().single():supabase.from("goals").insert(payload).select().single();
    query.then(({data,error})=>{if(error){setGoals(c=>isEditing?c.map(g=>g.id===id?previous:g):c.filter(g=>g.id!==id));return onError(error.message);}if(data)setGoals(c=>c.map(g=>g.id===id?data:g));});
  };
  const deleteGoal=async(goal)=>{if(!window.confirm(`Delete "${goal.title}"?`))return;const {error}=await supabase.from("goals").delete().eq("id",goal.id).eq("user_id",userId);if(error)return onError(error.message);setGoals(current=>current.filter(g=>g.id!==goal.id));};
  const completeGoal=async(goal)=>{const nextStatus=goal.status==="completed"?"active":"completed";const {data,error}=await supabase.from("goals").update({status:nextStatus}).eq("id",goal.id).eq("user_id",userId).select().single();if(error)return onError(error.message);setGoals(current=>current.map(g=>g.id===goal.id?data:g));};
  const statsFor=(goalId)=>{const linked=tasks.filter(t=>String(t.goal_id)===String(goalId));return {total:linked.length,done:linked.filter(t=>t.status==="completed").length};};
  const progressFor=(goal)=>goal.target_value>0?Math.min(100,Math.round(Number(goal.current_value||0)/Number(goal.target_value)*100)):0;
  const active=goals.filter(g=>g.status==="active"), completed=goals.filter(g=>g.status==="completed");
  return <section className="inline-goals-panel">
    <div className="inline-goals-hero"><div><span className="eyebrow"><span></span> GOAL CENTER</span><h2>Give your work a <em>destination.</em></h2><p>Create, edit and update your goals here. Your tasks can stay connected to the goal without sending you to another page.</p></div><button className="primary-cta goals-inline-add" onClick={()=>{resetForm();setShowForm(true)}}><Plus size={17}/> Add goal</button></div>
    {showForm&&<article className="tracker-large-card inline-goal-editor"><div className="panel-heading"><div><span className="card-kicker">{editingId?"EDIT GOAL":"NEW GOAL"}</span><h2>{editingId?"Refine the target.":"What are you working toward?"}</h2></div><button className="icon-close" onClick={resetForm}><X size={18}/></button></div><div className="goal-form-grid inline-goal-form"><label><span>Goal name</span><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. Crack SSC CGL 2027"/></label><label><span>Category</span><select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{GOAL_CATEGORIES.map(x=><option key={x}>{x}</option>)}</select></label><label><span>Target date</span><input type="date" value={form.target_date} onChange={e=>setForm({...form,target_date:e.target.value})}/></label><label><span>Priority</span><select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}>{GOAL_PRIORITIES.map(x=><option key={x} value={x}>{x.charAt(0).toUpperCase()+x.slice(1)}</option>)}</select></label><label><span>Target number <small>optional</small></span><input type="number" min="0" value={form.target_value} onChange={e=>setForm({...form,target_value:e.target.value})} placeholder="100"/></label><label><span>Current progress</span><input type="number" min="0" value={form.current_value} onChange={e=>setForm({...form,current_value:e.target.value})} placeholder="0"/></label><label><span>Unit <small>optional</small></span><input value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})} placeholder="chapters, questions, hours…"/></label><label className="goal-description"><span>Description <small>optional</small></span><textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Why does this goal matter to you?"/></label></div><div className="goal-editor-actions"><button className="secondary-cta" onClick={resetForm}>Cancel</button><button className="primary-cta" onClick={saveGoal} disabled={saving}>{saving?"Saving…":editingId?"Save changes":"Create goal"}<ArrowRight size={16}/></button></div></article>}
    <div className="goals-section-head"><div><span className="card-kicker">ACTIVE GOALS</span><h2>Your targets</h2></div><span className="goal-count">{active.length} active</span></div>
    {active.length?<div className="goal-card-grid inline-goal-grid">{active.map(goal=><GoalCard key={goal.id} goal={goal} progress={progressFor(goal)} stats={statsFor(goal.id)} onEdit={()=>openEdit(goal)} onDelete={()=>deleteGoal(goal)} onComplete={()=>completeGoal(goal)}/>)}</div>:<div className="goals-empty"><Target size={28}/><h3>Nothing on the board yet.</h3><p>Add your first goal and give your daily work a destination.</p><button className="secondary-cta" onClick={()=>{resetForm();setShowForm(true)}}>Create your first goal <ArrowRight size={16}/></button></div>}
    {completed.length>0&&<section className="goals-list-section completed-goals-section"><div className="goals-section-head"><div><span className="card-kicker">COMPLETED</span><h2>Finished goals</h2></div><span className="goal-count">{completed.length}</span></div><div className="goal-card-grid inline-goal-grid">{completed.map(goal=><GoalCard key={goal.id} goal={goal} progress={100} stats={statsFor(goal.id)} completed onEdit={()=>openEdit(goal)} onDelete={()=>deleteGoal(goal)} onComplete={()=>completeGoal(goal)}/>)}</div></section>}
  </section>;
}

function StudySummaryModal({ history=[], onClose }) {
  const studyDays=history.filter(r=>Number(r.daily_score||0)>0||Number(r.lecture_minutes||0)>0||Number(r.questions_done||0)>0||Number(r.pages_read||0)>0);
  const activeDates=new Set(studyDays.map(r=>r.record_date));
  const streakFrom=(set)=>{let run=0;let d=new Date();while(set.has(d.toISOString().slice(0,10))){run++;d.setDate(d.getDate()-1);}return run;};
  const streak=streakFrom(activeDates);
  const bestStreak=(()=>{const sorted=[...activeDates].sort();let best=0,run=0,prev=null;for(const key of sorted){const d=new Date(key+"T12:00:00");if(prev){const diff=Math.round((d-prev)/86400000);run=diff===1?run+1:1;}else run=1;best=Math.max(best,run);prev=d;}return best;})();
  const totalMinutes=history.reduce((a,r)=>a+Number(r.lecture_minutes||0),0);
  const totalLectures=history.reduce((a,r)=>a+Number(r.lectures_watched||0),0);
  const totalQuestions=history.reduce((a,r)=>a+Number(r.questions_done||0),0);
  const totalPages=history.reduce((a,r)=>a+Number(r.pages_read||0),0);
  const avgScore=history.length?Math.round(history.reduce((a,r)=>a+Number(r.daily_score||0),0)/history.length):0;
  const last7=history.filter(r=>{const d=new Date(r.record_date+"T12:00:00");const diff=Math.floor((new Date()-d)/86400000);return diff>=0&&diff<7;});
  const last30=history.filter(r=>{const d=new Date(r.record_date+"T12:00:00");const diff=Math.floor((new Date()-d)/86400000);return diff>=0&&diff<30;});
  return <div className="study-summary-overlay" role="dialog" aria-modal="true"><div className="study-summary-modal"><div className="study-summary-head"><div><span className="card-kicker">STUDY SUMMARY</span><h2>Your consistency, in full.</h2><p>Study evidence collected from your TRACKEN records.</p></div><button className="icon-close" onClick={onClose} aria-label="Close study summary"><X size={18}/></button></div><div className="streak-feature"><div><span>CURRENT STREAK</span><strong>{streak}<small> days</small></strong><p>{streak?"Keep the chain alive today.":"Log study activity today to start your streak."}</p></div><div><span>BEST STREAK</span><strong>{bestStreak}<small> days</small></strong><p>Your longest consecutive run.</p></div></div><div className="study-summary-stats"><div><b>{Math.floor(totalMinutes/60)}h {totalMinutes%60}m</b><span>Total study time</span></div><div><b>{totalLectures.toLocaleString()}</b><span>Lectures</span></div><div><b>{totalQuestions.toLocaleString()}</b><span>Questions</span></div><div><b>{totalPages.toLocaleString()}</b><span>Pages read</span></div><div><b>{studyDays.length}</b><span>Active study days</span></div><div><b>{history.filter(r=>r.exercise_done).length}</b><span>Exercise sessions</span></div><div><b>{avgScore}%</b><span>Average daily score</span></div><div><b>{history.length}</b><span>Records saved</span></div></div><div className="study-summary-periods"><article><span>LAST 7 DAYS</span><strong>{last7.length} active</strong><small>{last7.reduce((a,r)=>a+Number(r.lecture_minutes||0),0)} min · {last7.reduce((a,r)=>a+Number(r.questions_done||0),0)} questions</small></article><article><span>LAST 30 DAYS</span><strong>{last30.length} active</strong><small>{last30.reduce((a,r)=>a+Number(r.lecture_minutes||0),0)} min · {last30.reduce((a,r)=>a+Number(r.questions_done||0),0)} questions</small></article><article><span>RECENT BEST DAY</span><strong>{history.slice().sort((a,b)=>Number(b.daily_score||0)-Number(a.daily_score||0))[0]?.daily_score||0}%</strong><small>Highest recorded daily score</small></article></div><button className="primary-cta study-summary-close" onClick={onClose}>Back to Productivity Engine <ArrowRight size={16}/></button></div></div>;
}

function GoalsPage({ session, goals, setGoals, tasks, taskMeta, setTaskMeta, theme, toggleTheme, onBack, onError }) {
  const userId = session.user.id;
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "", category: "Academic", target_date: "", priority: "medium",
    description: "", target_value: "", current_value: "", unit: ""
  });
  const goalAutomationRules = Array.isArray(taskMeta?.__goal_automations) ? taskMeta.__goal_automations : [];
  const [goalAutomationGoal, setGoalAutomationGoal] = useState("");
  const [goalAutomationTitle, setGoalAutomationTitle] = useState("");
  const [goalAutomationFrequency, setGoalAutomationFrequency] = useState("weekly");
  const [goalAutomationStartDate, setGoalAutomationStartDate] = useState(new Date().toISOString().slice(0,10));
  const [goalAutomationEndDate, setGoalAutomationEndDate] = useState("");
  const [goalAutomationPriority, setGoalAutomationPriority] = useState("medium");
  const [goalAutomationDuration, setGoalAutomationDuration] = useState(30);
  const [goalAutomationSaving, setGoalAutomationSaving] = useState(false);

  const resetForm = () => {
    setForm({ title: "", category: "Academic", target_date: "", priority: "medium", description: "", target_value: "", current_value: "", unit: "" });
    setEditingId(null);
    setShowForm(false);
  };

  const openEdit = (goal) => {
    setEditingId(goal.id);
    setForm({
      title: goal.title || "", category: goal.category || "Academic", target_date: goal.target_date || "",
      priority: goal.priority || "medium", description: goal.description || "",
      target_value: goal.target_value ?? "", current_value: goal.current_value ?? "", unit: goal.unit || ""
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveGoal = async () => {
    if (!form.title.trim()) return onError("Please give your goal a name.");
    if (form.target_value !== "" && Number(form.current_value || 0) > Number(form.target_value)) {
      return onError("Current progress cannot be greater than the target.");
    }
    setSaving(true);
    onError("");
    const payload = {
      user_id: userId, title: form.title.trim(), category: form.category, target_date: form.target_date || null, priority: form.priority,
      description: form.description.trim() || null, target_value: form.target_value === "" ? null : Number(form.target_value),
      current_value: Number(form.current_value || 0), unit: form.unit.trim() || null, status: "active"
    };
    const isEditing=Boolean(editingId); const targetId=editingId || crypto.randomUUID();
    const previous=isEditing ? goals.find(g=>g.id===targetId) : null;
    const optimistic={id:targetId,...payload,created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
    setGoals(current=>isEditing?current.map(g=>g.id===targetId?{...g,...optimistic}:g):[optimistic,...current]);
    resetForm(); setSaving(false);
    const query=isEditing ? supabase.from("goals").update(payload).eq("id",targetId).eq("user_id",userId).select().single() : supabase.from("goals").insert(payload).select().single();
    query.then(({data,error})=>{
      if(error){setGoals(current=>isEditing?current.map(g=>g.id===targetId?previous:g):current.filter(g=>g.id!==targetId));return onError(error.message);}
      if(data)setGoals(current=>current.map(g=>g.id===targetId?data:g));
    });
  };

  const deleteGoal = async (goal) => {
    if (!window.confirm(`Delete "${goal.title}"?`)) return;
    const { error } = await supabase.from("goals").delete().eq("id", goal.id).eq("user_id", userId);
    if (error) return onError(error.message);
    setGoals((current) => current.filter((item) => item.id !== goal.id));
    setTaskMeta(current=>({...current,__goal_automations:(current.__goal_automations||[]).filter(r=>String(r.goalId)!==String(goal.id))}));
  };

  const completeGoal = async (goal) => {
    const nextStatus = goal.status === "completed" ? "active" : "completed";
    const { data, error } = await supabase.from("goals").update({ status: nextStatus }).eq("id", goal.id).eq("user_id", userId).select().single();
    if (error) return onError(error.message);
    setGoals((current) => current.map((item) => item.id === goal.id ? data : item));
  };

  const createGoalAutomation = () => {
    const goal = goals.find(g=>String(g.id)===String(goalAutomationGoal));
    const title = goalAutomationTitle.trim() || (goal ? `Work on ${goal.title}` : "");
    if (!goal) return onError("Choose an active goal for this automation.");
    if (goal.status !== "active") return onError("Only active goals can have automations.");
    const endDate = goalAutomationEndDate || goal.target_date || "";
    if (!endDate) return onError("Set a target date on the goal or choose an automation end date.");
    if (endDate < goalAutomationStartDate) return onError("End date must be on or after the start date.");
    if (goal.target_date && endDate > goal.target_date) return onError("Automation cannot run past the goal target date.");
    if (goalAutomationSaving) return;
    setGoalAutomationSaving(true);
    const rule={id:crypto.randomUUID(),goalId:goal.id,title,frequency:goalAutomationFrequency,startDate:goalAutomationStartDate,endDate,priority:goalAutomationPriority,duration:Number(goalAutomationDuration)||30,enabled:true,createdAt:new Date().toISOString()};
    setTaskMeta(current=>({...current,__goal_automations:[rule,...(Array.isArray(current.__goal_automations)?current.__goal_automations:[])]}));
    setGoalAutomationTitle("");
    setGoalAutomationEndDate("");
    setGoalAutomationSaving(false);
  };
  const toggleGoalAutomation = (ruleId) => setTaskMeta(current=>({...current,__goal_automations:(current.__goal_automations||[]).map(r=>r.id===ruleId?{...r,enabled:!r.enabled}:r)}));
  const deleteGoalAutomation = (ruleId) => {
    if (!window.confirm("Delete this goal automation? Existing tasks it already created will stay.")) return;
    setTaskMeta(current=>({...current,__goal_automations:(current.__goal_automations||[]).filter(r=>r.id!==ruleId)}));
  };

  const getTaskStats = (goalId) => {
    const linked = tasks.filter((task) => task.goal_id === goalId);
    return { total: linked.length, done: linked.filter((task) => task.status === "completed").length };
  };

  const progress = (goal) => {
    if (!goal.target_value || Number(goal.target_value) <= 0) return 0;
    return Math.min(100, Math.round((Number(goal.current_value || 0) / Number(goal.target_value)) * 100));
  };

  const activeGoals = goals.filter((goal) => goal.status === "active");
  const completedGoals = goals.filter((goal) => goal.status === "completed");

  return (
    <div className="goals-page goals-page-embedded">
      <main className="goals-content">
        <section className="goals-hero">
          <div>
            <span className="card-kicker">YOUR BIGGER PICTURE</span>
            <h1>Goals that&nbsp;<em>move you.</em></h1>
            <p>Turn a long-term ambition into a clear target, then let your daily work move it forward.</p>
          </div>
          <button className="primary-cta goals-add-button" onClick={() => { resetForm(); setShowForm(true); }}><Plus size={17} /> Add goal</button>
        </section>

        {showForm && (
          <section className="goal-editor">
            <div className="goal-editor-head">
              <div><span className="card-kicker">{editingId ? "EDIT GOAL" : "NEW GOAL"}</span><h2>{editingId ? "Refine the target." : "What are you working toward?"}</h2></div>
              <button className="icon-close" onClick={resetForm}><X size={18} /></button>
            </div>
            <div className="goal-form-grid">
              <label><span>Goal name</span><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Crack SSC CGL 2027" /></label>
              <label><span>Category</span><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{GOAL_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label><span>Target date</span><input type="date" value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })} /></label>
              <label><span>Priority</span><select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>{GOAL_PRIORITIES.map((item) => <option key={item} value={item}>{item.charAt(0).toUpperCase() + item.slice(1)}</option>)}</select></label>
              <label><span>Target number <small>optional</small></span><input type="number" min="0" value={form.target_value} onChange={(e) => setForm({ ...form, target_value: e.target.value })} placeholder="e.g. 100" /></label>
              <label><span>Current progress</span><input type="number" min="0" value={form.current_value} onChange={(e) => setForm({ ...form, current_value: e.target.value })} placeholder="0" /></label>
              <label><span>Unit <small>optional</small></span><input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="hours, chapters, questions..." /></label>
              <label className="goal-description"><span>Description <small>optional</small></span><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Why does this goal matter to you?" /></label>
            </div>
            <div className="goal-editor-actions"><button className="secondary-cta" onClick={resetForm}>Cancel</button><button className="primary-cta" onClick={saveGoal} disabled={saving}>{saving ? "Saving…" : editingId ? "Save changes" : "Create goal"} <ArrowRight size={16} /></button></div>
          </section>
        )}

        <section className="goals-list-section">
          <div className="goals-section-head"><div><span className="card-kicker">ACTIVE GOALS</span><h2>Your targets</h2></div><span className="goal-count">{activeGoals.length} active</span></div>
          {activeGoals.length === 0 ? (
            <div className="goals-empty"><Target size={28} /><h3>Nothing on the board yet.</h3><p>Add your first goal and give your daily work a destination.</p><button className="secondary-cta" onClick={() => { resetForm(); setShowForm(true); }}>Create your first goal <ArrowRight size={16} /></button></div>
          ) : (
            <div className="goal-card-grid">
              {activeGoals.map((goal) => {
                const p = progress(goal); const stats = getTaskStats(goal.id);
                return <GoalCard key={goal.id} goal={goal} progress={p} stats={stats} onEdit={() => openEdit(goal)} onDelete={() => deleteGoal(goal)} onComplete={() => completeGoal(goal)} />;
              })}
            </div>
          )}
        </section>

                <section className="goal-automation-card tracker-large-card">
          <div className="panel-heading"><div><span className="card-kicker">GOAL AUTOMATION · 02</span><h2>Turn goals into planned action.</h2><p className="tracker-copy">Choose an active goal once. TRACKEN can create linked action tasks on a daily, weekday, weekly or monthly rhythm until the goal deadline.</p></div><Zap size={20}/></div>
          <div className="goal-automation-form-grid">
            <select value={goalAutomationGoal} onChange={e=>{const id=e.target.value;setGoalAutomationGoal(id);const g=goals.find(x=>String(x.id)===String(id));if(g&&!goalAutomationTitle)setGoalAutomationTitle(`Work on ${g.title}`);}}>
              <option value="">Choose an active goal</option>{activeGoals.map(g=><option key={g.id} value={g.id}>{g.title}{g.target_date?` · due ${g.target_date}`:""}</option>)}
            </select>
            <input value={goalAutomationTitle} onChange={e=>setGoalAutomationTitle(e.target.value)} placeholder="Task to create"/>
            <select value={goalAutomationFrequency} onChange={e=>setGoalAutomationFrequency(e.target.value)}><option value="daily">Every day</option><option value="weekdays">Every weekday</option><option value="weekly">Every week</option><option value="monthly">Every month</option></select>
            <input type="date" value={goalAutomationStartDate} onChange={e=>setGoalAutomationStartDate(e.target.value)} aria-label="Automation start date"/>
            <input type="date" value={goalAutomationEndDate} onChange={e=>setGoalAutomationEndDate(e.target.value)} title="Optional: defaults to goal target date" aria-label="Automation end date"/>
            <select value={goalAutomationPriority} onChange={e=>setGoalAutomationPriority(e.target.value)}><option value="urgent">Urgent</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>
            <select value={goalAutomationDuration} onChange={e=>setGoalAutomationDuration(Number(e.target.value))}><option value="15">15 min</option><option value="30">30 min</option><option value="45">45 min</option><option value="60">1 hour</option><option value="90">90 min</option><option value="120">2 hours</option></select>
            <button className="primary-small goal-automation-create" onClick={createGoalAutomation} disabled={goalAutomationSaving}><Zap size={15}/>{goalAutomationSaving?"Creating…":"Create automation"}</button>
          </div>
          <div className="automation-list goal-automation-list">
            {goalAutomationRules.map(rule=>{const g=goals.find(x=>String(x.id)===String(rule.goalId));return <div className={`automation-rule ${rule.enabled?"active":"paused"}`} key={rule.id}><div className="automation-rule-icon"><Target size={16}/></div><div className="automation-rule-main"><b>{rule.title}</b><small>{g?.title||"Goal unavailable"} · {({daily:"Every day",weekdays:"Every weekday",weekly:"Every week",monthly:"Every month"}[rule.frequency]||"Scheduled")} · until {rule.endDate||g?.target_date||"goal deadline"}</small></div><span className="automation-status">{rule.enabled?"ACTIVE":"PAUSED"}</span><button className="ghost-small" onClick={()=>toggleGoalAutomation(rule.id)}>{rule.enabled?"Pause":"Resume"}</button><button className="ghost-small danger-ghost" onClick={()=>deleteGoalAutomation(rule.id)}><Trash2 size={14}/></button></div>})}
            {!goalAutomationRules.length&&<div className="automation-empty"><Zap size={22}/><div><b>No goal automations yet.</b><small>Connect a goal to a repeatable action and TRACKEN will handle the task creation.</small></div></div>}
          </div>
        </section>

        {completedGoals.length > 0 && (
          <section className="goals-list-section completed-goals-section">
            <div className="goals-section-head"><div><span className="card-kicker">MILESTONES</span><h2>Completed goals</h2></div><span className="goal-count">{completedGoals.length}</span></div>
            <div className="goal-card-grid">
              {completedGoals.map((goal) => { const stats = getTaskStats(goal.id); return <GoalCard key={goal.id} goal={goal} progress={100} stats={stats} completed onEdit={() => openEdit(goal)} onDelete={() => deleteGoal(goal)} onComplete={() => completeGoal(goal)} />; })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function GoalCard({ goal, progress, stats, onEdit, onDelete, onComplete, completed = false }) {
  const daysLeft = goal.target_date ? Math.ceil((new Date(`${goal.target_date}T23:59:59`) - new Date()) / 86400000) : null;
  return (
    <article className={`goal-card ${completed ? "is-completed" : ""}`}>
      <div className="goal-card-top"><div className="goal-category"><Flag size={13} /> {goal.category}</div><span className={`priority-badge ${goal.priority}`}>{goal.priority}</span></div>
      <h3>{goal.title}</h3>
      {goal.description && <p className="goal-description-text">{goal.description}</p>}
      <div className="goal-progress-head"><span>Progress</span><strong>{progress}%</strong></div>
      <div className="goal-progress-bar"><i style={{ width: `${progress}%` }}></i></div>
      <div className="goal-stats">
        <div><span>Target</span><strong>{goal.target_value ?? "—"}{goal.unit ? ` ${goal.unit}` : ""}</strong></div>
        <div><span>Linked tasks</span><strong>{stats.done}/{stats.total}</strong></div>
        <div><span>{daysLeft === null ? "Target date" : daysLeft < 0 ? "Overdue" : "Time left"}</span><strong>{daysLeft === null ? (goal.target_date || "Not set") : daysLeft < 0 ? `${Math.abs(daysLeft)}d` : `${daysLeft}d`}</strong></div>
      </div>
      <div className="goal-card-actions"><button onClick={onComplete}>{completed ? "Reopen" : "Mark complete"}</button><button onClick={onEdit}>Edit</button><button className="danger-action" onClick={onDelete}><Trash2 size={14} /></button></div>
    </article>
  );
}

function compressAvatar(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Unable to read the image."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Unable to process the image."));
      img.onload = () => {
        const size = 512;
        const canvas = document.createElement("canvas");
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext("2d");
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale, h = img.height * scale;
        ctx.drawImage(img, (size-w)/2, (size-h)/2, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.78));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function ProfilePage({ session, profile, setProfile, theme, toggleTheme, onBack, onSaved }) {
  const userId = session.user.id;
  useEffect(() => { if (!profile.avatar_url) { const localAvatar = localStorage.getItem(`tracken-avatar-${userId}`); if (localAvatar) setProfile(current => ({ ...current, avatar_url: localAvatar })); } }, [userId, profile.avatar_url, setProfile]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [broadcastEditorRef, setBroadcastEditorRef] = useState(null);
  const [broadcastFile, setBroadcastFile] = useState(null);
  const [broadcastHtml, setBroadcastHtml] = useState("");
  const [uploadingBroadcastFile, setUploadingBroadcastFile] = useState(false);
  const [error, setError] = useState("");
  const [showFactoryReset, setShowFactoryReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  const completionFields = [
    profile.preparation_for,
    profile.target,
    profile.direction_goal,
    profile.motivation,
    profile.best_study_time,
    profile.biggest_challenge,
    profile.study_methods?.length,
    profile.career_interests?.length,
    profile.career_values?.length,
    profile.five_year_vision
  ];
  const completed = completionFields.filter(Boolean).length;
  const completion = Math.round((completed / completionFields.length) * 100);

  const update = (field, value) => setProfile((current) => ({ ...current, [field]: value }));

  const toggleArray = (field, value, max = Infinity) => {
    setProfile((current) => {
      const list = current[field] || [];
      if (list.includes(value)) {
        return { ...current, [field]: list.filter((item) => item !== value) };
      }
      if (list.length >= max) return current;
      return { ...current, [field]: [...list, value] };
    });
  };

  const saveProfile = async () => {
    setMessage("");
    setError("");

    if (!profile.preparation_for) {
      setError("Please choose what you're preparing for.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setSaving(true);
    const payload = {
      id: userId,
      full_name: profile.full_name.trim(),
      avatar_url: profile.avatar_url || null,
      preparation_for: profile.preparation_for,
      preparation_other: profile.preparation_other?.trim() || null,
      target: profile.target?.trim() || null,
      direction_goal: profile.direction_goal || null,
      motivation: profile.motivation || null,
      best_study_time: profile.best_study_time || null,
      biggest_challenge: profile.biggest_challenge || null,
      study_methods: profile.study_methods || [],
      career_interests: profile.career_interests || [],
      career_values: profile.career_values || [],
      five_year_vision: profile.five_year_vision?.trim() || null,
      badge: profile.badge || null,
      updated_at: new Date().toISOString()
    };

    const { data, error: saveError } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "id" })
      .select()
      .single();

    setSaving(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    setProfile({ ...emptyProfile, ...data, study_methods: data.study_methods || [], career_interests: data.career_interests || [], career_values: data.career_values || [] });
    setMessage("Profile saved successfully.");
    onSaved?.();
  };

  const factoryReset = async () => {
    if (resetting) return;
    setResetting(true); setError("");
    try {
      const { data: avatarFiles } = await supabase.storage.from("avatars").list(userId, { limit: 100 });
      if (avatarFiles?.length) await supabase.storage.from("avatars").remove(avatarFiles.map(file => `${userId}/${file.name}`));
    } catch {}
    const { error: resetError } = await supabase.rpc("factory_reset_user_data");
    if (resetError) { setError(resetError.message); setResetting(false); return; }
    clearTrackenLocalCache(userId);
    setShowFactoryReset(false);
    setMessage("Factory reset complete. Your TRACKEN data has been cleared.");
    setTimeout(() => window.location.reload(), 900);
  };

  const uploadAvatar = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Please choose an image smaller than 2 MB.");
      return;
    }

    setUploading(true);
    setError("");
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, {
      cacheControl: "3600",
      upsert: false
    });

    if (uploadError) {
      try {
        const dataUrl = await compressAvatar(file);
        update("avatar_url", dataUrl);
        localStorage.setItem(`tracken-avatar-${userId}`, dataUrl);
        setMessage("Photo ready. The avatar storage bucket is unavailable, so TRACKEN prepared a compact local fallback. Save your profile to keep it on this device.");
      } catch {
        setError(`Photo storage is unavailable: ${uploadError.message}`);
      }
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    update("avatar_url", data.publicUrl);
    setUploading(false);
    setMessage("Photo selected. Save your profile to keep it.");
  };

  return (
    <div className="profile-page">
      <header className="profile-topbar">
        <button className="profile-back" onClick={onBack}><ArrowLeft size={17} /> Dashboard</button>
        <div className="brand">TRACKEN<span>.</span></div>
        <button className="dashboard-theme-button theme-control" onClick={toggleTheme} aria-label="Toggle dark mode" title="Toggle dark mode">{theme === "light" ? <Moon size={18} /> : <Sun size={18} />}<span>{theme === "light" ? "Dark mode" : "Light mode"}</span></button>
      </header>

      <main className="profile-content">
        <div className="profile-heading">
          <div>
            <span className="card-kicker">YOUR PERSONAL IDENTITY</span>
            <h1>Your <em>direction.</em></h1>
            <p>Tell TRACKEN a little about where you're going. You can update these details anytime.</p>
          </div>
          <div className="profile-completion">
            <div className="completion-top"><span>Profile completion</span><strong>{completion}%</strong></div>
            <div className="profile-completion-bar"><i style={{ width: `${completion}%` }}></i></div>
            <small>{completion === 100 ? "You're all set." : "Complete it gradually — nothing here is a test."}</small>
          </div>
        </div>

        {error && <div className="profile-alert error">{error}</div>}
        {message && <div className="profile-alert success"><Check size={15} /> {message}</div>}

        <section className="profile-hero-card">
          <div className="profile-photo-wrap">
            <div className="profile-photo">
              {profile.avatar_url ? <img src={profile.avatar_url} alt="Profile" /> : <span>{(profile.full_name || session.user.email || "T").trim().charAt(0).toUpperCase()}</span>}
            </div>
            <label className="photo-upload">
              <ImagePlus size={15} /> {uploading ? "Uploading…" : "Add photo"}
              <input type="file" accept="image/*" onChange={uploadAvatar} disabled={uploading} />
            </label>
          </div>
          <div className="profile-identity-copy">
            <span className="mini-label">YOUR TRACKEN PROFILE</span>
            <h2>{profile.full_name || "Your name"}</h2>
            <p>{profile.preparation_for || "Choose what you're preparing for"}{profile.target ? ` · ${profile.target}` : ""}</p>
            <div className="profile-chips">
              {profile.badge && <span className={`profile-badge ${String(profile.badge).toLowerCase()}`}><Medal size={13}/> {profile.badge}</span>}
              {profile.career_interests?.slice(0, 3).map((item) => <span key={item}>{item}</span>)}
            </div>
          </div>
        </section>

        <section className="profile-section">
          <div className="profile-section-title">
            <span className="section-number">01</span>
            <div><span className="card-kicker">YOUR TRACKEN STYLE</span><h2>How do you want to use TRACKEN?</h2><p>Pick the parts of your personal progress system that matter most to you.</p></div>
          </div>
          <div className="profile-form-grid">
            <label className="profile-field full"><span>Full name</span><input value={profile.full_name} onChange={(e) => update("full_name", e.target.value)} placeholder="Your name" /></label>
            <SelectField label="What brings you to TRACKEN?" value={profile.preparation_for} options={PROFILE_OPTIONS.preparation} onChange={(value) => update("preparation_for", value)} required />
            {profile.preparation_for === "Other" && <label className="profile-field"><span>Tell us more</span><input value={profile.preparation_other} onChange={(e) => update("preparation_other", e.target.value)} placeholder="What would you like TRACKEN to help you with?" /></label>}
            <label className="profile-field"><span>What are you working toward?</span><input value={profile.target} onChange={(e) => update("target", e.target.value)} placeholder="e.g. SSC CGL 2027, a stronger routine, a career goal…" /></label>
          </div>
        </section>

        <section className="profile-section">
          <div className="profile-section-title">
            <span className="section-number">02</span>
            <div><span className="card-kicker">WHAT MATTERS TO YOU</span><h2>What should TRACKEN help you improve?</h2><p>Choose the outcomes you want your dashboard to make easier to see.</p></div>
          </div>
          <div className="profile-question">
            <h3>Which outcomes sound most useful? <small>Select one.</small></h3>
            <OptionGrid options={PROFILE_OPTIONS.direction} value={profile.direction_goal} onChange={(value) => update("direction_goal", value)} />
          </div>
          <div className="profile-question">
            <h3>What keeps you coming back? <small>Select one.</small></h3>
            <OptionGrid options={PROFILE_OPTIONS.motivation} value={profile.motivation} onChange={(value) => update("motivation", value)} />
          </div>
        </section>

        <section className="profile-section">
          <div className="profile-section-title">
            <span className="section-number">03</span>
            <div><span className="card-kicker">YOUR WORKFLOW</span><h2>Build the system around you.</h2><p>Tell TRACKEN which tools fit the way you naturally work.</p></div>
          </div>
          <div className="profile-question">
            <h3>When do you usually have your best focus?</h3>
            <OptionGrid options={PROFILE_OPTIONS.studyTime} value={profile.best_study_time} onChange={(value) => update("best_study_time", value)} />
          </div>
          <div className="profile-question">
            <h3>What usually gets in your way?</h3>
            <OptionGrid options={PROFILE_OPTIONS.challenge} value={profile.biggest_challenge} onChange={(value) => update("biggest_challenge", value)} />
          </div>
          <div className="profile-question">
            <h3>Which TRACKEN tools sound useful? <small>Select all that apply.</small></h3>
            <OptionGrid options={PROFILE_OPTIONS.methods} value={profile.study_methods} onChange={(value) => toggleArray("study_methods", value)} multi />
          </div>
        </section>

        <section className="profile-section">
          <div className="profile-section-title">
            <span className="section-number">04</span>
            <div><span className="card-kicker">YOUR PERSONAL SIGNALS</span><h2>What kind of progress feels rewarding?</h2><p>These choices help shape the language and priorities of your TRACKEN profile.</p></div>
          </div>
          <div className="profile-question">
            <h3>Which areas do you want to keep visible? <small>Select all that apply.</small></h3>
            <OptionGrid options={PROFILE_OPTIONS.careers} value={profile.career_interests} onChange={(value) => toggleArray("career_interests", value)} multi />
          </div>
          <div className="profile-question">
            <h3>Which values do you want your system to reflect? <small>Choose up to 3.</small></h3>
            <OptionGrid options={PROFILE_OPTIONS.values} value={profile.career_values} onChange={(value) => toggleArray("career_values", value, 3)} multi />
          </div>
          <div className="profile-question vision-question">
            <h3>Where do you see yourself in 5 years?</h3>
            <p>Imagine your ideal TRACKEN year. What would you have finished, improved, built or understood?</p>
            <textarea value={profile.five_year_vision} onChange={(e) => update("five_year_vision", e.target.value)} placeholder="Describe the progress you want to look back on…" rows="5"></textarea>
          </div>
        </section>

        <div className="profile-save-bar">
          <div><span className="save-dot"></span><div><strong>Your profile is yours.</strong><small>Your choices and badge stay with your account across devices.</small></div></div>
          <div className="profile-save-actions"><button className="factory-reset-button" onClick={()=>setShowFactoryReset(true)} disabled={saving || resetting}><RotateCcw size={15}/> Factory Reset</button><button className="primary-cta profile-save" onClick={saveProfile} disabled={saving}>{saving ? "Saving…" : <>Save profile <Save size={16} /></>}</button></div>
        </div>
        {showFactoryReset && <div className="factory-reset-overlay" role="dialog" aria-modal="true"><div className="factory-reset-modal"><div className="factory-reset-icon"><RotateCcw size={22}/></div><span className="card-kicker">IRREVERSIBLE ACTION</span><h2>Factory Reset TRACKEN?</h2><p>This will permanently delete your tasks, study records, goals, habits, focus/time data, cashflow, investments, net-worth entries and profile information from this account. Your login account itself will remain.</p><div className="factory-reset-actions"><button className="secondary-cta" onClick={()=>setShowFactoryReset(false)} disabled={resetting}>Keep my data</button><button className="danger-cta" onClick={factoryReset} disabled={resetting}>{resetting?"Resetting…":"Yes, delete all data"}</button></div></div></div>}
      </main>
    </div>
  );
}

function SelectField({ label, value, options, onChange, required }) {
  return (
    <label className="profile-field">
      <span>{label} {required && <b>*</b>}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select an option</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function OptionGrid({ options, value, onChange, multi = false }) {
  const selected = Array.isArray(value) ? value : [value].filter(Boolean);
  return (
    <div className="option-grid">
      {options.map((option) => {
        const active = selected.includes(option);
        return (
          <button type="button" key={option} className={`option-card ${active ? "active" : ""}`} onClick={() => onChange(option)}>
            <span className="option-check">{active ? <Check size={13} /> : ""}</span>
            <span>{option}</span>
          </button>
        );
      })}
    </div>
  );
}

export default App;
