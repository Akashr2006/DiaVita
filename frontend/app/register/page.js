import AuthForm from '@/components/AuthForm';

export const metadata = { title: 'Create account – DiaVita' };

export default function RegisterPage() {
  return <AuthForm mode="register" />;
}
