import { Fragment } from "react";
import { observer } from "mobx-react";
import { types } from "mobx-state-tree";

import BaseTool from "./Base";
import ToolMixin from "../mixins/Tool";
import { Tool } from "../components/Toolbar/Tool";
import { FlyoutMenu } from "../components/Toolbar/FlyoutMenu";
import { IconExpandTool, IconHandTool, IconZoomIn, IconZoomOut } from "@humansignal/icons";

const ToolView = observer(({ item }) => {
  return (
    <Fragment>
      <Tool
        active={item.selected}
        icon={<IconHandTool />}
        ariaLabel="pan"
        label="Pan Image"
        shortcut="H"
        onClick={() => {
          const sel = item.selected;

          item.manager.selectTool(item, !sel);
        }}
      />
      <Tool
        icon={<IconZoomIn />}
        ariaLabel="zoom-in"
        label="Zoom In"
        shortcut="ctrl+plus"
        onClick={() => {
          item.handleZoom(1);
        }}
      />
      <FlyoutMenu
        icon={<IconExpandTool />}
        items={[
          {
            label: "Zoom to fit",
            shortcut: "shift+1",
            onClick: () => {
              item.sizeToFit();
            },
          },
          {
            label: "Zoom to actual size",
            shortcut: "shift+2",
            onClick: () => {
              item.sizeToOriginal();
            },
          },
        ]}
      />
      <Tool
        icon={<IconZoomOut />}
        ariaLabel="zoom-out"
        label="Zoom Out"
        shortcut="ctrl+minus"
        onClick={() => {
          item.handleZoom(-1);
        }}
      />
    </Fragment>
  );
});

const _Tool = types
  .model("ZoomPanTool", {
    // image: types.late(() => types.safeReference(Registry.getModelByTag("image")))
    group: "control",
  })
  .volatile(() => ({
    canInteractWithRegions: false,
    _panRafId: null,
    _pendingPanDelta: { x: 0, y: 0 },
  }))
  .views((self) => ({
    get viewClass() {
      return () => <ToolView item={self} />;
    },

    get stageContainer() {
      return self.obj.stageRef.container();
    },
  }))
  .actions((self) => ({
    /**
     * Indicates that zoom tool can't interact with regions at all
     */
    shouldSkipInteractions() {
      return true;
    },

    mouseupEv() {
      self.mode = "viewing";
      self.stageContainer.style.cursor = "grab";

      // Flush any remaining pan delta so the final position is applied immediately
      if (self._panRafId != null) {
        cancelAnimationFrame(self._panRafId);
        self._panRafId = null;
      }
      if (self._pendingPanDelta.x !== 0 || self._pendingPanDelta.y !== 0) {
        self._flushPan();
      }
    },

    updateCursor() {
      if (!self.selected || !self.obj?.stageRef) return;

      self.stageContainer.style.cursor = "grab";
    },

    afterUpdateSelected() {
      self.updateCursor();
    },

    _flushPan() {
      const item = self.obj;
      const { x, y } = self._pendingPanDelta;

      self._pendingPanDelta.x = 0;
      self._pendingPanDelta.y = 0;
      self._panRafId = null;

      // Apply the accumulated delta once per frame for smoother panning
      item.setZoomPosition(item.zoomingPositionX + x, item.zoomingPositionY + y);
    },

    handleDrag(ev) {
      // Accumulate deltas and apply on rAF to avoid jitter from high-frequency mousemove events
      self._pendingPanDelta.x += ev.movementX;
      self._pendingPanDelta.y += ev.movementY;

      if (self._panRafId == null) {
        self._panRafId = requestAnimationFrame(self._flushPan);
      }
    },

    mousemoveEv(ev) {
      const zoomScale = self.obj.zoomScale;

      if (zoomScale <= 1) return;
      if (self.mode === "moving") {
        self.handleDrag(ev);
        self.stageContainer.style.cursor = "grabbing";
      }
    },

    mousedownEv(ev) {
      // don't pan on right click
      if (ev.button === 2) return;

      self.mode = "moving";
      self.stageContainer.style.cursor = "grabbing";
    },

    handleZoom(val) {
      const item = self.obj;

      item.handleZoom(val);
    },

    sizeToFit() {
      const item = self.obj;

      item.sizeToFit();
    },

    sizeToAuto() {
      const item = self.obj;

      item.sizeToAuto();
    },

    sizeToOriginal() {
      const item = self.obj;

      item.sizeToOriginal();
    },
  }));

const Zoom = types.compose(_Tool.name, ToolMixin, BaseTool, _Tool);

export { Zoom };
