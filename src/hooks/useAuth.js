/**
 * src/hooks/useAuth.js
 *
 * React hook koji upravlja životnim ciklusom autentifikacije:
 *   - Anonimna prijava pri prvom pokretanju
 *   - Praćenje UID-a i stanja prijave
 *   - Sinkronizacija UID-a u gameStore
 *
 * Vraća:
 *   { uid, ucitava, greška }
 */

import { useState, useEffect } from 'react';
import { prijaviAnonimno, slušajAuth } from '../firebase/auth';
import { useGameStore } from '../store/gameStore';

const useAuth = () => {
  const [uid,      setUid]      = useState(null);
  const [ucitava,  setUcitava]  = useState(true);
  const [greška,   setGreška]   = useState(null);

  const postaviUid = useGameStore((s) => s.postaviUid);

  useEffect(() => {
    // Pretplati se na promjene stanja autentifikacije
    const unsubscribe = slušajAuth(async (user) => {
      if (user) {
        setUid(user.uid);
        postaviUid(user.uid);
        setUcitava(false);
      } else {
        // Nema korisnika — anonimna prijava
        try {
          const noviUser = await prijaviAnonimno();
          setUid(noviUser.uid);
          postaviUid(noviUser.uid);
        } catch (err) {
          console.warn('[useAuth] Prijava nije uspjela:', err.message);
          setGreška(err.message);
        } finally {
          setUcitava(false);
        }
      }
    });

    return unsubscribe;
  }, [postaviUid]);

  return { uid, ucitava, greška };
};

export default useAuth;
