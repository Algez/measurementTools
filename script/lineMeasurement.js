// lineMeasurement.js
import {
  calculateDistance, // 计算直线距离的工具函数
  getTerrainDistance, // 获取贴地距离的工具函数
  addPoint, // 添加点实体的工具函数
  addLabel, // 添加标签实体的工具函数
} from "./utils.js";

/**
 * 设置折线测量功能，可选择是否贴地，并处理所有事件。
 * @param {Cesium.Viewer} viewer - Cesium Viewer 实例。
 * @param {Object} options - 测量选项。
 * @param {boolean} options.clampToGround - 折线是否贴地。
 * @param {string} options.name - 测量线的名称。
 * @param {string} options.labelPrefix - 距离标签的前缀。
 * @param {boolean} [options.asyncTerrainDistance=false] - 是否异步计算贴地距离。
 */
function setupLineMeasurement(
  viewer,
  { clampToGround, name, labelPrefix, asyncTerrainDistance = false }
) {
  // 禁用双击默认动作，避免意外行为。
  viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(
    Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK
  );

  const scene = viewer.scene;
  const handler = new Cesium.ScreenSpaceEventHandler(scene.canvas); // 事件处理器
  const positions = []; // 存储折线的顶点
  let polylineEntity = null; // 折线实体
  let floatingLabelPoint = null; // 浮动标签点
  let distance = 0; // 累计距离
  let debounceTimer = null; // 防抖定时器

  // 根据顶点更新折线
  function updatePolyline() {
    if (!polylineEntity) {
      polylineEntity = viewer.entities.add({
        name,
        polyline: {
          show: true,
          positions: new Cesium.CallbackProperty(() => positions, false), // 动态更新折线顶点
          material: Cesium.Color.GREEN, // 折线颜色
          width: 5, // 折线宽度
          clampToGround: clampToGround, // 是否贴地
        },
      });
    }
  }

  // 更新距离并更新浮动标签
  async function updateDistance() {
    if (asyncTerrainDistance) {
      // 异步计算贴地距离
      distance = await calculateTerrainDistance(positions);
    } else {
      // 计算直线距离
      distance = calculateDistance(positions);
    }
  }

  // 异步计算贴地距离
  async function calculateTerrainDistance(posArr) {
    let total = 0;
    for (let i = 0; i < posArr.length - 1; i++) {
      total += await getTerrainDistance(viewer, posArr[i], posArr[i + 1]);
    }
    return total;
  }

  // 获取地球表面上鼠标移动的位置
  function pickGlobePosition(movement) {
    const ray = viewer.camera.getPickRay(movement); // 从摄像机获取光线
    return scene.globe.pick(ray, scene); // 获取光线与地球的交点
  }

  // 鼠标移动事件，动态更新折线和距离
  handler.setInputAction((movement) => {
    const cartesian = pickGlobePosition(movement.endPosition);
    if (Cesium.defined(cartesian) && positions.length > 1) {
      positions[positions.length - 1] = cartesian; // 更新最后一个顶点
      updatePolyline();

      if (asyncTerrainDistance) {
        // 防抖：延迟计算贴地距离
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(updateDistance, 500);
      } else {
        // 直接计算直线距离
        distance = calculateDistance(positions);
      }
    }
  }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

  // 鼠标左键点击事件，添加新的顶点
  handler.setInputAction(async (movement) => {
    const cartesian = pickGlobePosition(movement.position);
    if (!Cesium.defined(cartesian)) return;

    if (positions.length === 0) {
      // 初始化顶点数组
      positions.push(cartesian.clone());
      addPoint(viewer, cartesian.clone(), Cesium.Color.RED, 5); // 添加点
      positions.push(cartesian);
    } else {
      positions.push(cartesian.clone());
    }

    updatePolyline(); // 更新折线

    if (asyncTerrainDistance) {
      await updateDistance(); // 异步更新距离
      addPoint(viewer, cartesian.clone(), Cesium.Color.RED, 5);
      addLabel(
        viewer,
        cartesian.clone(),
        `${labelPrefix}${distance.toFixed(2)} 米`,
        new Cesium.Cartesian2(20, -50) // 标签偏移
      );
    } else {
      distance = calculateDistance(positions); // 计算直线距离
      addPoint(viewer, cartesian, Cesium.Color.RED, 5); // 添加点
      addLabel(viewer, cartesian, `${labelPrefix}${distance} 米`); // 添加标签
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

  // 鼠标右键点击事件，结束测量
  handler.setInputAction(async () => {
    handler.destroy(); // 销毁事件处理器
    if (positions.length > 0) {
      positions.pop(); // 移除最后一个临时顶点
      updatePolyline();
      if (asyncTerrainDistance) {
        await updateDistance();
      }
    }
  }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
}

/* ___________________________________________________________________________________ */
/* 测量直线距离 */
export function measureLine(viewer) {
  setupLineMeasurement(viewer, {
    clampToGround: false, // 不贴地
    name: "直线",
    labelPrefix: "空间距离：", // 标签前缀
    asyncTerrainDistance: false, // 不使用异步计算
  });
}

/* ___________________________________________________________________________________ */
/* 测量贴地距离 */
export function measureClampedLine(viewer) {
  setupLineMeasurement(viewer, {
    clampToGround: true, // 贴地
    name: "贴地线",
    labelPrefix: "贴地距离：", // 标签前缀
    asyncTerrainDistance: true, // 使用异步计算
  });
}
