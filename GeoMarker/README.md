# 📍 GeoMarker — App Expo com Google Maps

Aplicativo mobile para marcar e salvar coordenadas geográficas usando Google Maps.

---

## 🚀 Funcionalidades (Tela Inicial)

- ✅ **Mapa escuro** com estilo customizado (Google Maps)
- ✅ **Toque no mapa** para adicionar marcadores
- ✅ **Formulário** com nome, descrição e cor do pin
- ✅ **Lista de marcadores** salvos com painel deslizante
- ✅ **Localização atual** do usuário
- ✅ **Alternar tipo de mapa**: Mapa / Satélite / Híbrido
- ✅ **Persistência local** com AsyncStorage
- ✅ **Feedback háptico** nas interações
- ✅ **Excluir marcadores** individualmente

---

## 📦 Instalação

### 1. Pré-requisitos
```bash
node >= 18
npm ou yarn
expo-cli (opcional): npm install -g expo-cli
eas-cli: npm install -g eas-cli
```

### 2. Instalar dependências
```bash
cd GeoMarker
npm install
```

---

## 🔑 Configurar Chave da API do Google Maps (OBRIGATÓRIO)

### Passo a passo para obter a chave GRATUITA:

1. Acesse: https://console.cloud.google.com/
2. Crie um projeto (ou use um existente)
3. Vá em **APIs e Serviços > Biblioteca**
4. Ative as seguintes APIs:
   - **Maps SDK for Android**
   - **Maps SDK for iOS**
5. Vá em **APIs e Serviços > Credenciais**
6. Clique em **Criar credencial > Chave de API**
7. Copie a chave gerada

> ⚠️ O Google oferece **US$ 200 de crédito mensal gratuito**, o que equivale a ~28.000 carregamentos de mapa. Para uso pessoal/desenvolvimento é **totalmente gratuito**.

### Inserir a chave no projeto

Abra o arquivo `app.json` e substitua `SUA_CHAVE_API_GOOGLE_MAPS_AQUI` pela sua chave **em dois lugares**:

```json
"ios": {
  "config": {
    "googleMapsApiKey": "AIzaSy...SUA_CHAVE_AQUI"
  }
},
"android": {
  "config": {
    "googleMaps": {
      "apiKey": "AIzaSy...SUA_CHAVE_AQUI"
    }
  }
}
```

---

## 📱 Rodar em desenvolvimento

### Expo Go (mais rápido — sem Google Maps nativo)
```bash
npx expo start
```
> ⚠️ O `react-native-maps` com PROVIDER_GOOGLE **não funciona no Expo Go**. Use o build de desenvolvimento ou um APK.

### Build de desenvolvimento (recomendado)
```bash
eas build --platform android --profile development
```

---

## 🏗️ Gerar o APK

### 1. Login no Expo
```bash
eas login
```

### 2. Configurar o projeto
```bash
eas build:configure
```

### 3. Gerar APK (arquivo .apk para instalar direto)
```bash
npm run build:apk
# ou
eas build --platform android --profile preview
```

O APK será gerado na nuvem pela Expo (EAS Build). Você receberá um link para download.

### 4. Para produção (Google Play - .aab)
```bash
eas build --platform android --profile production
```

---

## 📁 Estrutura do Projeto

```
GeoMarker/
├── app/
│   ├── _layout.tsx       # Layout raiz (Expo Router)
│   └── index.tsx         # Tela do mapa (tela principal)
├── src/
│   ├── screens/          # Futuras telas
│   ├── components/       # Componentes reutilizáveis
│   ├── hooks/            # Custom hooks
│   └── utils/            # Utilitários
├── assets/               # Ícones e splash
├── app.json              # Config do Expo (API Keys aqui)
├── eas.json              # Config de build
├── babel.config.js
├── tsconfig.json
└── package.json
```

---

## 🎨 Como usar o app

| Ação | Resultado |
|------|-----------|
| Tocar no mapa | Abre formulário para novo marcador |
| Pressionar longo | Também abre o formulário |
| Tocar em um pin | Mostra card com info e opção de excluir |
| Botão 📍 (direita) | Vai para sua localização atual |
| Botão ☰ (direita) | Abre painel com lista de marcadores |
| Tocar item na lista | Navega até o marcador no mapa |

---

## 🔧 Próximas telas (planejadas)

- [ ] Tela de detalhes do marcador
- [ ] Tela de configurações
- [ ] Exportar coordenadas (CSV/JSON)
- [ ] Compartilhar localização
- [ ] Categorias de marcadores
- [ ] Busca por endereço (Geocoding API)

---

## 📝 Notas

- Os marcadores são salvos **localmente** no dispositivo com AsyncStorage
- Funciona **offline** (os marcadores salvos continuam visíveis)
- O mapa requer **conexão com internet** para carregar os tiles
