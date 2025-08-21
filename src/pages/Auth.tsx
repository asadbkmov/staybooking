import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useSEO } from "@/hooks/use-seo";

const Auth = () => {
  useSEO({ title: "Админ панель | Вход в систему", description: "Административная панель для управления отелями.", canonicalPath: "/auth" });
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get("redirect") || "/admin";

  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      navigate(redirect);
    }
  }, [user, navigate, redirect]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { error } = await signIn(email, password);
      if (error) {
        toast({ 
          title: "Ошибка входа", 
          description: "Неверный email или пароль", 
          variant: "destructive" 
        });
      } else {
        toast({ 
          title: "Успешный вход", 
          description: "Добро пожаловать в админ панель!" 
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-background to-muted">
      <article className="w-full max-w-md space-y-6">
        <header className="space-y-2 text-center">
          <div className="w-16 h-16 mx-auto bg-primary rounded-xl flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0v-3.5a2 2 0 011.5-1.95l4-1.25a2 2 0 011 0l4 1.25A2 2 0 0118 17.5V21" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold">Админ панель</h1>
          <p className="text-muted-foreground">Вход в систему управления отелями</p>
        </header>
        
        <div className="bg-card border rounded-xl p-6 shadow-lg">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email администратора</Label>
              <Input 
                id="email" 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="admin@example.com"
                required 
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input 
                id="password" 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="Введите пароль"
                required 
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Вход..." : "Войти в админ панель"}
            </Button>
          </form>
          
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground text-center">
              Доступ только для администраторов. <br />
              Обратитесь к системному администратору для получения учетных данных.
            </p>
          </div>
        </div>
      </article>
    </main>
  );
};

export default Auth;
