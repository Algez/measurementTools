// polygonMeasurement.js
// 导入工具函数
import {
  toDegreesArray, // 将坐标转换为经纬度数组
  toCartographic, // 将笛卡尔坐标转换为地理坐标
  positionsToLngLatArray, // 将位置数组转换为经纬度数组
  addPoint, // 添加点到地图
  addLabel, // 添加标签到地图
  calculateDistance, // 计算两点之间的距离
  getTerrainDistance, // 计算贴地距离（新增功能：用于准确的贴地周长计算）
} from "./utils.js";

//////////////////////////////
// 公共辅助函数
//////////////////////////////

// 计算重心点
function getCenterOfGravityPoint(positions) {
  let center = positions[0];
  for (let i = 1; i < positions.length; i++) {
    center = Cesium.Cartesian3.midpoint(
      center,
      positions[i],
      new Cesium.Cartesian3()
    );
  }
  return center;
}

// 设置标签样式
function styleLabel(labelEntity, styleOptions) {
  Object.assign(labelEntity.label, styleOptions);
}

// 根据鼠标点击或拾取的屏幕位置获取地球表面坐标
function pickPosition(viewer, positionObj, usePickPosition = false) {
  const scene = viewer.scene;
  if (usePickPosition) {
    return scene.pickPosition(positionObj); // 使用拾取功能获取坐标
  } else {
    const ray = viewer.camera.getPickRay(positionObj); // 获取鼠标射线
    return scene.globe.pick(ray, scene); // 获取地表交点
  }
}

// 添加或更新多边形实体
function addOrUpdatePolygonEntity(
  viewer,
  existingPolygonEntity,
  posArray,
  polygonOptions
) {
  if (existingPolygonEntity) {
    // 如果实体已存在，更新其顶点
    existingPolygonEntity.polygon.hierarchy = new Cesium.PolygonHierarchy(
      posArray
    );
    return existingPolygonEntity;
  }
  // 如果不存在，创建新的多边形实体
  return viewer.entities.add({
    polygon: {
      hierarchy: new Cesium.PolygonHierarchy(posArray),
      ...polygonOptions,
    },
  });
}

// 公共样式配置
const baseAreaLabelStyle = {
  font: "14px sans-serif", // 标签字体
  style: Cesium.LabelStyle.FILL_AND_OUTLINE, // 填充和轮廓样式
  fillColor: Cesium.Color.WHITE, // 填充颜色
  showBackground: true, // 显示背景
  backgroundColor: Cesium.Color.GRAY.withAlpha(0.8), // 背景颜色
  backgroundPadding: new Cesium.Cartesian2(6, 6), // 背景边距
  disableDepthTestDistance: Number.POSITIVE_INFINITY, // 禁用深度测试
};

const baseVertexLabelStyle = {
  font: "12px sans-serif", // 标签字体
  style: Cesium.LabelStyle.FILL_AND_OUTLINE, // 填充和轮廓样式
  fillColor: Cesium.Color.WHITE, // 填充颜色
  showBackground: true, // 显示背景
  backgroundColor: Cesium.Color.BLACK.withAlpha(0.6), // 背景颜色
};

const terrainVertexLabelStyle = {
  font: "12px sans-serif", // 标签字体
  fillColor: Cesium.Color.GOLD, // 填充颜色为金色
  style: Cesium.LabelStyle.FILL_AND_OUTLINE, // 填充和轮廓样式
  showBackground: true, // 显示背景
  backgroundColor: Cesium.Color.BLACK.withAlpha(0.6), // 背景颜色
};

//////////////////////////////
// 水平面积测量（平面）
//////////////////////////////

