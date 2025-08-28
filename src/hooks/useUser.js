import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

export const useUser = () => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        try {
          // Recupera i dati aggiuntivi dell'utente da Firestore
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setUserData(userDoc.data());
          }
        } catch (err) {
          setError('Errore nel caricamento dati utente: ' + err.message);
        }
      } else {
        setUserData(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const hasPermission = (permission) => {
    if (!userData || !userData.permissions) return false;
    return userData.permissions[permission] || false;
  };

  const isAdmin = () => userData?.accountType === 'admin';
  const isCassa = () => userData?.accountType === 'cassa';
  const isCucina = () => userData?.accountType === 'cucina';

  return {
    user,
    userData,
    loading,
    error,
    hasPermission,
    isAdmin,
    isCassa,
    isCucina
  };
};
