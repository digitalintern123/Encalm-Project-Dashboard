import { useMemo, useState, useRef, type FormEvent, type ReactNode } from 'react';
import { Link } from 'wouter';
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
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
  UserPlus,
  Users,
} from 'lucide-react';
import { categories, formatCrore, healthOptions, locations, projectStatuses, issueCategories, type Category, type Health, type Project, type ProjectStatus, type IssueCategory, type IssueStatus, type ProjectIssue } from '@/data/projects';
import { useAppState } from '@/state/app-state';
import { useToast } from '@/hooks/use-toast';
import { CRORE } from '@/data/projects';
import { formatFullDate, isValidIsoDate, todayIso, todayLabel } from '@/lib/date';
import { initialsOf, leadName } from '@/data/users';
import { formatRatio, getCommercialSummary, getPortfolioCommercialSummary, calculateProjectStatus } from '@/lib/calculations';

export type WorkspaceView = 'projects' | 'my-projects' | 'timeline' | 'milestones' | 'issues' | 'commercial' | 'updates' | 'reports' | 'new-project' | 'team';

const healthTone: Record<Health, string> = { 'On track': 'bg-[#e4f1ec] text-[#2e7c67]', 'At risk': 'bg-[#f8edcf] text-[#9a711f]', Delayed: 'bg-[#fae5e1] text-[#b2473d]', 'Not started': 'bg-[#eef0ed] text-[#69716b]' };

export const statusTone: Record<ProjectStatus, string> = {
  'Yet to start': 'bg-[#eef0ed] text-[#69716b]',
  'In Design': 'bg-[#e8f1f5] text-[#2c6e8a]',
  'In Tendering': 'bg-[#fef4e6] text-[#b37418]',
  'Under Construction': 'bg-[#fff0eb] text-[#c2583f]',
  'Operational': 'bg-[#e4f1ec] text-[#2e7c67]',
};

function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div><p className="font-mono text-[10px] uppercase tracking-[.18em] text-[#9a711f]">{eyebrow}</p><h1 className="mt-3 font-serif text-[42px] leading-none tracking-[-.05em] text-[#173e49] md:text-[52px]">{title}</h1><p className="mt-4 max-w-[620px] text-[13px] leading-6 text-muted-foreground">{description}</p></div>{action}</div>;
}

function ProjectTable({ rows }: { rows: Project[] }) {
  return (
    <div className="mt-7 overflow-hidden rounded-2xl border border-border bg-card shadow-sm shadow-[#173e49]/[.03]">
      <div className="hidden grid-cols-[minmax(190px,1.3fr)_90px_120px_110px_100px_90px_110px_95px] gap-3 border-b border-border bg-[#f7f4ec] px-5 py-3 font-mono text-[9px] uppercase tracking-[.1em] text-muted-foreground md:grid">
        <span>Project</span>
        <span>Location</span>
        <span>Status</span>
        <span>Lead</span>
        <span>Progress</span>
        <span>Pax / Keys</span>
        <span>Target</span>
        <span>Health</span>
      </div>
      {rows.length === 0 && <p className="px-5 py-10 text-center text-[12px] text-muted-foreground">No projects match this view. Try a broader search.</p>}
      {rows.map((project) => (
        <Link
          href={`/project/${project.id}`}
          key={project.id}
          className="grid gap-3 border-b border-border/70 px-5 py-4 transition hover:bg-[#fcf5e5] md:grid-cols-[minmax(190px,1.3fr)_90px_120px_110px_100px_90px_110px_95px] md:items-center"
        >
          <div className="flex items-center justify-between gap-3">
            <span>
              <span className="block text-[12px] font-bold">{project.name}</span>
              <span className="mt-1 block font-mono text-[9px] uppercase tracking-[.1em] text-muted-foreground">{project.code}</span>
            </span>
            <ArrowUpRight size={15} className="text-muted-foreground/50 md:hidden" />
          </div>
          <span className="text-[11px] text-muted-foreground">{project.location}</span>
          <span>
            <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-bold ${statusTone[project.status || 'Yet to start']}`}>
              {project.status || 'Yet to start'}
            </span>
          </span>
          <span className="text-[11px] font-semibold">{leadName(project.leadId)}</span>
          <span className="flex items-center gap-2 text-[11px] font-bold">
            <span className="h-1.5 flex-1 rounded-full bg-[#e7e7dc]">
              <span className="block h-full rounded-full bg-[#3d9a7e]" style={{ width: `${project.progress}%` }} />
            </span>
            {project.progress}%
          </span>
          <span className="text-[11px] text-muted-foreground">{project.paxKeys || project.specification?.capacity || '—'}</span>
          <span className="text-[11px] font-semibold">{project.targetLabel}</span>
          <span className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-bold ${healthTone[project.health]}`}>{project.health}</span>
        </Link>
      ))}
    </div>
  );
}

