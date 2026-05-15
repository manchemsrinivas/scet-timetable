import React, { useState, useEffect } from 'react';
import { Users, Layers, FlaskConical, CalendarDays, CheckCircle2, AlertCircle, Trash2, Plus, Download, Play, RefreshCw, Settings2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api/axios';

const AdminDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Map URL paths to tab IDs
  const getTabFromPath = (path) => {
    if (path.includes('/admin/sections')) return 'sections';
    if (path.includes('/admin/mapping')) return 'mapping';
    if (path.includes('/admin/labs')) return 'labs';
    if (path.includes('/admin/timetables')) return 'timetables';
    if (path.includes('/admin/faculty-timetables')) return 'faculty-timetables';
    if (path.includes('/admin/lab-venue-timetables')) return 'lab-venue-timetables';
    return 'submissions';
  };

  const [activeTab, setActiveTab] = useState(getTabFromPath(location.pathname));
  
  useEffect(() => {
    setActiveTab(getTabFromPath(location.pathname));
  }, [location.pathname]);

  const handleTabChange = (tabId) => {
    const pathMap = {
      submissions: '/admin',
      sections: '/admin/sections',
      mapping: '/admin/mapping',
      labs: '/admin/labs',
      timetables: '/admin/timetables',
      'faculty-timetables': '/admin/faculty-timetables',
      'lab-venue-timetables': '/admin/lab-venue-timetables'
    };
    navigate(pathMap[tabId] || '/admin');
  };
  const [data, setData] = useState({
    submissions: [],
    sections: [],
    mappings: [],
    labs: [],
    labMappings: [],
    approvedFaculty: [],
    venues: [],
    selectedDept: 'All'
  });
  const [loading, setLoading] = useState(true);
  const [selectedFacultyId, setSelectedFacultyId] = useState('');
  const [facultyScheduleData, setFacultyScheduleData] = useState(null);
  const [selectedVenueName, setSelectedVenueName] = useState('');
  const [venueScheduleData, setVenueScheduleData] = useState(null);
  const [deptFilter, setDeptFilter] = useState('All');
  const [isGenerating, setIsGenerating] = useState(false);
  const [gaConfig, setGaConfig] = useState({
    generations: 2000,
    populationSize: 100,
    weeklySlotsPerSubject: 5
  });
  const [mappingForm, setMappingForm] = useState({
    facultyId: '',
    subjectName: '',
    sectionId: ''
  });
  const [sectionForm, setSectionForm] = useState({
    name: '',
    department: ''
  });
  const [labForm, setLabForm] = useState({
    name: '',
    department: ''
  });
  const [labMappingForm, setLabMappingForm] = useState({
    facultyId: '',
    labId: '',
    sectionId: '',
    labVenue: '',
    customLabVenue: ''
  });
  
  const [selectedSubjects, setSelectedSubjects] = useState({});

  const handleSubjectToggle = (submissionId, subjectName) => {
    setSelectedSubjects(prev => {
      const current = prev[submissionId] || [];
      if (current.includes(subjectName)) {
        return { ...prev, [submissionId]: current.filter(s => s !== subjectName) };
      } else {
        return { ...prev, [submissionId]: [...current, subjectName] };
      }
    });
  };

  const handleFixPair = async (submissionId) => {
    const allottedSubjects = selectedSubjects[submissionId] || [];
    if (allottedSubjects.length === 0) {
      return alert('Please select at least one subject to allot.');
    }
    try {
      await api.post(`/admin/assign/${submissionId}`, { allottedSubjects });
      fetchDashboardData();
      alert('Subjects allotted and faculty approved successfully!');
    } catch (err) {
      alert('Failed to assign subjects');
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [deptFilter]);

  const fetchFacultySchedule = async (facultyId) => {
    if (!facultyId) {
      setFacultyScheduleData(null);
      return;
    }
    try {
      const res = await api.get(`/admin/faculty-timetable/${facultyId}`);
      setFacultyScheduleData(res.data.schedule);
    } catch (err) {
      console.error(err);
      alert('Failed to fetch faculty timetable');
    }
  };

  useEffect(() => {
    if (selectedFacultyId) {
      fetchFacultySchedule(selectedFacultyId);
    }
  }, [selectedFacultyId]);

  const fetchVenueSchedule = async (venueName) => {
    if (!venueName) {
      setVenueScheduleData(null);
      return;
    }
    try {
      const res = await api.get(`/admin/venue-timetable/${encodeURIComponent(venueName)}`);
      setVenueScheduleData(res.data.schedule);
    } catch (err) {
      console.error(err);
      alert('Failed to fetch venue timetable');
    }
  };

  useEffect(() => {
    if (selectedVenueName) {
      fetchVenueSchedule(selectedVenueName);
    }
  }, [selectedVenueName]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/dashboard?department=${deptFilter}`);
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, type) => {
    if (!confirm('Are you sure you want to remove this?')) return;
    try {
      const targetId = typeof id === 'object' ? id._id : id;
      await api.post(`/admin/${type}/delete/${targetId}`);
      fetchDashboardData();
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete: ' + (err.response?.data?.error || 'Server Error'));
    }
  };

  const handleDeleteSubmission = async (id) => {
    if (!confirm('Are you sure you want to delete this submission? This will remove all allotted subjects for this faculty.')) return;
    try {
      await api.post(`/admin/submissions/delete/${id}`);
      fetchDashboardData();
    } catch (err) {
      alert('Failed to delete submission');
    }
  };

  const handleApprove = async (id) => {
    try {
      await api.post(`/admin/approve/${id}`);
      fetchDashboardData();
    } catch (err) {
      alert('Approval failed');
    }
  };

  const handleStartAssign = (facultyId) => {
    setMappingForm({ ...mappingForm, facultyId });
    setActiveTab('mapping');
  };

  const handleMappingSubmit = async (e) => {
    e.preventDefault();
    if (!mappingForm.facultyId || !mappingForm.subjectName || !mappingForm.sectionId) {
      return alert('Please fill all fields');
    }
    try {
      await api.post('/admin/mappings', mappingForm);
      setMappingForm({ facultyId: '', subjectName: '', sectionId: '' });
      fetchDashboardData();
      alert('Mapping created successfully');
    } catch (err) {
      alert('Failed to create mapping: ' + (err.response?.data?.error || 'Unknown error'));
    }
  };

  const handleSectionSubmit = async (e) => {
    e.preventDefault();
    if (!sectionForm.name || !sectionForm.department) {
      return alert('Please fill all fields');
    }
    try {
      await api.post('/admin/sections', sectionForm);
      setSectionForm({ name: '', department: '' });
      fetchDashboardData();
      alert('Section created successfully');
    } catch (err) {
      alert('Failed to create section');
    }
  };

  const handleLabSubmit = async (e) => {
    e.preventDefault();
    if (!labForm.name || !labForm.department) {
      return alert('Please fill all fields');
    }
    try {
      await api.post('/admin/labs', labForm);
      setLabForm({ name: '', department: '' });
      fetchDashboardData();
      alert('Lab created successfully');
    } catch (err) {
      alert('Failed to create lab');
    }
  };

  const handleLabMappingSubmit = async (e) => {
    e.preventDefault();
    const finalVenue = labMappingForm.labVenue === 'custom' ? labMappingForm.customLabVenue : labMappingForm.labVenue;
    if (!labMappingForm.facultyId || !labMappingForm.labId || !labMappingForm.sectionId || !finalVenue) {
      return alert('Please fill all fields');
    }
    try {
      const selectedLab = data.labs.find(l => l._id === labMappingForm.labId);
      await api.post('/admin/lab-mappings', {
        facultyId: labMappingForm.facultyId,
        labId: labMappingForm.labId,
        sectionId: labMappingForm.sectionId,
        labVenue: finalVenue,
        department: selectedLab?.department
      });
      setLabMappingForm({ facultyId: '', labId: '', sectionId: '', labVenue: '', customLabVenue: '' });
      fetchDashboardData();
      alert('Lab mapping created successfully');
    } catch (err) {
      alert('Failed to create lab mapping');
    }
  };

  const handleGenerateDepartment = async () => {
    if (deptFilter === 'All') return alert('Please select a specific department first.');
    if (!confirm(`Run AI scheduling for entire ${deptFilter} department?`)) return;
    
    setIsGenerating(true);
    try {
      const res = await api.post('/admin/timetable/auto-generate-department', {
        department: deptFilter,
        ...gaConfig
      });
      alert(`Success! Generated timetables for ${res.data.savedCount} sections.`);
      fetchDashboardData();
    } catch (err) {
      alert('Generation failed: ' + (err.response?.data?.error || 'Unknown error'));
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading && !data.submissions.length) return <div className="flex items-center justify-center h-96">Loading Dashboard...</div>;

  return (
    <div className="dashboard-container">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-muted">Academic Management & Timetable Control</p>
        </div>
        <div className="flex gap-4">
          <select 
            className="select" 
            value={deptFilter} 
            onChange={(e) => setDeptFilter(e.target.value)}
            style={{ width: '200px' }}
          >
            <option value="All">All Departments</option>
            {['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT'].map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <button className="btn btn-outline" onClick={fetchDashboardData}>
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-row mb-8">
        <StatCard title="Faculty" value={data.submissions.length} icon={<Users className="text-primary" />} />
        <StatCard title="Sections" value={data.sections.length} icon={<Layers className="text-success" />} />
        <StatCard title="Mappings" value={data.mappings.length} icon={<CheckCircle2 className="text-info" />} />
        <StatCard title="Labs" value={data.labs.length} icon={<FlaskConical className="text-warning" />} />
      </div>

      <div className="dashboard-tabs">
        <TabBtn id="submissions" label="Submissions" active={activeTab} set={handleTabChange} icon={<Users size={16}/>} />
        <TabBtn id="sections" label="Sections" active={activeTab} set={handleTabChange} icon={<Layers size={16}/>} />
        <TabBtn id="mapping" label="Assignments" active={activeTab} set={handleTabChange} icon={<CheckCircle2 size={16}/>} />
        <TabBtn id="labs" label="Lab Mapping" active={activeTab} set={handleTabChange} icon={<FlaskConical size={16}/>} />
        <TabBtn id="timetables" label="Timetables" active={activeTab} set={handleTabChange} icon={<CalendarDays size={16}/>} />
        <TabBtn id="faculty-timetables" label="Faculty Timetables" active={activeTab} set={handleTabChange} icon={<Users size={16}/>} />
        <TabBtn id="lab-venue-timetables" label="Lab Venue Timetables" active={activeTab} set={handleTabChange} icon={<FlaskConical size={16}/>} />
      </div>

      <div className="tab-pane mt-6">
        {activeTab === 'submissions' && (
          <div className="card">
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Faculty Details</th>
                    <th>Department</th>
                    <th>Preferences (Check to Select)</th>
                    <th>Status</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.submissions.map(sub => (
                    <tr key={sub._id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="avatar-circle bg-primary bg-opacity-10 text-primary fw-bold" style={{width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{sub.faculty.name.charAt(0)}</div>
                          <div>
                            <div className="font-semibold">{sub.faculty.name}</div>
                            <div className="text-xs text-muted">Exp: {sub.totalYearsExperience} yrs</div>
                          </div>
                        </div>
                      </td>
                      <td><span className="badge badge-primary">{sub.department}</span></td>
                      <td>
                        <div className="flex flex-col gap-1">
                          {sub.subjects.sort((a,b) => a.priority - b.priority).map((s, idx) => (
                            <label key={idx} className="flex items-center gap-2 text-sm cursor-pointer">
                              <input 
                                type="checkbox" 
                                disabled={sub.status === 'Approved'}
                                checked={(selectedSubjects[sub._id] || []).includes(s.subjectName) || (sub.status === 'Approved' && sub.allottedSubjects?.includes(s.subjectName))}
                                onChange={() => handleSubjectToggle(sub._id, s.subjectName)}
                                className="accent-primary"
                              />
                              <div className="flex flex-col py-1">
                                <div className="flex items-center gap-2">
                                  <span className={sub.status === 'Approved' && sub.allottedSubjects?.includes(s.subjectName) ? 'font-bold text-success' : 'font-medium'}>
                                    P{s.priority || idx+1}: {s.subjectName}
                                  </span>
                                </div>
                                {(s.timesHandled > 0 || s.certifications) && (
                                  <div className="flex flex-wrap gap-1 mt-1 pl-2 border-left" style={{borderLeft: '2px solid var(--border)', marginLeft: '4px'}}>
                                    {s.timesHandled > 0 && (
                                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-sm font-semibold" style={{background: '#f1f5f9', color: '#475569'}}>
                                        Exp: {s.timesHandled} Times
                                      </span>
                                    )}
                                    {s.certifications && (
                                      <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-sm font-semibold italic" style={{background: '#eff6ff', color: '#2563eb'}}>
                                        📜 {s.certifications}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </label>
                          ))}
                        </div>
                      </td>
                      <td><span className={`badge ${sub.status === 'Approved' ? 'badge-success' : 'badge-warning'}`}>{sub.status}</span></td>
                      <td className="text-end">
                        <div className="flex justify-end gap-2">
                          {sub.status !== 'Approved' ? (
                            <button 
                              onClick={() => handleFixPair(sub._id)} 
                              className="btn btn-primary btn-sm px-4"
                            >
                              Approve & Fix Pair
                            </button>
                          ) : (
                            <span className="text-xs text-success font-bold">Pair Fixed</span>
                          )}
                          <button 
                            onClick={() => handleDeleteSubmission(sub._id)} 
                            className="btn text-danger p-1 ms-2"
                            title="Delete Submission"
                          >
                            <Trash2 size={16}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'sections' && (
          <div className="grid col-2 gap-6">
            <div className="card h-fit">
              <h4 className="font-bold mb-4">Create Sections</h4>
              <form onSubmit={handleSectionSubmit}>
                <div className="form-group">
                  <label className="label">Section Name</label>
                  <input 
                    className="input" 
                    placeholder="e.g. A" 
                    value={sectionForm.name}
                    onChange={(e) => setSectionForm({...sectionForm, name: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="label">Department</label>
                  <select 
                    className="select"
                    value={sectionForm.department}
                    onChange={(e) => setSectionForm({...sectionForm, department: e.target.value})}
                  >
                    <option value="">Select Department...</option>
                    {['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT'].map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <button className="btn btn-primary w-full" type="submit">Create Section</button>
              </form>
            </div>
            <div className="card">
              <h4 className="font-bold mb-4">Existing Sections</h4>
              <div className="table-container">
                <table className="table">
                  <thead><tr><th>Name</th><th>Dept</th><th className="text-end">Action</th></tr></thead>
                  <tbody>{data.sections.map(s => (
                    <tr key={s._id}>
                      <td>{s.name}</td>
                      <td><span className="badge badge-primary">{s.department}</span></td>
                      <td className="text-end">
                        <button onClick={() => handleDelete(s._id, 'sections')} className="btn text-danger p-0">
                          <Trash2 size={16}/>
                        </button>
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'mapping' && (
          <div className="grid col-2 gap-6">
            <div className="card h-fit">
              <h4 className="font-bold mb-4">Assign Faculty to Subject</h4>
              <form onSubmit={handleMappingSubmit}>
                <div className="form-group">
                  <label className="label">Faculty</label>
                  <select 
                    className="select"
                    value={mappingForm.facultyId}
                    onChange={(e) => setMappingForm({ ...mappingForm, facultyId: e.target.value, subjectName: '' })}
                  >
                    <option value="">Select Faculty...</option>
                    {data.approvedFaculty.map(f => (
                      <option key={f._id} value={f.faculty._id}>
                        {f.faculty.name} ({f.department})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="label">Subject (from Allotted)</label>
                  <select 
                    className="select"
                    value={mappingForm.subjectName}
                    onChange={(e) => setMappingForm({ ...mappingForm, subjectName: e.target.value })}
                    disabled={!mappingForm.facultyId}
                  >
                    <option value="">Select Subject...</option>
                    {data.approvedFaculty
                      .find(f => f.faculty._id === mappingForm.facultyId)
                      ?.allottedSubjects.map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))
                    }
                  </select>
                </div>

                <div className="form-group">
                  <label className="label">Section</label>
                  <select 
                    className="select"
                    value={mappingForm.sectionId}
                    onChange={(e) => setMappingForm({ ...mappingForm, sectionId: e.target.value })}
                  >
                    <option value="">Select Section...</option>
                    {data.sections.map(s => (
                      <option key={s._id} value={s._id}>
                        {s.department} - {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <button className="btn btn-primary w-full" type="submit">
                  Save Assignment
                </button>
              </form>
            </div>
            <div className="card">
              <h4 className="font-bold mb-4">Active Mappings</h4>
              <div className="table-container">
                <table className="table">
                  <thead><tr><th>Faculty</th><th>Subject</th><th>Section</th><th className="text-end">Action</th></tr></thead>
                  <tbody>
                    {data.mappings.map(m => (
                      <tr key={m._id}>
                        <td>{m.faculty?.name}</td>
                        <td><span className="badge badge-primary">{m.subjectName}</span></td>
                        <td>{m.section?.name}</td>
                        <td className="text-end">
                          <button onClick={() => handleDelete(m._id, 'mappings')} className="btn text-danger p-0"><Trash2 size={16}/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'labs' && (
          <div className="grid col-2 gap-6">
            <div className="flex flex-col gap-6">
              <div className="card h-fit">
                <h4 className="font-bold mb-4">Register Lab</h4>
                <form onSubmit={handleLabSubmit}>
                  <div className="form-group">
                    <label className="label">Lab Name</label>
                    <input 
                      className="input" 
                      placeholder="e.g. Computer Lab 1" 
                      value={labForm.name}
                      onChange={(e) => setLabForm({...labForm, name: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Department</label>
                    <select 
                      className="select"
                      value={labForm.department}
                      onChange={(e) => setLabForm({...labForm, department: e.target.value})}
                    >
                      <option value="">Select Department...</option>
                      {['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT'].map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <button className="btn btn-primary w-full">Create Lab</button>
                </form>
              </div>

              <div className="card h-fit">
                <h4 className="font-bold mb-4">Assign Lab to Section</h4>
                <form onSubmit={handleLabMappingSubmit}>
                  <div className="form-group">
                    <label className="label">Faculty</label>
                    <select 
                      className="select"
                      value={labMappingForm.facultyId}
                      onChange={(e) => setLabMappingForm({...labMappingForm, facultyId: e.target.value})}
                    >
                      <option value="">Select Faculty...</option>
                      {data.approvedFaculty.map(f => <option key={f._id} value={f.faculty._id}>{f.faculty.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="label">Lab</label>
                    <select 
                      className="select"
                      value={labMappingForm.labId}
                      onChange={(e) => setLabMappingForm({...labMappingForm, labId: e.target.value})}
                    >
                      <option value="">Select Lab...</option>
                      {data.labs.map(l => <option key={l._id} value={l._id}>{l.name} ({l.department})</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="label">Section</label>
                    <select 
                      className="select"
                      value={labMappingForm.sectionId}
                      onChange={(e) => setLabMappingForm({...labMappingForm, sectionId: e.target.value})}
                    >
                      <option value="">Select Section...</option>
                      {data.sections.map(s => <option key={s._id} value={s._id}>{s.department} - {s.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="label">Lab Venue</label>
                    <select 
                      className="select mb-2"
                      value={labMappingForm.labVenue}
                      onChange={(e) => setLabMappingForm({...labMappingForm, labVenue: e.target.value})}
                    >
                      <option value="">Select Venue...</option>
                      <option value="CSE Lab 1">CSE Lab 1</option>
                      <option value="CSE Lab 2">CSE Lab 2</option>
                      <option value="CSE Lab 3">CSE Lab 3</option>
                      <option value="ECE Lab 1">ECE Lab 1</option>
                      <option value="ECE Lab 2">ECE Lab 2</option>
                      <option value="custom" className="text-primary font-bold">+ Add Custom Venue</option>
                    </select>
                    {labMappingForm.labVenue === 'custom' && (
                      <input 
                        type="text" 
                        className="input" 
                        placeholder="Type new venue name..."
                        value={labMappingForm.customLabVenue}
                        onChange={(e) => setLabMappingForm({...labMappingForm, customLabVenue: e.target.value})}
                      />
                    )}
                  </div>
                  <button className="btn btn-primary w-full">Save Lab Assignment</button>
                </form>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div className="card">
                <h4 className="font-bold mb-4">Active Lab Mappings</h4>
                <div className="table-container">
                  <table className="table">
                    <thead><tr><th>Faculty</th><th>Lab</th><th>Section</th><th>Venue</th><th className="text-end">Action</th></tr></thead>
                    <tbody>
                      {data.labMappings.map(m => (
                        <tr key={m._id}>
                          <td>{m.faculty?.name}</td>
                          <td><span className="badge badge-warning">{m.lab?.name}</span></td>
                          <td>{m.section?.name}</td>
                          <td><span className="badge badge-outline text-muted">{m.labVenue}</span></td>
                          <td className="text-end">
                            <button 
                              type="button"
                              onClick={() => {
                                console.log('Deleting lab mapping:', m._id);
                                handleDelete(m._id, 'lab-mappings');
                              }} 
                              className="btn text-danger p-1"
                              title="Remove Lab Assignment"
                            >
                              <Trash2 size={16}/>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="card">
                <h4 className="font-bold mb-4">Existing Labs</h4>
                <div className="table-container">
                  <table className="table">
                    <thead><tr><th>Name</th><th>Dept</th><th className="text-end">Action</th></tr></thead>
                    <tbody>{data.labs.map(l => (
                      <tr key={l._id}>
                        <td>{l.name}</td>
                        <td><span className="badge badge-primary">{l.department}</span></td>
                        <td className="text-end">
                          <button 
                            type="button"
                            onClick={() => handleDelete(l._id, 'labs')} 
                            className="btn text-danger p-1"
                            title="Delete Lab"
                          >
                            <Trash2 size={16}/>
                          </button>
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'timetables' && (
          <div className="card">
            <div className="text-center py-8">
              <Play className="mx-auto text-primary mb-4" size={48} />
              <h3 className="font-bold text-xl mb-2">Automated Generation</h3>
              <p className="text-muted mb-6 max-w-lg mx-auto">Generate conflict-free schedules for the entire department using our Genetic Algorithm.</p>
              
              <div className="flex justify-center gap-4 mb-8">
                <div className="form-group mb-0" style={{width: '120px'}}>
                  <label className="text-xs font-bold uppercase text-muted mb-1 block">Generations</label>
                  <input type="number" className="input text-center" value={gaConfig.generations} onChange={(e) => setGaConfig({...gaConfig, generations: parseInt(e.target.value)})} />
                </div>
                <div className="form-group mb-0" style={{width: '120px'}}>
                  <label className="text-xs font-bold uppercase text-muted mb-1 block">Pop Size</label>
                  <input type="number" className="input text-center" value={gaConfig.populationSize} onChange={(e) => setGaConfig({...gaConfig, populationSize: parseInt(e.target.value)})} />
                </div>
                <div className="form-group mb-0" style={{width: '120px'}}>
                  <label className="text-xs font-bold uppercase text-muted mb-1 block">Weekly Slots</label>
                  <input type="number" className="input text-center" value={gaConfig.weeklySlotsPerSubject} onChange={(e) => setGaConfig({...gaConfig, weeklySlotsPerSubject: parseInt(e.target.value)})} />
                </div>
              </div>

              {deptFilter !== 'All' ? (
                <button 
                  className={`btn btn-primary px-8 py-3 rounded-pill transition-all ${isGenerating ? 'loading' : ''}`}
                  onClick={handleGenerateDepartment}
                  disabled={isGenerating}
                >
                  {isGenerating ? <RefreshCw className="animate-spin me-2" size={18} /> : <Play className="me-2" size={18} />}
                  {isGenerating ? 'Optimizing Schedule...' : `Generate ${deptFilter} Timetables`}
                </button>
              ) : (
                <div className="badge badge-warning py-3 px-6 rounded-pill">Please filter by department to enable generation</div>
              )}
            </div>
            
            <div className="grid col-4 gap-4 mt-8">
              {data.sections.map(sec => (
                <div key={sec._id} className="card border-light text-center hover-shadow">
                  <div className="p-3 bg-light rounded-xl mx-auto mb-3 h-fit w-fit"><CalendarDays className="text-primary" /></div>
                  <h6 className="font-bold mb-1">{sec.name}</h6>
                  <p className="text-xs text-muted mb-4">{sec.department} Dept</p>
                  <button 
                    className="btn btn-outline btn-sm w-full"
                    onClick={() => navigate(`/admin/timetable/grid/${sec._id}`)}
                  >
                    Manage Grid
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'faculty-timetables' && (
          <div className="card">
            <h3 className="font-bold text-xl mb-4">Faculty-wise Timetable</h3>
            <div className="form-group max-w-md">
              <label className="label">Select Faculty</label>
              <select 
                className="select"
                value={selectedFacultyId}
                onChange={(e) => setSelectedFacultyId(e.target.value)}
              >
                <option value="">Select Faculty...</option>
                {data.approvedFaculty.map(f => (
                  <option key={f.faculty._id} value={f.faculty._id}>
                    {f.faculty.name} ({f.department})
                  </option>
                ))}
              </select>
            </div>

            {selectedFacultyId && facultyScheduleData && (() => {
              let theoryCount = 0;
              let labCount = 0;
              facultyScheduleData.forEach(day => {
                day.periods.forEach(p => {
                  if (p.subject !== '-') {
                    if (p.type === 'Lab') labCount++;
                    else theoryCount++;
                  }
                });
              });
              
              return (
                <div className="mt-8">
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
                    {facultyScheduleData.map((dayData, idx) => (
                      <tr key={idx}>
                        <td className="font-bold" style={{ textAlign: 'center', borderRight: '1px solid var(--border)', background: 'var(--bg-main)' }}>
                          {dayData.day}
                        </td>
                        {dayData.periods.map((period, pIdx) => (
                          <td key={pIdx} style={{ padding: '0.5rem', height: '80px', borderRight: pIdx !== 6 ? '1px solid var(--border)' : 'none', verticalAlign: 'middle' }}>
                            {period.subject !== '-' ? (
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
                                <span className="font-bold text-sm" style={{ textAlign: 'center', lineHeight: '1.2' }}>
                                  {period.subject} {period.type === 'Lab' && '(Lab)'}
                                </span>
                                {period.section && (
                                  <span className="badge badge-primary text-xs mt-1">{period.section}</span>
                                )}
                                {period.lab && (
                                  <span className="text-xs text-muted mt-1 font-bold">{typeof period.lab === 'object' ? period.lab.name : period.lab}</span>
                                )}
                              </div>
                            ) : (
                              <div className="text-muted text-xs" style={{ textAlign: 'center' }}>-</div>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            );
            })()}
          </div>
        )}
        {activeTab === 'lab-venue-timetables' && (
          <div className="card">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Lab Venue Timetables</h3>
              <select 
                className="select" 
                style={{ width: '300px' }}
                value={selectedVenueName}
                onChange={(e) => setSelectedVenueName(e.target.value)}
              >
                <option value="">Select Lab Venue...</option>
                {data.venues.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>

            {!selectedVenueName && (
              <div className="text-center py-20 text-muted">
                <FlaskConical size={48} className="mx-auto mb-4 opacity-20" />
                <p>Select a lab venue to view its occupied slots across all sections</p>
              </div>
            )}

            {selectedVenueName && venueScheduleData && (
              <div className="mt-8">
                <div className="table-container" style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
                  <table className="table venue-grid-table" style={{ minWidth: '800px', width: '100%', tableLayout: 'fixed' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '120px', textAlign: 'center', borderRight: '1px solid var(--border)' }}>Day / Period</th>
                        {[1, 2, 3, 4, 5, 6, 7].map(p => (
                          <th key={p} style={{ textAlign: 'center', borderRight: p !== 7 ? '1px solid var(--border)' : 'none' }}>Period {p}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {venueScheduleData.map((dayData, idx) => (
                        <tr key={idx}>
                          <td className="font-bold" style={{ textAlign: 'center', borderRight: '1px solid var(--border)', background: 'var(--bg-main)' }}>
                            {dayData.day}
                          </td>
                          {dayData.periods.map((period, pIdx) => (
                            <td key={pIdx} style={{ padding: '0.5rem', height: '100px', borderRight: pIdx !== 6 ? '1px solid var(--border)' : 'none', verticalAlign: 'middle' }}>
                              {period.type === 'Lab' ? (
                                <div 
                                  style={{ 
                                    backgroundColor: 'rgba(245, 158, 11, 0.15)', 
                                    height: '100%',
                                    width: '100%',
                                    padding: '0.5rem',
                                    borderRadius: 'var(--radius-md)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.25rem',
                                    border: '1px solid rgba(245, 158, 11, 0.3)'
                                  }}
                                >
                                  <span className="font-bold text-sm" style={{ textAlign: 'center', lineHeight: '1.2', color: 'var(--warning-dark)' }}>
                                    {period.lab}
                                  </span>
                                  <span className="badge badge-primary text-xs mt-1" style={{ fontSize: '10px' }}>{period.section}</span>
                                  <span className="text-xs font-semibold mt-1" style={{ color: 'var(--text-main)', opacity: 0.8 }}>{period.faculty}</span>
                                </div>
                              ) : (
                                <div className="text-muted text-xs" style={{ textAlign: 'center', opacity: 0.3 }}>VACANT</div>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .dashboard-container { max-width: 1200px; margin: 0 auto; }
        .stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem; }
        .grid.col-2 { display: grid; grid-template-columns: 1fr 2fr; }
        .grid.col-4 { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); }
        .h-fit { height: fit-content; }
        .hover-shadow:hover { box-shadow: var(--shadow-lg); transform: translateY(-2px); }
        .transition-all { transition: all 0.3s ease; }
        .dashboard-tabs { display: flex; gap: 0.5rem; border-bottom: 1px solid var(--border); }
        .tab-btn { display: flex; align-items: center; gap: 0.5rem; background: none; border: none; padding: 1rem 1.25rem; font-weight: 600; color: var(--text-muted); cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.2s; }
        .tab-btn.active { color: var(--primary); border-bottom-color: var(--primary); background: var(--primary-light); border-radius: var(--radius-md) var(--radius-md) 0 0; }
        .avatar-circle { display: flex; align-items: center; justify-content: center; }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

const TabBtn = ({ id, label, active, set, icon }) => (
  <button className={`tab-btn ${active === id ? 'active' : ''}`} onClick={() => set(id)}>
    {icon} {label}
  </button>
);

const StatCard = ({ title, value, icon }) => (
  <div className="card flex items-center gap-4 mb-0 border-0 shadow-sm">
    <div className="stat-icon-wrapper p-3 rounded-xl" style={{background: 'rgba(79, 70, 229, 0.05)'}}>
      {icon}
    </div>
    <div>
      <div className="text-xs text-muted font-bold text-uppercase tracking-wider">{title}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  </div>
);

export default AdminDashboard;
