import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'wouter';
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCheck,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Download,
  FileBarChart,
  Filter,
  Flag,
  Plus,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Target,
  ThumbsDown,
  ThumbsUp,
  TrendingUp,
} from 'lucide-react';
import { categories, formatCrore, healthOptions, locations, type Category, type Health, type Project } from '@/data/projects';
import { useAppState } from '@/state/app-state';
import { useToast } from '@/hooks/use-toast';
import { CRORE } from '@/data/projects';
import { formatFullDate, isValidIsoDate, todayIso } from '@/lib/date';
import { initialsOf, leadName } from '@/data/users';
import { formatRatio, getCommercialSummary, getPortfolioCommercialSummary } from '@/lib/calculations';

export type WorkspaceView = 'projects' | 'my-projects' | 'timeline' | 'milestones' | 'issues' | 'commercial' | 'updates' | 'reports' | 'new-project';

const healthTone: Record<Health, string> = { 'On track': 'bg-[#e4f1ec] text-[#2e7c67]', 'At risk': 'bg-[#f8edcf] text-[#9a711f]', Delayed: 'bg-[#fae5e1] text-[#b2473d]', 'Not started': 'bg-[#eef0ed] text-[#69716b]' };

function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div><p className="font-mono text-[10px] uppercase tracking-[.18em] text-[#9a711f]">{eyebrow}</p><h1 className="mt-3 font-serif text-[42px] leading-none tracking-[-.05em] text-[#173e49] md:text-[52px]">{title}</h1><p className="mt-4 max-w-[620px] text-[13px] leading-6 text-muted-foreground">{description}</p></div>{action}</div>;
}

