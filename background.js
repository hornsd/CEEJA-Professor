chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "nextPage") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            let url = new URL(tabs[0].url);
            let paginaAtual = parseInt(url.searchParams.get("page")) || 1;
            let proximaPagina = paginaAtual + 1;

            // Modifica o URL para ir para a próxima página
            url.searchParams.set("page", proximaPagina);
            chrome.tabs.update(tabs[0].id, { url: url.toString() });
        });
    }
});
