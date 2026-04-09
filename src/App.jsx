import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot, query } from 'firebase/firestore';
import { Plus, Trash2, Calendar, FileText, Save, Clock, CheckCircle2, DollarSign, PieChart, Edit, ChevronRight, Activity, X } from 'lucide-react';

// --- Firebase 初始化 ---
const firebaseConfig = {
  apiKey: "AIzaSyAuQIK3cCTGbbJsoNF_eh8TcNO4yIEoNmc",
  authDomain: "wubi-procurement.firebaseapp.com",
  projectId: "wubi-procurement",
  storageBucket: "wubi-procurement.firebasestorage.app",
  messagingSenderId: "760393790518",
  appId: "1:760393790518:web:ab31612530b1bc4fe6d497"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- 自動調整高度的專用文字框 (新增說明欄位使用) ---
const AutoResizeTextarea = ({ value, onChange, placeholder = "", isEditing }) => {
  const textareaRef = React.useRef(null);
  React.useEffect(() => {
    if (textareaRef.current && isEditing) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [value, isEditing]);

  return (
    <div className="flex flex-col w-full">
      {!isEditing ? (
        <div className="px-4 py-3 text-sm font-semibold text-slate-700 bg-slate-50/50 rounded-xl border border-slate-100 min-h-[80px] whitespace-pre-wrap break-words">
          {value || '-'}
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="px-4 py-3 text-sm font-semibold text-slate-800 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder-slate-300 w-full resize-none overflow-hidden"
        />
      )}
    </div>
  );
};

// --- 獨立的 UI 元件 ---
const SoftCard = ({ children, className = "" }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 p-6 transition-all duration-300 ${className}`}>
    {children}
  </div>
);

const CheckboxItem = ({ label, checked, onChange, isEditing }) => (
  <div 
    onClick={() => isEditing && onChange()}
    className={`
      flex items-center space-x-3 p-4 rounded-xl transition-all duration-200 border w-full
      ${isEditing ? 'cursor-pointer hover:shadow-md' : ''}
      ${checked ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}
    `}
  >
    <div className={`
      w-6 h-6 rounded-md flex items-center justify-center transition-all border shrink-0
      ${checked ? 'bg-blue-500 border-blue-500' : 'bg-white border-slate-300'}
    `}>
      {checked && <CheckCircle2 className="w-4 h-4 text-white" />}
    </div>
    <span className={`text-sm font-bold tracking-wide truncate ${checked ? 'text-blue-800' : 'text-slate-600'}`}>{label}</span>
  </div>
);

const InputField = ({ label, value, onChange, type = "text", placeholder = "", className = "", isEditing, multiline = false }) => (
  <div className={`flex flex-col space-y-2 ${className}`}>
    <label className="text-xs font-bold text-slate-500 ml-1 tracking-wide">{label}</label>
    {!isEditing ? (
      <div className="px-4 py-3 text-sm font-semibold text-slate-700 bg-slate-50/50 rounded-xl border border-slate-100 min-h-[46px] flex items-center break-words">
        {type === 'date' && typeof value === 'string' && value ? value.replace(/-/g, '/') : 
         type === 'datetime-local' && typeof value === 'string' && value ? value.replace('T', ' ').replace(/-/g, '/') :
         (value || '-')}
      </div>
    ) : (
      multiline ? (
        <textarea 
          value={value || ""} 
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className="px-4 py-3 text-sm font-semibold text-slate-800 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder-slate-300 w-full resize-none"
        />
      ) : (
        <input 
          type={type} 
          value={value || ""} 
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="px-4 py-3 text-sm font-semibold text-slate-800 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder-slate-300 w-full"
        />
      )
    )}
  </div>
);

const ToggleSlider = ({ checked, onChange, isEditing }) => (
  <div 
    className={`flex items-center space-x-3 h-full ${isEditing ? 'cursor-pointer' : 'opacity-80'}`} 
    onClick={() => isEditing && onChange(!checked)}
  >
    <div className={`w-12 h-6 rounded-full transition-colors relative ${checked ? 'bg-emerald-500' : 'bg-slate-300'}`}>
      <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform shadow-sm ${checked ? 'translate-x-6' : 'translate-x-0.5'}`} />
    </div>
    <span className={`text-sm font-bold ${checked ? 'text-emerald-600' : 'text-slate-500'}`}>
      {checked ? '通過' : '未通過'}
    </span>
  </div>
);

// --- 金額格式化工具 ---
const formatCurrency = (val) => {
  if (val === null || val === undefined || val === '') return '';
  const cleanVal = val.toString().replace(/,/g, '').replace(/\D/g, '');
  if (!cleanVal) return '';
  return Number(cleanVal).toLocaleString('en-US');
};

// --- 金額專用輸入框 ---
const CurrencyInputField = ({ label, value, onChange, placeholder = "", className = "", isEditing, textClass = "text-slate-800" }) => {
  const [isFocused, ReactSetIsFocused] = React.useState(false);

  const displayValue = (isEditing && isFocused)
    ? (value ? value.toString().replace(/,/g, '') : '')
    : (value ? formatCurrency(value) : '');

  const handleChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '');
    onChange(raw);
  };

  return (
    <div className={`flex flex-col space-y-2 ${className}`}>
      <label className="text-xs font-bold text-slate-500 ml-1 tracking-wide">{label}</label>
      {!isEditing ? (
        <div className={`px-4 py-3 text-sm font-black bg-slate-50/50 rounded-xl border border-slate-100 min-h-[46px] flex items-center ${textClass}`}>
          {value ? `$ ${formatCurrency(value)}` : '-'}
        </div>
      ) : (
        <input
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          onFocus={() => ReactSetIsFocused(true)}
          onBlur={() => ReactSetIsFocused(false)}
          placeholder={placeholder}
          className={`px-4 py-3 text-sm font-bold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder-slate-300 w-full ${isFocused ? 'text-slate-800' : textClass}`}
        />
      )}
    </div>
  );
};

