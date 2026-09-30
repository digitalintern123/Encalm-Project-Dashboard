import { useState, useId } from 'react';
import {
  Building2,
  FileSpreadsheet,
  Printer,
  Edit3,
  Check,
  RotateCcw,
  Sparkles,
  Layers,
  DoorClosed,
  Maximize2,
  HelpCircle,
  Plus,
  Trash2,
  X,
  Save,
} from 'lucide-react';
import {
  type Project,
  type ArchitecturalAreaProgram,
  type FOHAreaItem,
  type FloorBuaItem,
  type RoomConfigItem,
  vizagHotelAreaProgram,
} from '@/data/projects';
import { useToast } from '@/hooks/use-toast';

interface ProjectAreaProgramProps {
  project: Project;
  editable: boolean;
  onSave?: (patch: Partial<Project>) => void;
}

export const emptyAreaProgram: ArchitecturalAreaProgram = {
  summary: {
    plotAreaSqm: 0,
    plotAreaSqft: 0,
    plotAreaAcres: 0,
    builtUpAreaSqm: 0,
    builtUpAreaSqft: 0,
    numberOfFloorsDescription: '',
    totalRoomKeys: 0,
    totalBays: 0,
    standardRoomSizeSqm: 27,
    numberOfElevators: 0,
    elevatorRemarks: '',
    generalRemarks: '',
  },
  fohAreas: {
    groundFloor: [],
    groundFloorSubtotal: { areaSqm: 0, areaSqft: 0 },
    secondFloor: [],
    secondFloorSubtotal: { areaSqm: 0, areaSqft: 0 },
    grandSubtotal: { areaSqm: 0, areaSqft: 0 },
  },
  floorWiseBua: {
    items: [],
    subtotal: { areaSqm: 0, areaSqft: 0 },
  },
  roomConfiguration: {
    items: [],
    totalKeys: 0,
    totalBays: 0,
  },
};

