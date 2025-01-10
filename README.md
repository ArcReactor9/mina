# AI Virtual Live2D Interactive Platform (Mina AI)

<div align="center">

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.8+-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104.1-green.svg)
![Live2D](https://img.shields.io/badge/Live2D-Cubism_4-orange.svg)

An advanced AI virtual streamer platform that combines Live2D technology with cutting-edge AI models for real-time interactive experiences.

[Demo](https://github.com/ArcReactor9/mina) · [Documentation](https://github.com/ArcReactor9/mina/wiki) · [Report Bug](https://github.com/ArcReactor9/mina/issues) · [Request Feature](https://github.com/ArcReactor9/mina/issues)

</div>

## ✨ Features

- **Live2D Integration**
  - Real-time model display and animation
  - Emotion-based motion mapping
  - Smooth transitions between expressions
  - Custom motion trigger system

- **AI Conversation System**
  - Multiple AI model support (GPT-4.0, Google Gemini)
  - Context-aware responses
  - Character personality customization
  - Real-time dialogue processing

- **Voice Synthesis**
  - Edge TTS integration
  - Multiple voice options
  - Real-time text-to-speech conversion
  - Automatic voice file caching

- **Interactive UI**
  - Modern, responsive design
  - Real-time WebSocket communication
  - Built-in music player with visualizer
  - Custom animation effects

## 🚀 Quick Start

### Prerequisites

- Python 3.8 or higher
- Node.js 14.x or higher
- Live2D Cubism SDK
- API keys for OpenAI and Google AI

### Installation

1. Clone the repository:
```bash
git clone https://github.com/ArcReactor9/mina.git
cd mina
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your API keys and configuration
```

4. Run the development server:
```bash
uvicorn main:app --reload
```

5. Visit `http://localhost:8000` in your browser

## 🏗️ Project Structure

```
2dlive-memeai/
├── static/                 # Static resource files
│   ├── live2d/            # Live2D model files
│   │   └── aersasi_2/     # Default character model
│   ├── js/                # JavaScript files
│   ├── css/               # Style files
│   ├── audio/             # Generated voice files
│   └── images/            # Image assets
├── templates/             # HTML templates
│   ├── index.html         # Main interface
│   └── roadmap.html       # Project roadmap
├── main.py               # Backend main program
├── requirements.txt      # Python dependencies
└── .env                 # Environment configuration
```

## 🛠️ Technology Stack

- **Backend**
  - FastAPI (Web Framework)
  - WebSocket (Real-time Communication)
  - OpenAI GPT-4.0 (AI Model)
  - Google Gemini (AI Model)
  - Edge TTS (Voice Synthesis)

- **Frontend**
  - Live2D Cubism SDK
  - WebGL/PixiJS
  - HTML5 Canvas
  - WebSocket Client
  - Web Audio API

## ⚙️ Configuration

The platform can be configured through environment variables in the `.env` file:

```env
OPENAI_API_KEY=your_openai_key
GOOGLE_API_KEY=your_google_key
CURRENT_MODEL=gemini-pro  # or gpt-4.0
USE_PROXY=false
PROXY_URL=http://127.0.0.1:7890  # if proxy needed
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Live2D Cubism SDK](https://www.live2d.com/en/download/cubism-sdk/)
- [OpenAI API](https://openai.com/api/)
- [Google AI](https://ai.google.dev/)
- [Edge TTS](https://github.com/rany2/edge-tts)
- [FastAPI](https://fastapi.tiangolo.com/)

## 📧 Contact

Project Link: [https://github.com/ArcReactor9/mina](https://github.com/ArcReactor9/mina)

---
<div align="center">
Made with ❤️ by @ArcReactor9x

</div>
