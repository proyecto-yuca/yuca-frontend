import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { Button, Input, Alert } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import authService from '../../services/auth/authService';

export function RegisterPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validate = (): boolean => {
    const next: Partial<Record<keyof typeof form, string>> = {};
    if (!form.name.trim()) next.name = 'El nombre es requerido.';
    if (!form.email.trim()) next.email = 'El correo es requerido.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      next.email = 'Ingresa un correo válido.';
    if (!form.password) next.password = 'La contraseña es requerida.';
    else if (form.password.length < 6)
      next.password = 'Mínimo 6 caracteres.';
    if (!form.password_confirmation)
      next.password_confirmation = 'Confirma tu contraseña.';
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

    setIsLoading(true);
    try {
      const response = await authService.register(form);
      signIn(response.token, response.user);
      navigate('/dashboard');
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Error al registrarse.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout title="Crear cuenta" subtitle="Completa el formulario para empezar">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {serverError && <Alert variant="error">{serverError}</Alert>}

        <Input
          id="name"
          type="text"
          label="Nombre completo"
          placeholder="Juan García"
          value={form.name}
          onChange={handleChange('name')}
          error={errors.name}
          disabled={isLoading}
          autoComplete="name"
          leftIcon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }
        />

        <Input
          id="email"
          type="email"
          label="Correo electrónico"
          placeholder="tu@correo.com"
          value={form.email}
          onChange={handleChange('email')}
          error={errors.email}
          disabled={isLoading}
          autoComplete="email"
          leftIcon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
            </svg>
          }
        />

        <Input
          id="password"
          type="password"
          label="Contraseña"
          placeholder="Mínimo 6 caracteres"
          value={form.password}
          onChange={handleChange('password')}
          error={errors.password}
          disabled={isLoading}
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
          placeholder="Repite tu contraseña"
          value={form.password_confirmation}
          onChange={handleChange('password_confirmation')}
          error={errors.password_confirmation}
          disabled={isLoading}
          autoComplete="new-password"
          leftIcon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
        />

        <Button type="submit" fullWidth isLoading={isLoading} size="lg" className="mt-2">
          Crear cuenta
        </Button>

        <p className="text-center text-sm text-slate-500">
          ¿Ya tienes cuenta?{' '}
          <Link
            to="/login"
            className="font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
          >
            Inicia sesión
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
