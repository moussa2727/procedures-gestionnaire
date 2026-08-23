// app/(auth)/callback/page.tsx (ajouter la gestion du token existant)
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle } from 'lucide-react';
import { useAuthStore } from '@/src/stores/auth-store';
import { userService } from '@/src/services/user.service';
import { UserRole } from '@/src/types/enums';

const ROLE_DESTINATIONS: Record<UserRole, string> = {
  [UserRole.ADMIN]: '/admin/statistiques',
  [UserRole.CONSULTANT]: '/consultant/mon-profil',
  [UserRole.ETUDIANT]: '/etudiant/mon-profil',
};

export default function AuthCallbackPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  useEffect(() => {
    // Vérifier si l'utilisateur a déjà un token
    const hasToken = document.cookie.includes('access_token');
    
    if (hasToken) {
      // Si token existant, récupérer le profil
      userService
        .getMyProfile()
        .then((profile) => {
          setUser({
            id: profile.id,
            email: profile.email,
            role: profile.role,
            firstName: profile.firstName,
            lastName: profile.lastName
          });
          router.replace(ROLE_DESTINATIONS[profile.role] || '/');
        })
        .catch(() => {
          router.replace('/login');
        });
      return;
    }

    // Pas de token → rediriger vers login
    router.replace('/login');
  }, [router, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50/80 p-4">
      <div className="text-center p-8 bg-white/90 backdrop-blur-sm border border-slate-200/80 rounded-3xl shadow-xl shadow-slate-200/50 max-w-sm w-full">
        <div className="relative mx-auto h-12 w-12 flex items-center justify-center">
          <LoaderCircle className="h-10 w-10 animate-spin text-sky-600" />
        </div>
        <h2 className="mt-4 text-base font-bold text-slate-900">Authentification en cours</h2>
        <p className="mt-1 text-xs text-slate-500">Vérification de votre session...</p>
      </div>
    </div>
  );
}