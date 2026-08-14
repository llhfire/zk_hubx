# 工作台三 - 网页自动化遍历与模拟操作规则文档

## 一、目标网页概述

**网址**：https://bj.zkdemo.com/
**名称**：中科集团软件定制报价系统
**功能**：7步骤报价配置流程，从项目信息到最终报价生成

## 二、页面结构分析

### 2.1 步骤导航（7个步骤）
```
步骤0: 项目信息
步骤1: 前端平台选择
步骤2: 后端服务配置
步骤3: 技术团队配置
步骤4: 其他费用配置
步骤5: 报价汇总
步骤6: 历史记录
```

### 2.2 全局变量
```javascript
let currentStep = 0;           // 当前步骤
const totalSteps = 7;          // 总步骤数
const HISTORY_KEY = 'quoteHistory_v1';  // 历史记录存储key
```

## 三、步骤0：项目信息

### 3.1 表单字段
| 字段名 | 变量名 | 类型 | 说明 |
|--------|--------|------|------|
| 项目名称 | projectName | text | 必填 |
| 项目类型 | projectType | select | 下拉选择 |
| 客户名称 | customerName | text | 可选 |
| 预算范围 | budget | text | 可选 |

### 3.2 操作流程
```javascript
// 1. 填写项目名称
document.querySelector('input[name="projectName"]').value = '示例项目';

// 2. 选择项目类型
document.querySelector('select[name="projectType"]').value = '企业官网';

// 3. 点击下一步
nextStep();
```

## 四、步骤1：前端平台选择

### 4.1 平台配置
```javascript
const frontendPlatforms = {
    wechat: { name: '微信小程序', desc: '微信生态小程序' },
    alipay: { name: '支付宝小程序', desc: '支付宝生态小程序' },
    douyin: { name: '抖音小程序', desc: '抖音生态小程序' },
    ios: { name: 'iOS APP', desc: '苹果iOS应用' },
    android: { name: 'Android APP', desc: '安卓应用' },
    harmony: { name: '鸿蒙 APP', desc: '华为鸿蒙应用' },
    h5: { name: 'H5移动端', desc: '移动端H5网页' },
    pcweb: { name: 'PC Web端', desc: '电脑端网页' },
    desktop: { name: '桌面应用', desc: '桌面客户端' },
    ipad: { name: 'iPad 端', desc: '苹果iPad平板应用' },
    androidpad: { name: 'Android 平板端', desc: '安卓平板应用' }
};
```

### 4.2 技术栈配置
```javascript
const frontendTechs = {
    wechat: [{ name: '原生开发', cost: 1200 }, { name: 'Taro', cost: 1100 }, { name: 'Uni-app', cost: 1000 }],
    ios: [{ name: 'Swift', cost: 1500 }, { name: 'React Native', cost: 1300 }, { name: 'Flutter', cost: 1400 }],
    android: [{ name: 'Kotlin', cost: 1400 }, { name: 'Java', cost: 1200 }, { name: 'React Native', cost: 1300 }, { name: 'Flutter', cost: 1400 }],
    h5: [{ name: 'Vue', cost: 1000 }, { name: 'React', cost: 1100 }, { name: 'Angular', cost: 1200 }],
    pcweb: [{ name: 'Vue', cost: 1000 }, { name: 'React', cost: 1100 }, { name: 'Angular', cost: 1200 }]
};
```

### 4.3 状态变量
```javascript
let selectedFrontendPlatforms = [];  // 已选前端平台
let frontendRoles = {};              // 前端角色配置
// 格式: { platformId: [{ id, roleName, techs, selectedTech, selectedCost, count, days }] }
```

### 4.4 操作流程
```javascript
// 1. 选择平台
toggleFrontendPlatform('wechat');  // 选择微信小程序

// 2. 配置角色
frontendRoles['wechat'][0].roleName = '用户端';
frontendRoles['wechat'][0].selectedTech = 'Uni-app';
frontendRoles['wechat'][0].selectedCost = 1000;
frontendRoles['wechat'][0].count = 1;
frontendRoles['wechat'][0].days = 20;

// 3. 添加更多角色（可选）
addFrontendRole('wechat');

// 4. 点击下一步
nextStep();
```

## 五、步骤2：后端服务配置

### 5.1 平台配置
```javascript
const backendPlatforms = {
    api: { name: 'API服务', desc: '后端API服务' },
    admin: { name: '管理后台', desc: '后台管理系统' },
    database: { name: '数据库设计', desc: '数据库架构设计' },
    im: { name: '即时通讯', desc: '实时通讯服务' },
    payment: { name: '支付服务', desc: '支付集成服务' }
};
```

