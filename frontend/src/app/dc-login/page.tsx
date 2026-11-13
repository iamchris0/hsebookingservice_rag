"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

/**
 * Вход из реестра DC (admin.tadc-hse.ru): реестр открывает /dc-login?t=<одноразовая ссылка>,
 * страница меняет ссылку на обычный вход TA-DC и открывает кабинет преподавателя.
 */
export default function DcLogin() {
  const router = useRouter();
  const [error, setError] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // ссылка одноразовая: не отправлять её дважды
    started.current = true;
    const t = new URLSearchParams(window.location.search).get("t") ?? "";
    // ссылка не должна оставаться в истории браузера
    window.history.replaceState(null, "", "/dc-login");
    fetch(`${BACKEND_URL}/api/dc/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ t }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.token) throw new Error(data?.error || "Не удалось войти");
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        router.replace("/teacher");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Не удалось войти"));
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-sm text-center space-y-4">
        {error ? (
          <>
            <p className="text-lg font-semibold">{error}</p>
            <a href="/" className="inline-block rounded-lg bg-black px-4 py-2 text-white">Войти в TA-DC</a>
          </>
        ) : (
          <p className="text-lg">Входим в TA-DC…</p>
        )}
      </div>
    </main>
  );
}
