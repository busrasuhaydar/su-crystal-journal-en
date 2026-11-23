import { useState, type FormEvent } from 'react';
import { Field } from '../components/ui';
import { Bow, Defs } from '../crystal/Decor';
import { errText, supabase } from '../lib/supabase';

export default function Login() {
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault(); setErr(''); setMsg(''); setBusy(true);
    try {
      if (mode === 'in') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { display_name: name.trim() || undefined }, emailRedirectTo: window.location.origin + import.meta.env.BASE_URL } });
        if (error) throw error;
        if (!data.session) setMsg('Your account was created. Click the verification link sent to your email, then sign in.');
      }
    } catch (x) { setErr(errText(x)); } finally { setBusy(false); }
  }

  return (
    <div className="auth">
      <div className="cr-login" data-glass="cover">
      <Defs />
      <Bow className="cr-login-bow" />
      <form className="glass box" data-glass="page" onSubmit={submit}>
        <span className="script">Su's Magical Journal</span>
        <p className="muted" style={{ textAlign: 'center', margin: '0 0 6px' }}>{mode === 'in' ? 'Sign in to your journal' : 'Create a new account'}</p>
        {mode === 'up' && <Field label="Your name"><input id="l-name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" placeholder="Su" /></Field>}
        <Field label="Email"><input id="l-email" className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></Field>
        <Field label="Password"><input id="l-pass" className="input" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} /></Field>
        {err && <div className="error">{err}</div>}
        {msg && <div className="card small">{msg}</div>}
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Please wait…' : mode === 'in' ? 'Sign in' : 'Create account'}</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setErr(''); setMsg(''); }}>
          {mode === 'in' ? 'Don’t have an account? Create one' : 'Already have an account? Sign in'}
        </button>
      </form>
      </div>
    </div>
  );
}
