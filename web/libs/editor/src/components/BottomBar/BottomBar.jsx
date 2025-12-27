
import { observer } from "mobx-react";
import { Block, Elem } from "../../utils/bem";
import { Actions } from "./Actions";
import { Controls } from "./Controls";
import { EditingHistory } from "./HistoryActions";
import { ToolbarControls } from "./ToolbarControls";
import "./BottomBar.scss";
import { FF_DEV_3873, isFF } from "../../utils/feature-flags";

export const BottomBar = observer(({ store }) => {
  const annotationStore = store.annotationStore;
  const entity = annotationStore?.selected;
  const isPrediction = entity?.type === "prediction";

  const isViewAll = annotationStore?.viewingAll === true;

  return store && !isViewAll ? (
    <Block name="bottombar" style={{ borderTop: isFF(FF_DEV_3873) && "1px solid rgba(0,0,0,0.1)" }}>
      <Elem name="group">
        <Actions store={store} />
        {entity && !isPrediction && store.hasInterface("edit-history") && (
          <Elem name="section">
            <EditingHistory entity={entity} />
          </Elem>
        )}
      </Elem>
      <Elem name="group">
        <ToolbarControls store={store} />
        {store.hasInterface("controls") && (store.hasInterface("review") || !isPrediction) && (
          <Elem name="section" mod={{ flat: true }}>
            <Controls annotation={entity} />
          </Elem>
        )}
      </Elem>
    </Block>
  ) : null;
});
