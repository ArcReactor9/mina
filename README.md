# AI Virtual Live2D Interactive Platform

This is an AI virtual streamer interactive platform based on Live2D technology. Users can engage in real-time dialogue interaction with virtual characters.

## Features

- Live2D model display and animation
- Real-time user dialogue interaction
- AI intelligent responses
- Expression and motion responses

## Project Structure

```
2dlive-memeai/
├── static/           # Static resource files
│   ├── live2d/      # Live2D model files
│   ├── js/          # JavaScript files
│   └── css/         # Style files
├── templates/        # HTML templates
├── main.py          # Backend main program
└── requirements.txt  # Python dependencies
```

## Installation and Running

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Run the server:
```bash
uvicorn main:app --reload
```

3. Visit http://localhost:8000 to use
