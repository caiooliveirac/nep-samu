"use client";

import { useCallback, useEffect } from "react";
import { usePathname } from "next/navigation";
import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";

/**
 * Tour de primeira visita ao painel. Roda sozinho uma vez por pessoa e depois
 * só quando alguém pede pelo botão de ajuda do header.
 */
const CHAVE = "nep:tour-painel:v1";

/** Evento que o botão de ajuda do header dispara para reabrir o tour. */
export const EVENTO_TOUR = "nep:abrir-tour";

const PASSOS: DriveStep[] = [
  {
    element: '[data-tour="menu"]',
    popover: {
      title: "Por onde você anda",
      description:
        "Cada item leva a uma área do NEP. O que aparece aqui depende do seu perfil — quem não organiza cursos não vê a gestão deles.",
      side: "right",
      align: "start",
    },
  },
  {
    element: '[data-tour="metricas"]',
    popover: {
      title: "O resumo do momento",
      description:
        "Cursos e turmas em aberto, inscrições e taxa de confirmação. Quando ainda não há inscrição, a taxa aparece como travessão em vez de 0% — é ausência de dado, não resultado ruim.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: '[data-tour="turmas-ativas"]',
    popover: {
      title: "Turmas ativas",
      description:
        "As turmas em andamento com a ocupação de cada uma. Passe o mouse sobre a barra para ver confirmados, inscritos e fila de espera separados.",
      side: "top",
      align: "start",
    },
  },
  {
    element: '[data-tour="notificacoes"]',
    popover: {
      title: "Notificações",
      description:
        "O contador laranja mostra o que ainda não foi lido — inscrições novas, confirmações e avisos de turma.",
      side: "bottom",
      align: "end",
    },
  },
  {
    element: '[data-tour="tema"]',
    popover: {
      title: "Claro ou escuro",
      description:
        "Troca o tema do sistema. A escolha fica salva neste navegador.",
      side: "bottom",
      align: "end",
    },
  },
];

export function TourPainel() {
  const pathname = usePathname();

  const rodar = useCallback(() => {
    // Passos sem âncora na tela (item de menu que o perfil não tem, painel que
    // ainda está carregando) sairiam como modal solto no meio da tela.
    const passos = PASSOS.filter(
      (p) => typeof p.element === "string" && document.querySelector(p.element),
    );
    if (passos.length === 0) return;

    driver({
      steps: passos,
      showProgress: true,
      progressText: "{{current}} de {{total}}",
      nextBtnText: "Próximo",
      prevBtnText: "Voltar",
      doneBtnText: "Entendi",
      popoverClass: "nep-tour",
      overlayOpacity: 0.6,
      stagePadding: 6,
      onDestroyed: () => localStorage.setItem(CHAVE, "1"),
    }).drive();
  }, []);

  useEffect(() => {
    const aoPedir = () => rodar();
    window.addEventListener(EVENTO_TOUR, aoPedir);

    // O botão de ajuda vive no header e funciona em qualquer página; já a
    // abertura automática é só no painel, que é onde os passos fazem sentido.
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (pathname.endsWith("/painel") && !localStorage.getItem(CHAVE)) {
      // Espera o painel trocar o skeleton pelos dados, senão o tour ancora em
      // caixas cinzas que somem debaixo dele.
      timer = setTimeout(rodar, 900);
    }

    return () => {
      window.removeEventListener(EVENTO_TOUR, aoPedir);
      if (timer) clearTimeout(timer);
    };
  }, [rodar, pathname]);

  return null;
}
