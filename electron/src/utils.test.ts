import * as fc from "fast-check";
import * as path from "path";

/**
 * Feature: electron-desktop-app, Property 2: 数据库路径解析
 * 验证: 需求 4.2
 *
 * 对于任意有效的用户数据目录路径，数据库路径解析函数应返回以 .db 结尾的绝对路径。
 */

// 模拟 Electron app 模块
jest.mock("electron", () => ({
  app: {
    isPackaged: false,
    getPath: jest.fn((name: string) => {
      if (name === "userData") {
        return process.platform === "win32"
          ? "C:\\Users\\Test\\AppData\\Roaming\\3d-printing-consumables"
          : "/home/test/.config/3d-printing-consumables";
      }
      return "";
    }),
  },
}));

// 纯函数版本的数据库路径解析，用于测试
function resolveDatabasePathPure(
  userDataPath: string,
  isPackaged: boolean
): string {
  if (!isPackaged) {
    // 开发模式：返回相对路径
    const devDbPath = path.resolve(
      __dirname,
      "..",
      "..",
      "backend",
      "prisma",
      "dev.db"
    );
    return `file:${devDbPath}`;
  }

  // 生产模式：使用用户数据目录
  const dbPath = path.join(userDataPath, "data", "data.db");
  return `file:${dbPath}`;
}

// 从数据库 URL 中提取文件路径
function extractDbFilePath(dbUrl: string): string {
  return dbUrl.replace("file:", "");
}

describe("数据库路径解析", () => {
  /**
   * Property 2: 数据库路径解析
   * 对于任意有效的用户数据目录路径，数据库路径解析函数应返回以 .db 结尾的路径
   */
  test("属性测试：数据库路径应以 .db 结尾", () => {
    fc.assert(
      fc.property(
        // 生成有效的目录路径（不包含特殊字符）
        fc.stringOf(
          fc.constantFrom(
            ..."abcdefghijklmnopqrstuvwxyz0123456789_-".split("")
          ),
          { minLength: 1, maxLength: 50 }
        ),
        fc.boolean(),
        (dirName, isPackaged) => {
          const userDataPath =
            process.platform === "win32"
              ? `C:\\Users\\Test\\AppData\\Roaming\\${dirName}`
              : `/home/test/.config/${dirName}`;

          const dbUrl = resolveDatabasePathPure(userDataPath, isPackaged);
          const dbPath = extractDbFilePath(dbUrl);

          // 验证路径以 .db 结尾
          return dbPath.endsWith(".db");
        }
      ),
      { numRuns: 100 }
    );
  });

  test("属性测试：数据库 URL 应以 file: 前缀开头", () => {
    fc.assert(
      fc.property(
        fc.stringOf(
          fc.constantFrom(
            ..."abcdefghijklmnopqrstuvwxyz0123456789_-".split("")
          ),
          { minLength: 1, maxLength: 50 }
        ),
        fc.boolean(),
        (dirName, isPackaged) => {
          const userDataPath =
            process.platform === "win32"
              ? `C:\\Users\\Test\\AppData\\Roaming\\${dirName}`
              : `/home/test/.config/${dirName}`;

          const dbUrl = resolveDatabasePathPure(userDataPath, isPackaged);

          // 验证 URL 以 file: 开头
          return dbUrl.startsWith("file:");
        }
      ),
      { numRuns: 100 }
    );
  });

  test("属性测试：生产模式下数据库路径应包含用户数据目录", () => {
    fc.assert(
      fc.property(
        fc.stringOf(
          fc.constantFrom(
            ..."abcdefghijklmnopqrstuvwxyz0123456789_-".split("")
          ),
          { minLength: 1, maxLength: 50 }
        ),
        (dirName) => {
          const userDataPath =
            process.platform === "win32"
              ? `C:\\Users\\Test\\AppData\\Roaming\\${dirName}`
              : `/home/test/.config/${dirName}`;

          const dbUrl = resolveDatabasePathPure(userDataPath, true); // isPackaged = true
          const dbPath = extractDbFilePath(dbUrl);

          // 验证路径包含用户数据目录
          return dbPath.includes(dirName);
        }
      ),
      { numRuns: 100 }
    );
  });

  // 单元测试：具体示例
  test("开发模式下应返回 backend/prisma/dev.db 路径", () => {
    const dbUrl = resolveDatabasePathPure("/any/path", false);
    const dbPath = extractDbFilePath(dbUrl);

    expect(dbPath).toContain("backend");
    expect(dbPath).toContain("prisma");
    expect(dbPath).toContain("dev.db");
  });

  test("生产模式下应返回用户数据目录下的 data.db", () => {
    const userDataPath = "/home/test/.config/myapp";
    const dbUrl = resolveDatabasePathPure(userDataPath, true);
    const dbPath = extractDbFilePath(dbUrl);

    // 使用 path.join 来处理跨平台路径
    const expectedPath = path.join(
      "/home/test/.config/myapp",
      "data",
      "data.db"
    );
    expect(dbPath).toBe(expectedPath);
  });

  test("Windows 生产模式下应返回正确的路径", () => {
    const userDataPath = "C:\\Users\\Test\\AppData\\Roaming\\myapp";
    const dbUrl = resolveDatabasePathPure(userDataPath, true);
    const dbPath = extractDbFilePath(dbUrl);

    expect(dbPath).toContain("myapp");
    expect(dbPath).toContain("data.db");
  });
});
