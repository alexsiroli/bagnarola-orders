import { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accountType, setAccountType] = useState('cassa');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isLogin, setIsLogin] = useState(true);

  // Listen for auth state changes
  useState(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return unsubscribe;
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Validazione password per la registrazione
    if (!isLogin && password !== confirmPassword) {
      setError('Le password non coincidono');
      setLoading(false);
      return;
    }

    if (!isLogin && password.length < 6) {
      setError('La password deve essere di almeno 6 caratteri');
      setLoading(false);
      return;
    }
    
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        // Crea l'utente con Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUser = userCredential.user;
        
        // Salva i dati aggiuntivi dell'utente in Firestore
        await setDoc(doc(db, 'users', newUser.uid), {
          email: newUser.email,
          accountType: accountType,
          createdAt: new Date(),
          isActive: true,
          permissions: getPermissionsByType(accountType)
        });
      }
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        setError('Email già registrata. Usa il login.');
      } else if (error.code === 'auth/weak-password') {
        setError('Password troppo debole. Usa almeno 6 caratteri.');
      } else if (error.code === 'auth/user-not-found') {
        setError('Utente non trovato. Verifica email o registrati.');
      } else if (error.code === 'auth/wrong-password') {
        setError('Password errata.');
      } else {
        setError(`Errore: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const getPermissionsByType = (type) => {
    switch (type) {
      case 'admin':
        return {
          canManageUsers: true,
          canManageMenu: true,
          canManageOrders: true,
          canManageCassa: true,
          canViewReports: true,
          canManageSettings: true
        };
      case 'cassa':
        return {
          canManageUsers: false,
          canManageMenu: false,
          canManageOrders: true,
          canManageCassa: true,
          canViewReports: false,
          canManageSettings: false
        };
      case 'cucina':
        return {
          canManageUsers: false,
          canManageMenu: false,
          canManageOrders: true,
          canManageCassa: false,
          canViewReports: false,
          canManageSettings: false
        };
      default:
        return {
          canManageUsers: false,
          canManageMenu: false,
          canManageOrders: false,
          canManageCassa: false,
          canViewReports: false,
          canManageSettings: false
        };
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      setError('Errore di logout: ' + error.message);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setAccountType('cassa');
  };

  if (user) {
    return (
      <div className="auth-container">
        <div className="user-info">
          <p>Benvenuto, {user.email}</p>
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <form onSubmit={handleSubmit} className="auth-form">
        <h3>{isLogin ? 'Accesso Sistema' : 'Registrazione Nuovo Utente'}</h3>
        
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
            placeholder={isLogin ? "Inserisci la password" : "Crea una password (min. 6 caratteri)"}
          />
        </div>

        {!isLogin && (
          <>
            <div className="form-group">
              <label htmlFor="confirmPassword">Conferma Password:</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Conferma la password"
              />
            </div>

            <div className="form-group">
              <label htmlFor="accountType">Tipo di Account:</label>
              <select
                id="accountType"
                value={accountType}
                onChange={(e) => setAccountType(e.target.value)}
                className="account-type-select"
              >
                <option value="cassa">Cassa - Gestione pagamenti e ordini</option>
                <option value="cucina">Cucina - Preparazione ordini</option>
                <option value="admin">Admin - Accesso completo al sistema</option>
              </select>
            </div>
          </>
        )}
        
        <button type="submit" disabled={loading} className="submit-btn">
          {loading ? 'Caricamento...' : (isLogin ? 'Accedi' : 'Registrati')}
        </button>

        <div className="auth-toggle">
          <p>
            {isLogin ? "Non hai un account?" : "Hai già un account?"}
            <button type="button" onClick={toggleMode} className="toggle-btn">
              {isLogin ? 'Registrati' : 'Accedi'}
            </button>
          </p>
        </div>
      </form>
    </div>
  );
}

export default Auth;
