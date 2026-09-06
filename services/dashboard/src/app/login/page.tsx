"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { t, locale, setLocale } = useI18n();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: username, password }),
      });

      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || t('login.title') + " falhou");
      }
    } catch (err) {
      setError("Erro. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left section: Hero / Landing */}
      <div className="hidden lg:flex lg:flex-1 lg:flex-col lg:justify-center lg:px-12 bg-gradient-to-br from-indigo-900 via-gray-900 to-black text-white relative overflow-hidden">
        <div className="absolute top-6 left-6 flex items-center gap-4 z-20">
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value as any)}
            className="bg-transparent border border-gray-600 text-white rounded px-2 py-1 text-sm focus:outline-none"
          >
            <option value="en-US" className="bg-gray-800 text-white">English (US)</option>
            <option value="pt-BR" className="bg-gray-800 text-white">Português (BR)</option>
          </select>
        </div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="relative z-10 max-w-2xl">
           <h1 className="text-5xl font-extrabold tracking-tight mb-6">{t('brand')}</h1>
           <p className="text-xl text-gray-300 mb-8 leading-relaxed">{t('landing.description')}</p>
           <ul className="space-y-4 text-gray-400">
              {(t('landing.features') as unknown as string[]).map((feature: string, idx: number) => (
                <li key={idx} className="flex items-center"><svg className="h-6 w-6 text-indigo-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg> {feature}</li>
              ))}
           </ul>
        </div>
      </div>

      {/* Right section: Login Form */}
      <div className="flex flex-1 items-center justify-center bg-gray-900 px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8 bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-700">
          <div>
            <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-white">
              {t('login.title')}
            </h2>
            <p className="mt-2 text-center text-sm text-gray-400">
              {t('login.subtitle')}
            </p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4 rounded-md shadow-sm">
              <div>
                <label htmlFor="username" className="sr-only">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  className="relative block w-full rounded-md border-0 bg-gray-700 py-3 px-3 text-white ring-1 ring-inset ring-gray-600 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
                  placeholder={t('login.username')}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className="relative">
                <label htmlFor="password" className="sr-only">
                  Admin Password
                </label>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  className="relative block w-full rounded-md border-0 bg-gray-700 py-3 px-3 pr-10 text-white ring-1 ring-inset ring-gray-600 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
                  placeholder={t('login.password')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Eye className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm">
                <Link
                  href="/login/reset-password"
                  className="font-medium text-indigo-400 hover:text-indigo-300"
                >
                  {t('login.resetPassword')}
                </Link>
              </div>
              <div className="text-sm">
                <Link
                  href="/login/create-password"
                  className="font-medium text-indigo-400 hover:text-indigo-300"
                >
                  {t('login.createPassword')}
                </Link>
              </div>
            </div>

            {error && (
              <div className="text-red-500 text-sm text-center">{error}</div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative flex w-full justify-center rounded-md bg-indigo-600 py-3 px-3 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 transition-colors"
              >
                {loading ? t('login.signingIn') : t('login.signIn')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
