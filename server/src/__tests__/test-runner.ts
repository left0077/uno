// 简单的测试运行器
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

class TestRunner {
  private results: TestResult[] = [];
  private currentSuite = '';

  describe(suiteName: string, fn: () => void) {
    this.currentSuite = suiteName;
    console.log(`\n📦 ${suiteName}`);
    fn();
    this.currentSuite = '';
  }

  test(testName: string, fn: () => void | Promise<void>) {
    const fullName = this.currentSuite ? `${this.currentSuite} > ${testName}` : testName;
    try {
      const result = fn();
      if (result instanceof Promise) {
        result
          .then(() => {
            this.results.push({ name: fullName, passed: true });
            console.log(`  ✅ ${testName}`);
          })
          .catch((err) => {
            this.results.push({ name: fullName, passed: false, error: err.message });
            console.log(`  ❌ ${testName}: ${err.message}`);
          });
      } else {
        this.results.push({ name: fullName, passed: true });
        console.log(`  ✅ ${testName}`);
      }
    } catch (err: any) {
      this.results.push({ name: fullName, passed: false, error: err.message });
      console.log(`  ❌ ${testName}: ${err.message}`);
    }
  }

  expect(actual: any) {
    return {
      toBe: (expected: any) => {
        if (actual !== expected) {
          throw new Error(`Expected ${expected}, got ${actual}`);
        }
      },
      toEqual: (expected: any) => {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
        }
      },
      toBeTruthy: () => {
        if (!actual) {
          throw new Error(`Expected truthy, got ${actual}`);
        }
      },
      toBeFalsy: () => {
        if (actual) {
          throw new Error(`Expected falsy, got ${actual}`);
        }
      },
      toHaveLength: (expected: number) => {
        if (actual.length !== expected) {
          throw new Error(`Expected length ${expected}, got ${actual.length}`);
        }
      },
      toContain: (expected: any) => {
        if (!actual.includes(expected)) {
          throw new Error(`Expected to contain ${expected}`);
        }
      },
      not: {
        toEqual: (expected: any) => {
          if (JSON.stringify(actual) === JSON.stringify(expected)) {
            throw new Error(`Expected not to equal ${JSON.stringify(expected)}`);
          }
        }
      }
    };
  }

  printSummary() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 测试结果汇总');
    console.log('='.repeat(50));
    
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    
    console.log(`总计: ${this.results.length} 个测试`);
    console.log(`✅ 通过: ${passed}`);
    console.log(`❌ 失败: ${failed}`);
    
    if (failed > 0) {
      console.log('\n失败的测试:');
      this.results.filter(r => !r.passed).forEach(r => {
        console.log(`  - ${r.name}: ${r.error}`);
      });
    }
    
    console.log('='.repeat(50));
    return failed === 0;
  }
}

export const test = new TestRunner();
export const { describe, expect } = test;
