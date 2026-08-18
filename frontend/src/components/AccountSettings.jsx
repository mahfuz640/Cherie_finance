import { KeyRound, ShieldCheck } from 'lucide-react';

export default function AccountSettings({ user, role, onChangePassword }) {
  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const newPassword = values.get('newPassword');

    if (newPassword !== values.get('confirmPassword')) {
      onChangePassword(null, 'New passwords do not match.');
      return;
    }

    const saved = await onChangePassword({
      currentPassword: values.get('currentPassword'),
      newPassword,
    });
    if (saved) form.reset();
  }

  return (
    <section className="settings-layout">
      <article className="account-card">
        <div className="account-avatar">{user.name[0]}</div>
        <div><span className="eyebrow">YOUR PROFILE</span><h2>{user.name}</h2><p>{user.designation || role}</p></div>
        <div className="security-badge"><ShieldCheck /> Secured with password authentication</div>
      </article>

      <form className="password-card" onSubmit={submit}>
        <div className="settings-icon"><KeyRound /></div>
        <h2>Change your password</h2>
        <p>Use your current password to securely set a new one.</p>
        <label>Current password<input name="currentPassword" type="password" autoComplete="current-password" required /></label>
        <label>New password<input name="newPassword" type="password" minLength="8" autoComplete="new-password" required /><small>At least 8 characters</small></label>
        <label>Confirm new password<input name="confirmPassword" type="password" minLength="8" autoComplete="new-password" required /></label>
        <button className="primary">Update password</button>
      </form>
    </section>
  );
}
