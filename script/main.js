// main.js
// 导入各种测量工具和功能模块
import { measureLine, measureClampedLine } from "./lineMeasurement.js";
import { planarArea, terrainArea } from "./polygonMeasurement.js";
import { enableEntitySelection } from "./entitySelection.js";
import { triangleMeasureTool } from "./triangleMeasurement.js";

// 设置 Cesium Ion 默认访问令牌
Cesium.Ion.defaultAccessToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI0NDljOTBhYS03MzdjLTQ3YWEtOGE2ZS02MzIxOGE3MDZlNDYiLCJpZCI6MjU5MzQyLCJpYXQiOjE3MzMxOTE4NDV9.ECl9KkFYVbK1pbQPbga-VBLHAtB00KoSHlOaXPgjEbI";

// 初始化 Cesium Viewer
async function initializeViewer() {
  // 预加载全球地形提供器
  const worldTerrain = await Cesium.createWorldTerrainAsync();

  // 创建 Cesium Viewer
  const viewer = new Cesium.Viewer("cesiumContainer", {
    terrainProvider: worldTerrain, // 使用全球地形
    contextOptions: { requestWebgl2: true }, // 使用 WebGL2
    msaaSamples: 4, // 开启抗锯齿
    baseLayerPicker: false, // 隐藏底图选择器
    timeline: false, // 隐藏时间轴
    sceneModePicker: false, // 隐藏场景模式切换器
    geocoder: false, // 隐藏搜索框
    homeButton: false, // 隐藏主页按钮
    infoBox: false, // 隐藏信息框
    animation: true,
    navigationHelpButton: false,
    shadows: true,
    useDefaultRenderLoop: true,
    fullscreenElement: "map3d",
    terrainShadows: Cesium.ShadowMode.ENABLED,
    mapProjection: Cesium.WebMercatorProjection(),
  });
  // 扩展 Viewer 并添加导航功能
  viewer.extend(Cesium.viewerCesiumNavigationMixin, {
    defaultResetView: Cesium.Rectangle.fromDegrees(71, 3, 90, 14),
    enableCompass: true,
    enableZoomControls: true,
    enableDistanceLegend: true,
    enableCompassOuterRing: true,
  });

  viewer.scene.globe.enableLighting = true;
  viewer.scene.globe.depthTestAgainstTerrain = true;
  viewer.scene.debugShowFramesPerSecond = true;
  viewer._cesiumWidget._creditContainer.style.display = "none";
  return viewer;
}

(async () => {
  // 初始化 Viewer 实例
  const viewer = await initializeViewer();
  const triangleTool = new triangleMeasureTool(viewer); // 初始化三角形测量工具
  const drawHelper = new DrawHelper(viewer);
  bxmap.FlyCesium.Init(viewer, drawHelper, "cesiumContainer"); //初始化漫游飞行路径功能

  // 定义按钮对应的功能
  const buttonActions = {
    measureDistance: () => measureLine(viewer), // 测量直线距离
    measureArea: () => planarArea(viewer), // 测量平面面积
    measureClampedDistance: () => measureClampedLine(viewer), // 测量贴地距离
    measureClampedArea: () => terrainArea(viewer), // 测量贴地面积
    measureTriangle: () => triangleTool.drawTriangle(), // 绘制并测量三角形
    enableSelected: () => enableEntitySelection(viewer), // 启用实体选择
    clearAll: () => {
      triangleTool.deleteTriangle(); // 清除三角形
      viewer.entities.removeAll(); // 清除所有实体
    },
  };

  // 绑定按钮点击事件
  Object.entries(buttonActions).forEach(([id, action]) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener("click", action);
    }
  });

  // 设置初始相机视角
  viewer.camera.lookAt(
    Cesium.Cartesian3.fromDegrees(86.922623, 27.986065, 15000.0), // 指向的地理坐标（经度、纬度、高度）
    new Cesium.Cartesian3(5000.0, 5000.0, 5000.0) // 相机方向和距离
  );
  viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY); // 重置相机变换矩阵

  // 工具栏切换逻辑
  const toolbar = document.querySelector(".toolbar"); // 获取工具栏元素
  const toggleBtn = document.getElementById("toggleToolbar"); // 获取工具栏切换按钮
  if (toggleBtn && toolbar) {
    toggleBtn.addEventListener("click", () => {
      toolbar.classList.toggle("hidden"); // 切换工具栏显示状态
    });
  }
})();