// --- 客製化開標時間選擇器 ---
const CustomDateTimePicker = ({ label, value, onChange, isEditing }) => {
  const parseValue = (val) => {
     if (!val) return { date: '', ampm: 'AM', hour: '09', minute: '00' };
     const cleanVal = val.replace('T', ' ');
     const [d, t] = cleanVal.split(' ');
     if (!t) return { date: d || '', ampm: 'AM', hour: '09', minute: '00' };
     const [hStr, mStr] = t.split(':');
     let h24 = parseInt(hStr || '9', 10);
     const ampm = h24 >= 12 ? 'PM' : 'AM';
     let h12 = h24 % 12;
     if (h12 === 0) h12 = 12;

     return {
        date: d,
        ampm,
        hour: h12.toString().padStart(2, '0'),
        minute: (Math.round(parseInt(mStr || '0', 10) / 5) * 5).toString().padStart(2, '0')
     };
  };

  const [timeState, setTimeState] = React.useState(parseValue(value));

  React.useEffect(() => {
     setTimeState(parseValue(value));
  }, [value, isEditing]);

  const handleChange = (field, val) => {
     const newState = { ...timeState, [field]: val };
     setTimeState(newState);

     if (!newState.date) {
       onChange("");
       return;
     }

     let h24 = parseInt(newState.hour, 10);
     if (newState.ampm === 'PM' && h24 < 12) h24 += 12;
     if (newState.ampm === 'AM' && h24 === 12) h24 = 0;

     const formattedTime = `${newState.date} ${h24.toString().padStart(2, '0')}:${newState.minute}`;
     onChange(formattedTime);
  };

  if (!isEditing) {
    let displayStr = '-';
    if (value) {
        const { date, ampm, hour, minute } = parseValue(value);
        const ampmStr = ampm === 'AM' ? '上午' : '下午';
        displayStr = `${date.replace(/-/g, '/')} ${ampmStr} ${hour}:${minute}`;
    }
    return (
      <div className="flex flex-col space-y-2 w-full lg:w-auto">
        <label className="text-xs font-bold text-slate-500 ml-1 tracking-wide">{label}</label>
        <div className="px-4 py-3 text-sm font-semibold text-slate-700 bg-slate-50/50 rounded-xl border border-slate-100 min-h-[46px] flex items-center">
          {displayStr}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-2 w-full lg:w-auto">
      <label className="text-xs font-bold text-slate-500 ml-1 tracking-wide">{label}</label>
      <div className="flex flex-wrap items-center gap-2 bg-slate-50/50 p-1.5 rounded-xl border border-slate-200">
        <input type="date" value={timeState.date} onChange={(e) => handleChange('date', e.target.value)} className="px-3 py-2 text-sm font-bold text-slate-800 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/50 outline-none" />
        <select value={timeState.hour} onChange={(e) => handleChange('hour', e.target.value)} className="px-2 py-2 text-sm font-bold text-slate-800 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/50 outline-none cursor-pointer">
          {Array.from({length: 12}, (_, i) => {
            const h = (i + 1).toString().padStart(2, '0');
            return <option key={h} value={h}>{h} 時</option>
          })}
        </select>
        <span className="text-slate-400 font-bold">:</span>
        <select value={timeState.minute} onChange={(e) => handleChange('minute', e.target.value)} className="px-2 py-2 text-sm font-bold text-slate-800 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/50 outline-none cursor-pointer">
          {Array.from({length: 12}, (_, i) => {
            const m = (i * 5).toString().padStart(2, '0');
            return <option key={m} value={m}>{m} 分</option>
          })}
        </select>
        <select value={timeState.ampm} onChange={(e) => handleChange('ampm', e.target.value)} className="px-2 py-2 text-sm font-bold text-slate-800 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/50 outline-none cursor-pointer">
          <option value="AM">上午</option>
          <option value="PM">下午</option>
        </select>
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [localProject, setLocalProject] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          try {
            await signInWithCustomToken(auth, __initial_auth_token);
          } catch (tokenError) {
            console.warn("Token mismatch (可能使用了自訂的 Firebase 設定)，已切換為匿名登入：", tokenError);
            await signInAnonymously(auth);
          }
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) { console.error("Auth error:", error); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => setUser(currentUser));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const projectsRef = collection(db, 'artifacts', appId, 'public', 'data', 'projects');
    const q = query(projectsRef);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedProjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      loadedProjects.sort((a, b) => b.createdAt - a.createdAt);
      setProjects(loadedProjects);
      setIsLoading(false);
      
      if (currentProject) {
        const updatedCurrent = loadedProjects.find(p => p.id === currentProject.id);
        if (updatedCurrent) {
          setCurrentProject(updatedCurrent);
          if (!isEditing) setLocalProject(updatedCurrent);
        } else {
          setCurrentProject(null);
          setLocalProject(null);
        }
      }
    }, (error) => { 
      console.error("Firestore error:", error); 
      setIsLoading(false); 
    });
    return () => unsubscribe();
  }, [user, currentProject?.id, isEditing]);

  const createDefaultProject = () => ({
    title: "新採購工程案 " + new Date().toLocaleDateString(),
    assignee: "",
    contractor: "",
    taxId: "",
    amountIncTax: "",
    amountExcTax: "",
    description: "", // 新增：說明欄位
    createdAt: Date.now(),
    rounds: [
      {
        id: 1,
        tendering: { reqForm: false, signDoc: false, draftAnnounce: false, tenderDoc: false },
        waiting: { date: "", assignForm: false, basePrice: false, openRecord: false, awardRecord: false, awardAnnounce: false, failAnnounce: false, failRecord: false, resultType: "", bidCount: "" }
      }
    ],
    awardDate: "",
    performance: {
      inProgress: {
        record: false, announce: false, contract: false, stampTax: false,
        depositRet: false, guarantee: false, sapForm: false, insurance: false,
        reqNum: "", sapNum: "", startDate: "", deliveryDate: "", completionRate: "", // 新增：完成度
        reviewRounds: [{ id: 1, submitDate: "", passDate: "", note: "", isPassed: false }]
      },
      postCompletion: { completionDate: "", delayDays: "", readyForAcceptance: false },
      acceptancePayment: { acceptanceDate: "", formalAcceptanceDate: "", acceptanceNum: "", paymentDate: "", invoiceNum: "", isPaid: false, note: "" }
    }
  });

  const handleSelectProject = (p) => {
    setCurrentProject(p);
    setLocalProject(p);
    setIsEditing(false);
  };

  const handleAddProject = async () => {
    if (!user) return;
    const newProject = createDefaultProject();
    const newId = Date.now().toString();
    const projectWithId = { id: newId, ...newProject };
    const projectRef = doc(db, 'artifacts', appId, 'public', 'data', 'projects', newId);
    await setDoc(projectRef, projectWithId);
    setCurrentProject(projectWithId);
    setLocalProject(projectWithId);
    setIsEditing(true);
    setActiveTab('tendering');
  };

  const handleDeleteProject = async (projectId) => {
    if (!user) return;
    const projectRef = doc(db, 'artifacts', appId, 'public', 'data', 'projects', projectId);
    await deleteDoc(projectRef);
    if (currentProject?.id === projectId) {
      setCurrentProject(null);
      setLocalProject(null);
    }
  };

  const updateProjectData = async (updatedProject) => {
    if (!user) return;
    setCurrentProject(updatedProject);
    const projectRef = doc(db, 'artifacts', appId, 'public', 'data', 'projects', updatedProject.id);
    await setDoc(projectRef, updatedProject);
  };

  const handleSave = async () => {
    if (!localProject) return;
    await updateProjectData(localProject);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setLocalProject(currentProject);
    setIsEditing(false);
  };

  const handleFieldChange = (section, field, value, roundIndex = null, subSection = null) => {
    if (!localProject || !isEditing) return;
    const newProject = JSON.parse(JSON.stringify(localProject));
    // 新增：包含 description
    if (['title', 'awardDate', 'assignee', 'contractor', 'taxId', 'amountIncTax', 'amountExcTax', 'description'].includes(section)) {
      newProject[section] = value;
    } else if (section === 'rounds' && roundIndex !== null && subSection) {
      newProject.rounds[roundIndex][subSection][field] = value;
    } else if (section === 'performance' && subSection) {
      newProject.performance[subSection][field] = value;
    }
    setLocalProject(newProject);
  };

  const addRound = () => {
    if (!localProject || !isEditing) return;
    const newProject = JSON.parse(JSON.stringify(localProject));
    const nextId = newProject.rounds.length + 1;
    newProject.rounds.push({
      id: nextId,
      tendering: { reqForm: false, signDoc: false, draftAnnounce: false, tenderDoc: false },
      waiting: { date: "", assignForm: false, basePrice: false, openRecord: false, awardRecord: false, awardAnnounce: false, failAnnounce: false, failRecord: false, resultType: "", bidCount: "" }
    });
    setLocalProject(newProject);
  };

  // 新增：刪除招標/開標回合
  const removeRound = (index) => {
    if (!localProject || !isEditing) return;
    const newProject = JSON.parse(JSON.stringify(localProject));
    newProject.rounds.splice(index, 1);
    newProject.rounds.forEach((r, i) => r.id = i + 1); // 重新編號
    setLocalProject(newProject);
  };

  const addReviewRound = () => {
    if (!localProject || !isEditing) return;
    const newProject = JSON.parse(JSON.stringify(localProject));
    if (!newProject.performance.inProgress.reviewRounds) {
      newProject.performance.inProgress.reviewRounds = [];
    }
    const nextId = newProject.performance.inProgress.reviewRounds.length + 1;
    newProject.performance.inProgress.reviewRounds.push({ id: nextId, submitDate: "", passDate: "", note: "", isPassed: false });
    setLocalProject(newProject);
  };

  // 新增：刪除送審回合
  const removeReviewRound = (index) => {
    if (!localProject || !isEditing) return;
    const newProject = JSON.parse(JSON.stringify(localProject));
    newProject.performance.inProgress.reviewRounds.splice(index, 1);
    newProject.performance.inProgress.reviewRounds.forEach((r, i) => r.id = i + 1); // 重新編號
    setLocalProject(newProject);
  };

  const handleReviewChange = (index, field, value) => {
    if (!localProject || !isEditing) return;
    const newProject = JSON.parse(JSON.stringify(localProject));
    if (!newProject.performance.inProgress.reviewRounds) {
      newProject.performance.inProgress.reviewRounds = [{ id: 1, submitDate: "", passDate: "", note: "", isPassed: false }];
    }
    newProject.performance.inProgress.reviewRounds[index][field] = value;
    setLocalProject(newProject);
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] font-sans text-slate-900 overflow-hidden">
      <div className="w-[320px] bg-white border-r border-slate-200 flex flex-col z-10 shadow-sm shrink-0">
        <div className="p-8 pb-4">
          <div className="flex items-center gap-4 mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="bg-blue-600 p-2.5 rounded-xl shadow-sm">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-base font-black text-slate-800 tracking-tight leading-none">烏啤工務課</h1>
              <p className="text-[10px] font-bold text-blue-500 tracking-widest mt-1 uppercase">Procurement System</p>
            </div>
          </div>
          <button onClick={handleAddProject} className="w-full flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3.5 px-4 rounded-xl font-bold text-sm tracking-wide transition-all shadow-sm mb-8">
            <Plus className="w-5 h-5" /> 新增採購案
          </button>
        </div>
        <div className="px-4 pb-8 flex-grow overflow-y-auto space-y-6 custom-scrollbar">
          <div>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 px-4">進行中</h3>
            <div className="space-y-2">
              {projects.filter(p => !p.performance?.acceptancePayment?.isPaid).map(p => (
                <div key={p.id} onClick={() => handleSelectProject(p)} className={`
                  group flex items-center p-4 rounded-xl cursor-pointer transition-all duration-200 border
                  ${localProject?.id === p.id ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-transparent hover:border-slate-200'}
                `}>
                  <div className="w-2 h-2 rounded-full mr-4 bg-blue-500 animate-pulse"></div>
                  <span className={`truncate text-sm font-bold tracking-wide ${localProject?.id === p.id ? 'text-blue-800' : 'text-slate-600'}`}>{p.title}</span>
                  <ChevronRight className={`w-4 h-4 ml-auto transition-transform ${localProject?.id === p.id ? 'text-blue-500 translate-x-1' : 'text-slate-300 opacity-0 group-hover:opacity-100'}`} />
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 px-4 mt-8">已結案</h3>
            <div className="space-y-2">
              {projects.filter(p => p.performance?.acceptancePayment?.isPaid).map(p => (
                <div key={p.id} onClick={() => handleSelectProject(p)} className={`
                  group flex items-center p-4 rounded-xl cursor-pointer transition-all duration-200 border
                  ${localProject?.id === p.id ? 'bg-slate-100 border-slate-300 shadow-sm' : 'bg-white border-transparent hover:border-slate-200'}
                `}>
                  <div className="w-2 h-2 rounded-full mr-4 bg-slate-300"></div>
                  <span className={`truncate text-sm font-bold tracking-wide ${localProject?.id === p.id ? 'text-slate-800' : 'text-slate-500'}`}>{p.title}</span>
                  <ChevronRight className={`w-4 h-4 ml-auto transition-transform ${localProject?.id === p.id ? 'text-slate-500 translate-x-1' : 'text-slate-300 opacity-0 group-hover:opacity-100'}`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-grow flex flex-col overflow-hidden">
        {!localProject ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="p-10 bg-white rounded-[40px] mb-6 shadow-sm border border-slate-100">
              <Activity className="w-20 h-20 text-slate-200" />
            </div>
            <p className="text-sm font-black tracking-[0.2em] uppercase text-slate-400">請選擇專案開始作業</p>
          </div>
        ) : (
          <>
            <div className="px-10 py-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white border-b border-slate-200 z-10 shadow-sm shrink-0">
              <div className="flex-grow">
                <div className="flex items-center gap-2 mb-2">
                   <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 uppercase tracking-widest">Active Project</span>
                </div>
                {isEditing ? (
                  <input type="text" value={localProject.title} onChange={(e) => handleFieldChange('title', null, e.target.value)} className="text-2xl font-black text-slate-800 bg-slate-50 border border-slate-300 rounded-lg px-4 py-2 w-full max-w-2xl outline-none focus:ring-2 focus:ring-blue-500/50" />
                ) : (
                  <h2 className="text-3xl font-black text-slate-800 tracking-tight">{localProject.title}</h2>
                )}
              </div>
              <div className="flex items-center gap-4 shrink-0">
                {!isEditing ? (
                  <button onClick={() => setIsEditing(true)} className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-sm"><Edit className="w-4 h-4" /> 編輯資料</button>
                ) : (
                  <>
                    <button onClick={handleCancelEdit} className="text-slate-500 hover:text-slate-700 font-bold text-sm px-4">取消</button>
                    <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-sm"><Save className="w-4 h-4" /> 儲存設定</button>
                  </>
                )}
                <div className="w-px h-8 bg-slate-200 mx-1"></div>
                <button onClick={() => window.confirm('確定刪除？') && handleDeleteProject(localProject.id)} className="text-rose-400 p-2.5 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-all"><Trash2 className="w-5 h-5" /></button>
              </div>
            </div>

            <div className="px-10 pt-8 pb-4 bg-[#f8fafc] shrink-0">
              <div className="bg-slate-200/50 p-1.5 rounded-xl flex max-w-3xl">
                {[
                  { id: 'overview', label: '概況', icon: PieChart },
                  { id: 'tendering', label: '招標', icon: FileText },
                  { id: 'waiting', label: '開標', icon: Clock },
                  { id: 'performance', label: '履約', icon: CheckCircle2 }
                ].map(tab => (
                  <button 
                    key={tab.id} 
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all
                      ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}
                    `}
                  >
                    <tab.icon className="w-4 h-4" /> {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-grow px-10 pb-10 overflow-y-auto custom-scrollbar bg-[#f8fafc]">
              <div className="max-w-6xl mx-auto space-y-8">
                
                {activeTab === 'overview' && (
                  <div className="space-y-8">
                    <SoftCard className="space-y-6">
                      <div className="border-b border-slate-100 pb-4">
                         <h3 className="font-black text-slate-800 flex items-center gap-2 tracking-wide"><Activity className="w-5 h-5 text-blue-500" /> 採購進度資訊</h3>
                      </div>
                      <div className="space-y-4">
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">專案基本資料</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-6 bg-slate-50 border border-slate-100 rounded-2xl">
                          {/* 調整：承辦人和承攬廠商位置對調 */}
                          <div className="lg:col-span-1">
                            <InputField isEditing={isEditing} label="承辦人" value={localProject.assignee} onChange={(v) => handleFieldChange('assignee', null, v)} placeholder="輸入姓名..." />
                          </div>
                          <div className="lg:col-span-2">
                            <InputField isEditing={isEditing} multiline label="承攬廠商" value={localProject.contractor} onChange={(v) => handleFieldChange('contractor', null, v)} placeholder="輸入完整廠商名稱..." />
                          </div>
                          <div className="lg:col-span-1">
                            <InputField isEditing={isEditing} label="統一編號" value={localProject.taxId} onChange={(v) => handleFieldChange('taxId', null, v)} placeholder="例如：12345678" />
                          </div>
                          <div className="lg:col-span-2">
                            <CurrencyInputField isEditing={isEditing} label="契約金額 (含稅)" textClass="text-emerald-600" value={localProject.amountIncTax} onChange={(v) => handleFieldChange('amountIncTax', null, v)} placeholder="輸入含稅金額..." />
                          </div>
                          <div className="lg:col-span-2">
                            <CurrencyInputField isEditing={isEditing} label="契約金額 (未稅)" textClass="text-slate-600" value={localProject.amountExcTax} onChange={(v) => handleFieldChange('amountExcTax', null, v)} placeholder="輸入未稅金額..." />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">進度節點</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 p-6 bg-slate-50 border border-slate-100 rounded-2xl">
                          {/* 調整：完成度(%) 顯示於數字後方 */}
                          <div className="flex flex-col space-y-2">
                            <label className="text-xs font-bold text-slate-500 ml-1 tracking-wide">完成度</label>
                            {!isEditing ? (
                              <div className="px-4 py-3 text-sm font-semibold text-slate-700 bg-slate-50/50 rounded-xl border border-slate-100 min-h-[46px] flex items-center break-words">
                                {localProject.performance.inProgress?.completionRate ? `${localProject.performance.inProgress.completionRate} %` : '-'}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  value={localProject.performance.inProgress?.completionRate || ""}
                                  onChange={(e) => handleFieldChange('performance', 'completionRate', e.target.value, null, 'inProgress')}
                                  placeholder="0"
                                  className="px-4 py-3 text-sm font-semibold text-slate-800 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder-slate-300 w-full"
                                />
                                <span className="text-slate-500 font-bold text-sm">%</span>
                              </div>
                            )}
                          </div>
                          <InputField isEditing={false} label="交貨日期" value={localProject.performance.inProgress?.deliveryDate} />
                          <InputField isEditing={false} label="開工日期" value={localProject.performance.inProgress?.startDate} />
                          <InputField isEditing={false} label="完工日期" value={localProject.performance.postCompletion?.completionDate} />
                          <InputField isEditing={false} label="驗收合格日期" value={localProject.performance.acceptancePayment?.acceptanceDate} />
                        </div>
                      </div>
                    </SoftCard>
                    <SoftCard className="bg-white">
                      <div className="flex items-center justify-between mb-4">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">歷次開標紀錄</p>
                         <Clock className="w-4 h-4 text-slate-300" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {localProject.rounds && localProject.rounds.length > 0 ? (
                          localProject.rounds.map(r => (
                            <div key={r.id} className="flex flex-col gap-2 p-4 bg-slate-50 rounded-xl border border-slate-100 hover:shadow-sm transition-all">
                              <div className="flex justify-between items-center">
                                 <span className="text-sm font-black text-slate-600">第 {r.id} 次開標</span>
                                 <span className={`text-[10px] font-black px-2 py-1 rounded-md tracking-wider ${r.waiting.resultType === '決標' ? 'bg-emerald-100 text-emerald-700' : r.waiting.resultType ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-600'}`}>
                                   {r.waiting.resultType || '進行中'}
                                 </span>
                              </div>
                              <span className="text-sm font-bold text-slate-800 mt-1">{r.waiting.date ? r.waiting.date.replace('T', ' ').replace(/-/g, '/') : '尚未輸入時間'}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-slate-400 text-sm font-bold py-4 col-span-full text-center bg-slate-50 rounded-xl border border-slate-100">尚無紀錄</p>
                        )}
                      </div>
                    </SoftCard>

                    {/* 新增：說明 區塊 */}
                    <SoftCard className="bg-white">
                      <div className="flex items-center justify-between mb-4">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">說明</p>
                         <FileText className="w-4 h-4 text-slate-300" />
                      </div>
                      <AutoResizeTextarea
                        isEditing={isEditing}
                        value={localProject.description}
                        onChange={(v) => handleFieldChange('description', null, v)}
                        placeholder="請在此輸入專案相關說明或報告內容，欄位會隨著您的字數自動向下延展..."
                      />
                    </SoftCard>
                  </div>
                )}

                {activeTab === 'tendering' && (
                  <div className="space-y-8">
                    {localProject.rounds.map((round, idx) => (
                      <SoftCard key={idx}>
                        <div className="flex justify-between items-center mb-8 px-2">
                          <h3 className="text-lg font-black text-slate-800 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs">{round.id}</div>
                            第 {round.id} 次招標
                          </h3>
                          {/* 新增：招標回合刪除選項 (第2次含以後) */}
                          {isEditing && idx > 0 && (
                            <button onClick={() => removeRound(idx)} className="text-rose-500 hover:text-rose-600 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 transition-all">
                              <Trash2 className="w-4 h-4" /> 刪除
                            </button>
                          )}
                        </div>
                        
                        {/* 條件渲染：第2次(含)以後只要上網公告稿 */}
                        {idx === 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            <CheckboxItem isEditing={isEditing} label="請購單" checked={round.tendering.reqForm} onChange={() => handleFieldChange('rounds', 'reqForm', !round.tendering.reqForm, idx, 'tendering')} />
                            <CheckboxItem isEditing={isEditing} label="簽文" checked={round.tendering.signDoc} onChange={() => handleFieldChange('rounds', 'signDoc', !round.tendering.signDoc, idx, 'tendering')} />
                            <CheckboxItem isEditing={isEditing} label="上網公告稿" checked={round.tendering.draftAnnounce} onChange={() => handleFieldChange('rounds', 'draftAnnounce', !round.tendering.draftAnnounce, idx, 'tendering')} />
                            <CheckboxItem isEditing={isEditing} label="招標文件" checked={round.tendering.tenderDoc} onChange={() => handleFieldChange('rounds', 'tenderDoc', !round.tendering.tenderDoc, idx, 'tendering')} />
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-6">
                            <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 flex flex-col sm:flex-row gap-4 sm:items-center">
                               <div className="w-full sm:w-1/3">
                                 <CheckboxItem isEditing={isEditing} label="上網公告稿" checked={round.tendering.draftAnnounce} onChange={() => handleFieldChange('rounds', 'draftAnnounce', !round.tendering.draftAnnounce, idx, 'tendering')} />
                               </div>
                            </div>
                          </div>
                        )}
                      </SoftCard>
                    ))}
                    {isEditing && (
                      <button onClick={addRound} className="w-full py-4 border-2 border-dashed border-slate-300 text-slate-500 rounded-2xl font-bold flex items-center justify-center gap-2 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-all">
                        <Plus className="w-5 h-5" /> 增加招標次數
                      </button>
                    )}
                  </div>
                )}

                {activeTab === 'waiting' && (
                  <div className="space-y-8">
                    <SoftCard className="bg-blue-50 border-blue-100 pt-8 pb-8">
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                          <div className="lg:col-span-1">
                             <InputField isEditing={isEditing} label="決標日期" type="date" value={localProject.awardDate} onChange={(v) => handleFieldChange('awardDate', null, v)} />
                          </div>
                          <div className="hidden lg:flex flex-col justify-center lg:col-span-3 ml-2 mt-4">
                             <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Status Note</p>
                             <p className="text-xs font-bold text-blue-600">此日期將同步更新至概況看板</p>
                          </div>
                       </div>
                    </SoftCard>
                    {localProject.rounds.map((round, idx) => {
                      const isAwarded = round.waiting.resultType === '決標';
                      return (
                      <SoftCard key={idx}>
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4 border-b border-slate-100 pb-6">
                           <div className="space-y-4 w-full lg:w-auto">
                              <div className="flex items-center gap-3">
                                <h3 className="text-lg font-black text-slate-800">第 {round.id} 次開標</h3>
                                {/* 新增：開標回合刪除選項 (第2次含以後) */}
                                {isEditing && idx > 0 && (
                                  <button onClick={() => removeRound(idx)} className="text-rose-500 hover:text-rose-600 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 transition-all">
                                    <Trash2 className="w-4 h-4" /> 刪除
                                  </button>
                                )}
                              </div>
                              <CustomDateTimePicker isEditing={isEditing} label="開標時間" value={round.waiting.date} onChange={(v) => handleFieldChange('rounds', 'date', v, idx, 'waiting')} />
                           </div>
                           <div className="px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap items-center gap-4 w-full lg:w-auto">
                              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest w-full sm:w-auto">開標結果：</p>
                              {['決標', '流標', '廢標'].map(t => (
                                <div key={t} className="flex items-center gap-2">
                                  <button onClick={() => isEditing && handleFieldChange('rounds', 'resultType', round.waiting.resultType === t ? '' : t, idx, 'waiting')} 
                                          className={`text-xs font-black px-4 py-2 rounded-xl transition-all border ${round.waiting.resultType === t ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400 hover:bg-slate-100'}`}>
                                    {t}
                                  </button>
                                  {(t === '流標' || t === '廢標') && round.waiting.resultType === t && (
                                    isEditing ? (
                                      <div className="flex items-center gap-1">
                                        <input type="number" min="0" placeholder="家數" value={round.waiting.bidCount} onChange={(e) => handleFieldChange('rounds', 'bidCount', e.target.value, idx, 'waiting')} className="w-16 px-2 py-1.5 text-xs font-bold border border-slate-300 rounded-lg outline-none focus:border-blue-500" />
                                        <span className="text-xs font-bold text-slate-500">家</span>
                                      </div>
                                    ) : (
                                      round.waiting.bidCount && <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-md border border-rose-100">{round.waiting.bidCount} 家</span>
                                    )
                                  )}
                                </div>
                              ))}
                           </div>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                           <div className="lg:col-span-2 bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
                              <h4 className="text-sm font-black text-slate-700 mb-4 flex items-center gap-2">📄 開標文件</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <CheckboxItem isEditing={isEditing} label="招標指派單" checked={round.waiting.assignForm} onChange={() => handleFieldChange('rounds', 'assignForm', !round.waiting.assignForm, idx, 'waiting')} />
                                <CheckboxItem isEditing={isEditing} label="底價核定" checked={round.waiting.basePrice} onChange={() => handleFieldChange('rounds', 'basePrice', !round.waiting.basePrice, idx, 'waiting')} />
                              </div>
                           </div>
                           {round.waiting.resultType && (
                             <div className="lg:col-span-2 bg-blue-50/50 p-5 rounded-2xl border border-blue-100">
                                <h4 className="text-sm font-black text-blue-800 mb-4 flex items-center gap-2">📢 開標結果公告</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  {isAwarded ? (
                                    <>
                                      <CheckboxItem isEditing={isEditing} label="決標紀錄" checked={round.waiting.awardRecord} onChange={() => handleFieldChange('rounds', 'awardRecord', !round.waiting.awardRecord, idx, 'waiting')} />
                                      <CheckboxItem isEditing={isEditing} label="決標公告" checked={round.waiting.awardAnnounce} onChange={() => handleFieldChange('rounds', 'awardAnnounce', !round.waiting.awardAnnounce, idx, 'waiting')} />
                                    </>
                                  ) : (
                                    <>
                                      <CheckboxItem isEditing={isEditing} label={`${round.waiting.resultType}紀錄`} checked={round.waiting.failRecord} onChange={() => handleFieldChange('rounds', 'failRecord', !round.waiting.failRecord, idx, 'waiting')} />
                                      <CheckboxItem isEditing={isEditing} label="無法決標公告" checked={round.waiting.failAnnounce} onChange={() => handleFieldChange('rounds', 'failAnnounce', !round.waiting.failAnnounce, idx, 'waiting')} />
                                    </>
                                  )}
                                </div>
                             </div>
                           )}
                        </div>
                      </SoftCard>
                    )})}
                  </div>
                )}

                {activeTab === 'performance' && (
                  <div className="space-y-8">
                    <SoftCard>
                       <h3 className="text-lg font-black text-slate-800 mb-8 flex items-center gap-2"><Calendar className="w-5 h-5 text-blue-500" /> 階段一：履約與送審</h3>
                       <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4 mb-10">
                          {Object.entries({ record: "決標紀錄", announce: "決標公告", contract: "製作合約", stampTax: "印花稅", depositRet: "押標金退還", guarantee: "履約保證金", sapForm: "採購單", insurance: "保險" }).map(([key, label]) => (
                            <CheckboxItem isEditing={isEditing} key={key} label={label} checked={localProject.performance.inProgress[key]} onChange={() => handleFieldChange('performance', key, !localProject.performance.inProgress[key], null, 'inProgress')} />
                          ))}
                       </div>
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10 p-6 bg-slate-50 border border-slate-100 rounded-2xl">
                          <InputField isEditing={isEditing} label="請購單" value={localProject.performance.inProgress.reqNum} onChange={(v) => handleFieldChange('performance', 'reqNum', v, null, 'inProgress')} />
                          <InputField isEditing={isEditing} label="採購單" value={localProject.performance.inProgress.sapNum} onChange={(v) => handleFieldChange('performance', 'sapNum', v, null, 'inProgress')} />
                          <InputField isEditing={isEditing} label="開工日期" type="date" value={localProject.performance.inProgress.startDate} onChange={(v) => handleFieldChange('performance', 'startDate', v, null, 'inProgress')} />
                          <InputField isEditing={isEditing} label="交貨日期" type="date" value={localProject.performance.inProgress.deliveryDate} onChange={(v) => handleFieldChange('performance', 'deliveryDate', v, null, 'inProgress')} />
                       </div>
                       <div className="p-8 border border-slate-200 rounded-[32px]">
                          <div className="flex justify-between items-center mb-6">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">送審與審查紀錄</p>
                            {isEditing && (
                              <button onClick={addReviewRound} className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-all">
                                + 新增審查次數
                              </button>
                            )}
                          </div>
                          <div className="space-y-4">
                            {(localProject.performance.inProgress?.reviewRounds || []).map((round, index) => (
                              <div key={round.id} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end bg-slate-50 p-6 rounded-2xl border border-slate-100 relative pr-12 lg:pr-6">
                                {/* 新增：送審回合刪除選項 (第2次含以後) */}
                                {isEditing && index > 0 && (
                                  <button onClick={() => removeReviewRound(index)} className="absolute top-4 right-4 text-rose-400 hover:text-rose-600 bg-white hover:bg-rose-50 p-2 rounded-lg border border-slate-200 transition-all shadow-sm" title="刪除此送審">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                                <InputField className="w-full" isEditing={isEditing} label={`第 ${round.id} 次送審日期`} type="date" value={round.submitDate} onChange={(v) => handleReviewChange(index, 'submitDate', v)} />
                                <div className="flex flex-col space-y-2 justify-center pb-2 w-full">
                                   <label className="text-xs font-bold text-slate-500 ml-1 tracking-wide">審查結果</label>
                                   <div className="h-[46px] flex items-center">
                                     <ToggleSlider checked={round.isPassed} onChange={(v) => handleReviewChange(index, 'isPassed', v)} isEditing={isEditing} />
                                   </div>
                                </div>
                                <InputField className="w-full" isEditing={isEditing} label={round.isPassed ? "通過日期" : "回覆日期"} type="date" value={round.passDate} onChange={(v) => handleReviewChange(index, 'passDate', v)} />
                                <InputField className="w-full" isEditing={isEditing} label="審查備註" value={round.note} onChange={(v) => handleReviewChange(index, 'note', v)} placeholder="例如：需修改圖面..." />
                              </div>
                            ))}
                          </div>
                       </div>
                    </SoftCard>
                    <SoftCard>
                       <h3 className="text-lg font-black text-slate-800 mb-8 flex items-center gap-2"><DollarSign className="w-5 h-5 text-emerald-500" /> 階段二：驗收付款</h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                          <InputField isEditing={isEditing} label="完工日期" type="date" value={localProject.performance.postCompletion?.completionDate} onChange={(v) => handleFieldChange('performance', 'completionDate', v, null, 'postCompletion')} />
                          <InputField isEditing={isEditing} label="驗收單" value={localProject.performance.acceptancePayment.acceptanceNum} onChange={(v) => handleFieldChange('performance', 'acceptanceNum', v, null, 'acceptancePayment')} />
                          <InputField isEditing={isEditing} label="驗收合格日" type="date" value={localProject.performance.acceptancePayment.acceptanceDate} onChange={(v) => handleFieldChange('performance', 'acceptanceDate', v, null, 'acceptancePayment')} />
                          <InputField isEditing={isEditing} label="付款/請帳日期" type="date" value={localProject.performance.acceptancePayment.paymentDate} onChange={(v) => handleFieldChange('performance', 'paymentDate', v, null, 'acceptancePayment')} />
                       </div>
                       <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-8 pt-8 border-t border-slate-100">
                          <div className="lg:col-span-3">
                            <InputField isEditing={isEditing} label="結案備註" value={localProject.performance.acceptancePayment.note} onChange={(v) => handleFieldChange('performance', 'note', v, null, 'acceptancePayment')} placeholder="輸入結案相關注意事項..." />
                          </div>
                          <div className="lg:col-span-1 flex flex-col justify-end">
                             <CheckboxItem isEditing={isEditing} label="專案已付款結案" checked={localProject.performance.acceptancePayment.isPaid} onChange={() => handleFieldChange('performance', 'isPaid', !localProject.performance.acceptancePayment.isPaid, null, 'acceptancePayment')} />
                          </div>
                       </div>
                    </SoftCard>
                  </div>
                )}

              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        input[type="date"]::-webkit-calendar-picker-indicator {
          cursor: pointer;
          opacity: 0.6;
          transition: 0.2s;
        }
        input[type="date"]::-webkit-calendar-picker-indicator:hover {
          opacity: 1;
        }
      `}</style>
    </div>
  );
}