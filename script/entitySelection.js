/* 实体选择与删除功能 */
/**
 * 启用实体选择功能，支持通过左键点击高亮显示实体，右键删除选中的实体。
 * @param {Cesium.Viewer} viewer - Cesium Viewer 实例
 * @returns {Cesium.ScreenSpaceEventHandler} handler - 事件处理器
 */
export function enableEntitySelection(viewer) {
  let selectedEntity = null; // 当前选中的实体
  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas); // 创建屏幕空间事件处理器

  // 左键点击事件：选择或取消选择实体
  handler.setInputAction((clickEvent) => {
    const pickedObject = viewer.scene.pick(clickEvent.position); // 获取点击位置的实体
    if (Cesium.defined(pickedObject) && Cesium.defined(pickedObject.id)) {
      // 如果存在选中的实体且与当前实体不同，则重置之前的实体高亮
      if (selectedEntity && selectedEntity !== pickedObject.id) {
        resetEntityHighlight(selectedEntity); // 重置之前选中实体的样式
      }
      selectedEntity = pickedObject.id; // 更新当前选中的实体
      highlightEntity(selectedEntity); // 高亮当前选中实体
    } else {
      // 如果未选中任何实体且之前有选中的实体，则重置高亮
      if (selectedEntity) {
        resetEntityHighlight(selectedEntity);
      }
      selectedEntity = null; // 清空选中状态
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

  // 右键点击事件：删除选中的实体并禁用事件处理器
  handler.setInputAction(() => {
    removeSelectedEntity(); // 删除当前选中的实体

    // 删除选中实体后，移除事件绑定
    handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK); // 移除左键点击事件
    handler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK); // 移除右键点击事件

    // 可选：完全销毁事件处理器以释放资源
    // handler.destroy();
  }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);

  /**
   * 高亮选中的实体。
   * @param {Cesium.Entity} entity - 选中的实体
   */
  const highlightEntity = (entity) => {
    if (entity.point) {
      entity.point.color = Cesium.Color.YELLOW; // 高亮点实体
    } else if (entity.polyline) {
      entity.polyline.material = Cesium.Color.YELLOW; // 高亮折线实体
    } else if (entity.polygon) {
      entity.polygon.material = Cesium.Color.YELLOW.withAlpha(0.5); // 高亮多边形实体
    }
  };

  /**
   * 重置实体的高亮状态。
   * @param {Cesium.Entity} entity - 要重置的实体
   */
  const resetEntityHighlight = (entity) => {
    if (!entity) return;
    if (entity.point) {
      entity.point.color = Cesium.Color.RED; // 恢复点实体为红色
    } else if (entity.polyline) {
      entity.polyline.material = Cesium.Color.GREEN; // 恢复折线实体为绿色
    } else if (entity.polygon) {
      entity.polygon.material = Cesium.Color.GREEN.withAlpha(0.5); // 恢复多边形实体为绿色
    }
  };

  /**
   * 删除当前选中的实体。
   */
  const removeSelectedEntity = () => {
    if (selectedEntity) {
      viewer.entities.remove(selectedEntity); // 从视图中移除实体
      selectedEntity = null; // 清空选中状态
    }
  };

  return handler; // 返回事件处理器以便后续管理
}
