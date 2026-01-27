import { ref, onMounted, onUnmounted, computed } from "vue";

// 断点定义
const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenWidth: number;
  orientation: "portrait" | "landscape";
}

/**
 * 检测是否为移动设备（通过 User Agent）
 */
function isMobileUserAgent(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i.test(
    ua
  );
}

/**
 * 检测是否支持触摸
 */
function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}

/**
 * 获取初始屏幕宽度
 */
function getInitialWidth(): number {
  if (typeof window === "undefined") return 1024;
  // 使用 document.documentElement.clientWidth 更准确
  return window.innerWidth || document.documentElement.clientWidth || 1024;
}

/**
 * 设备检测 composable
 * 用于检测当前设备类型并响应屏幕变化
 */
export function useDeviceDetector() {
  const screenWidth = ref(getInitialWidth());
  const screenHeight = ref(
    typeof window !== "undefined" ? window.innerHeight : 768
  );

  // 是否为移动设备 UA
  const isMobileUA = ref(isMobileUserAgent());
  // 是否支持触摸
  const isTouch = ref(isTouchDevice());

  // 计算设备类型 - 综合考虑屏幕宽度、UA 和触摸支持
  const isMobile = computed(() => {
    // 屏幕宽度小于断点
    const isSmallScreen = screenWidth.value < MOBILE_BREAKPOINT;
    // 如果是移动设备 UA 且屏幕较小，认为是移动设备
    if (isMobileUA.value && isSmallScreen) return true;
    // 如果只是屏幕小，也认为是移动设备
    if (isSmallScreen) return true;
    return false;
  });

  const isTablet = computed(
    () =>
      screenWidth.value >= MOBILE_BREAKPOINT &&
      screenWidth.value < TABLET_BREAKPOINT
  );
  const isDesktop = computed(() => screenWidth.value >= TABLET_BREAKPOINT);

  // 计算屏幕方向
  const orientation = computed<"portrait" | "landscape">(() =>
    screenHeight.value > screenWidth.value ? "portrait" : "landscape"
  );

  // 更新屏幕尺寸
  function updateScreenSize() {
    screenWidth.value =
      window.innerWidth || document.documentElement.clientWidth;
    screenHeight.value =
      window.innerHeight || document.documentElement.clientHeight;
  }

  // 处理屏幕旋转
  function handleOrientationChange() {
    // 延迟更新以确保获取正确的尺寸
    setTimeout(updateScreenSize, 100);
  }

  onMounted(() => {
    updateScreenSize();
    isMobileUA.value = isMobileUserAgent();
    isTouch.value = isTouchDevice();
    window.addEventListener("resize", updateScreenSize);
    window.addEventListener("orientationchange", handleOrientationChange);
  });

  onUnmounted(() => {
    window.removeEventListener("resize", updateScreenSize);
    window.removeEventListener("orientationchange", handleOrientationChange);
  });

  return {
    isMobile,
    isTablet,
    isDesktop,
    screenWidth,
    orientation,
    isMobileUA,
    isTouch,
  };
}

/**
 * 纯函数版本的设备检测（用于测试）
 */
export function detectDevice(width: number): DeviceInfo {
  return {
    isMobile: width < MOBILE_BREAKPOINT,
    isTablet: width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT,
    isDesktop: width >= TABLET_BREAKPOINT,
    screenWidth: width,
    orientation: "portrait", // 纯函数版本默认为竖屏
  };
}

export { MOBILE_BREAKPOINT, TABLET_BREAKPOINT };
