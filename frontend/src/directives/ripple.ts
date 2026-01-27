import type { Directive, DirectiveBinding } from "vue";

interface RippleOptions {
  color?: string;
  duration?: number;
}

const rippleDirective: Directive = {
  mounted(el: HTMLElement, binding: DirectiveBinding<RippleOptions | boolean>) {
    // 设置元素样式
    el.style.position = "relative";
    el.style.overflow = "hidden";

    const handleClick = (event: MouseEvent) => {
      const options = typeof binding.value === "object" ? binding.value : {};
      const color = options.color || "rgba(255, 255, 255, 0.3)";
      const duration = options.duration || 600;

      // 创建涟漪元素
      const ripple = document.createElement("span");
      const rect = el.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = event.clientX - rect.left - size / 2;
      const y = event.clientY - rect.top - size / 2;

      ripple.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        left: ${x}px;
        top: ${y}px;
        background: ${color};
        border-radius: 50%;
        transform: scale(0);
        opacity: 1;
        pointer-events: none;
        animation: ripple-effect ${duration}ms ease-out forwards;
      `;

      el.appendChild(ripple);

      // 动画结束后移除元素
      setTimeout(() => {
        ripple.remove();
      }, duration);
    };

    // 存储事件处理器以便卸载时移除
    (el as any)._rippleHandler = handleClick;
    el.addEventListener("click", handleClick);
  },

  unmounted(el: HTMLElement) {
    const handler = (el as any)._rippleHandler;
    if (handler) {
      el.removeEventListener("click", handler);
      delete (el as any)._rippleHandler;
    }
  },
};

// 添加全局样式
const style = document.createElement("style");
style.textContent = `
  @keyframes ripple-effect {
    to {
      transform: scale(4);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

export default rippleDirective;
