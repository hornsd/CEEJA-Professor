document.addEventListener('DOMContentLoaded', () => {
  const iniciarBtn = document.getElementById("iniciarBtn");
  const pausarBtn = document.getElementById("pausarBtn");
  const apagarBtn = document.getElementById("apagarResultadosBtn");
  const selectDisc = document.getElementById("disciplinaSelect");
  const resultadosContainer = document.getElementById("resultados");
  const baixaPlanilhaBtn = document.getElementById("baixaPlanilhaBtn");

  function atualizarEstadoBotoes() {
    chrome.storage.local.get(
      ["processando", "alunosNaoIncluidos", "disciplina", "buscaAtivaData"],
      data => {
        if (data.disciplina) selectDisc.value = data.disciplina;
        renderizarResultados(data.alunosNaoIncluidos || []);
        const temDadosBuscaAtiva = data.buscaAtivaData && data.buscaAtivaData.length > 0;
        baixaPlanilhaBtn.disabled = !temDadosBuscaAtiva;

        // Habilita o botão "Iniciar" sempre que não existir mais aba de relatório aberta
        if (data.processando) {
          chrome.tabs.query(
            { url: 'https://aprender.sed.ms.gov.br/report/progress/index.php*' },
            tabs => {
              iniciarBtn.disabled = tabs.length > 0; // desabilita apenas se a aba ainda existe
            }
          );
        } else {
          iniciarBtn.disabled = false;
        }
      }
    );
  }

  atualizarEstadoBotoes();

  selectDisc.addEventListener('change', () => {
    chrome.storage.local.set({ disciplina: selectDisc.value });
  });

  iniciarBtn.addEventListener("click", () => {
    const curso = selectDisc.value;
    if (curso === "none") {
      alert("Selecione uma disciplina válida.");
      return;
    }
    const urlBase = "https://aprender.sed.ms.gov.br/report/progress/index.php";
    const params = new URLSearchParams({
      course: curso, sort: "firstname", sifirst: "", silast: "",
      activityinclude: "all", activityorder: "orderincourse", page: "0"
    });
    const targetURL = `${urlBase}?${params.toString()}`;
    chrome.storage.local.set(
      { processando: true, alunosNaoIncluidos: [], buscaAtivaData: [], disciplina: curso },
      () => {
        atualizarEstadoBotoes();
        chrome.tabs.create({ url: targetURL, active: true });
      }
    );
  });

  pausarBtn.addEventListener("click", () => {
    chrome.storage.local.set({ processando: false }, atualizarEstadoBotoes);
  });

  apagarBtn.addEventListener("click", () => {
    chrome.storage.local.remove(["alunosNaoIncluidos", "buscaAtivaData"], atualizarEstadoBotoes);
  });

  // Download da planilha XLSX
  baixaPlanilhaBtn.addEventListener("click", () => {
    chrome.storage.local.get(["buscaAtivaData", "disciplina"], data => {
      if (!data.buscaAtivaData || data.buscaAtivaData.length === 0) return;

      // Cabeçalhos legíveis
      const dadosFormatados = data.buscaAtivaData.map(aluno => ({
        "Nome do Aluno": aluno.nome,
        "Última Etapa Concluída": aluno.ultimaEtapa
      }));

      const worksheet = XLSX.utils.json_to_sheet(dadosFormatados);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Busca Ativa");
      worksheet["!cols"] = [{ wch: 50 }, { wch: 25 }];

      const nomeArquivo = `Busca_Ativa_${selectDisc.options[selectDisc.selectedIndex].text.trim().replace(/\s/g, '_')}.xlsx`;
      XLSX.writeFile(workbook, nomeArquivo);
    });
  });

  function renderizarResultados(alunos) {
    resultadosContainer.innerHTML = "";
    if (!alunos || alunos.length === 0) {
      resultadosContainer.innerHTML = "<p>Nenhum aluno não liberado encontrado.</p>";
      return;
    }
    alunos.forEach(({ nome, pagina }) => {
      const div = document.createElement("div");
      div.className = "aluno";
      div.textContent = `Página ${pagina}: ${nome}`;
      resultadosContainer.appendChild(div);
    });
  }

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
      atualizarEstadoBotoes();
    }
  });
});
