"""
AIVisionClient - AI 视觉审核客户端

支持多种 AI Vision API：
- OpenAI GPT-4V
- Anthropic Claude 3
- 本地模型 (通过 Ollama 等)
"""

import os
import json
import base64
from pathlib import Path
from typing import List, Dict, Optional, Union
from dataclasses import dataclass
from enum import Enum
import asyncio


class VisionProvider(Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    LOCAL = "local"


@dataclass
class VisionReviewResult:
    """视觉审核结果"""
    dimension: str
    score: float  # 1-10
    issues: List[Dict]
    suggestions: List[str]
    raw_response: str


class AIVisionClient:
    """AI 视觉审核客户端"""
    
    def __init__(self, provider: VisionProvider = None, api_key: str = None, model: str = None):
        self.provider = provider or self._detect_provider()
        self.api_key = api_key or self._get_api_key()
        self.model = model or self._get_default_model()
        
    def _detect_provider(self) -> VisionProvider:
        """自动检测可用的 provider"""
        if os.getenv('OPENAI_API_KEY'):
            return VisionProvider.OPENAI
        elif os.getenv('ANTHROPIC_API_KEY'):
            return VisionProvider.ANTHROPIC
        else:
            return VisionProvider.LOCAL
    
    def _get_api_key(self) -> str:
        """获取 API key"""
        if self.provider == VisionProvider.OPENAI:
            return os.getenv('OPENAI_API_KEY', '')
        elif self.provider == VisionProvider.ANTHROPIC:
            return os.getenv('ANTHROPIC_API_KEY', '')
        return ''
    
    def _get_default_model(self) -> str:
        """获取默认模型"""
        if self.provider == VisionProvider.OPENAI:
            return 'gpt-4o'
        elif self.provider == VisionProvider.ANTHROPIC:
            return 'claude-3-sonnet-20240229'
        return 'llava'
    
    def _encode_image(self, image_path: str) -> str:
        """将图片编码为 base64"""
        with open(image_path, 'rb') as f:
            return base64.b64encode(f.read()).decode('utf-8')
    
    def _build_prompt(self, dimension: str, context: dict) -> str:
        """构建审核 Prompt"""
        prompts = {
            'character_detail': """你是一位专业的动画角色设计师。请仔细审查这张角色截图，从以下维度进行评分（1-10分）：

1. **服装细节**：服装是否有纹理、层次、配饰是否完整
2. **面部特征**：五官比例是否协调，表情是否自然
3. **材质表现**：不同材质（金属、布料、皮肤）是否有区分度
4. **整体协调**：角色设计是否统一，风格是否一致

请用JSON格式返回：
{
  "score": <1-10>,
  "issues": [
    {"aspect": "", "severity": "minor|major|critical", "description": ""}
  ],
  "suggestions": [""]
}""",
            'scene_detail': """你是一位专业的场景美术师。请审查这张场景截图：

1. **背景层次**：远景、中景、近景是否有区分
2. **道具分布**：场景中的道具是否合理、丰富
3. **环境细节**：地面、墙面、天空等是否有细节
4. **空间感**：场景是否有深度和立体感

请用JSON格式返回评分和问题列表。""",
            'cinematography': """你是一位专业的摄影指导。请审查这张截图的运镜和构图：

1. **构图平衡**：画面元素是否平衡，有无头重脚轻
2. **视线引导**：观众视线是否被正确引导到主体
3. **景别选择**：当前景别（特写/中景/全景）是否合适
4. **相机角度**：角度是否有助于叙事

请用JSON格式返回评分和问题列表。""",
            'lighting': """你是一位专业的灯光师。请审查这张截图的光效：

1. **明暗对比**：是否有足够的光影层次
2. **色温一致性**：光源色温是否统一
3. **光源合理性**：光源位置和强度是否合理
4. **氛围营造**：光线是否有助于营造场景氛围

请用JSON格式返回评分和问题列表。"""
        }
        
        base_prompt = prompts.get(dimension, prompts['character_detail'])
        
        # 添加上下文信息
        context_str = ""
        if context.get('character'):
            context_str += f"\n角色: {context['character']}"
        if context.get('scene'):
            context_str += f"\n场景: {context['scene']}"
        if context.get('camera'):
            context_str += f"\n运镜: {context['camera']}"
        if context.get('actions'):
            context_str += f"\n动作: {', '.join(context['actions'])}"
        
        return base_prompt + context_str
    
    async def review_image(self, image_path: str, dimension: str, context: dict = None) -> VisionReviewResult:
        """
        对单张图片进行视觉审核
        
        Args:
            image_path: 图片路径
            dimension: 审核维度
            context: 上下文信息
        
        Returns:
            审核结果
        """
        context = context or {}
        
        if self.provider == VisionProvider.OPENAI:
            return await self._review_with_openai(image_path, dimension, context)
        elif self.provider == VisionProvider.ANTHROPIC:
            return await self._review_with_anthropic(image_path, dimension, context)
        else:
            return await self._review_with_local(image_path, dimension, context)
    
    async def _review_with_openai(self, image_path: str, dimension: str, context: dict) -> VisionReviewResult:
        """使用 OpenAI GPT-4V 审核"""
        try:
            from openai import AsyncOpenAI
            
            client = AsyncOpenAI(api_key=self.api_key)
            base64_image = self._encode_image(image_path)
            prompt = self._build_prompt(dimension, context)
            
            response = await client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/png;base64,{base64_image}"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=1000,
                temperature=0.3
            )
            
            raw_response = response.choices[0].message.content
            return self._parse_response(dimension, raw_response)
            
        except ImportError:
            raise ImportError("Please install openai: pip install openai")
        except Exception as e:
            return VisionReviewResult(
                dimension=dimension,
                score=0,
                issues=[{"error": str(e)}],
                suggestions=["API call failed"],
                raw_response=str(e)
            )
    
    async def _review_with_anthropic(self, image_path: str, dimension: str, context: dict) -> VisionReviewResult:
        """使用 Anthropic Claude 3 审核"""
        try:
            import anthropic
            
            client = anthropic.AsyncAnthropic(api_key=self.api_key)
            base64_image = self._encode_image(image_path)
            prompt = self._build_prompt(dimension, context)
            
            response = await client.messages.create(
                model=self.model,
                max_tokens=1000,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": "image/png",
                                    "data": base64_image
                                }
                            }
                        ]
                    }
                ]
            )
            
            raw_response = response.content[0].text
            return self._parse_response(dimension, raw_response)
            
        except ImportError:
            raise ImportError("Please install anthropic: pip install anthropic")
        except Exception as e:
            return VisionReviewResult(
                dimension=dimension,
                score=0,
                issues=[{"error": str(e)}],
                suggestions=["API call failed"],
                raw_response=str(e)
            )
    
    async def _review_with_local(self, image_path: str, dimension: str, context: dict) -> VisionReviewResult:
        """使用本地模型审核（通过 Ollama）"""
        try:
            import aiohttp
            
            base64_image = self._encode_image(image_path)
            prompt = self._build_prompt(dimension, context)
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    'http://localhost:11434/api/generate',
                    json={
                        'model': self.model,
                        'prompt': prompt,
                        'images': [base64_image],
                        'stream': False
                    }
                ) as response:
                    result = await response.json()
                    raw_response = result.get('response', '')
                    return self._parse_response(dimension, raw_response)
                    
        except Exception as e:
            return VisionReviewResult(
                dimension=dimension,
                score=0,
                issues=[{"error": f"Local model error: {str(e)}"}],
                suggestions=["Make sure Ollama is running"],
                raw_response=str(e)
            )
    
    def _parse_response(self, dimension: str, raw_response: str) -> VisionReviewResult:
        """解析 AI 返回的 JSON 响应"""
        try:
            # 尝试从响应中提取 JSON
            json_match = raw_response.find('{')
            json_end = raw_response.rfind('}') + 1
            
            if json_match >= 0 and json_end > json_match:
                json_str = raw_response[json_match:json_end]
                data = json.loads(json_str)
                
                return VisionReviewResult(
                    dimension=dimension,
                    score=float(data.get('score', 0)),
                    issues=data.get('issues', []),
                    suggestions=data.get('suggestions', []),
                    raw_response=raw_response
                )
            else:
                # 无法提取 JSON，返回原始文本
                return VisionReviewResult(
                    dimension=dimension,
                    score=5.0,  # 默认中等评分
                    issues=[{"warning": "Could not parse structured response"}],
                    suggestions=["Review raw response manually"],
                    raw_response=raw_response
                )
                
        except json.JSONDecodeError:
            return VisionReviewResult(
                dimension=dimension,
                score=5.0,
                issues=[{"warning": "Invalid JSON in response"}],
                suggestions=["Review raw response manually"],
                raw_response=raw_response
            )
    
    async def review_batch(self, frames: List[Dict], dimension: str) -> List[VisionReviewResult]:
        """
        批量审核多张图片
        
        Args:
            frames: 帧列表，每项包含 path 和 context
            dimension: 审核维度
        
        Returns:
            审核结果列表
        """
        tasks = []
        for frame in frames:
            task = self.review_image(frame['path'], dimension, frame.get('context', {}))
            tasks.append(task)
        
        return await asyncio.gather(*tasks)


def main():
    """CLI 测试入口"""
    import sys
    
    if len(sys.argv) < 3:
        print("Usage: python ai_vision_client.py <image_path> <dimension>")
        print("Dimensions: character_detail, scene_detail, cinematography, lighting")
        sys.exit(1)
    
    image_path = sys.argv[1]
    dimension = sys.argv[2]
    
    client = AIVisionClient()
    
    print(f"Reviewing: {image_path}")
    print(f"Dimension: {dimension}")
    print(f"Provider: {client.provider.value}")
    print(f"Model: {client.model}")
    print()
    
    result = asyncio.run(client.review_image(image_path, dimension))
    
    print(f"Score: {result.score}/10")
    print(f"Issues: {len(result.issues)}")
    for issue in result.issues:
        print(f"  - {issue}")
    print(f"Suggestions: {len(result.suggestions)}")
    for suggestion in result.suggestions:
        print(f"  - {suggestion}")


if __name__ == '__main__':
    main()
