import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Save, 
  Download, 
  FileSpreadsheet, 
  FileJson, 
  Play, 
  ArrowLeft, 
  RefreshCw, 
  Plus, 
  Trash2, 
  GripVertical,
  BookOpen,
  FlaskConical,
  Users,
  Settings2,
  Trophy,
  Library,
  GraduationCap,
  Lock
} from 'lucide-react';
import api from '../api/axios';

const TimetableGrid = () => {
  const { sectionId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [subjectSummary, setSubjectSummary] = useState(null); // { subjects: [{name, count, type}], onConfirm, onCancel }
  const [draggedItem, setDraggedItem] = useState(null); // { type: 'sidebar|grid', data: { ... } }
  const [customItems, setCustomItems] = useState([
    { id: 'counseling', name: 'Counselling', instructor: 'Class Teacher', type: 'Special', icon: <Users size={16}/> },
    { id: 'sports', name: 'Sports', instructor: 'PD', type: 'Special', icon: <Trophy size={16}/> },
    { id: 'library', name: 'Library', instructor: 'Librarian', type: 'Special', icon: <Library size={16}/> },
    { id: 'crt', name: 'CRT', instructor: 'Instructor', type: 'Special', icon: <GraduationCap size={16}/> },
  ]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemInstructor, setNewItemInstructor] = useState('');

  useEffect(() => {
    fetchGridData();
  }, [sectionId]);

  const fetchGridData = async () => {
    try {
      const res = await api.get(`/admin/timetable/grid/${sectionId}`);
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch grid data');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoGenerate = async () => {
    setIsGenerating(true);
    try {
      let res = await api.post('/admin/timetable/auto-generate', { 
        sectionId,
        days: 6,
        slotsPerDay: 7,
        weeklySlotsPerSubject: 5,
        force: false
      });

      if (res.data.isWarning) {
        if (!confirm(res.data.message)) {
          setIsGenerating(false);
          return;
        }
        res = await api.post('/admin/timetable/auto-generate', { 
          sectionId,
          days: 6,
          slotsPerDay: 7,
          weeklySlotsPerSubject: 5,
          force: true
        });
      }

      if (res.data.ok) {
        setData(prev => ({ 
          ...prev, 
          timetable: { 
            ...prev.timetable, 
            schedule: res.data.schedule 
          } 
        }));
        alert('Timetable generated successfully!');
      }
    } catch (err) {
      alert('Generation failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.post('/admin/timetable/save', { 
        sectionId, 
        schedule: data.timetable.schedule 
      });
      alert('Timetable saved!');
    } catch (err) {
      alert('Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const addCustomItem = () => {
    if (!newItemName.trim()) return;
    const item = {
      id: `custom-${Date.now()}`,
      name: newItemName,
      instructor: newItemInstructor,
      type: 'Custom',
      icon: <Settings2 size={16}/>
    };
    setCustomItems([...customItems, item]);
    setNewItemName('');
    setNewItemInstructor('');
  };

  // Drag and Drop Logic
  const onDragSidebarItem = (item) => {
    setDraggedItem({ type: 'sidebar', data: item });
  };

  const onDragGridItem = (day, period) => {
    setDraggedItem({ type: 'grid', data: { day, period } });
  };

  const onDragOver = (e) => {
    e.preventDefault();
  };

  const onDrop = (targetDay, targetPeriod) => {
    if (!draggedItem) return;
    
    const newSchedule = [...(data.timetable?.schedule || [])];
    
    // Ensure the target day object exists
    let targetDayObj = newSchedule.find(s => s.day === targetDay);
    if (!targetDayObj) {
      targetDayObj = { day: targetDay, periods: [] };
      newSchedule.push(targetDayObj);
    }

    if (draggedItem.type === 'sidebar') {
      const { data: item } = draggedItem;
      // Remove existing item at target if any
      targetDayObj.periods = targetDayObj.periods.filter(p => p.period !== targetPeriod);
      
      // Add new item
      const isSpecial = !item.faculty && !item.isLab;
      const displaySubject = (isSpecial && item.instructor) 
        ? (item.name.toLowerCase().includes('counseling') ? `${item.name} - ${item.instructor}` : `${item.name} ${item.instructor}`)
        : item.name;

      const newSlot = {
        period: targetPeriod,
        type: item.isLab ? 'Lab' : 'Subject',
        subject: displaySubject,
        faculty: item.faculty 
          ? { _id: item.faculty._id, name: item.faculty.name } 
          : null,
        lab: item.lab ? { _id: item.lab._id, name: item.lab.name } : null,
        venue: item.venue || null
      };
      targetDayObj.periods.push(newSlot);

    } else if (draggedItem.type === 'grid') {
      const { day: sourceDay, period: sourcePeriod } = draggedItem.data;
      if (sourceDay === targetDay && sourcePeriod === targetPeriod) return;

      const sourceDayObj = newSchedule.find(s => s.day === sourceDay);
      if (!sourceDayObj) return;

      const sourcePeriodIdx = sourceDayObj.periods.findIndex(p => p.period === sourcePeriod);
      const targetPeriodIdx = targetDayObj.periods.findIndex(p => p.period === targetPeriod);

      const sourceSlot = sourceDayObj.periods[sourcePeriodIdx];
      const targetSlot = targetDayObj.periods[targetPeriodIdx];

      if (sourcePeriodIdx !== -1) {
        // Swap or Move
        const updatedSource = targetSlot ? { ...targetSlot, period: sourcePeriod } : null;
        const updatedTarget = { ...sourceSlot, period: targetPeriod };

        if (updatedSource) {
          sourceDayObj.periods[sourcePeriodIdx] = updatedSource;
        } else {
          sourceDayObj.periods.splice(sourcePeriodIdx, 1);
        }

        if (targetPeriodIdx !== -1) {
          targetDayObj.periods[targetPeriodIdx] = updatedTarget;
        } else {
          targetDayObj.periods.push(updatedTarget);
        }
      }
    }

    setData({
      ...data,
      timetable: {
        ...(data.timetable || {}),
        schedule: newSchedule
      }
    });
    setDraggedItem(null);
  };

  const removeSlot = (day, period) => {
    const newSchedule = [...data.timetable.schedule];
    const dayObj = newSchedule.find(s => s.day === day);
    if (dayObj) {
      dayObj.periods = dayObj.periods.filter(p => p.period !== period);
      setData({
        ...data,
        timetable: { ...data.timetable, schedule: newSchedule }
      });
    }
  };

  /* ── Subject-frequency helper ── */
  const buildSubjectSummary = () => {
    const counts = {}; // key: subject name, value: { count, type }
    data.timetable?.schedule?.forEach(daySchedule => {
      daySchedule.periods.forEach(period => {
        if (!period.subject || period.subject === '-') return;
        const name = period.subject;
        const type = period.type === 'Lab' ? 'Lab' : 'Theory';
        if (!counts[name]) counts[name] = { count: 0, type };
        counts[name].count += 1;
      });
    });
    return Object.entries(counts)
      .map(([name, { count, type }]) => ({ name, count, type }))
      .sort((a, b) => b.count - a.count);
  };

  const handleSemiGA = async () => {
    // ── Step 1: Show subject summary popup first ──
    const subjects = buildSubjectSummary();
    const userConfirmedSummary = await new Promise(resolve => {
      setSubjectSummary({
        subjects,
        onConfirm: () => { setSubjectSummary(null); resolve(true); },
        onCancel:  () => { setSubjectSummary(null); resolve(false); }
      });
    });
    if (!userConfirmedSummary) return;

    const LAB_BLOCK_INDICES = [[1,2,3],[4,5,6]];
    const DAYS = data.days || ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const PERIODS = data.periods || [1,2,3,4,5,6,7];

    // Freeze all slots that currently have content (regular subjects, labs, or custom items)
    const fixedSlots = [];
    data.timetable?.schedule?.forEach(daySchedule => {
      daySchedule.periods.forEach(period => {
        const hasContent = period.subject && period.subject !== '-';
        if (hasContent) {
          fixedSlots.push({
            day: daySchedule.day,
            period: period.period,
            type: period.type,
            subject: period.subject,
            faculty: period.faculty || null,
            facultyId: period.faculty?._id || period.facultyId || null,
            lab: period.lab || null,
            labId: period.lab?._id || period.labId || null,
            venue: period.venue || null,
            fixed: true
          });
        }
      });
    });

    // --- Pre-check: count available 3-consecutive free slots per section-day ---
    const frozenSet = new Set();
    fixedSlots.forEach(fs => {
      frozenSet.add(`${fs.day}:${fs.period}`);
    });

    const numLabs = data.labMappings?.length || 0;
    let availableLabBlocks = 0;
    for (const day of DAYS) {
      const frozenPeriodsOnDay = PERIODS.filter(p => frozenSet.has(`${day}:${p}`)).map(p => p - 1); // 0-indexed
      for (const block of LAB_BLOCK_INDICES) {
        const blockFree = block.every(slot => !frozenPeriodsOnDay.includes(slot));
        if (blockFree) availableLabBlocks++;
      }
    }

    let skipLabs = false;
    if (numLabs > 0 && availableLabBlocks < numLabs) {
      const proceed = await new Promise(resolve => {
        const msg =
          `⚠️ Lab Slot Warning\n\n` +
          `${numLabs} lab session(s) require 3 consecutive free periods each.\n` +
          `Only ${availableLabBlocks} valid 3-slot block(s) are available (frozen slots excluded).\n\n` +
          `Options:\n` +
          `• Click OK to skip lab scheduling and run GA on subjects only.\n` +
          `• Click Cancel to stop and manually free up more slots first.`;
        resolve(confirm(msg));
      });
      if (!proceed) return;
      skipLabs = true;
    }

    const numFixed = fixedSlots.length;
    if (!confirm(
      'Semi-Auto (GA) will:\n' +
      `✅ FREEZE all ${numFixed} slot(s) currently filled in the grid\n` +
      (skipLabs ? '⚠️  Labs SKIPPED (not enough free 3-slot blocks)\n' : '') +
      '⚡ Fill all remaining empty slots using the Genetic Algorithm\n\n' +
      'Proceed?'
    )) return;

    setIsGenerating(true);
    try {
      let res = await api.post('/admin/timetable/semi-auto-generate', { 
        sectionId,
        fixedSlots,
        skipLabs,
        generations: 2000,
        force: false
      });
      
      if (res.data.isWarning) {
        if (!confirm(res.data.message)) {
          setIsGenerating(false);
          return;
        }
        res = await api.post('/admin/timetable/semi-auto-generate', { 
          sectionId,
          fixedSlots,
          skipLabs,
          generations: 2000,
          force: true
        });
      }
      
      // Merge back: keep fixed slots, overlay GA results for empty slots
      const gaSchedule = res.data.schedule;
      const mergedSchedule = gaSchedule.map(gaDay => {
        const fixedDay = fixedSlots.filter(fs => fs.day === gaDay.day);
        if (fixedDay.length === 0) return gaDay;

        const mergedPeriods = [...gaDay.periods];
        fixedDay.forEach(fixed => {
          const existingIdx = mergedPeriods.findIndex(p => p.period === fixed.period);
          const frozenSlot = {
            period: fixed.period,
            type: fixed.type,
            subject: fixed.subject,
            faculty: fixed.faculty,
            lab: fixed.lab,
            venue: fixed.venue,
            fixed: true
          };
          if (existingIdx !== -1) {
            mergedPeriods[existingIdx] = frozenSlot;
          } else {
            mergedPeriods.push(frozenSlot);
          }
        });
        mergedPeriods.sort((a, b) => a.period - b.period);
        return { ...gaDay, periods: mergedPeriods };
      });

      setData({ ...data, timetable: { ...data.timetable, schedule: mergedSchedule } });
      alert(`Timetable completed! ${fixedSlots.length} slot(s) were frozen, remaining slots filled by GA.`);
    } catch (err) {
      alert('Generation failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClearGrid = () => {
    if (!confirm('Are you sure you want to clear the entire grid? All slots will be reset.')) return;
    
    const clearedSchedule = data.timetable.schedule.map(day => ({
      ...day,
      periods: day.periods.map(p => ({
        period: p.period,
        type: 'Free',
        subject: '-',
        faculty: null,
        lab: null
      }))
    }));

    setData({
      ...data,
      timetable: {
        ...data.timetable,
        schedule: clearedSchedule
      }
    });
  };

  const exportPDF = () => {
    window.print();
  };

  const exportExcel = () => {
    let csv = 'Day/Period,' + data.periods.map(p => `Period ${p}`).join(',') + '\n';
    data.days.forEach(day => {
      let row = [day];
      data.periods.forEach(p => {
        const slot = data.timetable?.schedule?.find(s => s.day === day)?.periods?.find(pr => pr.period === p);
        const content = slot ? `${slot.subject || ''} ${slot.faculty?.name ? '(' + slot.faculty.name + ')' : ''}` : '';
        row.push(`"${content}"`);
      });
      csv += row.join(',') + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `timetable_${data.section.name}.csv`;
    link.click();
  };

  if (loading) return <div className="flex items-center justify-center h-96">Loading Designer...</div>;

  /* ── Subject Summary Modal ── */
  const SubjectSummaryModal = () => {
    if (!subjectSummary) return null;
    const { subjects, onConfirm, onCancel } = subjectSummary;
    const totalSlots = subjects.reduce((s, x) => s + x.count, 0);
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
      }}>
        <div style={{
          background: 'var(--bg-card, #fff)', borderRadius: '1.25rem',
          boxShadow: '0 24px 60px rgba(0,0,0,0.25)', width: '100%', maxWidth: '520px',
          overflow: 'hidden', animation: 'popIn 0.22s cubic-bezier(.175,.885,.32,1.275)'
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            padding: '1.25rem 1.5rem', color: '#fff'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                background: 'rgba(255,255,255,0.2)', borderRadius: '0.625rem',
                padding: '0.5rem', display: 'flex'
              }}>
                <BookOpen size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem' }}>Subject Grid Analysis</h3>
                <p style={{ margin: 0, fontSize: '0.78rem', opacity: 0.85, marginTop: '2px' }}>
                  Current slot usage · {totalSlots} filled slot{totalSlots !== 1 ? 's' : ''} detected
                </p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: '1.25rem 1.5rem' }}>
            {subjects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📭</div>
                <p style={{ fontWeight: 600, margin: 0 }}>Grid is empty</p>
                <p style={{ fontSize: '0.8rem', marginTop: '0.25rem', opacity: 0.7 }}>
                  GA will fill all slots from scratch.
                </p>
              </div>
            ) : (
              <>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.875rem' }}>
                  The following subjects are currently placed in the grid.
                  Filled slots will be <strong>frozen</strong> before GA runs.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
                  {subjects.map((s, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '0.6rem 0.875rem',
                      background: s.type === 'Lab' ? 'rgba(245,158,11,0.08)' : 'rgba(79,70,229,0.06)',
                      borderRadius: '0.625rem',
                      border: `1px solid ${s.type === 'Lab' ? 'rgba(245,158,11,0.25)' : 'rgba(79,70,229,0.15)'}`
                    }}>
                      <div style={{
                        width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                        background: s.type === 'Lab' ? '#fef9c3' : 'rgba(79,70,229,0.12)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        {s.type === 'Lab' ? <FlaskConical size={14} color="#92400e" /> : <BookOpen size={14} color="#4f46e5" />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontWeight: 600, fontSize: '0.84rem',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                        }}>{s.name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                          {s.type}
                        </div>
                      </div>
                      <div style={{
                        flexShrink: 0, fontWeight: 700, fontSize: '0.9rem',
                        background: s.type === 'Lab' ? '#fef3c7' : 'rgba(79,70,229,0.12)',
                        color: s.type === 'Lab' ? '#92400e' : '#4f46e5',
                        borderRadius: '0.5rem', padding: '2px 10px', minWidth: '48px', textAlign: 'center'
                      }}>
                        ×{s.count}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Warning banner */}
            <div style={{
              marginTop: '1rem', padding: '0.625rem 0.875rem',
              background: 'rgba(234,179,8,0.1)', borderRadius: '0.625rem',
              border: '1px solid rgba(234,179,8,0.3)', fontSize: '0.78rem', color: '#92400e',
              display: 'flex', gap: '0.5rem', alignItems: 'flex-start'
            }}>
              <span style={{ fontSize: '1rem', lineHeight: 1 }}>⚡</span>
              <span>
                <strong>Semi-Auto GA</strong> will freeze all {totalSlots} filled slot{totalSlots !== 1 ? 's' : ''} and
                use the Genetic Algorithm to fill only the remaining empty cells.
              </span>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex', gap: '0.75rem', padding: '1rem 1.5rem',
            borderTop: '1px solid var(--border, #e5e7eb)', justifyContent: 'flex-end'
          }}>
            <button
              onClick={onCancel}
              style={{
                padding: '0.5rem 1.25rem', border: '1px solid var(--border, #d1d5db)',
                borderRadius: '0.625rem', background: 'transparent', cursor: 'pointer',
                fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-muted)'
              }}
            >Cancel</button>
            <button
              onClick={onConfirm}
              style={{
                padding: '0.5rem 1.5rem',
                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                border: 'none', borderRadius: '0.625rem', cursor: 'pointer',
                fontWeight: 700, fontSize: '0.875rem', color: '#fff',
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                boxShadow: '0 4px 12px rgba(79,70,229,0.35)'
              }}
            >
              <Play size={15} /> Proceed with GA
            </button>
          </div>
        </div>

        <style>{`
          @keyframes popIn {
            from { opacity: 0; transform: scale(0.88) translateY(16px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>
      </div>
    );
  };
  if (!data) return <div className="p-8 text-center">Error loading data. Please check mappings.</div>;

  const { section, days, periods, timetable, mappings, labMappings } = data;

  return (
    <div className="designer-page relative">
      <SubjectSummaryModal />
      {isGenerating && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm rounded-xl">
          <div className="relative flex items-center justify-center w-24 h-24 mb-4">
            <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
            <Play className="text-primary animate-pulse" size={32} />
          </div>
          <h3 className="text-xl font-bold text-gray-800">Running Genetic Algorithm</h3>
          <p className="text-sm text-gray-500 mt-2 max-w-md text-center">Optimizing department timetables. This may take a few moments...</p>
        </div>
      )}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="btn btn-outline p-2"><ArrowLeft size={20} /></button>
          <div>
            <h1 className="text-2xl font-bold">Timetable Designer: {section.name}</h1>
            <p className="text-muted">{section.department} Department • {periods.length} Periods/Day</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleAutoGenerate} 
            className="btn btn-outline border-primary text-primary hover:bg-primary hover:text-white" 
            disabled={isGenerating}
            title="Generate a completely new timetable from scratch"
          >
            {isGenerating ? <RefreshCw className="animate-spin" size={16} /> : <Play size={16} />}
            Full Auto (GA)
          </button>
          <button
            onClick={handleSemiGA}
            className="btn btn-outline border-warning text-warning hover:bg-warning hover:text-white"
            disabled={isGenerating}
            title="Freeze all currently filled slots in the grid and fill remaining with GA"
          >
            {isGenerating ? <RefreshCw className="animate-spin" size={16} /> : <RefreshCw size={16} />}
            Semi-Auto (GA)
          </button>
          <button onClick={handleClearGrid} className="btn btn-outline text-danger" title="Clear Grid">
            <Trash2 size={16} /> Clear Grid
          </button>
          <button onClick={handleSave} className="btn btn-primary" disabled={isSaving}>
            <Save size={16} /> {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="designer-layout">
        {/* Left Sidebar */}
        <aside className="designer-sidebar print-hide">
          <div className="sidebar-section">
            <h3>Subjects</h3>
            <div className="item-list">
              {mappings.map(m => (
                <div 
                  key={m._id} 
                  className="draggable-item subject" 
                  draggable 
                  onDragStart={() => onDragSidebarItem({ name: m.subjectName, faculty: m.faculty, isLab: false })}
                >
                  <BookOpen size={14} />
                  <span>{m.subjectName}</span>
                  <div className="text-xs opacity-50 truncate">{m.faculty?.name}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="sidebar-section">
            <h3>Labs</h3>
            <div className="item-list">
              {labMappings.map(lm => (
                <div 
                  key={lm._id} 
                  className="draggable-item lab" 
                  draggable 
                  onDragStart={() => onDragSidebarItem({ name: lm.lab?.name, faculty: lm.faculty, lab: lm.lab, isLab: true, venue: lm.labVenue })}
                >
                  <FlaskConical size={14} />
                  <span>{lm.lab?.name}</span>
                  <div className="text-xs opacity-50 truncate">{lm.faculty?.name}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Special & Custom moved to right sidebar */}
        </aside>

        {/* Main Grid */}
        <div className="designer-main">
          <div className="card p-0 overflow-hidden border-0 shadow-lg">
            <div className="table-responsive">
              <table className="timetable-table">
                <thead>
                  <tr>
                    <th className="day-col">Day</th>
                    {periods.map(p => <th key={p}>Period {p}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {days.map((day) => (
                    <tr key={day}>
                      <td className="day-name">{day}</td>
                      {(() => {
                        const cells = [];
                        const daySchedule = timetable?.schedule?.find(s => s.day === day);
                        
                        for (let pIdx = 0; pIdx < periods.length; pIdx++) {
                          const p = periods[pIdx];
                          const slot = daySchedule?.periods?.find(pr => pr.period === p);
                          const hasContent = slot && (slot.subject || slot.lab);

                          // Check if this is the start of a 3-period Lab block
                          if (slot?.type === 'Lab') {
                            const next1 = daySchedule?.periods?.find(pr => pr.period === periods[pIdx + 1]);
                            const next2 = daySchedule?.periods?.find(pr => pr.period === periods[pIdx + 2]);
                            
                            // Check if next 2 slots are the same lab (matching names or objects)
                            const labName = typeof slot.lab === 'object' ? slot.lab.name : slot.lab;
                            const next1Name = next1 ? (typeof next1.lab === 'object' ? next1.lab?.name : next1.lab) : null;
                            const next2Name = next2 ? (typeof next2.lab === 'object' ? next2.lab?.name : next2.lab) : null;

                            if (next1Name === labName && next2Name === labName) {
                              cells.push(
                                <td 
                                  key={p} 
                                  colSpan={3}
                                  className="grid-cell has-content lab-cell-merged"
                                  onDragOver={onDragOver}
                                  onDrop={() => onDrop(day, p)}
                                >
                                  <div className="slot-content lab-content-merged">
                                    <div className="slot-subject font-bold text-base text-warning-dark">{labName}</div>
                                    <div className="text-[10px] uppercase font-bold text-muted mt-1 tracking-wider opacity-60">3-Hour Lab Session</div>
                                    {slot.venue && (
                                      <div className="text-[11px] font-bold text-slate-500 mt-1">
                                        Venue: {slot.venue}
                                      </div>
                                    )}
                                    {slot.faculty?.name && (
                                      <div className="slot-faculty text-xs font-semibold mt-1">
                                        Faculty: {slot.faculty.name}
                                      </div>
                                    )}
                                    <button className="remove-btn" onClick={() => removeSlot(day, p)}><Trash2 size={10}/></button>
                                  </div>
                                </td>
                              );
                              pIdx += 2; // Skip next two cells
                              continue;
                            }
                          }

                          // Default single period cell
                          cells.push(
                            <td 
                              key={p} 
                              className={`grid-cell ${hasContent ? 'has-content' : ''}`}
                              onDragOver={onDragOver}
                              onDrop={() => onDrop(day, p)}
                              onContextMenu={(e) => { e.preventDefault(); removeSlot(day, p); }}
                            >
                              {hasContent ? (() => {
                                const isAddOn = slot.type === 'Subject' && slot.subject && slot.subject !== '-' && !slot.faculty && !slot.lab;
                                return (
                                  <div 
                                    className="slot-content"
                                    draggable
                                    onDragStart={() => onDragGridItem(day, p)}
                                    style={isAddOn ? {
                                      background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.04))',
                                      borderLeft: '3px solid rgba(245,158,11,0.6)',
                                      cursor: 'grab'
                                    } : {}}
                                  >
                                    <div className="slot-subject font-bold">{slot.subject}</div>
                                    {slot.faculty?.name && <div className="slot-faculty text-xs">{slot.faculty.name}</div>}
                                    {slot.lab && <div className="slot-lab text-xs uppercase font-bold text-muted">{typeof slot.lab === 'object' ? slot.lab.name : slot.lab}</div>}
                                    {slot.type === 'Lab' && slot.venue && <div className="text-[9px] font-bold text-slate-500">Venue: {slot.venue}</div>}
                                    <button className="remove-btn" onClick={() => removeSlot(day, p)}><Trash2 size={10}/></button>
                                  </div>
                                );
                              })() : (
                                <div className="slot-empty"></div>
                              )}
                            </td>
                          );
                        }
                        return cells;
                      })()}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-4 mt-6 print-hide">
            <button onClick={exportExcel} className="btn btn-outline text-success"><FileSpreadsheet size={16} /> Export CSV</button>
            <button onClick={exportPDF} className="btn btn-outline text-danger"><FileJson size={16} /> Print / PDF</button>
          </div>
        </div>

        {/* Right Sidebar */}
        <aside className="designer-sidebar right-sidebar print-hide">
          <div className="sidebar-section">
            <h3>Add-Ons</h3>
            <div className="item-list">
              {customItems.map(item => (
                <div 
                  key={item.id} 
                  className="draggable-item special" 
                  draggable 
                  onDragStart={() => onDragSidebarItem({ name: item.name, instructor: item.instructor, isLab: false })}
                >
                  {item.icon}
                  <div className="flex flex-col">
                    <span className="font-semibold">{item.name}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <input 
                type="text" 
                className="input input-sm" 
                placeholder="Item name (e.g. Sports)" 
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
              />
              <input 
                type="text" 
                className="input input-sm" 
                placeholder="Instructor (optional)" 
                value={newItemInstructor}
                onChange={(e) => setNewItemInstructor(e.target.value)}
              />
              <button className="btn btn-primary btn-sm" onClick={addCustomItem}><Plus size={16}/> Add Item</button>
            </div>
          </div>
          
          <div className="mt-8 p-4 bg-light rounded-lg">
            <h4 className="text-sm font-bold mb-2">Instructions</h4>
            <ul className="text-xs text-muted space-y-1">
              <li>• Drag from sidebars to assign</li>
              <li>• Drag within grid to swap</li>
              <li>• Right-click to remove</li>
            </ul>
          </div>
        </aside>
      </div>

      <style>{`
        .designer-layout { display: flex; gap: 1.5rem; }
        .designer-sidebar { width: 260px; flex-shrink: 0; background: white; padding: 1.25rem; border-radius: var(--radius-lg); border: 1px solid var(--border); height: fit-content; position: sticky; top: 1rem; }
        .designer-main { flex: 1; min-width: 0; }
        
        .sidebar-section h3 { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.75rem; margin-top: 1.5rem; }
        .sidebar-section:first-child h3 { margin-top: 0; }
        
        .item-list { display: flex; flex-direction: column; gap: 0.5rem; }
        .draggable-item { display: flex; align-items: center; gap: 0.5rem; padding: 0.625rem; background: var(--bg-main); border-radius: var(--radius-md); cursor: grab; border: 1px solid transparent; transition: all 0.2s; }
        .draggable-item:hover { border-color: var(--primary); transform: translateX(4px); }
        .draggable-item span { font-size: 0.8125rem; font-weight: 500; flex: 1; }
        
        .draggable-item.subject { border-left: 3px solid var(--primary); }
        .draggable-item.lab { border-left: 3px solid var(--warning); }
        .draggable-item.special { border-left: 3px solid var(--info); }

        .timetable-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .timetable-table th, .timetable-table td { border: 1px solid var(--border); text-align: center; height: 100px; transition: all 0.2s; position: relative; }
        .timetable-table th { background: var(--bg-main); font-size: 0.75rem; font-weight: 700; height: 50px; }
        .day-col { width: 100px; }
        .day-name { font-weight: 700; background: var(--bg-main); font-size: 0.875rem; }
        
        .grid-cell { background: #f8fafc; transition: all 0.2s; }
        .grid-cell:hover { background: #f1f5f9; }
        .grid-cell.has-content { background: white; }
        
        .lab-cell-merged { background-color: #fef9c3 !important; border: 2px solid #eab308 !important; padding: 0 !important; }
        .lab-content-merged { padding: 1rem !important; border-left: 4px solid #eab308; height: 100%; display: flex; flexDirection: column; justify-content: center; }
        .text-warning-dark { color: #854d0e; }

        .slot-content { padding: 0.5rem; display: flex; flex-direction: column; gap: 0.125rem; height: 100%; justify-content: center; cursor: grab; position: relative; }
        .slot-content:active { cursor: grabbing; }
        .slot-subject { font-size: 0.8125rem; color: var(--primary); line-height: 1.2; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
        .slot-faculty { color: var(--text-muted); font-size: 0.7rem; }
        .slot-lab { color: var(--warning); font-size: 0.65rem; margin-top: 0.25rem; }
        
        .remove-btn { position: absolute; top: 2px; right: 2px; padding: 4px; border: none; background: rgba(0,0,0,0.05); border-radius: 4px; color: var(--danger); opacity: 0; transition: opacity 0.2s; cursor: pointer; }
        .grid-cell:hover .remove-btn { opacity: 1; }
        
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        
        @media print {
          .print-hide, .designer-sidebar, .btn, .remove-btn { display: none !important; }
          .designer-layout { display: block; }
          .main-content { margin: 0 !important; padding: 0 !important; width: 100% !important; }
          .card { box-shadow: none !important; border: 1px solid #000 !important; }
          .timetable-table td, .timetable-table th { height: 70px; border: 1px solid #000 !important; }
        }
      `}</style>
    </div>
  );
};

export default TimetableGrid;
