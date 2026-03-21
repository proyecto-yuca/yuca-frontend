import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { Button, Input, Alert } from '../../components/ui';
import authService from '../../services/auth/authService';

type Status = 'idle' | 'success';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('reset_password_token') ?? '';

  const [form, setForm] = useState({ password: '', password_confirmation: '' });
  const [errors, setErrors] = useState<Partial<typeof form>>({});
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<Status>('idle');

  const validate = (): boolean => {
    const next: Partial<typeof form> = {};
    if (!form.password) next.password = 'La contraseña es requerida.';
    else if (form.password.length < 6) next.password = 'Mínimo 6 caracteres.';
    if (!form.password_confirmation) next.password_confirmation = 'Confirma tu contraseña.';
    else if (form.password !== form.password_confirmation)
      next.password_confirmation = 'Las contraseñas no coinciden.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleChange =
    (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;

    if (!token) {
      setServerError('El enlace de recuperación no es válido o ha expirado.');
      return;
    }

    setIsLoading(true);
    try {
      await authService.resetPassword({
        reset_password_token: token,
        password: form.password,
        password_confirmation: form.password_confirmation,
      });
      setStatus('success');
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Error al restablecer la contraseña.');
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'success') {
    return (
      <AuthLayout
        title="Contraseña actualizada"
        subtitle="Tu contraseña ha sido restablecida correctamente"
      >
        <div className="space-y-6">
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm text-slate-600 text-center">
              Ya puedes iniciar sesión con tu nueva contraseña.
            </p>
          </div>

          <Link to="/login">
            <Button fullWidth size="lg">
              Ir al inicio de sesión
            </Button>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Nueva contraseña"
      subtitle="Elige una contraseña segura para tu cuenta"
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {serverError && <Alert variant="error">{serverError}</Alert>}

        {!token && (
          <Alert variant="warning">
            El enlace de recuperación no es válido o ha expirado. Solicita uno nuevo.
          </Alert>
        )}

        <Input
          id="password"
          type="password"
          label="Nueva contraseña"
          placeholder="Mínimo 6 caracteres"
          value={form.password}
          onChange={handleChange('password')}
          error={errors.password}
          disabled={isLoading || !token}
          autoComplete="new-password"
          leftIcon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          }
        />

        <Input
          id="password_confirmation"
          type="password"
          label="Confirmar contraseña"
          placeholder="Repite tu nueva contraseña"
          value={form.password_confirmation}
          onChange={handleChange('password_confirmation')}
          error={errors.password_confirmation}
          disabled={isLoading || !token}
          autoComplete="new-password"
          leftIcon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
        />

        <Button
          type="submit"
          fullWidth
          isLoading={isLoading}
          size="lg"
          className="mt-2"
          disabled={!token}
        >
          Restablecer contraseña
        </Button>

        <Link to="/forgot-password">
          <Button variant="ghost" fullWidth>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Solicitar nuevo enlace
          </Button>
        </Link>
      </form>
    </AuthLayout>
  );
}
