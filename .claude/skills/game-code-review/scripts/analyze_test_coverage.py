#!/usr/bin/env python3
"""
测试覆盖率分析脚本

分析单元测试覆盖情况：
- 测试文件存在性检查
- 核心 Systems 覆盖
- Components 覆盖
- 边界条件检查建议
"""

import os
import re
import sys
from pathlib import Path
from typing import Dict, List, Set, Tuple


class TestCoverageAnalyzer:
    def __init__(self, src_path: str, test_path: str):
        self.src_path = Path(src_path)
        self.test_path = Path(test_path)
        self.engine_path = self.src_path / "engine"

    def analyze(self) -> Dict:
        """运行测试覆盖分析"""
        return {
            "test_files_exist": self._check_test_files_exist(),
            "systems_coverage": self._check_systems_coverage(),
            "components_coverage": self._check_components_coverage(),
            "edge_case_suggestions": self._suggest_edge_cases()
        }

    def _check_test_files_exist(self) -> Dict:
        """检查测试文件是否存在"""
        if not self.test_path.exists():
            return {
                "status": "fail",
                "issues": [f"测试目录不存在: {self.test_path}"]
            }

        test_files = list(self.test_path.glob("**/*.test.ts"))
        return {
            "status": "pass" if test_files else "fail",
            "test_file_count": len(test_files),
            "issues": [] if test_files else ["未找到任何测试文件"]
        }

    def _check_systems_coverage(self) -> Dict:
        """检查 Systems 测试覆盖"""
        systems_dir = self.engine_path / "systems"
        if not systems_dir.exists():
            return {"status": "skip", "issues": ["Systems 目录不存在"]}

        system_files = list(systems_dir.glob("*.ts"))
        uncovered = []

        for system_file in system_files:
            system_name = system_file.stem
            # 查找对应的测试文件
            test_file = self.test_path / f"{system_name}.test.ts"
            if not test_file.exists():
                # 也可能在子目录中
                test_files = list(self.test_path.glob(f"**/*{system_name}*.test.ts"))
                if not test_files:
                    uncovered.append(system_name)

        return {
            "status": "pass" if not uncovered else "fail",
            "total_systems": len(system_files),
            "covered": len(system_files) - len(uncovered),
            "uncovered_systems": uncovered,
            "coverage_percent": round((len(system_files) - len(uncovered)) / len(system_files) * 100, 1) if system_files else 0
        }

    def _check_components_coverage(self) -> Dict:
        """检查 Components 测试覆盖"""
        components_dir = self.engine_path / "components"
        if not components_dir.exists():
            return {"status": "skip", "issues": ["Components 目录不存在"]}

        component_files = list(components_dir.glob("*.ts"))
        covered = 0

        for comp_file in component_files:
            comp_name = comp_file.stem
            # 检查是否有任何测试文件引用了这个组件
            found = False
            for test_file in self.test_path.glob("**/*.test.ts"):
                content = test_file.read_text()
                if comp_name in content:
                    found = True
                    break
            if found:
                covered += 1

        return {
            "status": "pass" if covered == len(component_files) else "warning",
            "total_components": len(component_files),
            "covered": covered,
            "coverage_percent": round(covered / len(component_files) * 100, 1) if component_files else 0
        }

    def _suggest_edge_cases(self) -> Dict:
        """建议边界条件测试"""
        suggestions = []

        # 分析 Systems，建议边界测试
        systems_dir = self.engine_path / "systems"
        if systems_dir.exists():
            for system_file in systems_dir.glob("*.ts"):
                content = system_file.read_text()

                # 检查数组访问，建议边界测试
                if re.search(r'\w+\[\d+\]|\.at\(', content):
                    suggestions.append({
                        "system": system_file.stem,
                        "type": "数组边界",
                        "suggestion": "添加空数组、单元素、大数组测试"
                    })

                # 检查数值比较，建议极限值测试
                if re.search(r'[<>=]\s*\d+', content):
                    suggestions.append({
                        "system": system_file.stem,
                        "type": "数值边界",
                        "suggestion": "添加 0、负数、极大值测试"
                    })

                # 检查可选链，建议 null/undefined 测试
                if re.search(r'\?\.', content):
                    suggestions.append({
                        "system": system_file.stem,
                        "type": "空值处理",
                        "suggestion": "添加 null、undefined 测试"
                    })

        return {
            "suggestions": suggestions
        }


def print_report(analysis: Dict):
    """打印分析报告"""
    print("=" * 60)
    print("测试覆盖率分析报告")
    print("=" * 60)

    # 测试文件存在性
    test_result = analysis['test_files_exist']
    status_icon = "✅" if test_result['status'] == "pass" else "❌"
    print(f"\n{status_icon} 测试文件存在: {test_result.get('test_file_count', 0)} 个")
    for issue in test_result.get('issues', []):
        print(f"  ⚠️  {issue}")

    # Systems 覆盖
    systems_result = analysis['systems_coverage']
    if systems_result['status'] != 'skip':
        status_icon = "✅" if systems_result['status'] == "pass" else "❌"
        print(f"\n{status_icon} Systems 覆盖: {systems_result['covered']}/{systems_result['total_systems']} ({systems_result['coverage_percent']}%)")
        if systems_result['uncovered_systems']:
            print("  未覆盖的 Systems:")
            for name in systems_result['uncovered_systems']:
                print(f"    - {name}")

    # Components 覆盖
    comp_result = analysis['components_coverage']
    if comp_result['status'] != 'skip':
        status_icon = "✅" if comp_result['status'] == "pass" else "⚠️"
        print(f"\n{status_icon} Components 覆盖: {comp_result['covered']}/{comp_result['total_components']} ({comp_result['coverage_percent']}%)")

    # 边界条件建议
    edge_cases = analysis['edge_case_suggestions']
    if edge_cases['suggestions']:
        print("\n📋 边界条件测试建议:")
        for suggestion in edge_cases['suggestions']:
            print(f"  【{suggestion['system']}】{suggestion['type']}: {suggestion['suggestion']}")

    print("\n" + "=" * 60)


def main():
    if len(sys.argv) < 3:
        print("用法: python analyze_test_coverage.py <src-path> <test-path>")
        sys.exit(1)

    src_path = sys.argv[1]
    test_path = sys.argv[2]

    analyzer = TestCoverageAnalyzer(src_path, test_path)
    analysis = analyzer.analyze()
    print_report(analysis)


if __name__ == "__main__":
    main()
