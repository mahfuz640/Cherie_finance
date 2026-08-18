import { BriefcaseBusiness, Crown, Save, ShieldCheck, UserRoundCog, UsersRound } from 'lucide-react';
import { useState } from 'react';

const DESIGNATIONS = [
  'Chief Executive Officer', 'Director', 'Finance Manager', 'Operations Manager',
  'Sales Manager', 'Inventory Manager', 'Product Manager', 'Marketing Manager',
];

export default function TeamManagement({ team, role, onAssign }) {
  const editableMembers = team.filter((member) => ['nadiya', 'mahfuz'].includes(member.role));
  const firstMember = editableMembers[0];
  const [selectedId, setSelectedId] = useState(firstMember?.id || '');
  const [designation, setDesignation] = useState(firstMember?.designation || 'Director');
  const [responsibilities, setResponsibilities] = useState(firstMember?.responsibilities || '');

  function chooseMember(id) {
    const member = team.find((item) => item.id === Number(id));
    setSelectedId(id);
    setDesignation(member?.designation || 'Director');
    setResponsibilities(member?.responsibilities || '');
  }

  async function submit(event) {
    event.preventDefault();
    await onAssign(selectedId, { designation, responsibilities });
  }

  return (
    <section className="team-section">
      <div className="team-grid">
        {team.map((member) => (
          <article className="member-card" key={member.id}>
            <div className={`member-avatar ${member.role}`}>{member.role === 'admin' ? <ShieldCheck /> : member.role === 'mahfuz' ? <Crown /> : <BriefcaseBusiness />}</div>
            <div className="member-heading"><div><small>{member.role === 'admin' ? 'SYSTEM ADMIN' : 'TEAM MEMBER'}</small><h2>{member.name}</h2></div><span>{member.designation}</span></div>
            <div className="responsibility-box">
              <b>Responsibilities</b>
              <p>{member.responsibilities || (member.role === 'admin' ? 'System access, team oversight and administrative control.' : 'No detailed responsibilities assigned yet.')}</p>
            </div>
          </article>
        ))}
      </div>

      {role === 'admin' ? (
        <form className="assignment-panel" onSubmit={submit}>
          <div className="assignment-title"><span><UserRoundCog /></span><div><h2>Assign responsibility</h2><p>Select a person, designation and their areas of responsibility.</p></div></div>
          <div className="assignment-fields">
            <label>Team member<select value={selectedId} onChange={(event) => chooseMember(event.target.value)}>{editableMembers.map((member) => <option value={member.id} key={member.id}>{member.name}</option>)}</select></label>
            <label>Designation<select value={designation} onChange={(event) => setDesignation(event.target.value)}>{DESIGNATIONS.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>
            <label className="responsibility-field">Detailed responsibilities<textarea value={responsibilities} onChange={(event) => setResponsibilities(event.target.value)} maxLength="800" placeholder="Example: Manage sales, approve supplier orders, review monthly targets…" /><small>{responsibilities.length}/800 characters</small></label>
          </div>
          <button className="primary"><Save /> Save assignment</button>
        </form>
      ) : (
        <div className="team-view-note"><UsersRound /> Admin controls designation and responsibility assignments. Changes are shared with the whole team.</div>
      )}
    </section>
  );
}
