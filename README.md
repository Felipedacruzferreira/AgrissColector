# Coletor de mapa (localStorage)

Web page simples para marcar no mapa os pontos já coletados. Os checks ficam salvos no `localStorage` do navegador.

## Como abrir

Na pasta do projeto:

```powershell
cd C:\Users\flpcr\Downloads\tl-map-collector
npx --yes serve .
```

Ou abra `index.html` direto no navegador (alguns browsers restringem `localStorage` em `file://`; preferir um server local).

## Uso

1. **Marcar** — clique no ponto do mapa (bolinha verde).
2. **Apagar** — clique de novo no ponto (ou use o modo Apagar).
3. Arraste para mover, scroll para zoom.
4. **Limpar tudo** remove os pontos salvos neste browser.

Dados: chave `tl-map-collector:v1` no localStorage.
