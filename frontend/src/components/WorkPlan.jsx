import { CalendarClock, CheckCircle2, Circle, Clock3, Plus, Users } from 'lucide-react';

const PEOPLE = { admin: 'Admin', nadiya: 'Nadiya', mahfuz: 'Mahfuz' };
const STATUS_LABELS = { todo: 'To do', in_progress: 'In progress', completed: 'Completed' };
const STATUS_ICONS = { todo: Circle, in_progress: Clock3, completed: CheckCircle2 };

function assignmentOptions(role) {
  if (role === 'admin') return [['admin', 'Admin — Me'], ['nadiya', 'Nadiya — Director'], ['mahfuz', 'Mahfuz — CEO']];
  if (role === 'nadiya') return [['nadiya', 'Nadiya — Me'], ['mahfuz', 'Mahfuz — CEO']];
  if (role === 'mahfuz') return [['mahfuz', 'Mahfuz — Me'], ['nadiya', 'Nadiya — Director']];
  return [];
}

function formatSchedule(task) {
  if (!task.due_date) return null;
  const schedule = new Date(`${task.due_date}T${task.due_time || '00:00'}`);
  return schedule.toLocaleString('en-BD', { dateStyle: 'medium', timeStyle: task.due_time ? 'short' : undefined });
}

export default function WorkPlan({ tasks, role, onCreate, onUpdate }) {
  const options = assignmentOptions(role);
  const canAssign = options.length > 0;
  const counts = {
    todo: tasks.filter((task) => task.status === 'todo').length,
    in_progress: tasks.filter((task) => task.status === 'in_progress').length,
    completed: tasks.filter((task) => task.status === 'completed').length,
  };

  async function createTask(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const saved = await onCreate({
      title: values.get('title'),
      planningNote: values.get('planningNote'),
      assignedTo: values.get('assignedTo'),
      priority: values.get('priority'),
      dueDate: values.get('dueDate'),
      dueTime: values.get('dueTime'),
    });
    if (saved) form.reset();
  }

  return (
    <section className="work-plan">
      <div className="plan-summary">
        {Object.entries(counts).map(([status, count]) => (
          <article key={status}><span className={`task-dot ${status}`} /> <div><strong>{count}</strong><small>{STATUS_LABELS[status]}</small></div></article>
        ))}
      </div>

      <div className={canAssign ? 'plan-layout' : 'plan-layout single'}>
        {canAssign && (
          <form className="task-form" onSubmit={createTask}>
            <div><span className="eyebrow">NEW SHARED PLAN</span><h2>Plan a task</h2><p>Assign it to yourself or a teammate. Everyone can see the plan.</p></div>
            <label>Task title<input name="title" maxLength="120" placeholder="What needs to be done?" required /></label>
            <label>Planning notes<textarea name="planningNote" placeholder="Write the plan, instructions or expected result" /></label>
            <div className="form-row">
              <label>Assign to<select name="assignedTo">{options.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
              <label>Priority<select name="priority" defaultValue="medium"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
            </div>
            <div className="form-row">
              <label>Planning date<input name="dueDate" type="date" required /></label>
              <label>Planning time<input name="dueTime" type="time" required /></label>
            </div>
            <button className="primary"><Plus size={18} /> Share plan</button>
          </form>
        )}

        <div className="task-list">
          <div className="task-list-head"><div><h2>Team tasks</h2><p>{tasks.length} task{tasks.length === 1 ? '' : 's'} in the shared plan</p></div></div>
          {tasks.length ? tasks.map((task) => {
            const StatusIcon = STATUS_ICONS[task.status];
            const canUpdate = role === 'admin' || task.assigned_to === role;
            return (
              <article className={`task-card ${task.status}`} key={task.id}>
                <div className="task-card-top">
                  <span className={`priority ${task.priority}`}>{task.priority}</span>
                  <span className={`task-status ${task.status}`}><StatusIcon />{STATUS_LABELS[task.status]}</span>
                </div>
                <h3>{task.title}</h3>
                {task.description && <div className="planning-note"><small>PLANNING NOTES</small><p>{task.description}</p></div>}
                <div className="task-meta">
                  <span>From <b>{PEOPLE[task.assigned_by]}</b></span>
                  <span>To <b>{PEOPLE[task.assigned_to]}</b></span>
                  {task.due_date && <span><CalendarClock /> {formatSchedule(task)}</span>}
                  <span className="shared-label"><Users /> Shared with everyone</span>
                </div>
                {canUpdate && (
                  <label className="status-control">Update status
                    <select value={task.status} onChange={(event) => onUpdate(task.id, event.target.value)}>
                      <option value="todo">To do</option><option value="in_progress">In progress</option><option value="completed">Completed</option>
                    </select>
                  </label>
                )}
              </article>
            );
          }) : <div className="empty-plan"><CheckCircle2 /><h3>No tasks yet</h3><p>Your shared work plan will appear here.</p></div>}
        </div>
      </div>
    </section>
  );
}