export function planarArea(viewer) {
  const positions = []; // 存储多边形顶点
  const lineEntities = []; // 存储折线实体
  let polygonEntity = null; // 多边形实体
  let areaLabel = null; // 面积标签

  const handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas); // 鼠标事件处理器

  // 更新多边形
  function updatePolygon() {
    polygonEntity = addOrUpdatePolygonEntity(viewer, polygonEntity, positions, {
      material: Cesium.Color.GREEN.withAlpha(0.6), // 多边形颜色
      classificationType: Cesium.ClassificationType.NONE, // 无分类
      heightReference: Cesium.HeightReference.NONE, // 不参考高度
      perPositionHeight: true, // 使用每个点的高度
    });
  }

  // 计算并显示面积
  function calculateAndDisplayArea(posArray) {
    let coords = positionsToLngLatArray(posArray);
    // 确保多边形闭合
    if (
      coords[0][0] !== coords[coords.length - 1][0] ||
      coords[0][1] !== coords[coords.length - 1][1]
    ) {
      coords.push(coords[0]);
    }

    const turfPolygon = turf.polygon([coords]); // 使用 Turf.js 创建多边形
    const area = turf.area(turfPolygon); // 计算面积（平方米）
    const center = getCenterOfGravityPoint(posArray); // 计算重心

    if (areaLabel) viewer.entities.remove(areaLabel); // 移除之前的标签
    areaLabel = addLabel(
      viewer,
      center,
      `水平面积： ${(area / 1_000_000).toFixed(2)} 平方公里` // 转换为平方公里
    );

    styleLabel(areaLabel, {
      ...baseAreaLabelStyle, // 应用样式
      pixelOffset: new Cesium.Cartesian2(0, -25),
    });
  }

  // 鼠标左键点击事件
  handler.setInputAction((clickEvent) => {
    const cartesian = pickPosition(viewer, clickEvent.position, true);
    if (!cartesian) return;

    positions.push(cartesian); // 添加点

    // 在地图上显示点
    addPoint(viewer, cartesian, Cesium.Color.RED, 5);

    // 添加顶点标签
    const carto = toCartographic(cartesian);
    const [lon, lat] = toDegreesArray(carto);
    const height = carto.height.toFixed(2);

    const vertexLabel = addLabel(
      viewer,
      cartesian,
      `纬度：${lat.toFixed(2)}, 
      经度：${lon.toFixed(2)}, 
      高度：${height} 米`
    );
    styleLabel(vertexLabel, {
      ...baseVertexLabelStyle, // 应用顶点样式
      pixelOffset: new Cesium.Cartesian2(0, -80),
    });

    // 添加线段连接新点和上一个点
    if (positions.length > 1) {
      lineEntities.push(
        viewer.entities.add({
          polyline: {
            positions: [positions[positions.length - 2], cartesian],
            width: 2,
            material: Cesium.Color.YELLOW,
          },
        })
      );
    }

    // 如果点数大于等于3，更新多边形
    if (positions.length >= 3) {
      updatePolygon();
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

  // 鼠标右键点击事件，结束绘制并计算面积
  handler.setInputAction(() => {
    if (positions.length >= 3) {
      positions.push(positions[0]); // 闭合多边形
      viewer.entities.add({
        polyline: {
          positions: [positions[positions.length - 2], positions[0]],
          width: 2,
          material: Cesium.Color.YELLOW,
        },
      });
      updatePolygon();
      calculateAndDisplayArea(positions); // 计算并显示面积
    }

    handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
    handler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK);
  }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
}

//////////////////////////////
// 贴地面积测量
//////////////////////////////

// 计算两个点之间的方位角（以度为单位）
function Bearing(from, to) {
  const radiansPerDegree = Math.PI / 180.0; // 每度对应的弧度值
  const lat1 = from.lat * radiansPerDegree; // 起点纬度（弧度）
  const lon1 = from.lon * radiansPerDegree; // 起点经度（弧度）
  const lat2 = to.lat * radiansPerDegree; // 终点纬度（弧度）
  const lon2 = to.lon * radiansPerDegree; // 终点经度（弧度）

  // 使用球面几何公式计算方位角
  let angle = -Math.atan2(
    Math.sin(lon1 - lon2) * Math.cos(lat2),
    Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon1 - lon2)
  );

  if (angle < 0) {
    angle += Math.PI * 2.0; // 确保角度为正值
  }

  // 将弧度转换为角度
  angle = angle * (180.0 / Math.PI);
  return angle;
}

// 计算三点之间的夹角（以度为单位）
function Angle(p1, p2, p3) {
  const bearing21 = Bearing(p2, p1); // 计算从点2到点1的方位角
  const bearing23 = Bearing(p2, p3); // 计算从点2到点3的方位角
  let angle = bearing21 - bearing23; // 计算夹角
  if (angle < 0) {
    angle += 360; // 确保角度为正值
  }
  return angle;
}

// 贴地面积测量主函数
export function terrainArea(viewer) {
  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas); // 鼠标事件处理器
  const positions = []; // 存储多边形顶点位置
  const tempPoints = []; // 存储临时点信息
  let polygonEntity = null; // 多边形实体

  // 添加或更新多边形
  function PolygonPrimitive(positions) {
    polygonEntity = viewer.entities.add({
      polygon: {
        hierarchy: positions, // 顶点数组
        material: Cesium.Color.GREEN.withAlpha(0.5), // 半透明绿色填充
      },
    });
  }

  // 计算贴地面积
  function getTerrainArea(points) {
    let res = 0; // 初始化面积值
    // 将多边形分解为若干三角形，逐个计算面积
    for (let i = 0; i < points.length - 2; i++) {
      const j = (i + 1) % points.length; // 第二个顶点
      const k = (i + 2) % points.length; // 第三个顶点

      const totalAngle = Angle(points[i], points[j], points[k]); // 计算夹角（度）
      // 计算三角形的两条边长
      const dis_temp1 = parseFloat(
        calculateDistance([positions[i], positions[j]])
      );
      const dis_temp2 = parseFloat(
        calculateDistance([positions[j], positions[k]])
      );

      // 使用三角形面积公式计算面积
      res +=
        dis_temp1 *
        dis_temp2 *
        Math.abs(Math.sin((totalAngle * Math.PI) / 180)); // 转换为弧度计算正弦值
    }
    return (res / 1000000.0).toFixed(4); // 转换为平方公里并保留4位小数
  }

  // 鼠标移动事件，用于动态更新多边形
  handler.setInputAction((movement) => {
    const ray = viewer.camera.getPickRay(movement.endPosition); // 获取鼠标射线
    const cartesian = viewer.scene.globe.pick(ray, viewer.scene); // 获取地表交点
    if (positions.length > 0 && cartesian) {
      positions[positions.length - 1] = cartesian; // 更新最后一个顶点位置
      if (positions.length >= 2) {
        // 动态更新多边形
        const dynamicPositions = new Cesium.CallbackProperty(() => {
          return new Cesium.PolygonHierarchy(positions);
        }, false);
        PolygonPrimitive(dynamicPositions);
      }
    }
  }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

  // 鼠标左键点击事件，添加顶点
  handler.setInputAction((movement) => {
    const ray = viewer.camera.getPickRay(movement.position); // 获取鼠标点击位置的射线
    const cartesian = viewer.scene.globe.pick(ray, viewer.scene); // 获取地表交点
    if (!cartesian) return;

    if (positions.length === 0) {
      positions.push(cartesian.clone()); // 添加第一个顶点
    }
    positions.push(cartesian); // 添加新的顶点

    // 转换为地理坐标（经纬度）
    const cartographic = toCartographic(cartesian);
    const [lon, lat] = toDegreesArray(cartographic);
    const hei = cartographic.height;

    tempPoints.push({ lon, lat, hei }); // 存储临时点信息

    addPoint(viewer, cartesian, Cesium.Color.RED, 5); // 在地图上添加红色点
    const vertexLabel = addLabel(
      viewer,
      cartesian,
      `经度：${lon.toFixed(2)}, \n纬度：${lat.toFixed(
        2
      )}, \n高度：${hei.toFixed(2)} 米`
    );
    // 设置顶点标签样式
    Object.assign(vertexLabel.label, {
      font: "12px sans-serif",
      fillColor: Cesium.Color.GOLD,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      showBackground: true,
      backgroundColor: Cesium.Color.BLACK.withAlpha(0.6),
      pixelOffset: new Cesium.Cartesian2(20, -20),
    });
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

  // 鼠标右键点击事件，结束绘制并计算面积
  handler.setInputAction(() => {
    handler.destroy(); // 销毁事件处理器
    positions.pop(); // 移除最后一个临时点
    const area = getTerrainArea(tempPoints); // 计算贴地面积
    const center = getCenterOfGravityPoint(positions); // 计算重心点

    const labelEntity = addLabel(viewer, center, `贴地面积：${area}平方公里`); // 添加面积标签

    // 设置标签样式
    styleLabel(labelEntity, {
      ...terrainVertexLabelStyle,
      font: "18px sans-serif",
      outlineWidth: 2,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(20, -40),
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
    });
  }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
}
