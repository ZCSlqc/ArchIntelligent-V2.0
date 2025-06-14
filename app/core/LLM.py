from pydantic import Field, SecretStr
from llama_index.core.llms import CustomLLM, CompletionResponse, LLMMetadata
from llama_index.core.llms.callbacks import llm_completion_callback
import requests

class MoonshotLLM(CustomLLM):
    api_key: SecretStr = Field(description="Moonshot API Key")
    base_url: str = Field(default="https://api.moonshot.cn/v1", description="API 基础地址")
    model: str = Field(default="moonshot-v1-32k", description="模型名称")
    context_window: int = Field(default=32768, description="上下文窗口大小")

    def __init__(self, **data):
        super().__init__(**data)

    @property
    def metadata(self) -> LLMMetadata:
        """Get LLM metadata."""
        return LLMMetadata(
            context_window=self.context_window,
            model=self.model,
            is_chat_model=True
        )

    @llm_completion_callback()
    def complete(self, prompt: str, **kwargs) -> CompletionResponse:
        headers = {
            "Authorization": f"Bearer {self.api_key.get_secret_value()}",
            "Content-Type": "application/json"
        }
        data = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": kwargs.get("temperature", 0.1),
            "max_tokens": kwargs.get("max_tokens", 1024)
        }
        response = requests.post(
            f"{self.base_url}/chat/completions",
            headers=headers,
            json=data
        )
        response.raise_for_status()
        return CompletionResponse(text=response.json()["choices"][0]["message"]["content"])

    @llm_completion_callback()
    def stream_complete(self, prompt: str, **kwargs):
        raise NotImplementedError("Streaming not supported")
