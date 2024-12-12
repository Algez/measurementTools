// triangleMeasurement.js
// 导入测量三角测量的模块
import MeasureTriangle from "./triangle.js";

// 定义三角测量工具类
export function triangleMeasureTool(viewer) {
  this.viewer = viewer; // Cesium Viewer 实例
  this.polytriangle = undefined; // 用于存储三角形对象

  // 检查是否加载 Turf.js，用于地理计算
  if (window.turf) {
    // 如果 Turf.js 已加载，则无需处理
  } else {
    // 动态添加 Turf.js 脚本
    addScript("https://unpkg.com/@turf/turf@%5E7.0/turf.min.js", () => {});
  }
}

// 初始化三角形测量工具
triangleMeasureTool.prototype.init = function () {
  // 如果已有三角形对象，清除并重置
  if (this.polytriangle) {
    this.polytriangle.clear(); // 清除三角形
    this.polytriangle = undefined;
  }
};

// 激活三角形绘制功能
triangleMeasureTool.prototype.drawTriangle = function () {
  this.init(); // 初始化工具
  this.polytriangle = new MeasureTriangle(this.viewer); // 创建新的三角形对象
  this.polytriangle.activate(); // 激活绘制功能
};

// 删除三角形并停用功能
triangleMeasureTool.prototype.deleteTriangle = function () {
  this.init(); // 初始化工具
  this.polytriangle = new MeasureTriangle(this.viewer); // 创建新的三角形对象
  this.polytriangle.deactivate(); // 停用绘制功能
};

// 动态加载脚本文件的函数
function addScript(url, callback) {
  let script = document.createElement("script"); // 创建脚本元素
  script.setAttribute("type", "text/javascript"); // 设置脚本类型
  script.setAttribute("src", url); // 设置脚本地址
  document.getElementsByTagName("head")[0].appendChild(script); // 将脚本添加到页面
  script.onload = callback; // 脚本加载完成后执行回调
}
