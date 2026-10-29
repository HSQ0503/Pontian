"use client";

import { ArrowRight, ChevronDown, Download, FileText, Mic, MonitorSpeaker, PenLine, Sparkles, Upload } from "lucide-react";
import Link from "next/link";
import { useTr } from "@/lib/mf/copy";
import { Page } from "./ui";

export function Help() {
  const tr = useTr();
  const steps = [
    {
      icon: Mic,
      title: tr("1. Traga a reunião", "1. Bring in the meeting"),
      text: tr(
        "Clique em Nova ata. Escolha o projeto e diga como a reunião chega: gravar agora pelo computador, enviar um arquivo de áudio ou vídeo, ou colar a transcrição do Teams.",
        "Click New minutes. Pick the project and choose how the meeting comes in: record now from this computer, upload an audio or video file, or paste the Teams transcript.",
      ),
    },
    {
      icon: Sparkles,
      title: tr("2. A IA escreve a ata", "2. The AI writes the minutes"),
      text: tr(
        "Em cerca de um minuto a ata aparece no modelo da MF: assuntos numerados por disciplina, em português e inglês, com responsável, prazo e risco.",
        "In about a minute the minutes appear in MF's format: subjects numbered by discipline, in Portuguese and English, with owner, deadline and risk.",
      ),
    },
    {
      icon: PenLine,
      title: tr("3. Revise", "3. Review"),
      text: tr(
        "Clique em qualquer item para corrigir o texto, o responsável ou o prazo. Na aba Falantes, confirme quem é quem.",
        "Click any item to correct the text, owner or deadline. In the Speakers tab, confirm who is who.",
      ),
    },
    {
      icon: Download,
      title: tr("4. Aprove e baixe", "4. Approve and download"),
      text: tr(
        "Clique em Aprovar ata. Os itens entram no Registro Geral do projeto e você baixa o PDF ou a planilha para o RG.",
        "Click Approve minutes. The items enter the project's General Register and you download the PDF or the spreadsheet for the RG.",
      ),
    },
  ];
  const faq = [
    {
      q: tr("Como gravo uma reunião do Teams?", "How do I record a Teams meeting?"),
      a: tr(
        "Em Nova ata, escolha Gravar agora e ligue “Incluir áudio do computador”. Quando o navegador pedir, escolha a janela ou aba do Teams e marque “Compartilhar áudio”. Assim a gravação pega você e quem está do outro lado.",
        "In New minutes, choose Record now and turn on “Include computer audio”. When the browser asks, pick the Teams window or tab and tick “Share audio”. That captures both you and the people on the call.",
      ),
      icon: MonitorSpeaker,
    },
    {
      q: tr("Posso usar uma gravação que já tenho?", "Can I use a recording I already have?"),
      a: tr(
        "Sim. Escolha Enviar gravação e selecione o arquivo (MP3, M4A, WAV, MP4, MOV e outros). Reuniões longas são divididas automaticamente.",
        "Yes. Choose Upload a recording and select the file (MP3, M4A, WAV, MP4, MOV and more). Long meetings are split automatically.",
      ),
      icon: Upload,
    },
    {
      q: tr("E se a IA errar algo?", "What if the AI gets something wrong?"),
      a: tr(
        "Nada vale até você aprovar. Clique no item para corrigir, use “Adicionar item” para incluir algo que faltou, ou remova o que não deveria estar na ata.",
        "Nothing counts until you approve. Click the item to correct it, use “Add item” for anything missing, or remove what shouldn't be in the minutes.",
      ),
      icon: PenLine,
    },
    {
      q: tr("O que é o Registro Geral?", "What is the General Register?"),
      a: tr(
        "É a lista de todos os assuntos do projeto, como no RG da MF. Cada item mantém seu número para sempre e mostra em quais atas foi tratado (AR#001, AR#002…).",
        "It is the list of every subject in the project, like MF's RG. Each item keeps its number forever and shows which minutes discussed it (AR#001, AR#002…).",
      ),
      icon: FileText,
    },
    {
      q: tr("Onde ficam os dados?", "Where is the data kept?"),
      a: tr(
        "Neste navegador, neste computador. O áudio é enviado apenas para a transcrição e não fica guardado nos servidores. Use sempre o mesmo computador e navegador para ver suas atas.",
        "In this browser, on this computer. Audio is only sent for transcription and is not stored on the servers. Use the same computer and browser to see your minutes.",
      ),
      icon: FileText,
    },
  ];

  return (
    <Page>
      <div className="mx-auto max-w-[880px]">
        <div className="mf-eyebrow text-mf-600">{tr("Ajuda", "Help")}</div>
        <h1 className="mt-3 text-[30px] font-semibold tracking-[-0.01em] text-white md:text-[36px]">{tr("Como usar o Brain MF", "How to use Brain MF")}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-mf-700">
          {tr("Do fim da reunião à ata aprovada em quatro passos.", "From the end of the meeting to approved minutes in four steps.")}
        </p>

        <ol className="mt-8 grid gap-3 sm:grid-cols-2">
          {steps.map((step) => (
            <li key={step.title} className="rounded-2xl border border-mf-300 bg-mf-100 p-6">
              <span className="flex size-11 items-center justify-center rounded-full bg-white text-black">
                <step.icon className="size-5" />
              </span>
              <h2 className="mt-5 text-[17px] font-semibold text-white">{step.title}</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-mf-700">{step.text}</p>
            </li>
          ))}
        </ol>

        <Link
          href="/mf/atas/nova"
          className="mt-4 flex items-center justify-between rounded-2xl bg-white px-6 py-5 text-black transition-colors hover:bg-mf-900"
        >
          <span className="text-[16px] font-semibold">{tr("Criar minha primeira ata", "Create my first minutes")}</span>
          <ArrowRight className="size-5" />
        </Link>

        <h2 className="mt-12 text-[13px] font-semibold uppercase tracking-[0.14em] text-white">{tr("Perguntas frequentes", "Frequently asked questions")}</h2>
        <div className="mt-4 divide-y divide-mf-300 overflow-hidden rounded-2xl border border-mf-300 bg-mf-100">
          {faq.map((item) => (
            <details key={item.q} className="group">
              <summary className="flex list-none items-center gap-4 px-6 py-5 [&::-webkit-details-marker]:hidden">
                <item.icon className="size-4 shrink-0 text-mf-700" />
                <span className="flex-1 text-[15px] font-medium text-white">{item.q}</span>
                <ChevronDown className="size-4 text-mf-600 transition-transform group-open:rotate-180" />
              </summary>
              <p className="px-6 pb-5 pl-14 text-[14px] leading-relaxed text-mf-700">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </Page>
  );
}
