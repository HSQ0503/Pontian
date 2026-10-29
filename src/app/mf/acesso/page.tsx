import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = { title: "Acesso" };

export default async function AccessPage({ searchParams }: PageProps<"/mf/acesso">) {
  const { next, erro } = await searchParams;
  return (
    <main className="flex min-h-dvh items-center justify-center bg-black px-4">
      <form action="/api/mf/acesso" method="post" className="mf-rise w-full max-w-sm rounded-none border border-mf-400 bg-mf-100 p-8">
        <Image src="/mf/mf-logo-black.png" alt="Minerbo-Fuchs" width={206} height={105} priority className="h-10 w-auto invert" />
        <h1 className="mf-brand mt-8 text-[18px] font-bold uppercase text-white">Brain MF</h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-mf-700">Informe o código de acesso / Enter the access code</p>
        <input type="hidden" name="next" value={typeof next === "string" ? next : "/mf"} />
        <input
          type="password"
          name="code"
          required
          autoFocus
          autoComplete="current-password"
          aria-label="Código de acesso"
          className="mt-6 h-11 w-full rounded-none border border-mf-400 bg-mf-50 px-3 text-[14px] text-white placeholder:text-mf-600 focus:border-mf-800 focus:outline-none focus:ring-2 focus:ring-white/10"
          placeholder="••••••••"
        />
        {erro && <p className="mt-3 text-[12.5px] text-mf-rec">Código incorreto / Wrong code</p>}
        <button type="submit" className="mt-5 h-11 w-full rounded-none bg-white text-[13.5px] font-semibold text-black transition-colors hover:bg-mf-900">
          Entrar / Enter
        </button>
      </form>
    </main>
  );
}
