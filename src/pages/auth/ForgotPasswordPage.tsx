import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { Button, Input, Alert } from '../../components/ui';
import authService from '../../services/auth/authService';

type Status = 'idle' | 'success';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<Status>('idle');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Por favor ingresa tu correo electrónico.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Ingresa un correo electrónico válido.');
      return;
    }

    setIsLoading(true);
    try {
      await authService.forgotPassword({ email });
      setStatus('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar el correo.');
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'success') {
    return (
      <AuthLayout
        title="Revisa tu correo"
        subtitle="Te hemos enviado las instrucciones"
      >
        <div className="space-y-6">
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm text-slate-600">
                Enviamos un enlace de recuperación a
              </p>
              <p className="text-sm font-semibold text-slate-900">{email}</p>
            </div>
          </div>

          <Alert variant="info">
            Si no encuentras el correo, revisa tu carpeta de spam.
          </Alert>

          <Link to="/login">
            <Button variant="secondary" fullWidth>
              Volver al inicio de sesión
            </Button>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="¿Olvidaste tu contraseña?"
      subtitle="Te enviaremos un enlace para restablecerla"
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {error && <Alert variant="error">{error}</Alert>}

        <Input
          id="email"
          type="email"
          label="Correo electrónico"
          placeholder="tu@correo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          autoComplete="email"
          leftIcon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
            </svg>
          }
        />

        <Button type="submit" fullWidth isLoading={isLoading} size="lg">
          Enviar enlace de recuperación
        </Button>

        <Link to="/login">
          <Button variant="ghost" fullWidth>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver al inicio de sesión
          </Button>
        </Link>
      </form>
    </AuthLayout>
  );
}
