"""
AIVisionClient - AI 视觉审核客户端

使用 Kimi (Moonshot AI) 视觉能力进行动画截图质量审核。
自动从 kimi-cli 的登录凭证获取 access_token，无需额外配置 API key。
"""

import os
import json
import base64
import platform
import socket
import urllib.request
import urllib.error
from pathlib import Path
from typing import List, Dict, Optional, Union
from dataclasses import dataclass
from enum import Enum
import asyncio


class VisionProvider(Enum):
    KIMI = "kimi"


@dataclass
class VisionReviewResult:
    """视觉审核结果"""
    dimension: str
    score: float  # 1-10
    issues: List[Dict]
    suggestions: List[str]
    raw_response: str


class AIVisionClient:
    """AI 视觉审核客户端 —— 基于 Kimi 视觉 API"""

    DEFAULT_BASE_URL = "https://api.kimi.com/coding/v1"
    DEFAULT_MODEL = "kimi-for-coding"

    def __init__(self, provider: VisionProvider = None, api_key: str = None, model: str = None):
        self.provider = VisionProvider.KIMI
        self.model = model or self.DEFAULT_MODEL
        self.base_url = os.getenv("KIMI_BASE_URL", self.DEFAULT_BASE_URL)
        self._access_token = api_key or self._get_access_token()
        self._device_id = self._get_device_id()
        self._device_name = platform.node() or socket.gethostname()

    def _get_access_token(self) -> str:
        """从 kimi-cli 的登录凭证中读取 access_token"""
        cred_path = Path.home() / ".kimi" / "credentials" / "kimi-code.json"
        if cred_path.exists():
            try:
                data = json.loads(cred_path.read_text(encoding="utf-8"))
                return data.get("access_token", "")
            except (json.JSONDecodeError, KeyError):
                pass
        return ""

    def _get_device_id(self) -> str:
        """读取 kimi-cli device_id"""
        device_id_path = Path.home() / ".kimi" / "device_id"
        if device_id_path.exists():
            return device_id_path.read_text(encoding="utf-8").strip()
        return ""
    
    def _encode_image(self, image_path: str) -> str:
        """将图片编码为 base64"""
        with open(image_path, "rb") as f:
            return base64.b64encode(f.read()).decode("utf-8")

    def _build_headers(self) -> Dict[str, str]:
        """构建 Kimi API 请求头（模拟 kimi-cli 的标识）"""
        headers = {
            "Authorization": f"Bearer {self._access_token}",
            "Content-Type": "application/json",
            "User-Agent": "KimiCLI/1.37.0",
            "X-Msh-Platform": "kimi_cli",
            "X-Msh-Version": "1.37.0",
            "X-Msh-Device-Name": self._device_name,
            "X-Msh-Device-Model": "PC",
            "X-Msh-Os-Version": platform.version(),
            "X-Msh-Device-Id": self._device_id,
        }
        return headers
    
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
        return await self._review_with_kimi(image_path, dimension, context)

    async def _review_with_kimi(self, image_path: str, dimension: str, context: dict) -> VisionReviewResult:
        """使用 Kimi 视觉 API 审核"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None, self._review_with_kimi_sync, image_path, dimension, context
        )

    def _review_with_kimi_sync(self, image_path: str, dimension: str, context: dict) -> VisionReviewResult:
        """Kimi 视觉审核的同步实现"""
        try:
            base64_image = self._encode_image(image_path)
            prompt = self._build_prompt(dimension, context)

            payload = {
                "model": self.model,
                "messages": [
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
                "max_tokens": 4000,
                "temperature": 0.3
            }

            req = urllib.request.Request(
                f"{self.base_url}/chat/completions",
                data=json.dumps(payload).encode("utf-8"),
                headers=self._build_headers()
            )

            with urllib.request.urlopen(req, timeout=180) as resp:
                result = json.loads(resp.read().decode("utf-8"))
                msg = result["choices"][0]["message"]
                raw_response = msg.get("content", "")
                # Kimi 视觉模型可能将分析过程放在 reasoning_content 中
                # 如果 content 为空，尝试从 reasoning_content 提取
                if not raw_response.strip():
                    reasoning = msg.get("reasoning_content", "")
                    if reasoning:
                        raw_response = reasoning
                return self._parse_response(dimension, raw_response)

        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8")[:500]
            return VisionReviewResult(
                dimension=dimension,
                score=0,
                issues=[{"error": f"Kimi API HTTP {e.code}: {error_body}"}],
                suggestions=["Check Kimi CLI login status: kimi login"],
                raw_response=error_body
            )
        except Exception as e:
            return VisionReviewResult(
                dimension=dimension,
                score=0,
                issues=[{"error": str(e)}],
                suggestions=["API call failed"],
                raw_response=str(e)
            )
    
    def _parse_response(self, dimension: str, raw_response: str) -> VisionReviewResult:
        """解析 AI 返回的 JSON 响应（支持 markdown 代码块包裹和多种返回格式）"""
        if not raw_response or not raw_response.strip():
            return VisionReviewResult(
                dimension=dimension,
                score=0.0,
                issues=[{"warning": "Empty response from API"}],
                suggestions=["Check API status and retry"],
                raw_response=raw_response
            )

        try:
            # 先尝试去掉 markdown 代码块标记
            cleaned = raw_response.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            elif cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()

            # 尝试从清理后的文本中提取 JSON
            json_match = cleaned.find("{")
            json_end = cleaned.rfind("}") + 1

            if json_match >= 0 and json_end > json_match:
                json_str = cleaned[json_match:json_end]
                data = json.loads(json_str)

                # 支持多种评分字段名
                score = 0.0
                for key in ["score", "overall_score", "total_score", "rating"]:
                    if key in data:
                        score = float(data[key])
                        break

                # 支持多种 issues 字段名
                issues = []
                for key in ["issues", "problems", "defects", "findings"]:
                    if key in data and isinstance(data[key], list):
                        issues = data[key]
                        break

                # 支持多种 suggestions 字段名
                suggestions = []
                for key in ["suggestions", "recommendations", "advice", "fixes"]:
                    if key in data and isinstance(data[key], list):
                        suggestions = data[key]
                        break

                return VisionReviewResult(
                    dimension=dimension,
                    score=score,
                    issues=issues,
                    suggestions=suggestions,
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
            task = self.review_image(frame["path"], dimension, frame.get("context", {}))
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


if __name__ == "__main__":
    main()
