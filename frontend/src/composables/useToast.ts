import {
  showToast,
  showSuccessToast,
  showFailToast,
  showLoadingToast,
  closeToast,
} from "vant";

/**
 * Toast 消息提示 composable
 * 基于 Vant Toast 封装
 */
export function useToast() {
  return {
    /**
     * 显示普通提示
     */
    show(message: string) {
      showToast(message);
    },

    /**
     * 显示成功提示
     */
    success(message: string) {
      showSuccessToast(message);
    },

    /**
     * 显示错误提示
     */
    error(message: string) {
      showFailToast(message);
    },

    /**
     * 显示加载提示
     */
    loading(message = "加载中...") {
      return showLoadingToast({
        message,
        forbidClick: true,
        duration: 0,
      });
    },

    /**
     * 关闭提示
     */
    close() {
      closeToast();
    },
  };
}
