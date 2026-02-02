import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";

// Vant 组件库
import {
  Button,
  Cell,
  CellGroup,
  Field,
  Form,
  NavBar,
  Tabbar,
  TabbarItem,
  Tab,
  Tabs,
  PullRefresh,
  List,
  SwipeCell,
  ActionSheet,
  Dialog,
  Toast,
  Popup,
  Picker,
  DatePicker,
  Loading,
  Empty,
  Tag,
  Icon,
  Grid,
  GridItem,
  Card,
  Skeleton,
  SkeletonParagraph,
  FloatingBubble,
  NoticeBar,
  Divider,
  Search,
  DropdownMenu,
  DropdownItem,
  Checkbox,
  Switch,
  Stepper,
  Progress,
  Badge,
  ConfigProvider,
  Collapse,
  CollapseItem,
  Cascader,
} from "vant";
import "vant/lib/index.css";

import "./style.css";

const app = createApp(App);

// 注册 Vant 组件
const vantComponents = [
  Button,
  Cell,
  CellGroup,
  Field,
  Form,
  NavBar,
  Tabbar,
  TabbarItem,
  Tab,
  Tabs,
  PullRefresh,
  List,
  SwipeCell,
  ActionSheet,
  Dialog,
  Toast,
  Popup,
  Picker,
  DatePicker,
  Loading,
  Empty,
  Tag,
  Icon,
  Grid,
  GridItem,
  Card,
  Skeleton,
  SkeletonParagraph,
  FloatingBubble,
  NoticeBar,
  Divider,
  Search,
  DropdownMenu,
  DropdownItem,
  Checkbox,
  Switch,
  Stepper,
  Progress,
  Badge,
  ConfigProvider,
  Collapse,
  CollapseItem,
  Cascader,
];

vantComponents.forEach((component) => {
  app.use(component);
});

app.use(createPinia());
app.use(router);

app.mount("#app");
