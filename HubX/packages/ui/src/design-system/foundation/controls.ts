/**
 * 设计系统基础控件出口。
 *
 * 这些是 Arco 的原子能力，不在这里复制视觉实现；页面仍必须从
 * `@/design-system` 取用，组合结构、业务语义和产品视觉统一由上层设计系统组件负责。
 */
export {
  Alert,
  Avatar,
  Badge,
  Breadcrumb,
  Button,
  Checkbox,
  Collapse,
  Descriptions,
  DatePicker,
  Divider,
  Drawer,
  Dropdown,
  Form,
  Grid,
  Input,
  InputNumber,
  InputTag,
  Link,
  List,
  Menu,
  Message,
  Modal,
  Popconfirm,
  Pagination,
  Popover,
  Radio,
  Rate,
  Result,
  Select,
  Slider,
  Space,
  Spin,
  Steps,
  Switch,
  Table,
  Tabs,
  Tag,
  Timeline,
  Tooltip,
  Tree,
  TreeSelect,
  Typography,
  Upload,
} from '@arco-design/web-react';

export * from '@arco-design/web-react/icon';
export type { UploadItem } from '@arco-design/web-react/es/Upload';
export type { FormInstance } from '@arco-design/web-react';
