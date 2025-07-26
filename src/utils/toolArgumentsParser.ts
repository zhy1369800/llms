import JSON5 from "json5";
import vm from "vm";
import { log } from "@/utils/log";

/**
 * 解析工具调用参数的函数
 * 先尝试使用JSON5解析，如果失败则使用vm模块进行兜底解析
 * 如果连兜底方案也失败，则返回原始数据
 * 
 * @param argsString - 需要解析的参数字符串
 * @returns 解析后的参数对象或原始字符串
 */
export function parseToolArguments(argsString: string): string {
  try {
    // 首先尝试使用JSON5解析
    const args = JSON5.parse(argsString);
    log(`工具调用参数JSON5解析成功`);
    return JSON.stringify(args);
  } catch (e: any) {
    // JSON5解析失败，尝试使用vm模块进行兜底解析
    try {
      const context = { data: null };
      vm.createContext(context);
      vm.runInContext(`data = ${argsString}`, context);
      log(`工具调用参数兜底解析成功`);
      return JSON.stringify(context.data);
    } catch (fallbackError: any) {
      // 兜底方案也失败了，返回原数据
      log(
        `${e.message} ${
          e.stack
        }  工具调用参数JSON5解析失败: ${JSON.stringify(
          argsString
        )}`
      );
      log(
        `${fallbackError.message} ${
          fallbackError.stack
        }  工具调用参数兜底解析也失败了，返回原数据`
      );
      // 返回原始数据
      return argsString;
    }
  }
}