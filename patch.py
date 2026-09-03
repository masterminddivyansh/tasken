from pathlib import Path
import re
p=Path('/mnt/data/work415/src/App.jsx')
s=p.read_text()

# 1) Move recurring-task automation card out of Productivity Engine and into Tasks bottom.
pat=r'\n\s*<article className="tracker-large-card automation-center-card">.*?</article>(?=\n\s*<article className="tracker-large-card"><div className="panel-heading"><div><span className="card-kicker">CREATE WORK)'
m=re.search(pat,s,re.S)
assert m, 'recurring card not found'
recurring=m.group(0).strip('\n')
s=s[:m.start()]+s[m.end():]
# Insert just before closing tasks section, after task capture card.
task_marker='        <article className="tracker-large-card task-capture-card">'
task_start=s.index(task_marker)
# find its closing article by locating the exact following goals branch
insert_marker='\n      </section>}\n      {tab==="goals"}'
pos=s.index(insert_marker, task_start)
s=s[:pos]+'\n        '+recurring+s[pos:]

# 2) Move Goal Automation card to the bottom of active goals (after active goals list, before completed milestones).
pat_goal=r'\n\s*<section className="goal-automation-card tracker-large-card">.*?</section>(?=\n\s*<section className="goals-list-section">)'
gm=re.search(pat_goal,s,re.S)
assert gm, 'goal automation section not found'
goal_auto=gm.group(0).strip('\n')
s=s[:gm.start()]+s[gm.end():]
# insert after the active goals section, before completedGoals conditional
needle='\n\n        {completedGoals.length > 0 && ('
pos=s.index(needle, s.index('function GoalsPage'))
s=s[:pos]+'\n\n'+goal_auto+s[pos:]