### 5.2 技术栈配置
```javascript
const backendTechs = {
    api: [{ name: 'Java Spring Boot', cost: 1400 }, { name: 'Python Django', cost: 1200 }, { name: 'Go', cost: 1500 }, { name: 'Node.js', cost: 1100 }],
    admin: [{ name: 'Vue+Element', cost: 1000 }, { name: 'React+Ant Design', cost: 1100 }],
    database: [{ name: 'MySQL', cost: 1200 }, { name: 'PostgreSQL', cost: 1300 }, { name: 'MongoDB', cost: 1300 }],
    im: [{ name: 'WebSocket', cost: 1200 }, { name: 'MQTT', cost: 1300 }],
    payment: [{ name: '微信支付', cost: 1200 }, { name: '支付宝', cost: 1200 }]
};
```

### 5.3 状态变量
```javascript
let selectedBackendPlatforms = [];  // 已选后端平台
let backendRoles = {};              // 后端角色配置
```

### 5.4 操作流程
```javascript
// 1. 选择平台
toggleBackendPlatform('api');  // 选择API服务

// 2. 配置角色
backendRoles['api'][0].roleName = '后端开发';
backendRoles['api'][0].selectedTech = 'Java Spring Boot';
backendRoles['api'][0].selectedCost = 1400;
backendRoles['api'][0].count = 2;
backendRoles['api'][0].days = 30;

// 3. 点击下一步
nextStep();
```

## 六、步骤3：技术团队配置

### 6.1 标准岗位
```javascript
const standardRoles = [
    { id: 'ui', name: 'UI设计师', defaultCost: 800 },
    { id: 'pm', name: '产品经理', defaultCost: 1200 },
    { id: 'test', name: '测试工程师', defaultCost: 800 },
    { id: 'pmManager', name: '项目经理', defaultCost: 1500 },
    { id: 'architect', name: '架构师', defaultCost: 2000 },
    { id: 'devops', name: '运维工程师', defaultCost: 1000 },
    { id: 'dba', name: 'DBA工程师', defaultCost: 1200 },
    { id: 'security', name: '安全工程师', defaultCost: 1500 },
    { id: 'support', name: '技术支持', defaultCost: 800 }
];
```

### 6.2 状态变量
```javascript
let customRoles = [];  // 自定义岗位
// 格式: [{ id, name, cost, count, days }]
```

### 6.3 操作流程
```javascript
// 1. 添加标准岗位
toggleRole('ui');      // 添加UI设计师
toggleRole('test');    // 添加测试工程师

// 2. 添加自定义岗位
addCustomRole();

// 3. 配置岗位参数
// 修改人数和天数
adjustRoleField('ui', 'count', 2);
adjustRoleField('ui', 'days', 10);

// 4. 点击下一步
nextStep();
```

## 七、步骤4：其他费用配置

### 7.1 状态变量
```javascript
let customCosts = [];  // 自定义费用
// 格式: [{ id, name, amount, note }]
```

### 7.2 操作流程
```javascript
// 1. 添加费用项
addCustomCost();

// 2. 配置费用
customCosts[0].name = '服务器费用';
customCosts[0].amount = 5000;
customCosts[0].note = '年度费用';

// 3. 点击下一步
nextStep();
```

## 八、步骤5：报价汇总

### 8.1 计算逻辑
```javascript
function calculateQuote() {
    let total = 0;

    // 1. 前端平台费用
    for (const platform of selectedFrontendPlatforms) {
        const roles = frontendRoles[platform] || [];
        for (const role of roles) {
            total += role.selectedCost * role.count * role.days;
        }
    }

    // 2. 后端平台费用
    for (const platform of selectedBackendPlatforms) {
        const roles = backendRoles[platform] || [];
        for (const role of roles) {
            total += role.selectedCost * role.count * role.days;
        }
    }

    // 3. 标准岗位费用
    // 遍历所有 toggleRole 添加的岗位

    // 4. 自定义岗位费用
    for (const role of customRoles) {
        total += role.cost * role.count * role.days;
    }

    // 5. 其他费用
    for (const cost of customCosts) {
        total += cost.amount;
    }

    return total;
}
```

### 8.2 操作流程
```javascript
// 1. 查看报价汇总
const totalAmount = calculateQuote();
console.log('总报价:', totalAmount);

// 2. 保存到历史记录
saveData();

// 3. 导出报价单（可选）
// 点击导出按钮
```

## 九、步骤6：历史记录

### 9.1 数据存储
```javascript
function saveData() {
    const data = {
        projectName,
        projectType,
        customerName,
        selectedFrontendPlatforms,
        selectedBackendPlatforms,
        frontendRoles,
        backendRoles,
        customRoles,
        customCosts,
        totalAmount: calculateQuote(),
        createdAt: new Date().toISOString()
    };

    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    history.push(data);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function loadData() {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    return history;
}
```