function ProjectsView({ mine = false }: { mine?: boolean }) {
  const { projects, user } = useAppState();
  const [search, setSearch] = useState('');
  const [health, setHealth] = useState<'All' | Health>('All');
  const [location, setLocation] = useState<'All' | (typeof locations)[number]>('All');
  const [status, setStatus] = useState<'All' | ProjectStatus>('All');
  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return projects.filter((project) => {
      if (mine && project.leadId !== user?.id) return false;
      const haystack = `${project.name} ${project.code} ${leadName(project.leadId)}`.toLowerCase();
      if (term && !haystack.includes(term)) return false;
      if (health !== 'All' && project.health !== health) return false;
      if (location !== 'All' && project.location !== location) return false;
      if (status !== 'All' && (project.status || 'Yet to start') !== status) return false;
      return true;
    });
  }, [projects, mine, user?.id, search, health, location, status]);
  return (
    <>
      <PageHeader
        eyebrow={mine ? 'Project lead workspace' : 'Project register'}
        title={mine ? 'My projects' : 'All projects'}
        description={mine ? 'The projects you own, the milestones ahead, and the updates that need to move.' : 'Explore every Encalm project with the context needed for a useful first read.'}
        action={mine ? <Link href="/new-project" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#d6a95d] px-4 py-3 text-[11px] font-extrabold text-[#173e49] hover:bg-[#e2bd73]"><Plus size={15} /> New project</Link> : undefined}
      />
      <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 sm:flex-row sm:flex-wrap">
        <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-border bg-background px-3 text-muted-foreground">
          <Search size={15} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search project, code or lead" className="min-w-0 flex-1 bg-transparent text-[11px] outline-none" />
        </label>
        <select value={location} onChange={(event) => setLocation(event.target.value as typeof location)} className="h-10 rounded-xl border border-border bg-background px-3 text-[11px] font-semibold">
          <option value="All">All locations</option>
          {locations.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="h-10 rounded-xl border border-border bg-background px-3 text-[11px] font-semibold">
          <option value="All">All statuses</option>
          {projectStatuses.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select value={health} onChange={(event) => setHealth(event.target.value as typeof health)} className="h-10 rounded-xl border border-border bg-background px-3 text-[11px] font-semibold">
          <option value="All">All health</option>
          {healthOptions.map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>
      <p className="mt-5 font-mono text-[10px] uppercase tracking-[.12em] text-muted-foreground">{rows.length} projects shown</p>
      <ProjectTable rows={rows} />
    </>
  );
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
  const { projects, role, canEdit, approveMilestone, completeMilestone } = useAppState();
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
          canEdit ? (
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
                    {canEdit && isPendingApproval && (
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

                    {canEdit && !isComplete && (
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
  const { projects, canEdit, updateIssue, addIssue } = useAppState();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'All' | 'Critical' | 'Open' | 'Resolved'>('All');
  const [scope, setScope] = useState<'with-issues' | 'all'>('with-issues');
  const [userToggled, setUserToggled] = useState<Record<string, boolean>>({});
  const [addingForProjectId, setAddingForProjectId] = useState<string | null>(null);

  const [newDraft, setNewDraft] = useState({
    title: '',
    detail: '',
    category: 'Design' as IssueCategory,
    severity: 'Medium' as 'High' | 'Medium' | 'Low',
    stage: '',
    owner: '',
    dueDate: '',
    issueAriseDate: todayLabel(),
    targetClosureDate: '',
    impactCost: '',
    impactSchedule: '',
    impactScope: '',
    action: '',
  });

  const setDraftField = (key: keyof typeof newDraft, value: string) =>
    setNewDraft((cur) => ({ ...cur, [key]: value }));

  // Aggregate and filter issues per project
  const projectIssueData = useMemo(() => {
    const term = search.trim().toLowerCase();

    return projects.map((project) => {
      const allProjectIssues = project.issues.map((issue, issueIndex) => ({
        ...issue,
        project,
        issueIndex,
      }));

      const filteredIssues = allProjectIssues.filter((issue) => {
        if (filter === 'Critical' && issue.severity !== 'High') return false;
        if (filter === 'Open' && (issue.status === 'Resolved' || issue.status === 'Closed')) return false;
        if (filter === 'Resolved' && issue.status !== 'Resolved' && issue.status !== 'Closed') return false;

        if (term) {
          const matchProject = `${project.name} ${project.code} ${project.location} ${leadName(project.leadId)}`.toLowerCase().includes(term);
          const matchIssue = `${issue.title} ${issue.detail} ${issue.owner} ${issue.category ?? ''} ${issue.stage ?? ''}`.toLowerCase().includes(term);
          if (!matchProject && !matchIssue) return false;
        }

        return true;
      });

      const totalProjectIssuesCount = project.issues.length;
      const criticalCount = project.issues.filter((i) => i.severity === 'High').length;
      const openCount = project.issues.filter((i) => i.status !== 'Resolved' && i.status !== 'Closed').length;
      const resolvedCount = project.issues.filter((i) => i.status === 'Resolved' || i.status === 'Closed').length;

      const projectMatchesSearch = term
        ? `${project.name} ${project.code} ${project.location} ${leadName(project.leadId)}`.toLowerCase().includes(term)
        : true;

      return {
        project,
        allProjectIssues,
        filteredIssues,
        totalProjectIssuesCount,
        criticalCount,
        openCount,
        resolvedCount,
        projectMatchesSearch,
      };
    });
  }, [projects, search, filter]);

  // Portfolio-level summary counts
  const portfolioCounts = useMemo(() => {
    let total = 0;
    let critical = 0;
    let open = 0;
    let resolved = 0;
    let projectsWithIssues = 0;

    for (const p of projects) {
      if (p.issues.length > 0) projectsWithIssues++;
      for (const i of p.issues) {
        total++;
        if (i.severity === 'High') critical++;
        if (i.status !== 'Resolved' && i.status !== 'Closed') open++;
        if (i.status === 'Resolved' || i.status === 'Closed') resolved++;
      }
    }
    return { total, critical, open, resolved, projectsWithIssues };
  }, [projects]);

  // Filter project cards to display
  const displayedProjects = useMemo(() => {
    return projectIssueData.filter((item) => {
      if (search.trim()) {
        return item.projectMatchesSearch || item.filteredIssues.length > 0;
      }
      if (scope === 'with-issues') {
        return item.filteredIssues.length > 0;
      }
      return true;
    });
  }, [projectIssueData, search, scope]);

  // Determine if a project is expanded
  const isProjectExpanded = (projectId: string, hasMatchingIssues: boolean) => {
    if (projectId in userToggled) {
      return !!userToggled[projectId];
    }
    // Default open if project has matching issues
    return hasMatchingIssues;
  };

  const toggleProject = (projectId: string, currentState: boolean) => {
    setUserToggled((prev) => ({ ...prev, [projectId]: !currentState }));
  };

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    for (const item of displayedProjects) {
      next[item.project.id] = true;
    }
    setUserToggled(next);
  };

  const collapseAll = () => {
    const next: Record<string, boolean> = {};
    for (const item of displayedProjects) {
      next[item.project.id] = false;
    }
    setUserToggled(next);
  };

  const handleStatusChange = (projectId: string, issueIndex: number, newStatus: string) => {
    updateIssue(projectId, issueIndex, { status: newStatus as any });
    toast({
      title: 'Issue Status Updated',
      description: `Issue updated to "${newStatus}".`,
    });
  };

  const handleOpenAddForm = (project: Project) => {
    setAddingForProjectId(project.id);
    setUserToggled((prev) => ({ ...prev, [project.id]: true }));
    setNewDraft({
      title: '',
      detail: '',
      category: 'Design',
      severity: 'Medium',
      stage: project.phases.find((ph) => ph.status === 'active')?.name ?? project.phases[0]?.name ?? '',
      owner: '',
      dueDate: '',
      issueAriseDate: todayLabel(),
      targetClosureDate: '',
      impactCost: '',
      impactSchedule: '',
      impactScope: '',
      action: '',
    });
  };

  const handleSaveNewIssue = (projectId: string) => {
    if (!newDraft.title.trim() || !newDraft.detail.trim()) {
      toast({
        variant: 'destructive',
        title: 'Required fields missing',
        description: 'Please provide both an issue title and description.',
      });
      return;
    }

    addIssue(projectId, {
      ...newDraft,
      owner: newDraft.owner.trim() || 'Project Lead',
      status: 'Open',
      dateRaised: newDraft.issueAriseDate || todayLabel(),
      issueAriseDate: newDraft.issueAriseDate || todayLabel(),
      dueDate: newDraft.targetClosureDate || newDraft.dueDate,
      targetClosureDate: newDraft.targetClosureDate || newDraft.dueDate,
    });

    setAddingForProjectId(null);
    toast({
      title: 'Issue Logged',
      description: `Added "${newDraft.title}" to project register.`,
    });
  };

  return (
    <>
      <PageHeader
        eyebrow="Execution Register"
        title="Issues & risks"
        description="A project-centric register of the blockers, decisions, and risks that can change project outcomes."
      />

      {/* Filter and Control Bar */}
      <div className="mt-8 space-y-4">
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center">
          <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-border bg-background px-3 text-muted-foreground">
            <Search size={15} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by project, code, lead, issue title or owner..."
              className="min-w-0 flex-1 bg-transparent text-[11px] outline-none"
            />
          </label>

          {/* Project View Scope Toggle */}
          <div className="flex rounded-xl border border-border bg-background p-1 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setScope('with-issues')}
              className={`rounded-lg px-3 py-1.5 transition ${
                scope === 'with-issues' ? 'bg-[#173e49] text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Projects with issues ({portfolioCounts.projectsWithIssues})
            </button>
            <button
              type="button"
              onClick={() => setScope('all')}
              className={`rounded-lg px-3 py-1.5 transition ${
                scope === 'all' ? 'bg-[#173e49] text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All projects ({projects.length})
            </button>
          </div>
        </div>

        {/* Issue Status Tabs & Quick Expand/Collapse Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
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
                {tab === 'Critical' ? 'Critical (High)' : tab}
                <span className="ml-1.5 font-mono text-[9px] opacity-70">
                  (
                  {tab === 'All'
                    ? portfolioCounts.total
                    : tab === 'Critical'
                      ? portfolioCounts.critical
                      : tab === 'Open'
                        ? portfolioCounts.open
                        : portfolioCounts.resolved}
                  )
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground">
            <button
              type="button"
              onClick={expandAll}
              className="rounded-lg border border-border bg-card px-2.5 py-1.5 hover:bg-muted hover:text-foreground"
            >
              Expand all
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="rounded-lg border border-border bg-card px-2.5 py-1.5 hover:bg-muted hover:text-foreground"
            >
              Collapse all
            </button>
          </div>
        </div>
      </div>

      {/* Primary Project List with Issues Sub-Sections */}
      <div className="mt-7 space-y-5">
        {displayedProjects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center">
            <ShieldAlert size={28} className="mx-auto text-muted-foreground/60" />
            <h3 className="mt-3 text-[14px] font-extrabold text-foreground">No projects match this issues filter</h3>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Try switching to "All projects" or choosing a different filter tab above.
            </p>
          </div>
        ) : (
          displayedProjects.map((item) => {
            const { project, filteredIssues } = item;
            const expanded = isProjectExpanded(project.id, filteredIssues.length > 0);
            const highSeverityIssues = filteredIssues.filter((i) => i.severity === 'High');
            const standardIssues = filteredIssues.filter((i) => i.severity !== 'High');
            const isAdding = addingForProjectId === project.id;

            return (
              <div
                key={project.id}
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:border-[#d9c585]"
              >
                {/* Project Header Bar */}
                <div
                  className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center bg-card hover:bg-[#fcf5e5]/50 transition cursor-pointer select-none"
                  onClick={() => toggleProject(project.id, expanded)}
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      aria-label={expanded ? 'Collapse project' : 'Expand project'}
                      className="mt-1 grid size-7 place-items-center rounded-lg border border-border bg-background text-muted-foreground"
                    >
                      {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/project/${project.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-[14px] font-extrabold text-foreground hover:text-[#2e7c67] hover:underline"
                        >
                          {project.name}
                        </Link>
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${statusTone[project.status || 'Yet to start']}`}>
                          {project.status || 'Yet to start'}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${healthTone[project.health]}`}>
                          {project.health}
                        </span>
                      </div>
                      <p className="mt-1 font-mono text-[9px] uppercase tracking-[.1em] text-muted-foreground">
                        {project.code} · {project.location} · {project.category} · Lead: {leadName(project.leadId)}
                      </p>
                    </div>
                  </div>

                  {/* Right Header Metrics & Actions */}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5 font-mono text-[10px]">
                      {item.criticalCount > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#fae5e1] px-2.5 py-1 font-bold text-[#b2473d]">
                          <ShieldAlert size={11} /> {item.criticalCount} Critical
                        </span>
                      )}
                      {item.openCount > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#f8edcf] px-2.5 py-1 font-bold text-[#9a711f]">
                          <AlertTriangle size={11} /> {item.openCount} Open
                        </span>
                      )}
                      <span className="rounded-full bg-[#eef0ed] px-2.5 py-1 font-bold text-muted-foreground">
                        {item.totalProjectIssuesCount} {item.totalProjectIssuesCount === 1 ? 'issue' : 'issues'}
                      </span>
                    </div>

                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => handleOpenAddForm(project)}
                        className="inline-flex items-center gap-1 rounded-xl bg-[#d6a95d] px-3 py-1.5 text-[10px] font-bold text-[#173e49] hover:bg-[#e2bd73]"
                      >
                        <Plus size={12} /> Log issue
                      </button>
                    )}

                    <Link
                      href={`/project/${project.id}`}
                      className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-muted-foreground hover:text-foreground"
                    >
                      View project <ArrowUpRight size={12} />
                    </Link>
                  </div>
                </div>

                {/* Sub-Section: Issues and Risks within Project */}
                {expanded && (
                  <div className="border-t border-border/70 bg-[#fbfaf6]/70 p-5 md:p-6">
                    {/* Inline Form to Add an Issue to this specific Project */}
                    {isAdding && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSaveNewIssue(project.id);
                        }}
                        className="mb-6 space-y-3 rounded-2xl border border-[#eadcb1] bg-[#fff8e9] p-5 shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-[12px] font-extrabold text-[#9a711f]">Log issue for {project.name}</p>
                          <button
                            type="button"
                            onClick={() => setAddingForProjectId(null)}
                            className="text-[11px] text-muted-foreground hover:text-foreground"
                          >
                            Cancel
                          </button>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <input
                            required
                            value={newDraft.title}
                            onChange={(e) => setDraftField('title', e.target.value)}
                            placeholder="Issue or risk title *"
                            className="h-10 rounded-lg border border-border bg-white px-3 text-[11px]"
                          />
                          <select
                            value={newDraft.category}
                            onChange={(e) => setDraftField('category', e.target.value)}
                            className="h-10 rounded-lg border border-border bg-white px-3 text-[11px]"
                          >
                            {issueCategories.map((cat) => (
                              <option key={cat} value={cat}>
                                Category: {cat}
                              </option>
                            ))}
                          </select>
                          <select
                            value={newDraft.stage}
                            onChange={(e) => setDraftField('stage', e.target.value)}
                            className="h-10 rounded-lg border border-border bg-white px-3 text-[11px]"
                          >
                            {project.phases.map((ph, idx) => (
                              <option key={`${ph.name}-${idx}`} value={ph.name}>
                                Stage: {ph.name}
                              </option>
                            ))}
                          </select>
                          <select
                            value={newDraft.severity}
                            onChange={(e) => setDraftField('severity', e.target.value)}
                            className="h-10 rounded-lg border border-border bg-white px-3 text-[11px]"
                          >
                            <option value="High">Severity: High (Critical decision)</option>
                            <option value="Medium">Severity: Medium (Standard risk)</option>
                            <option value="Low">Severity: Low (Minor tracking)</option>
                          </select>
                          <input
                            value={newDraft.owner}
                            onChange={(e) => setDraftField('owner', e.target.value)}
                            placeholder="Owner / Responsible person"
                            className="h-10 rounded-lg border border-border bg-white px-3 text-[11px]"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <label className="block">
                              <span className="mb-1 block font-mono text-[9px] uppercase text-muted-foreground">Arise date</span>
                              <input
                                type="date"
                                value={newDraft.issueAriseDate}
                                onChange={(e) => setDraftField('issueAriseDate', e.target.value)}
                                className="h-10 w-full rounded-lg border border-border bg-white px-2 text-[10px]"
                              />
                            </label>
                            <label className="block">
                              <span className="mb-1 block font-mono text-[9px] uppercase text-muted-foreground">Target closure</span>
                              <input
                                type="date"
                                value={newDraft.targetClosureDate}
                                onChange={(e) => setDraftField('targetClosureDate', e.target.value)}
                                className="h-10 w-full rounded-lg border border-border bg-white px-2 text-[10px]"
                              />
                            </label>
                          </div>
                        </div>

                        <textarea
                          required
                          value={newDraft.detail}
                          onChange={(e) => setDraftField('detail', e.target.value)}
                          placeholder="Describe the issue, root cause, and current situation *"
                          rows={2}
                          className="w-full rounded-lg border border-border bg-white px-3 py-2 text-[11px]"
                        />

                        <div className="grid gap-3 md:grid-cols-4">
                          <input
                            value={newDraft.impactSchedule}
                            onChange={(e) => setDraftField('impactSchedule', e.target.value)}
                            placeholder="Schedule impact (e.g. +7 days)"
                            className="h-9 rounded-lg border border-border bg-white px-2 text-[10px]"
                          />
                          <input
                            value={newDraft.impactCost}
                            onChange={(e) => setDraftField('impactCost', e.target.value)}
                            placeholder="Cost impact (e.g. ₹5 Lakhs)"
                            className="h-9 rounded-lg border border-border bg-white px-2 text-[10px]"
                          />
                          <input
                            value={newDraft.impactScope}
                            onChange={(e) => setDraftField('impactScope', e.target.value)}
                            placeholder="Scope impact"
                            className="h-9 rounded-lg border border-border bg-white px-2 text-[10px]"
                          />
                          <input
                            value={newDraft.action}
                            onChange={(e) => setDraftField('action', e.target.value)}
                            placeholder="Immediate next action"
                            className="h-9 rounded-lg border border-border bg-white px-2 text-[10px]"
                          />
                        </div>

                        <div className="flex gap-2 pt-1">
                          <button type="submit" className="rounded-lg bg-[#173e49] px-4 py-2 text-[10px] font-bold text-white">
                            Save issue
                          </button>
                          <button
                            type="button"
                            onClick={() => setAddingForProjectId(null)}
                            className="rounded-lg border border-border bg-white px-3 py-2 text-[10px] font-bold"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}

                    {filteredIssues.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border bg-white/70 p-6 text-center">
                        <p className="text-[11px] text-muted-foreground">
                          No issues or risks matching "{filter}" for {project.name}.
                        </p>
                        {canEdit && !isAdding && (
                          <button
                            type="button"
                            onClick={() => handleOpenAddForm(project)}
                            className="mt-3 inline-flex items-center gap-1 rounded-lg border border-[#eadcb1] bg-[#fff8e9] px-3 py-1.5 text-[10px] font-bold text-[#9a711f]"
                          >
                            <Plus size={11} /> Log an issue for this project
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Sub-Section 1: Critical Issues (High Severity) */}
                        {highSeverityIssues.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <span className="grid size-6 place-items-center rounded-lg bg-[#fae5e1] text-[#b2473d]">
                                <ShieldAlert size={14} />
                              </span>
                              <h4 className="text-[12px] font-extrabold text-[#b2473d] uppercase tracking-[.06em]">
                                Critical Issues & Blockers ({highSeverityIssues.length})
                              </h4>
                            </div>

                            <div className="grid gap-3 md:grid-cols-2">
                              {highSeverityIssues.map((issue) => (
                                <div
                                  key={`${project.id}-${issue.id ?? issue.title}-${issue.issueIndex}`}
                                  className="rounded-xl border border-[#f0c8c2] bg-[#fff5f2] p-4 shadow-sm"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="rounded-full bg-[#fae5e1] px-2 py-0.5 font-mono text-[8px] uppercase font-bold text-[#b2473d]">
                                          High Severity
                                        </span>
                                        {issue.category && (
                                          <span className="rounded-full bg-white/80 px-2 py-0.5 font-mono text-[8px] uppercase tracking-[.08em] text-muted-foreground border border-[#f0c8c2]/50">
                                            {issue.category}
                                          </span>
                                        )}
                                        {issue.stage && (
                                          <span className="font-mono text-[9px] text-muted-foreground">
                                            Stage: <strong className="text-foreground">{issue.stage}</strong>
                                          </span>
                                        )}
                                      </div>
                                      <h5 className="mt-2 text-[12px] font-bold text-foreground">{issue.title}</h5>
                                    </div>
                                  </div>

                                  <p className="mt-2 text-[11px] leading-5 text-muted-foreground">{issue.detail}</p>

                                  {(issue.impactSchedule || issue.impactCost || issue.impactScope || issue.action) && (
                                    <div className="mt-3 flex flex-wrap gap-1.5 border-t border-[#f0c8c2]/60 pt-2 text-[10px]">
                                      {issue.impactSchedule && (
                                        <span className="rounded-md bg-white/90 px-2 py-0.5 font-mono text-[#b2473d] border border-[#f0c8c2]/60">
                                          Schedule: {issue.impactSchedule}
                                        </span>
                                      )}
                                      {issue.impactCost && (
                                        <span className="rounded-md bg-white/90 px-2 py-0.5 font-mono text-[#b2473d] border border-[#f0c8c2]/60">
                                          Cost: {issue.impactCost}
                                        </span>
                                      )}
                                      {issue.action && (
                                        <span className="rounded-md bg-white/90 px-2 py-0.5 text-muted-foreground border border-border">
                                          Action: <strong className="text-foreground">{issue.action}</strong>
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#f0c8c2]/60 pt-2.5 font-mono text-[9px]">
                                    <div className="text-muted-foreground">
                                      <span>Owner: <strong className="text-foreground">{issue.owner || 'Unassigned'}</strong></span>
                                      {(issue.targetClosureDate || issue.dueDate) && (
                                        <span className="ml-2">
                                          Target: <strong className="text-foreground">{issue.targetClosureDate || issue.dueDate}</strong>
                                        </span>
                                      )}
                                    </div>

                                    {canEdit ? (
                                      <select
                                        value={issue.status || 'Open'}
                                        onChange={(e) => handleStatusChange(project.id, issue.issueIndex, e.target.value)}
                                        className="rounded-lg border border-border bg-white px-2 py-1 text-[10px] font-bold outline-none"
                                      >
                                        <option value="Open">Open</option>
                                        <option value="Under review">Under review</option>
                                        <option value="Action in progress">Action in progress</option>
                                        <option value="Resolved">Resolved</option>
                                        <option value="Closed">Closed</option>
                                      </select>
                                    ) : (
                                      <span className="rounded-full bg-white px-2 py-0.5 font-bold text-foreground">
                                        {issue.status || 'Open'}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Sub-Section 2: Standard Issues & Risks (Medium / Low Severity) */}
                        {standardIssues.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <span className="grid size-6 place-items-center rounded-lg bg-[#f8edcf] text-[#9a711f]">
                                <AlertTriangle size={14} />
                              </span>
                              <h4 className="text-[12px] font-extrabold text-[#9a711f] uppercase tracking-[.06em]">
                                Standard Issues & Risks ({standardIssues.length})
                              </h4>
                            </div>

                            <div className="grid gap-3 md:grid-cols-2">
                              {standardIssues.map((issue) => (
                                <div
                                  key={`${project.id}-${issue.id ?? issue.title}-${issue.issueIndex}`}
                                  className="rounded-xl border border-border bg-white p-4 shadow-sm hover:border-[#eadcb1] transition"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        <span
                                          className={`rounded-full px-2 py-0.5 font-mono text-[8px] uppercase font-bold ${
                                            issue.severity === 'Medium' ? 'bg-[#f8edcf] text-[#9a711f]' : 'bg-[#eef0ed] text-muted-foreground'
                                          }`}
                                        >
                                          {issue.severity || 'Medium'} Severity
                                        </span>
                                        {issue.category && (
                                          <span className="rounded-full bg-[#f8f6f0] px-2 py-0.5 font-mono text-[8px] uppercase tracking-[.08em] text-muted-foreground border border-border/70">
                                            {issue.category}
                                          </span>
                                        )}
                                        {issue.stage && (
                                          <span className="font-mono text-[9px] text-muted-foreground">
                                            Stage: <strong className="text-foreground">{issue.stage}</strong>
                                          </span>
                                        )}
                                      </div>
                                      <h5 className="mt-2 text-[12px] font-bold text-foreground">{issue.title}</h5>
                                    </div>
                                  </div>

                                  <p className="mt-2 text-[11px] leading-5 text-muted-foreground">{issue.detail}</p>

                                  {(issue.impactSchedule || issue.impactCost || issue.impactScope || issue.action) && (
                                    <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border/60 pt-2 text-[10px]">
                                      {issue.impactSchedule && (
                                        <span className="rounded-md bg-[#f8f6f0] px-2 py-0.5 font-mono text-[#9a711f] border border-border/70">
                                          Schedule: {issue.impactSchedule}
                                        </span>
                                      )}
                                      {issue.impactCost && (
                                        <span className="rounded-md bg-[#f8f6f0] px-2 py-0.5 font-mono text-[#9a711f] border border-border/70">
                                          Cost: {issue.impactCost}
                                        </span>
                                      )}
                                      {issue.action && (
                                        <span className="rounded-md bg-[#f8f6f0] px-2 py-0.5 text-muted-foreground border border-border/70">
                                          Action: <strong className="text-foreground">{issue.action}</strong>
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2.5 font-mono text-[9px]">
                                    <div className="text-muted-foreground">
                                      <span>Owner: <strong className="text-foreground">{issue.owner || 'Unassigned'}</strong></span>
                                      {(issue.targetClosureDate || issue.dueDate) && (
                                        <span className="ml-2">
                                          Target: <strong className="text-foreground">{issue.targetClosureDate || issue.dueDate}</strong>
                                        </span>
                                      )}
                                    </div>

                                    {canEdit ? (
                                      <select
                                        value={issue.status || 'Open'}
                                        onChange={(e) => handleStatusChange(project.id, issue.issueIndex, e.target.value)}
                                        className="rounded-lg border border-border bg-white px-2 py-1 text-[10px] font-bold outline-none"
                                      >
                                        <option value="Open">Open</option>
                                        <option value="Under review">Under review</option>
                                        <option value="Action in progress">Action in progress</option>
                                        <option value="Resolved">Resolved</option>
                                        <option value="Closed">Closed</option>
                                      </select>
                                    ) : (
                                      <span className="rounded-full bg-[#f8f6f0] px-2 py-0.5 font-bold text-foreground">
                                        {issue.status || 'Open'}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </>
  );
}

function CommercialView() {
  const { projects, role, canEdit } = useAppState();
  const portfolio = getPortfolioCommercialSummary(projects);
  return (
    <>
      <PageHeader
        eyebrow="Commercial"
        title="Budget & AOP"
        description="Portfolio-level capital position, with a project view of Approved Budget (AOP), Committed Cost, Projected Cost, and Spent Till Date."
      />
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-5 flex flex-col justify-between">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[.14em] text-muted-foreground">Approved Budget (AOP)</p>
            <p className="mt-4 text-[27px] font-extrabold">{formatCrore(portfolio.totalAop)}</p>
          </div>
          <div className="mt-2 space-y-0.5 text-[10px] text-muted-foreground">
            <div>{formatCrore(portfolio.totalAwarded)} committed</div>
            <div>{formatCrore(portfolio.totalSpent)} spent</div>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 flex flex-col justify-between">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[.14em] text-muted-foreground">Committed / Awarded</p>
            <p className="mt-4 text-[27px] font-extrabold">{formatCrore(portfolio.totalAwarded)}</p>
          </div>
          <p className="mt-2 text-[10px] text-[#2e7c67]">{formatRatio(portfolio.awardRatePct)} commitment rate</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 flex flex-col justify-between">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[.14em] text-muted-foreground">Projected Cost</p>
            <p className="mt-4 text-[27px] font-extrabold">{formatCrore(portfolio.totalProjectedCost)}</p>
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">
            Variance: {portfolio.totalProjectedCost >= portfolio.totalAop ? '+' : ''}{formatCrore(portfolio.totalProjectedCost - portfolio.totalAop)}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 flex flex-col justify-between">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[.14em] text-muted-foreground">Spent Till Date</p>
            <p className="mt-4 text-[27px] font-extrabold">{formatCrore(portfolio.totalSpent)}</p>
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">{formatRatio(portfolio.spentRatePct)} of awarded</p>
        </div>
      </div>

      <div className="mt-7 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="hidden grid-cols-[minmax(180px,1.2fr)_110px_110px_110px_110px_110px_90px_80px] gap-3 border-b border-border bg-[#f7f4ec] px-5 py-3 font-mono text-[9px] uppercase tracking-[.1em] text-muted-foreground md:grid">
          <span>Project</span>
          <span>Approved (AOP)</span>
          <span>Committed</span>
          <span>Projected</span>
          <span>Spent</span>
          <span>Cost Variance</span>
          <span>Status</span>
          <span>Access</span>
        </div>
        {projects.length === 0 && (
          <p className="px-5 py-10 text-center text-[12px] text-muted-foreground">No projects found. Create a project to view commercials.</p>
        )}
        {projects.map((project) => {
          const commercial = getCommercialSummary(project);
          return (
            <div
              key={project.id}
              className="grid gap-2 border-b border-border/70 px-5 py-4 md:grid-cols-[minmax(180px,1.2fr)_110px_110px_110px_110px_110px_90px_80px] md:items-center"
            >
              <Link href={`/project/${project.id}`} className="text-[12px] font-bold hover:text-[#2e7c67]">
                {project.name}
              </Link>
              <span className="text-[11px]">{formatCrore(commercial.aop)}</span>
              <span className="text-[11px]">{formatCrore(commercial.awarded)}</span>
              <span className="text-[11px] font-semibold">{formatCrore(commercial.projectedCost)}</span>
              <span className="text-[11px]">{formatCrore(commercial.spent)}</span>
              <span className={`text-[11px] font-bold ${commercial.overBudget ? 'text-[#b2473d]' : 'text-[#2e7c67]'}`}>
                {commercial.costVariance > 0 ? `+${formatCrore(commercial.costVariance)}` : formatCrore(commercial.costVariance)}
              </span>
              <span className="text-[10px] text-muted-foreground">{project.status || 'Yet to start'}</span>
              <span className="text-[10px] font-semibold text-muted-foreground">{canEdit ? 'Editable' : 'View only'}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}

function UpdatesView() {
  const { projects, role, canEdit } = useAppState();
  const updates = projects.flatMap((project) => project.updates.map((update) => ({ ...update, project }))).sort((a, b) => b.date.localeCompare(a.date));
  return <><PageHeader eyebrow="Project updates" title="Update feed" description="A chronological read of the decisions, progress signals, and changes coming from project teams." action={canEdit ? <Link href="/my-projects" className="inline-flex items-center gap-2 rounded-xl bg-[#d6a95d] px-4 py-3 text-[11px] font-extrabold text-[#173e49] hover:bg-[#e2bd73]"><Plus size={15} /> Post an update</Link> : undefined} /><div className="mt-8 max-w-[900px] space-y-3">{updates.length === 0 && <p className="rounded-2xl border border-dashed border-border p-10 text-center text-[12px] text-muted-foreground">No project updates posted yet.</p>}{updates.slice(0, 15).map((update, index) => <Link href={`/project/${update.project.id}`} key={`${update.project.id}-${update.date}-${update.author}-${index}`} className="flex gap-4 rounded-2xl border border-border bg-card p-5 transition hover:border-[#d9c585]"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#e4f1ec] text-[10px] font-bold text-[#2e7c67]">{initialsOf(update.author)}</span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><strong className="text-[12px]">{update.project.name}</strong><span className="font-mono text-[9px] uppercase tracking-[.1em] text-muted-foreground">{update.date}</span></span><p className="mt-2 text-[12px] leading-5 text-muted-foreground">{update.text}</p><span className="mt-3 block font-mono text-[9px] uppercase tracking-[.1em] text-[#2e7c67]">Updated by {update.author} · {update.role}</span></span></Link>)}</div></>;
}

function ReportsView() {
  const { projects, addProject } = useAppState();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const summary = useMemo(() => {
    const total = projects.length;
    const delayed = projects.filter((project) => project.health === 'Delayed').length;
    const atRisk = projects.filter((project) => project.health === 'At risk').length;
    const averageProgress = total
      ? Math.round(projects.reduce((sum, project) => sum + project.progress, 0) / total)
      : 0;
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

  const exportJsonBackup = () => {
    if (projects.length === 0) {
      toast({ title: 'Nothing to backup', description: 'There are no projects to backup.' });
      return;
    }
    const blob = new Blob([JSON.stringify(projects, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `encalm-projects-backup-${todayIso()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Backup downloaded', description: `Full portfolio backup saved as JSON.` });
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const imported = JSON.parse(text);
        if (!Array.isArray(imported)) throw new Error('Invalid backup file format');
        let count = 0;
        for (const p of imported) {
          if (p?.name && p?.location) {
            addProject(p);
            count++;
          }
        }
        toast({ title: 'Backup restored', description: `Restored ${count} projects successfully.` });
      } catch (err: any) {
        toast({ variant: 'destructive', title: 'Restore failed', description: err.message || 'Could not parse JSON file.' });
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const cards: { label: string; value: string; icon: typeof TrendingUp }[] = [
    { label: 'Portfolio summary', value: `${summary.total} active projects`, icon: TrendingUp },
    { label: 'Project health', value: `${summary.atRisk} at risk · ${summary.delayed} delayed`, icon: ShieldAlert },
    { label: 'Project progress', value: `${summary.averageProgress}% average`, icon: Target },
    { label: 'Delayed projects', value: `${summary.delayed} need recovery plans`, icon: AlertTriangle },
    { label: 'Open milestones', value: `${summary.openMilestones} control points ahead`, icon: CalendarDays },
    { label: 'Commercial summary', value: `${formatCrore(summary.totalAop)} total AOP`, icon: CircleDollarSign },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Reports & Backup"
        title="Project reports & Data Persistence"
        description="Reporting views for portfolio reviews and full data backup & restore."
      />
      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start justify-between">
              <span className="font-mono text-[9px] uppercase tracking-[.14em] text-muted-foreground">{label}</span>
              <Icon size={17} className="text-muted-foreground/60" />
            </div>
            <p className="mt-5 text-[18px] font-extrabold">{value}</p>
            <button
              type="button"
              onClick={exportCsv}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-[#f7f4ec] px-3 py-2.5 text-[10px] font-bold hover:bg-[#fbf1d8]"
            >
              <FileBarChart size={14} /> Export as CSV
            </button>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={exportCsv}
          className="inline-flex items-center gap-2 rounded-xl bg-[#173e49] px-4 py-3 text-[11px] font-extrabold text-white hover:bg-[#204f59]"
        >
          <Download size={15} /> Export full portfolio (CSV)
        </button>

        <button
          type="button"
          onClick={exportJsonBackup}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-3 text-[11px] font-extrabold text-[#173e49] hover:bg-[#fbf1d8]"
        >
          <Download size={15} /> Download Full Backup (JSON)
        </button>

        <input
          type="file"
          accept=".json"
          ref={fileInputRef}
          onChange={handleImportFile}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-xl border border-[#cbe4d9] bg-[#edf5f0] px-4 py-3 text-[11px] font-extrabold text-[#2e7c67] hover:bg-[#dff0e7]"
        >
          <Plus size={15} /> Restore from Backup (JSON)
        </button>
      </div>
    </>
  );
}

function NewProjectView() {
  const { addProject, user, canEdit, role, leads } = useAppState();
  const { toast } = useToast();
  const [createdName, setCreatedName] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [form, setForm] = useState({
    name: '',
    location: 'Goa' as Project['location'],
    category: 'Hotel' as Category,
    projectType: 'Business hotel',
    leadId: (role === 'lead' ? user?.id : leads[0]?.id) || user?.id || '',
    startDate: todayIso(),
    targetDate: '',
    progress: '0',
    aop: '50',
    awarded: '0',
    projectedCost: '50',
    area: '',
    paxKeys: '',
    scope: '',
  });

  const progressNum = Math.max(0, Math.min(100, Number(form.progress) || 0));
  const liveStatus = calculateProjectStatus(progressNum);

  const set = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  if (!canEdit) {
    return <><PageHeader eyebrow="Project workspace" title="Create new project" description="Creating projects is restricted to Project Leads and Coordinators." /><div className="mt-8 flex max-w-[620px] items-start gap-3 rounded-2xl border border-[#eadcb1] bg-[#fbf1d8] p-5"><ShieldAlert size={18} className="mt-0.5 shrink-0 text-[#9a711f]" /><p className="text-[12px] leading-6 text-[#8e681c]">You are signed in with read-only portfolio access. Project creation is managed by the Project Coordinator or Leads.</p></div></>;
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();

    const found: string[] = [];
    const name = form.name.trim();
    const aopCrore = Number(form.aop);
    const awardedCrore = Number(form.awarded);
    const projectedCrore = Number(form.projectedCost || form.aop);

    if (!name) found.push('Project name is required.');
    if (!isValidIsoDate(form.startDate)) found.push('Enter a valid start date.');
    if (!isValidIsoDate(form.targetDate)) found.push('Enter a valid target completion date.');
    if (!Number.isFinite(aopCrore) || aopCrore < 0) found.push('Approved Budget (AOP) must be a number of 0 or more.');
    if (!Number.isFinite(awardedCrore) || awardedCrore < 0) found.push('Committed/Awarded amount must be a number of 0 or more.');
    if (!Number.isFinite(projectedCrore) || projectedCrore < 0) found.push('Projected Cost must be a number of 0 or more.');
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
      health: progressNum > 0 ? 'On track' : 'Not started',
      status: liveStatus,
      progress: progressNum,
      targetDate: form.targetDate,
      targetLabel: formatFullDate(form.targetDate),
      aop: aopCrore * CRORE,
      awarded: awardedCrore * CRORE,
      spent: 0,
      projectedCost: projectedCrore * CRORE,
      area: form.area.trim(),
      paxKeys: form.paxKeys.trim(),
      nextMilestone: 'Project brief',
      nextMilestoneDate: form.startDate,
      leadId: form.leadId || user?.id || '',
      startDate: form.startDate,
      specification: {
        projectType: form.projectType,
        area: form.area,
        capacity: form.paxKeys,
        units: '',
        terminal: form.location,
        floor: '',
        scope: form.scope,
      },
      phases: [
        { name: 'Brief & scope', status: 'active', progress: 0, owner: 'PMO' },
        { name: 'Design development', status: 'upcoming', progress: 0, owner: 'Design' },
        { name: 'Procurement', status: 'upcoming', progress: 0, owner: 'Sourcing' },
        { name: 'Execution', status: 'upcoming', progress: 0, owner: 'Projects' },
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

  if (createdName) return <div className="mx-auto max-w-[760px] py-16 text-center"><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#e4f1ec] text-[#2e7c67]"><CheckCircle2 size={25} /></span><p className="mt-6 font-mono text-[10px] uppercase tracking-[.16em] text-[#2e7c67]">Project created</p><h1 className="mt-3 font-serif text-[44px] leading-none tracking-[-.05em] text-[#173e49]">{createdName} is ready for updates.</h1><p className="mx-auto mt-4 max-w-[480px] text-[13px] leading-6 text-muted-foreground">The project is saved and synced with the portfolio database.</p><Link href="/projects" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#173e49] px-4 py-3 text-[11px] font-bold text-white">View all projects <ArrowUpRight size={15} /></Link></div>;

  return (
    <>
      <PageHeader
        eyebrow="Portfolio creation"
        title="Create new project"
        description="Capture the core project metrics, status lifecycle, commercial budget, and assign a Project Lead."
      />
      <form onSubmit={submit} noValidate className="mt-8 max-w-[1000px] space-y-5">
        {errors.length > 0 && (
          <div role="alert" className="rounded-2xl border border-[#f0c8c2] bg-[#fff5f2] p-4">
            <p className="text-[11px] font-extrabold text-[#b2473d]">Fix the following before creating the project</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-[11px] text-[#b2473d]">
              {errors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </div>
        )}

        <section className="rounded-2xl border border-border bg-card p-5 md:p-7">
          <h2 className="text-[18px] font-extrabold">1. Basic Information & Ownership</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="md:col-span-2">
              <span className="mb-2 block text-[11px] font-bold">Project Name *</span>
              <input
                required
                value={form.name}
                onChange={(event) => set('name', event.target.value)}
                placeholder="e.g. Goa Business Hotel"
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-[12px] outline-none focus:border-[#c9a04e]"
              />
            </label>

            {role === 'coordinator' && leads.length > 0 && (
              <label className="md:col-span-2">
                <span className="mb-2 block text-[11px] font-bold text-[#664b14]">Allot to Project Lead *</span>
                <select
                  value={form.leadId}
                  onChange={(event) => set('leadId', event.target.value)}
                  className="h-11 w-full rounded-xl border border-[#d6a95d] bg-white px-3 text-[12px] font-bold text-[#173e49]"
                >
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.title}) — {l.email}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              <span className="mb-2 block text-[11px] font-bold">Location *</span>
              <select
                value={form.location}
                onChange={(event) => set('location', event.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-[12px]"
              >
                {locations.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-2 block text-[11px] font-bold">Category *</span>
              <select
                value={form.category}
                onChange={(event) => set('category', event.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-[12px]"
              >
                {categories.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-2 block text-[11px] font-bold">Initial Progress (%)</span>
              <input
                type="number"
                min="0"
                max="100"
                value={form.progress}
                onChange={(event) => set('progress', event.target.value)}
                placeholder="0"
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-[12px] font-semibold outline-none"
              />
            </label>
            <div>
              <span className="mb-2 block text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Project Status (Auto-Assigned)
              </span>
              <div className="flex h-11 w-full items-center gap-2 rounded-xl border border-border bg-card/60 px-3">
                <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${statusTone[liveStatus]}`}>
                  {liveStatus}
                </span>
                <span className="truncate text-[10px] text-muted-foreground">
                  Auto-assigned from progress ({progressNum}%)
                </span>
              </div>
            </div>
            <label>
              <span className="mb-2 block text-[11px] font-bold">Start Date *</span>
              <input
                type="date"
                required
                value={form.startDate}
                onChange={(event) => set('startDate', event.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-[12px]"
              />
            </label>
            <label>
              <span className="mb-2 block text-[11px] font-bold">Project Completion Date (Target) *</span>
              <input
                type="date"
                required
                min={form.startDate}
                value={form.targetDate}
                onChange={(event) => set('targetDate', event.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-[12px]"
              />
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 md:p-7">
          <h2 className="text-[18px] font-extrabold">2. Area, Capacity & Commercials</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label>
              <span className="mb-2 block text-[11px] font-bold">Area</span>
              <input
                value={form.area}
                onChange={(event) => set('area', event.target.value)}
                placeholder="e.g. 24,000 sqft"
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-[12px] outline-none"
              />
            </label>
            <label>
              <span className="mb-2 block text-[11px] font-bold">Pax / Keys</span>
              <input
                value={form.paxKeys}
                onChange={(event) => set('paxKeys', event.target.value)}
                placeholder="e.g. 180 Pax / 45 Keys"
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-[12px] outline-none"
              />
            </label>
            <label>
              <span className="mb-2 block text-[11px] font-bold">Approved Budget (AOP in ₹ Cr) *</span>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={form.aop}
                onChange={(event) => set('aop', event.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-[12px] outline-none font-bold"
              />
            </label>
            <label>
              <span className="mb-2 block text-[11px] font-bold">Committed Cost / Awarded (₹ Cr)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.awarded}
                onChange={(event) => set('awarded', event.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-[12px] outline-none font-bold"
              />
            </label>
            <label className="md:col-span-2">
              <span className="mb-2 block text-[11px] font-bold">Projected Cost (₹ Cr)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.projectedCost}
                onChange={(event) => set('projectedCost', event.target.value)}
                placeholder="Leave blank to match Approved Budget"
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-[12px] outline-none font-bold text-[#173e49]"
              />
            </label>
            <label className="md:col-span-2">
              <span className="mb-2 block text-[11px] font-bold">Scope Description</span>
              <textarea
                value={form.scope}
                onChange={(event) => set('scope', event.target.value)}
                rows={3}
                placeholder="Describe the core project scope..."
                className="w-full rounded-xl border border-border bg-background px-3 py-3 text-[12px] outline-none"
              />
            </label>
          </div>
        </section>

        <div className="flex justify-end">
          <button type="submit" className="rounded-xl bg-[#d6a95d] px-5 py-3 text-[11px] font-extrabold text-[#173e49] hover:bg-[#e2bd73]">
            Create project
          </button>
        </div>
      </form>
    </>
  );
}

function TeamView() {
  const { leads, projects, createLead, allotProject, role } = useAppState();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('encalm');
  const [title, setTitle] = useState('Project Lead');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [allottingProjectId, setAllottingProjectId] = useState<string | null>(null);

  const handleCreateLead = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Please provide a name, email, and password.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await createLead({
        name: name.trim(),
        email: email.trim(),
        password: password.trim(),
        title: title.trim() || 'Project Lead',
      });
      if (res.success && res.lead) {
        toast({
          title: 'Project Lead Created',
          description: `Account created for ${res.lead.name}. They can now sign in with ${res.lead.email}.`,
        });
        setName('');
        setEmail('');
        setPassword('encalm');
        setTitle('Project Lead');
      } else {
        setError(res.error || 'Failed to create lead account');
      }
    } catch (err: any) {
      setError(err.message || 'Error creating lead');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAllot = async (projectId: string, leadId: string) => {
    setAllottingProjectId(projectId);
    const res = await allotProject(projectId, leadId);
    setAllottingProjectId(null);
    if (res.success) {
      const lead = leads.find((l) => l.id === leadId);
      const project = projects.find((p) => p.id === projectId);
      toast({
        title: 'Project Allotted',
        description: `${project?.name || 'Project'} assigned to ${lead?.name || 'lead'}.`,
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Allotment failed',
        description: res.error || 'Could not allot project',
      });
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Project Coordinator Workspace"
        title="Team & Project Allotment"
        description="Create Project Leads with real credentials, assign and allot projects, and manage portfolio ownership."
      />

      <div className="mt-8 grid gap-7 lg:grid-cols-[1.05fr_1.95fr]">
        {/* Left Column: Create Project Lead */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-xl bg-[#ebdcb9] text-[#664b14]">
                <UserPlus size={18} />
              </span>
              <div>
                <h2 className="text-[16px] font-extrabold text-[#173e49]">Create Project Lead</h2>
                <p className="text-[11px] text-muted-foreground">Add a new Project Lead to the system</p>
              </div>
            </div>

            <form onSubmit={handleCreateLead} className="mt-5 space-y-4">
              {error && (
                <p className="rounded-xl bg-[#fae5e1] p-3 text-[11px] font-bold text-[#b2473d]">
                  {error}
                </p>
              )}

              <label className="block">
                <span className="mb-1.5 block text-[11px] font-bold text-[#173e49]">Full Name *</span>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Karan Verma"
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-[12px] outline-none focus:border-[#d6a95d]"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[11px] font-bold text-[#173e49]">Email Address *</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. karan.verma@encalm.com"
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-[12px] outline-none focus:border-[#d6a95d]"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[11px] font-bold text-[#173e49]">Initial Password *</span>
                <input
                  type="text"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-[12px] font-mono outline-none focus:border-[#d6a95d]"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[11px] font-bold text-[#173e49]">Role Title</span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Senior Project Lead"
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-[12px] outline-none focus:border-[#d6a95d]"
                />
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#d6a95d] px-4 py-3 text-[12px] font-extrabold text-[#173e49] hover:bg-[#e2bd73] transition disabled:opacity-50"
              >
                <UserPlus size={15} /> {submitting ? 'Creating Lead...' : 'Create Project Lead Account'}
              </button>
            </form>
          </section>

          {/* Active Leads Roster Card */}
          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-[14px] font-extrabold text-[#173e49]">Active Project Leads ({leads.length})</h3>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-800">
                Live Roster
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {leads.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">No leads found in database.</p>
              ) : (
                leads.map((lead) => {
                  const assignedProjects = projects.filter((p) => p.leadId === lead.id);
                  return (
                    <div
                      key={lead.id}
                      className="rounded-xl border border-border bg-background p-3.5 transition hover:border-[#eadcb1]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="grid size-8 place-items-center rounded-full bg-[#173e49] text-[10px] font-bold text-white">
                            {lead.initials}
                          </span>
                          <div>
                            <p className="text-[12px] font-bold text-foreground">{lead.name}</p>
                            <p className="font-mono text-[9px] text-muted-foreground">{lead.email}</p>
                          </div>
                        </div>
                        <span className="rounded-full bg-[#eef0ed] px-2 py-0.5 font-mono text-[9px] font-bold text-muted-foreground">
                          {assignedProjects.length} {assignedProjects.length === 1 ? 'project' : 'projects'}
                        </span>
                      </div>

                      {assignedProjects.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-border/50 pt-2">
                          {assignedProjects.map((p) => (
                            <Link
                              key={p.id}
                              href={`/project/${p.id}`}
                              className="rounded-md bg-card px-2 py-0.5 text-[9px] font-semibold text-muted-foreground hover:text-foreground border border-border hover:border-[#d6a95d]"
                            >
                              {p.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Project Allotment Matrix */}
        <div>
          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-[16px] font-extrabold text-[#173e49]">Project Allotment & Ownership</h2>
                <p className="text-[11px] text-muted-foreground">
                  Assign projects to leads. Changes are saved directly to the database.
                </p>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-[.1em] text-muted-foreground">
                Total Projects: {projects.length}
              </span>
            </div>

            <div className="mt-6 space-y-3">
              {projects.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-10 text-center text-[12px] text-muted-foreground">
                  No projects in portfolio.
                </p>
              ) : (
                projects.map((project) => {
                  const currentLead = leads.find((l) => l.id === project.leadId);
                  const isAllotting = allottingProjectId === project.id;

                  return (
                    <div
                      key={project.id}
                      className="rounded-xl border border-border bg-background p-4 transition hover:border-[#d6a95d]"
                    >
                      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/project/${project.id}`}
                              className="text-[13px] font-extrabold text-foreground hover:text-[#2e7c67] hover:underline"
                            >
                              {project.name}
                            </Link>
                            <span className="rounded-full bg-[#eef0ed] px-2 py-0.5 font-mono text-[9px] text-muted-foreground">
                              {project.code}
                            </span>
                            <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${statusTone[project.status || 'Yet to start']}`}>
                              {project.status || 'Yet to start'}
                            </span>
                          </div>
                          <p className="mt-1 font-mono text-[9px] uppercase tracking-[.1em] text-muted-foreground">
                            {project.location} · {project.category} · Target: {project.targetLabel} · Progress: {project.progress}%
                          </p>
                        </div>

                        {/* Allotment Control */}
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="block font-mono text-[8px] uppercase tracking-[.1em] text-muted-foreground">
                              Assigned Lead
                            </span>
                            <span className="inline-flex items-center gap-1.5 font-bold text-[11px] text-[#173e49]">
                              <span className="grid size-5 place-items-center rounded-full bg-[#ebdcb9] text-[9px] font-bold text-[#664b14]">
                                {currentLead ? currentLead.initials : initialsOf(leadName(project.leadId))}
                              </span>
                              {currentLead ? currentLead.name : leadName(project.leadId)}
                            </span>
                          </div>

                          <select
                            disabled={isAllotting}
                            value={project.leadId || ''}
                            onChange={(e) => handleAllot(project.id, e.target.value)}
                            className="h-9 rounded-xl border border-border bg-white px-2.5 text-[11px] font-bold text-[#173e49] outline-none focus:border-[#d6a95d] disabled:opacity-50"
                          >
                            <option value="" disabled>Select lead...</option>
                            {leads.map((l) => (
                              <option key={l.id} value={l.id}>
                                Allot to {l.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

export default function Workspace({ view }: { view: WorkspaceView }) {
  return (
    <div className="mx-auto max-w-[1500px] px-5 pb-14 pt-8 md:px-10 md:pt-10">
      {view === 'projects' && <ProjectsView />}
      {view === 'my-projects' && <ProjectsView mine />}
      {view === 'timeline' && <TimelineView />}
      {view === 'milestones' && <MilestonesView />}
      {view === 'issues' && <IssuesView />}
      {view === 'commercial' && <CommercialView />}
      {view === 'updates' && <UpdatesView />}
      {view === 'reports' && <ReportsView />}
      {view === 'new-project' && <NewProjectView />}
      {view === 'team' && <TeamView />}
    </div>
  );
}

const CSV_COLUMNS = [
  'Project',
  'Code',
  'Location',
  'Category',
  'Status',
  'Lead',
  'Health',
  'Progress %',
  'Area',
  'Pax / Keys',
  'Approved Budget AOP (INR)',
  'Committed Awarded (INR)',
  'Spent (INR)',
  'Projected Cost (INR)',
  'Target Completion Date',
  'Next milestone',
] as const;

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
  const rows = projects.map((project) =>
    [
      project.name,
      project.code,
      project.location,
      project.category,
      project.status || 'Yet to start',
      leadName(project.leadId),
      project.health,
      project.progress,
      project.area || '',
      project.paxKeys || '',
      project.aop,
      project.awarded,
      project.spent,
      project.projectedCost ?? project.aop,
      project.targetDate,
      project.nextMilestone,
    ]
      .map(csvCell)
      .join(','),
  );

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
