(function () {
  chrome.storage.local.get(
    ["processando", "alunosNaoIncluidos", "buscaAtivaData"],
    data => {
      // Se o processo não estiver ativo, não faz nada
      if (!data.processando) return;

      const paginaAtual = (parseInt(new URLSearchParams(window.location.search).get('page')) || 0) + 1;
      const alunosNaoIncluidosAnteriores = data.alunosNaoIncluidos || [];
      const buscaAtivaAnterior = data.buscaAtivaData || [];

      // --- FUNÇÕES AUXILIARES ---

      function compararEtapas(etapaA, etapaB) {
        const partsA = etapaA.split('.').map(Number);
        const partsB = etapaB.split('.').map(Number);
        if (partsA[0] !== partsB[0]) return partsA[0] - partsB[0];
        return partsA[1] - partsB[1];
      }
      
      function extrairEtapa(altText) {
          const match = altText.match(/,\s*(\d+\.\d+)\s*-/);
          return match ? match[1] : null;
      }

      // --- FUNÇÃO PRINCIPAL DE VERIFICAÇÃO ---
      function verificar() {
        
        const novosAlunosNaoIncluidos = [];
        const novosResultadosBuscaAtiva = [];

        document.querySelectorAll('table.generaltable tbody tr').forEach(tr => {
          const nomeElem = tr.querySelector('th[scope="row"] a');
          if (!nomeElem) return;
          const nome = nomeElem.textContent.trim();

          // --- LÓGICA 1: Original (Alunos Não Liberados) ---
          const temAlgumaConclusao = Array.from(tr.querySelectorAll('td.completion-progresscell'))
            .some(td => {
              const img = td.querySelector('a.changecompl img.icon');
              return img && img.alt.includes("Concluído");
            });

          if (!temAlgumaConclusao) {
            novosAlunosNaoIncluidos.push({ nome, pagina: paginaAtual });
          }

          // --- LÓGICA 2: Nova (Planilha Busca Ativa) ---
          const imagensConcluido = tr.querySelectorAll('img.icon[alt*="Concluído"]');
          
          // CORREÇÃO: A lógica agora só executa se houver imagens de conclusão,
          // ignorando os alunos "Não Liberados" para a Planilha de Busca Ativa.
          if (imagensConcluido.length > 0) {
            const etapasConcluidas = [];
            imagensConcluido.forEach(img => {
              const etapa = extrairEtapa(img.alt);
              if (etapa) etapasConcluidas.push(etapa);
            });

            if (etapasConcluidas.length === 0) {
              novosResultadosBuscaAtiva.push({ nome, ultimaEtapa: "Em Progresso (Etapa não lida)" });
            } else if (etapasConcluidas.length === 1 && etapasConcluidas[0].endsWith('.0')) {
              novosResultadosBuscaAtiva.push({ nome, ultimaEtapa: `Não Iniciado (${etapasConcluidas[0]})` });
            } else {
              etapasConcluidas.sort(compararEtapas);
              const ultimaEtapa = etapasConcluidas[etapasConcluidas.length - 1];
              novosResultadosBuscaAtiva.push({ nome, ultimaEtapa });
            }
          }
        });

        // Junta os resultados desta página com os das páginas anteriores
        const todosNaoIncluidos = [...alunosNaoIncluidosAnteriores, ...novosAlunosNaoIncluidos];
        const todosBuscaAtiva = [...buscaAtivaAnterior, ...novosResultadosBuscaAtiva];

        chrome.storage.local.set({ 
          alunosNaoIncluidos: todosNaoIncluidos,
          buscaAtivaData: todosBuscaAtiva
        }, () => {
          // Navega para a próxima página ou finaliza
          const nextEl = document.querySelector('ul.pagination li.page-item.active + li.page-item a');
          if (nextEl) {
            window.location.href = nextEl.href;
          } else {
            const url = new URL(window.location.href);
            url.searchParams.set('page', '0');
            chrome.storage.local.set({ processando: false }, () => {
                window.location.href = url.toString();
            });
          }
        });
      }

      // Espera a página carregar completamente antes de rodar
      if (document.readyState === "complete") {
        verificar();
      } else {
        window.addEventListener("load", verificar, { once: true });
      }
    }
  );
})();