### 9.2 操作流程
```javascript
// 1. 加载历史记录
const historyList = loadData();

// 2. 查看历史详情
// 点击历史记录项

// 3. 删除历史记录
// 点击删除按钮
```

## 十、完整遍历脚本

### 10.1 自动化遍历流程
```javascript
async function autoTraverse() {
    // 步骤0: 项目信息
    fillProjectInfo({
        projectName: '自动化测试项目',
        projectType: '企业官网',
        customerName: '测试客户'
    });
    await nextStep();

    // 步骤1: 前端平台
    selectFrontendPlatform('wechat');
    selectFrontendPlatform('h5');
    await nextStep();

    // 步骤2: 后端服务
    selectBackendPlatform('api');
    selectBackendPlatform('admin');
    await nextStep();

    // 步骤3: 技术团队
    addStandardRole('ui');
    addStandardRole('test');
    await nextStep();

    // 步骤4: 其他费用
    addCustomCostItem('服务器费用', 5000);
    await nextStep();

    // 步骤5: 报价汇总
    const total = calculateQuote();
    console.log('最终报价:', total);

    // 保存
    saveData();
}
```

### 10.2 模拟点击函数
```javascript
// 模拟点击平台卡片
function clickPlatformCard(platformId) {
    const card = document.querySelector(`[data-platform="${platformId}"]`);
    if (card) card.click();
}

// 模拟点击下一步
function clickNextButton() {
    const btn = document.querySelector('.btn-primary');
    if (btn) btn.click();
}

// 模拟点击上一步
function clickPrevButton() {
    const btn = document.querySelector('.btn-secondary');
    if (btn) btn.click();
}
```

### 10.3 模拟输入函数
```javascript
// 模拟输入文本
function simulateInput(selector, value) {
    const input = document.querySelector(selector);
    if (input) {
        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
    }
}

// 模拟选择下拉框
function simulateSelect(selector, value) {
    const select = document.querySelector(selector);
    if (select) {
        select.value = value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
    }
}
```

## 十一、参数映射表

### 11.1 前端平台参数
| 平台ID | 平台名称 | 默认技术栈 | 默认日均单价 |
|--------|----------|------------|--------------|
| wechat | 微信小程序 | Uni-app | 1000 |
| alipay | 支付宝小程序 | Uni-app | 1000 |
| douyin | 抖音小程序 | Uni-app | 1000 |
| ios | iOS APP | React Native | 1300 |
| android | Android APP | Kotlin | 1400 |
| harmony | 鸿蒙 APP | ArkTS | 1500 |
| h5 | H5移动端 | Vue | 1000 |
| pcweb | PC Web端 | Vue | 1000 |
| desktop | 桌面应用 | Electron | 1200 |

### 11.2 后端平台参数
| 平台ID | 平台名称 | 默认技术栈 | 默认日均单价 |
|--------|----------|------------|--------------|
| api | API服务 | Java Spring Boot | 1400 |
| admin | 管理后台 | Vue+Element | 1000 |
| database | 数据库设计 | MySQL | 1200 |
| im | 即时通讯 | WebSocket | 1200 |
| payment | 支付服务 | 微信支付 | 1200 |

### 11.3 标准岗位参数
| 岗位ID | 岗位名称 | 默认日均单价 |
|--------|----------|--------------|
| ui | UI设计师 | 800 |
| pm | 产品经理 | 1200 |
| test | 测试工程师 | 800 |
| pmManager | 项目经理 | 1500 |
| architect | 架构师 | 2000 |
| devops | 运维工程师 | 1000 |
| dba | DBA工程师 | 1200 |
| security | 安全工程师 | 1500 |
| support | 技术支持 | 800 |

## 十二、业务规则

### 12.1 报价计算规则
1. **前端费用** = Σ(平台技术单价 × 人数 × 天数)
2. **后端费用** = Σ(平台技术单价 × 人数 × 天数)
3. **岗位费用** = Σ(岗位日均单价 × 人数 × 天数)
4. **其他费用** = Σ(费用项金额)
5. **总报价** = 前端费用 + 后端费用 + 岗位费用 + 其他费用

### 12.2 数据验证规则
1. 项目名称必填
2. 至少选择一个前端或后端平台
3. 每个平台至少配置一个角色
4. 角色人数和天数必须大于0

### 12.3 状态保存规则
1. 每次操作后自动保存到localStorage
2. 历史记录最多保存50条
3. 支持导出为JSON格式

---

**文档版本**：v1.0
**最后更新**：2026-08-14
**维护说明**：每次修改网页自动化规则时，请在此文档中追加新规则，不要删除或修改已有规则
