import React, { useState, useEffect } from 'react';
import { CalendarDays, FileText, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import api from '../api/axios';

const FacultyDashboard = () => {
  const [data, setData] = useState({
    submission: null,
    timetables: [],
    userId: null
  });
  const [loading, setLoading] = useState(true);
  const [viewingTimetable, setViewingTimetable] = useState(null);
  
  const predefinedSubjects = [
    "Discrete Mathematics & Graph Theory (DMGT)",
    "Managerial Economics and Financial Analysis (MEFA)",
    "Computer Organization (CO)",
    "Advanced Data Structures & Algorithms (ADS)",
    "Database Management Systems (DBMS)",
    "Computer Networks (CN)",
    "Data Mining",
    "Data Science",
    "Network Security"
  ];

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    experience: '',
    prefs: ['', '', '', '', ''],
    customPrefs: ['', '', '', '', ''],
    subjectExp: ['', '', '', '', ''],
    subjectCert: ['', '', '', '', '']
  });

  const getAvailableSubjects = (currentIndex) => {
    const selectedInOthers = formData.prefs.filter((p, i) => i !== currentIndex && p !== '' && p !== 'custom');
    return predefinedSubjects.filter(sub => !selectedInOthers.includes(sub));
  };
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    fetchFacultyData();
  }, []);

  const fetchFacultyData = async () => {
    try {
      const res = await api.get('/faculty/dashboard');
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch faculty dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleWillingnessSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    try {
      const subjectArray = formData.prefs.map((p, idx) => {
        let name = p;
        if (p === 'custom') name = formData.customPrefs[idx];
        return { 
          subjectName: name, 
          priority: idx + 1,
          timesHandled: Number(formData.subjectExp[idx] || 0),
          certifications: formData.subjectCert[idx] || ''
        };
      }).filter(s => s.subjectName && s.subjectName.trim() !== '');

      await api.post('/faculty/willingness', {
        totalYearsExperience: Number(formData.experience),
        subjects: subjectArray
      });
      setShowForm(false);
      fetchFacultyData(); // Refresh data to show pending status
    } catch (err) {
      console.error('Failed to submit willingness form');
      alert('Error submitting form');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-96">Loading...</div>;

  return (
    <div className="dashboard-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Faculty Dashboard</h1>
        <p className="text-muted">Manage your willingness and view your schedule</p>
      </div>

      <div className="grid md-grid gap-6 mb-8" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem'}}>
        {/* Submission Status Card */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-primary bg-opacity-10 text-primary">
              <FileText size={20} />
            </div>
            <h3 className="font-bold">Willingness Status</h3>
          </div>
          
          {data.submission ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted text-sm">Status</span>
                <span className={`badge ${data.submission.status === 'Approved' ? 'badge-success' : 'badge-warning'}`}>
                  {data.submission.status}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted text-sm">Experience</span>
                <span className="font-medium">{data.submission.totalYearsExperience} Years</span>
              </div>
              <div className="pt-4 border-top">
                <div className="text-xs text-muted font-bold text-uppercase mb-2">Preferred Subjects</div>
                <div className="flex flex-wrap gap-2">
                  {data.submission.subjects.sort((a,b)=>a.priority-b.priority).map((s, i) => (
                    <span key={i} className="badge" style={{ border: '1px solid var(--border)', color: 'var(--text-main)' }}>
                      P{s.priority}: {s.subjectName}
                    </span>
                  ))}
                </div>
              </div>
              
              {data.submission.status === 'Approved' && data.submission.allottedSubjects && data.submission.allottedSubjects.length > 0 && (
                <div className="pt-4 border-top">
                  <div className="text-xs text-success font-bold text-uppercase mb-2">Approved & Allotted Subjects</div>
                  <div className="flex flex-wrap gap-2">
                    {data.submission.allottedSubjects.map((sub, i) => (
                      <span key={i} className="badge badge-success">{sub}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <AlertCircle className="mx-auto text-muted mb-2" size={32} />
              <p className="text-muted text-sm mb-4">No willingness form submitted yet.</p>
              <button className="btn btn-primary w-full" onClick={() => setShowForm(true)}>Submit Form</button>
            </div>
          )}
        </div>

        {/* Willingness Modal */}
        {showForm && (
          <div className="modal-overlay" style={{position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'}}>
            <div className="card" style={{width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto'}}>
              <h3 className="font-bold mb-4">Submit Willingness Form</h3>
              <form onSubmit={handleWillingnessSubmit}>
                <div className="form-group">
                  <label className="label">Total Years of Experience</label>
                  <input 
                    type="number" 
                    className="input" 
                    required 
                    min="0"
                    value={formData.experience} 
                    onChange={e => setFormData({...formData, experience: e.target.value})} 
                  />
                </div>

                <div className="form-group mb-2">
                  <label className="label font-bold text-primary">Subject Preferences (1 to 5)</label>
                  <p className="text-xs text-muted mb-3">Rank your preferred subjects. Priority 1 is highest.</p>
                  
                  {[0, 1, 2, 3, 4].map(idx => (
                    <div key={idx} className="mb-3 p-3 bg-light rounded border">
                      <label className="label text-xs">Priority {idx + 1}</label>
                      <select 
                        className="select select-sm w-full mb-2"
                        value={formData.prefs[idx]}
                        onChange={e => {
                          const newPrefs = [...formData.prefs];
                          newPrefs[idx] = e.target.value;
                          setFormData({...formData, prefs: newPrefs});
                        }}
                      >
                        <option value="">-- Select Subject --</option>
                        {getAvailableSubjects(idx).map(sub => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                        <option value="custom" className="text-primary font-bold">+ Add Custom Subject</option>
                      </select>
                      
                      {formData.prefs[idx] === 'custom' && (
                        <input 
                          type="text" 
                          className="input input-sm w-full mb-2"
                          placeholder="Type custom subject name..."
                          required
                          value={formData.customPrefs[idx]}
                          onChange={e => {
                            const newCustom = [...formData.customPrefs];
                            newCustom[idx] = e.target.value;
                            setFormData({...formData, customPrefs: newCustom});
                          }}
                        />
                      )}

                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="text-[10px] uppercase font-bold text-muted">Experience (Times Handled)</label>
                          <input 
                            type="number" 
                            className="input input-sm w-full"
                            placeholder="e.g. 2"
                            min="0"
                            value={formData.subjectExp[idx]}
                            onChange={e => {
                              const newExp = [...formData.subjectExp];
                              newExp[idx] = e.target.value;
                              setFormData({...formData, subjectExp: newExp});
                            }}
                          />
                        </div>
                        <div className="flex-[2]">
                          <label className="text-[10px] uppercase font-bold text-muted">Certifications (NPTEL/Others)</label>
                          <input 
                            type="text" 
                            className="input input-sm w-full"
                            placeholder="e.g. NPTEL Elite+Gold"
                            value={formData.subjectCert[idx]}
                            onChange={e => {
                              const newCert = [...formData.subjectCert];
                              newCert[idx] = e.target.value;
                              setFormData({...formData, subjectCert: newCert});
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 justify-end mt-6">
                  <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={submitLoading}>
                    {submitLoading ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Quick Stats Card */}
        <div className="card bg-primary text-white border-0 shadow-lg" style={{background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)'}}>
          <h3 className="font-bold mb-2">Your Schedule</h3>
          <p className="text-indigo-100 text-sm mb-6">Stay on top of your weekly classes and labs.</p>
          <div className="flex items-center gap-4 py-4 border-top border-white border-opacity-10">
            <div className="text-3xl font-bold">0</div>
            <div className="text-sm text-indigo-100">Assigned Classes<br/>this week</div>
          </div>
          <button 
            className="btn w-full mt-4" 
            style={{background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)'}}
            onClick={() => {
              // Extract faculty's own schedule from all timetables
              let mySchedule = [];
              const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
              days.forEach(day => {
                let dayData = { day, periods: [] };
                for (let p = 1; p <= 7; p++) {
                  dayData.periods.push({ subject: '-', type: 'Free', section: null, lab: null });
                }
                mySchedule.push(dayData);
              });
              
              data.timetables.forEach(t => {
                if (!t.schedule) return;
                t.schedule.forEach(dayRow => {
                  const myDay = mySchedule.find(d => d.day === dayRow.day);
                  if (myDay) {
                    dayRow.periods.forEach(period => {
                      let isMine = false;
                      if (period.faculty) {
                        const pid = typeof period.faculty === 'object' ? (period.faculty._id || period.faculty.id || '').toString() : period.faculty.toString();
                        if (pid === data.userId) isMine = true;
                      }
                      if (isMine) {
                        const pIdx = period.period - 1;
                        if (pIdx >= 0 && pIdx < 7) {
                          myDay.periods[pIdx] = {
                            subject: period.subject,
                            type: period.type,
                            section: t.section?.name,
                            lab: period.lab
                          };
                        }
                      }
                    });
                  }
                });
              });
              
              setViewingTimetable({
                isPersonal: true,
                schedule: mySchedule
              });
            }}
          >
            View Full Timetable
          </button>
        </div>
      </div>

      {viewingTimetable ? (
        <div className="card animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-xl">
              {viewingTimetable.isPersonal ? 'My Personal Timetable' : `${viewingTimetable.section?.name} Timetable`}
            </h3>
            <button className="btn btn-outline btn-sm" onClick={() => setViewingTimetable(null)}>Back to Dashboard</button>
          </div>
          
          {viewingTimetable.isPersonal && (() => {
            let theoryCount = 0;
            let labCount = 0;
            viewingTimetable.schedule.forEach(day => {
              day.periods.forEach(p => {
                if (p.subject !== '-') {
                  if (p.type === 'Lab') labCount++;
                  else theoryCount++;
                }
              });
            });
            return (
              <div className="flex gap-4 mb-6">
                <div className="card flex-1 mb-0 py-4 px-6 shadow-sm border border-primary" style={{ backgroundColor: 'var(--primary-light)' }}>
                  <div className="text-xs font-bold text-primary text-uppercase tracking-wider mb-1">Theory Workload</div>
                  <div className="text-2xl font-bold text-primary">{theoryCount} <span className="text-xs font-normal opacity-75">classes/wk</span></div>
                </div>
                <div className="card flex-1 mb-0 py-4 px-6 shadow-sm border border-warning" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
                  <div className="text-xs font-bold text-warning text-uppercase tracking-wider mb-1">Lab Workload</div>
                  <div className="text-2xl font-bold text-warning">{labCount} <span className="text-xs font-normal opacity-75">classes/wk</span></div>
                </div>
                <div className="card flex-1 mb-0 py-4 px-6 shadow-sm border border-success" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
                  <div className="text-xs font-bold text-success text-uppercase tracking-wider mb-1">Total Workload</div>
                  <div className="text-2xl font-bold text-success">{theoryCount + labCount} <span className="text-xs font-normal opacity-75">classes/wk</span></div>
                </div>
              </div>
            );
          })()}

          <div className="table-container" style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
            <table className="table faculty-grid-table" style={{ minWidth: '800px', width: '100%', tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th style={{ width: '120px', textAlign: 'center', borderRight: '1px solid var(--border)' }}>Day / Period</th>
                  {[1, 2, 3, 4, 5, 6, 7].map(p => (
                    <th key={p} style={{ textAlign: 'center', borderRight: p !== 7 ? '1px solid var(--border)' : 'none' }}>Period {p}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {viewingTimetable.schedule.map((dayData, idx) => (
                  <tr key={idx}>
                    <td className="font-bold" style={{ textAlign: 'center', borderRight: '1px solid var(--border)', background: 'var(--bg-main)' }}>
                      {dayData.day}
                    </td>
                    {dayData.periods ? (() => {
                      const cells = [];
                      for (let pIdx = 0; pIdx < dayData.periods.length; pIdx++) {
                        const period = dayData.periods[pIdx];
                        const hasContent = period && period.subject && period.subject !== '-';

                        // Check for Lab merging
                        if (hasContent && period.type === 'Lab') {
                          const next1 = dayData.periods[pIdx + 1];
                          const next2 = dayData.periods[pIdx + 2];
                          
                          if (next1?.subject === period.subject && next2?.subject === period.subject) {
                            cells.push(
                              <td key={pIdx} colSpan={3} style={{ padding: '0.25rem', height: '80px', borderRight: '1px solid var(--border)', verticalAlign: 'middle' }}>
                                <div 
                                  style={{ 
                                    backgroundColor: '#fef9c3', // Lemon Yellow
                                    border: '2px solid #eab308',
                                    borderLeft: '4px solid #eab308',
                                    height: '100%',
                                    width: '100%',
                                    padding: '0.5rem',
                                    borderRadius: 'var(--radius-md)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 2px 4px rgba(234, 179, 8, 0.1)'
                                  }}
                                >
                                  <span className="font-bold text-sm" style={{ color: '#854d0e', textAlign: 'center' }}>
                                    {period.subject} (Lab)
                                  </span>
                                  {period.section && (
                                    <span className="badge badge-primary text-[10px] mt-1" style={{ fontSize: '9px', padding: '0 4px' }}>{period.section}</span>
                                  )}
                                  <span className="text-[9px] uppercase font-bold text-muted mt-1 opacity-60 tracking-tighter">Laboratory Session</span>
                                </div>
                              </td>
                            );
                            pIdx += 2;
                            continue;
                          }
                        }

                        cells.push(
                          <td key={pIdx} style={{ padding: '0.5rem', height: '80px', borderRight: pIdx !== 6 ? '1px solid var(--border)' : 'none', verticalAlign: 'middle' }}>
                            {hasContent ? (
                              <div 
                                style={{ 
                                  backgroundColor: period.type === 'Lab' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(79, 70, 229, 0.1)', 
                                  height: '100%',
                                  width: '100%',
                                  padding: '0.5rem',
                                  borderRadius: 'var(--radius-md)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '0.25rem'
                                }}
                              >
                                <span className="font-bold text-xs" style={{ textAlign: 'center', lineHeight: '1.2' }}>
                                  {period.subject} {period.type === 'Lab' && '(Lab)'}
                                </span>
                                {period.section && viewingTimetable.isPersonal && (
                                  <span className="badge badge-primary text-[10px] mt-1" style={{ fontSize: '9px', padding: '0 4px' }}>{period.section}</span>
                                )}
                              </div>
                            ) : (
                              <div className="text-muted text-[10px]" style={{ textAlign: 'center' }}>-</div>
                            )}
                          </td>
                        );
                      }
                      return cells;
                    })() : [1,2,3,4,5,6,7].map(p => <td key={p} style={{ borderRight: p !== 7 ? '1px solid var(--border)' : 'none' }}></td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card">
          <h3 className="font-bold mb-6">Recent Timetables</h3>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Section</th>
                <th>Department</th>
                <th>Status</th>
                <th className="text-end">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.timetables.length > 0 ? data.timetables.slice(0, 5).map(t => (
                <tr key={t._id}>
                  <td className="font-medium text-primary">{t.section?.name}</td>
                  <td>{t.department}</td>
                  <td><span className="badge badge-success">Generated</span></td>
                  <td className="text-end">
                    <button className="btn btn-primary btn-sm" onClick={() => setViewingTimetable(t)}>View Timetable</button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="4" className="text-center py-8 text-muted">
                    No generated timetables found in your department.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  );
};

export default FacultyDashboard;