export function ProjectAreaProgram({ project, editable, onSave }: ProjectAreaProgramProps) {
  const { toast } = useToast();
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const hasProgram = Boolean(project.specification?.areaProgram);
  const currentProgram: ArchitecturalAreaProgram =
    project.specification?.areaProgram || emptyAreaProgram;

  const handleExportCSV = () => {
    try {
      const rows: string[][] = [];

      // Section 1: Summary
      rows.push(['ARCHITECTURAL AREA PROGRAM & SPACE SUMMARY']);
      rows.push(['Project Name', project.name]);
      rows.push(['Location', project.location]);
      rows.push(['Export Date', new Date().toLocaleDateString('en-GB')]);
      rows.push([]);

      rows.push(['EXECUTIVE SUMMARY METRICS']);
      rows.push(['Parameter', 'Area (SQ.M.)', 'Area (SQ.FT.)', 'Pax / Remarks']);
      rows.push([
        'Plot Area',
        currentProgram.summary.plotAreaSqm.toLocaleString(),
        currentProgram.summary.plotAreaSqft.toLocaleString(),
        `${currentProgram.summary.plotAreaAcres} Acres`,
      ]);
      rows.push([
        'Total Built-Up Area (BUA)',
        currentProgram.summary.builtUpAreaSqm.toLocaleString(),
        currentProgram.summary.builtUpAreaSqft.toLocaleString(),
        currentProgram.summary.numberOfFloorsDescription,
      ]);
      rows.push([
        'Room Inventory',
        `Standard Room: ${currentProgram.summary.standardRoomSizeSqm} SQ.M.`,
        `Total Bays: ${currentProgram.summary.totalBays}`,
        `Total Keys: ${currentProgram.summary.totalRoomKeys} (${currentProgram.summary.generalRemarks || ''})`,
      ]);
      rows.push([
        'Vertical Transportation',
        `${currentProgram.summary.numberOfElevators} Elevators`,
        '—',
        currentProgram.summary.elevatorRemarks,
      ]);
      rows.push([]);

      // Section 2: FOH Bifurcation
      rows.push(['KEY FOH (FRONT OF HOUSE) AREAS BIFURCATION']);
      rows.push(['S.No', 'Floor', 'Description', 'Area (SQ.M.)', 'Area (SQ.FT.)', 'Capacity (Pax)', 'Remarks']);

      currentProgram.fohAreas.groundFloor.forEach((item) => {
        rows.push([
          String(item.sNo),
          item.floor,
          `"${item.description}"`,
          String(item.areaSqm),
          String(item.areaSqft),
          String(item.capacityPax || '—'),
          `"${item.remarks || ''}"`,
        ]);
      });
      rows.push([
        '',
        'Ground Floor Subtotal',
        '',
        String(currentProgram.fohAreas.groundFloorSubtotal.areaSqm),
        String(currentProgram.fohAreas.groundFloorSubtotal.areaSqft),
        '',
        '',
      ]);

      currentProgram.fohAreas.secondFloor.forEach((item) => {
        rows.push([
          String(item.sNo),
          item.floor,
          `"${item.description}"`,
          String(item.areaSqm),
          String(item.areaSqft),
          String(item.capacityPax || '—'),
          `"${item.remarks || ''}"`,
        ]);
      });
      rows.push([
        '',
        '2nd Floor Subtotal',
        '',
        String(currentProgram.fohAreas.secondFloorSubtotal.areaSqm),
        String(currentProgram.fohAreas.secondFloorSubtotal.areaSqft),
        '',
        '',
      ]);
      rows.push([
        '',
        'FOH Grand Total',
        '',
        String(currentProgram.fohAreas.grandSubtotal.areaSqm),
        String(currentProgram.fohAreas.grandSubtotal.areaSqft),
        '',
        '',
      ]);
      rows.push([]);

      // Section 3: Floor-Wise BUA
      rows.push(['FLOOR-WISE BUILT-UP AREA (BUA) SUMMARY']);
      rows.push(['S.No', 'Floor', 'Area (SQ.M.)', 'Area (SQ.FT.)', 'Share (%)', 'Remarks']);
      const totalBua = currentProgram.floorWiseBua.subtotal.areaSqm || 1;
      currentProgram.floorWiseBua.items.forEach((item) => {
        const sharePct = ((item.areaSqm / totalBua) * 100).toFixed(1);
        rows.push([
          String(item.sNo),
          item.floor,
          String(item.areaSqm),
          String(item.areaSqft),
          `${sharePct}%`,
          `"${item.remarks || ''}"`,
        ]);
      });
      rows.push([
        '',
        'Total BUA Subtotal',
        String(currentProgram.floorWiseBua.subtotal.areaSqm),
        String(currentProgram.floorWiseBua.subtotal.areaSqft),
        '100%',
        '',
      ]);
      rows.push([]);

      // Section 4: Room Configuration
      rows.push(['ROOM CONFIGURATION BY FLOOR']);
      rows.push(['S.No', 'Floor', 'Keys', 'Bays', 'Remarks']);
      currentProgram.roomConfiguration.items.forEach((item) => {
        rows.push([
          String(item.sNo),
          item.floor,
          String(item.keys),
          String(item.bays),
          `"${item.remarks || ''}"`,
        ]);
      });
      rows.push([
        '',
        'Total Inventory',
        String(currentProgram.roomConfiguration.totalKeys),
        String(currentProgram.roomConfiguration.totalBays),
        '',
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `${project.name.replace(/\s+/g, '_')}_Area_Program.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'CSV exported',
        description: 'Complete Architectural Area Summary downloaded successfully.',
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Export failed',
        description: 'Could not generate CSV file.',
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!hasProgram) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center max-w-2xl mx-auto my-8">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#f8f5ec] text-[#9a711f]">
          <Building2 size={30} />
        </div>
        <h3 className="mt-4 text-[19px] font-bold text-foreground">
          Architectural Space Program Not Configured
        </h3>
        <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground max-w-lg mx-auto">
          No architectural area or room configuration has been entered for <strong>{project.name}</strong> yet. You can manually enter plot area, BUA, keys, bays, floor-wise built-up area, and FOH public facilities.
        </p>
        {editable && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setIsEditorOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#173e49] px-5 py-2.5 text-[12px] font-bold text-white shadow-sm hover:bg-[#205160] transition"
            >
              <Plus size={15} />
              Configure Architectural Area Program
            </button>
          </div>
        )}
        {isEditorOpen && (
          <AreaProgramEditorModal
            initialProgram={emptyAreaProgram}
            onClose={() => setIsEditorOpen(false)}
            onSave={(updated) => {
              if (onSave) {
                onSave({
                  area: `${updated.summary.builtUpAreaSqm.toLocaleString()} SQ.M. / ${updated.summary.builtUpAreaSqft.toLocaleString()} SQ.FT.`,
                  paxKeys: `${updated.summary.totalRoomKeys} Keys / ${updated.summary.totalBays} Bays`,
                  specification: {
                    ...(project.specification || {
                      projectType: project.category,
                      units: '',
                      terminal: project.location,
                      floor: '',
                      scope: '',
                    }),
                    area: `${updated.summary.builtUpAreaSqm.toLocaleString()} SQ.M. / ${updated.summary.builtUpAreaSqft.toLocaleString()} SQ.FT.`,
                    capacity: `${updated.summary.totalRoomKeys} Keys / ${updated.summary.totalBays} Bays`,
                    areaProgram: updated,
                  },
                });
                toast({
                  title: 'Area Program configured',
                  description: 'The architectural program has been saved to the database.',
                });
              }
              setIsEditorOpen(false);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 print:p-0 print:space-y-4">
      {/* Top Header & Action Ribbon */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/70 pb-5 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-[#e4f1ec] text-[#2e7c67]">
              <Building2 size={16} />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[.15em] text-[#2e7c67] font-bold">
              Architectural Area Program & Summary
            </span>
          </div>
          <h2 className="mt-1 text-[22px] font-extrabold tracking-tight text-[#173e49]">
            {project.name} Area Program
          </h2>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Complete space allocation, FOH area bifurcation, floor-wise built-up area (BUA), and room inventory matrix.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-[11px] font-bold text-foreground shadow-sm hover:bg-[#f8f5ec] transition"
          >
            <FileSpreadsheet size={14} className="text-[#2e7c67]" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-[11px] font-bold text-foreground shadow-sm hover:bg-[#f8f5ec] transition"
          >
            <Printer size={14} className="text-[#173e49]" />
            Print Summary
          </button>
          {editable && (
            <button
              type="button"
              onClick={() => setIsEditorOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#173e49] px-4 py-2 text-[11px] font-bold text-white shadow-sm hover:bg-[#225766] transition"
            >
              <Edit3 size={14} />
              Edit Program Data
            </button>
          )}
        </div>
      </div>

      {/* 1. Executive Metrics Ribbon */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="font-mono text-[9px] uppercase tracking-[.14em]">Plot Area</span>
            <Maximize2 size={14} />
          </div>
          <div className="mt-3">
            <span className="text-[20px] font-extrabold text-foreground">
              {currentProgram.summary.plotAreaSqm.toLocaleString()} <span className="text-[12px] font-medium text-muted-foreground">SQ.M.</span>
            </span>
            <p className="mt-0.5 font-mono text-[11px] text-[#2e7c67] font-semibold">
              {currentProgram.summary.plotAreaSqft.toLocaleString()} SQ.FT.
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground font-medium">
              {currentProgram.summary.plotAreaAcres} Acres site footprint
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-[#eadcb1] bg-[#fbf5e7] p-4 shadow-sm">
          <div className="flex items-center justify-between text-[#8f691b]">
            <span className="font-mono text-[9px] uppercase tracking-[.14em]">Total Built-Up Area</span>
            <Building2 size={14} />
          </div>
          <div className="mt-3">
            <span className="text-[20px] font-extrabold text-[#173e49]">
              {currentProgram.summary.builtUpAreaSqm.toLocaleString()} <span className="text-[12px] font-medium text-muted-foreground">SQ.M.</span>
            </span>
            <p className="mt-0.5 font-mono text-[11px] text-[#9a711f] font-bold">
              {currentProgram.summary.builtUpAreaSqft.toLocaleString()} SQ.FT.
            </p>
            <p className="mt-1 text-[10px] text-[#785b20] font-medium">
              B + G + 1 + Service + 2nd–6th
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="font-mono text-[9px] uppercase tracking-[.14em]">Total Room Keys</span>
            <DoorClosed size={14} />
          </div>
          <div className="mt-3">
            <span className="text-[20px] font-extrabold text-foreground">
              {currentProgram.summary.totalRoomKeys} <span className="text-[12px] font-medium text-muted-foreground">Keys</span>
            </span>
            <p className="mt-0.5 font-mono text-[11px] text-[#2e7c67] font-semibold">
              {currentProgram.summary.totalBays} Total Bays
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground font-medium">
              152 Std + 4 Presidential
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="font-mono text-[9px] uppercase tracking-[.14em]">Standard Room Size</span>
            <Layers size={14} />
          </div>
          <div className="mt-3">
            <span className="text-[20px] font-extrabold text-foreground">
              {currentProgram.summary.standardRoomSizeSqm} <span className="text-[12px] font-medium text-muted-foreground">SQ.M.</span>
            </span>
            <p className="mt-0.5 font-mono text-[11px] text-[#2e7c67] font-semibold">
              {Math.round(currentProgram.summary.standardRoomSizeSqm * 10.7639)} SQ.FT.
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground font-medium">
              Single standard bay unit
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="font-mono text-[9px] uppercase tracking-[.14em]">Elevators</span>
            <Building2 size={14} />
          </div>
          <div className="mt-3">
            <span className="text-[20px] font-extrabold text-foreground">
              {currentProgram.summary.numberOfElevators} <span className="text-[12px] font-medium text-muted-foreground">Total</span>
            </span>
            <p className="mt-0.5 text-[11px] text-foreground font-semibold">
              3 Guest + 2 Service
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground font-medium">
              + 1 Fire tower core
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="font-mono text-[9px] uppercase tracking-[.14em]">Key FOH Total</span>
            <Sparkles size={14} />
          </div>
          <div className="mt-3">
            <span className="text-[20px] font-extrabold text-[#173e49]">
              {currentProgram.fohAreas.grandSubtotal.areaSqm.toLocaleString()} <span className="text-[12px] font-medium text-muted-foreground">SQ.M.</span>
            </span>
            <p className="mt-0.5 font-mono text-[11px] text-[#2e7c67] font-semibold">
              {currentProgram.fohAreas.grandSubtotal.areaSqft.toLocaleString()} SQ.FT.
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground font-medium">
              Ground + 2nd floor facilities
            </p>
          </div>
        </div>
      </div>

      {/* 2. Key FOH Areas Bifurcation */}
      <section className="rounded-2xl border border-border bg-card p-5 md:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-4">
          <div>
            <span className="font-mono text-[9px] uppercase tracking-[.15em] text-[#9a711f] font-bold">
              Front of House (FOH)
            </span>
            <h3 className="mt-1 text-[18px] font-extrabold text-[#173e49]">
              Key FOH Areas Bifurcation
            </h3>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <span className="size-2 rounded-full bg-[#3d9a7e]" /> Ground Floor: {currentProgram.fohAreas.groundFloorSubtotal.areaSqm.toLocaleString()} SQ.M.
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium">
              <span className="size-2 rounded-full bg-[#d19b35]" /> 2nd Floor: {currentProgram.fohAreas.secondFloorSubtotal.areaSqm.toLocaleString()} SQ.M.
            </span>
          </div>
        </div>

        {/* Ground Floor FOH Table */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[13px] font-bold text-[#173e49] flex items-center gap-2">
              <span className="size-2 rounded-full bg-[#3d9a7e]" /> Ground Floor Public & Banquet Areas
            </h4>
            <span className="font-mono text-[11px] text-muted-foreground">
              {currentProgram.fohAreas.groundFloor.length} Areas Allocated
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border bg-background">
            <table className="w-full text-left text-[12px]">
              <thead>
                <tr className="border-b border-border bg-[#f8f6f0] font-mono text-[9px] uppercase tracking-[.1em] text-muted-foreground">
                  <th className="py-2.5 pl-4 pr-2 w-12">S.No</th>
                  <th className="px-3 py-2.5 w-28">Floor</th>
                  <th className="px-3 py-2.5 min-w-[200px]">Description</th>
                  <th className="px-3 py-2.5 text-right w-28">Area (SQ.M.)</th>
                  <th className="px-3 py-2.5 text-right w-28">Area (SQ.FT.)</th>
                  <th className="px-3 py-2.5 text-center w-36">Capacity (Pax)</th>
                  <th className="py-2.5 pl-3 pr-4">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {currentProgram.fohAreas.groundFloor.map((item, idx) => (
                  <tr key={`${item.description}-${idx}`} className="hover:bg-[#fbfaf6] transition-colors">
                    <td className="py-2.5 pl-4 pr-2 font-mono text-muted-foreground">{item.sNo}</td>
                    <td className="px-3 py-2.5 font-medium text-foreground">{item.floor}</td>
                    <td className="px-3 py-2.5 font-bold text-[#173e49]">{item.description}</td>
                    <td className="px-3 py-2.5 text-right font-mono font-semibold">{item.areaSqm.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">{item.areaSqft.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-center">
                      {item.capacityPax ? (
                        <span className="inline-block rounded-full bg-[#f8edcf] px-2.5 py-0.5 font-mono text-[10px] font-bold text-[#9a711f]">
                          {item.capacityPax} Pax
                        </span>
                      ) : (
                        <span className="text-muted-foreground/60">—</span>
                      )}
                    </td>
                    <td className="py-2.5 pl-3 pr-4 text-muted-foreground text-[11px]">{item.remarks || '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-[#f8f6f0] font-bold text-foreground">
                  <td colSpan={3} className="py-2.5 pl-4 pr-3 text-right font-mono uppercase text-[10px] tracking-wider text-muted-foreground">
                    Ground Floor Subtotal
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-[#173e49]">
                    {currentProgram.fohAreas.groundFloorSubtotal.areaSqm.toLocaleString()}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-[#2e7c67]">
                    {currentProgram.fohAreas.groundFloorSubtotal.areaSqft.toLocaleString()}
                  </td>
                  <td colSpan={2} className="py-2.5 pl-3 pr-4 text-muted-foreground text-[11px] font-normal">
                    Ground FOH core footprint
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* 2nd Floor FOH Table */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[13px] font-bold text-[#173e49] flex items-center gap-2">
              <span className="size-2 rounded-full bg-[#d19b35]" /> 2nd Floor Wellness & Recreational Areas
            </h4>
            <span className="font-mono text-[11px] text-muted-foreground">
              {currentProgram.fohAreas.secondFloor.length} Areas Allocated
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border bg-background">
            <table className="w-full text-left text-[12px]">
              <thead>
                <tr className="border-b border-border bg-[#f8f6f0] font-mono text-[9px] uppercase tracking-[.1em] text-muted-foreground">
                  <th className="py-2.5 pl-4 pr-2 w-12">S.No</th>
                  <th className="px-3 py-2.5 w-28">Floor</th>
                  <th className="px-3 py-2.5 min-w-[200px]">Description</th>
                  <th className="px-3 py-2.5 text-right w-28">Area (SQ.M.)</th>
                  <th className="px-3 py-2.5 text-right w-28">Area (SQ.FT.)</th>
                  <th className="px-3 py-2.5 text-center w-36">Capacity (Pax)</th>
                  <th className="py-2.5 pl-3 pr-4">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {currentProgram.fohAreas.secondFloor.map((item, idx) => (
                  <tr key={`${item.description}-${idx}`} className="hover:bg-[#fbfaf6] transition-colors">
                    <td className="py-2.5 pl-4 pr-2 font-mono text-muted-foreground">{item.sNo}</td>
                    <td className="px-3 py-2.5 font-medium text-foreground">{item.floor}</td>
                    <td className="px-3 py-2.5 font-bold text-[#173e49]">{item.description}</td>
                    <td className="px-3 py-2.5 text-right font-mono font-semibold">{item.areaSqm.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">{item.areaSqft.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-center">
                      {item.capacityPax ? (
                        <span className="inline-block rounded-full bg-[#f8edcf] px-2.5 py-0.5 font-mono text-[10px] font-bold text-[#9a711f]">
                          {item.capacityPax} Pax
                        </span>
                      ) : (
                        <span className="text-muted-foreground/60">—</span>
                      )}
                    </td>
                    <td className="py-2.5 pl-3 pr-4 text-muted-foreground text-[11px]">{item.remarks || '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-[#f8f6f0] font-bold text-foreground">
                  <td colSpan={3} className="py-2.5 pl-4 pr-3 text-right font-mono uppercase text-[10px] tracking-wider text-muted-foreground">
                    2nd Floor Subtotal
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-[#173e49]">
                    {currentProgram.fohAreas.secondFloorSubtotal.areaSqm.toLocaleString()}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-[#2e7c67]">
                    {currentProgram.fohAreas.secondFloorSubtotal.areaSqft.toLocaleString()}
                  </td>
                  <td colSpan={2} className="py-2.5 pl-3 pr-4 text-muted-foreground text-[11px] font-normal">
                    Wellness & deck recreation
                  </td>
                </tr>
                <tr className="border-t border-border bg-[#faefe4] font-extrabold text-[#173e49]">
                  <td colSpan={3} className="py-3 pl-4 pr-3 text-right font-mono uppercase text-[11px] tracking-wider text-[#9a711f]">
                    Grand Total FOH Areas
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-[14px] text-[#173e49]">
                    {currentProgram.fohAreas.grandSubtotal.areaSqm.toLocaleString()}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-[14px] text-[#2e7c67]">
                    {currentProgram.fohAreas.grandSubtotal.areaSqft.toLocaleString()}
                  </td>
                  <td colSpan={2} className="py-3 pl-3 pr-4 font-semibold text-[#8f691b] text-[11px]">
                    Total public & guest facility areas
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </section>

      {/* 3. Floor-Wise BUA Summary & Room Configuration Grid */}
      <div className="grid gap-8 lg:grid-cols-[1.25fr_1fr]">
        {/* Floor-Wise Built-Up Area Table */}
        <section className="rounded-2xl border border-border bg-card p-5 md:p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-border/60 pb-4">
            <div>
              <span className="font-mono text-[9px] uppercase tracking-[.15em] text-[#2e7c67] font-bold">
                Vertical Stacking
              </span>
              <h3 className="mt-1 text-[18px] font-extrabold text-[#173e49]">
                Floor-Wise Built-Up Area (BUA)
              </h3>
            </div>
            <div className="text-right">
              <span className="font-mono text-[14px] font-extrabold text-[#173e49]">
                {currentProgram.floorWiseBua.subtotal.areaSqm.toLocaleString()} SQ.M.
              </span>
              <span className="block font-mono text-[10px] text-[#2e7c67] font-bold">
                {currentProgram.floorWiseBua.subtotal.areaSqft.toLocaleString()} SQ.FT.
              </span>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-background">
            <table className="w-full text-left text-[12px]">
              <thead>
                <tr className="border-b border-border bg-[#f8f6f0] font-mono text-[9px] uppercase tracking-[.1em] text-muted-foreground">
                  <th className="py-2.5 pl-3 pr-2 w-10">S.No</th>
                  <th className="px-2 py-2.5 min-w-[130px]">Floor</th>
                  <th className="px-2 py-2.5 text-right w-24">SQ.M.</th>
                  <th className="px-2 py-2.5 text-right w-24">SQ.FT.</th>
                  <th className="px-2 py-2.5 text-center w-28">BUA Share</th>
                  <th className="py-2.5 pl-2 pr-3">Function / Scope</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {currentProgram.floorWiseBua.items.map((item, idx) => {
                  const total = currentProgram.floorWiseBua.subtotal.areaSqm || 1;
                  const pct = Math.round((item.areaSqm / total) * 100);
                  return (
                    <tr key={`${item.floor}-${idx}`} className="hover:bg-[#fbfaf6] transition-colors">
                      <td className="py-2.5 pl-3 pr-2 font-mono text-muted-foreground text-[11px]">{item.sNo}</td>
                      <td className="px-2 py-2.5 font-bold text-[#173e49]">{item.floor}</td>
                      <td className="px-2 py-2.5 text-right font-mono font-semibold">{item.areaSqm.toLocaleString()}</td>
                      <td className="px-2 py-2.5 text-right font-mono text-muted-foreground text-[11px]">{item.areaSqft.toLocaleString()}</td>
                      <td className="px-2 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <div className="h-1.5 w-12 rounded-full bg-[#e7e7dc] overflow-hidden">
                            <div className="h-full rounded-full bg-[#3d9a7e]" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="font-mono text-[10px] font-bold text-foreground w-6 text-right">
                            {pct}%
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 pl-2 pr-3 text-muted-foreground text-[11px]">{item.remarks || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-[#f8f6f0] font-extrabold text-[#173e49]">
                  <td colSpan={2} className="py-2.5 pl-3 pr-2 font-mono uppercase text-[10px] tracking-wider text-muted-foreground">
                    Total BUA
                  </td>
                  <td className="px-2 py-2.5 text-right font-mono text-[13px] text-[#173e49]">
                    {currentProgram.floorWiseBua.subtotal.areaSqm.toLocaleString()}
                  </td>
                  <td className="px-2 py-2.5 text-right font-mono text-[13px] text-[#2e7c67]">
                    {currentProgram.floorWiseBua.subtotal.areaSqft.toLocaleString()}
                  </td>
                  <td className="px-2 py-2.5 text-center font-mono text-[10px] text-muted-foreground">100%</td>
                  <td className="py-2.5 pl-2 pr-3 text-[11px] text-muted-foreground font-normal">
                    Complete vertical stack
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        {/* Room Configuration Matrix */}
        <section className="rounded-2xl border border-border bg-card p-5 md:p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div>
                <span className="font-mono text-[9px] uppercase tracking-[.15em] text-[#9a711f] font-bold">
                  Guest Inventory
                </span>
                <h3 className="mt-1 text-[18px] font-extrabold text-[#173e49]">
                  Room Configuration by Floor
                </h3>
              </div>
              <div className="text-right">
                <span className="font-mono text-[14px] font-extrabold text-[#173e49]">
                  {currentProgram.roomConfiguration.totalKeys} Keys
                </span>
                <span className="block font-mono text-[10px] text-[#9a711f] font-bold">
                  {currentProgram.roomConfiguration.totalBays} Bays
                </span>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-background">
              <table className="w-full text-left text-[12px]">
                <thead>
                  <tr className="border-b border-border bg-[#f8f6f0] font-mono text-[9px] uppercase tracking-[.1em] text-muted-foreground">
                    <th className="py-2.5 pl-3 pr-2 w-10">S.No</th>
                    <th className="px-3 py-2.5">Guest Floor</th>
                    <th className="px-3 py-2.5 text-center w-20">Keys</th>
                    <th className="px-3 py-2.5 text-center w-20">Bays</th>
                    <th className="py-2.5 pl-2 pr-3">Notes & Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {currentProgram.roomConfiguration.items.map((item, idx) => (
                    <tr key={`${item.floor}-${idx}`} className="hover:bg-[#fbfaf6] transition-colors">
                      <td className="py-2.5 pl-3 pr-2 font-mono text-muted-foreground text-[11px]">{item.sNo}</td>
                      <td className="px-3 py-2.5 font-bold text-[#173e49]">{item.floor}</td>
                      <td className="px-3 py-2.5 text-center font-mono font-bold text-foreground">
                        <span className="inline-block rounded-md bg-[#e4f1ec] px-2 py-0.5 text-[#2e7c67]">
                          {item.keys}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono font-bold text-foreground">
                        <span className="inline-block rounded-md bg-[#f8edcf] px-2 py-0.5 text-[#9a711f]">
                          {item.bays}
                        </span>
                      </td>
                      <td className="py-2.5 pl-2 pr-3 text-[11px] text-muted-foreground">{item.remarks || 'Standard'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-[#f8f6f0] font-extrabold text-[#173e49]">
                    <td colSpan={2} className="py-2.5 pl-3 pr-2 font-mono uppercase text-[10px] tracking-wider text-muted-foreground">
                      Total Keys & Bays
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono text-[13px] text-[#2e7c67]">
                      {currentProgram.roomConfiguration.totalKeys}
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono text-[13px] text-[#9a711f]">
                      {currentProgram.roomConfiguration.totalBays}
                    </td>
                    <td className="py-2.5 pl-2 pr-3 text-[11px] text-[#173e49]">
                      156 Keys (168 Bays)
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Presidential Suite Highlight Note */}
            <div className="mt-5 rounded-xl border border-[#eadcb1] bg-[#fbf5e7] p-4 text-[11px] leading-relaxed text-[#7c5b1b]">
              <div className="flex items-center gap-1.5 font-bold mb-1">
                <Sparkles size={14} className="text-[#9a711f]" />
                6th Floor Presidential Suites Bifurcation
              </div>
              The 6th Guest Floor contains <strong>4 Presidential Keys</strong> spanning <strong>16 structural bays</strong> (approx 4 bays per Presidential suite). Floors 2 to 5 provide standard 1-bay rooms (41 + 37 + 37 + 37 = 152 standard keys).
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Standard Room Size: <strong>{currentProgram.summary.standardRoomSizeSqm} SQ.M.</strong></span>
            <span>Total Operational Bays: <strong>{currentProgram.summary.totalBays}</strong></span>
          </div>
        </section>
      </div>

      {/* Inline Editor Dialog */}
      {isEditorOpen && (
        <AreaProgramEditorModal
          initialProgram={currentProgram}
          onClose={() => setIsEditorOpen(false)}
          onSave={(updated) => {
            if (onSave) {
              onSave({
                area: `${updated.summary.builtUpAreaSqm.toLocaleString()} SQ.M. / ${updated.summary.builtUpAreaSqft.toLocaleString()} SQ.FT.`,
                paxKeys: `${updated.summary.totalRoomKeys} Keys / ${updated.summary.totalBays} Bays`,
                specification: {
                  ...(project.specification || {
                    projectType: 'Hotel',
                    units: '',
                    terminal: project.location,
                    floor: '',
                    scope: '',
                  }),
                  area: `${updated.summary.builtUpAreaSqm.toLocaleString()} SQ.M. / ${updated.summary.builtUpAreaSqft.toLocaleString()} SQ.FT.`,
                  capacity: `${updated.summary.totalRoomKeys} Keys / ${updated.summary.totalBays} Bays`,
                  areaProgram: updated,
                },
              });
              toast({
                title: 'Area Program updated',
                description: 'Changes to the architectural program have been saved to the database.',
              });
            }
            setIsEditorOpen(false);
          }}
        />
      )}
    </div>
  );
}

/** Interactive Editor Modal for architectural area program */
export function AreaProgramEditorModal({
  initialProgram,
  onClose,
  onSave,
}: {
  initialProgram: ArchitecturalAreaProgram;
  onClose: () => void;
  onSave: (program: ArchitecturalAreaProgram) => void;
}) {
  const [draft, setDraft] = useState<ArchitecturalAreaProgram>(JSON.parse(JSON.stringify(initialProgram)));
  const [activeTab, setActiveTab] = useState<'summary' | 'foh' | 'bua' | 'rooms'>('summary');

  const updateSummary = (key: keyof ArchitecturalAreaProgram['summary'], value: any) => {
    setDraft((prev) => {
      const summary = { ...prev.summary, [key]: value };
      if (key === 'plotAreaSqm') {
        summary.plotAreaSqft = Math.round(Number(value) * 10.7639);
      }
      return { ...prev, summary };
    });
  };

  const handleSave = () => {
    // Recalculate all subtotals
    const groundFloorSubtotalSqm = draft.fohAreas.groundFloor.reduce((acc, it) => acc + (Number(it.areaSqm) || 0), 0);
    const groundFloorSubtotalSqft = Math.round(groundFloorSubtotalSqm * 10.7639);

    const secondFloorSubtotalSqm = draft.fohAreas.secondFloor.reduce((acc, it) => acc + (Number(it.areaSqm) || 0), 0);
    const secondFloorSubtotalSqft = Math.round(secondFloorSubtotalSqm * 10.7639);

    const buaSubtotalSqm = draft.floorWiseBua.items.reduce((acc, it) => acc + (Number(it.areaSqm) || 0), 0);
    const buaSubtotalSqft = Math.round(buaSubtotalSqm * 10.7639);

    const totalKeys = draft.roomConfiguration.items.reduce((acc, it) => acc + (Number(it.keys) || 0), 0);
    const totalBays = draft.roomConfiguration.items.reduce((acc, it) => acc + (Number(it.bays) || 0), 0);

    const hasFloorItems = draft.floorWiseBua.items.length > 0;
    const finalBuaSqm = hasFloorItems ? buaSubtotalSqm : (draft.summary.builtUpAreaSqm || 0);
    const finalBuaSqft = hasFloorItems ? buaSubtotalSqft : (draft.summary.builtUpAreaSqft || Math.round(finalBuaSqm * 10.7639));

    const hasRoomItems = draft.roomConfiguration.items.length > 0;
    const finalKeys = hasRoomItems ? totalKeys : (draft.summary.totalRoomKeys || 0);
    const finalBays = hasRoomItems ? totalBays : (draft.summary.totalBays || 0);

    const updated: ArchitecturalAreaProgram = {
      ...draft,
      summary: {
        ...draft.summary,
        builtUpAreaSqm: finalBuaSqm,
        builtUpAreaSqft: finalBuaSqft,
        totalRoomKeys: finalKeys,
        totalBays: finalBays,
      },
      fohAreas: {
        groundFloor: draft.fohAreas.groundFloor,
        groundFloorSubtotal: { areaSqm: groundFloorSubtotalSqm, areaSqft: groundFloorSubtotalSqft },
        secondFloor: draft.fohAreas.secondFloor,
        secondFloorSubtotal: { areaSqm: secondFloorSubtotalSqm, areaSqft: secondFloorSubtotalSqft },
        grandSubtotal: {
          areaSqm: groundFloorSubtotalSqm + secondFloorSubtotalSqm,
          areaSqft: groundFloorSubtotalSqft + secondFloorSubtotalSqft,
        },
      },
      floorWiseBua: {
        items: draft.floorWiseBua.items,
        subtotal: { areaSqm: buaSubtotalSqm, areaSqft: buaSubtotalSqft },
      },
      roomConfiguration: {
        items: draft.roomConfiguration.items,
        totalKeys,
        totalBays,
      },
    };

    onSave(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border bg-[#f8f6f0] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-lg bg-[#e4f1ec] text-[#2e7c67]">
              <Edit3 size={16} />
            </span>
            <div>
              <h3 className="text-[16px] font-bold text-foreground">Edit Area Program & Space Summary</h3>
              <p className="text-[11px] text-muted-foreground">
                Update room counts, areas, PAX capacities, and floor-wise built-up area.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border bg-muted/40 px-6 gap-2">
          {(
            [
              ['summary', 'Executive Summary'],
              ['foh', 'Key FOH Areas'],
              ['bua', 'Floor-Wise BUA'],
              ['rooms', 'Room Configuration'],
            ] as const
          ).map(([tabKey, label]) => (
            <button
              key={tabKey}
              type="button"
              onClick={() => setActiveTab(tabKey)}
              className={`border-b-2 py-3 px-3 text-[12px] font-bold transition ${
                activeTab === tabKey
                  ? 'border-[#173e49] text-[#173e49]'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'summary' && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block">
                  <span className="mb-1 block font-mono text-[10px] uppercase text-muted-foreground">
                    Plot Area (SQ.M.) *
                  </span>
                  <input
                    type="number"
                    value={draft.summary.plotAreaSqm}
                    onChange={(e) => updateSummary('plotAreaSqm', Number(e.target.value) || 0)}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-[12px] font-semibold"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block font-mono text-[10px] uppercase text-muted-foreground">
                    Plot Area (SQ.FT. Auto)
                  </span>
                  <input
                    type="number"
                    readOnly
                    value={draft.summary.plotAreaSqft}
                    className="h-10 w-full rounded-lg border border-border bg-muted/50 px-3 text-[12px] font-mono text-muted-foreground"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block font-mono text-[10px] uppercase text-muted-foreground">
                    Site Size (Acres)
                  </span>
                  <input
                    type="number"
                    step="0.1"
                    value={draft.summary.plotAreaAcres}
                    onChange={(e) => updateSummary('plotAreaAcres', Number(e.target.value) || 0)}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-[12px] font-semibold"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block font-mono text-[10px] uppercase text-muted-foreground">
                    Standard Room Size (SQ.M.)
                  </span>
                  <input
                    type="number"
                    value={draft.summary.standardRoomSizeSqm}
                    onChange={(e) => updateSummary('standardRoomSizeSqm', Number(e.target.value) || 0)}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-[12px]"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block font-mono text-[10px] uppercase text-muted-foreground">
                    Number of Elevators
                  </span>
                  <input
                    type="number"
                    value={draft.summary.numberOfElevators}
                    onChange={(e) => updateSummary('numberOfElevators', Number(e.target.value) || 0)}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-[12px]"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1 block font-mono text-[10px] uppercase text-muted-foreground">
                  Elevator & Vertical Core Specification
                </span>
                <input
                  type="text"
                  value={draft.summary.elevatorRemarks}
                  onChange={(e) => updateSummary('elevatorRemarks', e.target.value)}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-[12px]"
                />
              </label>

              <label className="block">
                <span className="mb-1 block font-mono text-[10px] uppercase text-muted-foreground">
                  Floors Description
                </span>
                <input
                  type="text"
                  value={draft.summary.numberOfFloorsDescription}
                  onChange={(e) => updateSummary('numberOfFloorsDescription', e.target.value)}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-[12px]"
                />
              </label>

              <label className="block">
                <span className="mb-1 block font-mono text-[10px] uppercase text-muted-foreground">
                  General Remarks / Summary Notes
                </span>
                <textarea
                  rows={2}
                  value={draft.summary.generalRemarks || ''}
                  onChange={(e) => updateSummary('generalRemarks', e.target.value)}
                  className="w-full rounded-lg border border-border bg-background p-3 text-[12px]"
                />
              </label>
            </div>
          )}

          {activeTab === 'foh' && (
            <div className="space-y-6">
              {/* Ground Floor FOH */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[13px] font-bold text-[#173e49]">Ground Floor Public Areas</h4>
                  <button
                    type="button"
                    onClick={() => {
                      const newSNo = (draft.fohAreas.groundFloor.length || 0) + 1;
                      setDraft((prev) => ({
                        ...prev,
                        fohAreas: {
                          ...prev.fohAreas,
                          groundFloor: [
                            ...prev.fohAreas.groundFloor,
                            {
                              sNo: newSNo,
                              floor: 'Ground Floor',
                              description: 'New Public Area',
                              areaSqm: 100,
                              areaSqft: 1076,
                            },
                          ],
                        },
                      }));
                    }}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-[10px] font-bold hover:bg-muted"
                  >
                    <Plus size={12} /> Add Area
                  </button>
                </div>
                <div className="space-y-2">
                  {draft.fohAreas.groundFloor.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_90px_90px_1fr_32px] gap-2 items-center">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDraft((prev) => {
                            const gf = [...prev.fohAreas.groundFloor];
                            gf[idx] = { ...gf[idx], description: val };
                            return { ...prev, fohAreas: { ...prev.fohAreas, groundFloor: gf } };
                          });
                        }}
                        placeholder="Description"
                        className="h-8 rounded border border-border px-2 text-[11px]"
                      />
                      <input
                        type="number"
                        value={item.areaSqm}
                        onChange={(e) => {
                          const sqm = Number(e.target.value) || 0;
                          setDraft((prev) => {
                            const gf = [...prev.fohAreas.groundFloor];
                            gf[idx] = { ...gf[idx], areaSqm: sqm, areaSqft: Math.round(sqm * 10.7639) };
                            return { ...prev, fohAreas: { ...prev.fohAreas, groundFloor: gf } };
                          });
                        }}
                        placeholder="SQ.M."
                        className="h-8 rounded border border-border px-2 text-[11px] font-mono"
                      />
                      <input
                        type="text"
                        value={item.capacityPax || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDraft((prev) => {
                            const gf = [...prev.fohAreas.groundFloor];
                            gf[idx] = { ...gf[idx], capacityPax: val };
                            return { ...prev, fohAreas: { ...prev.fohAreas, groundFloor: gf } };
                          });
                        }}
                        placeholder="Pax"
                        className="h-8 rounded border border-border px-2 text-[11px]"
                      />
                      <input
                        type="text"
                        value={item.remarks || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDraft((prev) => {
                            const gf = [...prev.fohAreas.groundFloor];
                            gf[idx] = { ...gf[idx], remarks: val };
                            return { ...prev, fohAreas: { ...prev.fohAreas, groundFloor: gf } };
                          });
                        }}
                        placeholder="Remarks"
                        className="h-8 rounded border border-border px-2 text-[11px]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setDraft((prev) => ({
                            ...prev,
                            fohAreas: {
                              ...prev.fohAreas,
                              groundFloor: prev.fohAreas.groundFloor.filter((_, i) => i !== idx),
                            },
                          }));
                        }}
                        className="grid size-8 place-items-center text-muted-foreground hover:text-rose-600"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2nd Floor FOH */}
              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[13px] font-bold text-[#173e49]">2nd Floor Wellness & Deck</h4>
                  <button
                    type="button"
                    onClick={() => {
                      const newSNo = (draft.fohAreas.secondFloor.length || 0) + 1;
                      setDraft((prev) => ({
                        ...prev,
                        fohAreas: {
                          ...prev.fohAreas,
                          secondFloor: [
                            ...prev.fohAreas.secondFloor,
                            {
                              sNo: newSNo,
                              floor: '2nd Floor',
                              description: 'New Amenity',
                              areaSqm: 100,
                              areaSqft: 1076,
                            },
                          ],
                        },
                      }));
                    }}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-[10px] font-bold hover:bg-muted"
                  >
                    <Plus size={12} /> Add Area
                  </button>
                </div>
                <div className="space-y-2">
                  {draft.fohAreas.secondFloor.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_90px_90px_1fr_32px] gap-2 items-center">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDraft((prev) => {
                            const sf = [...prev.fohAreas.secondFloor];
                            sf[idx] = { ...sf[idx], description: val };
                            return { ...prev, fohAreas: { ...prev.fohAreas, secondFloor: sf } };
                          });
                        }}
                        placeholder="Description"
                        className="h-8 rounded border border-border px-2 text-[11px]"
                      />
                      <input
                        type="number"
                        value={item.areaSqm}
                        onChange={(e) => {
                          const sqm = Number(e.target.value) || 0;
                          setDraft((prev) => {
                            const sf = [...prev.fohAreas.secondFloor];
                            sf[idx] = { ...sf[idx], areaSqm: sqm, areaSqft: Math.round(sqm * 10.7639) };
                            return { ...prev, fohAreas: { ...prev.fohAreas, secondFloor: sf } };
                          });
                        }}
                        placeholder="SQ.M."
                        className="h-8 rounded border border-border px-2 text-[11px] font-mono"
                      />
                      <input
                        type="text"
                        value={item.capacityPax || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDraft((prev) => {
                            const sf = [...prev.fohAreas.secondFloor];
                            sf[idx] = { ...sf[idx], capacityPax: val };
                            return { ...prev, fohAreas: { ...prev.fohAreas, secondFloor: sf } };
                          });
                        }}
                        placeholder="Pax"
                        className="h-8 rounded border border-border px-2 text-[11px]"
                      />
                      <input
                        type="text"
                        value={item.remarks || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDraft((prev) => {
                            const sf = [...prev.fohAreas.secondFloor];
                            sf[idx] = { ...sf[idx], remarks: val };
                            return { ...prev, fohAreas: { ...prev.fohAreas, secondFloor: sf } };
                          });
                        }}
                        placeholder="Remarks"
                        className="h-8 rounded border border-border px-2 text-[11px]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setDraft((prev) => ({
                            ...prev,
                            fohAreas: {
                              ...prev.fohAreas,
                              secondFloor: prev.fohAreas.secondFloor.filter((_, i) => i !== idx),
                            },
                          }));
                        }}
                        className="grid size-8 place-items-center text-muted-foreground hover:text-rose-600"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'bua' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[13px] font-bold text-[#173e49]">Floor-Wise Built-Up Area</h4>
                <button
                  type="button"
                  onClick={() => {
                    const newSNo = (draft.floorWiseBua.items.length || 0) + 1;
                    setDraft((prev) => ({
                      ...prev,
                      floorWiseBua: {
                        ...prev.floorWiseBua,
                        items: [
                          ...prev.floorWiseBua.items,
                          {
                            sNo: newSNo,
                            floor: 'Additional Floor',
                            areaSqm: 1000,
                            areaSqft: 10764,
                            remarks: '',
                          },
                        ],
                      },
                    }));
                  }}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-[10px] font-bold hover:bg-muted"
                >
                  <Plus size={12} /> Add Floor
                </button>
              </div>

              <div className="space-y-2">
                {draft.floorWiseBua.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-[140px_100px_1fr_32px] gap-2 items-center">
                    <input
                      type="text"
                      value={item.floor}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDraft((prev) => {
                          const items = [...prev.floorWiseBua.items];
                          items[idx] = { ...items[idx], floor: val };
                          return { ...prev, floorWiseBua: { ...prev.floorWiseBua, items } };
                        });
                      }}
                      placeholder="Floor"
                      className="h-8 rounded border border-border px-2 text-[11px] font-semibold"
                    />
                    <input
                      type="number"
                      value={item.areaSqm}
                      onChange={(e) => {
                        const sqm = Number(e.target.value) || 0;
                        setDraft((prev) => {
                          const items = [...prev.floorWiseBua.items];
                          items[idx] = { ...items[idx], areaSqm: sqm, areaSqft: Math.round(sqm * 10.7639) };
                          return { ...prev, floorWiseBua: { ...prev.floorWiseBua, items } };
                        });
                      }}
                      placeholder="SQ.M."
                      className="h-8 rounded border border-border px-2 text-[11px] font-mono"
                    />
                    <input
                      type="text"
                      value={item.remarks || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDraft((prev) => {
                          const items = [...prev.floorWiseBua.items];
                          items[idx] = { ...items[idx], remarks: val };
                          return { ...prev, floorWiseBua: { ...prev.floorWiseBua, items } };
                        });
                      }}
                      placeholder="Function / Scope Remarks"
                      className="h-8 rounded border border-border px-2 text-[11px]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setDraft((prev) => ({
                          ...prev,
                          floorWiseBua: {
                            ...prev.floorWiseBua,
                            items: prev.floorWiseBua.items.filter((_, i) => i !== idx),
                          },
                        }));
                      }}
                      className="grid size-8 place-items-center text-muted-foreground hover:text-rose-600"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'rooms' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[13px] font-bold text-[#173e49]">Room Inventory by Floor</h4>
                <button
                  type="button"
                  onClick={() => {
                    const newSNo = (draft.roomConfiguration.items.length || 0) + 1;
                    setDraft((prev) => ({
                      ...prev,
                      roomConfiguration: {
                        ...prev.roomConfiguration,
                        items: [
                          ...prev.roomConfiguration.items,
                          {
                            sNo: newSNo,
                            floor: 'Guest Floor',
                            keys: 30,
                            bays: 30,
                            remarks: 'Standard guest rooms',
                          },
                        ],
                      },
                    }));
                  }}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-[10px] font-bold hover:bg-muted"
                >
                  <Plus size={12} /> Add Floor
                </button>
              </div>

              <div className="space-y-2">
                {draft.roomConfiguration.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-[140px_70px_70px_1fr_32px] gap-2 items-center">
                    <input
                      type="text"
                      value={item.floor}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDraft((prev) => {
                          const items = [...prev.roomConfiguration.items];
                          items[idx] = { ...items[idx], floor: val };
                          return { ...prev, roomConfiguration: { ...prev.roomConfiguration, items } };
                        });
                      }}
                      placeholder="Floor"
                      className="h-8 rounded border border-border px-2 text-[11px] font-semibold"
                    />
                    <input
                      type="number"
                      value={item.keys}
                      onChange={(e) => {
                        const keys = Number(e.target.value) || 0;
                        setDraft((prev) => {
                          const items = [...prev.roomConfiguration.items];
                          items[idx] = { ...items[idx], keys };
                          return { ...prev, roomConfiguration: { ...prev.roomConfiguration, items } };
                        });
                      }}
                      placeholder="Keys"
                      className="h-8 rounded border border-border px-2 text-[11px] font-mono text-center"
                    />
                    <input
                      type="number"
                      value={item.bays}
                      onChange={(e) => {
                        const bays = Number(e.target.value) || 0;
                        setDraft((prev) => {
                          const items = [...prev.roomConfiguration.items];
                          items[idx] = { ...items[idx], bays };
                          return { ...prev, roomConfiguration: { ...prev.roomConfiguration, items } };
                        });
                      }}
                      placeholder="Bays"
                      className="h-8 rounded border border-border px-2 text-[11px] font-mono text-center"
                    />
                    <input
                      type="text"
                      value={item.remarks || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDraft((prev) => {
                          const items = [...prev.roomConfiguration.items];
                          items[idx] = { ...items[idx], remarks: val };
                          return { ...prev, roomConfiguration: { ...prev.roomConfiguration, items } };
                        });
                      }}
                      placeholder="Remarks"
                      className="h-8 rounded border border-border px-2 text-[11px]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setDraft((prev) => ({
                          ...prev,
                          roomConfiguration: {
                            ...prev.roomConfiguration,
                            items: prev.roomConfiguration.items.filter((_, i) => i !== idx),
                          },
                        }));
                      }}
                      className="grid size-8 place-items-center text-muted-foreground hover:text-rose-600"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-border bg-[#f8f6f0] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2 text-[11px] font-bold text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#173e49] px-5 py-2 text-[11px] font-bold text-white shadow-sm hover:bg-[#205160]"
          >
            <Save size={14} /> Save Area Program
          </button>
        </div>
      </div>
    </div>
  );
}