function ProjectTable({ rows }: { rows: Project[] }) {
  return <div className="mt-7 overflow-hidden rounded-2xl border border-border bg-card shadow-sm shadow-[#173e49]/[.03]"><div className="hidden grid-cols-[minmax(220px,1.5fr)_110px_110px_130px_110px_130px_110px] gap-3 border-b border-border bg-[#f7f4ec] px-5 py-3 font-mono text-[9px] uppercase tracking-[.1em] text-muted-foreground md:grid"><span>Project</span><span>Location</span><span>Category</span><span>Lead</span><span>Progress</span><span>Target</span><span>Health</span></div>{rows.length === 0 && <p className="px-5 py-10 text-center text-[12px] text-muted-foreground">No projects match this view. Try a broader search.</p>}{rows.map((project) => <Link href={`/project/${project.id}`} key={project.id} className="grid gap-3 border-b border-border/70 px-5 py-4 transition hover:bg-[#fcf5e5] md:grid-cols-[minmax(220px,1.5fr)_110px_110px_130px_110px_130px_110px] md:items-center"><div className="flex items-center justify-between gap-3"><span><span className="block text-[12px] font-bold">{project.name}</span><span className="mt-1 block font-mono text-[9px] uppercase tracking-[.1em] text-muted-foreground">{project.code}</span></span><ArrowUpRight size={15} className="text-muted-foreground/50 md:hidden" /></div><span className="text-[11px] text-muted-foreground">{project.location}</span><span className="text-[11px] text-muted-foreground">{project.category}</span><span className="text-[11px] font-semibold">{leadName(project.leadId)}</span><span className="flex items-center gap-2 text-[11px] font-bold"><span className="h-1.5 flex-1 rounded-full bg-[#e7e7dc]"><span className="block h-full rounded-full bg-[#3d9a7e]" style={{ width: `${project.progress}%` }} /></span>{project.progress}%</span><span className="text-[11px] font-semibold">{project.targetLabel}</span><span className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-bold ${healthTone[project.health]}`}>{project.health}</span></Link>)}</div>;
}

function ProjectsView({ mine = false }: { mine?: boolean }) {
  const { projects, user } = useAppState();
  const [search, setSearch] = useState('');
  const [health, setHealth] = useState<'All' | Health>('All');
  const [location, setLocation] = useState<'All' | (typeof locations)[number]>('All');
  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return projects.filter((project) => {
      // "My projects" keys off the signed-in user's stable id (leadId), never
      // a display-name comparison — two people can share a name; ids don't.
      if (mine && project.leadId !== user?.id) return false;
      // The input promises project, code or lead — search all three.
      const haystack = `${project.name} ${project.code} ${leadName(project.leadId)}`.toLowerCase();
      if (term && !haystack.includes(term)) return false;
      if (health !== 'All' && project.health !== health) return false;
      if (location !== 'All' && project.location !== location) return false;
      return true;
    });
  }, [projects, mine, user?.id, search, health, location]);
  return <><PageHeader eyebrow={mine ? 'Project lead workspace' : 'Project register'} title={mine ? 'My projects' : 'All projects'} description={mine ? 'The projects you own, the milestones ahead, and the updates that need to move.' : 'Explore every Encalm project with the context needed for a useful first read.'} action={mine ? <Link href="/new-project" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#d6a95d] px-4 py-3 text-[11px] font-extrabold text-[#173e49] hover:bg-[#e2bd73]"><Plus size={15} /> New project</Link> : undefined} /><div className="mt-8 flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 sm:flex-row"><label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-border bg-background px-3 text-muted-foreground"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search project, code or lead" className="min-w-0 flex-1 bg-transparent text-[11px] outline-none" /></label><select value={location} onChange={(event) => setLocation(event.target.value as typeof location)} className="h-10 rounded-xl border border-border bg-background px-3 text-[11px] font-semibold"><option value="All">All locations</option>{locations.map((item) => <option key={item}>{item}</option>)}</select><select value={health} onChange={(event) => setHealth(event.target.value as typeof health)} className="h-10 rounded-xl border border-border bg-background px-3 text-[11px] font-semibold"><option value="All">All health</option>{healthOptions.map((item) => <option key={item}>{item}</option>)}</select></div><p className="mt-5 font-mono text-[10px] uppercase tracking-[.12em] text-muted-foreground">{rows.length} projects shown</p><ProjectTable rows={rows} /></>;
}

function TimelineView() {
  const { projects } = useAppState();
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState<'All' | (typeof locations)[number]>('All');
  const [category, setCategory] = useState<'All' | Category>('All');

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return projects.filter((p) => {
      const haystack = `${p.name} ${p.code} ${p.location} ${p.category} ${leadName(p.leadId)}`.toLowerCase();
      if (term && !haystack.includes(term)) return false;
      if (location !== 'All' && p.location !== location) return false;
      if (category !== 'All' && p.category !== category) return false;
      return true;
    });
  }, [projects, search, location, category]);

  return (
    <>
      <PageHeader
        eyebrow="Execution"
        title="Project timeline"
        description="A live interactive view of delivery progress and stage execution across the portfolio."
      />

      <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 sm:flex-row">
        <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-border bg-background px-3 text-muted-foreground">
          <Search size={15} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search project or lead..."
            className="min-w-0 flex-1 bg-transparent text-[11px] outline-none"
          />
        </label>
        <select
          value={location}
          onChange={(e) => setLocation(e.target.value as typeof location)}
          className="h-10 rounded-xl border border-border bg-background px-3 text-[11px] font-semibold"
        >
          <option value="All">All locations</option>
          {locations.map((loc) => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
        </select>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as typeof category)}
          className="h-10 rounded-xl border border-border bg-background px-3 text-[11px] font-semibold"
        >
          <option value="All">All categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-7 space-y-4">
        {filtered.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-10 text-center text-[12px] text-muted-foreground">
            No projects match this timeline filter.
          </p>
        ) : (
          filtered.map((project) => {
            const activePhase = project.phases.find((ph) => ph.status === 'active');
            return (
              <div
                key={project.id}
                className="group rounded-2xl border border-border bg-card p-5 transition hover:border-[#d9c585] hover:shadow-md"
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/project/${project.id}`}
                        className="text-[14px] font-bold text-foreground hover:text-[#2e7c67]"
                      >
                        {project.name}
                      </Link>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${healthTone[project.health]}`}>
                        {project.health}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-[9px] uppercase tracking-[.1em] text-muted-foreground">
                      {project.code} · {project.location} · {project.category} · Lead: {leadName(project.leadId)}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <p className="font-mono text-[9px] uppercase tracking-[.1em] text-muted-foreground">Target</p>
                      <p className="text-[11px] font-bold">{project.targetLabel}</p>
                    </div>
                    <div className="w-28">
                      <div className="flex justify-between font-mono text-[9px] text-muted-foreground">
                        <span>Progress</span>
                        <span>{project.progress}%</span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#e7e7dc]">
                        <div
                          className="h-full rounded-full bg-[#3d9a7e] transition-all"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                    </div>
                    <Link
                      href={`/project/${project.id}`}
                      className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <ArrowUpRight size={14} />
                    </Link>
                  </div>
                </div>

                {/* Stage Pipeline */}
                <div className="mt-5 border-t border-border/70 pt-4">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-2">
                    <span>Delivery stages pipeline ({project.phases.length} stages)</span>
                    <span>
                      Current: <strong className="text-foreground">{activePhase?.name || 'In planning'}</strong>
                    </span>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                    {project.phases.map((phase, idx) => {
                      const isComplete = phase.status === 'complete';
                      const isActive = phase.status === 'active';
                      const isBlocked = phase.status === 'blocked';
                      return (
                        <div
                          key={phase.id || `${project.id}-phase-${idx}`}
                          className={`rounded-xl border p-2.5 text-[10px] ${
                            isComplete
                              ? 'border-[#cbe4d9] bg-[#edf5f0]'
                              : isActive
                                ? 'border-[#eadcb1] bg-[#fff8e9]'
                                : isBlocked
                                  ? 'border-[#f0c8c2] bg-[#fff5f2]'
                                  : 'border-border/60 bg-[#fbfaf6]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="truncate font-bold text-foreground">{phase.name}</span>
                            <span className="font-mono text-[9px] text-muted-foreground">{phase.progress}%</span>
                          </div>
                          <p className="mt-1 truncate font-mono text-[8px] uppercase tracking-[.08em] text-muted-foreground">
                            {phase.owner}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}

function MilestonesView() {
  const { projects, role, approveMilestone, completeMilestone } = useAppState();
  const { toast } = useToast();
  const [filter, setFilter] = useState<'All' | 'Approval' | 'Upcoming' | 'Late' | 'Complete'>('All');

  const allMilestones = useMemo(() => {
    return projects
      .flatMap((project) =>
        project.milestones.map((milestone) => ({
          ...milestone,
          id: (milestone as any).id || `${project.id}-${milestone.title}`,
          project,
        }))
      )
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [projects]);

  const filtered = useMemo(() => {
    if (filter === 'Approval') {
      return allMilestones.filter((m) => m.approvalRequired && m.approvalStatus === 'Pending');
    }
    if (filter === 'Upcoming') {
      return allMilestones.filter((m) => m.status === 'upcoming');
    }
    if (filter === 'Late') {
      return allMilestones.filter((m) => m.status === 'late');
    }
    if (filter === 'Complete') {
      return allMilestones.filter((m) => m.status === 'complete');
    }
    return allMilestones;
  }, [allMilestones, filter]);

  const handleApprove = async (projectId: string, milestoneId: string, status: 'Approved' | 'Rejected') => {
    const success = await approveMilestone(projectId, milestoneId, status);
    if (success) {
      toast({
        title: `Milestone ${status}`,
        description: `Approval status updated to ${status}.`,
      });
    }
  };

  const handleComplete = async (projectId: string, milestoneId: string) => {
    const success = await completeMilestone(projectId, milestoneId);
    if (success) {
      toast({
        title: 'Milestone Completed',
        description: 'Control point marked as complete and logged.',
      });
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Execution"
        title="Milestones"
        description="The control points across the portfolio, with approval gates and completion actions."
        action={
          role === 'lead' ? (
            <Link
              href="/my-projects"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#d6a95d] px-4 py-3 text-[11px] font-extrabold text-[#173e49] hover:bg-[#e2bd73]"
            >
              <Plus size={15} /> Add milestone
            </Link>
          ) : undefined
        }
      />

      {/* Filter Tabs */}
      <div className="mt-8 flex flex-wrap gap-2">
        {(['All', 'Approval', 'Upcoming', 'Late', 'Complete'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={`rounded-xl px-3.5 py-2 text-[11px] font-bold transition ${
              filter === tab
                ? 'bg-[#173e49] text-white'
                : 'border border-border bg-card text-muted-foreground hover:bg-muted'
            }`}
          >
            {tab === 'Approval' ? 'Needs Approval' : tab}
            <span className="ml-1.5 font-mono text-[9px] opacity-70">
              (
              {tab === 'All'
                ? allMilestones.length
                : tab === 'Approval'
                  ? allMilestones.filter((m) => m.approvalRequired && m.approvalStatus === 'Pending').length
                  : tab === 'Upcoming'
                    ? allMilestones.filter((m) => m.status === 'upcoming').length
                    : tab === 'Late'
                      ? allMilestones.filter((m) => m.status === 'late').length
                      : allMilestones.filter((m) => m.status === 'complete').length}
              )
            </span>
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-10 text-center text-[12px] text-muted-foreground md:col-span-2 xl:col-span-3">
            No milestones found for this filter.
          </p>
        ) : (
          filtered.map((item) => {
            const isPendingApproval = item.approvalRequired && item.approvalStatus === 'Pending';
            const isComplete = item.status === 'complete';
            const isLate = item.status === 'late';

            return (
              <div
                key={`${item.project.id}-${item.id}`}
                className={`flex flex-col justify-between rounded-2xl border p-5 transition ${
                  isComplete
                    ? 'border-[#cbe4d9] bg-[#edf5f0]/80'
                    : isLate
                      ? 'border-[#f0c8c2] bg-[#fff5f2]'
                      : 'border-border bg-card hover:border-[#d9c585]'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={`grid size-9 place-items-center rounded-xl ${
                        isComplete
                          ? 'bg-[#d8ede3] text-[#2e7c67]'
                          : isLate
                            ? 'bg-[#fae5e1] text-[#b2473d]'
                            : 'bg-[#f8edcf] text-[#9a711f]'
                      }`}
                    >
                      {isComplete ? <Check size={16} strokeWidth={3} /> : isLate ? <AlertTriangle size={16} /> : <Flag size={16} />}
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-[.12em] text-muted-foreground">
                      {item.date}
                    </span>
                  </div>

                  <h3 className="mt-4 text-[13px] font-bold text-foreground">{item.title}</h3>
                  <Link
                    href={`/project/${item.project.id}`}
                    className="mt-1 block text-[11px] text-muted-foreground hover:text-foreground hover:underline"
                  >
                    {item.project.name}
                  </Link>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                        isComplete
                          ? 'bg-[#d8ede3] text-[#2e7c67]'
                          : isLate
                            ? 'bg-[#fae5e1] text-[#b2473d]'
                            : 'bg-[#e4f1ec] text-[#2e7c67]'
                      }`}
                    >
                      {isComplete ? 'Complete' : isLate ? 'Needs attention' : 'Upcoming'}
                    </span>

                    {item.approvalRequired && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                          item.approvalStatus === 'Approved'
                            ? 'bg-[#d8ede3] text-[#2e7c67]'
                            : item.approvalStatus === 'Rejected'
                              ? 'bg-[#fae5e1] text-[#b2473d]'
                              : 'bg-[#f8edcf] text-[#9a711f]'
                        }`}
                      >
                        Approval · {item.approvalStatus || 'Pending'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Interactive Action Controls */}
                <div className="mt-5 border-t border-border/60 pt-3 flex flex-wrap items-center justify-between gap-2">
                  <Link
                    href={`/project/${item.project.id}`}
                    className="inline-flex items-center gap-1 font-mono text-[9px] font-bold text-muted-foreground hover:text-foreground"
                  >
                    View project <ArrowUpRight size={11} />
                  </Link>

                  <div className="flex items-center gap-2">
                    {isPendingApproval && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleApprove(item.project.id, item.id, 'Approved')}
                          className="flex items-center gap-1 rounded-lg bg-[#2e7c67] px-2.5 py-1 text-[10px] font-bold text-white hover:bg-[#256554]"
                        >
                          <ThumbsUp size={11} /> Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApprove(item.project.id, item.id, 'Rejected')}
                          className="flex items-center gap-1 rounded-lg bg-[#b2473d] px-2.5 py-1 text-[10px] font-bold text-white hover:bg-[#963c33]"
                        >
                          <ThumbsDown size={11} /> Reject
                        </button>
                      </>
                    )}

                    {!isComplete && (
                      <button
                        type="button"
                        onClick={() => handleComplete(item.project.id, item.id)}
                        className="flex items-center gap-1 rounded-lg border border-[#cbe4d9] bg-white px-2.5 py-1 text-[10px] font-bold text-[#2e7c67] hover:bg-[#edf5f0]"
                      >
                        <Check size={11} /> Complete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}

function IssuesView() {
  const { projects, role, updateIssue } = useAppState();
  const { toast } = useToast();
  const [filter, setFilter] = useState<'All' | 'Critical' | 'Open' | 'Resolved'>('All');

  const allIssues = useMemo(() => {
    return projects.flatMap((project) =>
      project.issues.map((issue, issueIndex) => ({ ...issue, project, issueIndex }))
    );
  }, [projects]);

  const filtered = useMemo(() => {
    if (filter === 'Critical') return allIssues.filter((i) => i.severity === 'High');
    if (filter === 'Open') return allIssues.filter((i) => i.status !== 'Resolved' && i.status !== 'Closed');
    if (filter === 'Resolved') return allIssues.filter((i) => i.status === 'Resolved' || i.status === 'Closed');
    return allIssues;
  }, [allIssues, filter]);

  const handleStatusChange = (projectId: string, issueIndex: number, newStatus: string) => {
    updateIssue(projectId, issueIndex, { status: newStatus as any });
    toast({
      title: 'Issue Status Updated',
      description: `Issue updated to "${newStatus}".`,
    });
  };

  const highIssues = filtered.filter((i) => i.severity === 'High');
  const normalIssues = filtered.filter((i) => i.severity !== 'High');

  return (
    <>
      <PageHeader
        eyebrow="Execution"
        title="Issues & risks"
        description="A focused register of the decisions, blockers, and risks that can change project outcomes."
        action={
          role === 'lead' ? (
            <Link
              href="/my-projects"
              className="inline-flex items-center gap-2 rounded-xl bg-[#d6a95d] px-4 py-3 text-[11px] font-extrabold text-[#173e49] hover:bg-[#e2bd73]"
            >
              <Plus size={15} /> Log an issue
            </Link>
          ) : undefined
        }
      />

      {/* Filter Tabs */}
      <div className="mt-8 flex flex-wrap gap-2">
        {(['All', 'Critical', 'Open', 'Resolved'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={`rounded-xl px-3.5 py-2 text-[11px] font-bold transition ${
              filter === tab
                ? 'bg-[#173e49] text-white'
                : 'border border-border bg-card text-muted-foreground hover:bg-muted'
            }`}
          >
            {tab}
            <span className="ml-1.5 font-mono text-[9px] opacity-70">
              (
              {tab === 'All'
                ? allIssues.length
                : tab === 'Critical'
                  ? allIssues.filter((i) => i.severity === 'High').length
                  : tab === 'Open'
                    ? allIssues.filter((i) => i.status !== 'Resolved' && i.status !== 'Closed').length
                    : allIssues.filter((i) => i.status === 'Resolved' || i.status === 'Closed').length}
              )
            </span>
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {/* Critical issues */}
        <section className="rounded-2xl border border-[#f0c8c2] bg-[#fff5f2] p-5 md:p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-[#fae5e1] text-[#b2473d]">
              <ShieldAlert size={16} />
            </span>
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[.14em] text-[#b2473d]">Critical issues</p>
              <h2 className="mt-1 text-[18px] font-extrabold">Needs a decision</h2>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {highIssues.length === 0 ? (
              <p className="rounded-xl border border-[#f0c8c2] bg-white/70 p-4 text-[11px] text-muted-foreground">
                No high-severity issues matching this view.
              </p>
            ) : (
              highIssues.map((issue) => (
                <div
                  key={`${issue.project.id}-${issue.id ?? issue.title}`}
                  className="rounded-xl border border-[#f0c8c2] bg-white/80 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      href={`/project/${issue.project.id}`}
                      className="text-[12px] font-bold hover:text-[#b2473d] hover:underline"
                    >
                      {issue.title}
                    </Link>
                    <span className="font-mono text-[9px] uppercase font-bold text-[#b2473d]">High</span>
                  </div>
                  <p className="mt-2 text-[11px] leading-5 text-muted-foreground">{issue.detail}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-2 font-mono text-[9px]">
                    <span className="uppercase tracking-[.1em] text-[#b2473d]">
                      {issue.project.name} · Owner: {issue.owner}
                    </span>
                    {role === 'lead' ? (
                      <select
                        value={issue.status || 'Open'}
                        onChange={(e) => handleStatusChange(issue.project.id, issue.issueIndex, e.target.value)}
                        className="rounded-lg border border-border bg-white px-2 py-0.5 text-[10px] font-bold"
                      >
                        <option value="Open">Open</option>
                        <option value="Under review">Under review</option>
                        <option value="Action in progress">Action in progress</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Closed">Closed</option>
                      </select>
                    ) : (
                      <span className="font-bold text-muted-foreground">{issue.status || 'Open'}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Normal issues */}
        <section className="rounded-2xl border border-[#eadcb1] bg-[#fbf1d8] p-5 md:p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-[#f8edcf] text-[#9a711f]">
              <AlertTriangle size={16} />
            </span>
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[.14em] text-[#9a711f]">Open issues & risks</p>
              <h2 className="mt-1 text-[18px] font-extrabold">Track to closure</h2>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {normalIssues.length === 0 ? (
              <p className="rounded-xl border border-[#eadcb1] bg-white/50 p-4 text-[11px] text-muted-foreground">
                No standard issues recorded.
              </p>
            ) : (
              normalIssues.map((issue) => (
                <div
                  key={`${issue.project.id}-${issue.id ?? issue.title}`}
                  className="rounded-xl border border-[#eadcb1] bg-white/70 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      href={`/project/${issue.project.id}`}
                      className="text-[12px] font-bold hover:text-[#9a711f] hover:underline"
                    >
                      {issue.title}
                    </Link>
                    <span className="font-mono text-[9px] uppercase font-bold text-[#9a711f]">
                      {issue.severity || 'Medium'}
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] leading-5 text-muted-foreground">{issue.detail}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-2 font-mono text-[9px]">
                    <span className="uppercase tracking-[.1em] text-[#9a711f]">
                      {issue.project.name} · Owner: {issue.owner}
                    </span>
                    {role === 'lead' ? (
                      <select
                        value={issue.status || 'Open'}
                        onChange={(e) => handleStatusChange(issue.project.id, issue.issueIndex, e.target.value)}
                        className="rounded-lg border border-border bg-white px-2 py-0.5 text-[10px] font-bold"
                      >
                        <option value="Open">Open</option>
                        <option value="Under review">Under review</option>
                        <option value="Action in progress">Action in progress</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Closed">Closed</option>
                      </select>
                    ) : (
                      <span className="font-bold text-muted-foreground">{issue.status || 'Open'}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </>
  );
}

function CommercialView() {
  const { projects, role } = useAppState();
  // Every ratio here comes from the same functions project-detail.tsx uses —
  // one commercial calculation, not two independently-rounded copies of it.
  const portfolio = getPortfolioCommercialSummary(projects);
  return <><PageHeader eyebrow="Commercial" title="Budget & AOP" description="Portfolio-level capital position, with a project view of AOP, award, spend, and balance." /><div className="mt-8 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-border bg-card p-5"><p className="font-mono text-[9px] uppercase tracking-[.14em] text-muted-foreground">Total AOP</p><p className="mt-4 text-[27px] font-extrabold">{formatCrore(portfolio.totalAop)}</p></div><div className="rounded-2xl border border-border bg-card p-5"><p className="font-mono text-[9px] uppercase tracking-[.14em] text-muted-foreground">Package awarded</p><p className="mt-4 text-[27px] font-extrabold">{formatCrore(portfolio.totalAwarded)}</p><p className="mt-1 text-[10px] text-[#2e7c67]">{formatRatio(portfolio.awardRatePct)} award rate</p></div><div className="rounded-2xl border border-border bg-card p-5"><p className="font-mono text-[9px] uppercase tracking-[.14em] text-muted-foreground">Spent to date</p><p className="mt-4 text-[27px] font-extrabold">{formatCrore(portfolio.totalSpent)}</p><p className="mt-1 text-[10px] text-muted-foreground">{formatRatio(portfolio.spentRatePct)} of awarded</p></div></div><div className="mt-7 overflow-hidden rounded-2xl border border-border bg-card"><div className="hidden grid-cols-[minmax(220px,1.5fr)_130px_130px_100px_130px_130px_90px] gap-3 border-b border-border bg-[#f7f4ec] px-5 py-3 font-mono text-[9px] uppercase tracking-[.1em] text-muted-foreground md:grid"><span>Project</span><span>AOP</span><span>Awarded</span><span>Award %</span><span>Spent</span><span>Remaining</span><span>Access</span></div>{projects.map((project) => { const commercial = getCommercialSummary(project); return <div key={project.id} className="grid gap-2 border-b border-border/70 px-5 py-4 md:grid-cols-[minmax(220px,1.5fr)_130px_130px_100px_130px_130px_90px] md:items-center"><Link href={`/project/${project.id}`} className="text-[12px] font-bold hover:text-[#2e7c67]">{project.name}</Link><span className="text-[11px]">{formatCrore(commercial.aop)}</span><span className="text-[11px]">{formatCrore(commercial.awarded)}</span><span className={`text-[11px] font-bold ${commercial.overAwarded ? 'text-[#b2473d]' : 'text-[#2e7c67]'}`}>{formatRatio(commercial.awardRatePct, 0)}</span><span className="text-[11px]">{formatCrore(commercial.spent)}</span><span className="text-[11px]">{formatCrore(commercial.remaining)}</span><span className="text-[10px] font-semibold text-muted-foreground">{role === 'lead' ? 'Editable' : 'View only'}</span></div>; })}</div></>;
}

function UpdatesView() {
  const { projects, role } = useAppState();
  const updates = projects.flatMap((project) => project.updates.map((update) => ({ ...update, project }))).sort((a, b) => b.date.localeCompare(a.date));
  return <><PageHeader eyebrow="Project updates" title="Update feed" description="A chronological read of the decisions, progress signals, and changes coming from project teams." action={role === 'lead' ? <Link href="/my-projects" className="inline-flex items-center gap-2 rounded-xl bg-[#d6a95d] px-4 py-3 text-[11px] font-extrabold text-[#173e49] hover:bg-[#e2bd73]"><Plus size={15} /> Post an update</Link> : undefined} /><div className="mt-8 max-w-[900px] space-y-3">{updates.length === 0 && <p className="rounded-2xl border border-dashed border-border p-10 text-center text-[12px] text-muted-foreground">No project updates posted yet.</p>}{updates.slice(0, 15).map((update, index) => <Link href={`/project/${update.project.id}`} key={`${update.project.id}-${update.date}-${update.author}-${index}`} className="flex gap-4 rounded-2xl border border-border bg-card p-5 transition hover:border-[#d9c585]"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#e4f1ec] text-[10px] font-bold text-[#2e7c67]">{initialsOf(update.author)}</span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><strong className="text-[12px]">{update.project.name}</strong><span className="font-mono text-[9px] uppercase tracking-[.1em] text-muted-foreground">{update.date}</span></span><p className="mt-2 text-[12px] leading-5 text-muted-foreground">{update.text}</p><span className="mt-3 block font-mono text-[9px] uppercase tracking-[.1em] text-[#2e7c67]">Updated by {update.author} · {update.role}</span></span></Link>)}</div></>;
}

function ReportsView() {
  const { projects } = useAppState();
  const { toast } = useToast();

  const summary = useMemo(() => {
    const total = projects.length;
    const delayed = projects.filter((project) => project.health === 'Delayed').length;
    const atRisk = projects.filter((project) => project.health === 'At risk').length;
    const averageProgress = total
      ? Math.round(projects.reduce((sum, project) => sum + project.progress, 0) / total)
      : 0;
    // Counted from the data rather than the old `projects.length * 2` guess.
    const openMilestones = projects.reduce(
      (sum, project) => sum + project.milestones.filter((milestone) => milestone.status !== 'complete').length,
      0,
    );
    const totalAop = projects.reduce((sum, project) => sum + project.aop, 0);
    return { total, delayed, atRisk, averageProgress, openMilestones, totalAop };
  }, [projects]);

  const exportCsv = () => {
    if (projects.length === 0) {
      toast({ title: 'Nothing to export', description: 'There are no projects in this view.' });
      return;
    }
    try {
      downloadCsv(buildPortfolioCsv(projects), `encalm-portfolio-${todayIso()}.csv`);
      toast({ title: 'Export ready', description: `${projects.length} projects written to CSV.` });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Export failed',
        description: 'Your browser blocked the download. Check its download settings.',
      });
    }
  };

  const cards: { label: string; value: string; icon: typeof TrendingUp }[] = [
    { label: 'Portfolio summary', value: `${summary.total} active projects`, icon: TrendingUp },
    { label: 'Project health', value: `${summary.atRisk} at risk · ${summary.delayed} delayed`, icon: ShieldAlert },
    { label: 'Project progress', value: `${summary.averageProgress}% average`, icon: Target },
    { label: 'Delayed projects', value: `${summary.delayed} need recovery plans`, icon: AlertTriangle },
    { label: 'Open milestones', value: `${summary.openMilestones} control points ahead`, icon: CalendarDays },
    { label: 'Commercial summary', value: `${formatCrore(summary.totalAop)} total AOP`, icon: CircleDollarSign },
  ];

  return <><PageHeader eyebrow="Reports" title="Project reports" description="Reporting views for portfolio reviews. Each figure is computed from the current portfolio and can be exported as CSV." /><div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{cards.map(({ label, value, icon: Icon }) => <div key={label} className="rounded-2xl border border-border bg-card p-5"><div className="flex items-start justify-between"><span className="font-mono text-[9px] uppercase tracking-[.14em] text-muted-foreground">{label}</span><Icon size={17} className="text-muted-foreground/60" /></div><p className="mt-5 text-[18px] font-extrabold">{value}</p><button type="button" onClick={exportCsv} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-[#f7f4ec] px-3 py-2.5 text-[10px] font-bold hover:bg-[#fbf1d8]"><FileBarChart size={14} /> Export as CSV</button></div>)}</div><button type="button" onClick={exportCsv} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#173e49] px-4 py-3 text-[11px] font-extrabold text-white hover:bg-[#204f59]"><Download size={15} /> Export full portfolio (CSV)</button></>;
}

function NewProjectView() {
  const { addProject, user, canEdit } = useAppState();
  const { toast } = useToast();
  const [createdName, setCreatedName] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [form, setForm] = useState({
    name: '',
    location: 'Goa' as Project['location'],
    category: 'Hotel' as Category,
    projectType: 'Business hotel',
    startDate: todayIso(),
    targetDate: '',
    aop: '50',
    awarded: '0',
    area: '',
    capacity: '',
    scope: '',
  });

  const set = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  // Read-only roles used to see the full form and a "Project created" screen,
  // while the write was silently rejected by the state layer.
  if (!canEdit) {
    return <><PageHeader eyebrow="Project lead workspace" title="Create new project" description="Creating projects is restricted to Project Leads." /><div className="mt-8 flex max-w-[620px] items-start gap-3 rounded-2xl border border-[#eadcb1] bg-[#fbf1d8] p-5"><ShieldAlert size={18} className="mt-0.5 shrink-0 text-[#9a711f]" /><p className="text-[12px] leading-6 text-[#8e681c]">You are signed in with read-only portfolio access. Ask a Project Lead to create the project, or sign in as a Lead to continue.</p></div></>;
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();

    const found: string[] = [];
    const name = form.name.trim();
    const aopCrore = Number(form.aop);
    const awardedCrore = Number(form.awarded);

    if (!name) found.push('Project name is required.');
    if (!isValidIsoDate(form.startDate)) found.push('Enter a valid start date.');
    if (!isValidIsoDate(form.targetDate)) found.push('Enter a valid target completion date.');
    // Empty or non-numeric inputs previously became NaN and rendered "₹NaN Cr".
    if (!Number.isFinite(aopCrore) || aopCrore < 0) found.push('AOP must be a number of 0 or more.');
    if (!Number.isFinite(awardedCrore) || awardedCrore < 0) found.push('Awarded amount must be a number of 0 or more.');
    if (Number.isFinite(aopCrore) && Number.isFinite(awardedCrore) && awardedCrore > aopCrore) {
      found.push('Awarded amount cannot exceed the AOP.');
    }
    if (
      isValidIsoDate(form.startDate) &&
      isValidIsoDate(form.targetDate) &&
      form.targetDate < form.startDate
    ) {
      found.push('Target completion must fall on or after the start date.');
    }

    if (found.length) {
      setErrors(found);
      return;
    }
    setErrors([]);

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const id = `${form.location.toLowerCase()}-${slug || 'project'}-${Date.now()}`;

    const created = addProject({
      id,
      name,
      location: form.location,
      category: form.category,
      code: `${form.location.slice(0, 3).toUpperCase()}-NEW-${new Date().getFullYear() % 100}`,
      health: 'Not started',
      progress: 0,
      targetDate: form.targetDate,
      targetLabel: formatFullDate(form.targetDate),
      aop: aopCrore * CRORE,
      awarded: awardedCrore * CRORE,
      spent: 0,
      nextMilestone: 'Project brief',
      nextMilestoneDate: form.startDate,
      leadId: user?.id ?? '',
      startDate: form.startDate,
      specification: {
        projectType: form.projectType,
        area: form.area,
        capacity: form.capacity,
        units: '',
        terminal: form.location,
        floor: '',
        scope: form.scope,
      },
      phases: [
        { name: 'Brief & scope', status: 'active', progress: 0, owner: 'PMO' },
        { name: 'Design development', status: 'upcoming', progress: 0, owner: 'Design' },
        { name: 'Procurement', status: 'upcoming', progress: 0, owner: 'Sourcing' },
        { name: 'Build & install', status: 'upcoming', progress: 0, owner: 'Projects' },
        { name: 'Handover', status: 'upcoming', progress: 0, owner: 'Operations' },
      ],
      milestones: [],
      issues: [],
      updates: [],
    });

    if (!created) {
      setErrors(['The project could not be saved. Refresh and try again.']);
      return;
    }

    setCreatedName(name);
    toast({ title: 'Project created', description: `${name} is now in the portfolio.` });
  };

  if (createdName) return <div className="mx-auto max-w-[760px] py-16 text-center"><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#e4f1ec] text-[#2e7c67]"><CheckCircle2 size={25} /></span><p className="mt-6 font-mono text-[10px] uppercase tracking-[.16em] text-[#2e7c67]">Project created</p><h1 className="mt-3 font-serif text-[44px] leading-none tracking-[-.05em] text-[#173e49]">{createdName} is ready for updates.</h1><p className="mx-auto mt-4 max-w-[480px] text-[13px] leading-6 text-muted-foreground">The project is saved in this browser and will still be here after a refresh.</p><Link href="/my-projects" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#173e49] px-4 py-3 text-[11px] font-bold text-white">Open my projects <ArrowUpRight size={15} /></Link></div>;

  return <><PageHeader eyebrow="Project lead workspace" title="Create new project" description="Capture the information needed to bring a new Encalm project into the control system." /><form onSubmit={submit} noValidate className="mt-8 max-w-[1000px] space-y-5">{errors.length > 0 && <div role="alert" className="rounded-2xl border border-[#f0c8c2] bg-[#fff5f2] p-4"><p className="text-[11px] font-extrabold text-[#b2473d]">Fix the following before creating the project</p><ul className="mt-2 list-disc space-y-1 pl-5 text-[11px] text-[#b2473d]">{errors.map((message) => <li key={message}>{message}</li>)}</ul></div>}<section className="rounded-2xl border border-border bg-card p-5 md:p-7"><h2 className="text-[18px] font-extrabold">1. Basic information</h2><div className="mt-5 grid gap-4 md:grid-cols-2"><label className="md:col-span-2"><span className="mb-2 block text-[11px] font-bold">Project name *</span><input required value={form.name} onChange={(event) => set('name', event.target.value)} placeholder="e.g. Goa Business Hotel" className="h-11 w-full rounded-xl border border-border bg-background px-3 text-[12px] outline-none focus:border-[#c9a04e]" /></label><label><span className="mb-2 block text-[11px] font-bold">Location *</span><select value={form.location} onChange={(event) => set('location', event.target.value)} className="h-11 w-full rounded-xl border border-border bg-background px-3 text-[12px]">{locations.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label><span className="mb-2 block text-[11px] font-bold">Category *</span><select value={form.category} onChange={(event) => set('category', event.target.value)} className="h-11 w-full rounded-xl border border-border bg-background px-3 text-[12px]">{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label><span className="mb-2 block text-[11px] font-bold">Project type</span><input value={form.projectType} onChange={(event) => set('projectType', event.target.value)} className="h-11 w-full rounded-xl border border-border bg-background px-3 text-[12px] outline-none" /></label><label><span className="mb-2 block text-[11px] font-bold">Start date *</span><input type="date" required value={form.startDate} onChange={(event) => set('startDate', event.target.value)} className="h-11 w-full rounded-xl border border-border bg-background px-3 text-[12px]" /></label><label><span className="mb-2 block text-[11px] font-bold">Target completion *</span><input type="date" required min={form.startDate} value={form.targetDate} onChange={(event) => set('targetDate', event.target.value)} className="h-11 w-full rounded-xl border border-border bg-background px-3 text-[12px]" /></label></div></section><section className="rounded-2xl border border-border bg-card p-5 md:p-7"><h2 className="text-[18px] font-extrabold">2. Specifications & commercial</h2><div className="mt-5 grid gap-4 md:grid-cols-2"><label><span className="mb-2 block text-[11px] font-bold">Area</span><input value={form.area} onChange={(event) => set('area', event.target.value)} placeholder="e.g. 24,000 sqft" className="h-11 w-full rounded-xl border border-border bg-background px-3 text-[12px] outline-none" /></label><label><span className="mb-2 block text-[11px] font-bold">Capacity / PAX</span><input value={form.capacity} onChange={(event) => set('capacity', event.target.value)} placeholder="e.g. 180 guests" className="h-11 w-full rounded-xl border border-border bg-background px-3 text-[12px] outline-none" /></label><label><span className="mb-2 block text-[11px] font-bold">AOP (₹ Cr) *</span><input type="number" min="0" step="0.1" required value={form.aop} onChange={(event) => set('aop', event.target.value)} className="h-11 w-full rounded-xl border border-border bg-background px-3 text-[12px] outline-none" /></label><label><span className="mb-2 block text-[11px] font-bold">Initial awarded amount (₹ Cr)</span><input type="number" min="0" step="0.1" value={form.awarded} onChange={(event) => set('awarded', event.target.value)} className="h-11 w-full rounded-xl border border-border bg-background px-3 text-[12px] outline-none" /></label><label className="md:col-span-2"><span className="mb-2 block text-[11px] font-bold">Scope</span><textarea value={form.scope} onChange={(event) => set('scope', event.target.value)} rows={4} placeholder="Describe the core project scope..." className="w-full rounded-xl border border-border bg-background px-3 py-3 text-[12px] outline-none" /></label></div></section><div className="flex justify-end"><button type="submit" className="rounded-xl bg-[#d6a95d] px-5 py-3 text-[11px] font-extrabold text-[#173e49] hover:bg-[#e2bd73]">Create project</button></div></form></>;
}

export default function Workspace({ view }: { view: WorkspaceView }) {
  return <div className="mx-auto max-w-[1500px] px-5 pb-14 pt-8 md:px-10 md:pt-10">{view === 'projects' && <ProjectsView />}{view === 'my-projects' && <ProjectsView mine />}{view === 'timeline' && <TimelineView />}{view === 'milestones' && <MilestonesView />}{view === 'issues' && <IssuesView />}{view === 'commercial' && <CommercialView />}{view === 'updates' && <UpdatesView />}{view === 'reports' && <ReportsView />}{view === 'new-project' && <NewProjectView />}</div>;
}

const CSV_COLUMNS = ['Project', 'Code', 'Location', 'Category', 'Lead', 'Health', 'Progress %', 'AOP (INR)', 'Awarded (INR)', 'Spent (INR)', 'Target date', 'Next milestone'] as const;

/**
 * Escapes a CSV cell. The leading-character guard stops spreadsheet apps from
 * evaluating a project name like `=cmd()` as a formula (CSV injection).
 */
function csvCell(value: string | number): string {
  const text = String(value ?? '');
  const guarded = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${guarded.replaceAll('"', '""')}"`;
}

function buildPortfolioCsv(projects: Project[]): string {
  const rows = projects.map((project) => [
    project.name,
    project.code,
    project.location,
    project.category,
    leadName(project.leadId),
    project.health,
    project.progress,
    project.aop,
    project.awarded,
    project.spent,
    project.targetDate,
    project.nextMilestone,
  ].map(csvCell).join(','));

  // BOM so Excel reads the ₹ sign and other UTF-8 characters correctly.
  return `\uFEFF${CSV_COLUMNS.map(csvCell).join(',')}\n${rows.join('\n')}`;
}

function downloadCsv(contents: string, filename: string): void {
  const blob = new Blob([contents], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser a tick to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