# 3) Replace Focus section with a richer focus cockpit.
focus_pat=r'\n\s*\{tab==="focus"&&<section className="tracker-focus-layout">.*?</section>\}'
fm=re.search(focus_pat,s,re.S)
assert fm, 'focus section not found'
focus_new=r'''
      {tab==="focus"&&<section className="tracker-focus-page">
        <div className="focus-page-hero">
          <div>
            <span className="eyebrow"><span></span> FOCUS / DEEP WORK</span>
            <h2>Make time feel <em>intentional.</em></h2>
            <p>Choose a rhythm, protect the block, and let TRACKEN turn focused time into visible progress.</p>
          </div>
          <div className="focus-live-badge"><i></i><span>{focusRunning?"SESSION RUNNING":"READY FOR FOCUS"}</span></div>
        </div>

        <div className="focus-cockpit-grid">
          <article className="focus-command-card focus-command-card-premium">
            <div className="focus-command-top"><span>FOCUS TIMER</span><small>{focusRunning?"IN SESSION":"YOUR NEXT BLOCK"}</small></div>
            <div className="focus-timer-orbit" style={{"--focus-pct":`${Math.max(0,Math.min(100,Math.round((1-(focusSeconds/(Math.max(1,focusPreset*60))))*100)))}%`}}>
              <div className="focus-orbit-inner"><span>{focusRunning?"FOCUSING":"READY"}</span><strong>{formatFocus(focusSeconds)}</strong><small>{focusPreset} minute block</small></div>
            </div>
            <div className="focus-presets focus-presets-premium">{[15,25,50,90].map(p=><button className={focusPreset===p?"selected":""} key={p} onClick={()=>{setFocusPreset(p);setFocusSeconds(p*60);setFocusRunning(false)}}>{p}<small>min</small></button>)}</div>
            <div className="focus-actions focus-actions-premium"><button className="primary-small" onClick={()=>setFocusRunning(v=>!v)}>{focusRunning?<><span>Pause session</span></>:<><Timer size={15}/><span>Start focus</span></>}</button><button className="ghost-small" onClick={()=>{setFocusRunning(false);setFocusSeconds(focusPreset*60)}}>Reset</button></div>
          </article>

          <div className="focus-insight-stack">
            <article className="tracker-large-card focus-intent-card">
              <div className="panel-heading"><div><span className="card-kicker">FOCUS INTENT</span><h2>One block. One outcome.</h2></div><Target size={20}/></div>
              <div className="focus-intent-main"><div className="focus-intent-icon"><Zap size={18}/></div><div><strong>{tasks.find(t=>t.status!=="completed" && t.task_date===new Date().toISOString().slice(0,10))?.title || "Choose the one task that matters most."}</strong><small>{todayTasks.length?`${todayTasks.filter(t=>t.status!=="completed").length} open task${todayTasks.filter(t=>t.status!=="completed").length===1?"":"s"} today` : "Your queue is clear — use this block for deep work."}</small></div></div>
              <div className="focus-principles"><span><Check size={14}/> Silence notifications</span><span><Check size={14}/> Keep one outcome visible</span><span><Check size={14}/> Review after the block</span></div>
            </article>
            <article className="tracker-large-card focus-stats-card">
              <div className="panel-heading"><div><span className="card-kicker">TODAY / TIME CAPTURE</span><h2>Your time, accounted for.</h2></div><Clock3 size={20}/></div>
              <div className="focus-time-hero"><div><strong>{formatTime(trackedSeconds)}</strong><span>{timeRunning?"Time tracker is running":"Tracked today"}</span></div><button className={`tracker-big-action compact ${timeRunning?"running":""}`} onClick={()=>setTimeRunning(v=>!v)}>{timeRunning?"Stop tracking":trackedSeconds>0?"Resume tracking":"Start tracking"}</button></div>
              <div className="focus-stat-strip"><div><b>{Math.floor(trackedSeconds/3600)}h</b><span>captured</span></div><div><b>{Math.floor(trackedSeconds/60)%60}m</b><span>this session</span></div><div><b>{focusRunning?"Live":"Ready"}</b><span>timer state</span></div></div>
            </article>
          </div>
        </div>

        <div className="focus-bottom-grid">
          <article className="tracker-large-card focus-rhythm-card">
            <div className="panel-heading"><div><span className="card-kicker">FOCUS RHYTHMS</span><h2>Pick the kind of session you need.</h2></div><Timer size={20}/></div>
            <div className="focus-rhythm-grid">
              <button onClick={()=>{setFocusPreset(15);setFocusSeconds(15*60);setFocusRunning(false)}}><span>QUICK START</span><strong>15 min</strong><small>Clear one small blocker.</small></button>
              <button onClick={()=>{setFocusPreset(25);setFocusSeconds(25*60);setFocusRunning(false)}}><span>CLASSIC</span><strong>25 min</strong><small>Focused work with a clean finish line.</small></button>
              <button onClick={()=>{setFocusPreset(50);setFocusSeconds(50*60);setFocusRunning(false)}}><span>DEEP BLOCK</span><strong>50 min</strong><small>Best for study, coding or writing.</small></button>
              <button onClick={()=>{setFocusPreset(90);setFocusSeconds(90*60);setFocusRunning(false)}}><span>FLOW</span><strong>90 min</strong><small>Long-form work with room to think.</small></button>
            </div>
          </article>
          <article className="tracker-large-card focus-bottom-insight">
            <div className="panel-heading"><div><span className="card-kicker">THE FOCUS LOOP</span><h2>Start → protect → review.</h2></div><Sparkles size={20}/></div>
            <div className="focus-loop"><div><b>01</b><span>START</span><small>Pick one outcome.</small></div><i></i><div><b>02</b><span>PROTECT</span><small>Stay inside the block.</small></div><i></i><div><b>03</b><span>REVIEW</span><small>Carry the result forward.</small></div></div>
            <p className="tracker-copy">Focused time becomes more valuable when it leaves evidence behind. Your sessions can feed the wider TRACKEN picture instead of disappearing when the timer ends.</p>
          </article>
        </div>
      </section>}'''
s=s[:fm.start()]+focus_new+s[fm.end():]

p.write_text(s)
print('patched', len(s))
