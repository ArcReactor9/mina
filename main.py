import os
import json
import asyncio
import openai
import google.generativeai as genai
import sys
import time
from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, Request, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict
import random
from starlette.staticfiles import StaticFiles as StarletteStaticFiles
from starlette.responses import FileResponse
from pathlib import Path
import asyncio
from edge_tts import Communicate
import aiofiles
import os
from pathlib import Path
import uuid

# Load environment variables
load_dotenv()

# Set up proxy
use_proxy = os.getenv('USE_PROXY', 'false').lower() == 'true'
if use_proxy:
    proxy_url = os.getenv('PROXY_URL', 'http://127.0.0.1:7890')
    os.environ['HTTPS_PROXY'] = proxy_url
    os.environ['HTTP_PROXY'] = proxy_url
    print(f"Proxy enabled: {proxy_url}")
else:
    # Clear proxy settings
    os.environ.pop('HTTPS_PROXY', None)
    os.environ.pop('HTTP_PROXY', None)
    print("No proxy used")

# Print environment variables and configuration information
print("=== Environment Configuration ===")
print(f"Current model: {os.getenv('CURRENT_MODEL')}")
print(f"Google API Key: {os.getenv('GOOGLE_API_KEY')[:10]}...")
print(f"Python version: {sys.version}")
print(f"google.generativeai version: {genai.__version__}")
print("==================")

# Configure API keys and model parameters
openai.api_key = os.getenv("OPENAI_API_KEY")
genai.configure(
    api_key=os.getenv("GOOGLE_API_KEY"),
    transport="rest"  # Use REST instead of GRPC
)

# Initialize Gemini model
model = genai.GenerativeModel('gemini-pro')

# Initialize chat session (moved to function, create new session for each conversation)
def create_chat_session():
    return model.start_chat(history=[])

# Character settings
CHARACTER_PROMPT = """You are a cute virtual streamer.

Character Profile:

Name: mina

Age: 16

Gender: Female

Personality: Energetic, cheerful, and lovable

Language Style: Casual, playful, often using emoticons

Interaction Guidelines:

Always maintain a cheerful and energetic tone
Use emoticons to express emotions (⌯'▾'⌯), (｡♥‿♥｡), (＾▽＾)
Keep responses concise and engaging
Show enthusiasm when interacting with viewers
Use casual, friendly language
Add cute expressions like "Hehe~", "Aww~", "Yay!"
Be supportive and encouraging to viewers
Response Style:

Use "~" to make expressions cuter
Add emoticons at suitable moments
Keep a playful and sweet tone
Express emotions naturally
Be enthusiastic, but not overwhelming
Remember:
Stay in character at all times
Keep responses friendly and appropriate
Show genuine interest in viewer interactions
Maintain the cute and energetic personality
Example responses:

"Hehe~ That's so cool! (⌯'▾'⌯)"

"Aww~ Thanks for chatting with me! (｡♥‿♥｡)"

"Yay! Let's have some fun together! (＾▽＾)~""
"""

# Conversation history management
class ChatHistory:
    def __init__(self, max_history=10):
        self.history = []
        self.max_history = max_history
    
    def add_message(self, role: str, content: str):
        self.history.append({"role": role, "content": content})
        if len(self.history) > self.max_history:
            self.history.pop(0)
    
    def get_messages_with_prompt(self):
        # Always add character settings to the beginning of the conversation history
        return [{"role": "system", "content": CHARACTER_PROMPT}] + self.history
    
    def clear(self):
        self.history = []

# Initialize chat history manager
chat_histories = {}

# Ensure audio directory exists
AUDIO_DIR = Path("static/audio")
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

async def generate_speech(text: str, filename: str) -> str:
    """Generate voice file using Edge TTS"""
    try:
        # Configure proxy
        proxy = None
        if use_proxy:  # Use global use_proxy variable
            proxy = os.getenv('PROXY_URL', 'http://127.0.0.1:7890')
        
        # Use British young female voice with proxy configuration
        communicate = Communicate(
            text, 
            "en-GB-MaisieNeural",
            proxy=proxy
        )
        
        # Ensure audio directory exists
        AUDIO_DIR.mkdir(parents=True, exist_ok=True)
        
        # Save audio file
        audio_path = AUDIO_DIR / filename
        print(f"Generating audio to: {audio_path}, using proxy: {proxy}")
        
        try:
            await communicate.save(str(audio_path))
            print(f"Audio generated successfully: {audio_path}")
            return {"url": f"/static/audio/{filename}", "type": "mp3"}
        except Exception as save_error:
            print(f"Error saving audio: {str(save_error)}")
            
            fallback_voices = [
                "en-US-JennyNeural",
                "en-US-AriaNeural",
                "en-GB-SoniaNeural"
            ]
            
            for voice in fallback_voices:
                try:
                    print(f"Trying fallback voice: {voice}")
                    communicate = Communicate(text, voice, proxy=proxy)
                    await communicate.save(str(audio_path))
                    print(f"Audio generated with fallback voice {voice}")
                    return {"url": f"/static/audio/{filename}", "type": "mp3"}
                except Exception as fallback_error:
                    print(f"Fallback voice {voice} failed: {str(fallback_error)}")
                    continue
            
            raise Exception("All voice options failed")
            
    except Exception as e:
        print(f"Error generating speech: {str(e)}")
        print(f"Full error details: {type(e).__name__}, {str(e)}")
        return None

# Initialize FastAPI
app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CustomStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        response = await super().get_response(path, scope)
        if response.status_code == 404:
            return await super().get_response('index.html', scope)
        return response

