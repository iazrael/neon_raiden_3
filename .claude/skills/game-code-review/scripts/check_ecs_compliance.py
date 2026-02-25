#!/usr/bin/env python3
"""
ECS 模式合规性检查脚本

检查代码是否符合 ECS 架构规范：
- Components 仅包含数据结构
- Systems 是纯函数
- 正确的目录结构
- 事件系统合规性
"""

import os
import re
import sys
from pathlib import Path
from typing import List, Dict, Set


class ECSComplianceChecker:
    def __init__(self, src_path: str):
        self.src_path = Path(src_path)
        self.engine_path = self.src_path / "engine"
        self.issues: List[Dict] = []

    def check_all(self) -> Dict:
        """运行所有合规性检查"""
        results = {
            "components": self._check_components(),
            "systems": self._check_systems(),
            "blueprints": self._check_blueprints(),
            "events": self._check_events(),
            "directory_structure": self._check_directory_structure(),
        }

        summary = {
            "total_issues": sum(len(r.get("issues", [])) for r in results.values()),
            "by_category": {k: len(v.get("issues", [])) for k, v in results.items()},
            "details": results
        }

        return summary

    def _check_components(self) -> Dict:
        """检查 Components 仅包含数据结构"""
        components_dir = self.engine_path / "components"
        if not components_dir.exists():
            return {"status": "skip", "issues": ["Components 目录不存在"]}

        issues = []
        for file in components_dir.glob("*.ts"):
            content = file.read_text()

            # 检查是否包含函数实现
            func_pattern = r'(?:export\s+)?(?:function|const)\s+\w+\s*=\s*(?:\([^)]*\)\s*=>|function\s*\()'
            if re.search(func_pattern, content):
                issues.append({
                    "file": str(file.relative_to(self.src_path)),
                    "line": self._find_line_number(content, func_pattern),
                    "severity": "error",
                    "message": "Component 不应包含函数实现"
                })

        return {"status": "pass" if not issues else "fail", "issues": issues}

    def _check_systems(self) -> Dict:
        """检查 Systems 是纯函数"""
        systems_dir = self.engine_path / "systems"
        if not systems_dir.exists():
            return {"status": "skip", "issues": ["Systems 目录不存在"]}

        issues = []
        for file in systems_dir.glob("*.ts"):
            content = file.read_text()
            lines = content.split('\n')

            # 检查函数签名
            for i, line in enumerate(lines, 1):
                if re.search(r'export\s+function\s+\w+System', line):
                    # 检查参数是否包含 world 和 deltaTimeMs
                    func_content = self._get_function_content(lines, i - 1)
                    if 'world' not in func_content and 'World' not in func_content:
                        issues.append({
                            "file": str(file.relative_to(self.src_path)),
                            "line": i,
                            "severity": "warning",
                            "message": "System 函数应接收 world 参数"
                        })

        return {"status": "pass" if not issues else "fail", "issues": issues}

    def _check_blueprints(self) -> Dict:
        """检查 Blueprints 仅包含配置"""
        blueprints_dir = self.engine_path / "blueprints"
        if not blueprints_dir.exists():
            return {"status": "skip", "issues": ["Blueprints 目录不存在"]}

        issues = []
        for file in blueprints_dir.glob("*.ts"):
            content = file.read_text()

            # 检查是否包含运行时逻辑
            if re.search(r'setTimeout|setInterval|addEventListener', content):
                issues.append({
                    "file": str(file.relative_to(self.src_path)),
                    "severity": "warning",
                    "message": "Blueprint 不应包含运行时逻辑"
                })

        return {"status": "pass" if not issues else "fail", "issues": issues}

    def _check_events(self) -> Dict:
        """检查事件系统合规性"""
        events_file = self.engine_path / "events.ts"
        if not events_file.exists():
            return {"status": "skip", "issues": ["events.ts 不存在"]}

        issues = []
        content = events_file.read_text()

        # 检查是否定义了事件类型
        if 'Event' not in content:
            issues.append({
                "file": str(events_file.relative_to(self.src_path)),
                "severity": "error",
                "message": "未定义事件类型"
            })

        return {"status": "pass" if not issues else "fail", "issues": issues}

    def _check_directory_structure(self) -> Dict:
        """检查目录结构"""
        required_dirs = ["components", "systems", "blueprints", "configs"]
        issues = []

        for dir_name in required_dirs:
            dir_path = self.engine_path / dir_name
            if not dir_path.exists():
                issues.append({
                    "severity": "error",
                    "message": f"缺少必需目录: engine/{dir_name}"
                })

        # 检查 world.ts 和 events.ts
        if not (self.engine_path / "world.ts").exists():
            issues.append({
                "severity": "error",
                "message": "缺少 world.ts"
            })

        return {"status": "pass" if not issues else "fail", "issues": issues}

    def _find_line_number(self, content: str, pattern: str) -> int:
        """查找匹配模式的行号"""
        for i, line in enumerate(content.split('\n'), 1):
            if re.search(pattern, line):
                return i
        return 0

    def _get_function_content(self, lines: List[str], start_idx: int) -> str:
        """获取函数内容"""
        content = lines[start_idx]
        brace_count = content.count('{') - content.count('}')
        i = start_idx + 1

        while i < len(lines) and brace_count > 0:
            content += lines[i]
            brace_count += lines[i].count('{') - lines[i].count('}')
            i += 1

        return content


def print_report(summary: Dict):
    """打印检查报告"""
    print("=" * 60)
    print("ECS 模式合规性检查报告")
    print("=" * 60)

    print(f"\n总计问题数: {summary['total_issues']}")
    print("\n各分类问题数:")
    for category, count in summary['by_category'].items():
        status_icon = "✅" if count == 0 else "❌"
        print(f"  {status_icon} {category}: {count}")

    print("\n详细问题:")
    for category, result in summary['details'].items():
        if result.get('issues'):
            print(f"\n【{category}】")
            for issue in result['issues']:
                file_info = f" ({issue['file']}:{issue.get('line', '?')})" if 'file' in issue else ""
                print(f"  [{issue['severity'].upper()}] {issue['message']}{file_info}")

    print("\n" + "=" * 60)


def main():
    if len(sys.argv) < 2:
        print("用法: python check_ecs_compliance.py <src-path>")
        sys.exit(1)

    src_path = sys.argv[1]
    checker = ECSComplianceChecker(src_path)
    summary = checker.check_all()
    print_report(summary)

    # 返回退出码
    sys.exit(1 if summary['total_issues'] > 0 else 0)


if __name__ == "__main__":
    main()
