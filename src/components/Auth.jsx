import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        setError('Utente non trovato. Verifica email e password.');
      } else if (error.code === 'auth/wrong-password') {
        setError('Password errata.');
      } else if (error.code === 'auth/invalid-email') {
        setError('Email non valida.');
      } else {
        setError(`Errore di accesso: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <form onSubmit={handleSubmit} className="auth-form">
        <h3>Accesso Sistema</h3>
        
        {error && <div className="error-message">{error}</div>}
        
        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Inserisci la tua email"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Inserisci la password"
          />
        </div>
        
        <button type="submit" disabled={loading} className="submit-btn">
          {loading ? 'Caricamento...' : 'Accedi'}
        </button>
      </form>
    </div>
  );
}

export default Auth;
