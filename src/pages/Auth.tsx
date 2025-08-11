import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useSEO } from "@/hooks/use-seo";

const Auth = () => {
  useSEO({ title: "Вход и регистрация | Бронирование отеля", description: "Войдите или зарегистрируйтесь для оформления бронирования.", canonicalPath: "/auth" });
  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get("redirect") || "/";

  const { toast } = useToast();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (user) {
      navigate(redirect);
    }
  }, [user, navigate, redirect]);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    const action = mode === "login" ? signIn : signUp;
    const { error } = await action(email, password);
    if (error) toast({ title: "Ошибка", description: error.message });
    else toast({ title: mode === "login" ? "Успешный вход" : "Регистрация", description: mode === "login" ? "Добро пожаловать!" : "Проверьте почту для подтверждения." });
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-background">
      <article className="w-full max-w-md space-y-4">
        <header className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold">{mode === "login" ? "Вход" : "Регистрация"}</h1>
          <p className="text-sm text-muted-foreground">Используйте email и пароль</p>
        </header>
        <form onSubmit={handle} className="space-y-3 p-4 border rounded-md bg-card">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Пароль</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full">{mode === "login" ? "Войти" : "Зарегистрироваться"}</Button>
        </form>
        <div className="text-center text-sm">
          {mode === "login" ? (
            <button className="text-primary underline-offset-4 hover:underline" onClick={() => setMode("signup")}>Нет аккаунта? Зарегистрируйтесь</button>
          ) : (
            <button className="text-primary underline-offset-4 hover:underline" onClick={() => setMode("login")}>Уже есть аккаунт? Войти</button>
          )}
        </div>
      </article>
    </main>
  );
};

export default Auth;