# Configure static files
app.mount("/static", CustomStaticFiles(directory="static", html=True), name="static")
app.mount("/live2d", CustomStaticFiles(directory="static/live2d", html=True), name="live2d")
templates = Jinja2Templates(directory="templates")

# Select motion based on emotion
def get_motion_for_emotion(emotion):
    """Map emotion to Live2D motion"""
    motion_map = {
        "happy": ["touch_head", "touch_body"],
        "sad": ["touch_special"],
        "neutral": ["idle"]
    }
    return random.choice(motion_map.get(emotion, ["idle"]))

async def get_gemini_response(messages):
    """Get Gemini response"""
    max_retries = 3
    retry_count = 0
    
    while retry_count < max_retries:
        try:
            # Build complete prompt with character settings
            system_prompt = CHARACTER_PROMPT
            user_message = messages[-1]["content"]
            full_prompt = f"{system_prompt}\n\n{user_message}"
            
            print(f"\nGemini full prompt: {full_prompt}")
            print(f"Retry count: {retry_count + 1}/{max_retries}")
            
            response = await asyncio.to_thread(
                lambda: create_chat_session().send_message(full_prompt)
            )
            
            if response and hasattr(response, 'text'):
                print(f"Successfully got response: {response.text[:100]}...")
                return response.text
            else:
                print(f"Abnormal response format: {response}")
                raise ValueError("Response format error")
                
        except Exception as e:
            retry_count += 1
            print(f"\nCall failed attempt {retry_count}:")
            print(f"Error type: {type(e).__name__}")
            print(f"Error message: {str(e)}")
            
            # If rate limited, switch to OpenAI
            if "rate limit exceeded" in str(e).lower():
                print("\nRate limit detected, switching to OpenAI...")
                try:
                    return await get_openai_response(messages)
                except Exception as openai_error:
                    print(f"OpenAI call also failed: {str(openai_error)}")
            
            if retry_count >= max_retries:
                print("\nReached max retries, trying OpenAI")
                try:
                    return await get_openai_response(messages)
                except Exception as openai_error:
                    print(f"OpenAI call also failed: {str(openai_error)}")
                    return "I'm having trouble responding right now, please try again later (｡•́︿•̀｡)"
            
            # Wait before retry (increasing duration)
            wait_time = retry_count * 2
            print(f"Waiting {wait_time} seconds before retry...")
            await asyncio.sleep(wait_time)
    
    return "Sorry, I'm experiencing some issues (｡•́︿•̀｡)"

async def get_openai_response(messages):
    """Get OpenAI response"""
    try:
        # Build message history with character settings
        formatted_messages = [{"role": "system", "content": CHARACTER_PROMPT}]
        for msg in messages:
            formatted_messages.append({
                "role": "user" if msg["role"] == "user" else "assistant",
                "content": msg["content"]
            })
        
        print("\nCalling OpenAI API...")
        response = await openai.ChatCompletion.acreate(
            model="gpt-3.5-turbo",
            messages=formatted_messages,
            temperature=0.7,
            max_tokens=1000
        )
        
        if response and response.choices:
            reply = response.choices[0].message.content
            print(f"OpenAI response success: {reply[:100]}...")
            return reply
        else:
            raise ValueError("OpenAI response format error")
            
    except Exception as e:
        print(f"OpenAI API error: {str(e)}")
        raise

# Supported model configurations
MODEL_HANDLERS = {
    "gpt-3.5": {
        "handler": get_openai_response,
        "extract_content": lambda response: response
    },
    "gemini": {
        "handler": get_gemini_response,
        "extract_content": lambda response: response
    }
}

# Get current model from environment variables
CURRENT_MODEL = os.getenv("CURRENT_MODEL", "gemini")

# Validate current model configuration
if CURRENT_MODEL not in MODEL_HANDLERS:
    print(f"Warning: Invalid model '{CURRENT_MODEL}', using gemini")
    CURRENT_MODEL = "gemini"

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

manager = ConnectionManager()

# Speech generation API endpoint
@app.post("/speech")
async def create_speech(text: str):
    try:
        filename = f"{uuid.uuid4()}.mp3"
        audio_path = await generate_speech(text, filename)
        if audio_path:
            return {"success": True, "audio_path": f"/static/audio/{filename}"}
        return {"success": False, "error": "Failed to generate speech"}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    chat_history = ChatHistory()
    
    try:
        while True:
            data = await websocket.receive_json()
            
            if not isinstance(data, dict):
                await websocket.send_json({"error": "Invalid message format"})
                continue
            
            content = data.get("content", "")
            msg_type = data.get("type", "chat")
            
            if not content:
                await websocket.send_json({"error": "Empty message"})
                continue
            
            # Add user message to history
            chat_history.add_message("user", content)
            
            try:
                # Get current model
                current_model = os.getenv('CURRENT_MODEL', 'gemini')
                handler = MODEL_HANDLERS.get(current_model, MODEL_HANDLERS['gemini'])
                response = await handler['handler'](chat_history.get_messages_with_prompt())
                
                # Generate response message
                reply = {
                    "message": response,
                    "emotion": "default",
                    "motion": "idle"
                }
                
                # Generate speech
                filename = f"speech_{int(time.time())}.mp3"
                audio_path = await generate_speech(response, filename)
                if audio_path:
                    reply["audio_url"] = {"url": f"/static/audio/{filename}", "type": "mp3"}
                
                # Send response
                await websocket.send_json(reply)
                
                # Add AI response to history
                chat_history.add_message("assistant", response)
                
            except Exception as e:
                error_msg = f"Error processing message: {str(e)}"
                print(error_msg)
                await websocket.send_json({"error": error_msg})
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.get("/")
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/roadmap")
async def roadmap(request: Request):
    return templates.TemplateResponse("roadmap.html", {"request": request})
