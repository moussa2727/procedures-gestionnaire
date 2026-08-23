// components/(auth)/PasswordStrength.tsx
'use client';


interface PasswordStrengthProps {
  password: string;
  className?: string;
}

export function PasswordStrength({ password, className = '' }: PasswordStrengthProps) {
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return 0;
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^A-Za-z0-9]/.test(pwd)) strength++;
    return strength;
  };

  const strength = getPasswordStrength(password);
  const strengthLabels = ['Trop court', 'Faible', 'Moyen', 'Robuste', 'Excellent'];
  const strengthColors = ['bg-slate-200', 'bg-rose-500', 'bg-amber-500', 'bg-sky-500', 'bg-emerald-500'];
  const textColors = ['text-slate-400', 'text-rose-600', 'text-amber-600', 'text-sky-600', 'text-emerald-600'];

  if (!password) return null;

  return (
    <div className={`mt-1.5 space-y-1 ${className}`}>
      <div className="flex gap-1 h-1">
        {[1, 2, 3, 4].map((step) => (
          <div
            key={step}
            className={`flex-1 rounded-full transition-all duration-300 ${
              step <= strength ? strengthColors[strength] : 'bg-slate-200'
            }`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-slate-400">Sécurité :</span>
        <span className={`font-semibold ${textColors[strength]}`}>
          {strengthLabels[strength]}
        </span>
      </div>
    </div>
  );
}