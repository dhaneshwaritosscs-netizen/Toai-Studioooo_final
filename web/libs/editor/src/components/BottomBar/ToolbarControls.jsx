import { observer } from "mobx-react";
import { Fragment } from "react";
import { Elem } from "../../utils/bem";
import { Tool } from "../Toolbar/Tool";
import { FlyoutMenu } from "../Toolbar/FlyoutMenu";
import { ToolbarProvider } from "../Toolbar/ToolbarContext";
import { IconExpandTool, IconHandTool, IconZoomIn, IconZoomOut, IconMoveTool } from "@humansignal/icons";
import { FF_DEV_3391, isFF } from "../../utils/feature-flags";
import "../Toolbar/Tool.scss";

export const ToolbarControls = observer(({ store }) => {
  if (!store || !store.annotationStore) return null;

  const annotationStore = store.annotationStore;
  const isViewAll = annotationStore?.viewingAll === true;
  
  if (isViewAll) return null;

  // Get the image item from the store
  const imageItem = isFF(FF_DEV_3391) 
    ? annotationStore.selected?.names.get("image")
    : annotationStore.names.get("image");

  if (!imageItem || !imageItem.getToolsManager) return null;

  const toolsManager = imageItem.getToolsManager();
  if (!toolsManager) return null;

  const allTools = toolsManager.allTools();
  const controlTools = allTools.filter((tool) => tool.group === "control");

  if (controlTools.length === 0) return null;

  // Find Selection and Zoom tools
  const selectionTool = controlTools.find((tool) => tool.toolName === "MoveTool");
  const zoomTool = controlTools.find((tool) => tool.toolName === "ZoomPanTool");

  // Don't render if we don't have any tools
  if (!selectionTool && !zoomTool) return null;

  return (
    <ToolbarProvider value={{ expanded: false, alignment: "left" }}>
      <Elem name="section" mod={{ flat: true }}>
        {selectionTool && (
          <Tool
            active={selectionTool.selected}
            icon={<IconMoveTool />}
            ariaLabel="move-tool"
            label="Move"
            shortcut={selectionTool.shortcut}
            onClick={() => {
              selectionTool.manager.selectTool(selectionTool, !selectionTool.selected);
            }}
          />
        )}
        {zoomTool && (
          <Fragment>
            <Tool
              active={zoomTool.selected}
              icon={<IconHandTool />}
              ariaLabel="pan"
              label="Pan Image"
              shortcut="H"
              onClick={() => {
                const sel = zoomTool.selected;
                zoomTool.manager.selectTool(zoomTool, !sel);
              }}
            />
            <Tool
              icon={<IconZoomIn />}
              ariaLabel="zoom-in"
              label="Zoom In"
              shortcut="ctrl+plus"
              onClick={() => {
                zoomTool.handleZoom(1);
              }}
            />
            <FlyoutMenu
              icon={<IconExpandTool />}
              items={[
                {
                  label: "Zoom to fit",
                  shortcut: "shift+1",
                  onClick: () => {
                    zoomTool.sizeToFit();
                  },
                },
                {
                  label: "Zoom to actual size",
                  shortcut: "shift+2",
                  onClick: () => {
                    zoomTool.sizeToOriginal();
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
                zoomTool.handleZoom(-1);
              }}
            />
          </Fragment>
        )}
      </Elem>
    </ToolbarProvider>
  );
});

